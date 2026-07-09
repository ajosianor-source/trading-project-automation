#property copyright "SignalForge FX"
#property version   "1.10"
#property strict
#property indicator_chart_window
#property indicator_plots 0
#property description "Read-only SignalForge dashboard exporter. Never places trades."

input string          InpSymbol          = "XAUUSD";
input ENUM_TIMEFRAMES InpTimeframe       = PERIOD_H1;
input ENUM_TIMEFRAMES InpHigherTimeframe = PERIOD_H4;
input ulong           InpMagicNumber     = 260629;
input int             InpRefreshSeconds  = 2;
input int             InpChartBars       = 120;
input int             InpHistoryDays     = 365;
input int             InpMaxJournalRows  = 500;
input double          InpDailyLossLimitPercent = 2.0;
input double          InpMaxDrawdownPercent = 8.0;
input int             InpMaxConsecutiveLosses = 3;
input int             InpMaxTradesPerDay = 3;
input double          InpExitTrailATR    = 1.5;
input int             InpExitMaxStaleBars = 12;

int fast_handle = INVALID_HANDLE;
int slow_handle = INVALID_HANDLE;
int rsi_handle = INVALID_HANDLE;
int atr_handle = INVALID_HANDLE;
int adx_handle = INVALID_HANDLE;
int higher_fast_handle = INVALID_HANDLE;
int higher_slow_handle = INVALID_HANDLE;
string broker_symbol = "";

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
   for(int i = 0; i < SymbolsTotal(false); i++)
   {
      string candidate = SymbolName(i, false);
      if(StringFind(Upper(candidate), wanted) >= 0 && StringLen(candidate) < best_length)
      {
         best = candidate;
         best_length = StringLen(candidate);
      }
   }
   if(best != "" && SymbolSelect(best, true))
      return best;
   return "";
}

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

void AddJsonReason(string &json, int &count, const string reason)
{
   if(count > 0)
      json += ",";
   json += JString(reason);
   count++;
}

bool ReadBuffer(const int handle, const int buffer, const int shift, double &value)
{
   double values[1];
   if(handle == INVALID_HANDLE || CopyBuffer(handle, buffer, shift, 1, values) != 1)
      return false;
   value = values[0];
   return MathIsValidNumber(value);
}

datetime DayStart()
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

string AccountMode()
{
   ENUM_ACCOUNT_TRADE_MODE mode = (ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE);
   if(mode == ACCOUNT_TRADE_MODE_DEMO)
      return "DEMO";
   if(mode == ACCOUNT_TRADE_MODE_CONTEST)
      return "CONTEST";
   return "REAL";
}

void TodayPerformance(int &trades, int &wins, int &losses,
                      int &consecutive_losses, double &realized)
{
   trades = 0;
   wins = 0;
   losses = 0;
   consecutive_losses = 0;
   realized = 0.0;
   if(!HistorySelect(DayStart(), TimeCurrent()))
      return;
   for(int i = 0; i < HistoryDealsTotal(); i++)
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
         if(pnl > 0.0)
         {
            wins++;
            consecutive_losses = 0;
         }
         else
         {
            losses++;
            consecutive_losses++;
         }
      }
   }
}

