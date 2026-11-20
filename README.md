
# PurchaseLens by ORIGINAL_anomaly • Shubham Parmar

**See the full picture before you buy.**

PurchaseLens is an early product prototype for comparing an upfront purchase with monthly instalments. It shows the cost of an offer, the estimated effect of payments on a user's cash flow, and how those payments may affect a cushion the user wants to keep. It is intended for planning and education; it is not a lender or financial adviser.

## Status

This repository is a **development prototype**, not a finished or independently audited financial product. Accounts and saved progress use a real SQLite database, while the payment flow is a non-billing mock. Premium subscriptions cannot be purchased or activated in this version. Google sign-in, email verification and account recovery are not implemented. Do not publish or use it to collect real user financial data until the launch work below is complete.

## What is in the prototype

- A **landing page** with a worked example (laptop, pay in full vs monthly), how-it-works steps, Guided/Pro choice, pricing and FAQ, merged from the standalone PurchaseLens pricing guide site.
- A private **Try demo** session with realistic sample data and temporary Premium tools; each demo is independent, expires after 24 hours, and is removed on exit.
- A **Guided** experience with ten steps, plain-language prompts, hints, Back navigation, a progress indicator and a summary.
- A **Pro** workspace with editable inputs, a comparison, cash-flow chart, timeline filtering, an assumption receipt, keyboard shortcuts, and a bulk one-time-expense entry action.
- An offer breakdown for the listed price, cash-only discount, instalments and applicable upfront fees and tax entered by the user.
- A user-chosen cushion, the first projected event below that cushion, and the amount by which the lowest balance falls short.
- A wait-to-buy snapshot that shows a modelled event after which a cash purchase could leave the chosen cushion intact **at that moment**. Later bills can still reduce the balance.
- A Premium **scenario lab** to model an unexpected expense, and a Premium CSV export. These have server-side tier checks; the mock checkout does not activate access.
- Email and password registration and sign-in, a profile, mode and appearance settings, password changes, account deletion and automatic saving of a single plan and wizard progress.
- Up to 10 named plan snapshots, with confirmation before loading or deleting one, and an optional `.ics` reminder for manual import into a calendar.
- Dark and light appearances, a larger-text option, responsive layouts and an always-available Help button.
- Draft Privacy and Terms screens that must be reviewed and completed before public launch.

These are product hypotheses and need user testing. Other products offer overlapping features; the project does not claim exclusive ownership of these ideas.

## Pravritti 2026 — judging criteria overview

PurchaseLens is presented as a **build-first financial decision-support prototype**. Its core question is practical: *Will paying now or paying monthly leave enough money available when upcoming expenses arrive?* The product turns an offer into two dated cash-flow paths and makes potential cushion shortfalls visible rather than reducing the choice to an EMI amount alone.

| Judging criterion | PurchaseLens evidence | What remains to validate |
|---|---|---|
| Problem–solution fit | Side-by-side cash/instalment comparison, dated cushion breaches, Guided and Pro flows | User interviews, observed comprehension and decision outcomes |
| Market and viability | Defined initial audience and proposed Free/Premium pricing | TAM/SAM, conversion, retention and willingness-to-pay research |
| Differentiation | Combined dated-cushion comparison, explanation and scenario workflow | Competitive user testing and durable defensibility |
| Execution and financials | Local runnable FastAPI/SQLite application, deterministic engine, tests | Production hosting, cost estimates, payment integration and forecasts |
| Team and pitch | Reproducible demonstration flow and suggested role/pitch structure | Named owners, measured team contributions and rehearsed Q&A |
| **Working prototype (30%)** | **Runnable app, real account persistence, Guided/Pro workflows, sample demo, calculations and test commands** | **Live demonstration and independent verification by judges** |

The table maps existing implementation and proposed business hypotheses to the rubric; it is not evidence of external validation or commercial traction.

## The problem, intended users and proposed value

A purchase can look affordable when viewed as a monthly payment yet strain cash flow on a particular date. Conversely, paying in full may reduce total cost but leave too little cushion before rent, bills or other expenses. PurchaseLens is designed to make this **timing-versus-total-cost trade-off** easier to inspect.

**Initial audience hypothesis:** students, early-career earners and budget-conscious online shoppers considering electronics or other discretionary purchases with upfront and instalment options. **Potential distribution hypothesis:** campus demonstrations, financial-literacy communities and educational content about purchase decisions. These segments and channels have not been validated with research.

**Proposed advantage:** instead of asking only which offer has a smaller instalment or total cost, the app shows *when* each option may cross a user-defined cushion, *what event* causes it and *how large* the shortfall is. Guided mode prioritizes comprehension; Pro mode allows faster inspection and adjustment. This is a testable positioning claim, not proof that PurchaseLens outperforms competitors.

