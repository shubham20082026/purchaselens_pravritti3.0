/** PurchaseLens calculations. Calendar dates are represented as YYYY-MM-DD.
 * Monetary arithmetic is performed in paise to avoid floating-point drift.
 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Add calendar months from the original date, clamping to month end. */
export function addMonths(date, count) {
  if (!validDate(date) || !Number.isInteger(count)) throw new Error('Invalid date or month offset');
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + count, 1));
  const y = target.getUTCFullYear();
  const m = target.getUTCMonth() + 1;
  const d = Math.min(day, new Date(Date.UTC(y, m, 0)).getUTCDate());
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const amountFields = [
  ['balance', 'Available balance'], ['price', 'Cash price'], ['down', 'Down payment'],
  ['fee', 'Upfront fees'], ['emi', 'Monthly EMI'], ['income', 'Monthly income'],
  ['expenses', 'Monthly expenses']
];
const numeric = value => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
const validAmount = value => numeric(value) && Number(value) >= 0 && Number(value) <= 1000000000 && Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) < 0.000001;

/** Return human-readable validation errors. Empty array means valid. */
export function validate(input) {
  const errors = [];
  if (!input || typeof input !== 'object') return ['Enter the purchase details.'];
  for (const [key, label] of amountFields) {
    if (!validAmount(input[key])) errors.push(`${label} must be a non-negative amount with at most two decimal places.`);
  }
  if (validAmount(input.down) && validAmount(input.price) && Number(input.down) > Number(input.price)) errors.push('Down payment cannot exceed the purchase price.');
  // Optional instant discounts are zero when omitted (including empty form fields).
  const cashDiscount = input.cashDiscount === '' || input.cashDiscount == null ? 0 : input.cashDiscount;
  const emiCashback = input.emiCashback === '' || input.emiCashback == null ? 0 : input.emiCashback;
  if (!validAmount(cashDiscount)) errors.push('Cash discount must be a non-negative amount with at most two decimal places.');
  if (!validAmount(emiCashback)) errors.push('Instant EMI discount must be a non-negative amount with at most two decimal places.');
  if (validAmount(cashDiscount) && validAmount(input.price) && Number(cashDiscount) > Number(input.price)) errors.push('Cash discount cannot exceed the purchase price.');
  if (validAmount(emiCashback) && validAmount(input.down) && validAmount(input.fee) && Math.round(Number(emiCashback) * 100) > Math.round(Number(input.down) * 100) + Math.round(Number(input.fee) * 100)) errors.push('Instant EMI discount cannot exceed the down payment and upfront fees.');
  if (!numeric(input.months) || !Number.isInteger(Number(input.months)) || Number(input.months) < 1 || Number(input.months) > 36) errors.push('Enter between 1 and 36 instalments.');
  const dates = [['purchaseDate','Purchase date'],['incomeDate','First income date'],['expensesDate','First monthly expenses date'],['emiDate','First EMI date']];
  for (const [key, label] of dates) if (!validDate(input[key])) errors.push(`${label} must be a valid date.`);
  if (validDate(input.purchaseDate)) {
    const latest = addMonths(input.purchaseDate, 36);
    for (const [key, label] of dates.slice(1)) {
      if (validDate(input[key]) && (input[key] < input.purchaseDate || input[key] > latest)) errors.push(`${label} must be on or after the purchase date and within 36 months.`);
    }
  }
  if (input.extraExpenses !== undefined && !Array.isArray(input.extraExpenses)) errors.push('Additional expenses must be a list.');
  else if ((input.extraExpenses || []).length > 50) errors.push('Add at most 50 one-time expenses.');
  else (input.extraExpenses || []).forEach((expense, index) => {
    const label = `Additional expense ${index + 1}`;
    if (!expense || typeof expense !== 'object' || !validAmount(expense.amount)) errors.push(`${label} needs a non-negative amount with at most two decimal places.`);
    if (!expense || !validDate(expense.date)) errors.push(`${label} needs a valid date.`);
    else if (validDate(input.purchaseDate) && (expense.date < input.purchaseDate || expense.date > addMonths(input.purchaseDate, 36))) errors.push(`${label} must be on or after the purchase date and within 36 months.`);
  });
  return errors;
}

const cents = value => Math.round(Number(value) * 100);
const rupees = value => value / 100;

