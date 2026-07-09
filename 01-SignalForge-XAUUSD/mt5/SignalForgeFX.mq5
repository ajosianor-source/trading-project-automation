#property copyright "SignalForge FX"
#property version   "1.30"
#property strict
#property description "Multi-symbol, closed-candle signal and demo trading EA."

#include <Trade/Trade.mqh>

// Only XAUUSD passed the frozen real-tick validation. Add other symbols
// manually only after their own unchanged rule set passes a held-out test.
input string          InpSymbols          = "XAUUSD";
input ENUM_TIMEFRAMES InpTimeframe        = PERIOD_H1;
input ENUM_TIMEFRAMES InpHigherTimeframe  = PERIOD_H4;
input int             InpFastEMA          = 20;
input int             InpSlowEMA          = 50;
input int             InpHigherFastEMA    = 50;
input int             InpHigherSlowEMA    = 200;
input int             InpRSIPeriod        = 14;
input int             InpATRPeriod        = 14;
input int             InpADXPeriod        = 14;
input double          InpMinimumADX        = 22.0;
input int             InpBreakoutPeriod   = 20;
input double          InpStopATR           = 1.5;
input double          InpTargetATR         = 3.0;
input bool            InpEnableAlerts      = true;
input bool            InpEnablePush        = true;
input bool            InpAlertOnStartup    = false;
input bool            InpEnableDemoTrading = false;
input double          InpRiskPercent       = 0.50;
input int             InpMaxSpreadPoints   = 80;
input double          InpMaxSpreadATRPercent = 10.0;
input double          InpDailyLossLimitPercent = 2.0;
input double          InpMaxDrawdownPercent = 8.0;
input int             InpMaxConsecutiveLosses = 3;
input int             InpMaxTradesPerDay   = 3;
input int             InpCooldownMinutes   = 60;
input double          InpRiskTolerancePercent = 10.0;
input bool            InpEmergencyStop     = false;
input ulong           InpMagicNumber       = 260629;

struct PairState
{
   string   requested;
   string   symbol;
   int      fast_handle;
   int      slow_handle;
   int      rsi_handle;
   int      atr_handle;
   int      adx_handle;
   int      higher_fast_handle;
   int      higher_slow_handle;
   datetime last_processed_bar;
   string   signal;
   string   reason;
   double   score;
   double   entry;
   double   stop;
   double   target;
   double   rsi;
   double   atr;
   double   adx;
   bool     higher_trend;
   bool     breakout;
};

PairState pairs[];
CTrade trade;
string pending_push = "";
datetime last_engine_bar = 0;
datetime cooldown_until = 0;
bool trading_halted = false;
string halt_reason = "";
datetime halt_until = 0;

string StateName(const string suffix)
{
   return StringFormat("SignalForge.%I64d.%I64u.%s",
                       AccountInfoInteger(ACCOUNT_LOGIN), InpMagicNumber, suffix);
}

datetime StartOfTradingDay()
{
   datetime now = TimeTradeServer();
   if(now == 0)
      now = TimeCurrent();
   MqlDateTime parts = {};
   TimeToStruct(now, parts);
   parts.hour = 0;
   parts.min = 0;
   parts.sec = 0;
   return StructToTime(parts);
}

void TodayStats(int &trades, int &consecutive_losses, double &realized)
{
   trades = 0;
   consecutive_losses = 0;
   realized = 0.0;
   if(!HistorySelect(StartOfTradingDay(), TimeCurrent()))
      return;

   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0 || (ulong)HistoryDealGetInteger(ticket, DEAL_MAGIC) != InpMagicNumber)
         continue;

      double pnl = HistoryDealGetDouble(ticket, DEAL_PROFIT) +
                   HistoryDealGetDouble(ticket, DEAL_COMMISSION) +
                   HistoryDealGetDouble(ticket, DEAL_SWAP);
      realized += pnl;
      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
      {
         trades++;
         if(pnl < 0.0)
            consecutive_losses++;
         else
            consecutive_losses = 0;
      }
   }
}

void QueuePhonePush(const string message);

void HaltTrading(const string reason, const bool permanent = false)
{
   if(trading_halted)
      return;
   trading_halted = true;
   halt_reason = reason;
   halt_until = permanent ? D'2037.12.31 23:59:59' : StartOfTradingDay() + 86400;
   Print("SignalForge HALTED: ", reason);
   QueuePhonePush("SignalForge HALTED: " + reason);
}