string AccountPositionsJson(double &signalforge_risk, double &floating_profit,
                            int &position_count)
{
   signalforge_risk = 0.0;
   floating_profit = 0.0;
   position_count = 0;
   string json = "[";
   for(int i = 0; i < PositionsTotal(); i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      string symbol = PositionGetString(POSITION_SYMBOL);
      ulong magic = (ulong)PositionGetInteger(POSITION_MAGIC);
      ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double volume = PositionGetDouble(POSITION_VOLUME);
      double open = PositionGetDouble(POSITION_PRICE_OPEN);
      double stop = PositionGetDouble(POSITION_SL);
      double target = PositionGetDouble(POSITION_TP);
      double profit = PositionGetDouble(POSITION_PROFIT);
      double risk = 0.0;
      if(stop > 0.0)
      {
         double calculated = 0.0;
         ENUM_ORDER_TYPE order_type = type == POSITION_TYPE_BUY ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
         if(OrderCalcProfit(order_type, symbol, volume, open, stop, calculated))
            risk = MathAbs(calculated);
      }
      string owner = magic == InpMagicNumber ? "SignalForge" : magic == 0 ? "Manual" : "Other EA";
      if(magic == InpMagicNumber)
         signalforge_risk += risk;
      floating_profit += profit;
      if(position_count > 0)
         json += ",";
      json += "{\"ticket\":" + IntegerToString((long)ticket) +
              ",\"symbol\":" + JString(symbol) +
              ",\"side\":" + JString(type == POSITION_TYPE_BUY ? "BUY" : "SELL") +
              ",\"volume\":" + JNumber(volume, 2) +
              ",\"entry\":" + JNumber(open, 5) +
              ",\"stop\":" + JNumber(stop, 5) +
              ",\"target\":" + JNumber(target, 5) +
              ",\"profit\":" + JNumber(profit, 2) +
              ",\"risk\":" + JNumber(risk, 2) +
              ",\"magic\":" + IntegerToString((long)magic) +
              ",\"owner\":" + JString(owner) + "}";
      position_count++;
   }
   return json + "]";
}

string HistoryJson(double &net_profit, double &max_drawdown,
                   int &closed_trades, int &wins, int &losses)
{
   net_profit = 0.0;
   max_drawdown = 0.0;
   closed_trades = 0;
   wins = 0;
   losses = 0;
   datetime from = TimeCurrent() - (datetime)MathMax(1, InpHistoryDays) * 86400;
   if(!HistorySelect(from, TimeCurrent()))
      return "{\"entries\":[],\"equity\":[]}";

   string entries = "[";
   string equity = "[";
   int entry_count = 0;
   int point_count = 0;
   double peak = 0.0;
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0 || (ulong)HistoryDealGetInteger(ticket, DEAL_MAGIC) != InpMagicNumber)
         continue;
      ENUM_DEAL_TYPE type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
      if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL)
         continue;
      datetime time = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      double pnl = HistoryDealGetDouble(ticket, DEAL_PROFIT) +
                   HistoryDealGetDouble(ticket, DEAL_COMMISSION) +
                   HistoryDealGetDouble(ticket, DEAL_SWAP);
      net_profit += pnl;
      peak = MathMax(peak, net_profit);
      max_drawdown = MathMax(max_drawdown, peak - net_profit);
      ENUM_DEAL_ENTRY event = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(event == DEAL_ENTRY_OUT || event == DEAL_ENTRY_OUT_BY)
      {
         closed_trades++;
         if(pnl > 0.0) wins++; else losses++;
      }

      if(point_count > 0)
         equity += ",";
      equity += "{\"time\":" + IntegerToString((long)time) +
                ",\"value\":" + JNumber(net_profit, 2) +
                ",\"drawdown\":" + JNumber(peak - net_profit, 2) + "}";
      point_count++;

      if(entry_count < MathMax(1, InpMaxJournalRows))
      {
         if(entry_count > 0)
            entries += ",";
         entries += "{\"ticket\":" + IntegerToString((long)ticket) +
                    ",\"positionId\":" + IntegerToString(HistoryDealGetInteger(ticket, DEAL_POSITION_ID)) +
                    ",\"time\":" + IntegerToString((long)time) +
                    ",\"symbol\":" + JString(HistoryDealGetString(ticket, DEAL_SYMBOL)) +
                    ",\"event\":" + JString(event == DEAL_ENTRY_IN ? "ENTRY" :
                                                (event == DEAL_ENTRY_OUT || event == DEAL_ENTRY_OUT_BY) ? "EXIT" : "DEAL") +
                    ",\"side\":" + JString(type == DEAL_TYPE_BUY ? "BUY" : "SELL") +
                    ",\"volume\":" + JNumber(HistoryDealGetDouble(ticket, DEAL_VOLUME), 2) +
                    ",\"price\":" + JNumber(HistoryDealGetDouble(ticket, DEAL_PRICE), 5) +
                    ",\"pnl\":" + JNumber(pnl, 2) +
                    ",\"reason\":" + JString(EnumToString((ENUM_DEAL_REASON)HistoryDealGetInteger(ticket, DEAL_REASON))) +
                    "}";
         entry_count++;
      }
   }
   return "{\"entries\":" + entries + "],\"equity\":" + equity + "]}";
}

