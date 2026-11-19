/** Named snapshots and an optional, user-imported calendar reminder. */
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
};
const button = (label, className = 'btn btn-ghost') => {
  const node = el('button', className, label);
  node.type = 'button';
  return node;
};
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [y,m,d] = value.split('-').map(Number);
  return y >= 1900 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y,m,0)).getUTCDate();
}
function dateLabel(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}
function escapeCalendar(text) {
  return String(text).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
}
// Fold calendar lines by UTF-8 octet length, as required by RFC 5545.
function foldLine(line) {
  const encoder = new TextEncoder();
  let result = '', length = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (length + size > 75) { result += '\r\n '; length = 1; }
    result += ch;
    length += size;
  }
  return result;
}
function calendarFile(date, title) {
  const [year, month, day] = date.split('-').map(Number);
  const end = new Date(Date.UTC(year,month-1,day+1));
  const dateOnly = d => `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
  const stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@purchaselens.local`;
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//PurchaseLens//Plan Reminder//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${date.replaceAll('-','')}`,`DTEND;VALUE=DATE:${dateOnly(end)}`,`SUMMARY:${escapeCalendar('Review your purchase plan: '+title)}`,'DESCRIPTION:Review the offer and your PurchaseLens plan before you decide.','BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Review your purchase plan tomorrow.','TRIGGER:-P1D','END:VALARM','END:VEVENT','END:VCALENDAR'];
  return lines.map(foldLine).join('\r\n')+'\r\n';
}

/**
 * context: getPlan(), getTemplates() -> [{name, plan, savedAt}],
 * saveTemplate(name), loadTemplate(index), deleteTemplate(index), navigate(view).
 * Template mutations must persist through the caller's ordinary autosave.
 */
