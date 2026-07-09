#region Using declarations
using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using NinjaTrader.Cbi;
using NinjaTrader.Data;
using NinjaTrader.NinjaScript;
#endregion

// FuturesForge MES research strategy.
// This namespace is required by NinjaTrader. Do not change it.
namespace NinjaTrader.NinjaScript.Strategies
{
	public class FuturesForgeMES : Strategy
	{
		private const string LongSignal = "FF_OR_Long";
		private const string ShortSignal = "FF_OR_Short";

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
				Description					= "Sim101-only MES opening-range and VWAP research strategy.";
				Name						= "FuturesForgeMES";
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
				BarsRequiredToTrade			= 20;
				IsInstantiatedOnEachOptimizationIteration = true;

				StopTicks					= 20;
				TargetTicks					= 40;
				BreakoutConfirmationTicks	= 1;
				MaxTradesPerDay				= 3;
				MaxConsecutiveLosses		= 3;
				DailyLossLimit				= 250;
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
						"{0}: BLOCKED. FuturesForgeMES is simulation-only; selected account was '{1}'.",
						Time[0],
						string.IsNullOrWhiteSpace(accountName) ? "unknown" : accountName));
					SetState(State.Terminated);
					return;
				}
			}
		}

		protected override void OnBarUpdate()
		{
			if (CurrentBar < BarsRequiredToTrade)
				return;

			if (!ValidConfiguration())
				return;

			DateTime centralTime = ConvertToCentral(Time[0]);
			if (tradingDate != centralTime.Date)
				ResetTradingDay(centralTime.Date);

			UpdateCompletedTrades();

			int time = ToTime(centralTime);
			bool regularSession = time > 83000 && time <= 150000;
			bool buildingOpeningRange = time > 83000 && time <= 90000;

			if (time >= 150000)
			{
				if (Position.MarketPosition == MarketPosition.Long)
					ExitLong("FF_RthCloseExit", LongSignal);
				else if (Position.MarketPosition == MarketPosition.Short)
					ExitShort("FF_RthCloseExit", ShortSignal);
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
					ExitLong("FF_DailyLossExit", LongSignal);
				else if (Position.MarketPosition == MarketPosition.Short)
					ExitShort("FF_DailyLossExit", ShortSignal);
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

			double sessionVwap = cumulativePriceVolume / cumulativeVolume;
			double longTrigger = openingRangeHigh + BreakoutConfirmationTicks * TickSize;
			double shortTrigger = openingRangeLow - BreakoutConfirmationTicks * TickSize;

			bool longBreakout =
				Close[0] >= longTrigger
				&& Close[1] < longTrigger
				&& Close[0] > sessionVwap;
			bool shortBreakout =
				Close[0] <= shortTrigger
				&& Close[1] > shortTrigger
				&& Close[0] < sessionVwap;

			if (longBreakout)
			{
				entriesToday++;
				EnterLong(1, LongSignal);
				Print(string.Format(
					"{0}: SIM LONG submitted. Close={1:F2}, ORH={2:F2}, VWAP={3:F2}.",
					centralTime, Close[0], openingRangeHigh, sessionVwap));
			}
			else if (shortBreakout)
			{
				entriesToday++;
				EnterShort(1, ShortSignal);
				Print(string.Format(
					"{0}: SIM SHORT submitted. Close={1:F2}, ORL={2:F2}, VWAP={3:F2}.",
					centralTime, Close[0], openingRangeLow, sessionVwap));
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
					"{0}: BLOCKED. Apply FuturesForgeMES only to a 5-minute MES data series.",
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
		#endregion
	}
}
