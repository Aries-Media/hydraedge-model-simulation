import type {
	ChallengeLog,
	SimulationTradeHistory,
	TradeLog,
} from "@/types/tradeHistory";
import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
// convenience alias
type D = Decimal;

export interface LevelRule {
	/** upper inclusive bound for which this rule applies */
	maxBalance: D; // inclusive upper bound
	/** stop‑loss distance in account currency (number) or function of balance */
	// sl: D | ((balance: D) => D); // stop-loss distance
  sl: D;
	/**
	 * take‑profit distance. When omitted the engine will derive it at run‑time
	 * as (maxBalance – currentBalance), i.e. "close the gap to the tier ceiling".
	 */
	// tp?: D | ((balance: D) => D);
  tp: D;
}

export interface BalanceDistribution {
	balance: number;
	percentage: number;
}

export interface SimulationParams {
	/** number of customers that will attempt a prop‑firm challenge */
	clientsNumber: number;
	/** trades executed per customer across all purchased challenges */
	tradesPerClient: number;

	/** broker commission paid by the company per trade (mirror leg) */
	commissionPerTrade?: D | number;
	/** starting balance of each new challenge (50 k / 100 k / 200 k …) */
	initialBalance?: D | number;
	/** distribution of initial balances across clients */
	balanceDistribution?: BalanceDistribution[];
	/** broker account seed per challenge – if omitted, scaled automatically */
	brokerStartBalance?: D | number;

	/** use custom level map (otherwise scaled defaults are used) */
	levels?: LevelRule[]; // custom tier map (Decimal)
	/** use custom real level map (otherwise scaled defaults are used) */
	realLevels?: LevelRule[]; // custom tier map (Decimal)
	/** the challenge is burned and the whole reimbursement emitted */
	burnWonChallenges?: boolean;
	/** the strategy used to calculate trade outcomes */
	tradeOutcomeStrategy?:
		| "fifty_fifty"
		| "geometric_distance"
		| "logarithmic_distance"
		| "average"
		| "burn_after_sl";

	/** Risk parameters to override defaults */
	maxLossRatio?: number;
	dailyLossRatio?: number;
	targetProfitRatio?: number;
	/** Selected strategy */
	strategy?: string;
}

export interface SimulationResult {
	id: string;
	timestamp: string;
	clientsNumber?: number; // Add this to track how many clients were in this simulation
	tradeHistory?: SimulationTradeHistory; // Add trade history for single-customer simulations

	/* core profit‑and‑loss numbers (company perspective) */
	netProfit: number; // final company cash after all trades / refunds / commissions

	/* challenge bookkeeping */
	challengesBought: number;
	challengesWon: number;
	challengesLost: number;

	/* money flowing out when a challenge is WON */
	payoutsCost: number; // scaled payout per successful challenge
	refundsCost: number; // challenge fee refund per successful challenge
	reimburseBrokerLossCost: number; // reimburse customer for company's broker losses

	/* money flowing IN when a challenge is LOST */
	extractedBrokerProfit: number; // portion of broker balance > seed withdrawn at loss
	propProfit: number;
	totalPropProfit: number;

	/* convenience aggregates */
	totalAmountSpent: number; // payoutsCost + refundsCost + reimburseBrokerLossCost + commissionCost
	totalLots: number; // total lots traded during simulation

	/* simulation settings */
	burnWonChallenges: boolean; // whether won challenges are burned
	tradeOutcomeStrategy:
		| "fifty_fifty"
		| "geometric_distance"
		| "logarithmic_distance"
		| "average"
		| "burn_after_sl"; // strategy used for trade outcomes

	/* balance distribution tracking */
	balanceDistributionUsed?: BalanceDistribution[]; // distribution that was used

	// Legacy fields for compatibility
	costOfChallenges: number;
	propWithdraw: number;
	challengeRefunds: number;
	brokerWithdraw: number;
	tradesInReal: number;
	payouts: number;
	payoutPercentage: number;
	avgProfitPerCustomer: number;
	totalPropFirmProfit: number;
	avgProfitPerTrade: number;
}

