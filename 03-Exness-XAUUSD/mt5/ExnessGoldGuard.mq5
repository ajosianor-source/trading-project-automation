#property copyright "Exness Gold Guard"
#property link      "https://www.exness.com"
#property version   "1.40"
#property strict
#property description "Guarded Exness XAUUSD/BTCUSD M30/H1/H4 trend-breakout EA."

#include <Trade/Trade.mqh>

input group "Signal model"
input string          InpAllowedSymbolRoot = "XAUUSD";
input ENUM_TIMEFRAMES InpSignalTimeframe = PERIOD_M30;
input ENUM_TIMEFRAMES InpTrendTimeframe  = PERIOD_H4;
input ENUM_TIMEFRAMES InpTrendTimeframe1 = PERIOD_H1;
input int             InpFastEMA         = 20;
input int             InpSlowEMA         = 50;
input int             InpTrendFastEMA    = 50;
input int             InpTrendSlowEMA    = 200;
input int             InpRSIPeriod       = 14;
input int             InpADXPeriod       = 14;
input int             InpATRPeriod       = 14;
input int             InpBreakoutBars    = 12;
input double          InpMinimumADX      = 22.0;
input double          InpMinimumATRPercent = 0.05;
input double          InpBuyRSI          = 52.0;
input double          InpSellRSI         = 48.0;
input double          InpStopATR         = 1.4;
input double          InpTargetATR       = 2.8;

input group "Signal accuracy filters"
input double          InpATRPercentile       = 60.0;
input int             InpBlockStartHour      = 20;
input int             InpBlockEndHour        = 8;
input double          InpEMASlopeMinPercent  = 0.2;
input double          InpPrevCandleWickMax   = 1.5;
input int             InpStochK              = 14;
input int             InpStochD              = 3;
input int             InpStochSlowing        = 3;
input int             InpM5BreakoutBars      = 5;
input double          InpTickVolMinRatio     = 0.70;

input group "Risk controls"
input double          InpRiskPercent          = 0.02;
input double          InpDailyLossLimitPct    = 0.15;
input double          InpMaxDrawdownPct       = 1.00;
input int             InpMaxTradesPerDay      = 5;
input double          InpMaxVolumeLots        = 5.00;
input double          InpMaxMarginUsePct      = 5.00;
input double          InpMinimumFreeMarginPct = 80.0;
input int             InpMaxSpreadPoints      = 500;
input double          InpMaxSpreadATRPercent  = 10.0;
input int             InpDeviationPoints      = 30;
input int             InpMaxTickAgeSeconds    = 10;
input bool            InpAvoidRolloverHour    = true;
input int             InpRolloverHourServer   = 23;

input group "Audited capital baseline"
input long            InpRiskBaselineEpoch    = 0;

input group "Execution lock"
input bool            InpEnableTrading        = false;
input bool            InpConfirmLiveAccount   = false;
input long            InpAuthorizedAccount    = 0;
input string          InpLiveConfirmation     = "";
input bool            InpRequireExnessServer  = true;
input bool            InpEmergencyStop        = false;
input ulong           InpMagicNumber          = 26070103;

input group "Alerts and messaging"
input bool            InpEnableTerminalAlerts = true;
input bool            InpEnablePush           = true;
input bool            InpEnableWhatsApp       = false;
input string          InpWhatsAppRelayUrl     = "http://127.0.0.1:8787/alert";
input int             InpWhatsAppTimeoutMs    = 3000;
input bool            InpEnableTrendAlerts    = true;
input bool            InpEnableNearSignalAlerts = true;
input bool            InpEnablePositionAlerts = true;
input bool            InpEnableRiskAlerts     = true;
input double          InpProfitAlertFirstR    = 0.50;
input double          InpProfitAlertSecondR   = 1.00;
input double          InpProfitAlertThirdR    = 1.50;

input group "USD news protection"
input bool            InpEnableNewsGuard      = true;
input bool            InpBlockHighImpactNews  = true;
input bool            InpBlockWhenNewsUnavailable = true;
input int             InpNewsAlertMinutes     = 30;
input int             InpNewsPostEventMinutes = 15;

input group "Persistent activity journal"
input bool            InpEnableActivityJournal = true;
input string          InpJournalFileName       = "activity-xauusd.csv";

input group "Shadow forward testing"
input bool            InpEnableShadowTrading   = true;
input bool            InpEnableShadowAlerts    = true;
input double          InpShadowReferenceEquity = 1000000.0;
input int             InpShadowCandidateChecks = 10;

input group "Read-only dashboard"
input bool            InpExportDashboard      = true;
input int             InpDashboardRefreshSec  = 2;
input int             InpDashboardCandleBars  = 80;
input string          InpDashboardFileName    = "live.json";

CTrade trade;
string   active_symbol = "";
int      fast_handle = INVALID_HANDLE;
int      slow_handle = INVALID_HANDLE;
int      trend_fast_handle = INVALID_HANDLE;
int      trend_slow_handle = INVALID_HANDLE;
int      rsi_handle = INVALID_HANDLE;
int      adx_handle = INVALID_HANDLE;
int      atr_handle = INVALID_HANDLE;
int      m5_fast_handle = INVALID_HANDLE;
int      m5_slow_handle = INVALID_HANDLE;
int      stochastic_handle = INVALID_HANDLE;
datetime last_bar_time = 0;
double   equity_peak = 0.0;
double   day_start_equity = 0.0;
int      state_day = 0;
string   status_text = "Starting";
string   signal_side = "WAIT";
string   signal_detail = "Waiting for first closed 30M candle";
int      signal_buy_checks = 0;
int      signal_sell_checks = 0;
string   trend_bias = "WAIT";
string   trend_previous_bias = "WAIT";
bool     trend_reversal = false;
bool     trend_exit_warning = false;
string   trend_exit_state = "NONE";
string   trend_exit_reason = "";
string   last_alert_level = "NONE";
string   last_alert_message = "";
datetime last_alert_time = 0;
string   pending_alerts = "";
string   push_status = "NOT SENT";
int      push_error = 0;
string   whatsapp_status = "NOT SENT";
int      whatsapp_error = 0;
datetime notification_time = 0;
string   news_status = "WAITING";
string   news_event = "";
datetime news_event_time = 0;
int      news_minutes_to = 0;
int      news_error = 0;
bool     news_blocked = false;
datetime last_news_check = 0;
ulong    tracked_position_ticket = 0;
double   notified_profit_r = 0.0;
string   journal_status = "NOT WRITTEN";
string   last_journal_event = "";
datetime last_journal_time = 0;
bool     factor_buy_h1 = false;
bool     factor_sell_h1 = false;
bool     factor_buy_h4 = false;
bool     factor_sell_h4 = false;
bool     factor_buy_breakout = false;
bool     factor_sell_breakout = false;
bool     factor_buy_momentum = false;
bool     factor_sell_momentum = false;
bool     factor_buy_strength = false;
bool     factor_sell_strength = false;
bool     factor_buy_volatility = false;
bool     factor_sell_volatility = false;
bool     factor_buy_timeofday = false;
bool     factor_sell_timeofday = false;
bool     factor_buy_ema_slope = false;
bool     factor_sell_ema_slope = false;
bool     factor_buy_prev_strength = false;
bool     factor_sell_prev_strength = false;
bool     factor_buy_m5_confirm = false;
bool     factor_sell_m5_confirm = false;
bool     factor_buy_stochastic = false;
bool     factor_sell_stochastic = false;
bool     factor_buy_tickvol = false;
bool     factor_sell_tickvol = false;
bool     factor_buy_sr = false;
bool     factor_sell_sr = false;
string   shadow_candidate_side = "NONE";
bool     shadow_candidate_qualified = false;
bool     shadow_open = false;
int      shadow_direction = 0;
datetime shadow_open_time = 0;
double   shadow_entry = 0.0;
double   shadow_stop = 0.0;
double   shadow_target = 0.0;
double   shadow_volume = 0.0;
double   shadow_risk_cash = 0.0;
double   shadow_mfe_r = 0.0;
double   shadow_mae_r = 0.0;
int      shadow_trades = 0;
int      shadow_wins = 0;
int      shadow_losses = 0;
int      shadow_consecutive_losses = 0;
double   shadow_gross_win_r = 0.0;
double   shadow_gross_loss_r = 0.0;
double   shadow_net_r = 0.0;
double   shadow_peak_r = 0.0;
double   shadow_max_drawdown_r = 0.0;
datetime last_shadow_save = 0;
datetime last_dashboard_export = 0;
int      execution_fills = 0;
double   execution_slippage_total = 0.0;
double   execution_slippage_max = 0.0;
double   execution_slippage_last = 0.0;

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

string JNumber(const double value, const int digits = 2)
{
   if(!MathIsValidNumber(value))
      return "null";
   return DoubleToString(value, digits);
}

string CleanJournalText(string value)
{
   StringReplace(value, "\r", " ");
   StringReplace(value, "\n", " | ");
   StringReplace(value, ";", ",");
   return value;
}

void JournalActivity(const string event_name, const string message)
{
   if(!InpEnableActivityJournal || MQLInfoInteger(MQL_TESTER) ||
      active_symbol == "")
      return;

   FolderCreate("ExnessGoldGuard", FILE_COMMON);
   const string path = "ExnessGoldGuard\\" + InpJournalFileName;
   const int file = FileOpen(path, FILE_READ | FILE_WRITE | FILE_CSV |
                             FILE_ANSI | FILE_COMMON | FILE_SHARE_READ,
                             ';', CP_UTF8);
   if(file == INVALID_HANDLE)
   {
      journal_status = "FAILED";
      Print("Exness Guard: activity journal open failed, error ",
            GetLastError());
      return;
   }
   if(FileSize(file) == 0)
      FileWrite(file, "time_unix", "time_server", "event", "symbol",
                "signal", "trend", "buy_checks", "sell_checks",
                "bid", "ask", "spread_points", "balance", "equity",
                "risk_cash", "position_side", "position_volume",
                "floating_pl", "message");
   FileSeek(file, 0, SEEK_END);

   MqlTick tick = {};
   SymbolInfoTick(active_symbol, tick);
   const double point = SymbolInfoDouble(active_symbol, SYMBOL_POINT);
   const double spread = point > 0.0 ? (tick.ask - tick.bid) / point : 0.0;
   string position_side = "FLAT";
   double position_volume = 0.0;
   double floating_profit = 0.0;
   if(PositionSelect(active_symbol) &&
      (ulong)PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
   {
      position_side =
         (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE) ==
         POSITION_TYPE_BUY ? "BUY" : "SELL";
      position_volume = PositionGetDouble(POSITION_VOLUME);
      floating_profit = PositionGetDouble(POSITION_PROFIT) +
                        PositionGetDouble(POSITION_SWAP);
   }
   const datetime now = TimeTradeServer() > 0
      ? TimeTradeServer() : TimeCurrent();
   const double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   FileWrite(file, (long)now,
             TimeToString(now, TIME_DATE | TIME_SECONDS),
             event_name, active_symbol, signal_side, trend_bias,
             signal_buy_checks, signal_sell_checks,
             DoubleToString(tick.bid,
                (int)SymbolInfoInteger(active_symbol, SYMBOL_DIGITS)),
             DoubleToString(tick.ask,
                (int)SymbolInfoInteger(active_symbol, SYMBOL_DIGITS)),
             DoubleToString(spread, 1),
             DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2),
             DoubleToString(equity, 2),
             DoubleToString(equity * InpRiskPercent / 100.0, 2),
             position_side, DoubleToString(position_volume, 2),
             DoubleToString(floating_profit, 2),
             CleanJournalText(message));
   FileFlush(file);
   FileClose(file);
   journal_status = "WRITING";
   last_journal_event = event_name;
   last_journal_time = now;
}