string PositionJson()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 ||
         PositionGetString(POSITION_SYMBOL) != broker_symbol ||
         (ulong)PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)
         continue;

      ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double volume = PositionGetDouble(POSITION_VOLUME);
      double open = PositionGetDouble(POSITION_PRICE_OPEN);
      double stop = PositionGetDouble(POSITION_SL);
      double target = PositionGetDouble(POSITION_TP);
      double profit = PositionGetDouble(POSITION_PROFIT);
      double risk = 0.0;
      if(stop > 0.0)
      {
         double calculated = 0.0;
         ENUM_ORDER_TYPE order_type = type == POSITION_TYPE_BUY ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
         if(OrderCalcProfit(order_type, broker_symbol, volume, open, stop, calculated))
            risk = MathAbs(calculated);
      }
      return "{" +
             "\"open\":true," +
             "\"ticket\":" + IntegerToString((long)ticket) + "," +
             "\"side\":" + JString(type == POSITION_TYPE_BUY ? "BUY" : "SELL") + "," +
             "\"volume\":" + JNumber(volume, 2) + "," +
             "\"entry\":" + JNumber(open, 2) + "," +
             "\"stop\":" + JNumber(stop, 2) + "," +
             "\"target\":" + JNumber(target, 2) + "," +
             "\"profit\":" + JNumber(profit, 2) + "," +
             "\"risk\":" + JNumber(risk, 2) +
             "}";
   }
   return "{\"open\":false}";
}