export function mountPlans(root, context) {
  let notice = '';
  let pending = null;
  let alive = true;
  function render() {
    if (!alive) return;
    root.replaceChildren();
    const page = el('section','plans-page section');
    page.append(el('span','eyebrow','YOUR DECISION LIBRARY'),el('h1','plans-title','Pick up where you left off.'),el('p','muted','Save a copy of a plan to revisit later. Your current plan continues to save as you edit it.'));

    const layout = el('div','plans-layout');
    const left = el('section','plans-panel');
    left.append(el('h2','','Save this plan'),el('p','muted','Give the current plan a name. A snapshot includes its amounts, dates and expenses.'));
    const form = el('form','plans-save-form');
    const nameWrap = el('div','field');
    const nameLabel = el('label','','Snapshot name');
    nameLabel.htmlFor = 'snapshot-name';
    const nameInput = el('input');
    nameInput.id='snapshot-name'; nameInput.type='text';nameInput.required=true;nameInput.maxLength=60;
    nameInput.placeholder='e.g. Laptop offer';
    nameWrap.append(nameLabel,nameInput);
    const save = el('button','btn btn-primary','Save a snapshot');save.type='submit';
    form.append(nameWrap,save);
    const result = el('p','plans-message',notice);result.setAttribute('role','status');result.setAttribute('aria-live','polite');
    left.append(form,result);

    const list = el('section','plans-panel');
    const listHead = el('div','plans-list-head');
    listHead.append(el('h2','','Saved plans'));
    const templates = Array.isArray(context.getTemplates()) ? context.getTemplates() : [];
    listHead.append(el('span','plans-count',`${templates.length} / 10`));list.append(listHead);
    if (!templates.length) list.append(el('p','plans-empty','No saved plans yet. Save one when you want to compare an offer later.'));
    templates.forEach((item,index)=>{
      const row = el('article','plans-entry');
      const info = el('div','plans-entry-info');
      info.append(el('h3','',item && item.name ? item.name : 'Saved plan'));
      const when=dateLabel(item?.savedAt);
      info.append(el('p','muted',`${item?.plan?.itemName || 'Purchase'}${when ? ` · Saved ${when}` : ''}`));
      const actions=el('div','plans-entry-actions');
      if(pending && pending.index===index){
        const confirmation=el('p','plans-confirm',pending.kind==='load'?'Loading this snapshot replaces your current plan. Continue?':'Remove this snapshot? Your current plan will stay as it is.');
        confirmation.setAttribute('role','status');info.append(confirmation);
        const yes=button(pending.kind==='load'?'Replace current plan':'Remove snapshot','btn btn-primary');
        const cancel=button('Cancel');
        yes.addEventListener('click',()=>{
          try {
            if(pending.kind==='load') {context.loadTemplate(index);pending=null;notice='Snapshot loaded. Check the save status above.';render();}
            else {context.deleteTemplate(index);pending=null;notice='Snapshot removed. Check the save status above.';render();}
          } catch(e) {notice=e?.message || 'Could not update the snapshot.';pending=null;render();}
        });
        cancel.addEventListener('click',()=>{pending=null;notice='';render()});
        actions.append(yes,cancel);
      } else {
        const load=button('Load');load.setAttribute('aria-label',`Load ${item?.name || 'saved plan'}`);
        const remove=button('Remove');remove.setAttribute('aria-label',`Remove ${item?.name || 'saved plan'}`);
        load.addEventListener('click',()=>{pending={kind:'load',index};notice='';render()});
        remove.addEventListener('click',()=>{pending={kind:'delete',index};notice='';render()});
        actions.append(load,remove);
      }
      row.append(info,actions);list.append(row);
    });
    layout.append(left,list);page.append(layout);

    const reminder=el('section','plans-panel plans-reminder');
    reminder.append(el('span','eyebrow','A GENTLE NUDGE'),el('h2','','Add a calendar reminder'),el('p','muted','Download a reminder and import it into your calendar. Your calendar decides whether to notify you; PurchaseLens does not send reminders.'));
    const reminderForm=el('form','plans-reminder-form');
    const dateWrap=el('div','field');const dateLabelEl=el('label','','Date to review your plan');dateLabelEl.htmlFor='reminder-date';
    const dateInput=el('input');dateInput.id='reminder-date';dateInput.type='date';dateInput.required=true;
    const plan=context.getPlan() || {};dateInput.value=validDate(plan.emiDate) ? plan.emiDate : '';
    dateWrap.append(dateLabelEl,dateInput);
    const download=el('button','btn btn-ghost','Download calendar reminder');download.type='submit';
    const reminderMessage=el('p','plans-message');reminderMessage.setAttribute('role','status');
    reminderForm.append(dateWrap,download,reminderMessage);
    reminderForm.addEventListener('submit',event=>{
      event.preventDefault();
      if(!validDate(dateInput.value)){reminderMessage.textContent='Choose a valid date between 1900 and 2099.';return;}
      try {
        const text=calendarFile(dateInput.value,String(plan.itemName || 'your purchase').slice(0,60));
        const url=URL.createObjectURL(new Blob([text],{type:'text/calendar;charset=utf-8'}));
        const link=document.createElement('a');link.href=url;link.download='purchaselens-reminder.ics';
        document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
        reminderMessage.textContent='Calendar file prepared. Import it into your calendar to use the reminder.';
      } catch {reminderMessage.textContent='Could not create the reminder on this device.';}
    });
    reminder.append(reminderForm);page.append(reminder);
    const returnButton=button('← Back to my plan');
    returnButton.addEventListener('click',()=>context.navigate('app'));
    page.append(returnButton);root.append(page);

    form.addEventListener('submit',event=>{
      event.preventDefault();
      const name=nameInput.value.trim();
      if(!name){result.textContent='Enter a name for your snapshot.';nameInput.focus();return;}
      if(name.length>60){result.textContent='Use a name with 60 characters or fewer.';return;}
      if(templates.length>=10){result.textContent='You have 10 snapshots. Remove one before saving another.';return;}
      try{context.saveTemplate(name);notice='Snapshot added. Check the save status above.';pending=null;render();}
      catch(e){result.textContent=e?.message || 'Could not save the snapshot.';}
    });
  }
  render();
  return ()=>{alive=false;root.replaceChildren()};
}