void QueueAlert(const string level, const string message)
{
   const string full = "EXNESS GUARD " + level + " | " + message;
   Print(full);
   last_alert_level = level;
   last_alert_message = message;
   last_alert_time = TimeCurrent();
   JournalActivity("ALERT_" + level, message);
   if(InpEnableTerminalAlerts && !MQLInfoInteger(MQL_TESTER))
      Alert(full);
   if(pending_alerts != "")
      pending_alerts += "\n";
   pending_alerts += full;
}

void SendWhatsAppRelay(const string message)
{
   // External messaging is deliberately disabled in this hardened build.
   // Terminal alerts and MT5 push notifications remain available without
   // exposing a local unauthenticated HTTP command surface.
   whatsapp_status = "DISABLED";
   whatsapp_error = 0;
}

void SendQueuedAlerts()
{
   if(pending_alerts == "" || MQLInfoInteger(MQL_TESTER))
      return;
   const string message = pending_alerts;
   pending_alerts = "";
   notification_time = TimeCurrent();

   if(!InpEnablePush)
      push_status = "DISABLED";
   else if(!TerminalInfoInteger(TERMINAL_NOTIFICATIONS_ENABLED))
   {
      push_status = "NOT CONFIGURED";
      push_error = 4517;
      Print("Exness Guard: configure MetaQuotes ID under Tools > Options > Notifications.");
   }
   else
   {
      ResetLastError();
      if(SendNotification(StringSubstr(message, 0, 255)))
      {
         push_status = "SENT";
         push_error = 0;
      }
      else
      {
         push_status = "FAILED";
         push_error = GetLastError();
         Print("Exness Guard: push notification failed, error ", push_error);
      }
   }
   SendWhatsAppRelay(message);
}

string StateKey(const string suffix)
{
   return StringFormat("EGG.%I64d.%I64u.%s.%s",
                       AccountInfoInteger(ACCOUNT_LOGIN),
                       InpMagicNumber, active_symbol, suffix);
}

int ServerDayId()
{
   MqlDateTime now;
   TimeToStruct(TimeTradeServer(), now);
   return now.year * 10000 + now.mon * 100 + now.day;
}

void SavePersistentState()
{
   if(MQLInfoInteger(MQL_TESTER))
      return;
   GlobalVariableSet(StateKey("day"), (double)state_day);
   GlobalVariableSet(StateKey("day_equity"), day_start_equity);
   GlobalVariableSet(StateKey("peak"), equity_peak);
   GlobalVariableSet(StateKey("bar"), (double)last_bar_time);
}

void RefreshPersistentRiskState()
{
   const double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   const int today = ServerDayId();
   if(state_day != today || day_start_equity <= 0.0)
   {
      state_day = today;
      day_start_equity = equity;
   }
   equity_peak = MathMax(equity_peak, equity);
   SavePersistentState();
}

void LoadPersistentState()
{
   const double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   state_day = ServerDayId();
   day_start_equity = equity;
   equity_peak = equity;
   if(!MQLInfoInteger(MQL_TESTER))
   {
      if(GlobalVariableCheck(StateKey("day")) &&
         (int)GlobalVariableGet(StateKey("day")) == state_day &&
         GlobalVariableCheck(StateKey("day_equity")))
         day_start_equity = GlobalVariableGet(StateKey("day_equity"));
      if(GlobalVariableCheck(StateKey("peak")))
         equity_peak = MathMax(equity,
                               GlobalVariableGet(StateKey("peak")));
      if(GlobalVariableCheck(StateKey("bar")))
         last_bar_time = (datetime)GlobalVariableGet(StateKey("bar"));

      // A strictly increasing epoch permits an audited, one-time baseline
      // adjustment after an external deposit or withdrawal. The stored marker
      // prevents a restart from repeatedly erasing genuine trading losses.
      const double applied_epoch = GlobalVariableCheck(StateKey("baseline_epoch"))
         ? GlobalVariableGet(StateKey("baseline_epoch")) : 0.0;
      if(InpRiskBaselineEpoch > 0 &&
         (double)InpRiskBaselineEpoch > applied_epoch)
      {
         state_day = ServerDayId();
         day_start_equity = equity;
         equity_peak = equity;
         GlobalVariableSet(StateKey("baseline_epoch"),
                           (double)InpRiskBaselineEpoch);
         Print("Risk baseline reset once for external capital flow; epoch ",
               InpRiskBaselineEpoch, ", equity ",
               DoubleToString(equity, 2));
      }
   }
   RefreshPersistentRiskState();
}

bool ContainsNoCase(string text, string fragment)
{
   StringToUpper(text);
   StringToUpper(fragment);
   return StringFind(text, fragment) >= 0;
}

bool ReadValue(const int handle, const int buffer, const int shift, double &value)
{
   double data[1];
   if(handle == INVALID_HANDLE || CopyBuffer(handle, buffer, shift, 1, data) != 1)
      return false;
   value = data[0];
   return MathIsValidNumber(value);
}

double NormalizePrice(const double price)
{
   return NormalizeDouble(price, (int)SymbolInfoInteger(active_symbol, SYMBOL_DIGITS));
}

int VolumeDigits(const double step)
{
   int digits = 0;
   double scaled = step;
   while(digits < 8 && MathAbs(scaled - MathRound(scaled)) > 1e-9)
   {
      scaled *= 10.0;
      digits++;
   }
   return digits;
}

double RiskVolume(const ENUM_ORDER_TYPE type, const double entry, const double stop)
{
   double loss_one_lot = 0.0;
   if(!OrderCalcProfit(type, active_symbol, 1.0, entry, stop, loss_one_lot))
      return 0.0;

   loss_one_lot = MathAbs(loss_one_lot);
   if(loss_one_lot <= 0.0)
      return 0.0;

   const double risk_cash = AccountInfoDouble(ACCOUNT_EQUITY) * InpRiskPercent / 100.0;
   const double minimum = SymbolInfoDouble(active_symbol, SYMBOL_VOLUME_MIN);
   const double maximum = SymbolInfoDouble(active_symbol, SYMBOL_VOLUME_MAX);
   const double step = SymbolInfoDouble(active_symbol, SYMBOL_VOLUME_STEP);
   if(step <= 0.0)
      return 0.0;

   double volume = MathFloor((risk_cash / loss_one_lot) / step) * step;
   if(volume < minimum)
      return 0.0; // Never round up and exceed the requested risk.
   volume = MathMin(volume, MathMin(maximum, InpMaxVolumeLots));
   return NormalizeDouble(volume, VolumeDigits(step));
}

void SaveShadowState()
{
   if(MQLInfoInteger(MQL_TESTER))
      return;
   GlobalVariableSet(StateKey("shadow_open"), shadow_open ? 1.0 : 0.0);
   GlobalVariableSet(StateKey("shadow_direction"), shadow_direction);
   GlobalVariableSet(StateKey("shadow_time"), (double)shadow_open_time);
   GlobalVariableSet(StateKey("shadow_entry"), shadow_entry);
   GlobalVariableSet(StateKey("shadow_stop"), shadow_stop);
   GlobalVariableSet(StateKey("shadow_target"), shadow_target);
   GlobalVariableSet(StateKey("shadow_volume"), shadow_volume);
   GlobalVariableSet(StateKey("shadow_risk"), shadow_risk_cash);
   GlobalVariableSet(StateKey("shadow_mfe"), shadow_mfe_r);
   GlobalVariableSet(StateKey("shadow_mae"), shadow_mae_r);
   GlobalVariableSet(StateKey("shadow_trades"), shadow_trades);
   GlobalVariableSet(StateKey("shadow_wins"), shadow_wins);
   GlobalVariableSet(StateKey("shadow_losses"), shadow_losses);
   GlobalVariableSet(StateKey("shadow_consecutive_losses"), shadow_consecutive_losses);
   GlobalVariableSet(StateKey("shadow_gross_win"), shadow_gross_win_r);
   GlobalVariableSet(StateKey("shadow_gross_loss"), shadow_gross_loss_r);
   GlobalVariableSet(StateKey("shadow_net"), shadow_net_r);
   GlobalVariableSet(StateKey("shadow_peak"), shadow_peak_r);
   GlobalVariableSet(StateKey("shadow_max_dd"), shadow_max_drawdown_r);
}

double StateValue(const string suffix, const double fallback = 0.0)
{
   const string key = StateKey(suffix);
   return GlobalVariableCheck(key) ? GlobalVariableGet(key) : fallback;
}

void LoadShadowState()
{
   if(MQLInfoInteger(MQL_TESTER))
      return;
   shadow_open = StateValue("shadow_open") > 0.5;
   shadow_direction = (int)StateValue("shadow_direction");
   shadow_open_time = (datetime)StateValue("shadow_time");
   shadow_entry = StateValue("shadow_entry");
   shadow_stop = StateValue("shadow_stop");
   shadow_target = StateValue("shadow_target");
   shadow_volume = StateValue("shadow_volume");
   shadow_risk_cash = StateValue("shadow_risk");
   shadow_mfe_r = StateValue("shadow_mfe");
   shadow_mae_r = StateValue("shadow_mae");
   shadow_trades = (int)StateValue("shadow_trades");
   shadow_wins = (int)StateValue("shadow_wins");
   shadow_losses = (int)StateValue("shadow_losses");
   shadow_consecutive_losses = (int)StateValue("shadow_consecutive_losses");
   shadow_gross_win_r = StateValue("shadow_gross_win");
   shadow_gross_loss_r = StateValue("shadow_gross_loss");
   shadow_net_r = StateValue("shadow_net");
   shadow_peak_r = StateValue("shadow_peak");
   shadow_max_drawdown_r = StateValue("shadow_max_dd");
   execution_fills = (int)StateValue("execution_fills");
   execution_slippage_total = StateValue("execution_slip_total");
   execution_slippage_max = StateValue("execution_slip_max");
   execution_slippage_last = StateValue("execution_slip_last");
}

void SaveExecutionStats()
{
   if(MQLInfoInteger(MQL_TESTER))
      return;
   GlobalVariableSet(StateKey("execution_fills"), execution_fills);
   GlobalVariableSet(StateKey("execution_slip_total"),
                     execution_slippage_total);
   GlobalVariableSet(StateKey("execution_slip_max"),
                     execution_slippage_max);
   GlobalVariableSet(StateKey("execution_slip_last"),
                     execution_slippage_last);
}

double ShadowVolume(const ENUM_ORDER_TYPE type, const double entry,
                    const double stop)
{
   double loss_one_lot = 0.0;
   if(!OrderCalcProfit(type, active_symbol, 1.0, entry, stop,
                       loss_one_lot))
      return 0.0;
   loss_one_lot = MathAbs(loss_one_lot);
   const double step = SymbolInfoDouble(active_symbol, SYMBOL_VOLUME_STEP);
   const double minimum = SymbolInfoDouble(active_symbol, SYMBOL_VOLUME_MIN);
   const double maximum = MathMin(
      SymbolInfoDouble(active_symbol, SYMBOL_VOLUME_MAX), InpMaxVolumeLots);
   if(loss_one_lot <= 0.0 || step <= 0.0)
      return 0.0;
   const double risk_cash =
      InpShadowReferenceEquity * InpRiskPercent / 100.0;
   double volume = MathFloor((risk_cash / loss_one_lot) / step) * step;
   if(volume < minimum)
      return 0.0;
   volume = MathMin(volume, maximum);
   return NormalizeDouble(volume, VolumeDigits(step));
}