void CloseOwnedPositions()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || (ulong)PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)
         continue;
      if(!trade.PositionClose(ticket))
         Print("SignalForge emergency close failed for #", ticket, ": ",
               trade.ResultRetcodeDescription());
   }
}

bool RiskGate()
{
   if(InpEmergencyStop)
   {
      CloseOwnedPositions();
      HaltTrading("Emergency stop is enabled", true);
      return false;
   }
   if(trading_halted)
   {
      if(TimeCurrent() < halt_until)
         return false;
      trading_halted = false;
      halt_reason = "";
   }
   if(!TerminalInfoInteger(TERMINAL_CONNECTED))
   {
      Print("SignalForge: terminal connection lost; new orders blocked.");
      return false;
   }
   if(TimeCurrent() < cooldown_until)
      return false;

   int trades, losses;
   double realized;
   TodayStats(trades, losses, realized);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double start_balance = MathMax(balance - realized, 0.01);
   double daily_result = AccountInfoDouble(ACCOUNT_EQUITY) - start_balance;
   if(daily_result <= -start_balance * InpDailyLossLimitPercent / 100.0)
   {
      HaltTrading(StringFormat("Daily loss limit reached (%.2f)", daily_result));
      return false;
   }
   if(trades >= InpMaxTradesPerDay)
   {
      HaltTrading("Maximum trades for the day reached");
      return false;
   }
   if(losses >= InpMaxConsecutiveLosses)
   {
      HaltTrading("Consecutive-loss limit reached");
      return false;
   }

   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   string peak_name = StateName("PeakEquity");
   double peak = GlobalVariableCheck(peak_name) ? GlobalVariableGet(peak_name) : equity;
   if(equity > peak)
   {
      peak = equity;
      GlobalVariableSet(peak_name, peak);
   }
   if(peak > 0.0 && (peak - equity) / peak * 100.0 >= InpMaxDrawdownPercent)
   {
      HaltTrading("Maximum equity drawdown reached", true);
      return false;
   }
   return true;
}

void Journal(const string event_name, const string symbol, const string side,
             const double requested_price, const double actual_price,
             const double stop, const double target, const double volume,
             const double spread, const double risk_money, const string details)
{
   if((bool)MQLInfoInteger(MQL_TESTER))
      return;
   FolderCreate("SignalForge", FILE_COMMON);
   int file = FileOpen("SignalForge\\trades.csv",
                       FILE_READ|FILE_WRITE|FILE_CSV|FILE_ANSI|FILE_COMMON|FILE_SHARE_READ, ',');
   if(file == INVALID_HANDLE)
   {
      Print("SignalForge journal open failed: ", GetLastError());
      return;
   }
   if(FileSize(file) == 0)
      FileWrite(file, "time", "version", "account", "event", "symbol", "side",
                "requested", "actual", "stop", "target", "volume", "spread",
                "risk_money", "details");
   FileSeek(file, 0, SEEK_END);
   FileWrite(file, TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS), "1.30",
             AccountInfoInteger(ACCOUNT_LOGIN), event_name, symbol, side,
             requested_price, actual_price, stop, target, volume, spread,
             risk_money, details);
   FileFlush(file);
   FileClose(file);
}

string Upper(string value)
{
   StringToUpper(value);
   return value;
}

string ResolveBrokerSymbol(const string requested)
{
   if(SymbolSelect(requested, true))
      return requested;

   string wanted = Upper(requested);
   string best = "";
   int best_length = 1000000;
   int total = SymbolsTotal(false);

   for(int i = 0; i < total; i++)
   {
      string candidate = SymbolName(i, false);
      string candidate_upper = Upper(candidate);
      if(StringFind(candidate_upper, wanted) >= 0 && StringLen(candidate) < best_length)
      {
         best = candidate;
         best_length = StringLen(candidate);
      }
   }

   if(best != "" && SymbolSelect(best, true))
      return best;
   return "";
}

bool ReadValue(const int handle, const int shift, double &value)
{
   double buffer[1];
   if(handle == INVALID_HANDLE || CopyBuffer(handle, 0, shift, 1, buffer) != 1)
      return false;
   value = buffer[0];
   return MathIsValidNumber(value);
}