**Validation plan:** interview prospective users about their last major purchase; observe whether they can correctly identify a cushion breach with and without the tool; record time to complete a comparison, comprehension, perceived usefulness and intent to return. No interview counts, satisfaction percentages or validated outcomes are claimed here.

## Market opportunity and business hypothesis

The initial market is people who independently compare upfront and instalment offers and are willing to enter their financial assumptions manually. Broader markets could include financial education and embedded decision-support experiences, subject to testing and appropriate partnerships.

- **TAM (to research):** all potential users in the selected geography who make relevant purchase decisions. Define the geography, time period and source before estimating.
- **SAM (to research):** reachable users who compare these offers digitally and can use a manual-entry tool.
- **SOM (to test):** the subset that could realistically be acquired through the first distribution channels over a defined period.

**Monetization hypothesis:** retain core comparisons and cushion warnings for free; offer scenario simulation and exports as Premium benefits. The illustrative ₹99/month and ₹899/year prices are already documented below. The annual illustration equals about ₹74.92/month and offers about 24.3% savings relative to 12 monthly payments; neither price has been tested for willingness to pay.

**Unit-economics framework (not actual results):** contribution per paying user = subscription revenue minus payment processing, incremental infrastructure and support costs; customer acquisition cost = acquisition spend divided by newly acquired customers; assess retention, refunds and lifetime value only after obtaining real usage data. Do not infer profitability from the low-cost prototype stack alone.

## Competitive positioning and defensibility

The existing competitor links below identify products with overlapping capabilities. **Direct alternatives** include purchase/EMI comparison and purchase pressure-testing tools; **indirect alternatives** include spreadsheets, generic budgeting apps and manual calculations. The proposed wedge is a single, date-specific decision view that combines total offer cost, projected balances, a chosen cushion and the triggering event, with Guided and Pro paths for different comfort levels.

**Defensibility is currently limited.** Deterministic calculations and interface design can be replicated. Potential longer-term advantages—trusted explanations, user-tested workflows, distribution partnerships and a reputation for transparent assumptions—must be earned and demonstrated. No proprietary dataset, patent or network effect is claimed.

## Go-to-market, feasibility and financial planning

**Proposed staged rollout:** (1) demonstrate the local prototype with synthetic data; (2) run supervised usability tests and refine the calculations and explanations; (3) complete the security, legal, accessibility and production work listed below; (4) launch a small, measured pilot; (5) test Premium demand before investing in broader acquisition.

**Cost categories to budget:** hosting and database backups, domain and monitoring, payment fees, security/legal review, customer support, maintenance and user acquisition. Current repository contents do not establish actual operating costs, revenue, margins or a break-even date.

| Planning scenario | Illustrative paying users | Monthly gross revenue at ₹99/month | Interpretation |
|---|---:|---:|---|
| Small pilot | 25 | ₹2,475 | Hypothetical, before all costs and taxes |
| Early traction | 100 | ₹9,900 | Hypothetical, not a forecast |
| Expanded pilot | 500 | ₹49,500 | Hypothetical, not a forecast |

These examples assume every listed user pays the monthly price for that month; they do not model annual subscriptions, churn, refunds, taxes, acquisition costs or payment failures. They are arithmetic illustrations, **not projections of expected demand**.

**Key risks and mitigations:** inaccurate user inputs → visible assumptions and editable data; false confidence in future balances → dated warnings and explicit limitations; sensitive financial data → synthetic demo and no public data collection before security review; weak willingness to pay → pricing interviews and conversion tests; scaling limitations → production database and shared infrastructure before multi-instance deployment; competitor overlap → test the differentiated workflow rather than claiming novelty.

## Judge-ready live prototype walkthrough (30% of score)

The highest-weighted criterion is a functioning MVP. A suggested demonstration using **synthetic figures only** is:

1. Start the app using the commands below and open the landing page.
2. Choose **Try demo** and show the prefilled example without creating a real financial profile.
3. Open **Guided** mode, explain the purchase and cushion inputs, and reach the comparison summary.
4. Switch to **Pro** mode to show the dated cash-flow chart, first cushion breach and assumption receipt.
5. Change a purchase amount, instalment or one-time expense to show that the result responds to inputs; optionally demonstrate the wait-to-buy snapshot.
6. In the isolated demo, show the unexpected-expense scenario and CSV export, explaining that normal Premium checkout is **mock only**.
7. Show account saving/snapshots or run the documented test commands as supporting technical evidence if time allows.

**Demo integrity:** a successful local run and test results should be demonstrated live, not assumed from README claims. Avoid presenting simulated checkout as a payment integration or synthetic inputs as customer validation. Keep a short screen recording as a fallback if permitted by the event rules.

---

## Product positioning and competitors

