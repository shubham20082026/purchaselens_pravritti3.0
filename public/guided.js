/* The guided journey uses the same plan and calculation engine as Pro. */
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', {maximumFractionDigits:2})}`;
const dateText = value => {
  if (!value) return 'not set';
  const [y,m,d] = value.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'});
};

const steps = [
  {kicker:'YOUR PURCHASE', title:'What are you thinking of buying?', intro:'Tell us what it is and its price before any discounts.', hint:'For example, a phone for ₹38,000. You can change these answers later.', fields:[
    {key:'itemName', label:'Name of the item', type:'text', placeholder:'For example, a phone'},
    {key:'price', label:'Listed price (₹)', type:'number'}]},
  {kicker:'YOUR PURCHASE', title:'When would you buy it?', intro:'Choose the date you would make the purchase.', hint:'We use this date as the starting point for both payment choices.', fields:[
    {key:'purchaseDate',label:'Purchase date',type:'date'}]},
  {kicker:'THE OFFER', title:'Is there a discount for paying the full amount?', intro:'Enter a discount available only if you pay in full.', hint:'If there is no separate discount, enter 0. Do not count the same discount twice.', fields:[
    {key:'cashDiscount',label:'Discount for paying in full (₹)',type:'number'}]},
  {kicker:'THE OFFER', title:'How much would you pay upfront with instalments?', intro:'These are amounts due when you buy, before your monthly payments.', hint:'Use the offer’s actual fees and taxes. An instant discount must apply to these upfront amounts.', fields:[
    {key:'down',label:'Amount paid upfront (₹)',type:'number'},
    {key:'fee',label:'Upfront fees and tax (₹)',type:'number'},
    {key:'emiCashback',label:'Instant discount on those upfront amounts (₹)',type:'number'}]},
  {kicker:'THE OFFER', title:'How would the monthly payments work?', intro:'An EMI is a fixed amount you pay each month. Use the figures shown in your offer.', hint:'Enter the final monthly payment including any charges already included in it.', fields:[
    {key:'emi',label:'Monthly payment (₹)',type:'number'},
    {key:'months',label:'Number of monthly payments',type:'integer'},
    {key:'emiDate',label:'Date of the first payment',type:'date'}]},
  {kicker:'YOUR MONEY', title:'How much money will you have on that day?', intro:'Enter the amount available just before paying for the purchase.', hint:'Only include money you can use for this plan, such as your available bank balance or cash.', fields:[
    {key:'balance',label:'Available money (₹)',type:'number'}]},
  {kicker:'YOUR MONEY', title:'When does money come in?', intro:'Enter the amount you expect each month and the first date you expect it.', hint:'This repeats every month in the estimate. Expected income is not guaranteed.', fields:[
    {key:'income',label:'Money coming in each month (₹)',type:'number'},
    {key:'incomeDate',label:'Next expected date',type:'date'}]},
  {kicker:'YOUR MONEY', title:'What do you need to pay each month?', intro:'Include the things you already need to pay for, such as rent, food and existing instalments.', hint:'These expenses are repeated every month from the date you choose. You can use an estimate.', fields:[
    {key:'expenses',label:'Monthly expenses (₹)',type:'number'},
    {key:'expensesDate',label:'First expense date',type:'date'}]},
  {kicker:'YOUR MONEY', title:'How much would you like to keep aside?', intro:'Choose the amount you want left for emergencies or other needs.', hint:'We will show you if your estimated balance goes below this amount.', fields:[
    {key:'buffer',label:'Amount to keep aside (₹)',type:'number'}]},
  {kicker:'YOUR PLAN', title:'Your money, two ways to pay', intro:'Review your choices before deciding. You can go back and change anything.', hint:'This is an estimate from the dates and amounts you entered. Future bills or changes in income can change the result.', fields:[]}
];

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [y,m,d] = value.split('-').map(Number);
  if(y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y,m,0)).getUTCDate();
}
function addMonths(date, months) {
  const [y,m,d]=date.split('-').map(Number);
  const t=new Date(Date.UTC(y,m-1+months,1));
  return `${String(t.getUTCFullYear()).padStart(4,'0')}-${String(t.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)).getUTCDate())).padStart(2,'0')}`;
}
function validateStep(step, plan) {
  const spec = steps[step];
  for (const field of spec.fields) {
    const value = plan[field.key];
    if (field.type === 'text' && (!String(value ?? '').trim())) return `Please enter ${field.label.toLowerCase()}.`;
    if (field.type === 'date') {
      if (!validDate(value)) return `Please choose a valid ${field.label.toLowerCase()}.`;
      if (field.key !== 'purchaseDate' && validDate(plan.purchaseDate) && (value < plan.purchaseDate || value > addMonths(plan.purchaseDate,36))) return `${field.label} must be on or after the purchase date and within three years.`;
    }
    if (field.type === 'number' || field.type === 'integer') {
      const n = Number(value);
      if (value === '' || value == null || !Number.isFinite(n) || n < 0 || n > 1000000000 || Math.abs(n*100-Math.round(n*100))>1e-6) return `${field.label} must be a valid amount of zero or more, with at most two decimal places.`;
      if (field.type === 'integer' && (!Number.isInteger(n) || n < 1 || n > 36)) return 'Please choose between 1 and 36 monthly payments.';
    }
  }
  if (step === 2 && Number(plan.cashDiscount) > Number(plan.price)) return 'The discount cannot be more than the listed price.';
  if (step === 3 && Number(plan.emiCashback) > Number(plan.down) + Number(plan.fee)) return 'The instant discount cannot be more than the upfront amount plus fees.';
  return '';
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function addSummaryRow(container,label,value) {
  const row=element('div','guide-summary-row');
  row.append(element('span','',label),element('strong','',value));
  container.append(row);
}

/**
 * context: getPlan(), setPlan(patch), getStep(), setStep(zeroBasedStep),
 * compute(plan), navigate(name), help(). setPlan and setStep persist externally.
 * compute returns the same {baseline,bufferBreach,wait} as analyzeDecision.
 */
export function mountGuided(root, context) {
  let alive=true;
  let completed=Boolean(context.getPlan().guidedComplete);
  const clampStep = () => Math.max(0, Math.min(9, Number(context.getStep()) || 0));
  function render() {
    if(!alive) return;
    const plan=context.getPlan();
    const step=clampStep();
    const spec=steps[step];
    root.replaceChildren();
    const shell=element('section','guide-shell');
    const top=element('div','guide-topline');
    top.append(element('span','guide-kicker','LET’S TAKE THIS ONE STEP AT A TIME'),element('span','guide-progress-text',`Step ${step+1} of 10`));
    const track=element('div','guide-progress-track');
    track.setAttribute('role','progressbar');track.setAttribute('aria-label','Plan progress');track.setAttribute('aria-valuemin','1');track.setAttribute('aria-valuemax','10');track.setAttribute('aria-valuenow',String(step+1));
    const fill=element('div','guide-progress-fill');fill.style.width=`${(step+1)*10}%`;track.append(fill);
    const content=element('div','guide-content');content.setAttribute('aria-live','polite');
    const title=element('h1','guide-title',spec.title);title.tabIndex=-1;content.append(element('p','guide-kicker',spec.kicker),title,element('p','guide-intro',spec.intro));
    const hint=element('div','guide-hint');hint.append(element('strong','','A little help'),element('span','',spec.hint));content.append(hint);
    if(step===0) content.append(element('p','guide-note','This starts with an example. Replace the figures with your own before using the result.'));
    const fields=element('div','guide-fields');
    for (const field of spec.fields) {
      const wrapper=element('div','guide-field');
      const label=element('label','guide-label',field.label);label.htmlFor=`guided-${field.key}`;
      const input=element('input','guide-input');input.id=`guided-${field.key}`;input.name=field.key;
      input.type=field.type==='integer'?'number':field.type;
      input.required=true;
      if(field.type==='number' || field.type==='integer'){input.min=field.type==='integer'?'1':'0';input.max=field.type==='integer'?'36':'1000000000';input.step=field.type==='integer'?'1':'0.01';input.inputMode=field.type==='integer'?'numeric':'decimal';}
      if(field.type==='text'){input.maxLength=60;input.autocomplete='off';}
      if(field.placeholder) input.placeholder=field.placeholder;
      input.value=plan[field.key] ?? '';
      input.addEventListener('input',()=>{ completed=false;context.setPlan({[field.key]:input.value,guidedComplete:false}); });
      wrapper.append(label,input);fields.append(wrapper);
    }
    content.append(fields);
    const message=element('div','guide-message');message.setAttribute('role','alert');message.hidden=true;
    if(step===9){
      let failure='';
      for(let i=0;i<9;i++){failure=validateStep(i,plan);if(failure)break;}
      let data;
      if(!failure) try { data=context.compute(plan); } catch(error) { failure=error?.message || 'Please check your earlier answers.'; }
      if (failure) {
        message.textContent=`Please go back and check your answers: ${failure}`;message.hidden=false;
      } else {
        const result=data.baseline || data;
        const summary=element('div','guide-summary');
        addSummaryRow(summary,'Your purchase',String(plan.itemName || 'Purchase'));
        addSummaryRow(summary,'If you pay in full',money(result.cash.totalCost));
        addSummaryRow(summary,'If you pay monthly',money(result.emi.totalCost));
        addSummaryRow(summary,'Amount you want to keep aside',money(plan.buffer));
        addSummaryRow(summary,'Lowest estimated balance, paying in full',money(result.cash.lowestBalance));
        addSummaryRow(summary,'Lowest estimated balance, paying monthly',money(result.emi.lowestBalance));
        const cashGap=Math.max(0,Number(plan.buffer)-result.cash.lowestBalance), monthlyGap=Math.max(0,Number(plan.buffer)-result.emi.lowestBalance);
        addSummaryRow(summary,'Amount needed to protect your cushion, paying in full',money(cashGap));
        addSummaryRow(summary,'Amount needed to protect your cushion, paying monthly',money(monthlyGap));
        const difference=result.emi.totalCost-result.cash.totalCost;
        const statement=difference>0 ? `Paying monthly costs ${money(difference)} more in total.` : difference<0 ? `Paying monthly costs ${money(-difference)} less in total.` : 'Both ways have the same total cost.';
        const note=element('p','guide-note',statement+' Your actual balance will depend on income and expenses arriving as entered.');
        summary.append(note);
        if(data.bufferBreach){
          const b=data.bufferBreach;
          const text=(name,x)=>x?`${name}: after ${x.label.toLowerCase()} on ${dateText(x.date)}, your money falls below the amount you want to keep.`:`${name}: no dip below your chosen amount in this estimate.`;
          summary.append(element('p','guide-note',text('Pay in full',b.cash)+' '+text('Pay monthly',b.emi)));
        }
        content.append(summary);
      }
      if(completed){const confirmation=element('div','guide-confirmation');confirmation.setAttribute('role','status');confirmation.append(element('strong','','Your plan is ready.'),element('p','','You can review or change your answers whenever you need.'));content.append(confirmation);}
    }
    content.append(message);
    const actions=element('div','guide-actions');
    if(step>0){const back=element('button','guide-back btn btn-secondary','← Back');back.type='button';back.addEventListener('click',()=>{context.setStep(step-1);render();root.querySelector('.guide-title')?.focus({preventScroll:true})});actions.append(back);}
    const next=element('button','guide-next btn btn-primary',step===9?'Finish my plan':'Continue →');next.type='button';
    next.addEventListener('click',()=>{
      const current=context.getPlan();
      const error=validateStep(step,current);
      if(error){message.textContent=error;message.hidden=false;return;}
      if(step===9){
        try { for(let i=0;i<9;i++){const e=validateStep(i,current);if(e)throw Error(e);} context.compute(current);context.setPlan({guidedComplete:true});completed=true;render(); }
        catch(e){message.textContent=e?.message || 'Please check your earlier answers.';message.hidden=false;}
        return;
      }
      context.setStep(step+1);render();root.querySelector('.guide-title')?.focus({preventScroll:true});
    });
    actions.append(next);content.append(actions);shell.append(top,track,content);root.append(shell);
  }
  render();
  return () => {alive=false;root.replaceChildren();};
}