bool ReadBufferValue(const int handle, const int buffer_number, const int shift, double &value)
{
   double buffer[1];
   if(handle == INVALID_HANDLE || CopyBuffer(handle, buffer_number, shift, 1, buffer) != 1)
      return false;
   value = buffer[0];
   return MathIsValidNumber(value);
}

bool ReadPriorChannel(const string symbol, double &highest, double &lowest)
{
   MqlRates history[];
   ArrayResize(history, InpBreakoutPeriod);
   // Start at shift 2: the signal candle at shift 1 can only break earlier candles.
   if(CopyRates(symbol, InpTimeframe, 2, InpBreakoutPeriod, history) != InpBreakoutPeriod)
      return false;

   highest = history[0].high;
   lowest = history[0].low;
   for(int i = 1; i < InpBreakoutPeriod; i++)
   {
      highest = MathMax(highest, history[i].high);
      lowest = MathMin(lowest, history[i].low);
   }
   return true;
}

string PriceText(const string symbol, const double value)
{
   if(value == 0.0)
      return "-";
   return DoubleToString(value, (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS));
}

double NormalizeVolume(const string symbol, const double volume)
{
   double minimum = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maximum = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double step = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   if(step <= 0.0)
      return 0.0;
   if(volume < minimum)
   {
      Print("SignalForge: calculated volume is below the broker minimum for ", symbol,
            "; order blocked to preserve the risk limit.");
      return 0.0;
   }

   double normalized = MathFloor(volume / step) * step;
   normalized = MathMin(maximum, normalized);
   return NormalizeDouble(normalized, 8);
}

double RiskBasedVolume(const string symbol, const string side,
                       const double entry, const double stop)
{
   double risk_money = AccountInfoDouble(ACCOUNT_EQUITY) * InpRiskPercent / 100.0;
   double loss_for_one_lot = 0.0;
   ENUM_ORDER_TYPE order_type = side == "BUY" ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;

   if(!OrderCalcProfit(order_type, symbol, 1.0, entry, stop, loss_for_one_lot))
      return 0.0;
   loss_for_one_lot = MathAbs(loss_for_one_lot);
   if(loss_for_one_lot <= 0.0)
      return 0.0;

   return NormalizeVolume(symbol, risk_money / loss_for_one_lot);
}

bool IsTradeSessionOpen(const string symbol)
{
   datetime now = TimeTradeServer();
   if(now == 0)
      now = TimeCurrent();
   MqlDateTime parts = {};
   TimeToStruct(now, parts);
   int seconds_now = parts.hour * 3600 + parts.min * 60 + parts.sec;
   bool session_data_found = false;

   for(uint index = 0; index < 10; index++)
   {
      datetime session_from, session_to;
      if(!SymbolInfoSessionTrade(symbol, (ENUM_DAY_OF_WEEK)parts.day_of_week,
                                 index, session_from, session_to))
         break;
      session_data_found = true;
      int from_seconds = (int)session_from;
      int to_seconds = (int)session_to;
      if(from_seconds == to_seconds)
         return true;
      if(from_seconds < to_seconds &&
         seconds_now >= from_seconds && seconds_now < to_seconds)
         return true;
      if(from_seconds > to_seconds &&
         (seconds_now >= from_seconds || seconds_now < to_seconds))
         return true;
   }
   // Some OTC brokers publish no session metadata; OrderCheck remains the
   // authoritative final gate in that case.
   return !session_data_found;
}

ENUM_ORDER_TYPE_FILLING FillingMode(const string symbol)
{
   long modes = SymbolInfoInteger(symbol, SYMBOL_FILLING_MODE);
   if((modes & SYMBOL_FILLING_FOK) == SYMBOL_FILLING_FOK)
      return ORDER_FILLING_FOK;
   if((modes & SYMBOL_FILLING_IOC) == SYMBOL_FILLING_IOC)
      return ORDER_FILLING_IOC;
   return ORDER_FILLING_RETURN;
}

