/** Server-only entry point. The server authorizes access before invoking it. */
import { calculate } from '../public/engine.js';
import { analyzeDecision } from '../public/decision.js';

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 50000) { process.stdout.write(JSON.stringify({error:'Request is too large.'})); process.exit(1); }
}
try {
  const {action, plan, shockAmount, shockDate} = JSON.parse(input);
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new Error('Enter a valid plan.');
  if (action === 'stress') {
    if (!Number.isFinite(Number(shockAmount)) || Number(shockAmount) <= 0) throw new Error('Enter a positive unexpected expense.');
    const result = analyzeDecision(plan, {buffer:plan.buffer ?? 0, shockAmount, shockDate});
    process.stdout.write(JSON.stringify({stress:result.stress}));
  } else if (action === 'export') {
    const result = calculate(plan);
    const quote = value => {
      let s=String(value);
      // Prevent spreadsheet formula injection in text; numeric balances stay numeric.
      if (typeof value !== 'number' && /^[\s\u0000-\u001f]*[=+\-@]/u.test(s)) s="'"+s;
      return '"'+s.replaceAll('"','""')+'"';
    };
    const rows=[['Date','Event','Cash balance (INR)','EMI balance (INR)'],...result.events.map(e=>[e.date,e.label,e.cashBalance,e.emiBalance])];
    process.stdout.write(JSON.stringify({csv:'\ufeff'+rows.map(row=>row.map(quote).join(',')).join('\r\n')}));
  } else throw new Error('Unknown action.');
} catch (error) {
  process.stdout.write(JSON.stringify({error: error instanceof Error ? error.message : 'Invalid plan.'}));
  process.exitCode=1;
}