void StartShadowTrade(const int direction, const double atr)
{
   if(!InpEnableShadowTrading || shadow_open ||
      PositionSelect(active_symbol))
      return;
   MqlTick tick = {};
   if(!SymbolInfoTick(active_symbol, tick) || atr <= 0.0)
      return;
   const double point = SymbolInfoDouble(active_symbol, SYMBOL_POINT);
   const double entry = direction > 0 ? tick.ask : tick.bid;
   double stop = direction > 0 ? entry - atr * InpStopATR
                               : entry + atr * InpStopATR;
   double target = direction > 0 ? entry + atr * InpTargetATR
                                 : entry - atr * InpTargetATR;
   const double minimum_distance =
      (double)SymbolInfoInteger(active_symbol, SYMBOL_TRADE_STOPS_LEVEL) *
      point;
   if(direction > 0)
   {
      stop = MathMin(stop, tick.bid - minimum_distance);
      target = MathMax(target, tick.ask + minimum_distance);
   }
   else
   {
      stop = MathMax(stop, tick.ask + minimum_distance);
      target = MathMin(target, tick.bid - minimum_distance);
   }
   stop = NormalizePrice(stop);
   target = NormalizePrice(target);
   const ENUM_ORDER_TYPE type =
      direction > 0 ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   const double volume = ShadowVolume(type, entry, stop);
   if(volume <= 0.0)
   {
      JournalActivity("SHADOW_SKIPPED",
         "Reference volume is below broker minimum");
      return;
   }

   double calculated_risk = 0.0;
   if(!OrderCalcProfit(type, active_symbol, volume, entry, stop,
                       calculated_risk))
      return;
   shadow_open = true;
   shadow_direction = direction;
   shadow_open_time = TimeTradeServer() > 0
      ? TimeTradeServer() : TimeCurrent();
   shadow_entry = entry;
   shadow_stop = stop;
   shadow_target = target;
   shadow_volume = volume;
   shadow_risk_cash = MathAbs(calculated_risk);
   shadow_mfe_r = 0.0;
   shadow_mae_r = 0.0;
   SaveShadowState();
   const string message = StringFormat(
      "%s virtual %s %.2f lots | entry %.3f | SL %.3f | TP %.3f | risk %.2f",
      active_symbol, direction > 0 ? "BUY" : "SELL", volume,
      entry, stop, target, shadow_risk_cash);
   JournalActivity("SHADOW_ENTRY", message);
   if(InpEnableShadowAlerts)
      QueueAlert("PAPER", message);
}

void UpdateShadowTrade()
{
   if(!InpEnableShadowTrading || !shadow_open)
      return;
   MqlTick tick = {};
   if(!SymbolInfoTick(active_symbol, tick))
      return;
   const double exit_price =
      shadow_direction > 0 ? tick.bid : tick.ask;
   const double risk_distance = MathAbs(shadow_entry - shadow_stop);
   if(risk_distance <= 0.0)
      return;
   const double current_r = shadow_direction > 0
      ? (exit_price - shadow_entry) / risk_distance
      : (shadow_entry - exit_price) / risk_distance;
   shadow_mfe_r = MathMax(shadow_mfe_r, current_r);
   shadow_mae_r = MathMin(shadow_mae_r, current_r);

   string outcome = "";
   if(shadow_direction > 0 && exit_price <= shadow_stop)
      outcome = "STOP";
   else if(shadow_direction > 0 && exit_price >= shadow_target)
      outcome = "TARGET";
   else if(shadow_direction < 0 && exit_price >= shadow_stop)
      outcome = "STOP";
   else if(shadow_direction < 0 && exit_price <= shadow_target)
      outcome = "TARGET";
   if(outcome == "")
   {
      const datetime now = TimeCurrent();
      if(now - last_shadow_save >= 30)
      {
         last_shadow_save = now;
         SaveShadowState();
      }
      return;
   }

   const double result_r = current_r;
   const double result_cash = result_r * shadow_risk_cash;
   shadow_trades++;
   if(result_r > 0.0)
   {
      shadow_wins++;
      shadow_consecutive_losses = 0;
      shadow_gross_win_r += result_r;
   }
   else
   {
      shadow_losses++;
      shadow_consecutive_losses++;
      shadow_gross_loss_r += MathAbs(result_r);
   }
   shadow_net_r += result_r;
   shadow_peak_r = MathMax(shadow_peak_r, shadow_net_r);
   shadow_max_drawdown_r = MathMax(
      shadow_max_drawdown_r, shadow_peak_r - shadow_net_r);
   const string message = StringFormat(
      "%s virtual %s | %.2fR | P/L %.2f | MFE %.2fR | MAE %.2fR",
      active_symbol, outcome, result_r, result_cash,
      shadow_mfe_r, shadow_mae_r);
   JournalActivity("SHADOW_EXIT", message);
   if(InpEnableShadowAlerts)
      QueueAlert("PAPER", message);
   shadow_open = false;
   shadow_direction = 0;
   shadow_open_time = 0;
   shadow_entry = 0.0;
   shadow_stop = 0.0;
   shadow_target = 0.0;
   shadow_volume = 0.0;
   shadow_risk_cash = 0.0;
   shadow_mfe_r = 0.0;
   shadow_mae_r = 0.0;
   SaveShadowState();
}

datetime StartOfServerDay()
{
   MqlDateTime parts;
   TimeToStruct(TimeTradeServer(), parts);
   parts.hour = 0;
   parts.min = 0;
   parts.sec = 0;
   return StructToTime(parts);
}

void DailyStats(double &net_result, int &entries)
{
   net_result = 0.0;
   entries = 0;
   if(!HistorySelect(StartOfServerDay(), TimeTradeServer()))
      return;

   const int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      const ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0 ||
         (ulong)HistoryDealGetInteger(ticket, DEAL_MAGIC) != InpMagicNumber ||
         HistoryDealGetString(ticket, DEAL_SYMBOL) != active_symbol)
         continue;

      const ENUM_DEAL_ENTRY entry =
         (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entry == DEAL_ENTRY_IN)
         entries++;
      if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
      {
         net_result += HistoryDealGetDouble(ticket, DEAL_PROFIT);
         net_result += HistoryDealGetDouble(ticket, DEAL_SWAP);
         net_result += HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      }
   }
}

string SharedNewsKey(const ulong event_id)
{
   return StringFormat("EGG.NEWS.%I64d.%I64u",
                       AccountInfoInteger(ACCOUNT_LOGIN), event_id);
}

void UpdateNewsGuard()
{
   const datetime now = TimeTradeServer() > 0
      ? TimeTradeServer() : TimeCurrent();
   if(!InpEnableNewsGuard)
   {
      news_status = "DISABLED";
      news_blocked = false;
      return;
   }
   if(MQLInfoInteger(MQL_TESTER))
   {
      news_status = "TESTER OFF";
      news_blocked = false;
      return;
   }
   if(last_news_check > 0 && now - last_news_check < 60)
      return;
   last_news_check = now;
   news_status = "UNAVAILABLE";
   news_event = "";
   news_event_time = 0;
   news_minutes_to = 0;
   news_error = 0;
   news_blocked = false;

   MqlCalendarValue values[];
   const datetime from_time = now - InpNewsPostEventMinutes * 60;
   const datetime to_time = now + 86400;
   ResetLastError();
   const int count = CalendarValueHistory(values, from_time, to_time, NULL, "USD");
   if(count < 0)
   {
      news_error = GetLastError();
      news_blocked = InpBlockHighImpactNews &&
                     InpBlockWhenNewsUnavailable;
      return;
   }
   news_status = "CLEAR";
   int selected = -1;
   bool selected_upcoming = false;
   datetime selected_time = 0;
   MqlCalendarEvent selected_event = {};
   for(int i = 0; i < count; i++)
   {
      MqlCalendarEvent event = {};
      if(!CalendarEventById(values[i].event_id, event) ||
         event.importance != CALENDAR_IMPORTANCE_HIGH)
         continue;
      const bool upcoming = values[i].time >= now;
      const bool recent = values[i].time < now &&
         now - values[i].time <= InpNewsPostEventMinutes * 60;
      if(!upcoming && !recent)
         continue;
      const bool better = selected < 0 ||
         (upcoming && !selected_upcoming) ||
         (upcoming == selected_upcoming &&
          ((upcoming && values[i].time < selected_time) ||
           (!upcoming && values[i].time > selected_time)));
      if(better)
      {
         selected = i;
         selected_upcoming = upcoming;
         selected_time = values[i].time;
         selected_event = event;
      }
   }
   if(selected < 0)
      return;

   news_event = selected_event.name;
   news_event_time = selected_time;
   news_minutes_to = (int)MathCeil((double)(selected_time - now) / 60.0);
   const bool before_window = selected_upcoming &&
      selected_time - now <= InpNewsAlertMinutes * 60;
   const bool after_window = !selected_upcoming &&
      now - selected_time <= InpNewsPostEventMinutes * 60;
   news_blocked = InpBlockHighImpactNews && (before_window || after_window);
   if(before_window)
      news_status = news_blocked ? "BLOCKED: EVENT SOON" : "EVENT SOON";
   else if(after_window)
      news_status = news_blocked ? "BLOCKED: POST EVENT" : "POST EVENT";
   else
      news_status = "NEXT EVENT";

   if(before_window)
   {
      const string key = SharedNewsKey(values[selected].id);
      if(!GlobalVariableCheck(key))
      {
         GlobalVariableSet(key, (double)now);
         QueueAlert("NEWS",
            StringFormat("USD high impact in %d min | %s | %s",
                         MathMax(news_minutes_to, 0), news_event,
                         news_blocked ? "new entries blocked" : "advisory"));
      }
   }
}