/**
 * calculate(input) -> {horizonDate, cash, emi, events, difference}.
 * cash and emi each contain {totalCost, paidToday, lowestBalance,
 * lowestDate, firstShortfall, endBalance}. breakdown exposes all-in fees,
 * eligible discounts, and instalment amounts. Events have {date, type, label,
 * cashChange, emiChange, cashBalance, emiBalance}. All amounts are in rupees.
 * A shortfall is a negative balance; firstShortfall is a date or null.
 * The purchase is booked first; same-day entries then follow income,
 * recurring expenses, one-time expenses and EMI. This is an assumption,
 * not a guarantee about the user's actual transaction order.
 */
export function calculate(input) {
  const errors = validate(input);
  if (errors.length) throw new Error(errors.join(' '));
  const months = Number(input.months);
  const finalEmiDate = addMonths(input.emiDate, months - 1);
  const sixMonths = addMonths(input.purchaseDate, 6);
  let horizonDate = finalEmiDate > sixMonths ? finalEmiDate : sixMonths;
  for (const expense of input.extraExpenses || []) if (expense.date > horizonDate) horizonDate = expense.date;
  const cashDiscount = cents(input.cashDiscount || 0);
  const emiCashback = cents(input.emiCashback || 0);
  const totalCash = cents(input.price) - cashDiscount;
  const todayEmi = cents(input.down) + cents(input.fee) - emiCashback;
  const totalEmi = todayEmi + cents(input.emi) * months;
  const entries = [{date:input.purchaseDate, type:'purchase', label:'Purchase / upfront payment', order:0, cash:-totalCash, emi:-todayEmi}];
  function recurring(date, amount, type, label, order) {
    if (!amount) return;
    for (let index = 0; ; index++) {
      const eventDate = addMonths(date, index);
      if (eventDate > horizonDate) break;
      entries.push({date:eventDate, type, label, order, cash:amount, emi:amount});
    }
  }
  recurring(input.incomeDate, cents(input.income), 'income', 'Monthly income', 1);
  recurring(input.expensesDate, -cents(input.expenses), 'expense', 'Monthly expenses', 2);
  (input.extraExpenses || []).forEach(expense => {
    if (expense.date <= horizonDate) entries.push({date:expense.date,type:'oneTime',label:String(expense.name || 'One-time expense').trim() || 'One-time expense',order:3,cash:-cents(expense.amount),emi:-cents(expense.amount)});
  });
  for (let i = 0; i < months; i++) entries.push({date:addMonths(input.emiDate,i),type:'emi',label:`EMI ${i+1} of ${months}`,order:4,cash:0,emi:-cents(input.emi)});
  entries.sort((a,b) => a.date.localeCompare(b.date) || a.order - b.order);
  let cb = cents(input.balance), eb = cb;
  let cmin = cb, emin = eb, cminDate = input.purchaseDate, eminDate = input.purchaseDate;
  let cfirst = null, efirst = null;
  const events = entries.map(e => {
    cb += e.cash; eb += e.emi;
    if (cb < cmin) { cmin = cb; cminDate = e.date; }
    if (eb < emin) { emin = eb; eminDate = e.date; }
    if (cb < 0 && !cfirst) cfirst = e.date;
    if (eb < 0 && !efirst) efirst = e.date;
    return {date:e.date,type:e.type,label:e.label,cashChange:rupees(e.cash),emiChange:rupees(e.emi),cashBalance:rupees(cb),emiBalance:rupees(eb)};
  });
  return {
    horizonDate,
    cash:{totalCost:rupees(totalCash),paidToday:rupees(totalCash),lowestBalance:rupees(cmin),lowestDate:cminDate,firstShortfall:cfirst,endBalance:rupees(cb)},
    emi:{totalCost:rupees(totalEmi),paidToday:rupees(todayEmi),lowestBalance:rupees(emin),lowestDate:eminDate,firstShortfall:efirst,endBalance:rupees(eb)},
    difference:rupees(totalEmi-totalCash),
    breakdown:{
      cash:{purchasePrice:rupees(cents(input.price)),discount:rupees(cashDiscount)},
      emi:{downPayment:rupees(cents(input.down)),upfrontFee:rupees(cents(input.fee)),instantDiscount:rupees(emiCashback),instalment:rupees(cents(input.emi)),count:months}
    },
    events
  };
}