string ExitCoachJson(const bool limits_breached)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 ||
         PositionGetString(POSITION_SYMBOL) != broker_symbol ||
         (ulong)PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)
         continue;

      ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double volume = PositionGetDouble(POSITION_VOLUME);
      double open = PositionGetDouble(POSITION_PRICE_OPEN);
      double stop = PositionGetDouble(POSITION_SL);
      double target = PositionGetDouble(POSITION_TP);
      double profit = PositionGetDouble(POSITION_PROFIT);
      datetime opened_at = (datetime)PositionGetInteger(POSITION_TIME);
      int period_seconds = PeriodSeconds(InpTimeframe);
      int bars_open = period_seconds > 0 ? (int)MathMax(0, (TimeCurrent() - opened_at) / period_seconds) : 0;

      MqlTick tick = {};
      double fast, slow, rsi, atr, adx, plus_di, minus_di;
      if(!SymbolInfoTick(broker_symbol, tick) ||
         !ReadBuffer(fast_handle, 0, 0, fast) ||
         !ReadBuffer(slow_handle, 0, 0, slow) ||
         !ReadBuffer(rsi_handle, 0, 0, rsi) ||
         !ReadBuffer(atr_handle, 0, 0, atr) ||
         !ReadBuffer(adx_handle, 0, 0, adx) ||
         !ReadBuffer(adx_handle, 1, 0, plus_di) ||
         !ReadBuffer(adx_handle, 2, 0, minus_di))
      {
         return "{\"status\":\"WATCH\",\"action\":\"WATCH EXIT\",\"pressure\":35,"
                "\"summary\":\"Exit indicators are still warming up.\","
                "\"rMultiple\":null,\"suggestedStop\":null,\"barsOpen\":" + IntegerToString(bars_open) + ","
                "\"reasons\":[\"Monitor could not read all exit buffers yet.\"]}";
      }

      bool buy = type == POSITION_TYPE_BUY;
      double executable = buy ? tick.bid : tick.ask;
      double risk_money = 0.0;
      if(stop > 0.0)
      {
         double calculated = 0.0;
         ENUM_ORDER_TYPE order_type = buy ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
         if(OrderCalcProfit(order_type, broker_symbol, volume, open, stop, calculated))
            risk_money = MathAbs(calculated);
      }
      double r_multiple = risk_money > 0.0 ? profit / risk_money : 0.0;
      double trail = buy ? executable - atr * InpExitTrailATR : executable + atr * InpExitTrailATR;
      if(stop > 0.0)
         trail = buy ? MathMax(stop, trail) : MathMin(stop, trail);

      bool lost_fast = buy ? executable < fast : executable > fast;
      bool trend_invalid = buy ? (executable < slow && fast < slow) : (executable > slow && fast > slow);
      bool momentum_fade = buy ? (rsi < 50.0 || plus_di < minus_di) : (rsi > 50.0 || minus_di < plus_di);
      bool adx_fade = adx < 18.0;
      bool no_progress = bars_open >= InpExitMaxStaleBars && r_multiple < 0.25;
      bool near_target = target > 0.0 && (buy ? executable >= open + (target - open) * 0.80
                                              : executable <= open - (open - target) * 0.80);

      int pressure = 0;
      string reasons = "[";
      int reason_count = 0;
      if(stop <= 0.0)
      {
         pressure += 35;
         AddJsonReason(reasons, reason_count, "Position has no protective stop recorded.");
      }
      if(limits_breached)
      {
         pressure += 45;
         AddJsonReason(reasons, reason_count, "Account risk limit is breached or near lockout.");
      }
      if(trend_invalid)
      {
         pressure += 40;
         AddJsonReason(reasons, reason_count, "Trend structure is invalidating against the position.");
      }
      else if(lost_fast)
      {
         pressure += 22;
         AddJsonReason(reasons, reason_count, "Price has crossed back through EMA 20.");
      }
      if(momentum_fade)
      {
         pressure += 20;
         AddJsonReason(reasons, reason_count, "Momentum/DI confirmation is fading.");
      }
      if(adx_fade)
      {
         pressure += 10;
         AddJsonReason(reasons, reason_count, "ADX trend strength is weak.");
      }
      if(no_progress)
      {
         pressure += 15;
         AddJsonReason(reasons, reason_count, "Trade has been open without enough progress.");
      }
      if(near_target || r_multiple >= 1.0)
      {
         pressure += momentum_fade ? 18 : 8;
         AddJsonReason(reasons, reason_count, "Trade is in profit-protection territory.");
      }
      if(reason_count == 0)
         AddJsonReason(reasons, reason_count, "No exit pressure detected; original trade plan remains intact.");
      reasons += "]";
      pressure = (int)MathMin(100, pressure);

      string action = "HOLD";
      string status = "OK";
      if(trend_invalid || limits_breached || pressure >= 70)
      {
         action = "EXIT NOW";
         status = "EXIT";
      }
      else if(r_multiple >= 1.0 && pressure >= 25)
      {
         action = "PARTIAL EXIT";
         status = "WATCH";
      }
      else if(pressure >= 30)
      {
         action = "WATCH EXIT";
         status = "WATCH";
      }

      string summary = action == "HOLD" ? "Hold: exit pressure is low." :
                       action == "WATCH EXIT" ? "Watch: conditions are weakening; prepare to protect the trade." :
                       action == "PARTIAL EXIT" ? "Partial exit candidate: profit exists while conditions weaken." :
                       "Exit warning: the trade thesis is invalidating or risk limits are active.";

      return "{\"status\":" + JString(status) +
             ",\"action\":" + JString(action) +
             ",\"pressure\":" + IntegerToString(pressure) +
             ",\"summary\":" + JString(summary) +
             ",\"rMultiple\":" + JNumber(r_multiple, 2) +
             ",\"suggestedStop\":" + JNumber(trail, 2) +
             ",\"barsOpen\":" + IntegerToString(bars_open) +
             ",\"reasons\":" + reasons + "}";
   }
   return "{\"status\":\"NO POSITION\",\"action\":\"HOLD\",\"pressure\":0,"
          "\"summary\":\"No SignalForge position open.\","
          "\"rMultiple\":null,\"suggestedStop\":null,\"barsOpen\":null,"
          "\"reasons\":[\"Exit guidance appears after SignalForge opens a position.\"]}";
}

