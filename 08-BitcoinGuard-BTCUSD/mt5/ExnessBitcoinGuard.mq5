//+------------------------------------------------------------------+
//|                                          ExnessBitcoinGuard.mq5  |
//|                                  Copyright 2026, Algo Trading    |
//|                                             https://localhost    |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Algo Trading"
#property link      "https://localhost"
#property version   "1.00"
#property strict

// Include trade library
#include <Trade\Trade.mqh>
CTrade trade;

// Inputs
input group "Signal model"
input string          InpAllowedSymbolRoot = "BTCUSD";
input ENUM_TIMEFRAMES InpSignalTimeframe   = PERIOD_M30;
input ENUM_TIMEFRAMES InpTrendTimeframe    = PERIOD_H4;
input ENUM_TIMEFRAMES InpTrendTimeframe1   = PERIOD_H1;
input int             InpFastEMA           = 21;
input int             InpSlowEMA           = 55;
input int             InpTrendFastEMA      = 50;
input int             InpTrendSlowEMA      = 200;
input int             InpRSIPeriod         = 14;
input int             InpADXPeriod         = 14;
input int             InpATRPeriod         = 14;
input int             InpBreakoutBars      = 24;
input double          InpMinimumADX        = 25.0;
input double          InpMinimumATRPercent = 0.10;
input double          InpBuyRSI            = 60.0;
input double          InpSellRSI           = 40.0;
input double          InpStopATR           = 2.0;
input double          InpTargetATR         = 4.0;

input group "Signal accuracy filters"
input double          InpATRPercentile       = 60.0;
input int             InpBlockStartHour      = 23; // Rollover hour
input int             InpBlockEndHour        = 0;
input double          InpEMASlopeMinPercent  = 0.1;
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
input int             InpMaxTradesPerDay      = 3; // Stricter for BTC
input double          InpMaxVolumeLots        = 2.00;
input double          InpMaxMarginUsePct      = 5.00;
input double          InpMinimumFreeMarginPct = 80.0;
input int             InpMaxSpreadPoints      = 5000; // Optimized for BTCUSDm
input double          InpMaxSpreadATRPercent  = 15.0;
input int             InpDeviationPoints      = 50;
input int             InpMaxTickAgeSeconds    = 15;
input bool            InpAvoidRolloverHour    = true;
input int             InpRolloverHourServer   = 23;

input group "Execution lock"
input bool            InpEnableTrading        = false;
input bool            InpConfirmLiveAccount   = false;
input long            InpAuthorizedAccount    = 0;
input string          InpLiveConfirmation     = "";
input bool            InpRequireExnessServer  = true;

// Global variables
string   active_symbol = "";
int      fast_handle, slow_handle;
int      trend_fast_handle, trend_slow_handle;
int      rsi_handle, adx_handle, atr_handle;
int      stoch_handle;
int      m5_fast_handle, m5_slow_handle;
datetime last_bar_time = 0;
double   day_start_equity = 0.0;
double   equity_peak = 0.0;
int      trades_today = 0;
datetime last_news_check = 0;
bool     news_blocked = false;
string   news_status = "CLEAR";

