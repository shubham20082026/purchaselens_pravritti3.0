import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,validate,addMonths} from '../public/engine.js';
const base = {balance:45000, price:38000, down:5000, fee:900, emi:5800, months:6, purchaseDate:'2026-01-31', income:30000, incomeDate:'2026-02-28', expenses:22000, expensesDate:'2026-02-28', emiDate:'2026-02-28', extraExpenses:[]};
test('compares true costs and opening balances',()=>{const r=calculate(base);assert.equal(r.cash.totalCost,38000);assert.equal(r.emi.totalCost,40700);assert.equal(r.difference,2700);assert.equal(r.events[0].cashBalance,7000);assert.equal(r.events[0].emiBalance,39100);});
test('clamps month ends without drifting',()=>{assert.equal(addMonths('2026-01-31',1),'2026-02-28');assert.equal(addMonths('2026-01-31',2),'2026-03-31');assert.equal(addMonths('2028-01-31',1),'2028-02-29');});
test('detects shortfall before income on purchase date',()=>{const r=calculate({...base,balance:1000,incomeDate:base.purchaseDate});assert.equal(r.cash.firstShortfall,base.purchaseDate);assert.equal(r.events[0].type,'purchase');assert.equal(r.events[1].type,'income');});
test('includes extra expenses beyond the normal horizon',()=>{const r=calculate({...base,extraExpenses:[{name:'Repair',amount:900,date:'2027-01-31'}]});assert.equal(r.horizonDate,'2027-01-31');assert.ok(r.events.some(e=>e.label==='Repair'));});
test('rejects invalid amounts and dates',()=>{assert.ok(validate({...base,down:40000}).length);assert.ok(validate({...base,emi:0.001}).length);assert.ok(validate({...base,emiDate:'2026-01-01'}).length);assert.throws(()=>calculate({...base,months:0}));});

test('includes cash discount and instant EMI discount in cost and dated balance',()=>{
  const r=calculate({...base,cashDiscount:1500,emiCashback:500});
  assert.equal(r.cash.totalCost,36500); assert.equal(r.cash.paidToday,36500);
  assert.equal(r.emi.paidToday,5400); assert.equal(r.emi.totalCost,40200);
  assert.equal(r.difference,3700);
  assert.equal(r.events[0].cashBalance,8500); assert.equal(r.events[0].emiBalance,39600);
  assert.deepEqual(r.breakdown.emi,{downPayment:5000,upfrontFee:900,instantDiscount:500,instalment:5800,count:6});
});
test('validates discounts and preserves legacy inputs',()=>{
  assert.equal(calculate(base).cash.totalCost,38000);
  assert.equal(calculate({...base,cashDiscount:'',emiCashback:''}).emi.totalCost,40700);
  assert.ok(validate({...base,cashDiscount:38001}).some(e=>e.includes('Cash discount')));
  assert.ok(validate({...base,emiCashback:5901}).some(e=>e.includes('Instant EMI discount')));
  assert.ok(validate({...base,emiCashback:-1}).length);
  assert.ok(validate({...base,cashDiscount:0.001}).length);
});