const toDec = (x: number | D): D => (x instanceof Decimal ? x : new Decimal(x));

// Default values - these will be overridden by form parameters
const REAL_PHASE_PROFIT_RATIO = toDec(1.02); // 2 % above start in real phase

const LOT_THRESHOLD_1 = toDec(1.06);
const LOT_THRESHOLD_2 = toDec(1.12);

const RATIO_MARGIN_INJECT = toDec(1.12);
const BROKER_MARGIN_FACTOR = toDec(0.45);

/* ────────── Helpers ────────── */

/*
 * Create a level‑picker function that, for a given balance, returns SL/TP.
 * If the level rule leaves TP undefined the engine will derive it as the distance
 * between current balance and the tier's maxBalance – enabling fully
 * parametric tiers without hard‑coding TP values.
 */
const makePicker = (levels: LevelRule[]) => {
	const last = levels[levels.length - 1];
	return (bal: D, scaleFactor: D) => {
		for (let lvl of levels)
			if (bal.lte(lvl.maxBalance.times(scaleFactor))) {
				const sl = lvl.sl.times(scaleFactor);
				const tp =
					lvl.tp === undefined
						? lvl.maxBalance
                .times(scaleFactor)
								.minus(bal)
								.plus(50) // dynamic TP = gap to ceiling plus 50
						: lvl.tp.times(scaleFactor);
				return { sl, tp };
			}
		/* fall back to last rule */
		const sl = last.sl.times(scaleFactor);
		const tp =
			last.tp === undefined
				? last.maxBalance.times(scaleFactor).minus(bal)
				: last.tp.times(scaleFactor);
		return { sl, tp };
	};
};


/** Hedging lot‑coefficient for the current balance (scaled variants). */
const hedgeCoeff = (bal: D, start: D, strategy?: string): D => {
	
	if (strategy === "new4") {
		// new4 strategy: different coefficients based on balance levels
		if (bal.lt(start.times(1.04))) return toDec(0.15); // balance minor than second level
		if (bal.lt(start.times(1.07))) return toDec(0.25); // balance minor than third level
		if (bal.lt(start.times(1.11))) return toDec(0.40); // balance minor than fourth level (assuming 1.18 as fourth level)
		return toDec(0.65); // balance more than fourth level
	}
	
  const ratio = bal.div(start);
	// Default strategy
	if (ratio.lt(LOT_THRESHOLD_1)) return toDec(0.15);
	if (ratio.lt(LOT_THRESHOLD_2)) return toDec(0.3);
	return toDec(0.6);
};

/** Returns "SL" or "TP" based on the specified strategy. */
const pickOutcome = (
	sl: D,
	tp: D,
	strategy:
		| "fifty_fifty"
		| "geometric_distance"
		| "logarithmic_distance"
		| "average"
		| "burn_after_sl" = "geometric_distance",
): "SL" | "TP" => {
	switch (strategy) {
		case "fifty_fifty":
			return Math.round(Math.random()) ? "SL" : "TP";

		case "geometric_distance": {
			const pSL = tp.div(sl.plus(tp)).toNumber();
			return Math.random() < pSL ? "SL" : "TP";
		}

		case "logarithmic_distance": {
			const slLog = Math.log(sl.toNumber() + 1);
			const tpLog = Math.log(tp.toNumber() + 1);
			const pSL = tpLog / (slLog + tpLog);
			return Math.random() < pSL ? "SL" : "TP";
		}

		case "average": {
			// Fifty-fifty probability
			const pSL_50 = 0.5;

			// Geometric distance probability
			const pSL_geo = tp.div(sl.plus(tp)).toNumber();

			// Average of both
			const pSL_avg = (pSL_50 + pSL_geo) / 2;
			return Math.random() < pSL_avg ? "SL" : "TP";
		}

		case "burn_after_sl": {
			// Use geometric distance logic for outcome determination
			const pSL = tp.div(sl.plus(tp)).toNumber();
			return Math.random() < pSL ? "SL" : "TP";
		}

		default:
			return Math.round(Math.random()) ? "SL" : "TP";
	}
};