bool SignalValues(string &side, string &reason, int &score, double &entry,
                  double &stop, double &target, double &rsi, double &atr,
                  double &adx, bool &trend_ok, bool &momentum_ok,
                  bool &strength_ok, bool &higher_ok, bool &breakout_ok)
{
   MqlRates bar[1];
   double fast, slow, fast_old, plus_di, minus_di, higher_fast, higher_slow;
   if(CopyRates(broker_symbol, InpTimeframe, 1, 1, bar) != 1 ||
      !ReadBuffer(fast_handle, 0, 1, fast) ||
      !ReadBuffer(slow_handle, 0, 1, slow) ||
      !ReadBuffer(fast_handle, 0, 6, fast_old) ||
      !ReadBuffer(rsi_handle, 0, 1, rsi) ||
      !ReadBuffer(atr_handle, 0, 1, atr) ||
      !ReadBuffer(adx_handle, 0, 1, adx) ||
      !ReadBuffer(adx_handle, 1, 1, plus_di) ||
      !ReadBuffer(adx_handle, 2, 1, minus_di) ||
      !ReadBuffer(higher_fast_handle, 0, 1, higher_fast) ||
      !ReadBuffer(higher_slow_handle, 0, 1, higher_slow))
      return false;

   MqlRates channel[];
   ArrayResize(channel, 20);
   if(CopyRates(broker_symbol, InpTimeframe, 2, 20, channel) != 20)
      return false;
   double high = channel[0].high;
   double low = channel[0].low;
   for(int i = 1; i < 20; i++)
   {
      high = MathMax(high, channel[i].high);
      low = MathMin(low, channel[i].low);
   }

   entry = bar[0].close;
   bool buy_trend = fast > slow && entry > fast && fast > fast_old;
   bool sell_trend = fast < slow && entry < fast && fast < fast_old;
   bool buy_momentum = rsi >= 52.0 && rsi <= 70.0;
   bool sell_momentum = rsi <= 48.0 && rsi >= 30.0;
   bool buy_strength = adx >= 22.0 && plus_di > minus_di;
   bool sell_strength = adx >= 22.0 && minus_di > plus_di;
   bool buy_higher = higher_fast > higher_slow;
   bool sell_higher = higher_fast < higher_slow;
   bool buy_breakout = entry > high;
   bool sell_breakout = entry < low;

   int buys = (int)buy_trend + (int)buy_momentum + (int)buy_strength +
              (int)buy_higher + (int)buy_breakout;
   int sells = (int)sell_trend + (int)sell_momentum + (int)sell_strength +
               (int)sell_higher + (int)sell_breakout;
   side = buys == 5 ? "BUY" : sells == 5 ? "SELL" : "WAIT";
   bool bullish = buys >= sells;
   trend_ok = bullish ? buy_trend : sell_trend;
   momentum_ok = bullish ? buy_momentum : sell_momentum;
   strength_ok = bullish ? buy_strength : sell_strength;
   higher_ok = bullish ? buy_higher : sell_higher;
   breakout_ok = bullish ? buy_breakout : sell_breakout;
   int best = MathMax(buys, sells);
   double separation = atr > 0.0 ? MathMin(MathAbs(fast - slow) / atr, 1.0) : 0.0;
   score = (int)MathRound(((double)best / 5.0 * 0.90 + separation * 0.10) * 100.0);
   reason = side == "WAIT" ?
            StringFormat("Strict filter: %d/5 bullish, %d/5 bearish", buys, sells) :
            (side == "BUY" ? "Bullish filters fully aligned" : "Bearish filters fully aligned");
   double direction = side == "SELL" ? -1.0 : 1.0;
   stop = side == "WAIT" ? 0.0 : entry - direction * atr * 1.5;
   target = side == "WAIT" ? 0.0 : entry + direction * atr * 3.0;
   return true;
}

