#region Using declarations
using System;
using System.ComponentModel.DataAnnotations;
using NinjaTrader.Cbi;
using NinjaTrader.Data;
using NinjaTrader.NinjaScript;
using NinjaTrader.NinjaScript.Indicators;
#endregion

namespace NinjaTrader.NinjaScript.Strategies
{
	public class FuturesForgeMESv02 : Strategy
	{
		private const string LongSignal = "FF02_OR_Long";
		private const string ShortSignal = "FF02_OR_Short";

		private EMA fastEma;
		private EMA slowEma;
		private ATR atr;
		private TimeZoneInfo centralTimeZone;
		private DateTime tradingDate;
		private double openingRangeHigh;
		private double openingRangeLow;
		private double cumulativePriceVolume;
		private double cumulativeVolume;
		private double sessionStartProfit;
		private int completedTradesSeen;
		private int entriesToday;
		private int consecutiveLosses;
		private bool openingRangeReady;
		private bool dayHalted;
		private bool configurationWarningPrinted;

		protected override void OnStateChange()
		{
			if (State == State.SetDefaults)
			{
				Description					= "Sim101-only MES OR/VWAP experiment with frozen trend, volatility, range-quality, and breakout-candle filters.";
				Name						= "FuturesForgeMESv02";
				Calculate					= Calculate.OnBarClose;
				EntriesPerDirection			= 1;
				EntryHandling				= EntryHandling.UniqueEntries;
				IsExitOnSessionCloseStrategy	= true;
				ExitOnSessionCloseSeconds	= 30;
				IsFillLimitOnTouch			= false;
				MaximumBarsLookBack			= MaximumBarsLookBack.TwoHundredFiftySix;
				OrderFillResolution			= OrderFillResolution.Standard;
				Slippage					= 1;
				StartBehavior				= StartBehavior.WaitUntilFlat;
				TimeInForce					= TimeInForce.Day;
				TraceOrders					= false;
				RealtimeErrorHandling		= RealtimeErrorHandling.StopCancelClose;
				StopTargetHandling			= StopTargetHandling.PerEntryExecution;
				BarsRequiredToTrade			= 60;
				IsInstantiatedOnEachOptimizationIteration = true;

				StopTicks					= 20;
				TargetTicks					= 40;
				BreakoutConfirmationTicks	= 1;
				MaxTradesPerDay				= 1;
				MaxConsecutiveLosses		= 2;
				DailyLossLimit				= 250;

				UseTrendFilter				= true;
				FastEmaPeriod				= 20;
				SlowEmaPeriod				= 50;
				TrendSlopeBars				= 3;

				UseAtrFilter				= true;
				AtrPeriod					= 14;
				MinimumAtrPoints			= 1.5;
				MaximumAtrPoints			= 12.0;

				UseOpeningRangeFilter		= true;
				MinimumOpeningRangePoints	= 4.0;
				MaximumOpeningRangePoints	= 25.0;

				UseBreakoutCandleFilter		= true;
				MinimumBodyFraction			= 0.55;
				MinimumCloseLocation		= 0.75;
			}
			else if (State == State.Configure)
			{
				SetStopLoss(LongSignal, CalculationMode.Ticks, StopTicks, false);
				SetProfitTarget(LongSignal, CalculationMode.Ticks, TargetTicks);
				SetStopLoss(ShortSignal, CalculationMode.Ticks, StopTicks, false);
				SetProfitTarget(ShortSignal, CalculationMode.Ticks, TargetTicks);
			}
			else if (State == State.DataLoaded)
			{
				fastEma = EMA(FastEmaPeriod);
				slowEma = EMA(SlowEmaPeriod);
				atr = ATR(AtrPeriod);
				centralTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Central Standard Time");
				ResetTradingDay(DateTime.MinValue);
			}
			else if (State == State.Realtime)
			{
				string accountName = Account == null ? string.Empty : Account.Name;
				bool allowedSimulationAccount =
					accountName.Equals("Sim101", StringComparison.OrdinalIgnoreCase)
					|| accountName.StartsWith("Playback", StringComparison.OrdinalIgnoreCase);

				if (!allowedSimulationAccount)
				{
					Print(string.Format(
						"{0}: BLOCKED. FuturesForgeMESv02 is simulation-only; selected account was '{1}'.",
						Time[0],
						string.IsNullOrWhiteSpace(accountName) ? "unknown" : accountName));
					SetState(State.Terminated);
					return;
				}
			}
		}