**Core product promise:** show how the same purchase offer affects the money a user wants to keep, under both paying in full and instalments. The central comparison shows the first dated breach, the event causing it, and the amount below the chosen cushion.

- [Paisavy](https://www.paisavy.com/afford/) already compares payment choices and tests weak months.
- [CardTrail](https://cardtrail.in/tools/emi-cost/) focuses on the full cost of no-cost EMI offers.
- [Expenlio](https://expenlio.com/) already offers purchase pressure tests and broader financial planning.

The two-path, dated-cushion presentation and Guided/Pro handoff are a product positioning hypothesis, not a proven exclusive invention. Test with real users before making exclusivity or outcome claims.

## Free and Premium

| | Free | Premium monthly / yearly |
|---|---|---|
| Guided and Pro interfaces | Included | Included |
| Upfront vs instalment costs, cushion and dated cash flow | Included | Included |
| Current plan, 10 snapshots and progress | Included | Included |
| Compare up to 3 offers, PDF export, unlimited named plans | Not available | Planned, not yet built |
| Unexpected-expense scenario and CSV export | Locked | Intended to be included |
| Illustrative price | ₹0 | ₹99/month or ₹899/year |

The core comparison and reserve warnings stay free because they are essential to an informed choice. Scenario simulation and export are proposed Premium features. Prices and packages are examples, not live offers. Clicking **Preview checkout** makes no charge and does not upgrade the account. The mock checkout has no payment provider or verified webhook. Without a real billing integration, Premium actions remain inaccessible to normal Free accounts. The isolated 24-hour demo temporarily enables them for evaluation; it does not create a paid subscription.

## Stack

- **Frontend:** vanilla HTML, CSS and JavaScript modules. No frontend build step or external UI libraries are needed.
- **Backend:** FastAPI with Uvicorn for JSON API endpoints and serving static files.
- **Storage:** SQLite for accounts, sessions and a user's current saved state. Financial plan amounts are manually entered; there is no bank connection.
- **Security:** password hashing uses Python's `hashlib.scrypt` with random salts. Opaque random session tokens are hashed in the database and sent in HttpOnly, SameSite cookies. Mutating API requests have origin/request checks, and login requests have a basic process-local rate limit.
- **Calculation engine:** shared JavaScript modules provide deterministic, date-based calculations in paise. Premium actions run the shared calculations on the server with Node.js and require server-checked entitlement.

## Run on Windows with the launcher

1. Extract the entire ZIP to a folder on your computer.
2. Install Python 3.10 or newer, then double-click `launch.bat` in that folder.
3. On the first run, the launcher creates a virtual environment and installs the required Python packages. An internet connection is needed for this installation.
4. Keep the launcher window open while using the app. It opens `http://127.0.0.1:8000` in your default browser. Press Ctrl+C in the window to stop the server.

Node.js 18 or newer is needed for server-side Premium calculations. Premium checkout remains a mock. If the browser does not open, visit the address above yourself.

## Run locally

You need **Python 3.10+**, `pip`, and **Node.js 18+** available on your `PATH`. Node is used for server-side Premium calculations and CSV generation. The rest of the application serves directly from the Python server.

1. Unzip the project and open a terminal **inside the project folder** containing `server.py` and `requirements.txt`.
2. Create and activate a virtual environment:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

   On Windows PowerShell, run `.venv\Scripts\Activate.ps1` instead.

3. Install the Python dependencies and start the development server:

   ```bash
   pip install -r requirements.txt
   uvicorn server:app --reload --host 127.0.0.1 --port 8000
   ```

4. Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

Run the app through the server; opening `public/index.html` directly cannot provide the account API and saved progress. The starter example is sample data: replace it with figures from the actual offer before interpreting the result.

To use the app on a different device, that device must be able to reach an appropriately configured server. `127.0.0.1` refers only to the device on which the server runs. Do not expose the development server to the internet as a production deployment.

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `DB_PATH` | `data/purchaselens.sqlite3` in the project | Location of the SQLite database. Use a durable, backed-up disk when deploying. |
| `PUBLIC_ORIGIN` | Derived from the incoming request | The exact public origin allowed for mutating requests, such as `https://example.com`; set this explicitly behind a proxy. |
| `COOKIE_SECURE` | Disabled | Set to `1` behind HTTPS so the session cookie is only sent over secure connections. |

The database is created automatically when the server starts. `.gitignore` excludes the local database, environment files and Python virtual environment. Never commit real customer data or secrets.

## Run the checks

With the virtual environment active, install the development dependencies and run the tests:

```bash
pip install -r requirements-dev.txt
python -m unittest discover -s tests -p 'test_*.py'
npm test
```

The test suite uses a temporary SQLite database and does not need a payment provider. Browser and accessibility testing on real devices is still required.

## Accounts and saving

You can explore an example without registering; guest state is kept in the browser on that device and may be removed if browser data is cleared. Create an account or sign in to save the current plan, chosen mode, appearance and Guided step to the server. Once signed in, the app attempts to save changes automatically and displays a status. A revision check prevents one session from silently overwriting a newer version saved by another; if a conflict occurs, reload and review the latest plan.

One current plan and up to 10 named snapshots per account are stored in the saved state. Signing up from a guest session saves the current guest plan to the new account. Signing into an existing account loads that account's saved plan. The profile provides name editing, password changes and permanent deletion; deletion removes the account's stored plan and sessions.

Password reset and email verification are not available. Do not use a real or reused password while evaluating this prototype.

### Demo and reminders

The landing page's **Try demo** button creates a separate synthetic user and session, with Premium demonstration access. Demo data expires after 24 hours and is deleted on exit or during scheduled/startup cleanup. Existing account users must sign out before opening a demo so their active session is not replaced. Do not enter personal financial data in the demo. Demo use is subject to a basic rate limit; Node.js is needed for Premium demo calculations.

The reminder downloads an `.ics` calendar file. The user must import it into a calendar; PurchaseLens does not send notifications. A reminder is useful as an optional prompt to review a decision, not a guarantee that a person will return.

Saved snapshots give users a reason to return to an earlier offer; continuing the same Guided step removes the need to repeat work. Whether either improves retention needs measurement with users.

## Database schema

| Table | Purpose | Key fields |
|---|---|---|
| `users` | Account profile, password hash and entitlement | `id`, unique `email`, `name`, `password_hash`, `mode`, `tier`, `is_demo`, `demo_expires_at`, `created_at` |
| `sessions` | Expiring server-side sessions | `token_hash`, `user_id`, `expires_at` |
| `user_state` | One versioned plan per user | `user_id`, `state_json`, `revision`, `updated_at` |

Session token values are not stored directly. `sessions` and `user_state` reference their owner and are deleted when the user is deleted. The plan is stored as JSON, which keeps the prototype flexible; a production system should define a stricter versioned schema and migration strategy.

## How calculations work

The same starting balance is used for both paths. The cash path subtracts the listed price less the cash-only discount on the purchase date. The instalment path subtracts the down payment plus entered upfront fees and tax, less an eligible immediate upfront discount, then subtracts each entered monthly instalment. Enter only an immediate discount applied to the upfront amount; do not count a discount, fee or tax twice.

Income, regular monthly expenses and one-time expenses are entered by the user and applied to both paths. When multiple entries share a date, the model applies purchase payment first, then income, monthly expenses, one-time expenses and the instalment. Monthly dates that do not exist in a month are clamped to its last day. The forecast reaches at least six months, the last instalment and all entered one-time expenses.

A balance or cushion warning is an estimate based on those assumptions. The tool cannot verify the offer, guarantee expected income, predict surprise costs or determine whether a purchase is affordable for someone. Review the actual offer and consider professional advice where appropriate.

## Before public launch

1. Validate the product with prospective users, including people who need a guided experience; review accessibility and perform real device and browser testing.
2. Deploy behind HTTPS with `COOKIE_SECURE=1` and an explicitly configured `PUBLIC_ORIGIN`. Use a host with durable storage and a backup/restore plan; move to PostgreSQL and a shared rate-limit/session design before scaling beyond a single instance.
3. Complete an independent security review, threat modelling, abuse protections, production monitoring and dependency management. Add email verification, password recovery and user support.
4. Integrate a real payment provider and verified webhook, manage subscription state and cancellation on the server, and test purchase, renewal, failure and refund flows. Follow the provider's security and PCI guidance; do not collect raw card data yourself.
5. Publish appropriate privacy, terms, pricing and refund pages, decide data retention/deletion policies, and obtain relevant legal and regulatory advice for the target market.
6. Configure a domain, backups, monitoring and support contact. Google sign-in requires a real OAuth setup, verified callback and secure account linking; it is not connected in this prototype.

## To see an alternate landing page concept

[Alternate Landing Page Concept](https://purchase-lens-pricing-guide.lovable.app/)



## Project layout

```text
launch.bat            Windows one-click launcher
launch.py             Local server and browser startup
server.py             FastAPI routes, sessions and SQLite persistence
requirements.txt      Python dependencies
requirements-dev.txt  Additional dependencies for tests
public/index.html     Application shell
public/styles.css     Responsive visual system
public/app.js         Navigation, accounts, settings and saving
public/guided.js      Guided journey
public/pro.js         Pro workspace
public/engine.js      Offer and cash-flow calculations
public/decision.js    Cushion, wait and scenario calculations
public/plans.js       Plan snapshots and calendar reminder
internal/premium.mjs  Server-side Premium calculation runner
tests/                Calculation and account tests
```
