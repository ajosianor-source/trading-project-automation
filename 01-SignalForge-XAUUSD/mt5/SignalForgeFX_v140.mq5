#property copyright "SignalForge FX"
#property version   "1.40"
#property strict
#property description "XAUUSD v1.40 long-regime research EA. Validate across decades before demo use."

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
input bool            InpUseRegimeFilter  = true;
input ENUM_TIMEFRAMES InpRegimeTimeframe  = PERIOD_D1;
input int             InpRegimeFastEMA    = 50;
input int             InpRegimeSlowEMA    = 200;
input bool            InpUseMacroRegimeFilter = true;
input ENUM_TIMEFRAMES InpMacroTimeframe   = PERIOD_W1;
input int             InpMacroFastEMA     = 20;
input int             InpMacroSlowEMA     = 50;
input double          InpMinimumMacroEMAPercent = 0.10;
input double          InpMinimumEMASeparationATR = 0.20;
input double          InpMinimumATRPercent = 0.05;
input double          InpMaximumATRPercent = 0.90;
input double          InpBreakoutBufferATR = 0.05;
input bool            InpRequireSlowEMASlope = true;
input int             InpSlopeLookbackBars = 5;
input bool            InpAvoidRolloverHour = true;
input int             InpRolloverHourServer = 23;
input double          InpStopATR           = 1.5;
input double          InpTargetATR         = 3.0;
input bool            InpEnableAlerts      = true;
input bool            InpEnablePush        = true;
input bool            InpEnableNearSignalPush = true;
input bool            InpEnableWhatsApp    = true;
input string          InpWhatsAppRelayUrl  = "http://127.0.0.1:8787/alert";
input int             InpWhatsAppTimeoutMs = 10000;
input bool            InpSendStartupHealthAlert = true;
input bool            InpEnableNewsAdvisory = true;
input int             InpNewsAlertMinutes  = 30;
input int             InpNewsPostEventMinutes = 15;
input bool            InpAlertOnStartup    = false;
// Locked ON for the FTMO demo deployment so chart/profile input restoration
// cannot silently disable it. TryDemoOrder still blocks non-demo accounts.
const bool            InpEnableDemoTrading = true;
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
input bool            InpEnforceDeploymentAccount = true;
input long            InpExpectedLogin     = 1513884308;
input string          InpExpectedServerContains = "FTMO-Demo";
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
   int      regime_fast_handle;
   int      regime_slow_handle;
   int      macro_fast_handle;
   int      macro_slow_handle;
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
   bool     regime_ok;
   bool     macro_ok;
   bool     volatility_ok;
   int      buy_checks;
   int      sell_checks;
   int      buy_filters;
   int      sell_filters;
   bool     buy_trend;
   bool     sell_trend;
   bool     buy_momentum;
   bool     sell_momentum;
   bool     buy_strength;
   bool     sell_strength;
   bool     buy_higher;
   bool     sell_higher;
   bool     buy_breakout;
   bool     sell_breakout;
   bool     buy_regime;
   bool     sell_regime;
   bool     buy_macro;
   bool     sell_macro;
   bool     buy_slow_slope;
   bool     sell_slow_slope;
   bool     separation_ok;
   bool     time_ok;
   double   atr_percent;
   double   separation_atr;
   double   macro_separation_percent;
   datetime signal_bar_time;
   bool     ready;
   string   readiness_reason;
};

PairState pairs[];
CTrade trade;
string pending_push = "";
datetime last_engine_bar = 0;
datetime cooldown_until = 0;
bool trading_halted = false;
string halt_reason = "";
datetime halt_until = 0;
string last_push_status = "NOT SENT";
string last_push_message = "";
datetime last_push_time = 0;
int last_push_error = 0;
string last_whatsapp_status = "NOT SENT";
string last_whatsapp_message = "";
datetime last_whatsapp_time = 0;
int last_whatsapp_error = 0;
string whatsapp_relay_status = "NOT CHECKED";
int whatsapp_relay_error = 0;
datetime last_whatsapp_health_check = 0;
bool news_available = false;
string news_status = "DISABLED";
string news_event = "";
datetime news_event_time = 0;
int news_minutes_to = 0;
int news_error = 0;
ulong last_news_alert_id = 0;
datetime last_news_check = 0;

string JsonEscape(string value)
{
   StringReplace(value, "\\", "\\\\");
   StringReplace(value, "\"", "\\\"");
   StringReplace(value, "\r", "");
   StringReplace(value, "\n", "\\n");
   return value;
}

string JString(const string value)
{
   return "\"" + JsonEscape(value) + "\"";
}

string JBool(const bool value)
{
   return value ? "true" : "false";
}

string JNumber(const double value, const int digits = 8)
{
   if(!MathIsValidNumber(value))
      return "null";
   return DoubleToString(value, digits);
}

string StateName(const string suffix)
{
   return StringFormat("SignalForge.%I64d.%I64u.%s",
                       AccountInfoInteger(ACCOUNT_LOGIN), InpMagicNumber, suffix);
}