void MonitorPositionMilestones()
{
   if(!InpEnablePositionAlerts ||
      !PositionSelect(active_symbol) ||
      (ulong)PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)
   {
      tracked_position_ticket = 0;
      notified_profit_r = 0.0;
      return;
   }

   const ulong ticket = (ulong)PositionGetInteger(POSITION_TICKET);
   if(ticket != tracked_position_ticket)
   {
      tracked_position_ticket = ticket;
      notified_profit_r = 0.0;
      if(GlobalVariableCheck(StateKey("milestone_ticket")) &&
         (ulong)GlobalVariableGet(StateKey("milestone_ticket")) == ticket &&
         GlobalVariableCheck(StateKey("milestone_r")))
         notified_profit_r = GlobalVariableGet(StateKey("milestone_r"));
   }

   double original_risk = GlobalVariableCheck(StateKey("position_risk"))
      ? GlobalVariableGet(StateKey("position_risk")) : 0.0;
   if(original_risk <= 0.0)
   {
      const ENUM_POSITION_TYPE position_type =
         (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double calculated = 0.0;
      if(PositionGetDouble(POSITION_SL) > 0.0 &&
         OrderCalcProfit(position_type == POSITION_TYPE_BUY
                         ? ORDER_TYPE_BUY : ORDER_TYPE_SELL,
                         active_symbol,
                         PositionGetDouble(POSITION_VOLUME),
                         PositionGetDouble(POSITION_PRICE_OPEN),
                         PositionGetDouble(POSITION_SL), calculated))
      {
         original_risk = MathAbs(calculated);
         GlobalVariableSet(StateKey("position_risk"), original_risk);
      }
   }
   if(original_risk <= 0.0)
      return;

   const double profit = PositionGetDouble(POSITION_PROFIT) +
                         PositionGetDouble(POSITION_SWAP);
   const double current_r = profit / original_risk;
   double reached = 0.0;
   if(current_r >= InpProfitAlertThirdR)
      reached = InpProfitAlertThirdR;
   else if(current_r >= InpProfitAlertSecondR)
      reached = InpProfitAlertSecondR;
   else if(current_r >= InpProfitAlertFirstR)
      reached = InpProfitAlertFirstR;
   if(reached <= 0.0 || reached <= notified_profit_r + 0.0001)
      return;

   notified_profit_r = reached;
   GlobalVariableSet(StateKey("milestone_ticket"), (double)ticket);
   GlobalVariableSet(StateKey("milestone_r"), notified_profit_r);
   QueueAlert("PROFIT",
      StringFormat("%s reached %.2fR | floating P/L %.2f | monitor, no automatic exit",
                   active_symbol, reached, profit));
}

string AccountMode()
{
   const ENUM_ACCOUNT_TRADE_MODE mode =
      (ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE);
   if(mode == ACCOUNT_TRADE_MODE_DEMO)
      return "DEMO";
   if(mode == ACCOUNT_TRADE_MODE_CONTEST)
      return "CONTEST";
   return "REAL";
}

string DashboardMode()
{
   if(InpEmergencyStop)
      return "EMERGENCY STOP";
   if(!InpEnableTrading)
      return "SIGNALS ONLY";
   if(AccountMode() == "REAL")
   {
      if(!InpConfirmLiveAccount)
         return "LIVE LOCKED";
      if(InpAuthorizedAccount != AccountInfoInteger(ACCOUNT_LOGIN))
         return "ACCOUNT LOCKED";
      if(InpLiveConfirmation != "I_ACCEPT_LIVE_RISK")
         return "CONFIRMATION LOCKED";
   }
   return "TRADING ARMED";
}

string ShadowJson()
{
   double current_r = 0.0;
   if(shadow_open)
   {
      MqlTick tick = {};
      if(SymbolInfoTick(active_symbol, tick))
      {
         const double exit_price =
            shadow_direction > 0 ? tick.bid : tick.ask;
         const double distance = MathAbs(shadow_entry - shadow_stop);
         if(distance > 0.0)
            current_r = shadow_direction > 0
               ? (exit_price - shadow_entry) / distance
               : (shadow_entry - exit_price) / distance;
      }
   }
   const double win_rate = shadow_trades > 0
      ? (double)shadow_wins / shadow_trades * 100.0 : 0.0;
   const double profit_factor = shadow_gross_loss_r > 0.0
      ? shadow_gross_win_r / shadow_gross_loss_r
      : (shadow_gross_win_r > 0.0 ? 999.0 : 0.0);
   const double reference_risk =
      InpShadowReferenceEquity * InpRiskPercent / 100.0;
   return "{\"enabled\":" + JBool(InpEnableShadowTrading) +
      ",\"referenceEquity\":" + JNumber(InpShadowReferenceEquity, 2) +
      ",\"open\":" + JBool(shadow_open) +
      ",\"side\":" +
         JString(shadow_direction > 0 ? "BUY" :
                 shadow_direction < 0 ? "SELL" : "FLAT") +
      ",\"openTime\":" + IntegerToString((long)shadow_open_time) +
      ",\"entry\":" + JNumber(shadow_entry, 3) +
      ",\"stop\":" + JNumber(shadow_stop, 3) +
      ",\"target\":" + JNumber(shadow_target, 3) +
      ",\"volume\":" + JNumber(shadow_volume, 2) +
      ",\"riskCash\":" + JNumber(shadow_risk_cash, 2) +
      ",\"currentR\":" + JNumber(current_r, 3) +
      ",\"mfeR\":" + JNumber(shadow_mfe_r, 3) +
      ",\"maeR\":" + JNumber(shadow_mae_r, 3) +
      ",\"stats\":{\"trades\":" + IntegerToString(shadow_trades) +
         ",\"wins\":" + IntegerToString(shadow_wins) +
         ",\"losses\":" + IntegerToString(shadow_losses) +
         ",\"winRate\":" + JNumber(win_rate, 2) +
         ",\"netR\":" + JNumber(shadow_net_r, 3) +
         ",\"estimatedNet\":" +
            JNumber(shadow_net_r * reference_risk, 2) +
         ",\"profitFactor\":" + JNumber(profit_factor, 2) +
         ",\"maxDrawdownR\":" +
            JNumber(shadow_max_drawdown_r, 3) + "}}";
}

string ExecutionJson()
{
   const double average = execution_fills > 0
      ? execution_slippage_total / execution_fills : 0.0;
   return "{\"fills\":" + IntegerToString(execution_fills) +
      ",\"lastSlippagePoints\":" +
         JNumber(execution_slippage_last, 1) +
      ",\"averageSlippagePoints\":" + JNumber(average, 1) +
      ",\"maxSlippagePoints\":" +
         JNumber(execution_slippage_max, 1) + "}";
}

bool HasGuardPosition()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      const ulong ticket = PositionGetTicket(i);
      if(ticket <= 0)
         continue;
      const string comment = PositionGetString(POSITION_COMMENT);
      if(StringFind(comment, "ExnessGoldGuard") == 0)
         return true;
   }
   return false;
}

string PositionJson()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      const ulong ticket = PositionGetTicket(i);
      if(ticket == 0 ||
         PositionGetString(POSITION_SYMBOL) != active_symbol ||
         (ulong)PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)
         continue;

      const ENUM_POSITION_TYPE type =
         (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      const double stop = PositionGetDouble(POSITION_SL);
      const double target = PositionGetDouble(POSITION_TP);
      const double profit = PositionGetDouble(POSITION_PROFIT) +
                            PositionGetDouble(POSITION_SWAP);
      const double original_risk =
         GlobalVariableCheck(StateKey("position_risk"))
         ? GlobalVariableGet(StateKey("position_risk")) : 0.0;
      const double r_multiple = original_risk > 0.0
         ? profit / original_risk : 0.0;
      return "{\"open\":true,\"side\":" +
         JString(type == POSITION_TYPE_BUY ? "BUY" : "SELL") +
         ",\"volume\":" + JNumber(PositionGetDouble(POSITION_VOLUME), 2) +
         ",\"entry\":" + JNumber(PositionGetDouble(POSITION_PRICE_OPEN), 3) +
         ",\"stop\":" + JNumber(stop, 3) +
         ",\"target\":" + JNumber(target, 3) +
         ",\"profit\":" + JNumber(profit, 2) +
         ",\"originalRisk\":" + JNumber(original_risk, 2) +
         ",\"rMultiple\":" + JNumber(r_multiple, 3) +
         ",\"protected\":" + JBool(stop > 0.0 && target > 0.0) + "}";
   }
   return "{\"open\":false}";
}

string CandlesJson()
{
   const int available = Bars(active_symbol, InpSignalTimeframe);
   const int count = MathMin(MathMax(0, available), InpDashboardCandleBars);
   string json = "[";
   int written = 0;
   for(int shift = count - 1; shift >= 0; shift--)
   {
      const datetime time = iTime(active_symbol, InpSignalTimeframe, shift);
      if(time <= 0)
         continue;
      if(written > 0)
         json += ",";
      json += "{\"time\":" + IntegerToString((long)time) +
              ",\"open\":" + JNumber(iOpen(active_symbol, InpSignalTimeframe, shift), 3) +
              ",\"high\":" + JNumber(iHigh(active_symbol, InpSignalTimeframe, shift), 3) +
              ",\"low\":" + JNumber(iLow(active_symbol, InpSignalTimeframe, shift), 3) +
              ",\"close\":" + JNumber(iClose(active_symbol, InpSignalTimeframe, shift), 3) + "}";
      written++;
   }
   return json + "]";
}

string StructureJson()
{
   const int window = MathMax(2, MathMin(InpBreakoutBars, InpDashboardCandleBars));
   double highs[];
   double lows[];
   ArrayResize(highs, window);
   ArrayResize(lows, window);
   if(CopyHigh(active_symbol, InpSignalTimeframe, 1, window, highs) != window ||
      CopyLow(active_symbol, InpSignalTimeframe, 1, window, lows) != window)
      return "{\"support\":null,\"resistance\":null,\"window\":" + IntegerToString(window) + "}";

   const double support = lows[ArrayMinimum(lows)];
   const double resistance = highs[ArrayMaximum(highs)];
   return "{\"support\":" + JNumber(support, 3) +
      ",\"resistance\":" + JNumber(resistance, 3) +
      ",\"window\":" + IntegerToString(window) + "}";
}

string ValidationJson()
{
   const double win_rate = shadow_trades > 0
      ? (double)shadow_wins / shadow_trades * 100.0 : 0.0;
   const double profit_factor = shadow_gross_loss_r > 0.0
      ? shadow_gross_win_r / shadow_gross_loss_r
      : (shadow_gross_win_r > 0.0 ? 999.0 : 0.0);
   const bool min_trades = shadow_trades >= 50;
   const bool win_rate_ok = shadow_trades > 0 && win_rate >= 55.0;
   const bool profit_factor_ok = shadow_trades > 0 && profit_factor >= 1.8;
   const bool drawdown_ok = shadow_max_drawdown_r <= 0.15;
   const bool consec_losses_ok = shadow_consecutive_losses <= 4;
   return "{\"shadowTrades\":" + IntegerToString(shadow_trades) +
      ",\"shadowWins\":" + IntegerToString(shadow_wins) +
      ",\"shadowLosses\":" + IntegerToString(shadow_losses) +
      ",\"shadowConsecutiveLosses\":" + IntegerToString(shadow_consecutive_losses) +
      ",\"shadowWinRate\":" + JNumber(win_rate, 2) +
      ",\"shadowProfitFactor\":" + JNumber(profit_factor, 2) +
      ",\"shadowDrawdownR\":" + JNumber(shadow_max_drawdown_r, 3) +
      ",\"minTradesReached\":" + JBool(min_trades) +
      ",\"winRateOk\":" + JBool(win_rate_ok) +
      ",\"profitFactorOk\":" + JBool(profit_factor_ok) +
      ",\"drawdownOk\":" + JBool(drawdown_ok) +
      ",\"consecLossesOk\":" + JBool(consec_losses_ok) +
      ",\"ready\":" + JBool(min_trades && win_rate_ok && profit_factor_ok && drawdown_ok && consec_losses_ok) + "}";
}

string PositionSide()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      const ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || PositionGetString(POSITION_SYMBOL) != active_symbol ||
         (ulong)PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)
         continue;

      const ENUM_POSITION_TYPE type =
         (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      return type == POSITION_TYPE_BUY ? "BUY" : "SELL";
   }
   return "FLAT";
}

bool TrendExitWarning(const int buy_checks, const int sell_checks,
                      const string current_trend, string &reason,
                      string &state)
{
   reason = "";
   state = "NONE";
   const string position_side = PositionSide();
   if(position_side == "FLAT")
      return false;

   const int current_checks = position_side == "BUY" ? buy_checks : sell_checks;
   const int opposite_checks = position_side == "BUY" ? sell_checks : buy_checks;
   const int gap = current_checks - opposite_checks;

   if(trend_reversal && current_trend != "WAIT")
   {
      reason = StringFormat("TREND REVERSAL: %s -> %s", trend_previous_bias,
                            current_trend);
      state = "NOW";
      return true;
   }

   if(opposite_checks >= 8 && gap <= 2)
   {
      reason = StringFormat("%s weakening: opposite side at %d/12 vs %d/12",
                            position_side, opposite_checks, current_checks);
      state = "WATCH";
      return true;
   }

   if(current_trend == "WAIT" && opposite_checks >= 9)
   {
      reason = StringFormat("Trend undecided but %s pressure is high (%d/12)",
                            position_side == "BUY" ? "SELL" : "BUY",
                            opposite_checks);
      state = "WATCH";
      return true;
   }

   return false;
}