// Function declarations
int OnInit();
void OnDeinit(const int reason);
void OnTick();
void OnTimer();
bool ReadValue(const int handle, const int buffer, const int shift, double &value);
double NormalizePrice(const double price);
double RiskVolume(const ENUM_ORDER_TYPE type, const double entry, const double stop);
bool ExecutionAllowed(string &reason);
int Signal(double &atr, string &detail, int &buy_checks, int &sell_checks, string &current_trend);
void PlaceOrder(const int direction, const double atr);

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   active_symbol = _Symbol;
   if(!StringFind(active_symbol, InpAllowedSymbolRoot) >= 0)
   {
      Print("Attach Exness Bitcoin Guard to a ", InpAllowedSymbolRoot, " chart (broker suffixes are allowed).");
      return INIT_FAILED;
   }

   // Initialize indicator handles
   fast_handle = iMA(active_symbol, InpTrendTimeframe1, InpFastEMA, 0, MODE_EMA, PRICE_CLOSE);
   slow_handle = iMA(active_symbol, InpTrendTimeframe1, InpSlowEMA, 0, MODE_EMA, PRICE_CLOSE);
   trend_fast_handle = iMA(active_symbol, InpTrendTimeframe, InpTrendFastEMA, 0, MODE_EMA, PRICE_CLOSE);
   trend_slow_handle = iMA(active_symbol, InpTrendTimeframe, InpTrendSlowEMA, 0, MODE_EMA, PRICE_CLOSE);
   rsi_handle = iRSI(active_symbol, InpSignalTimeframe, InpRSIPeriod, PRICE_CLOSE);
   adx_handle = iADX(active_symbol, InpSignalTimeframe, InpADXPeriod);
   atr_handle = iATR(active_symbol, InpSignalTimeframe, InpATRPeriod);
   m5_fast_handle = iMA(active_symbol, PERIOD_M5, InpFastEMA, 0, MODE_EMA, PRICE_CLOSE);
   m5_slow_handle = iMA(active_symbol, PERIOD_M5, InpSlowEMA, 0, MODE_EMA, PRICE_CLOSE);
   stoch_handle = iStochastic(active_symbol, InpSignalTimeframe, InpStochK, InpStochD, InpStochSlowing, MODE_SMA, STO_LOWHIGH);

   if(fast_handle == INVALID_HANDLE || slow_handle == INVALID_HANDLE ||
      trend_fast_handle == INVALID_HANDLE || trend_slow_handle == INVALID_HANDLE ||
      rsi_handle == INVALID_HANDLE || adx_handle == INVALID_HANDLE ||
      atr_handle == INVALID_HANDLE || m5_fast_handle == INVALID_HANDLE ||
      m5_slow_handle == INVALID_HANDLE || stoch_handle == INVALID_HANDLE)
   {
      Print("Failed to initialize indicator handles.");
      return INIT_FAILED;
   }

   // Set trade parameters
   trade.SetExpertMagicNumber(26070108); // Unique magic number for Project 08
   trade.SetAsyncMode(false);

   // Initialize baseline equity
   day_start_equity = AccountInfoDouble(ACCOUNT_EQUITY);
   equity_peak = day_start_equity;

   EventSetTimer(2); // Timer for dashboard updates
   Print("Exness Bitcoin Guard initialized successfully.");
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   IndicatorRelease(fast_handle);
   IndicatorRelease(slow_handle);
   IndicatorRelease(trend_fast_handle);
   IndicatorRelease(trend_slow_handle);
   IndicatorRelease(rsi_handle);
   IndicatorRelease(adx_handle);
   IndicatorRelease(atr_handle);
   IndicatorRelease(m5_fast_handle);
   IndicatorRelease(m5_slow_handle);
   IndicatorRelease(stoch_handle);
   Print("Exness Bitcoin Guard deinitialized.");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   RefreshPersistentRiskState();
   
   const datetime current_bar = iTime(active_symbol, InpSignalTimeframe, 0);
   if(current_bar <= 0 || current_bar == last_bar_time)
   {
      return;
   }
   last_bar_time = current_bar;

   double atr = 0.0;
   string detail = "";
   int buy_checks = 0;
   int sell_checks = 0;
   string current_trend = "WAIT";
   
   const int direction = Signal(atr, detail, buy_checks, sell_checks, current_trend);
   
   if(direction == 0)
   {
      Print("BTC Signal: WAIT | ", detail);
   }
   else
   {
      string signal_side = direction > 0 ? "BUY" : "SELL";
      Print("BTC Signal: ", signal_side, " | 12/12 Aligned | ", detail);
      
      if(InpEnableTrading)
      {
         PlaceOrder(direction, atr);
      }
      else
      {
         Print("Trading is disabled. Signals-only mode.");
      }
   }
}

//+------------------------------------------------------------------+
//| Timer function                                                   |
//+------------------------------------------------------------------+
void OnTimer()
{
   // Export dashboard or update state
   RefreshPersistentRiskState();
}