void SetPairNotReady(PairState &pair, const string reason)
{
   pair.ready = false;
   pair.readiness_reason = reason;
   pair.signal = "WAIT";
   pair.reason = reason;
   pair.score = 0.0;
   pair.entry = 0.0;
   pair.stop = 0.0;
   pair.target = 0.0;
   pair.rsi = 0.0;
   pair.atr = 0.0;
   pair.adx = 0.0;
   pair.higher_trend = false;
   pair.breakout = false;
   pair.regime_ok = false;
   pair.macro_ok = false;
   pair.volatility_ok = false;
   pair.buy_checks = 0;
   pair.sell_checks = 0;
   pair.buy_filters = 0;
   pair.sell_filters = 0;
   pair.buy_trend = false;
   pair.sell_trend = false;
   pair.buy_momentum = false;
   pair.sell_momentum = false;
   pair.buy_strength = false;
   pair.sell_strength = false;
   pair.buy_higher = false;
   pair.sell_higher = false;
   pair.buy_breakout = false;
   pair.sell_breakout = false;
   pair.buy_regime = false;
   pair.sell_regime = false;
   pair.buy_macro = false;
   pair.sell_macro = false;
   pair.buy_slow_slope = false;
   pair.sell_slow_slope = false;
   pair.separation_ok = false;
   pair.time_ok = false;
   pair.atr_percent = 0.0;
   pair.separation_atr = 0.0;
   pair.macro_separation_percent = 0.0;
   pair.signal_bar_time = 0;
}

void InitializePairHandles(PairState &pair)
{
   pair.fast_handle = INVALID_HANDLE;
   pair.slow_handle = INVALID_HANDLE;
   pair.rsi_handle = INVALID_HANDLE;
   pair.atr_handle = INVALID_HANDLE;
   pair.adx_handle = INVALID_HANDLE;
   pair.higher_fast_handle = INVALID_HANDLE;
   pair.higher_slow_handle = INVALID_HANDLE;
   pair.regime_fast_handle = INVALID_HANDLE;
   pair.regime_slow_handle = INVALID_HANDLE;
   pair.macro_fast_handle = INVALID_HANDLE;
   pair.macro_slow_handle = INVALID_HANDLE;
}

