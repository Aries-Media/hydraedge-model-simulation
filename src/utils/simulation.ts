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
	sl: D | ((balance: D) => D); // stop-loss distance
	/**
	 * take‑profit distance. When omitted the engine will derive it at run‑time
	 * as (maxBalance – currentBalance), i.e. "close the gap to the tier ceiling".
	 */
	tp?: D | ((balance: D) => D);
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

/* ────────── Constants ────────── */

// Default values - these will be overridden by form parameters
const DEFAULT_MAX_DRAWDOWN_RATIO = new Decimal(0.07);
const DEFAULT_SINGLE_TRADE_STOP_RATIO = new Decimal(0.04);
const DEFAULT_PROFIT_TARGET_RATIO = new Decimal(0.14);
const REAL_PHASE_PROFIT_RATIO = new Decimal(1.025); // 2.5 % above start in real phase (205 k / 200 k)

const LOT_THRESHOLD_1 = new Decimal(1.06);
const LOT_THRESHOLD_2 = new Decimal(1.12);

const RATIO_MARGIN_INJECT = new Decimal(1.12);
const BROKER_MARGIN_FACTOR = new Decimal(0.45);

const toDec = (x: number | D): D => (x instanceof Decimal ? x : new Decimal(x));

function lift(val: D | number | ((b: D) => D | number), bal: D): D {
	if (typeof val === "function") return toDec(val(bal));
	return toDec(val);
}

/* ────────── Helpers ────────── */

/*
 * Create a level‑picker function that, for a given balance, returns SL/TP.
 * If the level rule leaves TP undefined the engine will derive it as the distance
 * between current balance and the tier's maxBalance – enabling fully
 * parametric tiers without hard‑coding TP values.
 */
const makePicker = (levels: LevelRule[]) => {
	const last = levels[levels.length - 1];
	return (bal: D) => {
		for (const lvl of levels)
			if (bal.lte(lvl.maxBalance)) {
				const sl = lift(lvl.sl, bal);
				const tp =
					lvl.tp === undefined
						? toDec(lvl.maxBalance)
								.minus(bal)
								.plus(50) // dynamic TP = gap to ceiling plus 50
						: lift(lvl.tp, bal);
				return { sl, tp };
			}
		/* fall back to last rule */
		const sl = lift(last.sl, bal);
		const tp =
			last.tp === undefined
				? toDec(last.maxBalance).minus(bal)
				: lift(last.tp, bal);
		return { sl, tp };
	};
};

