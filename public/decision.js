/** Decision helpers for PurchaseLens. All outcomes are estimates based on user input. */
import {calculate} from './engine.js';

const toPaise = value => Math.round(Number(value) * 100);
const toRupees = value => value / 100;
function amount(value, label) {
  if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 1000000000 || Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) > 0.000001) {
    throw new Error(`${label} must be a non-negative amount with at most two decimal places.`);
  }
  return Number(value);
}

/** The first event leaving a projected balance below the user's chosen buffer. */
export function firstBufferBreach(result, buffer) {
  const threshold = toPaise(amount(buffer, 'Cash buffer'));
  const first = field => {
    const event = result.events.find(item => toPaise(item[field]) < threshold);
    return event ? {date:event.date, label:event.label, balance:event[field]} : null;
  };
  return {cash:first('cashBalance'), emi:first('emiBalance')};
}

/**
 * First modelled event at which an upfront purchase leaves the buffer intact.
 * This models the cash path with the initial purchase removed. It stops if that
 * path goes negative first, rather than silently financing a shortfall. Same-day
 * event ordering follows the engine. This is a snapshot, not a guarantee that
 * the buffer will stay intact after purchase.
 */
export function findWaitDate(result, buffer) {
  const threshold = toPaise(amount(buffer, 'Cash buffer'));
  const purchase = toPaise(result.cash.paidToday);
  for (const event of result.events) {
    const withoutPurchase = toPaise(event.cashBalance) + purchase;
    if (withoutPurchase < 0) return {date:null, reason:'baseline-shortfall', shortfallDate:event.date};
    if (withoutPurchase - purchase >= threshold) {
      return {date:event.date, afterEvent:event.type === 'purchase' ? 'Starting balance' : event.label,
        balanceBeforePurchase:toRupees(withoutPurchase), balanceAfterPurchase:toRupees(withoutPurchase - purchase), reason:null};
    }
  }
  return {date:null, reason:'not-reached', shortfallDate:null};
}

/**
 * Baseline, personal-buffer check, earliest snapshot for buying with cash, and
 * optionally a one-off unexpected expense. An added expense is accepted only
 * inside the baseline horizon, so baseline and stressed forecasts are comparable.
 */
export function analyzeDecision(input, options = {}) {
  const buffer = amount(options.buffer ?? 0, 'Cash buffer');
  const shockAmount = amount(options.shockAmount ?? 0, 'Unexpected expense');
  const baseline = calculate(input);
  const bufferBreach = firstBufferBreach(baseline, buffer);
  const wait = findWaitDate(baseline, buffer);
  let stress = null;
  if (shockAmount > 0) {
    const shockDate = options.shockDate;
    if (typeof shockDate !== 'string' || shockDate < input.purchaseDate || shockDate > baseline.horizonDate) {
      throw new Error('The unexpected expense date must fall inside the displayed forecast period.');
    }
    if ((input.extraExpenses || []).length >= 50) throw new Error('Remove an extra expense before adding the unexpected expense simulation.');
    const stressed = calculate({...input, extraExpenses:[...(input.extraExpenses || []), {name:'Unexpected expense (what-if)', amount:shockAmount, date:shockDate}]});
    stress = {amount:shockAmount, date:shockDate, result:stressed, bufferBreach:firstBufferBreach(stressed,buffer)};
  }
  return {baseline, buffer, bufferBreach, wait, stress};
}