bool DeploymentAllowed(string &reason)
{
   reason = "";
   if((bool)MQLInfoInteger(MQL_TESTER) || !InpEnforceDeploymentAccount)
      return true;

   long login = AccountInfoInteger(ACCOUNT_LOGIN);
   string server = AccountInfoString(ACCOUNT_SERVER);
   if(InpExpectedLogin > 0 && login != InpExpectedLogin)
   {
      reason = StringFormat("ACCOUNT %I64d != %I64d", login, InpExpectedLogin);
      return false;
   }
   if(InpExpectedServerContains != "" &&
      StringFind(server, InpExpectedServerContains) < 0)
   {
      reason = "SERVER " + server;
      return false;
   }
   return true;
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
   string deployment_failure = "";
   if(!DeploymentAllowed(deployment_failure))
   {
      Print("SignalForge: deployment lock blocked trading: ", deployment_failure);
      return false;
   }
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) ||
      !MQLInfoInteger(MQL_TRADE_ALLOWED))
   {
      Print("SignalForge: automated trading permission is off.");
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
   FileWrite(file, TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS), "1.40",
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

bool ReadReadyValue(PairState &pair, const int handle, const int shift,
                    double &value, const string label)
{
   if(ReadValue(handle, shift, value))
      return true;
   SetPairNotReady(pair, label + " history is warming up");
   return false;
}

bool ReadReadyBuffer(PairState &pair, const int handle, const int buffer_number,
                     const int shift, double &value, const string label)
{
   if(ReadBufferValue(handle, buffer_number, shift, value))
      return true;
   SetPairNotReady(pair, label + " history is warming up");
   return false;
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
   if(!InpEnableDemoTrading || !pair.ready || pair.signal == "WAIT")
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
   if(!InpEnablePush && !InpEnableWhatsApp)
   {
      last_push_status = "DISABLED";
      last_whatsapp_status = "DISABLED";
      return;
   }
   if(pending_push != "")
      pending_push += "\n";
   pending_push += message;
}

void SendWhatsAppRelay(const string message)
{
   if(!InpEnableWhatsApp)
   {
      last_whatsapp_status = "DISABLED";
      return;
   }

   char body[];
   int copied = StringToCharArray(message, body, 0, WHOLE_ARRAY, CP_UTF8);
   if(copied > 0)
      ArrayResize(body, copied - 1);

   char response[];
   string response_headers = "";
   string headers = "Content-Type: text/plain; charset=utf-8\r\n";
   ResetLastError();
   int status_code = WebRequest("POST", InpWhatsAppRelayUrl, headers,
                                InpWhatsAppTimeoutMs, body, response,
                                response_headers);
   last_whatsapp_message = message;
   last_whatsapp_time = TimeCurrent();

   if(status_code == -1)
   {
      last_whatsapp_status = "FAILED";
      last_whatsapp_error = GetLastError();
      Print("SignalForge: WhatsApp relay request failed. Error ",
            last_whatsapp_error,
            ". Allow http://127.0.0.1:8787 in Tools > Options > Expert Advisors.");
      return;
   }
   if(status_code < 200 || status_code >= 300)
   {
      last_whatsapp_status = "FAILED";
      last_whatsapp_error = status_code;
      Print("SignalForge: WhatsApp relay returned HTTP ", status_code, ".");
      return;
   }

   last_whatsapp_status = "SENT";
   last_whatsapp_error = 0;
}

void CheckWhatsAppRelay()
{
   if(!InpEnableWhatsApp)
   {
      whatsapp_relay_status = "DISABLED";
      whatsapp_relay_error = 0;
      return;
   }
   if((bool)MQLInfoInteger(MQL_TESTER))
   {
      whatsapp_relay_status = "TESTER OFF";
      whatsapp_relay_error = 0;
      return;
   }

   datetime now = TimeCurrent();
   if(last_whatsapp_health_check > 0 && now - last_whatsapp_health_check < 60)
      return;
   last_whatsapp_health_check = now;

   string health_url = InpWhatsAppRelayUrl;
   int alert_at = StringFind(health_url, "/alert");
   if(alert_at >= 0)
      health_url = StringSubstr(health_url, 0, alert_at) + "/health";

   char request_body[];
   char response[];
   string response_headers = "";
   ResetLastError();
   int status_code = WebRequest("GET", health_url, "", 1000,
                                request_body, response, response_headers);
   if(status_code == -1)
   {
      whatsapp_relay_status = "OFFLINE";
      whatsapp_relay_error = GetLastError();
      return;
   }
   if(status_code < 200 || status_code >= 300)
   {
      whatsapp_relay_status = "ERROR";
      whatsapp_relay_error = status_code;
      return;
   }
   whatsapp_relay_status = "READY";
   whatsapp_relay_error = 0;
}

void UpdateNewsAdvisory()
{
   datetime now = TimeTradeServer();
   if(now == 0)
      now = TimeCurrent();
   if(!InpEnableNewsAdvisory)
   {
      news_available = false;
      news_status = "DISABLED";
      return;
   }
   if((bool)MQLInfoInteger(MQL_TESTER))
   {
      news_available = false;
      news_status = "TESTER OFF";
      return;
   }
   if(last_news_check > 0 && now - last_news_check < 60)
      return;
   last_news_check = now;
   news_available = false;
   news_status = "UNAVAILABLE";
   news_event = "";
   news_event_time = 0;
   news_minutes_to = 0;
   news_error = 0;

   MqlCalendarValue values[];
   datetime from_time = now - InpNewsPostEventMinutes * 60;
   datetime to_time = now + 86400;
   ResetLastError();
   int count = CalendarValueHistory(values, from_time, to_time, NULL, "USD");
   if(count < 0)
   {
      news_error = GetLastError();
      return;
   }
   news_available = true;
   news_status = "CLEAR";

   int selected = -1;
   bool selected_is_upcoming = false;
   datetime selected_time = 0;
   MqlCalendarEvent selected_event = {};
   for(int i = 0; i < count; i++)
   {
      MqlCalendarEvent event = {};
      if(!CalendarEventById(values[i].event_id, event) ||
         event.importance != CALENDAR_IMPORTANCE_HIGH)
         continue;

      bool upcoming = values[i].time >= now;
      bool recent = values[i].time < now &&
                    now - values[i].time <= InpNewsPostEventMinutes * 60;
      if(!upcoming && !recent)
         continue;

      bool better = selected < 0 ||
                    (upcoming && !selected_is_upcoming) ||
                    (upcoming == selected_is_upcoming &&
                     ((upcoming && values[i].time < selected_time) ||
                      (!upcoming && values[i].time > selected_time)));
      if(better)
      {
         selected = i;
         selected_is_upcoming = upcoming;
         selected_time = values[i].time;
         selected_event = event;
      }
   }

   if(selected < 0)
      return;

   news_event = selected_event.name;
   news_event_time = selected_time;
   news_minutes_to = (int)MathCeil((double)(selected_time - now) / 60.0);
   if(selected_is_upcoming && selected_time - now <= InpNewsAlertMinutes * 60)
   {
      news_status = "EVENT SOON";
      if(values[selected].id != last_news_alert_id)
      {
         last_news_alert_id = values[selected].id;
         QueuePhonePush(StringFormat(
            "SignalForge NEWS ADVISORY | USD high impact in %d min | %s | trades unchanged",
            MathMax(news_minutes_to, 0), news_event));
      }
   }
   else if(!selected_is_upcoming)
      news_status = "POST-EVENT";
}

void SendQueuedPhonePush()
{
   if(pending_push == "" || (bool)MQLInfoInteger(MQL_TESTER))
      return;

   string message = StringSubstr(pending_push, 0, 255);
   pending_push = "";
   if(InpEnablePush && !TerminalInfoInteger(TERMINAL_NOTIFICATIONS_ENABLED))
   {
      last_push_status = "NOT CONFIGURED";
      last_push_message = message;
      last_push_time = TimeCurrent();
      last_push_error = 4517;
      Print("SignalForge: phone push is enabled in the EA, but MT5 notifications are not configured. ",
            "Open Tools > Options > Notifications.");
   }
   else if(InpEnablePush)
   {
      // MT5 limits a notification to 255 characters. One combined message also
      // avoids exceeding the platform's frequency limit when pairs signal together.
      ResetLastError();
      if(!SendNotification(message))
      {
         last_push_status = "FAILED";
         last_push_message = message;
         last_push_time = TimeCurrent();
         last_push_error = GetLastError();
         Print("SignalForge: SendNotification failed. Error ", last_push_error);
      }
      else
      {
         last_push_status = "SENT";
         last_push_message = message;
         last_push_time = TimeCurrent();
         last_push_error = 0;
      }
   }
   else
      last_push_status = "DISABLED";

   SendWhatsAppRelay(message);
}

bool UpdatePair(PairState &pair)
{
   SetPairNotReady(pair, "Waiting for broker history");
   MqlRates bar[1];
   if(CopyRates(pair.symbol, InpTimeframe, 1, 1, bar) != 1)
      return false;

   double fast, slow, fast_old, slow_old, rsi_value, atr_value;
   double adx_value, plus_di, minus_di, higher_fast, higher_slow;
   double regime_fast, regime_slow, regime_fast_old;
   double macro_fast, macro_slow, macro_fast_old;
   double channel_high, channel_low;
   if(!ReadReadyValue(pair, pair.fast_handle, 1, fast, "H1 fast EMA")) return false;
   if(!ReadReadyValue(pair, pair.slow_handle, 1, slow, "H1 slow EMA")) return false;
   if(!ReadReadyValue(pair, pair.fast_handle, 6, fast_old, "H1 EMA slope")) return false;
   if(!ReadReadyValue(pair, pair.slow_handle, InpSlopeLookbackBars + 1, slow_old, "H1 slow EMA slope")) return false;
   if(!ReadReadyValue(pair, pair.rsi_handle, 1, rsi_value, "H1 RSI")) return false;
   if(!ReadReadyValue(pair, pair.atr_handle, 1, atr_value, "H1 ATR")) return false;
   if(!ReadReadyBuffer(pair, pair.adx_handle, 0, 1, adx_value, "H1 ADX")) return false;
   if(!ReadReadyBuffer(pair, pair.adx_handle, 1, 1, plus_di, "H1 +DI")) return false;
   if(!ReadReadyBuffer(pair, pair.adx_handle, 2, 1, minus_di, "H1 -DI")) return false;
   if(!ReadReadyValue(pair, pair.higher_fast_handle, 1, higher_fast, "H4 fast EMA")) return false;
   if(!ReadReadyValue(pair, pair.higher_slow_handle, 1, higher_slow, "H4 slow EMA")) return false;
   if(!ReadReadyValue(pair, pair.regime_fast_handle, 1, regime_fast, "D1 fast EMA")) return false;
   if(!ReadReadyValue(pair, pair.regime_slow_handle, 1, regime_slow, "D1 slow EMA")) return false;
   if(!ReadReadyValue(pair, pair.regime_fast_handle, InpSlopeLookbackBars + 1, regime_fast_old, "D1 EMA slope")) return false;
   if(!ReadReadyValue(pair, pair.macro_fast_handle, 1, macro_fast, "W1 fast EMA")) return false;
   if(!ReadReadyValue(pair, pair.macro_slow_handle, 1, macro_slow, "W1 slow EMA")) return false;
   if(!ReadReadyValue(pair, pair.macro_fast_handle, InpSlopeLookbackBars + 1, macro_fast_old, "W1 EMA slope")) return false;
   if(!ReadPriorChannel(pair.symbol, channel_high, channel_low))
   {
      SetPairNotReady(pair, "H1 breakout history is warming up");
      return false;
   }
   MqlRates regime_bar[1];
   MqlRates macro_bar[1];
   if(CopyRates(pair.symbol, InpRegimeTimeframe, 1, 1, regime_bar) != 1)
   {
      SetPairNotReady(pair, "D1 regime history is warming up");
      return false;
   }
   if(CopyRates(pair.symbol, InpMacroTimeframe, 1, 1, macro_bar) != 1)
   {
      SetPairNotReady(pair, "W1 macro history is warming up");
      return false;
   }

   double close = bar[0].close;
   double atr_percent = close > 0.0 ? atr_value / close * 100.0 : 0.0;
   double separation_atr = atr_value > 0.0 ? MathAbs(fast - slow) / atr_value : 0.0;
   bool buy_trend = fast > slow && close > fast && fast > fast_old;
   bool sell_trend = fast < slow && close < fast && fast < fast_old;
   bool buy_slow_slope = !InpRequireSlowEMASlope || slow > slow_old;
   bool sell_slow_slope = !InpRequireSlowEMASlope || slow < slow_old;
   bool buy_momentum = rsi_value >= 52.0 && rsi_value <= 70.0;
   bool sell_momentum = rsi_value <= 48.0 && rsi_value >= 30.0;
   bool buy_strength = adx_value >= InpMinimumADX && plus_di > minus_di;
   bool sell_strength = adx_value >= InpMinimumADX && minus_di > plus_di;
   bool buy_higher = higher_fast > higher_slow;
   bool sell_higher = higher_fast < higher_slow;
   bool buy_breakout = close > channel_high + atr_value * InpBreakoutBufferATR;
   bool sell_breakout = close < channel_low - atr_value * InpBreakoutBufferATR;
   bool volatility_ok = atr_percent >= InpMinimumATRPercent && atr_percent <= InpMaximumATRPercent;
   bool separation_ok = separation_atr >= InpMinimumEMASeparationATR;
   bool buy_regime = !InpUseRegimeFilter ||
                     (regime_bar[0].close > regime_fast && regime_fast > regime_slow &&
                      regime_fast >= regime_fast_old);
   bool sell_regime = !InpUseRegimeFilter ||
                      (regime_bar[0].close < regime_fast && regime_fast < regime_slow &&
                       regime_fast <= regime_fast_old);
   double macro_separation_percent = macro_bar[0].close > 0.0 ?
                                     MathAbs(macro_fast - macro_slow) / macro_bar[0].close * 100.0 : 0.0;
   bool macro_separation_ok = macro_separation_percent >= InpMinimumMacroEMAPercent;
   bool buy_macro = !InpUseMacroRegimeFilter ||
                    (macro_bar[0].close > macro_fast && macro_fast > macro_slow &&
                     macro_fast >= macro_fast_old && macro_separation_ok);
   bool sell_macro = !InpUseMacroRegimeFilter ||
                     (macro_bar[0].close < macro_fast && macro_fast < macro_slow &&
                      macro_fast <= macro_fast_old && macro_separation_ok);
   bool time_ok = true;
   if(InpAvoidRolloverHour)
   {
      MqlDateTime closed_bar_time = {};
      TimeToStruct(bar[0].time, closed_bar_time);
      time_ok = closed_bar_time.hour != InpRolloverHourServer;
   }

   int buy_checks = (int)buy_trend + (int)buy_momentum + (int)buy_strength +
                    (int)buy_higher + (int)buy_breakout;
   int sell_checks = (int)sell_trend + (int)sell_momentum + (int)sell_strength +
                     (int)sell_higher + (int)sell_breakout;
   int buy_filters = (int)buy_regime + (int)buy_macro + (int)volatility_ok +
                     (int)separation_ok + (int)buy_slow_slope + (int)time_ok;
   int sell_filters = (int)sell_regime + (int)sell_macro + (int)volatility_ok +
                      (int)separation_ok + (int)sell_slow_slope + (int)time_ok;
   string next_signal = "WAIT";
   if(buy_checks == 5 && buy_filters == 6)
      next_signal = "BUY";
   else if(sell_checks == 5 && sell_filters == 6)
      next_signal = "SELL";

   int best_checks = MathMax(buy_checks, sell_checks);
   int best_filters = MathMax(buy_filters, sell_filters);
   double agreement = (double)best_checks / 5.0;
   double filter_agreement = (double)best_filters / 6.0;
   double separation = atr_value > 0.0 ? MathMin(MathAbs(fast - slow) / atr_value, 1.0) : 0.0;
   pair.score = MathRound((agreement * 0.65 + filter_agreement * 0.25 + separation * 0.10) * 100.0);
   pair.signal = next_signal;
   pair.rsi = rsi_value;
   pair.atr = atr_value;
   pair.adx = adx_value;
   pair.higher_trend = next_signal == "BUY" ? buy_higher : next_signal == "SELL" ? sell_higher : buy_higher;
   pair.breakout = next_signal == "BUY" ? buy_breakout : next_signal == "SELL" ? sell_breakout : (buy_breakout || sell_breakout);
   pair.regime_ok = next_signal == "BUY" ? buy_regime : next_signal == "SELL" ? sell_regime : (buy_regime || sell_regime);
   pair.macro_ok = next_signal == "BUY" ? buy_macro : next_signal == "SELL" ? sell_macro : (buy_macro || sell_macro);
   pair.volatility_ok = volatility_ok && separation_ok;
   pair.buy_checks = buy_checks;
   pair.sell_checks = sell_checks;
   pair.buy_filters = buy_filters;
   pair.sell_filters = sell_filters;
   pair.buy_trend = buy_trend;
   pair.sell_trend = sell_trend;
   pair.buy_momentum = buy_momentum;
   pair.sell_momentum = sell_momentum;
   pair.buy_strength = buy_strength;
   pair.sell_strength = sell_strength;
   pair.buy_higher = buy_higher;
   pair.sell_higher = sell_higher;
   pair.buy_breakout = buy_breakout;
   pair.sell_breakout = sell_breakout;
   pair.buy_regime = buy_regime;
   pair.sell_regime = sell_regime;
   pair.buy_macro = buy_macro;
   pair.sell_macro = sell_macro;
   pair.buy_slow_slope = buy_slow_slope;
   pair.sell_slow_slope = sell_slow_slope;
   pair.separation_ok = separation_ok;
   pair.time_ok = time_ok;
   pair.atr_percent = atr_percent;
   pair.separation_atr = separation_atr;
   pair.macro_separation_percent = macro_separation_percent;
   pair.signal_bar_time = bar[0].time;
   pair.ready = true;
   pair.readiness_reason = "READY";
   pair.entry = close;
   pair.stop = 0.0;
   pair.target = 0.0;

   if(next_signal == "WAIT")
      pair.reason = StringFormat("v1.40 long-regime: base %d/5 bull, %d/5 bear | filters %d/6 bull, %d/6 bear | ATR %.2f%% | W1 sep %.2f%%",
                                 buy_checks, sell_checks, buy_filters, sell_filters,
                                 atr_percent, macro_separation_percent);
   else
   {
      double direction = next_signal == "BUY" ? 1.0 : -1.0;
      pair.stop = close - direction * atr_value * InpStopATR;
      pair.target = close + direction * atr_value * InpTargetATR;
      pair.reason = next_signal == "BUY" ? "Bullish setup passed D1/W1 regime and volatility filters" :
                                            "Bearish setup passed D1/W1 regime and volatility filters";
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
      else if(InpEnableNearSignalPush && best_checks >= 4)
      {
         bool near_buy = buy_checks >= sell_checks;
         int near_checks = near_buy ? buy_checks : sell_checks;
         int near_filters = near_buy ? buy_filters : sell_filters;
         string near_side = near_buy ? "BUY" : "SELL";
         string near_message = StringFormat(
            "SignalForge %s %s setup forming | %d/5 base, %d/6 filters | NO TRADE YET",
            pair.symbol, near_side, near_checks, near_filters);
         Print(near_message);
         QueuePhonePush(near_message);
      }
      TryDemoOrder(pair);
   }
   return true;
}

void RenderDashboard()
{
   string output = "SIGNALFORGE FX 1.40  |  REGIME-FILTERED RESEARCH\n";
   output += "Timeframe: " + EnumToString(InpTimeframe);
   output += InpEnableDemoTrading ? "  |  DEMO AUTO-TRADING ON\n\n" : "  |  SIGNALS ONLY\n\n";
   if(trading_halted)
      output += "TRADING HALTED: " + halt_reason + "\n\n";

   for(int i = 0; i < ArraySize(pairs); i++)
   {
      PairState pair = pairs[i];
      output += pair.requested + " [" + (pair.symbol == "" ? "not found" : pair.symbol) + "]  ";
      output += (pair.ready ? pair.signal + "  score " + DoubleToString(pair.score, 0) + "/100\n" :
                              "DATA WARMING - ORDERS BLOCKED\n");
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

void ExportStrategySnapshot()
{
   if(ArraySize(pairs) == 0 || pairs[0].symbol == "")
      return;

   PairState pair = pairs[0];
   datetime now = TimeCurrent();
   datetime current_bar = iTime(pair.symbol, InpTimeframe, 0);
   int period_seconds = PeriodSeconds(InpTimeframe);
   datetime next_close = current_bar > 0 && period_seconds > 0 ? current_bar + period_seconds : 0;
   bool account_demo = AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_DEMO;
   bool terminal_trade_allowed = (bool)TerminalInfoInteger(TERMINAL_TRADE_ALLOWED);
   bool ea_trade_allowed = (bool)MQLInfoInteger(MQL_TRADE_ALLOWED);
   bool notifications_configured = (bool)TerminalInfoInteger(TERMINAL_NOTIFICATIONS_ENABLED);
   string deployment_failure = "";
   bool deployment_ok = DeploymentAllowed(deployment_failure);
   string auto_status = trading_halted ? "HALTED" :
                        !InpEnableDemoTrading ? "OFF" :
                        !pair.ready ? "BLOCKED: WARMING" :
                        !deployment_ok ? "BLOCKED: DEPLOYMENT" :
                        !account_demo ? "BLOCKED: NOT DEMO" :
                        (!terminal_trade_allowed || !ea_trade_allowed) ? "BLOCKED: ALGO OFF" : "ON";

   string json = "{" +
      "\"schema\":1," +
      "\"version\":\"1.40\"," +
      "\"heartbeat\":" + JString(TimeToString(now, TIME_DATE|TIME_SECONDS)) + "," +
      "\"heartbeatUnix\":" + IntegerToString((long)now) + "," +
      "\"symbol\":" + JString(pair.symbol) + "," +
      "\"timeframe\":" + JString(EnumToString(InpTimeframe)) + "," +
      "\"signalBarUnix\":" + IntegerToString((long)pair.signal_bar_time) + "," +
      "\"nextCloseUnix\":" + IntegerToString((long)next_close) + "," +
      "\"side\":" + JString(pair.signal) + "," +
      "\"reason\":" + JString(pair.reason) + "," +
      "\"score\":" + JNumber(pair.score, 0) + "," +
      "\"entry\":" + JNumber(pair.entry, 2) + "," +
      "\"stop\":" + JNumber(pair.stop, 2) + "," +
      "\"target\":" + JNumber(pair.target, 2) + "," +
      "\"readiness\":{\"ready\":" + JBool(pair.ready) +
         ",\"reason\":" + JString(pair.readiness_reason) + "}," +
      "\"base\":{\"buy\":" + IntegerToString(pair.buy_checks) +
      ",\"sell\":" + IntegerToString(pair.sell_checks) +
      ",\"required\":5,\"items\":{" +
         "\"H1 trend\":{\"buy\":" + JBool(pair.buy_trend) + ",\"sell\":" + JBool(pair.sell_trend) + "}," +
         "\"RSI momentum\":{\"buy\":" + JBool(pair.buy_momentum) + ",\"sell\":" + JBool(pair.sell_momentum) + "}," +
         "\"ADX direction\":{\"buy\":" + JBool(pair.buy_strength) + ",\"sell\":" + JBool(pair.sell_strength) + "}," +
         "\"H4 regime\":{\"buy\":" + JBool(pair.buy_higher) + ",\"sell\":" + JBool(pair.sell_higher) + "}," +
         "\"20-bar breakout\":{\"buy\":" + JBool(pair.buy_breakout) + ",\"sell\":" + JBool(pair.sell_breakout) + "}}}," +
      "\"filters\":{\"buy\":" + IntegerToString(pair.buy_filters) +
      ",\"sell\":" + IntegerToString(pair.sell_filters) +
      ",\"required\":6,\"items\":{" +
         "\"D1 regime\":{\"buy\":" + JBool(pair.buy_regime) + ",\"sell\":" + JBool(pair.sell_regime) + "}," +
         "\"W1 macro\":{\"buy\":" + JBool(pair.buy_macro) + ",\"sell\":" + JBool(pair.sell_macro) + "}," +
         "\"ATR volatility\":{\"buy\":" + JBool(pair.volatility_ok) + ",\"sell\":" + JBool(pair.volatility_ok) + "}," +
         "\"EMA separation\":{\"buy\":" + JBool(pair.separation_ok) + ",\"sell\":" + JBool(pair.separation_ok) + "}," +
         "\"Slow EMA slope\":{\"buy\":" + JBool(pair.buy_slow_slope) + ",\"sell\":" + JBool(pair.sell_slow_slope) + "}," +
         "\"Trading hour\":{\"buy\":" + JBool(pair.time_ok) + ",\"sell\":" + JBool(pair.time_ok) + "}}}," +
      "\"metrics\":{\"rsi\":" + JNumber(pair.rsi, 1) +
      ",\"adx\":" + JNumber(pair.adx, 1) +
      ",\"atr\":" + JNumber(pair.atr, 2) +
      ",\"atrPercent\":" + JNumber(pair.atr_percent, 3) +
      ",\"emaSeparationATR\":" + JNumber(pair.separation_atr, 3) +
      ",\"weeklySeparationPercent\":" + JNumber(pair.macro_separation_percent, 3) + "}," +
      "\"automation\":{\"status\":" + JString(auto_status) +
      ",\"demoTrading\":" + JBool(InpEnableDemoTrading) +
      ",\"accountDemo\":" + JBool(account_demo) +
      ",\"algoTrading\":" + JBool(terminal_trade_allowed) +
      ",\"eaTradePermission\":" + JBool(ea_trade_allowed) +
      ",\"deploymentLock\":" + JBool(InpEnforceDeploymentAccount) +
      ",\"deploymentAllowed\":" + JBool(deployment_ok) +
      ",\"deploymentReason\":" + JString(deployment_failure) +
      ",\"expectedLogin\":" + IntegerToString(InpExpectedLogin) +
      ",\"expectedServer\":" + JString(InpExpectedServerContains) +
      ",\"halted\":" + JBool(trading_halted) +
      ",\"haltReason\":" + JString(halt_reason) +
      ",\"riskPercent\":" + JNumber(InpRiskPercent, 2) + "}," +
      "\"notification\":{\"enabled\":" + JBool(InpEnablePush) +
      ",\"nearSignalEnabled\":" + JBool(InpEnableNearSignalPush) +
      ",\"configured\":" + JBool(notifications_configured) +
      ",\"status\":" + JString(last_push_status) +
      ",\"lastMessage\":" + JString(last_push_message) +
      ",\"lastTimeUnix\":" + IntegerToString((long)last_push_time) +
      ",\"error\":" + IntegerToString(last_push_error) +
      ",\"whatsApp\":{\"enabled\":" + JBool(InpEnableWhatsApp) +
         ",\"status\":" + JString(last_whatsapp_status) +
         ",\"lastMessage\":" + JString(last_whatsapp_message) +
         ",\"lastTimeUnix\":" + IntegerToString((long)last_whatsapp_time) +
         ",\"error\":" + IntegerToString(last_whatsapp_error) +
         ",\"relayStatus\":" + JString(whatsapp_relay_status) +
         ",\"relayError\":" + IntegerToString(whatsapp_relay_error) + "}}," +
      "\"news\":{\"enabled\":" + JBool(InpEnableNewsAdvisory) +
      ",\"available\":" + JBool(news_available) +
      ",\"status\":" + JString(news_status) +
      ",\"currency\":\"USD\"" +
      ",\"event\":" + JString(news_event) +
      ",\"eventTimeUnix\":" + IntegerToString((long)news_event_time) +
      ",\"minutesTo\":" + IntegerToString(news_minutes_to) +
      ",\"importance\":\"HIGH\"" +
      ",\"alertMinutes\":" + IntegerToString(InpNewsAlertMinutes) +
      ",\"postEventMinutes\":" + IntegerToString(InpNewsPostEventMinutes) +
      ",\"advisoryOnly\":true" +
      ",\"error\":" + IntegerToString(news_error) + "}" +
      "}";

   FolderCreate("SignalForge", FILE_COMMON);
   int file = FileOpen("SignalForge\\strategy.json",
                       FILE_WRITE|FILE_TXT|FILE_ANSI|FILE_COMMON|FILE_SHARE_READ,
                       0, CP_UTF8);
   if(file == INVALID_HANDLE)
   {
      Print("SignalForge: strategy.json open failed, error ", GetLastError());
      return;
   }
   FileWriteString(file, json);
   FileFlush(file);
   FileClose(file);
}

void RunEngine()
{
   for(int i = 0; i < ArraySize(pairs); i++)
   {
      if(pairs[i].symbol != "")
         UpdatePair(pairs[i]);
   }
   UpdateNewsAdvisory();
   CheckWhatsAppRelay();
   SendQueuedPhonePush();
   RenderDashboard();
   ExportStrategySnapshot();
}

int OnInit()
{
   if(InpFastEMA < 2 || InpSlowEMA <= InpFastEMA ||
      InpHigherFastEMA < 2 || InpHigherSlowEMA <= InpHigherFastEMA ||
      InpRSIPeriod < 2 || InpATRPeriod < 2 || InpADXPeriod < 2 ||
      InpBreakoutPeriod < 2 || InpMinimumADX <= 0.0 ||
      InpRegimeFastEMA < 2 || InpRegimeSlowEMA <= InpRegimeFastEMA ||
      InpMacroFastEMA < 2 || InpMacroSlowEMA <= InpMacroFastEMA ||
      InpMinimumMacroEMAPercent < 0.0 ||
      InpMinimumEMASeparationATR < 0.0 || InpMinimumATRPercent < 0.0 ||
      InpMaximumATRPercent <= InpMinimumATRPercent || InpBreakoutBufferATR < 0.0 ||
      InpSlopeLookbackBars < 1 || InpRolloverHourServer < 0 || InpRolloverHourServer > 23 ||
      InpWhatsAppTimeoutMs < 500 ||
      InpNewsAlertMinutes < 1 || InpNewsPostEventMinutes < 0 ||
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
      InitializePairHandles(pairs[i]);
      pairs[i].last_processed_bar = 0;
      StringTrimLeft(requested[i]);
      StringTrimRight(requested[i]);
      pairs[i].requested = requested[i];
      pairs[i].symbol = ResolveBrokerSymbol(requested[i]);
      SetPairNotReady(pairs[i], pairs[i].symbol == "" ? "Broker symbol not found" : "Loading history");

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
      pairs[i].regime_fast_handle = iMA(pairs[i].symbol, InpRegimeTimeframe, InpRegimeFastEMA, 0, MODE_EMA, PRICE_CLOSE);
      pairs[i].regime_slow_handle = iMA(pairs[i].symbol, InpRegimeTimeframe, InpRegimeSlowEMA, 0, MODE_EMA, PRICE_CLOSE);
      pairs[i].macro_fast_handle = iMA(pairs[i].symbol, InpMacroTimeframe, InpMacroFastEMA, 0, MODE_EMA, PRICE_CLOSE);
      pairs[i].macro_slow_handle = iMA(pairs[i].symbol, InpMacroTimeframe, InpMacroSlowEMA, 0, MODE_EMA, PRICE_CLOSE);

      if(pairs[i].fast_handle == INVALID_HANDLE || pairs[i].slow_handle == INVALID_HANDLE ||
         pairs[i].rsi_handle == INVALID_HANDLE || pairs[i].atr_handle == INVALID_HANDLE ||
         pairs[i].adx_handle == INVALID_HANDLE || pairs[i].higher_fast_handle == INVALID_HANDLE ||
         pairs[i].higher_slow_handle == INVALID_HANDLE ||
         pairs[i].regime_fast_handle == INVALID_HANDLE || pairs[i].regime_slow_handle == INVALID_HANDLE ||
         pairs[i].macro_fast_handle == INVALID_HANDLE || pairs[i].macro_slow_handle == INVALID_HANDLE)
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
   if(!(bool)MQLInfoInteger(MQL_TESTER) && InpSendStartupHealthAlert)
   {
      string deployment_failure = "";
      bool deployment_ok = DeploymentAllowed(deployment_failure);
      QueuePhonePush(StringFormat(
         "SignalForge v1.40 started | account %I64d | %s | data safety gate active",
         AccountInfoInteger(ACCOUNT_LOGIN),
         deployment_ok ? "deployment OK" : "deployment BLOCKED"));
   }
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
      if(pairs[i].regime_fast_handle != INVALID_HANDLE) IndicatorRelease(pairs[i].regime_fast_handle);
      if(pairs[i].regime_slow_handle != INVALID_HANDLE) IndicatorRelease(pairs[i].regime_slow_handle);
      if(pairs[i].macro_fast_handle != INVALID_HANDLE) IndicatorRelease(pairs[i].macro_fast_handle);
      if(pairs[i].macro_slow_handle != INVALID_HANDLE) IndicatorRelease(pairs[i].macro_slow_handle);
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