		protected override void OnBarUpdate()
		{
			int minimumBars = Math.Max(BarsRequiredToTrade, SlowEmaPeriod + TrendSlopeBars);
			if (CurrentBar < minimumBars)
				return;

			if (!ValidConfiguration())
				return;

			DateTime centralTime = ConvertToCentral(Time[0]);
			if (tradingDate != centralTime.Date)
				ResetTradingDay(centralTime.Date);

			UpdateCompletedTrades();

			int time = ToTime(centralTime);
			bool regularSession = time > 83000 && time < 150000;
			bool buildingOpeningRange = time > 83000 && time <= 90000;

			if (time >= 150000)
			{
				if (Position.MarketPosition == MarketPosition.Long)
					ExitLong("FF02_RthCloseExit", LongSignal);
				else if (Position.MarketPosition == MarketPosition.Short)
					ExitShort("FF02_RthCloseExit", ShortSignal);
				return;
			}

			if (regularSession)
			{
				double barVolume = Math.Max(0, Volume[0]);
				double typicalPrice = (High[0] + Low[0] + Close[0]) / 3.0;
				cumulativePriceVolume += typicalPrice * barVolume;
				cumulativeVolume += barVolume;
			}

			if (buildingOpeningRange)
			{
				openingRangeHigh = Math.Max(openingRangeHigh, High[0]);
				openingRangeLow = Math.Min(openingRangeLow, Low[0]);
				return;
			}

			if (time > 90000 && openingRangeHigh > double.MinValue && openingRangeLow < double.MaxValue)
				openingRangeReady = true;

			double realizedToday =
				SystemPerformance.AllTrades.TradesPerformance.Currency.CumProfit - sessionStartProfit;
			double unrealized = Position.MarketPosition == MarketPosition.Flat
				? 0
				: Position.GetUnrealizedProfitLoss(PerformanceUnit.Currency, Close[0]);

			if (!dayHalted && realizedToday + unrealized <= -DailyLossLimit)
			{
				dayHalted = true;
				Print(string.Format(
					"{0}: DAILY LOSS HALT. Strategy P/L {1:C2}; limit {2:C2}.",
					centralTime,
					realizedToday + unrealized,
					-DailyLossLimit));

				if (Position.MarketPosition == MarketPosition.Long)
					ExitLong("FF02_DailyLossExit", LongSignal);
				else if (Position.MarketPosition == MarketPosition.Short)
					ExitShort("FF02_DailyLossExit", ShortSignal);
			}

			if (Position.MarketPosition != MarketPosition.Flat
				|| dayHalted
				|| !openingRangeReady
				|| cumulativeVolume <= 0
				|| entriesToday >= MaxTradesPerDay
				|| consecutiveLosses >= MaxConsecutiveLosses
				|| time <= 90000
				|| time >= 113000)
				return;

			double openingRangeWidth = openingRangeHigh - openingRangeLow;
			bool rangeQualityPass = !UseOpeningRangeFilter
				|| (openingRangeWidth >= MinimumOpeningRangePoints
					&& openingRangeWidth <= MaximumOpeningRangePoints);
			bool atrPass = !UseAtrFilter
				|| (atr[0] >= MinimumAtrPoints && atr[0] <= MaximumAtrPoints);

			if (!rangeQualityPass || !atrPass)
				return;

			double sessionVwap = cumulativePriceVolume / cumulativeVolume;
			double longTrigger = openingRangeHigh + BreakoutConfirmationTicks * TickSize;
			double shortTrigger = openingRangeLow - BreakoutConfirmationTicks * TickSize;
			double candleRange = Math.Max(TickSize, High[0] - Low[0]);
			double bodyFraction = Math.Abs(Close[0] - Open[0]) / candleRange;
			double closeLocationFromLow = (Close[0] - Low[0]) / candleRange;
			double closeLocationFromHigh = (High[0] - Close[0]) / candleRange;

			bool longTrendPass = !UseTrendFilter
				|| (Close[0] > fastEma[0]
					&& fastEma[0] > slowEma[0]
					&& fastEma[0] > fastEma[TrendSlopeBars]);
			bool shortTrendPass = !UseTrendFilter
				|| (Close[0] < fastEma[0]
					&& fastEma[0] < slowEma[0]
					&& fastEma[0] < fastEma[TrendSlopeBars]);
			bool longCandlePass = !UseBreakoutCandleFilter
				|| (Close[0] > Open[0]
					&& bodyFraction >= MinimumBodyFraction
					&& closeLocationFromLow >= MinimumCloseLocation);
			bool shortCandlePass = !UseBreakoutCandleFilter
				|| (Close[0] < Open[0]
					&& bodyFraction >= MinimumBodyFraction
					&& closeLocationFromHigh >= MinimumCloseLocation);

			bool longBreakout =
				Close[0] >= longTrigger
				&& Close[1] < longTrigger
				&& Close[0] > sessionVwap
				&& longTrendPass
				&& longCandlePass;
			bool shortBreakout =
				Close[0] <= shortTrigger
				&& Close[1] > shortTrigger
				&& Close[0] < sessionVwap
				&& shortTrendPass
				&& shortCandlePass;

			if (longBreakout)
			{
				entriesToday++;
				EnterLong(1, LongSignal);
			}
			else if (shortBreakout)
			{
				entriesToday++;
				EnterShort(1, ShortSignal);
			}
		}