string CandlesJson()
{
   int count = MathMax(20, MathMin(InpChartBars, 300));
   MqlRates rates[];
   double fast[];
   double slow[];
   ArrayResize(rates, count);
   ArrayResize(fast, count);
   ArrayResize(slow, count);
   // Export chart candles from shift 0 so the browser includes the current
   // forming candle. Signal logic still uses closed candles in SignalValues().
   int copied = CopyRates(broker_symbol, InpTimeframe, 0, count, rates);
   int fast_copied = CopyBuffer(fast_handle, 0, 0, count, fast);
   int slow_copied = CopyBuffer(slow_handle, 0, 0, count, slow);
   if(copied <= 0 || fast_copied != copied || slow_copied != copied)
      return "[]";

   string json = "[";
   int output_count = 0;
   // CopyRates stores the oldest requested bar at index 0 and the newest
   // (shift 0) bar at the final index, irrespective of as-series access.
   // The dashboard expects chronological order: oldest to newest.
   for(int i = 0; i < copied; i++)
   {
      if(output_count > 0)
         json += ",";
      json += "{\"time\":" + JString(TimeToString(rates[i].time, TIME_DATE|TIME_MINUTES)) +
              ",\"open\":" + JNumber(rates[i].open, 2) +
              ",\"high\":" + JNumber(rates[i].high, 2) +
              ",\"low\":" + JNumber(rates[i].low, 2) +
              ",\"close\":" + JNumber(rates[i].close, 2) +
              ",\"fast\":" + JNumber(fast[i], 2) +
              ",\"slow\":" + JNumber(slow[i], 2) +
              ",\"forming\":" + JBool(i == copied - 1) + "}";
      output_count++;
   }
   return json + "]";
}

string StrategyJson()
{
   int file = FileOpen("SignalForge\\strategy.json",
                       FILE_READ|FILE_TXT|FILE_ANSI|FILE_COMMON|FILE_SHARE_READ|FILE_SHARE_WRITE,
                       0, CP_UTF8);
   if(file == INVALID_HANDLE)
      return "null";

   string snapshot = FileReadString(file);
   FileClose(file);
   if(StringLen(snapshot) < 2 || StringSubstr(snapshot, 0, 1) != "{")
      return "null";
   return snapshot;
}