//+------------------------------------------------------------------+
//| Read indicator buffer value                                      |
//+------------------------------------------------------------------+
bool ReadValue(const int handle, const int buffer, const int shift, double &value)
{
   double temp[1];
   if(CopyBuffer(handle, buffer, shift, 1, temp) < 1)
   {
      return false;
   }
   value = temp[0];
   return true;
}

//+------------------------------------------------------------------+
//| Normalize price to symbol digits                                 |
//+------------------------------------------------------------------+
double NormalizePrice(const double price)
{
   const double tick_size = SymbolInfoDouble(active_symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tick_size <= 0.0)
      return price;
   return MathRound(price / tick_size) * tick_size;
}

//+------------------------------------------------------------------+
//| Get volume digits based on step                                  |
//+------------------------------------------------------------------+
int VolumeDigits(const double step)
{
   if(step >= 1.0) return 0;
   if(step >= 0.1) return 1;
   if(step >= 0.01) return 2;
   return 3;
}

//+------------------------------------------------------------------+
//| Calculate risk-adjusted volume                                   |
//+------------------------------------------------------------------+
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

//+------------------------------------------------------------------+
//| Case-insensitive string contains check                           |
//+------------------------------------------------------------------+
bool ContainsNoCase(string text, string fragment)
{
   string t = text;
   string f = fragment;
   StringToUpper(t);
   StringToUpper(f);
   return (StringFind(t, f) >= 0);
}

//+------------------------------------------------------------------+
//| Check if execution is allowed based on risk controls             |
//+------------------------------------------------------------------+
bool ExecutionAllowed(string &reason)
{
   if(!InpEnableTrading)
   {
      reason = "Signals only: EnableTrading is OFF";
      return false;
   }
   
   const ENUM_ACCOUNT_TRADE_MODE mode = (ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE);
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
      reason = "A Bitcoin Guard family position is already open";
      return false;
   }
   
   double today_result = 0.0;
   int today_entries = 0;
   DailyStats(today_result, today_entries);
   if(today_entries >= InpMaxTradesPerDay)
   {
      reason = "Daily trade limit reached";
      return false;
   }
   
   const double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   const double daily_equity_result = equity - day_start_equity;
   if(daily_equity_result <= -(day_start_equity * InpDailyLossLimitPct / 100.0))
   {
      reason = "Daily equity-loss limit reached";
      return false;
   }
   
   if(equity_peak > 0.0 && (equity_peak - equity) / equity_peak * 100.0 >= InpMaxDrawdownPct)
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
   
   if(news_blocked)
   {
      reason = "USD/BTC high-impact news window blocked";
      return false;
   }
   
   return true;
}

//+------------------------------------------------------------------+
//| Calculate daily trading statistics                               |
//+------------------------------------------------------------------+
void DailyStats(double &net_result, int &entries)
{
   net_result = 0.0;
   entries = trades_today;
}

//+------------------------------------------------------------------+
//| Refresh persistent risk state (equity peak, daily baseline)      |
//+------------------------------------------------------------------+
void RefreshPersistentRiskState()
{
   const double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   if(equity > equity_peak)
   {
      equity_peak = equity;
   }
   
   MqlDateTime now;
   TimeToStruct(TimeTradeServer(), now);
   if(now.hour == 0 && now.min == 0 && now.sec < 10)
   {
      day_start_equity = equity;
      trades_today = 0;
   }
}