/** Hedging lot‑coefficient for the current balance (scaled variants). */
const hedgeCoeff = (bal: D, start: D): D => {
	const ratio = bal.div(start);
	if (ratio.lt(LOT_THRESHOLD_1)) return new Decimal(0.15);
	if (ratio.lt(LOT_THRESHOLD_2)) return new Decimal(0.3);
	return new Decimal(0.6);
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
		new Decimal(1).minus(maxLossRatio),
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
}: SimulationParams): SimulationResult {
	// Use form parameters or defaults
	const MAX_DRAWDOWN_RATIO = new Decimal(maxLossRatio);
	const SINGLE_TRADE_STOP_RATIO = new Decimal(dailyLossRatio);
	const PROFIT_TARGET_RATIO = new Decimal(targetProfitRatio);

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
	console.log(
		"Clients Balance Distribution",
		clientBalances,
		effectiveDistribution,
	);

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
	let totalPayoutsCost = new Decimal(0);
	let totalRefundsCost = new Decimal(0);
	let totalReimburseBrokerLossCost = new Decimal(0);
	let totalExtractedBrokerProfit = new Decimal(0);
	let totalPropProfit = new Decimal(0);
	let totalAmountSpent = new Decimal(0);
	let totalLots = new Decimal(0);
	let totalCommissionCost = new Decimal(0);
	let totalNetProfit = new Decimal(0); // Declare this variable properly

	// Run simulation for each client with their assigned balance
	for (let clientIndex = 0; clientIndex < clientsNumber; clientIndex++) {
		const clientInitialBalance = clientBalances[clientIndex];
		const scaleFactor = toDec(clientInitialBalance).div(200_000);

		// Scale challenge cost based on the client's initial balance
		const CHALLENGE_COST = toDec(900).times(scaleFactor);
		const TRADE_LOTS = toDec(8).times(scaleFactor);
		const START = toDec(clientInitialBalance);
		const BROKER_SEED = toDec(brokerSeed ?? 6_000 * scaleFactor.toNumber());
		const COMMISSION_PER_TRADE = toDec(commissionPerTrade);
		const BROKER_BONUS = BROKER_SEED.times(BROKER_MARGIN_FACTOR);
		const PAYOUT = toDec(4_000).times(scaleFactor);

		if (!levels || !realLevels)
			throw Error("Levels undefined cannot run simulation");
		const pickLevels = makePicker(levels);
		const pickRealLevels = makePicker(realLevels);

		// Client-specific bookkeeping
		let propProfit = new Decimal(0);
		let customerProfit = new Decimal(0);
		let extractedBrokerProfit = new Decimal(0);
		let commissionCost = new Decimal(0);
		let challengesBought = 0;
		let challengesWon = 0;
		let challengesLost = 0;
		let payoutsCost = new Decimal(0);
		let refundsCost = new Decimal(0);
		let reimburseBrokerLossCost = new Decimal(0);
		let clientTotalAmountSpent = new Decimal(0);
		let clientTotalLots = new Decimal(0);

		let tradesLeft = tradesPerClient;
		let propBalance = new Decimal(0);
		let brokerBalance = new Decimal(0);
		let marginMoved = false;
		let challengeOngoing = false;
		let realTrades = 0;
		let currentChallenge: ChallengeLog | undefined;
		let totalTradeNumber = 0;
		let previousTradeOutcome: "SL" | "TP" | null = null;

		while (tradesLeft > 0) {
			if (!challengeOngoing) {
				/* —— new challenge purchase —— */
				console.log("\n\nNEW Challenge");
				challengesBought++;
				challengeOngoing = true;
				clientTotalAmountSpent = clientTotalAmountSpent.plus(CHALLENGE_COST);
				propProfit = propProfit.plus(CHALLENGE_COST); // incoming fee

				propBalance = START;
				brokerBalance = BROKER_SEED;
				marginMoved = false;
				previousTradeOutcome = null; // Reset for new challenge

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

			let { sl, tp } = pickLevels(propBalance);

			// Override SL for burn_after_sl strategy when previous trade was SL
			if (
				tradeOutcomeStrategy === "burn_after_sl" &&
				previousTradeOutcome === "SL"
			) {
				sl = calculateBurnSL(propBalance, START, MAX_DRAWDOWN_RATIO);
			}

			const coeff = hedgeCoeff(propBalance, START);
			const outcome = pickOutcome(sl, tp, tradeOutcomeStrategy);

			console.log(
				"Trade",
				tradesPerClient - tradesLeft,
				"|",
				"balance:",
				propBalance.toNumber(),
				"- SL:",
				sl.toNumber(),
				"TP:",
				tp.toNumber(),
			);
			console.log("Result:", outcome, "\n");

			let brokerPL = new Decimal(0); // signed P&L for this trade
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
			clientTotalLots = clientTotalLots.plus(TRADE_LOTS);

			// Track previous trade outcome for burn_after_sl strategy
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
				START.times(new Decimal(1).minus(MAX_DRAWDOWN_RATIO)),
			);
			const profitTargetHit = propBalance.gte(
				START.times(new Decimal(1).plus(PROFIT_TARGET_RATIO)),
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

				if (burnWonChallenges) {
					challengeOngoing = false;
					const brokerLossReimb = brokerBalance.lt(BROKER_SEED)
						? BROKER_SEED.minus(brokerBalance)
						: new Decimal(0);
					const reimbursement =
						CHALLENGE_COST.plus(brokerLossReimb).plus(PAYOUT);

					customerProfit = customerProfit.plus(reimbursement);
					propProfit = propProfit.minus(reimbursement);

					refundsCost = refundsCost.plus(CHALLENGE_COST);
					payoutsCost = payoutsCost.plus(PAYOUT);
					reimburseBrokerLossCost =
						reimburseBrokerLossCost.plus(brokerLossReimb);

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
				while (tradesLeft > 0) {
					tradesLeft--;
					totalTradeNumber++;
					realTrades++;
					commissionCost = commissionCost.plus(COMMISSION_PER_TRADE);
					brokerBalance = brokerBalance.minus(COMMISSION_PER_TRADE);

					let { sl: slR, tp: tpR } = pickRealLevels(propBalance);

					// Override SL for burn_after_sl strategy when previous trade was SL (real phase)
					if (
						tradeOutcomeStrategy === "burn_after_sl" &&
						previousTradeOutcome === "SL"
					) {
						slR = calculateBurnSL(propBalance, START, SINGLE_TRADE_STOP_RATIO);
					}

					const outcomeR = pickOutcome(slR, tpR, tradeOutcomeStrategy);

					console.log(
						"## REAL Trade",
						tradesPerClient - tradesLeft,
						"|",
						"balance:",
						propBalance.toNumber(),
						"- SL:",
						slR.toNumber(),
						"TP:",
						tpR.toNumber(),
					);
					console.log("Result:", outcomeR, "\n");

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

					// Track previous trade outcome for burn_after_sl strategy (real phase)
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