		private bool ValidConfiguration()
		{
			bool isMes = Instrument != null
				&& Instrument.MasterInstrument != null
				&& Instrument.MasterInstrument.Name.Equals("MES", StringComparison.OrdinalIgnoreCase);
			bool isFiveMinute = BarsPeriod.BarsPeriodType == BarsPeriodType.Minute
				&& BarsPeriod.Value == 5;

			if (isMes && isFiveMinute)
				return true;

			if (!configurationWarningPrinted)
			{
				Print(string.Format(
					"{0}: BLOCKED. Apply FuturesForgeMESv02 only to a 5-minute MES data series.",
					Time[0]));
				configurationWarningPrinted = true;
			}
			return false;
		}

		private DateTime ConvertToCentral(DateTime platformTime)
		{
			DateTime unspecified = DateTime.SpecifyKind(platformTime, DateTimeKind.Unspecified);
			return TimeZoneInfo.ConvertTime(
				unspecified,
				Core.Globals.GeneralOptions.TimeZoneInfo,
				centralTimeZone);
		}

		private void ResetTradingDay(DateTime date)
		{
			tradingDate = date;
			openingRangeHigh = double.MinValue;
			openingRangeLow = double.MaxValue;
			cumulativePriceVolume = 0;
			cumulativeVolume = 0;
			sessionStartProfit = SystemPerformance.AllTrades.TradesPerformance.Currency.CumProfit;
			completedTradesSeen = SystemPerformance.AllTrades.Count;
			entriesToday = 0;
			consecutiveLosses = 0;
			openingRangeReady = false;
			dayHalted = false;
		}

		private void UpdateCompletedTrades()
		{
			while (completedTradesSeen < SystemPerformance.AllTrades.Count)
			{
				Trade trade = SystemPerformance.AllTrades[completedTradesSeen];
				if (trade.ProfitCurrency < 0)
					consecutiveLosses++;
				else if (trade.ProfitCurrency > 0)
					consecutiveLosses = 0;
				completedTradesSeen++;
			}
		}