//+------------------------------------------------------------------+
//| Calculate 12-factor signal alignment                             |
//+------------------------------------------------------------------+
int Signal(double &atr, string &detail, int &buy_checks, int &sell_checks, string &current_trend)
{
   buy_checks = 0;
   sell_checks = 0;
   current_trend = "WAIT";
   
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
   double highest, lowest;
   if(close_price <= 0.0 || atr <= 0.0 || !BreakoutLevels(highest, lowest))
   {
      detail = "Waiting for candle history";
      return 0;
   }
   
   const double previous_close = iClose(active_symbol, InpSignalTimeframe, 2);
   const bool atr_ok = atr >= close_price * InpMinimumATRPercent / 100.0;
   
   // 1. H1 Trend
   const bool buy_h1 = fast > slow && fast > fast_previous;
   const bool sell_h1 = fast < slow && fast < fast_previous;
   
   // 2. H4 Trend
   const bool buy_h4 = trend_fast > trend_slow;
   const bool sell_h4 = trend_fast < trend_slow;
   
   // 3. Breakout
   const bool buy_breakout = close_price > highest;
   const bool sell_breakout = close_price < lowest;
   
   // 4. RSI Momentum
   const bool buy_momentum = rsi >= InpBuyRSI && rsi < 75.0;
   const bool sell_momentum = rsi <= InpSellRSI && rsi > 25.0;
   
   // 5. ADX Strength
   const bool buy_strength = adx >= InpMinimumADX && plus_di > minus_di && atr_ok;
   const bool sell_strength = adx >= InpMinimumADX && minus_di > plus_di && atr_ok;
   
   // 6. Volatility Percentile
   double atr_percentile = 0.0;
   const bool buy_volatility = VolatilityPercentile(atr, atr_percentile);
   const bool sell_volatility = buy_volatility;
   
   // 7. Time of Day
   const bool buy_timeofday = TimeOfDayOK();
   const bool sell_timeofday = buy_timeofday;
   
   // 8. EMA Slope
   const bool buy_ema_slope = EMASlope(1, fast, slow, close_price);
   const bool sell_ema_slope = EMASlope(-1, fast, slow, close_price);
   
   // 9. Previous Candle Strength
   const bool buy_prev_strength = PreviousCandleStrength();
   const bool sell_prev_strength = buy_prev_strength;
   
   // 10. M5 Breakout Confirmation
   double m5_highest = 0.0, m5_lowest = 0.0;
   const bool buy_m5_confirm = M5BreakoutConfirmation(1, m5_highest, m5_lowest);
   const bool sell_m5_confirm = M5BreakoutConfirmation(-1, m5_highest, m5_lowest);
   
   // 11. Stochastic Extremes
   double stoch_k = 0.0;
   const bool buy_stochastic = StochasticSignal(1, stoch_k);
   const bool sell_stochastic = StochasticSignal(-1, stoch_k);
   
   // 12. Tick Volume Confirmation
   const bool buy_tickvol = TickVolumeConfirmation();
   const bool sell_tickvol = buy_tickvol;
   
   // Aggregate checks
   buy_checks = (int)buy_h1 + (int)buy_h4 + (int)buy_breakout + (int)buy_momentum + (int)buy_strength +
                (int)buy_volatility + (int)buy_timeofday + (int)buy_ema_slope + (int)buy_prev_strength +
                (int)buy_m5_confirm + (int)buy_stochastic + (int)buy_tickvol;
                
   sell_checks = (int)sell_h1 + (int)sell_h4 + (int)sell_breakout + (int)sell_momentum + (int)sell_strength +
                 (int)sell_volatility + (int)sell_timeofday + (int)sell_ema_slope + (int)sell_prev_strength +
                 (int)sell_m5_confirm + (int)sell_stochastic + (int)sell_tickvol;
                 
   if(buy_h1 && buy_h4)
      current_trend = "BUY";
   else if(sell_h1 && sell_h4)
      current_trend = "SELL";
      
   detail = StringFormat("BUY %d/12 | SELL %d/12 | RSI %.1f | ADX %.1f | ATR %.2f", buy_checks, sell_checks, rsi, adx, atr);
   
   if(buy_checks == 12)
      return 1;
   if(sell_checks == 12)
      return -1;
      
   return 0;
}

//+------------------------------------------------------------------+
//| Calculate breakout levels based on Donchian Channel              |
//+------------------------------------------------------------------+
bool BreakoutLevels(double &highest, double &lowest)
{
   highest = -1.0;
   lowest = 1e10;
   for(int i = 1; i <= InpBreakoutBars; i++)
   {
      const double h = iHigh(active_symbol, InpSignalTimeframe, i);
      const double l = iLow(active_symbol, InpSignalTimeframe, i);
      if(h <= 0.0 || l <= 0.0)
         return false;
      if(h > highest) highest = h;
      if(l < lowest) lowest = l;
   }
   return true;
}