void ExportDashboard()
{
   if(!InpExportDashboard || active_symbol == "")
      return;

   RefreshPersistentRiskState();
   MqlTick tick = {};
   SymbolInfoTick(active_symbol, tick);
   double today_result = 0.0;
   int today_entries = 0;
   DailyStats(today_result, today_entries);

   const double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   const double daily_loss_pct = day_start_equity > 0.0
      ? MathMax(0.0, (day_start_equity - equity) / day_start_equity * 100.0)
      : 0.0;
   const double drawdown_pct = equity_peak > 0.0
      ? MathMax(0.0, (equity_peak - equity) / equity_peak * 100.0)
      : 0.0;
   const double point = SymbolInfoDouble(active_symbol, SYMBOL_POINT);
   const double spread_points = point > 0.0 ? (tick.ask - tick.bid) / point : 0.0;
   const string login = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   const string login_tail = StringLen(login) > 4
      ? StringSubstr(login, StringLen(login) - 4) : login;
   // A dashboard heartbeat describes the local EA process, not the broker
   // clock. TimeTradeServer()/TimeCurrent() can freeze during a disconnect and
   // make a healthy exporter look stale. TimeGMT() keeps advancing and also
   // produces an unambiguous Unix timestamp across daylight-saving changes.
   const datetime now = TimeGMT();
   const datetime server_now = TimeTradeServer();
   const datetime current_bar =
      iTime(active_symbol, InpSignalTimeframe, 0);
   const datetime next_bar = current_bar > 0
      ? current_bar + PeriodSeconds(InpSignalTimeframe) : 0;

   string json = "{\"schema\":2,\"heartbeat\":" + IntegerToString((long)now) +
      ",\"serverTime\":" + IntegerToString((long)server_now) +
      ",\"terminal\":{\"connected\":" +
         JBool(TerminalInfoInteger(TERMINAL_CONNECTED)) +
         ",\"algoTrading\":" +
         JBool(TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) &&
               MQLInfoInteger(MQL_TRADE_ALLOWED)) + "}" +
      ",\"account\":{\"mode\":" + JString(AccountMode()) +
         ",\"server\":" + JString(AccountInfoString(ACCOUNT_SERVER)) +
         ",\"loginTail\":" + JString(login_tail) +
         ",\"currency\":" + JString(AccountInfoString(ACCOUNT_CURRENCY)) +
         ",\"balance\":" + JNumber(AccountInfoDouble(ACCOUNT_BALANCE), 2) +
         ",\"equity\":" + JNumber(equity, 2) +
         ",\"freeMargin\":" + JNumber(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2) +
         ",\"marginLevel\":" + JNumber(AccountInfoDouble(ACCOUNT_MARGIN_LEVEL), 2) + "}" +
      ",\"engine\":{\"version\":\"1.40\",\"mode\":" + JString(DashboardMode()) +
         ",\"status\":" + JString(status_text) +
         ",\"emergencyStop\":" + JBool(InpEmergencyStop) +
         ",\"exnessVerified\":" +
         JBool(ContainsNoCase(AccountInfoString(ACCOUNT_SERVER), "EXNESS")) + "}" +
      ",\"market\":{\"symbol\":" + JString(active_symbol) +
         ",\"bid\":" + JNumber(tick.bid, 3) +
         ",\"ask\":" + JNumber(tick.ask, 3) +
         ",\"spreadPoints\":" + JNumber(spread_points, 1) +
         ",\"signal\":" + JString(signal_side) +
         ",\"trend\":" + JString(trend_bias) +
         ",\"trendPrevious\":" + JString(trend_previous_bias) +
         ",\"trendReversal\":" + JBool(trend_reversal) +
         ",\"trendExitWarning\":" + JBool(trend_exit_warning) +
         ",\"trendExitState\":" + JString(trend_exit_state) +
         ",\"trendExitReason\":" + JString(trend_exit_reason) +
         ",\"buyChecks\":" + IntegerToString(signal_buy_checks) +
         ",\"sellChecks\":" + IntegerToString(signal_sell_checks) +
         ",\"shadowCandidate\":" + JString(shadow_candidate_side) +
         ",\"shadowCandidateQualified\":" +
            JBool(shadow_candidate_qualified) +
         ",\"shadowCandidateThreshold\":" +
            IntegerToString(InpShadowCandidateChecks) +
         ",\"nextBarTime\":" + IntegerToString((long)next_bar) +
         ",\"structure\":" + StructureJson() +
         ",\"factors\":{\"h1\":{\"buy\":" + JBool(factor_buy_h1) +
            ",\"sell\":" + JBool(factor_sell_h1) + "}" +
            ",\"h4\":{\"buy\":" + JBool(factor_buy_h4) +
            ",\"sell\":" + JBool(factor_sell_h4) + "}" +
            ",\"breakout\":{\"buy\":" +
               JBool(factor_buy_breakout) +
               ",\"sell\":" + JBool(factor_sell_breakout) + "}" +
            ",\"momentum\":{\"buy\":" +
               JBool(factor_buy_momentum) +
               ",\"sell\":" + JBool(factor_sell_momentum) + "}" +
            ",\"strength\":{\"buy\":" +
               JBool(factor_buy_strength) +
               ",\"sell\":" + JBool(factor_sell_strength) + "}" +
            ",\"volatility\":{\"buy\":" +
               JBool(factor_buy_volatility) +
               ",\"sell\":" + JBool(factor_sell_volatility) + "}" +
            ",\"timeofday\":{\"buy\":" +
               JBool(factor_buy_timeofday) +
               ",\"sell\":" + JBool(factor_sell_timeofday) + "}" +
            ",\"emaslope\":{\"buy\":" +
               JBool(factor_buy_ema_slope) +
               ",\"sell\":" + JBool(factor_sell_ema_slope) + "}" +
            ",\"prevstrength\":{\"buy\":" +
               JBool(factor_buy_prev_strength) +
               ",\"sell\":" + JBool(factor_sell_prev_strength) + "}" +
            ",\"m5confirm\":{\"buy\":" +
               JBool(factor_buy_m5_confirm) +
               ",\"sell\":" + JBool(factor_sell_m5_confirm) + "}" +
            ",\"stochastic\":{\"buy\":" +
               JBool(factor_buy_stochastic) +
               ",\"sell\":" + JBool(factor_sell_stochastic) + "}" +
            ",\"tickvol\":{\"buy\":" +
               JBool(factor_buy_tickvol) +
               ",\"sell\":" + JBool(factor_sell_tickvol) + "}" +
            ",\"sr\":{\"buy\":" + JBool(factor_buy_sr) +
               ",\"sell\":" + JBool(factor_sell_sr) + "}}" +
         ",\"detail\":" + JString(signal_detail) + "}" +
      ",\"risk\":{\"riskPercent\":" + JNumber(InpRiskPercent, 3) +
         ",\"riskCash\":" + JNumber(equity * InpRiskPercent / 100.0, 2) +
         ",\"dayStartEquity\":" + JNumber(day_start_equity, 2) +
         ",\"dailyLossPercent\":" + JNumber(daily_loss_pct, 3) +
         ",\"dailyLossLimit\":" + JNumber(InpDailyLossLimitPct, 3) +
         ",\"drawdownPercent\":" + JNumber(drawdown_pct, 3) +
         ",\"drawdownLimit\":" + JNumber(InpMaxDrawdownPct, 3) +
         ",\"tradesToday\":" + IntegerToString(today_entries) +
         ",\"tradesLimit\":" + IntegerToString(InpMaxTradesPerDay) +
         ",\"realizedToday\":" + JNumber(today_result, 2) + "}" +
      ",\"position\":" + PositionJson() +
      ",\"shadow\":" + ShadowJson() +
      ",\"validation\":" + ValidationJson() +
      ",\"execution\":" + ExecutionJson() +
      ",\"alerts\":{\"lastLevel\":" + JString(last_alert_level) +
         ",\"lastMessage\":" + JString(last_alert_message) +
         ",\"lastTime\":" + IntegerToString((long)last_alert_time) +
         ",\"push\":{\"enabled\":" + JBool(InpEnablePush) +
            ",\"configured\":" +
            JBool(TerminalInfoInteger(TERMINAL_NOTIFICATIONS_ENABLED)) +
            ",\"status\":" + JString(push_status) +
            ",\"error\":" + IntegerToString(push_error) + "}" +
         ",\"whatsApp\":{\"enabled\":" + JBool(InpEnableWhatsApp) +
            ",\"status\":" + JString(whatsapp_status) +
            ",\"error\":" + IntegerToString(whatsapp_error) + "}" +
         ",\"journal\":{\"enabled\":" + JBool(InpEnableActivityJournal) +
            ",\"status\":" + JString(journal_status) +
            ",\"file\":" + JString(InpJournalFileName) +
            ",\"lastEvent\":" + JString(last_journal_event) +
            ",\"lastTime\":" + IntegerToString((long)last_journal_time) + "}" +
         ",\"lastDispatch\":" + IntegerToString((long)notification_time) + "}" +
      ",\"news\":{\"enabled\":" + JBool(InpEnableNewsGuard) +
         ",\"blocked\":" + JBool(news_blocked) +
         ",\"status\":" + JString(news_status) +
         ",\"event\":" + JString(news_event) +
         ",\"eventTime\":" + IntegerToString((long)news_event_time) +
         ",\"minutesTo\":" + IntegerToString(news_minutes_to) +
         ",\"alertMinutes\":" + IntegerToString(InpNewsAlertMinutes) +
         ",\"postMinutes\":" + IntegerToString(InpNewsPostEventMinutes) +
         ",\"error\":" + IntegerToString(news_error) + "}" +
      ",\"candles\":" + CandlesJson() + "}";

   const string path = "ExnessGoldGuard\\" + InpDashboardFileName;
   const int file = FileOpen(path, FILE_WRITE | FILE_TXT | FILE_ANSI |
                             FILE_COMMON | FILE_SHARE_READ, 0, CP_UTF8);
   if(file == INVALID_HANDLE)
   {
      Print("Dashboard export failed: ", GetLastError());
      return;
   }
   FileWriteString(file, json);
   FileFlush(file);
   FileClose(file);
   last_dashboard_export = TimeLocal();
}

bool HasOpenPosition()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      const ulong ticket = PositionGetTicket(i);
      if(ticket > 0 && PositionGetString(POSITION_SYMBOL) == active_symbol)
         return true;
   }
   return false;
}

bool ExecutionAllowed(string &reason)
{
   if(InpEmergencyStop)
   {
      reason = "Emergency stop is ON";
      return false;
   }
   if(!InpEnableTrading)
   {
      reason = "Signals only: EnableTrading is OFF";
      return false;
   }

   const ENUM_ACCOUNT_TRADE_MODE mode =
      (ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE);
   if(mode == ACCOUNT_TRADE_MODE_REAL && !InpConfirmLiveAccount)
   {
      reason = "Live account not confirmed";
      return false;
   }
   if(mode == ACCOUNT_TRADE_MODE_REAL)
   {
      const long login = AccountInfoInteger(ACCOUNT_LOGIN);
      if(InpAuthorizedAccount <= 0 || login != InpAuthorizedAccount)
      {
         reason = "Live lock: authorized account number does not match";
         return false;
      }
      if(InpLiveConfirmation != "I_ACCEPT_LIVE_RISK")
      {
         reason = "Live lock: confirmation phrase is missing";
         return false;
      }
   }

   const string server = AccountInfoString(ACCOUNT_SERVER);
   if(InpRequireExnessServer && !ContainsNoCase(server, "EXNESS"))
   {
      reason = "Broker lock: server is not identified as Exness";
      return false;
   }
   if(!AccountInfoInteger(ACCOUNT_TRADE_ALLOWED) ||
      !TerminalInfoInteger(TERMINAL_CONNECTED) ||
      !TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) ||
      !MQLInfoInteger(MQL_TRADE_ALLOWED))
   {
      reason = "Account, connection, or Algo Trading is unavailable";
      return false;
   }
   if(HasOpenPosition() || HasGuardPosition())
   {
      reason = "A Gold Guard family position is already open";
      return false;
   }

   double today_result;
   int today_entries;
   DailyStats(today_result, today_entries);
   if(today_entries >= InpMaxTradesPerDay)
   {
      reason = "Daily trade limit reached";
      return false;
   }

   RefreshPersistentRiskState();
   const double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   const double daily_equity_result = equity - day_start_equity;
   if(daily_equity_result <=
      -(day_start_equity * InpDailyLossLimitPct / 100.0))
   {
      reason = "Daily equity-loss limit reached";
      return false;
   }

   if(equity_peak > 0.0 &&
      (equity_peak - equity) / equity_peak * 100.0 >= InpMaxDrawdownPct)
   {
      reason = "Persistent equity-drawdown limit reached";
      return false;
   }

   MqlDateTime now;
   TimeToStruct(TimeTradeServer(), now);
   if(InpAvoidRolloverHour && now.hour == InpRolloverHourServer)
   {
      reason = "Rollover hour blocked";
      return false;
   }
   UpdateNewsGuard();
   if(news_blocked)
   {
      reason = news_status == "UNAVAILABLE"
         ? "MT5 USD news calendar unavailable"
         : "High-impact USD news window: " + news_event;
      return false;
   }
   return true;
}

