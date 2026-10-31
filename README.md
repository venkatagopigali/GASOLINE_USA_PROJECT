# Jansen Gas: Aviation Gasoline Blending Decision Support System (Case 4.1)

A complete, production-grade Linear Programming (LP) optimization application and interactive decision-support UI for **Jansen Gas (Case 4.1)**. Designed with both Python (PuLP & CBC) and TypeScript/JavaScript (pure client-side Simplex LP engine), fully prepared for seamless one-click deployment on **Vercel**.

---

## 🌟 Interactive Web Application Features

* **Real-Time Client-Side Simplex LP Solver:** Sub-millisecond interactive optimization as users adjust parameters without server latency.
* **Live Operational Controls:**
  * Toggle corporate policy constraint: **Gas A $\ge$ Gas B** (evaluates the \$6,988.41 opportunity cost live).
  * Toggle **Gas B TEL Level** (High vs. Medium TEL feasibility test).
  * Dynamic sliders for **Maximum Reid Vapor Pressure** (6.30 to 7.50 psi) with infeasibility guardrails.
  * Sliders for **Minimum Octane Rating of Gas A** (88.0 to 92.0).
  * Live price adjusters for finished fuels and raw feedstocks.
* **Executive Blending Matrix & Quality Gauges:**
  * Real-time recipe table detailing gallons blended by feedstock and finished gasoline grade.
  * Realized Volatility (RVP) and Octane gauges with binding constraint indicators.
* **Visual Analytics (Recharts):**
  * Stacked feedstock distribution bar charts across finished products and residual inventory.
  * Dual shadow prices vs. feedstock market book value comparison.
* **Pre-Configured Scenario Presets:** One-click simulations for all 5 textbook case study questions.

---

## 🚀 Deployment to Vercel

The project includes pre-configured [`vercel.json`](file:///c:/Users/hp/Desktop/PROJECT_USA/PROJECT/vercel.json) and standard build scripts.

### Option 1: Deploy with Vercel CLI
From your terminal in the project directory:
```bash
npx vercel
```
* Follow the interactive prompts to link your Vercel account and deploy.
* For production release:
  ```bash
  npx vercel --prod
  ```

### Option 2: Deploy via Git (GitHub / GitLab / Bitbucket)
1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: Jansen Gas Blending Optimization Web App"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Navigate to [vercel.com/new](https://vercel.com/new).
3. Import your repository. Vercel will automatically detect the **Vite** framework, run `npm run build`, and deploy to a live `.vercel.app` URL.

---

## 💻 Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your web browser.
4. Build for production:
   ```bash
   npm run build
   ```

---

## 🐍 Python Analytics & Optimization Engine

To run the deep-dive Python research model (PuLP, CBC, Pandas, Matplotlib):
```bash
pip install pulp pandas numpy matplotlib
python jansen_gas_optimization.py
```

### Outputs generated:
* `blending_summary_table.csv` — Full blending recipe and production metrics.
* `feedstock_utilization.csv` — Utilization percentages and dual shadow prices.
* `sensitivity_rvp.csv` — Parametric RVP regulatory sensitivity data.
* `sensitivity_octane_A.csv` — Octane feasibility frontier for Gas A.
* High-resolution charts: `feedstock_allocation_by_gas.png`, `revenue_sensitivity_rvp.png`, `feedstock_valuation_shadow_prices.png`.

---

## 📊 Summary of Optimal Solution (Case 4.1 Baseline)

| Item | Optimal Volume (1,000s gal) | Unit Value / Price | Total Revenue ($) |
| :--- | :---: | :---: | :---: |
| **Gas A Produced** | 130.00 | \$3.00 / gal | \$390,000.00 |
| **Gas B Produced** | 130.00 | \$3.50 / gal | \$455,000.00 |
| **Gas C Produced** | 154.97 | \$4.00 / gal | \$619,890.55 |
| **Leftover CCG Sold** | 42.11 | \$2.50 / gal | \$105,282.44 |
| **Leftover Isopentane Sold** | 62.91 | \$2.35 / gal | \$147,848.81 |
| **Total Optimal Revenue** | — | — | **\$1,718,021.80** |

* **Alkylate Shadow Price:** **\$5.77 / gal** (Book value \$4.50 &rarr; +\$1.27 / gal marginal profit).
* **Cost of Policy Constraint ($A \ge B$):** **\$6,988.41** (Relaxing raises revenue to **\$1,725,010.21**).