/* Helper function to generate client balance assignments based on distribution */
function generateClientBalances(
	clientsNumber: number,
	distribution: BalanceDistribution[],
): number[] {
	// Validate distribution
	const totalPercentage = distribution.reduce(
		(sum, item) => sum + item.percentage,
		0,
	);
	if (Math.abs(totalPercentage - 100) > 0.01) {
		throw new Error(
			`Balance distribution percentages must sum to 100%, got ${totalPercentage}%`,
		);
	}

	const balances: number[] = [];
	let remainingClients = clientsNumber;

	// Assign clients to each balance tier
	for (let i = 0; i < distribution.length; i++) {
		const item = distribution[i];
		const clientsForThisTier =
			i === distribution.length - 1
				? remainingClients // Last tier gets all remaining clients
				: Math.round((item.percentage / 100) * clientsNumber);

		for (let j = 0; j < clientsForThisTier; j++) {
			balances.push(item.balance);
		}
		remainingClients -= clientsForThisTier;
	}

	// Shuffle the array to randomize client assignments
	for (let i = balances.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[balances[i], balances[j]] = [balances[j], balances[i]];
	}

	return balances;
}

/** Calculate SL target that would burn the challenge (exceed max drawdown) */
function calculateBurnSL(
	currentBalance: D,
	startBalance: D,
	maxLossRatio: D,
): D {
	const maxDrawdownThreshold = startBalance.times(
		toDec(1).minus(maxLossRatio),
	);
	const burnSL = currentBalance.minus(maxDrawdownThreshold).plus(100); // Add small buffer
	return burnSL.gt(0) ? burnSL : currentBalance.times(0.5); // Fallback to 50% of current balance
}

/* ────────── Core Simulation ────────── */