//+------------------------------------------------------------------+
//| Calculate ATR percentile to filter low volatility                |
//+------------------------------------------------------------------+
bool VolatilityPercentile(const double current_atr, double &atr_percentile_value)
{
   double atr_history[50];
   for(int i = 0; i < 50; i++)
   {
      double val;
      if(!ReadValue(atr_handle, 0, i + 1, val))
         return false;
      atr_history[i] = val;
   }
   
   // Sort history to find percentile
   for(int i = 0; i < 49; i++)
   {
      for(int j = i + 1; j < 50; j++)
      {
         if(atr_history[i] > atr_history[j])
         {
            double temp = atr_history[i];
            atr_history[i] = atr_history[j];
            atr_history[j] = temp;
         }
      }
   }
   
   const int index = (int)MathFloor(50.0 * InpATRPercentile / 100.0);
   atr_percentile_value = atr_history[MathMin(index, 49)];
   return current_atr >= atr_percentile_value;
}

//+------------------------------------------------------------------+
//| Check if current time is within allowed trading hours            |
//+------------------------------------------------------------------+
bool TimeOfDayOK()
{
   MqlDateTime now;
   TimeToStruct(TimeTradeServer(), now);
   if(InpBlockStartHour > InpBlockEndHour)
   {
      if(now.hour >= InpBlockStartHour || now.hour < InpBlockEndHour)
         return false;
   }
   else
   {
      if(now.hour >= InpBlockStartHour && now.hour < InpBlockEndHour)
         return false;
   }
   return true;
}

//+------------------------------------------------------------------+
//| Calculate EMA slope separation                                   |
//+------------------------------------------------------------------+
bool EMASlope(const int direction, const double fast, const double slow, const double close_price)
{
   if(slow <= 0.0) return false;
   const double separation = MathAbs(fast - slow) / slow * 100.0;
   if(separation < InpEMASlopeMinPercent)
      return false;
      
   if(direction > 0)
      return fast > slow;
   else
      return fast < slow;
}

//+------------------------------------------------------------------+
//| Check previous candle body-to-wick ratio                         |
//+------------------------------------------------------------------+
bool PreviousCandleStrength()
{
   const double open = iOpen(active_symbol, InpSignalTimeframe, 1);
   const double close = iClose(active_symbol, InpSignalTimeframe, 1);
   const double high = iHigh(active_symbol, InpSignalTimeframe, 1);
   const double low = iLow(active_symbol, InpSignalTimeframe, 1);
   
   const double range = high - low;
   if(range <= 0.0) return false;
   
   const double body = MathAbs(close - open);
   const double wicks = range - body;
   
   if(body <= 0.0) return false;
   return (wicks / body) <= InpPrevCandleWickMax;
}

//+------------------------------------------------------------------+
//| Confirm breakout on M5 timeframe                                 |
//+------------------------------------------------------------------+
bool M5BreakoutConfirmation(const int direction, double &m5_highest, double &m5_lowest)
{
   m5_highest = -1.0;
   m5_lowest = 1e10;
   for(int i = 1; i <= InpM5BreakoutBars; i++)
   {
      const double h = iHigh(active_symbol, PERIOD_M5, i);
      const double l = iLow(active_symbol, PERIOD_M5, i);
      if(h <= 0.0 || l <= 0.0)
         return false;
      if(h > m5_highest) m5_highest = h;
      if(l < m5_lowest) m5_lowest = l;
   }
   
   const double m5_close = iClose(active_symbol, PERIOD_M5, 1);
   if(direction > 0)
      return m5_close > m5_highest;
   else
      return m5_close < m5_lowest;
}

//+------------------------------------------------------------------+
//| Check Stochastic extremes                                        |
//+------------------------------------------------------------------+
bool StochasticSignal(const int direction, double &stoch_k)
{
   if(!ReadValue(stoch_handle, 0, 1, stoch_k))
      return false;
      
   if(direction > 0)
      return stoch_k > 80.0;
   else
      return stoch_k < 20.0;
}

