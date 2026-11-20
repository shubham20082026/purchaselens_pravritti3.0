// Landing page + pricing content for PurchaseLens.
// Merges the marketing site (example, how it works, pricing, FAQ) into the app,
// wired to the app's real actions via data-* attributes handled in app.js.

const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');

// Illustrative offer shown on the landing page (not the user's plan).
const SAMPLE = { item: 'Laptop', price: 62000, cashDiscount: 3000, down: 8000, emi: 5200, months: 12 };

function sampleChart() {
  const cash = SAMPLE.price - SAMPLE.cashDiscount;
  const total = SAMPLE.down + SAMPLE.emi * SAMPLE.months;
  const W = 560, H = 240, L = 54, R = 16, T = 16, B = 38;
  const top = 80000;
  const x = m => L + (m / SAMPLE.months) * (W - L - R);
  const y = v => T + (1 - v / top) * (H - T - B);
  const monthly = Array.from({ length: SAMPLE.months + 1 }, (_, m) => [m, SAMPLE.down + SAMPLE.emi * m]);
  const monthlyPath = monthly.map(([m, v], i) => `${i ? 'L' : 'M'}${x(m).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const cashPath = `M${x(0).toFixed(1)} ${y(cash).toFixed(1)} L${x(SAMPLE.months).toFixed(1)} ${y(cash).toFixed(1)}`;
  const grid = [0, 20000, 40000, 60000, 80000].map(v =>
    `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="lc-grid"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="lc-axis">${v ? '₹' + v / 1000 + 'k' : '0'}</text>`).join('');
  const ticks = [[0, 'Today'], [6, '6 months'], [12, '12 months']].map(([m, t]) =>
    `<text x="${x(m)}" y="${H - 12}" text-anchor="${m === 0 ? 'start' : m === 12 ? 'end' : 'middle'}" class="lc-axis">${t}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cumulative payments over 12 months: paying in full is ${inr(cash)} today; paying monthly climbs to ${inr(total)} by month 12." class="lc-svg">${grid}<path d="${cashPath}" class="lc-line lc-cash"/><path d="${monthlyPath}" class="lc-line lc-monthly"/><circle cx="${x(0)}" cy="${y(cash)}" r="4" class="lc-dot lc-cash-dot"/><circle cx="${x(SAMPLE.months)}" cy="${y(total)}" r="4" class="lc-dot lc-monthly-dot"/>${ticks}</svg>`;
}

function exampleSection() {
  const cash = SAMPLE.price - SAMPLE.cashDiscount;
  const total = SAMPLE.down + SAMPLE.emi * SAMPLE.months;
  return `<div class="section lp-section" id="example" tabindex="-1">
    <div class="section-label"><span class="eyebrow">AN EXAMPLE, SIDE BY SIDE · ${SAMPLE.item.toUpperCase()} · ${inr(SAMPLE.price)}</span><h2>Two ways to pay. One clearer view.</h2></div>
    <div class="lp-example">
      <div class="lp-compare">
        <article class="lp-path"><span class="eyebrow">PAY IN FULL</span><strong class="lp-amount">${inr(cash)}</strong><p>${inr(SAMPLE.cashDiscount)} cash discount · paid today</p></article>
        <article class="lp-path lp-path-alt"><span class="eyebrow">PAY MONTHLY</span><strong class="lp-amount">${inr(total)}</strong><p>${inr(SAMPLE.down)} down · ${inr(SAMPLE.emi)} × ${SAMPLE.months} months</p></article>
        <p class="lp-verdict">Paying monthly costs <strong>${inr(total - cash)} more</strong> in total.</p>
        <p class="small-note">Before fees or other costs. Example based on the offer shown. Your results depend on what you enter.</p>
      </div>
      <figure class="lp-chart"><figcaption class="eyebrow">CUMULATIVE PAYMENTS</figcaption>${sampleChart()}<div class="lp-legend"><span><i class="lc-key lc-cash"></i>Full payment</span><span><i class="lc-key lc-monthly"></i>Monthly payments</span></div></figure>
    </div>
    <ul class="lp-chips"><li>Compare total cost</li><li>Track your monthly balance</li><li>Keep your cushion in view</li></ul>
  </div>`;
}

function howSection() {
  const steps = [
    ['01', '₹', 'Start with the offer', 'Add the price, any cash discount, and the instalment details.'],
    ['02', '↕', 'Set the real-life context', 'Include your income, regular expenses and the cushion you want to keep aside.'],
    ['03', '⌁', 'See both paths unfold', 'Compare total costs and how each choice changes your balance over time.']
  ];
  return `<div class="section lp-section" id="how-it-works" tabindex="-1">
    <div class="section-label"><span class="eyebrow">A DECISION, WITH CONTEXT</span><h2>The number on the tag <em>is only the beginning.</em></h2><p>Bring the costs, paydays and bills together. Then compare the paths on the same timeline.</p></div>
    <ol class="lp-steps">${steps.map(([n, icon, t, d]) => `<li class="lp-step"><span class="lp-step-n">${n}</span><span class="lp-step-icon" aria-hidden="true">${icon}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol>
  </div>`;
}

function modesSection() {
  return `<div class="section choose-section" id="modes" tabindex="-1">
    <div class="section-label"><span class="eyebrow">YOUR PACE, YOUR PREFERENCE</span><h2>Two ways to get <em>to a clearer answer.</em></h2><p>Choose how you like to think. You can change your view whenever you want.</p></div>
    <div class="mode-choices">
      <button class="mode-option" data-mode="guided"><span class="mode-index">01 / GUIDED</span><strong>Guide me step by step</strong><span>A calm, one-question-at-a-time path with plain-language tips along the way.</span><b>Take me through it &nbsp; ↗</b></button>
      <button class="mode-option" data-mode="pro"><span class="mode-index">02 / PRO</span><strong>Show me everything</strong><span>A full workspace for offers, timelines and the details that might shift the result.</span><b>Open the workspace &nbsp; ↗</b></button>
    </div>
    <p class="small-note">Try it with an example first. <button class="text-link" id="landing-auth">Create an account</button> to save across devices.</p>
  </div>`;
}

function perspectiveBand() {
  return `<div class="lp-band"><span class="eyebrow">FOR THE MOMENTS IN BETWEEN</span><h2>Not a yes or no. <em>A little more perspective.</em></h2><p>For the laptop, the phone, the course or the trip you’ve been considering. See what the offer means for your money over time, not just what it costs today.</p></div>`;
}

// ---- Pricing (single source of truth for landing + Plans page) ----
const FREE = [
  'Guided and Pro experiences',
  'Cash vs instalment cost and cushion comparison',
  'Wait-to-buy snapshot and dated timeline',
  'Up to 10 saved plans and account sync'
];
const PREMIUM_LIVE = ['Everything in Free', 'Unexpected-expense scenarios', 'CSV export'];
const PREMIUM_PLANNED = ['Compare up to 3 offers', 'PDF export', 'Unlimited named plans'];
const list = items => `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
const planned = `<p class="lp-planned"><span class="eyebrow">PLANNED, NOT YET AVAILABLE</span></p><ul class="lp-planned-list">${PREMIUM_PLANNED.map(i => `<li>${i}</li>`).join('')}</ul>`;

function pricingSection() {
  return `<div class="section pricing lp-section" id="landing-pricing" tabindex="-1">
    <div class="section-label"><span class="eyebrow">SIMPLE, CLEAR PRICING</span><h2>Start with the full picture.</h2><p>Core comparisons stay open to everyone. Extra planning tools are there when you need them.</p></div>
    <div class="pricing-grid lp-pricing-two">
      <article class="price-card"><span class="eyebrow">FREE · THE ESSENTIALS</span><h2>Free</h2><div class="price">₹0 <small>/ always</small></div><p>Everything you need to compare the two ways of paying.</p>${list(FREE)}<button class="btn btn-ghost" type="button" data-scroll="modes">Get started</button></article>
      <article class="price-card featured"><span class="eyebrow">PREMIUM · MORE ROOM TO EXPLORE</span><h2>Premium</h2><div class="price">₹99 <small>/ month · illustrative</small></div><p>Or ₹899 per year. For exploring what-if scenarios and taking your work with you.</p>${list(PREMIUM_LIVE)}${planned}<button class="btn btn-primary" type="button" data-go="pricing">See plans →</button></article>
    </div>
    <p class="small-note">Prices are illustrative. No payment is taken on this page and no subscription can be activated in this version.</p>
  </div>`;
}

export function pricingPageHTML() {
  return `<section class="section pricing"><span class="eyebrow">PLANS / MADE TO FIT</span><h1>A little more clarity<br>when you need it.</h1><p class="muted">The essentials stay free. Premium is a preview of what we plan to offer.</p><div class="notice"><strong>Prototype checkout</strong> · Prices below are illustrative. No payment is collected and no subscription is activated.</div><div class="pricing-grid"><article class="price-card"><span class="eyebrow">THE ESSENTIALS</span><h2>Free</h2><div class="price">₹0 <small>/ always</small></div><p>For a thoughtful decision, every time.</p>${list(FREE)}<button class="btn btn-ghost" id="free-plan" type="button">Continue with Free</button></article><article class="price-card featured"><span class="eyebrow">FOR MORE WAYS TO EXPLORE</span><h2>Premium monthly</h2><div class="price">₹99 <small>/ month · illustrative</small></div><p>Explore more scenarios and take your work with you.</p>${list(PREMIUM_LIVE)}${planned}<button class="btn btn-primary mock-button" data-plan="monthly" type="button">Preview checkout →</button></article><article class="price-card"><span class="eyebrow">PLAN AHEAD</span><h2>Premium yearly</h2><div class="price">₹899 <small>/ year · illustrative</small></div><p>The same features with an annual option.</p><ul><li>All monthly Premium features</li><li>Annual billing option</li><li>Save ₹289 compared with 12 monthly payments</li></ul><button class="btn btn-ghost mock-button" data-plan="yearly" type="button">Preview checkout →</button></article></div><p class="small-note">No real payment integration is connected in this version.</p></section>`;
}

function faqSection() {
  const qa = [
    ['What does EMI mean?', 'EMI means equated monthly instalment: a fixed payment you make each month over an agreed number of months.'],
    ['Does PurchaseLens tell me what to buy?', 'No. It compares the costs and dated money movements using what you enter, so you can decide with more context.'],
    ['Is this financial advice?', 'No. PurchaseLens is a planning and education tool. Results are estimates based on what you entered, not financial advice.']
  ];
  return `<div class="section lp-section" id="faq" tabindex="-1">
    <div class="section-label"><span class="eyebrow">A FEW GOOD QUESTIONS</span><h2>Before you decide.</h2></div>
    <div class="lp-faq">${qa.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
  </div>`;
}

export function landingHTML() {
  return `<section class="landing">
    <div class="hero">
      <div class="hero-copy">
        <span class="eyebrow">YOUR CUSHION, TWO WAYS TO PAY</span>
        <h1>Before you buy,<br><em>see the full picture.</em></h1>
        <p>Cash today or monthly instalments? See what each choice really asks of your money, month by month.</p>
        <div class="hero-note"><span class="note-dot"></span> ₹ Made for everyday decisions, in Indian rupees. Compare two ways to pay against the money you want to keep.</div>
        <div class="hero-actions">
          <div class="lp-cta-row"><button type="button" class="btn btn-primary" id="try-demo">Try demo <span aria-hidden="true">↗</span></button><button type="button" class="btn btn-ghost" data-scroll="modes">Find your way</button><button type="button" class="btn btn-ghost" data-scroll="example">See a real example</button></div>
          <p class="demo-note">A private sample session with all features. No sign-up or payment.</p>
          <p class="error" id="demo-error" role="alert" hidden></p>
        </div>
        <p class="lp-credit">Built by <strong>Shubham Parmar</strong> · Team ORIGINAL_anomaly</p>
      </div>
      <div class="hero-orbit" aria-hidden="true"><span>₹</span><small>MORE CLARITY<br>LESS GUESSWORK</small></div>
    </div>
    <nav class="lp-subnav" aria-label="On this page"><button type="button" data-scroll="how-it-works">How it works</button><button type="button" data-scroll="modes">Choose your view</button><button type="button" data-scroll="landing-pricing">Pricing</button><button type="button" data-scroll="faq">FAQ</button></nav>
    ${exampleSection()}
    ${howSection()}
    ${modesSection()}
    ${perspectiveBand()}
    ${pricingSection()}
    ${faqSection()}
    <div class="ticker"><span>NO BANK CONNECTION</span><span>ACTUAL OFFER COSTS</span><span>YOUR CHOSEN CUSHION</span><span>PRIVACY IN YOUR HANDS</span></div>
  </section>`;
}