export function runSimulation({
	clientsNumber,
	tradesPerClient,
	commissionPerTrade = 10,
	initialBalance = 200_000,
	balanceDistribution,
	brokerStartBalance: brokerSeed,
	levels,
	realLevels,
	burnWonChallenges = true,
	tradeOutcomeStrategy = "geometric_distance",
	maxLossRatio = 0.07,
	dailyLossRatio = 0.04,
	targetProfitRatio = 0.14,
	strategy,
}: SimulationParams): SimulationResult {
	// Use form parameters or defaults
	const MAX_DRAWDOWN_RATIO = toDec(maxLossRatio);
	const SINGLE_TRADE_STOP_RATIO = toDec(dailyLossRatio);
	const PROFIT_TARGET_RATIO = toDec(targetProfitRatio);

	console.log("Using risk parameters:", {
		maxLossRatio,
		dailyLossRatio,
		targetProfitRatio,
	});

	// Handle balance distribution
	let clientBalances: number[];
	let effectiveDistribution: BalanceDistribution[] | undefined;

	if (balanceDistribution && balanceDistribution.length > 0) {
		clientBalances = generateClientBalances(clientsNumber, balanceDistribution);
		effectiveDistribution = balanceDistribution;
	} else {
		// Use single balance for all clients
		const singleBalance =
			typeof initialBalance === "number"
				? initialBalance
				: initialBalance.toNumber();
		clientBalances = Array(clientsNumber).fill(singleBalance);
	}

	// Initialize trade history tracking for single customer simulations
	const shouldTrackHistory = clientsNumber === 1;
	let tradeHistory: SimulationTradeHistory | undefined;

	if (shouldTrackHistory) {
		tradeHistory = {
			challenges: [],
			totalTrades: 0,
			clientInitialBalance: clientBalances[0],
		};
	}

	// Aggregate results across all clients - properly declare all variables
	let totalChallengesBought = 0;
	let totalChallengesWon = 0;
	let totalChallengesLost = 0;
	let totalPayoutsCost = toDec(0);
	let totalRefundsCost = toDec(0);
	let totalReimburseBrokerLossCost = toDec(0);
	let totalExtractedBrokerProfit = toDec(0);
	let totalPropProfit = toDec(0);
	let totalAmountSpent = toDec(0);
	let totalLots = toDec(0);
	let totalCommissionCost = toDec(0);
	let totalNetProfit = toDec(0); // Declare this variable properly

	// Run simulation for each client with their assigned balance
	for (let clientIndex = 0; clientIndex < clientsNumber; clientIndex++) {
		const clientInitialBalance = clientBalances[clientIndex];
		const scaleFactor = toDec(clientInitialBalance).div(200_000);

		// Scale challenge cost based on the client's initial balance
		const CHALLENGE_COST = toDec(900).times(scaleFactor);
		const TRADE_LOTS = toDec(8).times(scaleFactor);
		const START = toDec(clientInitialBalance);
		const BROKER_SEED = brokerSeed ? toDec(brokerSeed) : toDec(6_000).times(scaleFactor);
		const COMMISSION_PER_TRADE = toDec(commissionPerTrade);
		const BROKER_BONUS = BROKER_SEED.times(BROKER_MARGIN_FACTOR);
		const PAYOUT = toDec(clientInitialBalance).times(0.02);

		if (!levels || !realLevels)
			throw Error("Levels undefined cannot run simulation");
		const pickLevels = makePicker(levels);
		const pickRealLevels = makePicker(realLevels);

		// Client-specific bookkeeping
		let propProfit = toDec(0);
		let customerProfit = toDec(0);
		let extractedBrokerProfit = toDec(0);
		let commissionCost = toDec(0);
		let challengesBought = 0;
		let challengesWon = 0;
		let challengesLost = 0;
		let payoutsCost = toDec(0);
		let refundsCost = toDec(0);
		let reimburseBrokerLossCost = toDec(0);
		let clientTotalAmountSpent = toDec(0);
		let clientTotalLots = toDec(0);

		let tradesLeft = tradesPerClient;
		let propBalance = toDec(0);
		let brokerBalance = toDec(0);
		let marginMoved = false;
		let challengeOngoing = false;
		let realTrades = 0;
		let currentChallenge: ChallengeLog | undefined;
		let totalTradeNumber = 0;
		let previousTradeOutcome: "SL" | "TP" | null = null;
		let sequentialTPs = 0; // Track sequential TPs for new4 preset exception

		while (tradesLeft > 0) {
			if (!challengeOngoing) {
				/* —— new challenge purchase —— */
				challengesBought++;
				challengeOngoing = true;
				clientTotalAmountSpent = clientTotalAmountSpent.plus(CHALLENGE_COST);
				propProfit = propProfit.plus(CHALLENGE_COST); // incoming fee

				propBalance = START;
				brokerBalance = BROKER_SEED;
				marginMoved = false;
				previousTradeOutcome = null; // Reset for new challenge
				sequentialTPs = 0; // Reset sequential TP counter for new challenge

				// Initialize challenge log for single customer
				if (shouldTrackHistory && tradeHistory) {
					currentChallenge = {
						challengeNumber: challengesBought,
						startBalance: START.toNumber(),
						brokerStartBalance: BROKER_SEED.toNumber(),
						outcome: "ongoing",
						trades: [],
					};
				}
			}

			/* 1️⃣  generate trade (evaluation phase) */
			tradesLeft--;
			totalTradeNumber++;

			let { sl, tp } = pickLevels(propBalance, scaleFactor);

			// Override SL for burn_after_sl strategy when previous trade was SL
			if (
				tradeOutcomeStrategy === "burn_after_sl" &&
				previousTradeOutcome === "SL"
			) {
				sl = calculateBurnSL(propBalance, START, MAX_DRAWDOWN_RATIO);
			}

			const coeff = hedgeCoeff(propBalance, START, strategy);
			const outcome = pickOutcome(sl, tp, tradeOutcomeStrategy);

			let brokerPL = toDec(0); // signed P&L for this trade
			let singleStopHit = false;
			const balanceBefore = propBalance;
			const brokerBalanceBefore = brokerBalance;

			if (outcome === "SL") {
				propBalance = propBalance.minus(sl);
				brokerPL = sl.times(coeff);

				if (sl.gt(START.times(SINGLE_TRADE_STOP_RATIO))) singleStopHit = true;
			} else {
				// TP
				propBalance = propBalance.plus(tp);
				brokerPL = tp.times(coeff).neg();
			}

			brokerBalance = brokerBalance.plus(brokerPL);
			brokerBalance = brokerBalance.minus(COMMISSION_PER_TRADE);
			commissionCost = commissionCost.plus(COMMISSION_PER_TRADE);
			clientTotalLots = clientTotalLots.plus(TRADE_LOTS).times(coeff);

			// Track previous trade outcome and sequential TPs
			if (outcome === "TP") {
				sequentialTPs++;
			} else {
				sequentialTPs = 0; // Reset on SL
			}
			previousTradeOutcome = outcome;

			const marginMovedThisTrade =
				!marginMoved && propBalance.gte(START.times(RATIO_MARGIN_INJECT));
			if (marginMovedThisTrade) {
				brokerBalance = brokerBalance.plus(BROKER_BONUS);
				marginMoved = true;
			}

			// Log trade for single customer
			if (shouldTrackHistory && currentChallenge) {
				const tradeLog: TradeLog = {
					tradeNumber: totalTradeNumber,
					phase: "evaluation",
					balanceBefore: balanceBefore.toNumber(),
					balanceAfter: propBalance.toNumber(),
					sl: sl.toNumber(),
					tp: tp.toNumber(),
					outcome,
					brokerPL: brokerPL.toNumber(),
					brokerBalanceBefore: brokerBalanceBefore.toNumber(),
					brokerBalanceAfter: brokerBalance.toNumber(),
					commission: COMMISSION_PER_TRADE.toNumber(),
					lots: TRADE_LOTS.toNumber(),
					singleStopHit,
					marginMoved: marginMovedThisTrade,
				};
				currentChallenge.trades.push(tradeLog);
			}

			/* 2️⃣  evaluate lifetime conditions */

			const drawdownHit = propBalance.lt(
				START.times(toDec(1).minus(MAX_DRAWDOWN_RATIO)),
			);
			const profitTargetHit = propBalance.gte(
				START.times(toDec(1).plus(PROFIT_TARGET_RATIO)),
			);

			if (singleStopHit || drawdownHit) {
				/* —— Challenge LOST —— */
				challengesLost++;
				challengeOngoing = false;

				// withdraw profits above seed from broker
				if (brokerBalance.gt(BROKER_SEED)) {
					const extract = brokerBalance.minus(BROKER_SEED);
					brokerBalance = brokerBalance.minus(extract);
					customerProfit = customerProfit.plus(extract);
					extractedBrokerProfit = extractedBrokerProfit.plus(extract);
				}

				// Complete challenge log
				if (shouldTrackHistory && currentChallenge) {
					currentChallenge.outcome = "lost";
					currentChallenge.endReason = singleStopHit
						? "single_stop"
						: "max_drawdown";
					currentChallenge.finalBalance = propBalance.toNumber();
					currentChallenge.finalBrokerBalance = brokerBalance.toNumber();
					currentChallenge.extractedBrokerProfit = brokerBalance.gt(BROKER_SEED)
						? brokerBalance.minus(BROKER_SEED).toNumber()
						: 0;
					tradeHistory?.challenges.push(currentChallenge);
					currentChallenge = undefined;
				}

				continue; // jump to next iteration -> possibly new challenge
			}

			if (profitTargetHit) {
				/* —— Challenge WON —— */
				challengesWon++;

				// Special logic for new4 strategy: don't increment challengesBought after 4 sequential TPs
				const shouldIncrementChallengesBought = !(
					strategy === "new4" && sequentialTPs >= 4
				);

				if (burnWonChallenges) {
					challengeOngoing = false;

          let brokerLossReimb = toDec(0);
          if (strategy == "new4") {
            // Apply new4 preset exception: if we have 4+ sequential TPs, this challenge is not paid
            if (!shouldIncrementChallengesBought) {
              // Don't count this as a bought challenge, but still process the win
              challengesBought--; // Decrement the already incremented count from challenge start
              clientTotalAmountSpent = clientTotalAmountSpent.minus(CHALLENGE_COST);
              propProfit = propProfit.minus(CHALLENGE_COST);
            }

            const reimbursement = BROKER_SEED.plus(BROKER_SEED.div(2));
            customerProfit = customerProfit.plus(reimbursement);
            propProfit = propProfit.minus(reimbursement);

            refundsCost = refundsCost.plus(reimbursement);
          } else {
            brokerLossReimb = brokerBalance.lt(BROKER_SEED)
              ? BROKER_SEED.minus(brokerBalance)
              : toDec(0);
            const reimbursement =
            CHALLENGE_COST.plus(brokerLossReimb).plus(PAYOUT);

            customerProfit = customerProfit.plus(reimbursement);
            propProfit = propProfit.minus(reimbursement);

            refundsCost = refundsCost.plus(CHALLENGE_COST);
            // payouts are 0 if won challenges are lost
            // payoutsCost = payoutsCost.plus(PAYOUT);
            reimburseBrokerLossCost =
              reimburseBrokerLossCost.plus(brokerLossReimb);
          }
					
					// Complete challenge log
					if (shouldTrackHistory && currentChallenge) {
						currentChallenge.outcome = "won";
						currentChallenge.endReason = "profit_target";
						currentChallenge.finalBalance = propBalance.toNumber();
						currentChallenge.finalBrokerBalance = brokerBalance.toNumber();
						currentChallenge.payout = PAYOUT.toNumber();
						currentChallenge.refund = CHALLENGE_COST.toNumber();
						currentChallenge.brokerReimbursement = brokerLossReimb.toNumber();
						tradeHistory?.challenges.push(currentChallenge);
						currentChallenge = undefined;
					}

					continue;
				}

				/* ——— REAL PHASE ——— */
				propBalance = START; // reset to start
				previousTradeOutcome = null; // Reset for real phase
				sequentialTPs = 0; // Reset sequential TP counter for real phase
				while (tradesLeft > 0) {
					tradesLeft--;
					totalTradeNumber++;
					realTrades++;
					commissionCost = commissionCost.plus(COMMISSION_PER_TRADE);
					brokerBalance = brokerBalance.minus(COMMISSION_PER_TRADE);

					let { sl: slR, tp: tpR } = pickRealLevels(propBalance, scaleFactor);

					// Override SL for burn_after_sl strategy when previous trade was SL (real phase)
					if (
						tradeOutcomeStrategy === "burn_after_sl" &&
						previousTradeOutcome === "SL"
					) {
						slR = calculateBurnSL(propBalance, START, SINGLE_TRADE_STOP_RATIO);
					}

					const outcomeR = pickOutcome(slR, tpR, tradeOutcomeStrategy);

					const balanceBeforeReal = propBalance;
					const brokerBalanceBeforeReal = brokerBalance;

					if (outcomeR === "SL") {
						propBalance = propBalance.minus(slR);
						brokerPL = slR.times(0.6);
						if (slR.gt(START.times(SINGLE_TRADE_STOP_RATIO)))
							singleStopHit = true;
					} else {
						propBalance = propBalance.plus(tpR);
						brokerPL = tpR.times(0.6).neg();
					}
					brokerBalance = brokerBalance.plus(brokerPL);
					clientTotalLots = clientTotalLots.plus(TRADE_LOTS.div(2));

					// Track previous trade outcome and sequential TPs (real phase)
					if (outcomeR === "TP") {
						sequentialTPs++;
					} else {
						sequentialTPs = 0; // Reset on SL
					}
					previousTradeOutcome = outcomeR;

					// Log real phase trade
					if (shouldTrackHistory && currentChallenge) {
						const tradeLog: TradeLog = {
							tradeNumber: totalTradeNumber,
							phase: "real",
							balanceBefore: balanceBeforeReal.toNumber(),
							balanceAfter: propBalance.toNumber(),
							sl: slR.toNumber(),
							tp: tpR.toNumber(),
							outcome: outcomeR,
							brokerPL: brokerPL.toNumber(),
							brokerBalanceBefore: brokerBalanceBeforeReal.toNumber(),
							brokerBalanceAfter: brokerBalance.toNumber(),
							commission: COMMISSION_PER_TRADE.toNumber(),
							lots: TRADE_LOTS.div(2).toNumber(),
							singleStopHit,
						};
						currentChallenge.trades.push(tradeLog);
					}

					if (singleStopHit) {
						challengesLost++;
						challengeOngoing = false;
						if (brokerBalance.gt(BROKER_SEED)) {
							const extract = brokerBalance.minus(BROKER_SEED);
							brokerBalance = brokerBalance.minus(extract);
							customerProfit = customerProfit.plus(extract);
							extractedBrokerProfit = extractedBrokerProfit.plus(extract);
						}

						// Complete challenge log
						if (shouldTrackHistory && currentChallenge) {
							currentChallenge.outcome = "lost";
							currentChallenge.endReason = "single_stop";
							currentChallenge.finalBalance = propBalance.toNumber();
							currentChallenge.finalBrokerBalance = brokerBalance.toNumber();
							currentChallenge.extractedBrokerProfit = brokerBalance.gt(
								BROKER_SEED,
							)
								? brokerBalance.minus(BROKER_SEED).toNumber()
								: 0;
							tradeHistory?.challenges.push(currentChallenge);
							currentChallenge = undefined;
						}

						break;
					}

					/* profit cycle in real phase → pay scaled payout */
					if (propBalance.gte(START.times(REAL_PHASE_PROFIT_RATIO))) {
						customerProfit = customerProfit.plus(PAYOUT);
						propProfit = propProfit.minus(PAYOUT);
						payoutsCost = payoutsCost.plus(PAYOUT);
						propBalance = START;
					}
				}
			}
		}

		// Handle ongoing challenge at end of trades
		if (shouldTrackHistory && currentChallenge) {
			currentChallenge.endReason = "trades_exhausted";
			currentChallenge.finalBalance = propBalance.toNumber();
			currentChallenge.finalBrokerBalance = brokerBalance.toNumber();
			tradeHistory?.challenges.push(currentChallenge);
		}

		// Set total trades in history
		if (shouldTrackHistory && tradeHistory) {
			tradeHistory.totalTrades = totalTradeNumber;
		}

		// Aggregate client results to totals
		const clientNetProfit = customerProfit.minus(clientTotalAmountSpent);
		totalNetProfit = totalNetProfit.plus(clientNetProfit);
		totalChallengesBought += challengesBought;
		totalChallengesWon += challengesWon;
		totalChallengesLost += challengesLost;
		totalPayoutsCost = totalPayoutsCost.plus(payoutsCost);
		totalRefundsCost = totalRefundsCost.plus(refundsCost);
		totalReimburseBrokerLossCost = totalReimburseBrokerLossCost.plus(
			reimburseBrokerLossCost,
		);
		totalExtractedBrokerProfit = totalExtractedBrokerProfit.plus(
			extractedBrokerProfit,
		);
		totalPropProfit = totalPropProfit.plus(propProfit);
		totalAmountSpent = totalAmountSpent.plus(clientTotalAmountSpent);
		totalLots = totalLots.plus(clientTotalLots);
		totalCommissionCost = totalCommissionCost.plus(commissionCost);
	}

	/* ——— Final aggregation ——— */
	// Calculate averages per client for this simulation run
	const avgNetProfit = totalNetProfit.div(clientsNumber);
	const avgPropProfit = totalPropProfit.div(clientsNumber);
	const avgChallengesBought = totalChallengesBought / clientsNumber;
	const avgChallengesWon = totalChallengesWon / clientsNumber;
	const avgChallengesLost = totalChallengesLost / clientsNumber;
	const avgPayoutsCost = totalPayoutsCost.div(clientsNumber);
	const avgRefundsCost = totalRefundsCost.div(clientsNumber);
	const avgReimburseBrokerLossCost =
		totalReimburseBrokerLossCost.div(clientsNumber);
	const avgExtractedBrokerProfit =
		totalExtractedBrokerProfit.div(clientsNumber);
	const avgTotalAmountSpent = totalAmountSpent.div(clientsNumber);
	const avgTotalLots = totalLots.div(clientsNumber);

	const totalPayouts = totalPayoutsCost.div(4000).toNumber(); // Assuming base payout of 4000
	const avgPayoutBase =
		totalChallengesBought > 0
			? totalPayoutsCost.div(totalChallengesBought).toNumber()
			: 4000;
	const adjustedTotalPayouts = totalPayoutsCost.div(avgPayoutBase).toNumber();
	const totalRealTrades = totalChallengesBought; // Approximation for compatibility
	const payoutPercentage =
		totalRealTrades > 0 ? (adjustedTotalPayouts / totalRealTrades) * 100 : 0;

	return {
		id: crypto.randomUUID(),
		timestamp: new Date().toISOString(),
		clientsNumber, // Include the number of clients in this simulation
		tradeHistory, // Include trade history for single customer simulations

		// Return averages per client for this simulation run
		netProfit: avgNetProfit.toNumber(),

		challengesBought: avgChallengesBought,
		challengesWon: avgChallengesWon,
		challengesLost: avgChallengesLost,

		payoutsCost: avgPayoutsCost.toNumber(),
		refundsCost: avgRefundsCost.toNumber(),
		reimburseBrokerLossCost: avgReimburseBrokerLossCost.toNumber(),

		extractedBrokerProfit: avgExtractedBrokerProfit.toNumber(),
		propProfit: avgPropProfit.toNumber(),
		totalPropProfit: totalPropProfit.toNumber(),

		totalAmountSpent: avgTotalAmountSpent.toNumber(),
		totalLots: avgTotalLots.toNumber(),

		burnWonChallenges,
		tradeOutcomeStrategy,
		balanceDistributionUsed: effectiveDistribution,

		// Legacy compatibility fields - scaled appropriately
		costOfChallenges: avgTotalAmountSpent.toNumber(), // Average challenge costs per client
		propWithdraw: avgPayoutsCost.toNumber(),
		challengeRefunds: avgRefundsCost.toNumber(),
		brokerWithdraw: avgExtractedBrokerProfit.toNumber(),
		tradesInReal: totalRealTrades,
		payouts: adjustedTotalPayouts,
		payoutPercentage,
		avgProfitPerCustomer: avgNetProfit.toNumber(),
		totalPropFirmProfit: totalPropProfit.toNumber(),
		avgProfitPerTrade: avgNetProfit.div(tradesPerClient).toNumber(),
	};
}

/* Convenience wrapper that runs a single simulation regardless of client count. */
export function runSimulationAndDisplay(
	params: SimulationParams,
): SimulationResult {
	console.log("Running simulation:", params);
	// Always run a single simulation that aggregates all clients
	const result = runSimulation(params);
	return result;
}