bool PreflightOrder(const string symbol, const string side, const double volume,
                    const double entry, const double stop, const double target,
                    string &failure)
{
   if(!IsTradeSessionOpen(symbol))
   {
      failure = "Broker trading session is closed";
      return false;
   }

   long trade_mode = SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE);
   if(trade_mode == SYMBOL_TRADE_MODE_DISABLED || trade_mode == SYMBOL_TRADE_MODE_CLOSEONLY ||
      (side == "BUY" && trade_mode == SYMBOL_TRADE_MODE_SHORTONLY) ||
      (side == "SELL" && trade_mode == SYMBOL_TRADE_MODE_LONGONLY))
   {
      failure = "Symbol trade mode blocks this direction";
      return false;
   }

   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   long stops_level = SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL);
   long freeze_level = SymbolInfoInteger(symbol, SYMBOL_TRADE_FREEZE_LEVEL);
   double required_distance = MathMax(stops_level, freeze_level) * point;
   if(MathAbs(entry - stop) < required_distance || MathAbs(target - entry) < required_distance)
   {
      failure = "Stop or target violates broker distance rules";
      return false;
   }

   MqlTradeRequest request = {};
   MqlTradeCheckResult check = {};
   request.action = TRADE_ACTION_DEAL;
   request.magic = InpMagicNumber;
   request.symbol = symbol;
   request.volume = volume;
   request.type = side == "BUY" ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   request.price = entry;
   request.sl = stop;
   request.tp = target;
   request.deviation = 20;
   request.type_filling = FillingMode(symbol);
   request.type_time = ORDER_TIME_GTC;

   ResetLastError();
   if(!OrderCheck(request, check))
   {
      failure = StringFormat("OrderCheck failed: %u %s", check.retcode, check.comment);
      return false;
   }
   return true;
}