void ExportSnapshot()
{
   if(broker_symbol == "")
      return;
   MqlTick tick = {};
   if(!SymbolInfoTick(broker_symbol, tick))
      return;

   string side = "WAIT", reason = "Indicators warming up";
   int score = 0;
   double entry = 0.0, stop = 0.0, target = 0.0, rsi = 0.0, atr = 0.0, adx = 0.0;
   bool trend = false, momentum = false, strength = false, higher = false, breakout = false;
   SignalValues(side, reason, score, entry, stop, target, rsi, atr, adx,
                trend, momentum, strength, higher, breakout);

   double history_net, history_drawdown;
   int history_trades, history_wins, history_losses;
   string history_json = HistoryJson(history_net, history_drawdown,
                                     history_trades, history_wins, history_losses);
   int trades, wins, losses, consecutive_losses;
   double realized;
   TodayPerformance(trades, wins, losses, consecutive_losses, realized);
   double signalforge_risk, floating_profit;
   int position_count;
   string positions_json = AccountPositionsJson(signalforge_risk, floating_profit, position_count);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double day_start_balance = MathMax(balance - realized, 0.01);
   double daily_loss_percent = MathMax(0.0, (day_start_balance - equity) / day_start_balance * 100.0);
   string peak_name = StringFormat("SignalForge.%I64d.%I64u.PeakEquity",
                                   AccountInfoInteger(ACCOUNT_LOGIN), InpMagicNumber);
   double peak_equity = GlobalVariableCheck(peak_name) ? GlobalVariableGet(peak_name) : equity;
   peak_equity = MathMax(peak_equity, equity);
   double drawdown_percent = peak_equity > 0.0 ?
                             MathMax(0.0, (peak_equity - equity) / peak_equity * 100.0) : 0.0;
   bool limits_breached = daily_loss_percent >= InpDailyLossLimitPercent ||
                          drawdown_percent >= InpMaxDrawdownPercent ||
                          consecutive_losses >= InpMaxConsecutiveLosses ||
                          trades >= InpMaxTradesPerDay;
   string json = "{" +
      "\"schema\":4," +
      "\"heartbeat\":" + JString(TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS)) + "," +
      "\"heartbeatUnix\":" + IntegerToString((long)TimeCurrent()) + "," +
      "\"terminal\":{\"connected\":" + JBool((bool)TerminalInfoInteger(TERMINAL_CONNECTED)) +
      ",\"algoTrading\":" + JBool((bool)TerminalInfoInteger(TERMINAL_TRADE_ALLOWED)) + "}," +
      "\"account\":{\"login\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) +
      ",\"mode\":" + JString(AccountMode()) +
      ",\"currency\":" + JString(AccountInfoString(ACCOUNT_CURRENCY)) +
      ",\"balance\":" + JNumber(balance, 2) +
      ",\"equity\":" + JNumber(equity, 2) +
      ",\"freeMargin\":" + JNumber(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2) + "}," +
      "\"market\":{\"symbol\":" + JString(broker_symbol) +
      ",\"bid\":" + JNumber(tick.bid, 2) +
      ",\"ask\":" + JNumber(tick.ask, 2) +
      ",\"spread\":" + JNumber(tick.ask - tick.bid, 2) + "}," +
      "\"strategy\":" + StrategyJson() + "," +
      "\"signal\":{\"side\":" + JString(side) +
      ",\"reason\":" + JString(reason) +
      ",\"score\":" + IntegerToString(score) +
      ",\"entry\":" + JNumber(entry, 2) +
      ",\"stop\":" + JNumber(stop, 2) +
      ",\"target\":" + JNumber(target, 2) +
      ",\"rsi\":" + JNumber(rsi, 1) +
      ",\"atr\":" + JNumber(atr, 2) +
      ",\"adx\":" + JNumber(adx, 1) +
      ",\"factors\":{\"trend\":" + JBool(trend) +
      ",\"momentum\":" + JBool(momentum) +
      ",\"strength\":" + JBool(strength) +
      ",\"higherTimeframe\":" + JBool(higher) +
      ",\"breakout\":" + JBool(breakout) + "}}," +
      "\"position\":" + PositionJson() + "," +
      "\"positions\":" + positions_json + "," +
      "\"today\":{\"trades\":" + IntegerToString(trades) +
      ",\"wins\":" + IntegerToString(wins) +
      ",\"losses\":" + IntegerToString(losses) +
      ",\"consecutiveLosses\":" + IntegerToString(consecutive_losses) +
      ",\"realized\":" + JNumber(realized, 2) + "}," +
      "\"risk\":{\"status\":" + JString(limits_breached ? "LIMIT" : "OK") +
      ",\"signalforgeRisk\":" + JNumber(signalforge_risk, 2) +
      ",\"floatingProfit\":" + JNumber(floating_profit, 2) +
      ",\"positionCount\":" + IntegerToString(position_count) +
      ",\"dailyLossPercent\":" + JNumber(daily_loss_percent, 2) +
      ",\"dailyLossLimit\":" + JNumber(InpDailyLossLimitPercent, 2) +
      ",\"drawdownPercent\":" + JNumber(drawdown_percent, 2) +
      ",\"drawdownLimit\":" + JNumber(InpMaxDrawdownPercent, 2) +
      ",\"consecutiveLosses\":" + IntegerToString(consecutive_losses) +
      ",\"consecutiveLossLimit\":" + IntegerToString(InpMaxConsecutiveLosses) +
      ",\"tradesToday\":" + IntegerToString(trades) +
      ",\"tradesLimit\":" + IntegerToString(InpMaxTradesPerDay) + "}," +
      "\"performance\":{\"netProfit\":" + JNumber(history_net, 2) +
      ",\"maxDrawdown\":" + JNumber(history_drawdown, 2) +
      ",\"trades\":" + IntegerToString(history_trades) +
      ",\"wins\":" + IntegerToString(history_wins) +
      ",\"losses\":" + IntegerToString(history_losses) + "}," +
      "\"history\":" + history_json + "," +
      "\"exitCoach\":" + ExitCoachJson(limits_breached) + "," +
      "\"candles\":" + CandlesJson() +
      "}";

   int file = FileOpen("SignalForge\\live.json",
                       FILE_READ|FILE_WRITE|FILE_BIN|FILE_ANSI|FILE_COMMON|FILE_SHARE_READ,
                       0, CP_UTF8);
   if(file == INVALID_HANDLE)
   {
      Print("SignalForge Monitor: live.json open failed, error ", GetLastError());
      return;
   }
   // Keep the existing NTFS file identity so a browser-safe workspace hard
   // link remains valid. FILE_WRITE alone can recreate the Common Files entry.
   ulong previous_size = FileSize(file);
   FileSeek(file, 0, SEEK_SET);
   FileWriteString(file, json, StringLen(json));
   ulong written_size = FileTell(file);
   string spaces = "                                                                ";
   while(written_size < previous_size)
   {
      ulong remaining = previous_size - written_size;
      int space_count = StringLen(spaces);
      int chunk = remaining > (ulong)space_count ? space_count : (int)remaining;
      FileWriteString(file, spaces, chunk);
      written_size = FileTell(file);
   }
   FileFlush(file);
   FileClose(file);
}