//+------------------------------------------------------------------+
//| Confirm tick volume is above average                             |
//+------------------------------------------------------------------+
bool TickVolumeConfirmation()
{
   long current_vol = iVolume(active_symbol, InpSignalTimeframe, 1);
   long sum_vol = 0;
   for(int i = 2; i <= 21; i++)
   {
      long v = iVolume(active_symbol, InpSignalTimeframe, i);
      if(v < 0) return false;
      sum_vol += v;
   }
   const double avg_vol = (double)sum_vol / 20.0;
   if(avg_vol <= 0.0) return false;
   return (double)current_vol >= avg_vol * InpTickVolMinRatio;
}

//+------------------------------------------------------------------+
//| Place a risk-adjusted order with SL/TP                           |
//+------------------------------------------------------------------+
void PlaceOrder(const int direction, const double atr)
{
   string reason = "";
   if(!ExecutionAllowed(reason))
   {
      Print("Signal blocked: ", reason);
      return;
   }
   
   MqlTick tick;
   if(!SymbolInfoTick(active_symbol, tick))
   {
      Print("Failed to get current tick.");
      return;
   }
   
   const datetime server_time = TimeTradeServer();
   if(tick.time <= 0 || server_time - tick.time > InpMaxTickAgeSeconds)
   {
      Print("Stale market price blocked.");
      return;
   }
   
   const double point = SymbolInfoDouble(active_symbol, SYMBOL_POINT);
   const double spread_points = (tick.ask - tick.bid) / point;
   const double spread_atr_pct = (tick.ask - tick.bid) / atr * 100.0;
   
   if(spread_points > InpMaxSpreadPoints || spread_atr_pct > InpMaxSpreadATRPercent)
   {
      Print(StringFormat("Spread blocked: %.0f points (%.1f%% ATR)", spread_points, spread_atr_pct));
      return;
   }
   
   const double entry = direction > 0 ? tick.ask : tick.bid;
   double stop = direction > 0 ? entry - atr * InpStopATR : entry + atr * InpStopATR;
   double target = direction > 0 ? entry + atr * InpTargetATR : entry - atr * InpTargetATR;
   
   const double minimum_distance = (double)SymbolInfoInteger(active_symbol, SYMBOL_TRADE_STOPS_LEVEL) * point;
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
      Print("Calculated risk volume is 0.0. Order blocked.");
      return;
   }
   
   // Execute trade
   ResetLastError();
   bool success = false;
   if(direction > 0)
   {
      success = trade.Buy(volume, active_symbol, entry, stop, target, "Bitcoin Guard v1.00");
   }
   else
   {
      success = trade.Sell(volume, active_symbol, entry, stop, target, "Bitcoin Guard v1.00");
   }
   
   if(success)
   {
      Print(StringFormat("Successfully placed %s order: %.2f lots at %.2f | SL: %.2f | TP: %.2f",
                         (direction > 0 ? "BUY" : "SELL"), volume, entry, stop, target));
      trades_today++;
   }
   else
   {
      Print("Failed to place order. Error code: ", GetLastError());
   }
}

//+------------------------------------------------------------------+
//| Check if there is an open position on the active symbol          |
//+------------------------------------------------------------------+
bool HasOpenPosition()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetSymbol(i) == active_symbol)
      {
         return true;
      }
   }
   return false;
}

//+------------------------------------------------------------------+
//| Check if there is an open position with the EA's magic number    |
//+------------------------------------------------------------------+
bool HasGuardPosition()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetSymbol(i) == active_symbol)
      {
         if(PositionGetInteger(POSITION_MAGIC) == 26070108)
         {
            return true;
         }
      }
   }
   return false;
}

//+------------------------------------------------------------------+
//| Get current position side                                        |
//+------------------------------------------------------------------+
string PositionSide()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetSymbol(i) == active_symbol)
      {
         if(PositionGetInteger(POSITION_MAGIC) == 26070108)
         {
            const long type = PositionGetInteger(POSITION_TYPE);
            return type == POSITION_TYPE_BUY ? "BUY" : "SELL";
         }
      }
   }
   return "FLAT";
}