bool VolatilityPercentile(const double current_atr, double &atr_percentile_value)
{
   double atr_values[];
   if(CopyBuffer(atr_handle, 0, 1, 50, atr_values) != 50)
      return false;
   
   int count_above = 0;
   for(int i = 0; i < 50; i++)
   {
      if(atr_values[i] <= current_atr)
         count_above++;
   }
   
   atr_percentile_value = (double)count_above / 50.0 * 100.0;
   return atr_percentile_value >= InpATRPercentile;
}

bool TimeOfDayOK()
{
   MqlDateTime now;
   TimeToStruct(TimeTradeServer(), now);
   
   if(InpBlockStartHour < InpBlockEndHour)
   {
      return now.hour >= InpBlockEndHour && now.hour < InpBlockStartHour;
   }
   else
   {
      return now.hour >= InpBlockEndHour && now.hour < InpBlockStartHour;
   }
}

bool EMASlope(const int direction, const double fast, const double slow, const double close_price)
{
   if(close_price <= 0.0)
      return false;
   
   const double slope_percent = MathAbs(fast - slow) / close_price * 100.0;
   
   if(direction > 0)
      return fast > slow && slope_percent >= InpEMASlopeMinPercent;
   else
      return fast < slow && slope_percent >= InpEMASlopeMinPercent;
}

bool PreviousCandleStrength()
{
   const double prev_high = iHigh(active_symbol, InpSignalTimeframe, 2);
   const double prev_low = iLow(active_symbol, InpSignalTimeframe, 2);
   const double prev_open = iOpen(active_symbol, InpSignalTimeframe, 2);
   const double prev_close = iClose(active_symbol, InpSignalTimeframe, 2);
   
   if(prev_high <= prev_low)
      return false;
   
   const double body = MathAbs(prev_close - prev_open);
   const double range = prev_high - prev_low;
   
   if(range <= 0.0)
      return false;
   
   const double body_to_range = body / range;
   return body_to_range > (1.0 / InpPrevCandleWickMax);
}

bool M5BreakoutConfirmation(const int direction, double &m5_highest, double &m5_lowest)
{
   if(InpM5BreakoutBars < 2)
      return false;

   double m5_highs[];
   double m5_lows[];
   ArrayResize(m5_highs, InpM5BreakoutBars);
   ArrayResize(m5_lows, InpM5BreakoutBars);
   
   if(CopyHigh(active_symbol, PERIOD_M5, 2, InpM5BreakoutBars, m5_highs) != InpM5BreakoutBars ||
      CopyLow(active_symbol, PERIOD_M5, 2, InpM5BreakoutBars, m5_lows) != InpM5BreakoutBars)
      return false;
   
   m5_highest = m5_highs[ArrayMaximum(m5_highs)];
   m5_lowest = m5_lows[ArrayMinimum(m5_lows)];
   
   const double m5_close = iClose(active_symbol, PERIOD_M5, 1);
   
   if(direction > 0)
      return m5_close > m5_highest;
   else
      return m5_close < m5_lowest;
}

bool StochasticSignal(const int direction, double &stoch_k)
{
   if(!ReadValue(stochastic_handle, 0, 1, stoch_k))
      return false;
   
   if(direction > 0)
      return stoch_k > 80.0;
   else
      return stoch_k < 20.0;
}

// Advanced S&R: Order Block detector (bonus factor - does not count toward 12/12 threshold)
// Buy OB:  last bearish candle before a bullish impulse — price retesting that zone
// Sell OB: last bullish candle before a bearish impulse — price retesting that zone
bool OrderBlockSignal(const int direction)
{
   const int lookback = 30;
   double closes[], opens[], highs[], lows[];
   ArraySetAsSeries(closes, true);
   ArraySetAsSeries(opens,  true);
   ArraySetAsSeries(highs,  true);
   ArraySetAsSeries(lows,   true);
   if(CopyClose(active_symbol, InpSignalTimeframe, 1, lookback + 3, closes) < lookback + 3 ||
      CopyOpen (active_symbol, InpSignalTimeframe, 1, lookback + 3, opens)  < lookback + 3 ||
      CopyHigh (active_symbol, InpSignalTimeframe, 1, lookback + 3, highs)  < lookback + 3 ||
      CopyLow  (active_symbol, InpSignalTimeframe, 1, lookback + 3, lows)   < lookback + 3)
      return false;

   const double current_close = closes[0];

   for(int i = 1; i < lookback; i++)
   {
      const double next_body = MathAbs(closes[i-1] - opens[i-1]);
      const double this_body = MathAbs(closes[i]   - opens[i]);
      if(this_body <= 0.0 || next_body < this_body * 0.5) continue;

      if(direction > 0)
      {
         if(closes[i] >= opens[i]) continue;          // must be bearish candle
         if(closes[i-1] <= opens[i-1]) continue;      // impulse must be bullish
         if(current_close >= lows[i] && current_close <= highs[i])
            return true;
      }
      else
      {
         if(closes[i] <= opens[i]) continue;          // must be bullish candle
         if(closes[i-1] >= opens[i-1]) continue;      // impulse must be bearish
         if(current_close >= lows[i] && current_close <= highs[i])
            return true;
      }
   }
   return false;
}

bool TickVolumeConfirmation()
{
   long current_volume = iVolume(active_symbol, InpSignalTimeframe, 1);
   if(current_volume <= 0)
      return false;
   
   double avg_volume = 0.0;
   long volumes[];
   if(CopyTickVolume(active_symbol, InpSignalTimeframe, 1, 20, volumes) != 20)
      return false;
   
   for(int i = 0; i < 20; i++)
      avg_volume += (double)volumes[i];
   avg_volume /= 20.0;
   
   return current_volume >= avg_volume * InpTickVolMinRatio;
}

bool BreakoutLevels(double &highest, double &lowest,
                    double &previous_highest, double &previous_lowest)
{
   if(InpBreakoutBars < 2)
      return false;

   double highs[];
   double lows[];
   double prev_highs[];
   double prev_lows[];
   ArrayResize(highs, InpBreakoutBars);
   ArrayResize(lows, InpBreakoutBars);
   ArrayResize(prev_highs, InpBreakoutBars);
   ArrayResize(prev_lows, InpBreakoutBars);
   // Prior bars only: the signal candle at shift 1 must break these levels.
   if(CopyHigh(active_symbol, InpSignalTimeframe, 2, InpBreakoutBars, highs) != InpBreakoutBars ||
      CopyLow(active_symbol, InpSignalTimeframe, 2, InpBreakoutBars, lows) != InpBreakoutBars ||
      CopyHigh(active_symbol, InpSignalTimeframe, 3, InpBreakoutBars, prev_highs) != InpBreakoutBars ||
      CopyLow(active_symbol, InpSignalTimeframe, 3, InpBreakoutBars, prev_lows) != InpBreakoutBars)
      return false;

   highest = highs[ArrayMaximum(highs)];
   lowest = lows[ArrayMinimum(lows)];
   previous_highest = prev_highs[ArrayMaximum(prev_highs)];
   previous_lowest = prev_lows[ArrayMinimum(prev_lows)];
   return true;
}

int Signal(double &atr, string &detail, int &buy_checks, int &sell_checks,
           string &current_trend)
{
   buy_checks = 0;
   sell_checks = 0;
   current_trend = "WAIT";
   factor_buy_h1 = false;
   factor_sell_h1 = false;
   factor_buy_h4 = false;
   factor_sell_h4 = false;
   factor_buy_breakout = false;
   factor_sell_breakout = false;
   factor_buy_momentum = false;
   factor_sell_momentum = false;
   factor_buy_strength = false;
   factor_sell_strength = false;
   factor_buy_volatility = false;
   factor_sell_volatility = false;
   factor_buy_timeofday = false;
   factor_sell_timeofday = false;
   factor_buy_ema_slope = false;
   factor_sell_ema_slope = false;
   factor_buy_prev_strength = false;
   factor_sell_prev_strength = false;
   factor_buy_m5_confirm = false;
   factor_sell_m5_confirm = false;
   factor_buy_stochastic = false;
   factor_sell_stochastic = false;
   factor_buy_tickvol = false;
   factor_sell_tickvol = false;
   factor_buy_sr = false;
   factor_sell_sr = false;
   
   double fast, slow, fast_previous, trend_fast, trend_slow;
   double rsi, adx, plus_di, minus_di;
   double m5_fast, m5_slow;
   if(!ReadValue(fast_handle, 0, 1, fast) ||
      !ReadValue(slow_handle, 0, 1, slow) ||
      !ReadValue(fast_handle, 0, 2, fast_previous) ||
      !ReadValue(trend_fast_handle, 0, 1, trend_fast) ||
      !ReadValue(trend_slow_handle, 0, 1, trend_slow) ||
      !ReadValue(rsi_handle, 0, 1, rsi) ||
      !ReadValue(adx_handle, 0, 1, adx) ||
      !ReadValue(adx_handle, 1, 1, plus_di) ||
      !ReadValue(adx_handle, 2, 1, minus_di) ||
      !ReadValue(atr_handle, 0, 1, atr) ||
      !ReadValue(m5_fast_handle, 0, 1, m5_fast) ||
      !ReadValue(m5_slow_handle, 0, 1, m5_slow))
   {
      detail = "Waiting for indicator history";
      return 0;
   }

   const double close_price = iClose(active_symbol, InpSignalTimeframe, 1);
   double highest, lowest, previous_highest, previous_lowest;
   if(close_price <= 0.0 || atr <= 0.0 || !BreakoutLevels(highest, lowest,
                                                     previous_highest,
                                                     previous_lowest))
   {
      detail = "Waiting for candle history";
      return 0;
   }

   const double previous_close = iClose(active_symbol, InpSignalTimeframe, 2);
   const bool atr_ok = atr >= close_price * InpMinimumATRPercent / 100.0;
   const bool buy_h1 = fast > slow && fast > fast_previous;
   const bool sell_h1 = fast < slow && fast < fast_previous;
   const bool buy_h4 = trend_fast > trend_slow;
   const bool sell_h4 = trend_fast < trend_slow;
   const bool buy_breakout = close_price > highest && previous_close > previous_highest;
   const bool sell_breakout = close_price < lowest && previous_close < previous_lowest;
   const bool buy_momentum = rsi >= InpBuyRSI && rsi < 75.0;
   const bool sell_momentum = rsi <= InpSellRSI && rsi > 25.0;
   const bool buy_strength = adx >= InpMinimumADX && plus_di > minus_di && atr_ok;
   const bool sell_strength = adx >= InpMinimumADX && minus_di > plus_di && atr_ok;
   
   // New signal factors - 7 improvements
   double atr_percentile = 0.0;
   const bool buy_volatility = VolatilityPercentile(atr, atr_percentile);
   const bool sell_volatility = buy_volatility;
   
   const bool buy_timeofday = TimeOfDayOK();
   const bool sell_timeofday = buy_timeofday;
   
   const bool buy_ema_slope = EMASlope(1, fast, slow, close_price);
   const bool sell_ema_slope = EMASlope(-1, fast, slow, close_price);
   
   const bool buy_prev_strength = PreviousCandleStrength();
   const bool sell_prev_strength = buy_prev_strength;
   
   double m5_highest = 0.0, m5_lowest = 0.0;
   const bool buy_m5_confirm = M5BreakoutConfirmation(1, m5_highest, m5_lowest);
   const bool sell_m5_confirm = M5BreakoutConfirmation(-1, m5_highest, m5_lowest);
   
   double stoch_k = 0.0;
   const bool buy_stochastic = StochasticSignal(1, stoch_k);
   const bool sell_stochastic = StochasticSignal(-1, stoch_k);
   
   const bool buy_tickvol = TickVolumeConfirmation();
   const bool sell_tickvol = buy_tickvol;

   // Bonus S&R factor: order block retest (does not count toward 12/12 threshold)
   const bool buy_sr  = OrderBlockSignal(1);
   const bool sell_sr = OrderBlockSignal(-1);

   factor_buy_h1 = buy_h1;
   factor_sell_h1 = sell_h1;
   factor_buy_h4 = buy_h4;
   factor_sell_h4 = sell_h4;
   factor_buy_breakout = buy_breakout;
   factor_sell_breakout = sell_breakout;
   factor_buy_momentum = buy_momentum;
   factor_sell_momentum = sell_momentum;
   factor_buy_strength = buy_strength;
   factor_sell_strength = sell_strength;
   factor_buy_volatility = buy_volatility;
   factor_sell_volatility = sell_volatility;
   factor_buy_timeofday = buy_timeofday;
   factor_sell_timeofday = sell_timeofday;
   factor_buy_ema_slope = buy_ema_slope;
   factor_sell_ema_slope = sell_ema_slope;
   factor_buy_prev_strength = buy_prev_strength;
   factor_sell_prev_strength = sell_prev_strength;
   factor_buy_m5_confirm = buy_m5_confirm;
   factor_sell_m5_confirm = sell_m5_confirm;
   factor_buy_stochastic = buy_stochastic;
   factor_sell_stochastic = sell_stochastic;
   factor_buy_tickvol = buy_tickvol;
   factor_sell_tickvol = sell_tickvol;
   factor_buy_sr  = buy_sr;
   factor_sell_sr = sell_sr;

   buy_checks = (int)buy_h1 + (int)buy_h4 + (int)buy_breakout +
                (int)buy_momentum + (int)buy_strength + (int)buy_volatility +
                (int)buy_timeofday + (int)buy_ema_slope + (int)buy_prev_strength +
                (int)buy_m5_confirm + (int)buy_stochastic + (int)buy_tickvol;
   sell_checks = (int)sell_h1 + (int)sell_h4 + (int)sell_breakout +
                 (int)sell_momentum + (int)sell_strength + (int)sell_volatility +
                 (int)sell_timeofday + (int)sell_ema_slope + (int)sell_prev_strength +
                 (int)sell_m5_confirm + (int)sell_stochastic + (int)sell_tickvol;
   if(buy_h1 && buy_h4)
      current_trend = "BUY";
   else if(sell_h1 && sell_h4)
      current_trend = "SELL";

   // Append S&R bonus to detail (does not affect 12/12 threshold)
   const string sr_suffix = buy_sr ? " | OB BUY" : sell_sr ? " | OB SELL" : "";
   detail = StringFormat("BUY %d/12 | SELL %d/12 | RSI %.1f | ADX %.1f | ATR %.2f",
                         buy_checks, sell_checks, rsi, adx, atr) + sr_suffix;
   if(buy_checks == 12)
      return 1;
   if(sell_checks == 12)
      return -1;
   return 0;
}

