/** PurchaseLens pro workspace. The shell owns auth, saving, and access decisions. */
export function mountPro(root, context) {
  if (root._unmountPro) root._unmountPro();
  const controller = new AbortController();
  const money = value => `${value < 0 ? '−' : ''}₹${Math.abs(Number(value)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const date = value => {
    if (!value) return '—';
    const [y,m,d] = value.split('-').map(Number);
    return new Date(y,m-1,d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  };
  const premium = () => typeof context.isPremium === 'function' ? context.isPremium() : Boolean(context.isPremium);
  const q = selector => root.querySelector(selector);
  const planFields = [
    ['itemName','Purchase name','text','e.g. Laptop'],
    ['price','Listed price · ₹','number'], ['purchaseDate','Purchase date','date'],
    ['cashDiscount','Cash-only discount · ₹','number'],
    ['down','Down payment · ₹','number'], ['fee','Upfront fees and tax · ₹','number'],
    ['emiCashback','Immediate EMI discount · ₹','number'],
    ['emi','Monthly instalment · ₹','number'], ['months','Number of instalments','number'],
    ['emiDate','First instalment','date'], ['balance','Available balance · ₹','number'],
    ['buffer','Protected cushion · ₹','number'], ['income','Monthly income · ₹','number'],
    ['incomeDate','First income date','date'], ['expenses','Monthly expenses · ₹','number'],
    ['expensesDate','First expense date','date']
  ];
  const group = (title, keys) => `<fieldset class="pro-fieldset"><legend>${title}</legend><div class="pro-fields">${planFields.filter(f=>keys.includes(f[0])).map(([key,label,type,placeholder])=>`<label class="pro-field ${key === 'itemName' ? 'pro-span' : ''}"><span>${label}</span><input data-plan-field="${key}" type="${type}" ${type === 'number' ? `min="${key==='months'?'1':'0'}" ${key==='months'?'max="36" step="1"':'step="0.01"'}`:''} ${placeholder?`placeholder="${placeholder}"`:''} required></label>`).join('')}</div></fieldset>`;
  root.innerHTML = `<section class="pro-app" aria-label="Pro purchase dashboard">
    <header class="pro-header"><div><span class="pro-kicker">DECISION WORKSPACE / PRO MODE</span><h1>Two ways to pay. One clear picture<span class="pro-accent">.</span></h1><p>See when each option touches the money you want to keep, and what caused it.</p></div><div class="pro-header-actions"><button type="button" class="pro-button pro-button-secondary" data-action="reset-focus" title="Alt + 1">Edit inputs <kbd>Alt 1</kbd></button><button type="button" class="pro-button pro-button-secondary" data-action="export">Export CSV <span data-premium-label>LOCKED</span></button><span class="pro-hint" data-export-status role="status" aria-live="polite"></span></div></header>
    <div class="pro-layout"><aside class="pro-editor"><div class="pro-editor-heading"><div><span class="pro-kicker">01 / INPUTS</span><h2>Purchase details</h2></div><span class="pro-live">EDITABLE</span></div>
    ${group('Offer', ['itemName','price','purchaseDate','cashDiscount','down','fee','emiCashback','emi','months','emiDate'])}
    <p class="pro-hint">Enter your actual offer. Include tax in upfront fees only when it is not already included in your instalments.</p>
    ${group('Your cash flow', ['balance','buffer','income','incomeDate','expenses','expensesDate'])}
    <section class="pro-extras"><div class="pro-row-heading"><strong>One-time expenses</strong><button class="pro-link" type="button" data-action="add-extra">+ Add expense</button></div><div data-extras></div><p class="pro-hint">Include an expense once; do not repeat amounts already in monthly expenses.</p><details class="pro-bulk"><summary>Bulk add expenses</summary><p class="pro-hint">One expense per line: name, amount, date. Use dates in YYYY-MM-DD format; names cannot contain commas.</p><label class="pro-field"><span>Expense list</span><textarea data-bulk-extras rows="5" maxlength="12000" placeholder="Repair, 2500, 2027-04-12&#10;Insurance, 3500, 2027-05-09"></textarea></label><button type="button" class="pro-button pro-button-secondary" data-action="bulk-add">Add all expenses</button><p class="pro-hint" data-bulk-status role="status" aria-live="polite"></p></details></section>
    <p data-plan-error role="alert" class="pro-error" hidden></p></aside>
    <main class="pro-analysis"><div class="pro-analysis-header"><div><span class="pro-kicker">02 / THE DECISION</span><h2>Cash vs instalments</h2></div><span class="pro-status" data-status>LIVE ESTIMATE</span></div>
      <section class="pro-summary" aria-label="Comparison"><div class="pro-summary-item"><span>Cash cost</span><strong data-cash-cost>—</strong><small>after cash-only discount</small></div><div class="pro-summary-item"><span>Instalment cost</span><strong data-emi-cost>—</strong><small>includes fees and down payment</small></div><div class="pro-summary-item"><span>Difference</span><strong data-difference>—</strong><small data-difference-note>—</small></div><div class="pro-summary-item"><span>Chosen cushion</span><strong data-buffer>—</strong><small>your personal minimum</small></div></section>
      <section class="pro-block pro-paths"><div class="pro-block-heading"><div><span class="pro-kicker">YOUR CUSHION, TWO WAYS TO PAY</span><h3>What happens to your cushion?</h3></div></div><div class="pro-path-grid"><article><span>PAY IN FULL</span><strong data-cash-low>—</strong><p data-cash-breach>—</p><small data-cash-gap>—</small></article><article><span>PAY WITH INSTALMENTS</span><strong data-emi-low>—</strong><p data-emi-breach>—</p><small data-emi-gap>—</small></article></div><p class="pro-explanation" data-wait>—</p></section>
      <section class="pro-block"><div class="pro-block-heading"><div><span class="pro-kicker">THE BIGGER PICTURE</span><h3>Projected balances</h3></div><div class="pro-legend"><span>● Full payment</span><span>● Instalments</span></div></div><svg data-chart class="pro-chart" viewBox="0 0 700 190" preserveAspectRatio="none" role="img" aria-label="Estimated balances over time"></svg><div class="pro-chart-axis"><span data-chart-start>—</span><span data-chart-end>—</span></div></section>
      <section class="pro-block pro-stress"><div class="pro-block-heading"><div><span class="pro-kicker">SCENARIO LAB <span class="pro-lock">PREMIUM</span></span><h3>What if an extra cost hits?</h3><p>Test a single unexpected expense against the same timeline.</p></div></div><div class="pro-stress-controls"><label class="pro-field"><span>Unexpected cost · ₹</span><input data-shock="amount" type="number" min="0.01" step="0.01" value="5000"></label><label class="pro-field"><span>Date</span><input data-shock="date" type="date"></label><button type="button" class="pro-button pro-button-primary" data-action="shock">${premium()?'Run scenario':'Unlock scenario lab ↗'}</button></div><p data-shock-result class="pro-hint" aria-live="polite">${premium()?'Test a date within the forecast.':'See the effect of an unexpected expense with Premium.'}</p></section>
      <section class="pro-block"><div class="pro-block-heading"><div><span class="pro-kicker">AUDIT TRAIL</span><h3>Cash-flow events</h3><p>Balances shown after each entry.</p></div><label class="pro-filter">Show <select data-filter><option value="all">All events</option><option value="income">Income</option><option value="expense">Expenses</option><option value="emi">Instalments</option></select></label></div><div class="pro-table-wrap"><table class="pro-table"><thead><tr><th>Date</th><th>Event</th><th>Cash</th><th>Instalments</th></tr></thead><tbody data-events></tbody></table></div><p class="pro-hint">Same-day order: purchase, income, regular expenses, one-time expenses, instalment. Estimates depend on the dates and amounts entered.</p></section>
      <details class="pro-assumptions"><summary>Review assumptions and offer math</summary><div data-assumptions></div><p>Wait-to-buy is a snapshot immediately after an event. Later bills may reduce the balance. These estimates are not financial advice.</p></details>
    </main></div></section>`;
  let last = null, timer;
  const plan = context.getPlan();
  for (const input of root.querySelectorAll('[data-plan-field]')) input.value = plan[input.dataset.planField] ?? '';
  q('[data-shock="date"]').value = plan.incomeDate || plan.purchaseDate;
  if (premium()) q('[data-premium-label]').textContent='CSV';

  function updateExtras() {
    const container=q('[data-extras]');container.replaceChildren();
    const expenses=context.getPlan().extraExpenses || [];
    if (!expenses.length) {const p=document.createElement('p');p.className='pro-hint';p.textContent='No one-time expenses added.';container.append(p);return;}
    expenses.forEach((expense,index)=>{
      const wrap=document.createElement('div');wrap.className='pro-extra-row';
      const vals=[['name','Name','text'],['amount','Amount · ₹','number'],['date','Date','date']];
      vals.forEach(([key,label,type])=>{const el=document.createElement('label');el.className='pro-field';const caption=document.createElement('span');caption.textContent=label;const input=document.createElement('input');input.type=type;input.value=expense[key] ?? '';input.dataset.extraField=key;input.dataset.index=String(index);if(type==='number'){input.min='0';input.step='0.01'}el.append(caption,input);wrap.append(el)});
      const del=document.createElement('button');del.type='button';del.className='pro-link';del.dataset.deleteExtra=String(index);del.textContent='Remove';del.setAttribute('aria-label',`Remove expense ${index+1}`);wrap.append(del);container.append(wrap);
    });
  }
  function draw(result) {
    const events=result.baseline.events, svg=q('[data-chart]');
    if(!events.length){svg.replaceChildren();return;}
    const minmax=events.flatMap(e=>[e.cashBalance,e.emiBalance]);minmax.push(0);
    let lo=Math.min(...minmax),hi=Math.max(...minmax);let pad=Math.max((hi-lo)*.1,1);lo-=pad;hi+=pad;
    const t0=Date.parse(events[0].date+'T00:00:00Z'),t1=Date.parse(result.baseline.horizonDate+'T00:00:00Z');
    const x=e=>20+(Date.parse(e.date+'T00:00:00Z')-t0)/(t1-t0||1)*660;
    const y=v=>170-(v-lo)/(hi-lo)*150;
    const path=key=>events.map((e,i)=>`${i?'L':'M'}${x(e).toFixed(1)} ${y(e[key]).toFixed(1)}`).join(' ');
    svg.innerHTML=[20,60,100,140,170].map(n=>`<line x1="20" x2="680" y1="${n}" y2="${n}" stroke="#35443a" stroke-dasharray="3 7"/>`).join('')+`<line x1="20" x2="680" y1="${y(0)}" y2="${y(0)}" stroke="#fd9a87" stroke-dasharray="4 4"/><path d="${path('cashBalance')}" fill="none" stroke="#80d8c5" stroke-width="3" vector-effect="non-scaling-stroke"/><path d="${path('emiBalance')}" fill="none" stroke="#d4f779" stroke-width="3" vector-effect="non-scaling-stroke"/>`;
    q('[data-chart-start]').textContent=date(events[0].date);q('[data-chart-end]').textContent=date(result.baseline.horizonDate);
  }
  function renderTimeline() {
    if(!last)return;
    const filter=q('[data-filter]').value, body=q('[data-events]');body.replaceChildren();
    const events=last.baseline.events.filter(e=>filter==='all'||(filter==='expense'&&(e.type==='expense'||e.type==='oneTime'))||e.type===filter);
    if(!events.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=4;cell.textContent='No events match this filter.';row.append(cell);body.append(row);return;}
    for(const event of events){const tr=document.createElement('tr');for(const value of [date(event.date),event.label,money(event.cashBalance),money(event.emiBalance)]){const td=document.createElement('td');td.textContent=value;tr.append(td)}body.append(tr)}
  }
  function render() {
    try {
      const p=context.getPlan(), result=context.compute(p), r=result.baseline;
      last=result;q('[data-plan-error]').hidden=true;q('[data-status]').textContent='LIVE ESTIMATE';
      q('[data-cash-cost]').textContent=money(r.cash.totalCost);q('[data-emi-cost]').textContent=money(r.emi.totalCost);
      q('[data-difference]').textContent=money(Math.abs(r.difference));q('[data-difference-note]').textContent=r.difference>0?'extra for instalments':r.difference<0?'less with instalments':'same total cost';
      q('[data-buffer]').textContent=money(Number(p.buffer));
      for(const [kind,key] of [['cash','cash'],['emi','emi']]) {
        const item=r[key],breach=result.bufferBreach[key],gap=Math.max(0, Number(p.buffer)-item.lowestBalance);
        q(`[data-${kind}-low]`).textContent=money(item.lowestBalance);
        q(`[data-${kind}-breach]`).textContent=breach?`Below cushion on ${date(breach.date)} after ${breach.label}`:'No cushion breach in this forecast';
        q(`[data-${kind}-gap]`).textContent=gap?`${money(gap)} below your chosen cushion at the lowest point`:'Cushion retained at all modelled events';
      }
      const w=result.wait;q('[data-wait]').textContent=w.date?`Wait snapshot: after ${w.afterEvent} on ${date(w.date)}, buying in cash could leave ${money(w.balanceAfterPurchase)}. Later bills may reduce that amount.`:w.reason==='baseline-shortfall'?`Without buying, a shortfall is projected on ${date(w.shortfallDate)}. Review the plan before comparing a later purchase.`:'No event in this forecast leaves the chosen cushion after a cash purchase.';
      const b=r.breakdown;
      q('[data-assumptions]').textContent=`Listed price ${money(b.cash.purchasePrice)} minus cash discount ${money(b.cash.discount)} = ${money(r.cash.totalCost)} in cash. Instalments: down payment ${money(b.emi.downPayment)} + fees and tax ${money(b.emi.upfrontFee)} − immediate discount ${money(b.emi.instantDiscount)} + ${b.emi.count} × ${money(b.emi.instalment)} = ${money(r.emi.totalCost)}. Income ${money(Number(p.income))} and expenses ${money(Number(p.expenses))} repeat monthly from their first dates. Assumed starting balance: ${money(Number(p.balance))}.`;
      draw(result);renderTimeline();
    } catch(error) {
      last=null;q('[data-plan-error]').hidden=false;q('[data-plan-error]').textContent=error.message || 'Complete the inputs to see the estimate.';
      q('[data-status]').textContent='INPUTS NEED ATTENTION';
      // Clear old figures rather than showing stale numbers as current.
      for(const selector of ['[data-cash-cost]','[data-emi-cost]','[data-difference]','[data-buffer]','[data-cash-low]','[data-emi-low]'])q(selector).textContent='—';
      q('[data-cash-breach]').textContent='Complete the plan';q('[data-emi-breach]').textContent='Complete the plan';q('[data-cash-gap]').textContent='';q('[data-emi-gap]').textContent='';q('[data-wait]').textContent='';q('[data-assumptions]').textContent='';q('[data-chart]').replaceChildren();q('[data-events]').replaceChildren();
    }
  }
  root.addEventListener('input', e=>{
    const target=e.target;
    if(target.matches('[data-plan-field]')) context.setPlan({[target.dataset.planField]:target.value});
    else if(target.matches('[data-extra-field]')) {
      const next=(context.getPlan().extraExpenses || []).map(item=>({...item})),i=Number(target.dataset.index);
      if(next[i]) {next[i][target.dataset.extraField]=target.value;context.setPlan({extraExpenses:next});}
    } else return;
    q('[data-shock-result]').textContent='Plan changed. Run the scenario again to see its effect.';
    clearTimeout(timer);timer=setTimeout(render,200);
  }, {signal:controller.signal});
  root.addEventListener('click', async e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.deleteExtra!==undefined) {const next=(context.getPlan().extraExpenses||[]).filter((_,i)=>i!==Number(button.dataset.deleteExtra));context.setPlan({extraExpenses:next});updateExtras();render();return;}
    const action=button.dataset.action;
    if(action==='add-extra'){const p=context.getPlan(),next=[...(p.extraExpenses||[])];if(next.length>=50){q('[data-plan-error]').hidden=false;q('[data-plan-error]').textContent='You can add up to 50 one-time expenses.';return;}next.push({name:'',amount:'0',date:p.purchaseDate});context.setPlan({extraExpenses:next});updateExtras();render();}
    if(action==='bulk-add') {
      const field=q('[data-bulk-extras]'),status=q('[data-bulk-status]');
      const lines=field.value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
      if (!lines.length) {status.textContent='Add at least one expense line.';return;}
      const current=context.getPlan(), existing=current.extraExpenses||[];
      if (existing.length+lines.length>50) {status.textContent='A plan can contain at most 50 one-time expenses. No expenses were added.';return;}
      const parsed=[];
      for (let i=0;i<lines.length;i++) {
        const parts=lines[i].split(',').map(part=>part.trim());
        if (parts.length!==3 || !parts[0] || parts[0].length>60 || !/^\d+(?:\.\d{1,2})?$/.test(parts[1]) || !/^\d{4}-\d{2}-\d{2}$/.test(parts[2])) {
          status.textContent=`Check line ${i+1}. Use name, amount, YYYY-MM-DD; names must be 1–60 characters. No expenses were added.`;return;
        }
        parsed.push({name:parts[0],amount:parts[1],date:parts[2]});
      }
      const combined=[...existing,...parsed];
      try {
        context.compute({...current,extraExpenses:combined});
      } catch(error) {status.textContent=`Could not add this batch: ${error.message || 'check the dates and amounts'}. No expenses were added.`;return;}
      context.setPlan({extraExpenses:combined});updateExtras();render();field.value='';
      q('[data-shock-result]').textContent='Plan changed. Run the scenario again to see its effect.';
      status.textContent=`Added ${parsed.length} ${parsed.length===1?'expense':'expenses'} to this plan.`;
    }
    if(action==='reset-focus')q('[data-plan-field="itemName"]').focus();
    if(action==='shock') {
      if(!premium()){context.openPricing();return;}
      const status=q('[data-shock-result]');
      try {
        const amount=q('[data-shock="amount"]').value, shockDate=q('[data-shock="date"]').value;
        if(!amount || Number(amount)<=0)throw Error('Enter an unexpected cost greater than zero.');
        const current=structuredClone(context.getPlan()), baseline=context.compute(current).baseline;
        const snapshot=JSON.stringify(current);
        button.disabled=true;status.textContent='Running your scenario…';
        const result=await context.premiumAction('stress',{plan:current,shockAmount:amount,shockDate});
        if (snapshot!==JSON.stringify(context.getPlan()) || amount!==q('[data-shock="amount"]').value || shockDate!==q('[data-shock="date"]').value) throw Error('Inputs changed while the test was running. Run the scenario again.');
        const scenario=result.stress;
        if(!scenario?.result || !scenario?.bufferBreach)throw Error('The scenario could not be returned.');
        status.textContent=`Full payment: lowest balance ${money(baseline.cash.lowestBalance)} → ${money(scenario.result.cash.lowestBalance)}. Instalments: ${money(baseline.emi.lowestBalance)} → ${money(scenario.result.emi.lowestBalance)}. ${scenario.bufferBreach.cash?'Full payment falls below your cushion on '+date(scenario.bufferBreach.cash.date)+'. ':'Full payment stays above your cushion at recorded events. '}${scenario.bufferBreach.emi?'Instalments fall below your cushion on '+date(scenario.bufferBreach.emi.date)+'.':'Instalments stay above your cushion at recorded events.'}`;
      }catch(err){status.textContent=err.message||'Could not run this scenario.';}finally{button.disabled=false;}
    }
    if(action==='export') {
      if(!premium()){context.openPricing();return;}
      const status=q('[data-export-status]');
      try {
        if(!last)throw Error('Complete the plan before exporting.');
        button.disabled=true;status.textContent='Preparing export…';
        const result=await context.premiumAction('export',{plan:context.getPlan()});
        if(typeof result.csv!=='string')throw Error('The export could not be returned.');
        const blob=new Blob(['\ufeff',result.csv],{type:'text/csv;charset=utf-8'});
        const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='purchaselens-cash-flow.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
        status.textContent='Export ready.';
      }catch(err){status.textContent=err.message||'Could not export this plan.';}finally{button.disabled=false;}
    }
  }, {signal:controller.signal});
  q('[data-filter]').addEventListener('change',renderTimeline);
  root.addEventListener('keydown',e=>{if(e.altKey&&e.key==='1'){e.preventDefault();q('[data-plan-field="itemName"]').focus()}if(e.altKey&&e.key==='2'){e.preventDefault();q('[data-filter]').focus()}}, {signal:controller.signal});
  updateExtras();render();
  const unmount=()=>{clearTimeout(timer);controller.abort();if(root._unmountPro===unmount)delete root._unmountPro};
  root._unmountPro=unmount;
  return unmount;
}