		#region Properties
		[NinjaScriptProperty]
		[Range(4, 200)]
		[Display(Name = "Stop (ticks)", GroupName = "Risk", Order = 0)]
		public int StopTicks { get; set; }

		[NinjaScriptProperty]
		[Range(4, 400)]
		[Display(Name = "Target (ticks)", GroupName = "Risk", Order = 1)]
		public int TargetTicks { get; set; }

		[NinjaScriptProperty]
		[Range(0, 20)]
		[Display(Name = "Breakout confirmation (ticks)", GroupName = "Signal", Order = 2)]
		public int BreakoutConfirmationTicks { get; set; }

		[NinjaScriptProperty]
		[Range(1, 3)]
		[Display(Name = "Maximum trades per day", GroupName = "Risk", Order = 3)]
		public int MaxTradesPerDay { get; set; }

		[NinjaScriptProperty]
		[Range(1, 3)]
		[Display(Name = "Maximum consecutive losses", GroupName = "Risk", Order = 4)]
		public int MaxConsecutiveLosses { get; set; }

		[NinjaScriptProperty]
		[Range(25, 5000)]
		[Display(Name = "Daily loss limit ($)", GroupName = "Risk", Order = 5)]
		public double DailyLossLimit { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "Use EMA trend filter", GroupName = "Trend filter", Order = 10)]
		public bool UseTrendFilter { get; set; }

		[NinjaScriptProperty]
		[Range(2, 100)]
		[Display(Name = "Fast EMA", GroupName = "Trend filter", Order = 11)]
		public int FastEmaPeriod { get; set; }

		[NinjaScriptProperty]
		[Range(5, 200)]
		[Display(Name = "Slow EMA", GroupName = "Trend filter", Order = 12)]
		public int SlowEmaPeriod { get; set; }

		[NinjaScriptProperty]
		[Range(1, 20)]
		[Display(Name = "EMA slope lookback", GroupName = "Trend filter", Order = 13)]
		public int TrendSlopeBars { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "Use ATR filter", GroupName = "Volatility filter", Order = 20)]
		public bool UseAtrFilter { get; set; }

		[NinjaScriptProperty]
		[Range(2, 100)]
		[Display(Name = "ATR period", GroupName = "Volatility filter", Order = 21)]
		public int AtrPeriod { get; set; }

		[NinjaScriptProperty]
		[Range(0.25, 50)]
		[Display(Name = "Minimum ATR (points)", GroupName = "Volatility filter", Order = 22)]
		public double MinimumAtrPoints { get; set; }

		[NinjaScriptProperty]
		[Range(0.5, 100)]
		[Display(Name = "Maximum ATR (points)", GroupName = "Volatility filter", Order = 23)]
		public double MaximumAtrPoints { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "Use opening-range filter", GroupName = "Range filter", Order = 30)]
		public bool UseOpeningRangeFilter { get; set; }

		[NinjaScriptProperty]
		[Range(0.25, 100)]
		[Display(Name = "Minimum range (points)", GroupName = "Range filter", Order = 31)]
		public double MinimumOpeningRangePoints { get; set; }

		[NinjaScriptProperty]
		[Range(0.5, 200)]
		[Display(Name = "Maximum range (points)", GroupName = "Range filter", Order = 32)]
		public double MaximumOpeningRangePoints { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "Use breakout-candle filter", GroupName = "Candle filter", Order = 40)]
		public bool UseBreakoutCandleFilter { get; set; }

		[NinjaScriptProperty]
		[Range(0.1, 1.0)]
		[Display(Name = "Minimum body fraction", GroupName = "Candle filter", Order = 41)]
		public double MinimumBodyFraction { get; set; }

		[NinjaScriptProperty]
		[Range(0.5, 1.0)]
		[Display(Name = "Minimum close location", GroupName = "Candle filter", Order = 42)]
		public double MinimumCloseLocation { get; set; }
		#endregion
	}
}