int ShadowCandidateDirection(const int buy_checks, const int sell_checks)
{
   const bool buy_core =
      factor_buy_h1 && factor_buy_h4 && factor_buy_momentum &&
      factor_buy_strength && factor_buy_timeofday && factor_buy_ema_slope &&
      (factor_buy_breakout || factor_buy_m5_confirm);
   const bool sell_core =
      factor_sell_h1 && factor_sell_h4 && factor_sell_momentum &&
      factor_sell_strength && factor_sell_timeofday && factor_sell_ema_slope &&
      (factor_sell_breakout || factor_sell_m5_confirm);

   if(buy_core && buy_checks >= InpShadowCandidateChecks &&
      buy_checks > sell_checks)
      return 1;
   if(sell_core && sell_checks >= InpShadowCandidateChecks &&
      sell_checks > buy_checks)
      return -1;
   return 0;
}

void PlaceOrder(const int direction, const double atr)
{
   string reason = "";
   if(!ExecutionAllowed(reason))
   {
      status_text = reason;
      Print("Signal blocked: ", reason);
      if(InpEnableRiskAlerts)
         QueueAlert("RISK", active_symbol + " confirmed signal blocked | " + reason);
      return;
   }

   MqlTick tick;
   if(!SymbolInfoTick(active_symbol, tick))
   {
      status_text = "No current tick";
      return;
   }
   const datetime server_time = TimeTradeServer();
   if(tick.time <= 0 || server_time - tick.time > InpMaxTickAgeSeconds)
   {
      status_text = "Stale market price blocked";
      Print(status_text);
      if(InpEnableRiskAlerts)
         QueueAlert("RISK", active_symbol + " | " + status_text);
      return;
   }

   const double point = SymbolInfoDouble(active_symbol, SYMBOL_POINT);
   const double spread_points = (tick.ask - tick.bid) / point;
   const double spread_atr_pct = (tick.ask - tick.bid) / atr * 100.0;
   if(spread_points > InpMaxSpreadPoints ||
      spread_atr_pct > InpMaxSpreadATRPercent)
   {
      status_text = StringFormat("Spread blocked: %.0f points", spread_points);
      Print(status_text);
      if(InpEnableRiskAlerts)
         QueueAlert("RISK", active_symbol + " | " + status_text);
      return;
   }

   const double entry = direction > 0 ? tick.ask : tick.bid;
   double stop = direction > 0 ? entry - atr * InpStopATR
                               : entry + atr * InpStopATR;
   double target = direction > 0 ? entry + atr * InpTargetATR
                                 : entry - atr * InpTargetATR;

   const double minimum_distance =
      (double)SymbolInfoInteger(active_symbol, SYMBOL_TRADE_STOPS_LEVEL) * point;
   if(direction > 0)
   {
      stop = MathMin(stop, tick.bid - minimum_distance);
      target = MathMax(target, tick.ask + minimum_distance);
   }
   else
   {
      stop = MathMax(stop, tick.ask + minimum_distance);
      target = MathMin(target, tick.bid - minimum_distance);
   }
   stop = NormalizePrice(stop);
   target = NormalizePrice(target);

   const ENUM_ORDER_TYPE type = direction > 0 ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   const double volume = RiskVolume(type, entry, stop);
   if(volume <= 0.0)
   {
      status_text = "Calculated volume is below broker minimum";
      Print(status_text);
      if(InpEnableRiskAlerts)
         QueueAlert("RISK", active_symbol + " | " + status_text);
      return;
   }

   double required_margin = 0.0;
   if(!OrderCalcMargin(type, active_symbol, volume, entry, required_margin))
   {
      status_text = "Unable to calculate required margin";
      Print(status_text);
      if(InpEnableRiskAlerts)
         QueueAlert("RISK", active_symbol + " | " + status_text);
      return;
   }
   const double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   const double free_margin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   if(required_margin > equity * InpMaxMarginUsePct / 100.0)
   {
      status_text = "Projected margin exceeds configured limit";
      Print(status_text);
      if(InpEnableRiskAlerts)
         QueueAlert("RISK", active_symbol + " | " + status_text);
      return;
   }
   if(free_margin < required_margin ||
      equity <= 0.0 ||
      (free_margin - required_margin) / equity * 100.0 <
       InpMinimumFreeMarginPct)
   {
      status_text = "Insufficient free-margin safety buffer";
      Print(status_text);
      if(InpEnableRiskAlerts)
         QueueAlert("RISK", active_symbol + " | " + status_text);
      return;
   }

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpDeviationPoints);
   trade.SetTypeFillingBySymbol(active_symbol);
   const bool sent = direction > 0
      ? trade.Buy(volume, active_symbol, 0.0, stop, target, "ExnessGoldGuard")
      : trade.Sell(volume, active_symbol, 0.0, stop, target, "ExnessGoldGuard");

   const uint retcode = trade.ResultRetcode();
   const bool executed = sent &&
      (retcode == TRADE_RETCODE_DONE ||
       retcode == TRADE_RETCODE_DONE_PARTIAL);
   if(!executed)
   {
      status_text = StringFormat("Order failed: %u %s",
                                 retcode,
                                 trade.ResultRetcodeDescription());
      Print(status_text);
      if(InpEnableRiskAlerts)
         QueueAlert("RISK", active_symbol + " | " + status_text);
      return;
   }
   double actual_entry = trade.ResultPrice();
   if(actual_entry <= 0.0 && PositionSelect(active_symbol))
      actual_entry = PositionGetDouble(POSITION_PRICE_OPEN);
   if(actual_entry > 0.0 && point > 0.0)
   {
      execution_slippage_last = MathAbs(actual_entry - entry) / point;
      execution_fills++;
      execution_slippage_total += execution_slippage_last;
      execution_slippage_max = MathMax(execution_slippage_max,
                                       execution_slippage_last);
      SaveExecutionStats();
      JournalActivity("EXECUTION",
         StringFormat("requested %.3f | filled %.3f | slippage %.1f points",
                      entry, actual_entry, execution_slippage_last));
   }
   bool protection_ok = PositionSelect(active_symbol) &&
      (ulong)PositionGetInteger(POSITION_MAGIC) == InpMagicNumber &&
      PositionGetDouble(POSITION_SL) > 0.0 &&
      PositionGetDouble(POSITION_TP) > 0.0;
   if(!protection_ok && PositionSelect(active_symbol) &&
      (ulong)PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
   {
      trade.PositionModify(active_symbol, stop, target);
      protection_ok = PositionSelect(active_symbol) &&
         PositionGetDouble(POSITION_SL) > 0.0 &&
         PositionGetDouble(POSITION_TP) > 0.0;
   }
   if(!protection_ok)
   {
      const bool position_found = PositionSelect(active_symbol) &&
         (ulong)PositionGetInteger(POSITION_MAGIC) == InpMagicNumber;
      const bool emergency_closed =
         position_found && trade.PositionClose(active_symbol,
                                                InpDeviationPoints);
      status_text = emergency_closed
         ? "CRITICAL: protection failed; position emergency-closed"
         : "CRITICAL: protection verification failed; inspect immediately";
      Print(status_text);
      QueueAlert("CRITICAL", active_symbol + " | " + status_text);
      return;
   }
   double position_risk = 0.0;
   if(PositionSelect(active_symbol))
   {
      double calculated = 0.0;
      if(OrderCalcProfit(type, active_symbol,
                         PositionGetDouble(POSITION_VOLUME),
                         PositionGetDouble(POSITION_PRICE_OPEN),
                         PositionGetDouble(POSITION_SL), calculated))
         position_risk = MathAbs(calculated);
   }
   if(position_risk > 0.0)
      GlobalVariableSet(StateKey("position_risk"), position_risk);
   GlobalVariableDel(StateKey("milestone_ticket"));
   GlobalVariableDel(StateKey("milestone_r"));
   tracked_position_ticket = 0;
   notified_profit_r = 0.0;
   status_text = StringFormat("%s %.2f lots | SL %.2f | TP %.2f",
                              direction > 0 ? "BUY" : "SELL",
                              volume, stop, target);
   Print(status_text);
   JournalActivity("ORDER_SENT", status_text);
}

void UpdateChart()
{
   string mode = "TRADING ARMED";
   const bool real_account =
      (ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE) ==
      ACCOUNT_TRADE_MODE_REAL;
   if(!InpEnableTrading)
      mode = "SIGNALS ONLY";
   else if(real_account && !InpConfirmLiveAccount)
      mode = "LIVE LOCKED";
   Comment("Exness Guard v1.40\n",
           active_symbol, " | M30/H1/H4 trend breakout\n",
           "Risk: ", DoubleToString(InpRiskPercent, 2), "% | ", mode, "\n",
           status_text);
}