void TryDemoOrder(const PairState &pair)
{
   if(!InpEnableDemoTrading || pair.signal == "WAIT")
      return;
   if(!RiskGate())
      return;

   bool is_strategy_test = (bool)MQLInfoInteger(MQL_TESTER);
   if(!is_strategy_test &&
      (ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE) != ACCOUNT_TRADE_MODE_DEMO)
   {
      Print("SignalForge: order blocked because this is not a demo account.");
      return;
   }

   if(PositionSelect(pair.symbol))
   {
      Print("SignalForge: ", pair.symbol, " already has an open position.");
      return;
   }

   long spread = SymbolInfoInteger(pair.symbol, SYMBOL_SPREAD);
   MqlTick tick = {};
   if(!SymbolInfoTick(pair.symbol, tick) || tick.ask <= 0.0 || tick.bid <= 0.0)
   {
      HaltTrading("No valid executable quote for " + pair.symbol);
      return;
   }
   double spread_price = tick.ask - tick.bid;
   double spread_atr_percent = pair.atr > 0.0 ? spread_price / pair.atr * 100.0 : 1000.0;
   if(spread > InpMaxSpreadPoints || spread_atr_percent > InpMaxSpreadATRPercent)
   {
      Print("SignalForge: ", pair.symbol, " spread filter blocked order (", spread, " points).");
      cooldown_until = TimeCurrent() + InpCooldownMinutes * 60;
      Journal("SKIPPED_SPREAD", pair.symbol, pair.signal, pair.entry, 0.0, 0.0, 0.0,
              0.0, spread_price, 0.0, "Spread exceeded fixed or ATR limit");
      return;
   }

   double direction = pair.signal == "BUY" ? 1.0 : -1.0;
   double executable_entry = pair.signal == "BUY" ? tick.ask : tick.bid;
   double executable_stop = executable_entry - direction * pair.atr * InpStopATR;
   double executable_target = executable_entry + direction * pair.atr * InpTargetATR;
   int digits = (int)SymbolInfoInteger(pair.symbol, SYMBOL_DIGITS);
   executable_stop = NormalizeDouble(executable_stop, digits);
   executable_target = NormalizeDouble(executable_target, digits);

   double volume = RiskBasedVolume(pair.symbol, pair.signal, executable_entry, executable_stop);
   if(volume <= 0.0)
   {
      Print("SignalForge: could not calculate a valid volume for ", pair.symbol);
      return;
   }

   string preflight_failure = "";
   if(!PreflightOrder(pair.symbol, pair.signal, volume, executable_entry,
                      executable_stop, executable_target, preflight_failure))
   {
      Print("SignalForge preflight blocked order: ", preflight_failure);
      Journal("PREFLIGHT_REJECT", pair.symbol, pair.signal, pair.entry, executable_entry,
              executable_stop, executable_target, volume, spread_price, 0.0, preflight_failure);
      QueuePhonePush("SignalForge order blocked: " + preflight_failure);
      return;
   }
   bool sent = false;

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(20);
   trade.SetTypeFillingBySymbol(pair.symbol);

   if(pair.signal == "BUY")
      sent = trade.Buy(volume, pair.symbol, 0.0, executable_stop, executable_target, "SignalForge FX 1.30");
   else if(pair.signal == "SELL")
      sent = trade.Sell(volume, pair.symbol, 0.0, executable_stop, executable_target, "SignalForge FX 1.30");

   if(!sent)
   {
      Print("SignalForge order failed: ", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
      Journal("ORDER_REJECT", pair.symbol, pair.signal, pair.entry, executable_entry,
              executable_stop, executable_target, volume, spread_price, 0.0,
              trade.ResultRetcodeDescription());
      QueuePhonePush("SignalForge order failed: " + trade.ResultRetcodeDescription());
   }
   else
   {
      double actual_entry = trade.ResultPrice();
      double actual_loss = 0.0;
      ENUM_ORDER_TYPE order_type = pair.signal == "BUY" ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
      if(!OrderCalcProfit(order_type, pair.symbol, volume, actual_entry, executable_stop, actual_loss))
      {
         trade.PositionClose(pair.symbol);
         HaltTrading("Post-fill risk calculation failed", true);
         return;
      }
      double actual_risk = MathAbs(actual_loss);
      double allowed_risk = AccountInfoDouble(ACCOUNT_EQUITY) * InpRiskPercent / 100.0;
      GlobalVariableSet(StateName("LastRiskMoney"), actual_risk);
      Journal("ENTRY_FILL", pair.symbol, pair.signal, pair.entry, actual_entry,
              executable_stop, executable_target, volume, spread_price, actual_risk,
              trade.ResultRetcodeDescription());
      Print("SignalForge demo order sent: ", pair.signal, " ", pair.symbol, " ", volume, " lots.");
      if(actual_risk > allowed_risk * (1.0 + InpRiskTolerancePercent / 100.0))
      {
         Print("SignalForge: actual fill risk exceeded tolerance; closing position.");
         trade.PositionClose(pair.symbol);
         HaltTrading("Actual fill risk exceeded tolerance", true);
      }
   }
}

void QueuePhonePush(const string message)
{
   if(!InpEnablePush)
      return;
   if(pending_push != "")
      pending_push += "\n";
   pending_push += message;
}

void SendQueuedPhonePush()
{
   if(pending_push == "" || (bool)MQLInfoInteger(MQL_TESTER))
      return;

   string message = StringSubstr(pending_push, 0, 255);
   pending_push = "";
   if(!TerminalInfoInteger(TERMINAL_NOTIFICATIONS_ENABLED))
   {
      Print("SignalForge: phone push is enabled in the EA, but MT5 notifications are not configured. ",
            "Open Tools > Options > Notifications.");
      return;
   }

   // MT5 limits a notification to 255 characters. One combined message also
   // avoids exceeding the platform's frequency limit when pairs signal together.
   ResetLastError();
   if(!SendNotification(message))
      Print("SignalForge: SendNotification failed. Error ", GetLastError());
}

bool UpdatePair(PairState &pair)
{
   MqlRates bar[1];
   if(CopyRates(pair.symbol, InpTimeframe, 1, 1, bar) != 1)
   {
      pair.reason = "Waiting for broker history";
      return false;
   }

   double fast, slow, fast_old, rsi_value, atr_value;
   double adx_value, plus_di, minus_di, higher_fast, higher_slow;
   double channel_high, channel_low;
   if(!ReadValue(pair.fast_handle, 1, fast) ||
      !ReadValue(pair.slow_handle, 1, slow) ||
      !ReadValue(pair.fast_handle, 6, fast_old) ||
      !ReadValue(pair.rsi_handle, 1, rsi_value) ||
      !ReadValue(pair.atr_handle, 1, atr_value) ||
      !ReadBufferValue(pair.adx_handle, 0, 1, adx_value) ||
      !ReadBufferValue(pair.adx_handle, 1, 1, plus_di) ||
      !ReadBufferValue(pair.adx_handle, 2, 1, minus_di) ||
      !ReadValue(pair.higher_fast_handle, 1, higher_fast) ||
      !ReadValue(pair.higher_slow_handle, 1, higher_slow) ||
      !ReadPriorChannel(pair.symbol, channel_high, channel_low))
   {
      pair.reason = "Indicators are warming up";
      return false;
   }

   double close = bar[0].close;
   bool buy_trend = fast > slow && close > fast && fast > fast_old;
   bool sell_trend = fast < slow && close < fast && fast < fast_old;
   bool buy_momentum = rsi_value >= 52.0 && rsi_value <= 70.0;
   bool sell_momentum = rsi_value <= 48.0 && rsi_value >= 30.0;
   bool buy_strength = adx_value >= InpMinimumADX && plus_di > minus_di;
   bool sell_strength = adx_value >= InpMinimumADX && minus_di > plus_di;
   bool buy_higher = higher_fast > higher_slow;
   bool sell_higher = higher_fast < higher_slow;
   bool buy_breakout = close > channel_high;
   bool sell_breakout = close < channel_low;

   int buy_checks = (int)buy_trend + (int)buy_momentum + (int)buy_strength +
                    (int)buy_higher + (int)buy_breakout;
   int sell_checks = (int)sell_trend + (int)sell_momentum + (int)sell_strength +
                     (int)sell_higher + (int)sell_breakout;
   string next_signal = "WAIT";
   if(buy_checks == 5)
      next_signal = "BUY";
   else if(sell_checks == 5)
      next_signal = "SELL";

   int best_checks = MathMax(buy_checks, sell_checks);
   double agreement = (double)best_checks / 5.0;
   double separation = atr_value > 0.0 ? MathMin(MathAbs(fast - slow) / atr_value, 1.0) : 0.0;
   pair.score = MathRound((agreement * 0.90 + separation * 0.10) * 100.0);
   pair.signal = next_signal;
   pair.rsi = rsi_value;
   pair.atr = atr_value;
   pair.adx = adx_value;
   pair.higher_trend = next_signal == "BUY" ? buy_higher : next_signal == "SELL" ? sell_higher : buy_higher;
   pair.breakout = next_signal == "BUY" ? buy_breakout : next_signal == "SELL" ? sell_breakout : (buy_breakout || sell_breakout);
   pair.entry = close;
   pair.stop = 0.0;
   pair.target = 0.0;

   if(next_signal == "WAIT")
      pair.reason = StringFormat("Strict filter: %d/5 bullish, %d/5 bearish", buy_checks, sell_checks);
   else
   {
      double direction = next_signal == "BUY" ? 1.0 : -1.0;
      pair.stop = close - direction * atr_value * InpStopATR;
      pair.target = close + direction * atr_value * InpTargetATR;
      pair.reason = next_signal == "BUY" ? "Bullish trend and momentum agree" : "Bearish trend and momentum agree";
   }

   bool new_bar = pair.last_processed_bar != bar[0].time;
   if(new_bar)
   {
      pair.last_processed_bar = bar[0].time;
      string message = StringFormat("SignalForge %s %s | score %.0f | entry %s | SL %s | TP %s",
                                    pair.symbol, pair.signal, pair.score,
                                    PriceText(pair.symbol, pair.entry),
                                    PriceText(pair.symbol, pair.stop),
                                    PriceText(pair.symbol, pair.target));
      if(pair.signal != "WAIT")
      {
         Print(message);
         if(InpEnableAlerts)
            Alert(message);
         QueuePhonePush(message);
      }
      TryDemoOrder(pair);
   }
   return true;
}

void RenderDashboard()
{
   string output = "SIGNALFORGE FX 1.30  |  CLOSED-CANDLE RESEARCH\n";
   output += "Timeframe: " + EnumToString(InpTimeframe);
   output += InpEnableDemoTrading ? "  |  DEMO AUTO-TRADING ON\n\n" : "  |  SIGNALS ONLY\n\n";
   if(trading_halted)
      output += "TRADING HALTED: " + halt_reason + "\n\n";

   for(int i = 0; i < ArraySize(pairs); i++)
   {
      PairState pair = pairs[i];
      output += pair.requested + " [" + (pair.symbol == "" ? "not found" : pair.symbol) + "]  ";
      output += pair.signal + "  score " + DoubleToString(pair.score, 0) + "/100\n";
      output += "Entry " + PriceText(pair.symbol, pair.entry);
      output += "  SL " + PriceText(pair.symbol, pair.stop);
      output += "  TP " + PriceText(pair.symbol, pair.target);
      output += "  RSI " + DoubleToString(pair.rsi, 1);
      output += "  ADX " + DoubleToString(pair.adx, 1) + "\n";
      output += pair.reason + "\n\n";
   }
   output += "No strategy guarantees accuracy or profit. Validate in Strategy Tester and demo first.";
   Comment(output);
}

void RunEngine()
{
   for(int i = 0; i < ArraySize(pairs); i++)
   {
      if(pairs[i].symbol != "")
         UpdatePair(pairs[i]);
   }
   SendQueuedPhonePush();
   RenderDashboard();
}

int OnInit()
{
   if(InpFastEMA < 2 || InpSlowEMA <= InpFastEMA ||
      InpHigherFastEMA < 2 || InpHigherSlowEMA <= InpHigherFastEMA ||
      InpRSIPeriod < 2 || InpATRPeriod < 2 || InpADXPeriod < 2 ||
      InpBreakoutPeriod < 2 || InpMinimumADX <= 0.0 ||
      InpRiskPercent <= 0.0 || InpDailyLossLimitPercent <= 0.0 ||
      InpMaxDrawdownPercent <= 0.0 || InpMaxTradesPerDay < 1 ||
      InpMaxConsecutiveLosses < 1 || InpCooldownMinutes < 0)
   {
      Print("SignalForge: invalid indicator settings.");
      return INIT_PARAMETERS_INCORRECT;
   }

   string requested[];
   int count = StringSplit(InpSymbols, ',', requested);
   if(count < 1)
      return INIT_PARAMETERS_INCORRECT;

   ArrayResize(pairs, count);
   for(int i = 0; i < count; i++)
   {
      StringTrimLeft(requested[i]);
      StringTrimRight(requested[i]);
      pairs[i].requested = requested[i];
      pairs[i].symbol = ResolveBrokerSymbol(requested[i]);
      pairs[i].signal = "WAIT";
      pairs[i].reason = pairs[i].symbol == "" ? "Broker symbol not found" : "Loading history";
      pairs[i].last_processed_bar = 0;

      if(pairs[i].symbol == "")
      {
         Print("SignalForge: could not resolve broker symbol for ", requested[i]);
         continue;
      }

      if(!InpAlertOnStartup)
      {
         MqlRates latest_closed[1];
         if(CopyRates(pairs[i].symbol, InpTimeframe, 1, 1, latest_closed) == 1)
            pairs[i].last_processed_bar = latest_closed[0].time;
      }

      pairs[i].fast_handle = iMA(pairs[i].symbol, InpTimeframe, InpFastEMA, 0, MODE_EMA, PRICE_CLOSE);
      pairs[i].slow_handle = iMA(pairs[i].symbol, InpTimeframe, InpSlowEMA, 0, MODE_EMA, PRICE_CLOSE);
      pairs[i].rsi_handle = iRSI(pairs[i].symbol, InpTimeframe, InpRSIPeriod, PRICE_CLOSE);
      pairs[i].atr_handle = iATR(pairs[i].symbol, InpTimeframe, InpATRPeriod);
      pairs[i].adx_handle = iADX(pairs[i].symbol, InpTimeframe, InpADXPeriod);
      pairs[i].higher_fast_handle = iMA(pairs[i].symbol, InpHigherTimeframe, InpHigherFastEMA, 0, MODE_EMA, PRICE_CLOSE);
      pairs[i].higher_slow_handle = iMA(pairs[i].symbol, InpHigherTimeframe, InpHigherSlowEMA, 0, MODE_EMA, PRICE_CLOSE);

      if(pairs[i].fast_handle == INVALID_HANDLE || pairs[i].slow_handle == INVALID_HANDLE ||
         pairs[i].rsi_handle == INVALID_HANDLE || pairs[i].atr_handle == INVALID_HANDLE ||
         pairs[i].adx_handle == INVALID_HANDLE || pairs[i].higher_fast_handle == INVALID_HANDLE ||
         pairs[i].higher_slow_handle == INVALID_HANDLE)
      {
         Print("SignalForge: failed to create indicators for ", pairs[i].symbol);
         return INIT_FAILED;
      }
   }

   trade.SetAsyncMode(false);
   trade.SetExpertMagicNumber(InpMagicNumber);
   if(InpEmergencyStop)
   {
      CloseOwnedPositions();
      HaltTrading("Emergency stop is enabled", true);
   }
   if(!(bool)MQLInfoInteger(MQL_TESTER))
      EventSetTimer(5);
   RunEngine();
   last_engine_bar = iTime(_Symbol, InpTimeframe, 0);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   if(!(bool)MQLInfoInteger(MQL_TESTER))
      EventKillTimer();
   Comment("");
   for(int i = 0; i < ArraySize(pairs); i++)
   {
      if(pairs[i].fast_handle != INVALID_HANDLE) IndicatorRelease(pairs[i].fast_handle);
      if(pairs[i].slow_handle != INVALID_HANDLE) IndicatorRelease(pairs[i].slow_handle);
      if(pairs[i].rsi_handle != INVALID_HANDLE) IndicatorRelease(pairs[i].rsi_handle);
      if(pairs[i].atr_handle != INVALID_HANDLE) IndicatorRelease(pairs[i].atr_handle);
      if(pairs[i].adx_handle != INVALID_HANDLE) IndicatorRelease(pairs[i].adx_handle);
      if(pairs[i].higher_fast_handle != INVALID_HANDLE) IndicatorRelease(pairs[i].higher_fast_handle);
      if(pairs[i].higher_slow_handle != INVALID_HANDLE) IndicatorRelease(pairs[i].higher_slow_handle);
   }
}

void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
{
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD || trans.deal == 0)
      return;
   if(!HistoryDealSelect(trans.deal))
      return;
   if((ulong)HistoryDealGetInteger(trans.deal, DEAL_MAGIC) != InpMagicNumber)
      return;

   string symbol = HistoryDealGetString(trans.deal, DEAL_SYMBOL);
   double price = HistoryDealGetDouble(trans.deal, DEAL_PRICE);
   double volume = HistoryDealGetDouble(trans.deal, DEAL_VOLUME);
   double pnl = HistoryDealGetDouble(trans.deal, DEAL_PROFIT) +
                HistoryDealGetDouble(trans.deal, DEAL_COMMISSION) +
                HistoryDealGetDouble(trans.deal, DEAL_SWAP);
   ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
   ENUM_DEAL_TYPE type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(trans.deal, DEAL_TYPE);
   ENUM_DEAL_REASON reason = (ENUM_DEAL_REASON)HistoryDealGetInteger(trans.deal, DEAL_REASON);
   string side = type == DEAL_TYPE_BUY ? "BUY" : type == DEAL_TYPE_SELL ? "SELL" : "OTHER";
   string event_name = entry == DEAL_ENTRY_IN ? "SERVER_ENTRY" :
                       (entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY) ? "EXIT" : "DEAL";
   double original_risk = GlobalVariableCheck(StateName("LastRiskMoney")) ?
                          GlobalVariableGet(StateName("LastRiskMoney")) : 0.0;
   double result_r = original_risk > 0.0 ? pnl / original_risk : 0.0;

   Journal(event_name, symbol, side, 0.0, price, 0.0, 0.0, volume, 0.0,
           original_risk, StringFormat("%s; pnl=%.2f; R=%.2f",
                                       EnumToString(reason), pnl, result_r));
   if(event_name == "EXIT")
      QueuePhonePush(StringFormat("SignalForge %s exit | P/L %.2f | %.2fR | %s",
                                  symbol, pnl, result_r, EnumToString(reason)));
}

void OnTimer()
{
   RunEngine();
}

void OnTick()
{
   if(!(bool)MQLInfoInteger(MQL_TESTER))
      return;

   datetime current_bar = iTime(_Symbol, InpTimeframe, 0);
   if(current_bar != 0 && current_bar != last_engine_bar)
   {
      last_engine_bar = current_bar;
      RunEngine();
   }
}