int OnInit()
{
   broker_symbol = ResolveBrokerSymbol(InpSymbol);
   if(broker_symbol == "")
      return INIT_FAILED;
   fast_handle = iMA(broker_symbol, InpTimeframe, 20, 0, MODE_EMA, PRICE_CLOSE);
   slow_handle = iMA(broker_symbol, InpTimeframe, 50, 0, MODE_EMA, PRICE_CLOSE);
   rsi_handle = iRSI(broker_symbol, InpTimeframe, 14, PRICE_CLOSE);
   atr_handle = iATR(broker_symbol, InpTimeframe, 14);
   adx_handle = iADX(broker_symbol, InpTimeframe, 14);
   higher_fast_handle = iMA(broker_symbol, InpHigherTimeframe, 50, 0, MODE_EMA, PRICE_CLOSE);
   higher_slow_handle = iMA(broker_symbol, InpHigherTimeframe, 200, 0, MODE_EMA, PRICE_CLOSE);
   if(fast_handle == INVALID_HANDLE || slow_handle == INVALID_HANDLE ||
      rsi_handle == INVALID_HANDLE || atr_handle == INVALID_HANDLE ||
      adx_handle == INVALID_HANDLE || higher_fast_handle == INVALID_HANDLE ||
      higher_slow_handle == INVALID_HANDLE)
      return INIT_FAILED;
   EventSetTimer(MathMax(1, InpRefreshSeconds));
   ExportSnapshot();
   Print("SignalForge Monitor: exporting Common\\Files\\SignalForge\\live.json");
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   if(fast_handle != INVALID_HANDLE) IndicatorRelease(fast_handle);
   if(slow_handle != INVALID_HANDLE) IndicatorRelease(slow_handle);
   if(rsi_handle != INVALID_HANDLE) IndicatorRelease(rsi_handle);
   if(atr_handle != INVALID_HANDLE) IndicatorRelease(atr_handle);
   if(adx_handle != INVALID_HANDLE) IndicatorRelease(adx_handle);
   if(higher_fast_handle != INVALID_HANDLE) IndicatorRelease(higher_fast_handle);
   if(higher_slow_handle != INVALID_HANDLE) IndicatorRelease(higher_slow_handle);
}

void OnTimer()
{
   ExportSnapshot();
}

int OnCalculate(const int rates_total, const int prev_calculated,
                const datetime &time[], const double &open[], const double &high[],
                const double &low[], const double &close[], const long &tick_volume[],
                const long &volume[], const int &spread[])
{
   return rates_total;
}