int OnInit()
{
   active_symbol = _Symbol;
   if((InpAllowedSymbolRoot != "XAUUSD" &&
       InpAllowedSymbolRoot != "BTCUSD") ||
      !ContainsNoCase(active_symbol, InpAllowedSymbolRoot))
   {
      Print("Attach Exness Guard to a ", InpAllowedSymbolRoot,
            " chart (broker suffixes are allowed).");
      return INIT_FAILED;
   }
   if(InpFastEMA < 2 || InpSlowEMA <= InpFastEMA ||
      InpTrendFastEMA < 2 || InpTrendSlowEMA <= InpTrendFastEMA ||
      InpBreakoutBars < 2 || InpStopATR <= 0.0 || InpTargetATR <= 0.0 ||
      InpRiskPercent <= 0.0 || InpRiskPercent > 1.0 ||
      InpDailyLossLimitPct <= 0.0 || InpMaxDrawdownPct <= 0.0 ||
      InpMaxTradesPerDay < 1 || InpMaxVolumeLots <= 0.0 ||
      InpMaxMarginUsePct <= 0.0 || InpMaxMarginUsePct > 100.0 ||
      InpMinimumFreeMarginPct < 0.0 ||
      InpMinimumFreeMarginPct >= 100.0 ||
      InpMaxTickAgeSeconds < 1 || InpDashboardRefreshSec < 1 ||
      InpDashboardCandleBars < 20 ||
      InpWhatsAppTimeoutMs < 100 ||
      InpProfitAlertFirstR <= 0.0 ||
      InpProfitAlertSecondR <= InpProfitAlertFirstR ||
      InpProfitAlertThirdR <= InpProfitAlertSecondR ||
      InpNewsAlertMinutes < 1 || InpNewsPostEventMinutes < 0 ||
      InpShadowReferenceEquity <= 0.0 ||
      InpShadowCandidateChecks < 9 || InpShadowCandidateChecks > 11 ||
      StringLen(InpJournalFileName) < 6 ||
      StringFind(InpJournalFileName, "..") >= 0 ||
      StringFind(InpJournalFileName, "\\") >= 0 ||
      StringFind(InpJournalFileName, "/") >= 0 ||
      StringLen(InpDashboardFileName) < 6 ||
      StringFind(InpDashboardFileName, "..") >= 0 ||
      StringFind(InpDashboardFileName, "\\") >= 0 ||
      StringFind(InpDashboardFileName, "/") >= 0)
      return INIT_PARAMETERS_INCORRECT;

   fast_handle = iMA(active_symbol, InpTrendTimeframe1, InpFastEMA, 0, MODE_EMA, PRICE_CLOSE);
   slow_handle = iMA(active_symbol, InpTrendTimeframe1, InpSlowEMA, 0, MODE_EMA, PRICE_CLOSE);
   trend_fast_handle = iMA(active_symbol, InpTrendTimeframe, InpTrendFastEMA, 0, MODE_EMA, PRICE_CLOSE);
   trend_slow_handle = iMA(active_symbol, InpTrendTimeframe, InpTrendSlowEMA, 0, MODE_EMA, PRICE_CLOSE);
   rsi_handle = iRSI(active_symbol, InpSignalTimeframe, InpRSIPeriod, PRICE_CLOSE);
   adx_handle = iADX(active_symbol, InpSignalTimeframe, InpADXPeriod);
   atr_handle = iATR(active_symbol, InpSignalTimeframe, InpATRPeriod);
   m5_fast_handle = iMA(active_symbol, PERIOD_M5, InpFastEMA, 0, MODE_EMA, PRICE_CLOSE);
   m5_slow_handle = iMA(active_symbol, PERIOD_M5, InpSlowEMA, 0, MODE_EMA, PRICE_CLOSE);
   stochastic_handle = iStochastic(active_symbol, InpSignalTimeframe, InpStochK, InpStochD, InpStochSlowing, MODE_SMA, STO_LOWHIGH);
   if(fast_handle == INVALID_HANDLE || slow_handle == INVALID_HANDLE ||
      trend_fast_handle == INVALID_HANDLE || trend_slow_handle == INVALID_HANDLE ||
      rsi_handle == INVALID_HANDLE || adx_handle == INVALID_HANDLE ||
      atr_handle == INVALID_HANDLE || m5_fast_handle == INVALID_HANDLE ||
      m5_slow_handle == INVALID_HANDLE || stochastic_handle == INVALID_HANDLE)
      return INIT_FAILED;

   LoadPersistentState();
   LoadShadowState();
   trade.SetAsyncMode(false);
   const datetime current_bar =
      iTime(active_symbol, InpSignalTimeframe, 0);
   if(last_bar_time <= 0)
   {
      last_bar_time = current_bar;
      SavePersistentState();
   }
   trade.SetExpertMagicNumber(InpMagicNumber);
   status_text = "Ready; waiting for a closed 30M candle";
   JournalActivity("EA_START", "Exness Guard v1.40 initialized in " +
                   DashboardMode());
   EventSetTimer(InpDashboardRefreshSec);
   if(InpExportDashboard)
   {
      ExportDashboard();
      Print("Dashboard feed: ",
            TerminalInfoString(TERMINAL_COMMONDATA_PATH),
            "\\Files\\ExnessGoldGuard\\", InpDashboardFileName);
   }
   UpdateChart();
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   SaveShadowState();
   SaveExecutionStats();
   JournalActivity("EA_STOP",
                   "EA removed or terminal stopped, reason " +
                   IntegerToString(reason));
   EventKillTimer();
   if(fast_handle != INVALID_HANDLE) IndicatorRelease(fast_handle);
   if(slow_handle != INVALID_HANDLE) IndicatorRelease(slow_handle);
   if(trend_fast_handle != INVALID_HANDLE) IndicatorRelease(trend_fast_handle);
   if(trend_slow_handle != INVALID_HANDLE) IndicatorRelease(trend_slow_handle);
   if(rsi_handle != INVALID_HANDLE) IndicatorRelease(rsi_handle);
   if(adx_handle != INVALID_HANDLE) IndicatorRelease(adx_handle);
   if(atr_handle != INVALID_HANDLE) IndicatorRelease(atr_handle);
   Comment("");
}

void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
{
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD || trans.deal == 0 ||
      !HistoryDealSelect(trans.deal) ||
      (ulong)HistoryDealGetInteger(trans.deal, DEAL_MAGIC) != InpMagicNumber)
      return;

   const string symbol = HistoryDealGetString(trans.deal, DEAL_SYMBOL);
   const ENUM_DEAL_ENTRY entry =
      (ENUM_DEAL_ENTRY)HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
   const ENUM_DEAL_TYPE type =
      (ENUM_DEAL_TYPE)HistoryDealGetInteger(trans.deal, DEAL_TYPE);
   const ENUM_DEAL_REASON deal_reason =
      (ENUM_DEAL_REASON)HistoryDealGetInteger(trans.deal, DEAL_REASON);
   const double price = HistoryDealGetDouble(trans.deal, DEAL_PRICE);
   const double volume = HistoryDealGetDouble(trans.deal, DEAL_VOLUME);
   const double pnl = HistoryDealGetDouble(trans.deal, DEAL_PROFIT) +
                      HistoryDealGetDouble(trans.deal, DEAL_COMMISSION) +
                      HistoryDealGetDouble(trans.deal, DEAL_SWAP);

   if(entry == DEAL_ENTRY_IN)
   {
      const string side = type == DEAL_TYPE_BUY ? "BUY" : "SELL";
      const string fill_message =
         StringFormat("%s %s %.2f lots filled at %s",
                      symbol, side, volume,
                      DoubleToString(price,
                         (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)));
      JournalActivity("FILL", fill_message);
      if(InpEnablePositionAlerts)
         QueueAlert("FILL", fill_message);
   }
   else if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
   {
      const double original_risk =
         GlobalVariableCheck(StateKey("position_risk"))
         ? GlobalVariableGet(StateKey("position_risk")) : 0.0;
      const double result_r = original_risk > 0.0 ? pnl / original_risk : 0.0;
      const string exit_message =
         StringFormat("%s closed | P/L %.2f | %.2fR | %s",
                      symbol, pnl, result_r, EnumToString(deal_reason));
      JournalActivity("EXIT", exit_message);
      if(InpEnablePositionAlerts)
         QueueAlert("EXIT", exit_message);
      GlobalVariableDel(StateKey("position_risk"));
      GlobalVariableDel(StateKey("milestone_ticket"));
      GlobalVariableDel(StateKey("milestone_r"));
      tracked_position_ticket = 0;
      notified_profit_r = 0.0;
   }
}

void OnTimer()
{
   UpdateNewsGuard();
   MonitorPositionMilestones();
   SendQueuedAlerts();
   ExportDashboard();
   UpdateChart();
}

void OnTick()
{
   // Belt-and-braces fallback: normally OnTimer exports every two seconds. If
   // timer delivery is interrupted but ticks still arrive, restore the feed.
   if(InpExportDashboard &&
      (last_dashboard_export == 0 ||
       TimeLocal() - last_dashboard_export > InpDashboardRefreshSec * 2))
      ExportDashboard();

   RefreshPersistentRiskState();
   UpdateShadowTrade();
   const datetime current_bar = iTime(active_symbol, InpSignalTimeframe, 0);
   if(current_bar <= 0 || current_bar == last_bar_time)
   {
      UpdateChart();
      return;
   }
   last_bar_time = current_bar;
   SavePersistentState(); // Mark first so a restart cannot duplicate this bar.

   double atr = 0.0;
   string detail = "";
   int buy_checks = 0;
   int sell_checks = 0;
   string current_trend = "WAIT";
   const string previous_trend = trend_bias;
   const int direction = Signal(atr, detail, buy_checks, sell_checks,
                                current_trend);
   const int shadow_candidate = direction == 0
      ? ShadowCandidateDirection(buy_checks, sell_checks) : 0;
   signal_buy_checks = buy_checks;
   signal_sell_checks = sell_checks;
   trend_previous_bias = previous_trend;
   trend_reversal = previous_trend != "WAIT" && current_trend != "WAIT" &&
                    current_trend != previous_trend;
   trend_bias = current_trend;
   trend_exit_warning = TrendExitWarning(buy_checks, sell_checks, current_trend,
                                         trend_exit_reason, trend_exit_state);
   signal_detail = detail;
   shadow_candidate_qualified = shadow_candidate != 0;
   shadow_candidate_side = shadow_candidate > 0 ? "BUY" :
                           shadow_candidate < 0 ? "SELL" : "NONE";
   JournalActivity("M30_EVALUATION", detail);
   if(InpEnableTrendAlerts && current_trend != "WAIT" &&
      current_trend != previous_trend)
      QueueAlert("TREND",
         StringFormat("%s 30M/H1/H4 trend changed to %s | %s",
                      active_symbol, current_trend, detail));
   if(direction == 0)
   {
      signal_side = "WAIT";
      status_text = "WAIT | " + detail;
      const int best_checks = MathMax(buy_checks, sell_checks);
      if(InpEnableNearSignalAlerts && best_checks >= 9)
      {
         const string near_side = buy_checks >= sell_checks ? "BUY" : "SELL";
         QueueAlert("WATCH",
            StringFormat("%s WATCH | Trend: %s | %s %d/12 | %s",
                         active_symbol, current_trend, near_side, best_checks, detail));
      }
      if(shadow_candidate != 0 && InpEnableShadowTrading && !shadow_open)
      {
         string candidate_reason = "";
         if(ExecutionAllowed(candidate_reason))
         {
            JournalActivity("SHADOW_CANDIDATE",
               StringFormat("%s %d/12 core-qualified | %s",
                            shadow_candidate > 0 ? "BUY" : "SELL",
                            shadow_candidate > 0 ? buy_checks : sell_checks,
                            detail));
            StartShadowTrade(shadow_candidate, atr);
         }
         else
         {
            JournalActivity("SHADOW_CANDIDATE_BLOCKED",
               StringFormat("%s | %s", detail, candidate_reason));
         }
      }
   }
   else
   {
      signal_side = direction > 0 ? "BUY" : "SELL";
      status_text = (direction > 0 ? "BUY signal | " : "SELL signal | ") + detail;
      QueueAlert("TRADE",
         StringFormat("%s TRADE | Trend: %s | %s 12/12 | %s",
                      active_symbol, current_trend, signal_side, detail));
      if(!InpEnableTrading)
         StartShadowTrade(direction, atr);
      else
         PlaceOrder(direction, atr);
   }
   if(trend_exit_warning)
   {
      const string warning_message = StringFormat("%s EXIT %s | %s",
                                                  active_symbol,
                                                  trend_exit_state,
                                                  trend_exit_reason);
      status_text = warning_message;
      if(trend_exit_state == "NOW")
         QueueAlert("RISK", warning_message);
   }
   SendQueuedAlerts();
   UpdateChart();
}
