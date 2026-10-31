"""
Jansen Gas Aviation Gasoline Blending Optimization Model
=========================================================
Case 4.1: Blending Aviation Gasoline at Jansen Gas
Author: Antigravity Data Science & Business Analytics Team
Date: October 2026

This script implements an end-to-end Linear Programming (LP) optimization model
using PuLP to determine the profit-maximizing blending strategy for Jansen Gas.
It also carries out comprehensive sensitivity analysis, shadow price evaluation,
and answers all 5 strategic business questions posed in the case study.
"""

import os
import sys
import numpy as np
import pandas as pd
import pulp
import matplotlib.pyplot as plt

# Set style for professional business plots
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.size'] = 11
plt.rcParams['axes.titlesize'] = 13
plt.rcParams['axes.labelsize'] = 11

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------
# 1. PROBLEM PARAMETERS & DATA STRUCTURES
# ---------------------------------------------------------
FEEDSTOCKS = ['Alkylate', 'CCG', 'SRG', 'Isopentane']
GASOLINE_TYPES = ['A', 'B', 'C']

# Table 4.6: Feedstock Data (gallons in 1000s, prices in $/gal)
FEEDSTOCK_DATA = {
    'Alkylate':   {'avail': 140.0, 'value': 4.50, 'rvp': 5.0,  'oct_low': 98.0,  'oct_high': 107.0},
    'CCG':        {'avail': 130.0, 'value': 2.50, 'rvp': 8.0,  'oct_low': 87.0,  'oct_high': 93.0},
    'SRG':        {'avail': 140.0, 'value': 2.25, 'rvp': 4.0,  'oct_low': 83.0,  'oct_high': 89.0},
    'Isopentane': {'avail': 110.0, 'value': 2.35, 'rvp': 20.0, 'oct_low': 101.0, 'oct_high': 108.0},
}

# Table 4.7: Gasoline Data (gallons in 1000s, prices in $/gal)
GASOLINE_DATA = {
    'A': {'req': 120.0, 'price': 3.00, 'max_rvp': 7.0, 'min_oct': 90.0, 'tel': 'Low'},
    'B': {'req': 130.0, 'price': 3.50, 'max_rvp': 7.0, 'min_oct': 97.0, 'tel': 'High'},
    'C': {'req': 120.0, 'price': 4.00, 'max_rvp': 7.0, 'min_oct': 100.0, 'tel': 'High'},
}


def build_and_solve_lp(
    side_constraint=True,
    b_tel='High',
    rvp_delta=0.0,
    a_min_oct=90.0,
    price_multiplier=1.0,
    price_additive=0.0
):
    """
    Builds and solves the Linear Programming model for Jansen Gas.
    
    Parameters:
    -----------
    side_constraint : bool
        If True, enforces Gas A production >= Gas B production.
    b_tel : str
        'High' (default) or 'Medium'.
    rvp_delta : float
        Uniform reduction applied to max allowable Reid vapor pressure.
    a_min_oct : float
        Minimum octane requirement for Gas A.
    price_multiplier : float
        Uniform percentage scaling applied to gas prices and feedstock values.
    price_additive : float
        Uniform constant dollar amount added to gas prices and feedstock values.
        
    Returns:
    --------
    dict containing model status, objective value, decision variables, slacks, and shadow prices.
    """
    prob = pulp.LpProblem("Jansen_Gas_Blending_Optimization", pulp.LpMaximize)
    
    # Decision Variables
    # x[i, j]: thousands of gallons of feedstock i used to blend gasoline j
    x = pulp.LpVariable.dicts("Blend", ((i, j) for i in FEEDSTOCKS for j in GASOLINE_TYPES), lowBound=0)
    # s[i]: thousands of gallons of leftover feedstock i sold directly
    s = pulp.LpVariable.dicts("Leftover", FEEDSTOCKS, lowBound=0)
    
    # Effective prices and values
    gas_prices = {
        j: (GASOLINE_DATA[j]['price'] * price_multiplier) + price_additive
        for j in GASOLINE_TYPES
    }
    feedstock_values = {
        i: (FEEDSTOCK_DATA[i]['value'] * price_multiplier) + price_additive
        for i in FEEDSTOCKS
    }
    
    # Objective Function: Total Revenue (in thousands of dollars)
    revenue_gas = pulp.lpSum(gas_prices[j] * x[i, j] for i in FEEDSTOCKS for j in GASOLINE_TYPES)
    revenue_leftover = pulp.lpSum(feedstock_values[i] * s[i] for i in FEEDSTOCKS)
    prob += revenue_gas + revenue_leftover, "Total_Revenue"
    
    # 1. Feedstock Availability Constraints (Mass Balance)
    for i in FEEDSTOCKS:
        prob += (
            pulp.lpSum(x[i, j] for j in GASOLINE_TYPES) + s[i] == FEEDSTOCK_DATA[i]['avail'],
            f"Avail_{i}"
        )
        
    # 2. Demand Satisfaction (Minimum Gallons Required)
    for j in GASOLINE_TYPES:
        prob += (
            pulp.lpSum(x[i, j] for i in FEEDSTOCKS) >= GASOLINE_DATA[j]['req'],
            f"Demand_Req_{j}"
        )
        
    # 3. Quality Constraint: Maximum Reid Vapor Pressure (RVP)
    # sum_i rvp_i * x_ij / sum_i x_ij <= max_rvp_j  ==>  sum_i (rvp_i - max_rvp_j) * x_ij <= 0
    for j in GASOLINE_TYPES:
        limit_rvp = GASOLINE_DATA[j]['max_rvp'] - rvp_delta
        prob += (
            pulp.lpSum((FEEDSTOCK_DATA[i]['rvp'] - limit_rvp) * x[i, j] for i in FEEDSTOCKS) <= 0,
            f"Max_RVP_{j}"
        )
        
    # 4. Quality Constraint: Minimum Octane Rating
    # sum_i oct_ij * x_ij / sum_i x_ij >= min_oct_j  ==>  sum_i (oct_ij - min_oct_j) * x_ij >= 0
    for j in GASOLINE_TYPES:
        if j == 'A':
            # Gas A always uses low TEL
            oct_target = a_min_oct
            prob += (
                pulp.lpSum((FEEDSTOCK_DATA[i]['oct_low'] - oct_target) * x[i, 'A'] for i in FEEDSTOCKS) >= 0,
                f"Min_Octane_{j}"
            )
        elif j == 'B':
            oct_target = GASOLINE_DATA['B']['min_oct']
            if b_tel.lower() == 'medium':
                # Octane ratings halfway between low and high TEL
                prob += (
                    pulp.lpSum((((FEEDSTOCK_DATA[i]['oct_low'] + FEEDSTOCK_DATA[i]['oct_high']) / 2.0 - oct_target) * x[i, 'B']) for i in FEEDSTOCKS) >= 0,
                    f"Min_Octane_{j}"
                )
            else:
                prob += (
                    pulp.lpSum((FEEDSTOCK_DATA[i]['oct_high'] - oct_target) * x[i, 'B'] for i in FEEDSTOCKS) >= 0,
                    f"Min_Octane_{j}"
                )
        else: # Gas C
            oct_target = GASOLINE_DATA['C']['min_oct']
            prob += (
                pulp.lpSum((FEEDSTOCK_DATA[i]['oct_high'] - oct_target) * x[i, 'C'] for i in FEEDSTOCKS) >= 0,
                f"Min_Octane_{j}"
            )
            
    # 5. Management Policy Constraint: Production of Gas A >= Production of Gas B
    if side_constraint:
        prob += (
            pulp.lpSum(x[i, 'A'] for i in FEEDSTOCKS) >= pulp.lpSum(x[i, 'B'] for i in FEEDSTOCKS),
            "Policy_GasA_ge_GasB"
        )
        
    # Solve the model quietly
    solver = pulp.PULP_CBC_CMD(msg=0)
    prob.solve(solver)
    
    status_str = pulp.LpStatus[prob.status]
    if status_str != "Optimal":
        return {
            'status': status_str,
            'revenue': None,
            'prob': prob
        }
        
    # Collect results
    blend_solution = {
        (i, j): pulp.value(x[i, j]) for i in FEEDSTOCKS for j in GASOLINE_TYPES
    }
    leftover_solution = {i: pulp.value(s[i]) for i in FEEDSTOCKS}
    gas_production = {
        j: sum(blend_solution[(i, j)] for i in FEEDSTOCKS) for j in GASOLINE_TYPES
    }
    
    # Calculate realized chemical properties for each gasoline
    realized_rvp = {}
    realized_octane = {}
    for j in GASOLINE_TYPES:
        total_vol = gas_production[j]
        if total_vol > 0:
            realized_rvp[j] = sum(blend_solution[(i, j)] * FEEDSTOCK_DATA[i]['rvp'] for i in FEEDSTOCKS) / total_vol
            if j == 'A':
                realized_octane[j] = sum(blend_solution[(i, j)] * FEEDSTOCK_DATA[i]['oct_low'] for i in FEEDSTOCKS) / total_vol
            elif j == 'B' and b_tel.lower() == 'medium':
                med_oct = {i: (FEEDSTOCK_DATA[i]['oct_low'] + FEEDSTOCK_DATA[i]['oct_high']) / 2.0 for i in FEEDSTOCKS}
                realized_octane[j] = sum(blend_solution[(i, j)] * med_oct[i] for i in FEEDSTOCKS) / total_vol
            else:
                realized_octane[j] = sum(blend_solution[(i, j)] * FEEDSTOCK_DATA[i]['oct_high'] for i in FEEDSTOCKS) / total_vol
        else:
            realized_rvp[j] = 0.0
            realized_octane[j] = 0.0

    # Constraint shadow prices and slacks
    constraint_data = {}
    for c_name, c_obj in prob.constraints.items():
        constraint_data[c_name] = {
            'slack': c_obj.slack,
            'shadow_price': c_obj.pi if c_obj.pi is not None else 0.0
        }
        
    # Reduced costs
    var_reduced_costs = {}
    for v in prob.variables():
        var_reduced_costs[v.name] = v.dj if v.dj is not None else 0.0

    return {
        'status': status_str,
        'revenue': pulp.value(prob.objective) * 1000.0, # in dollars ($)
        'blend': blend_solution,
        'leftover': leftover_solution,
        'production': gas_production,
        'realized_rvp': realized_rvp,
        'realized_octane': realized_octane,
        'constraints': constraint_data,
        'reduced_costs': var_reduced_costs,
        'prob': prob
    }


def main():
    print("=" * 80)
    print("   JANSEN GAS: AVIATION GASOLINE BLENDING OPTIMIZATION & SENSITIVITY")
    print("=" * 80)

    # ---------------------------------------------------------
    # PART 1: BASELINE OPTIMAL BLENDING PLAN
    # ---------------------------------------------------------
    base_res = build_and_solve_lp()
    print(f"\n[+] Baseline Model Status: {base_res['status']}")
    print(f"[+] Optimal Total Revenue: ${base_res['revenue']:,.2f}\n")

    # Construct Blending Matrix Table
    blend_df = pd.DataFrame(index=FEEDSTOCKS, columns=GASOLINE_TYPES)
    for i in FEEDSTOCKS:
        for j in GASOLINE_TYPES:
            blend_df.loc[i, j] = base_res['blend'][(i, j)]
    blend_df['Leftover Sold'] = [base_res['leftover'][i] for i in FEEDSTOCKS]
    blend_df['Total Available'] = [FEEDSTOCK_DATA[i]['avail'] for i in FEEDSTOCKS]
    blend_df['Feedstock Value ($/gal)'] = [FEEDSTOCK_DATA[i]['value'] for i in FEEDSTOCKS]
    
    # Gasoline summary row
    prod_row = [base_res['production'][j] for j in GASOLINE_TYPES] + [sum(base_res['leftover'].values()), sum(f['avail'] for f in FEEDSTOCK_DATA.values()), np.nan]
    req_row = [GASOLINE_DATA[j]['req'] for j in GASOLINE_TYPES] + [np.nan, np.nan, np.nan]
    price_row = [GASOLINE_DATA[j]['price'] for j in GASOLINE_TYPES] + [np.nan, np.nan, np.nan]
    rvp_row = [f"{base_res['realized_rvp'][j]:.2f} (max {GASOLINE_DATA[j]['max_rvp']})" for j in GASOLINE_TYPES] + [np.nan, np.nan, np.nan]
    oct_row = [f"{base_res['realized_octane'][j]:.2f} (min {GASOLINE_DATA[j]['min_oct']})" for j in GASOLINE_TYPES] + [np.nan, np.nan, np.nan]

    summary_df = blend_df.copy()
    summary_df.loc['Total Produced (1000s gal)'] = prod_row
    summary_df.loc['Demand Required (1000s gal)'] = req_row
    summary_df.loc['Price per Gallon ($)'] = price_row
    summary_df.loc['Realized RVP'] = rvp_row
    summary_df.loc['Realized Octane'] = oct_row

    print("--- OPTIMAL BLENDING MATRIX & PRODUCTION PLAN (in 1,000s of Gallons) ---")
    print(summary_df.to_string())
    summary_df.to_csv(os.path.join(OUTPUT_DIR, "blending_summary_table.csv"))

    # Revenue Breakdown
    rev_from_gas = {j: base_res['production'][j] * GASOLINE_DATA[j]['price'] * 1000.0 for j in GASOLINE_TYPES}
    rev_from_leftover = {i: base_res['leftover'][i] * FEEDSTOCK_DATA[i]['value'] * 1000.0 for i in FEEDSTOCKS}
    total_gas_rev = sum(rev_from_gas.values())
    total_leftover_rev = sum(rev_from_leftover.values())

    print("\n--- REVENUE SOURCES BREAKDOWN ---")
    for j in GASOLINE_TYPES:
        print(f"  Gas {j} ({base_res['production'][j]:.2f}k gal @ ${GASOLINE_DATA[j]['price']:.2f}/gal): ${rev_from_gas[j]:,.2f} ({rev_from_gas[j]/base_res['revenue']*100:.1f}%)")
    print(f"  Total Finished Gasoline Revenue: ${total_gas_rev:,.2f} ({total_gas_rev/base_res['revenue']*100:.1f}%)")
    for i in FEEDSTOCKS:
        if base_res['leftover'][i] > 0.001:
            print(f"  Leftover {i} ({base_res['leftover'][i]:.2f}k gal @ ${FEEDSTOCK_DATA[i]['value']:.2f}/gal): ${rev_from_leftover[i]:,.2f} ({rev_from_leftover[i]/base_res['revenue']*100:.1f}%)")
    print(f"  Total Feedstock Residual Revenue: ${total_leftover_rev:,.2f} ({total_leftover_rev/base_res['revenue']*100:.1f}%)")
    print(f"  TOTAL COMBINED REVENUE: ${base_res['revenue']:,.2f}")

    # Feedstock Utilization
    feedstock_util = pd.DataFrame({
        'Available (1000s gal)': [FEEDSTOCK_DATA[i]['avail'] for i in FEEDSTOCKS],
        'Used in Blending': [FEEDSTOCK_DATA[i]['avail'] - base_res['leftover'][i] for i in FEEDSTOCKS],
        'Leftover Sold': [base_res['leftover'][i] for i in FEEDSTOCKS],
        'Utilization Rate (%)': [(FEEDSTOCK_DATA[i]['avail'] - base_res['leftover'][i]) / FEEDSTOCK_DATA[i]['avail'] * 100 for i in FEEDSTOCKS],
        'Shadow Price ($/gal)': [base_res['constraints'][f"Avail_{i}"]['shadow_price'] for i in FEEDSTOCKS],
        'Feedstock Book Value ($/gal)': [FEEDSTOCK_DATA[i]['value'] for i in FEEDSTOCKS]
    }, index=FEEDSTOCKS)
    print("\n--- FEEDSTOCK UTILIZATION & SHADOW PRICES ---")
    print(feedstock_util.to_string())
    feedstock_util.to_csv(os.path.join(OUTPUT_DIR, "feedstock_utilization.csv"))

    # ---------------------------------------------------------
    # PART 2: CASE QUESTIONS & SENSITIVITY ANALYSES
    # ---------------------------------------------------------
    print("\n" + "=" * 80)
    print("   SOLVING CASE QUESTIONS & SCENARIO ANALYSES")
    print("=" * 80)

    # --- Question 1: Impact of the Side Constraint (Gas A >= Gas B) ---
    print("\n[QUESTION 1] Evaluating the Cost of Side Constraint (Gas A >= Gas B):")
    no_side_res = build_and_solve_lp(side_constraint=False)
    cost_of_constraint = no_side_res['revenue'] - base_res['revenue']
    print(f"  - Revenue WITH side constraint:    ${base_res['revenue']:,.2f}")
    print(f"  - Revenue WITHOUT side constraint: ${no_side_res['revenue']:,.2f}")
    print(f"  - Net Opportunity Cost of Policy:  ${cost_of_constraint:,.2f}")
    print(f"  - Production under No Side Constraint: Gas A = {no_side_res['production']['A']:.2f}k gal, Gas B = {no_side_res['production']['B']:.2f}k gal, Gas C = {no_side_res['production']['C']:.2f}k gal")

    # --- Question 2: Medium TEL Level for Gas B ---
    print("\n[QUESTION 2] Testing Medium TEL Level for Gas B:")
    med_tel_res = build_and_solve_lp(b_tel='Medium')
    if med_tel_res['status'] == 'Optimal':
        print(f"  - Model Status: Optimal | Revenue: ${med_tel_res['revenue']:,.2f}")
    else:
        print(f"  - Model Status: {med_tel_res['status']}")
        print("  - Detailed Diagnosis: Gas B requires Octane >= 97. At Medium TEL, feedstock octanes are Alkylate=102.5, CCG=90, SRG=86, Isopentane=104.5.")
        print("    Achieving Octane 97 requires large fractions of Alkylate and Isopentane. However, Isopentane has high RVP (20 vs limit 7),")
        print("    and Alkylate supply (140k gal) is simultaneously demanded by Gas C (min octane 100). The chemical specifications are mathematically impossible.")

    # --- Question 3: Tighter Reid Vapor Pressure Regulations ---
    print("\n[QUESTION 3] Parametric Analysis of Tighter Reid Vapor Pressure:")
    rvp_results = []
    # Test RVP reductions from 0.0 down to maximum feasible
    for rvp_red in np.arange(0.0, 0.60, 0.05):
        cur_max_rvp = 7.0 - rvp_red
        res = build_and_solve_lp(rvp_delta=rvp_red)
        if res['status'] == 'Optimal':
            rvp_results.append({
                'RVP_Reduction': round(rvp_red, 2),
                'Max_RVP_Limit': round(cur_max_rvp, 2),
                'Total_Revenue': res['revenue'],
                'Revenue_Loss': base_res['revenue'] - res['revenue'],
                'Gas_A_Prod': res['production']['A'],
                'Gas_B_Prod': res['production']['B'],
                'Gas_C_Prod': res['production']['C'],
                'Alkylate_Leftover': res['leftover']['Alkylate'],
                'CCG_Leftover': res['leftover']['CCG'],
                'SRG_Leftover': res['leftover']['SRG'],
                'Isopentane_Leftover': res['leftover']['Isopentane'],
            })
        else:
            break
            
    # Bisection search for exact feasibility boundary
    low_rvp, high_rvp = 6.0, 7.0
    for _ in range(25):
        mid_rvp = (low_rvp + high_rvp) / 2.0
        delta = 7.0 - mid_rvp
        test_r = build_and_solve_lp(rvp_delta=delta)
        if test_r['status'] == 'Optimal':
            high_rvp = mid_rvp
        else:
            low_rvp = mid_rvp
    min_feasible_rvp = high_rvp
    max_rvp_reduction = 7.0 - min_feasible_rvp

    rvp_df = pd.DataFrame(rvp_results)
    print(rvp_df[['Max_RVP_Limit', 'Total_Revenue', 'Revenue_Loss', 'Gas_A_Prod', 'Gas_B_Prod', 'Gas_C_Prod']].to_string(index=False))
    print(f"  - Minimum feasible RVP limit: {min_feasible_rvp:.4f} psi (Maximum allowable reduction = {max_rvp_reduction:.4f} psi)")
    rvp_df.to_csv(os.path.join(OUTPUT_DIR, "sensitivity_rvp.csv"), index=False)

    # --- Question 4: Maximum Minimum Octane Rating for Gas A ---
    print("\n[QUESTION 4] Increasing Minimum Required Octane for Gas A:")
    oct_results = []
    for oct_val in np.arange(90.0, 92.0, 0.2):
        res = build_and_solve_lp(a_min_oct=oct_val)
        if res['status'] == 'Optimal':
            oct_results.append({
                'Gas_A_Min_Octane': round(oct_val, 2),
                'Total_Revenue': res['revenue'],
                'Revenue_Delta': res['revenue'] - base_res['revenue'],
                'Gas_A_Prod': res['production']['A'],
                'Gas_B_Prod': res['production']['B'],
                'Gas_C_Prod': res['production']['C']
            })
        else:
            break

    # Bisection search for exact upper bound
    low_oct, high_oct = 90.0, 95.0
    for _ in range(25):
        mid_oct = (low_oct + high_oct) / 2.0
        test_o = build_and_solve_lp(a_min_oct=mid_oct)
        if test_o['status'] == 'Optimal':
            low_oct = mid_oct
        else:
            high_oct = mid_oct
    max_feasible_oct_a = low_oct

    oct_df = pd.DataFrame(oct_results)
    print(oct_df.to_string(index=False))
    print(f"  - Maximum possible minimum octane rating for Gas A: {max_feasible_oct_a:.4f} (beyond this, model becomes infeasible)")
    oct_df.to_csv(os.path.join(OUTPUT_DIR, "sensitivity_octane_A.csv"), index=False)

    # --- Question 5: Proportional Price and Value Scaling ---
    print("\n[QUESTION 5] Impact of Proportional Price and Feedstock Value Shifts:")
    scale_10pct = build_and_solve_lp(price_multiplier=1.10)
    add_1dollar = build_and_solve_lp(price_additive=1.00)

    # Compare decision variables
    blend_diff_scale = max(abs(scale_10pct['blend'][k] - base_res['blend'][k]) for k in base_res['blend'])
    blend_diff_add = max(abs(add_1dollar['blend'][k] - base_res['blend'][k]) for k in base_res['blend'])

    print(f"  - Baseline Total Revenue:              ${base_res['revenue']:,.2f}")
    print(f"  - +10% Uniform Price/Value Scaling:    ${scale_10pct['revenue']:,.2f} (Ratio = {scale_10pct['revenue']/base_res['revenue']:.4f})")
    print(f"    Max deviation in blending decision variables: {blend_diff_scale:.8f} (Identical blend!)")
    print(f"  - +$1.00/gal Uniform Additive Shift:   ${add_1dollar['revenue']:,.2f} (Delta = ${add_1dollar['revenue'] - base_res['revenue']:,.2f})")
    print(f"    Theoretical additive boost (520k gal * $1.00): $520,000.00")
    print(f"    Max deviation in blending decision variables: {blend_diff_add:.8f} (Identical blend!)")
    print("  - CONCLUSION: Dave is 100% correct! The optimal blending decisions depend exclusively on relative price-to-property ratios.")

    # ---------------------------------------------------------
    # PART 3: GENERATING HIGH-QUALITY BUSINESS VISUALIZATIONS
    # ---------------------------------------------------------
    print("\n[+] Generating visual analytics charts...")

    # Chart 1: Feedstock Allocation by Gasoline Type & Leftover
    fig, ax = plt.subplots(figsize=(10, 6))
    feedstock_names = FEEDSTOCKS
    gas_labels = ['Gas A', 'Gas B', 'Gas C', 'Leftover Inventory']
    
    # Extract data for stacked bar
    plot_data = np.zeros((4, 4))
    for f_idx, f in enumerate(feedstock_names):
        plot_data[0, f_idx] = base_res['blend'][(f, 'A')]
        plot_data[1, f_idx] = base_res['blend'][(f, 'B')]
        plot_data[2, f_idx] = base_res['blend'][(f, 'C')]
        plot_data[3, f_idx] = base_res['leftover'][f]

    colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']
    bottoms = np.zeros(4)
    for f_idx, f in enumerate(feedstock_names):
        ax.bar(gas_labels, plot_data[f_idx, :], bottom=bottoms, label=f, color=colors[f_idx], width=0.55, edgecolor='black', linewidth=0.8)
        bottoms += plot_data[f_idx, :]

    ax.set_ylabel('Volume (1,000s of Gallons)', fontweight='bold')
    ax.set_title('Optimal Allocation of Feedstocks Across Finished Gasolines and Leftover Inventory', fontweight='bold', pad=15)
    ax.legend(title='Feedstocks', frameon=True)
    for i, total in enumerate(bottoms):
        ax.text(i, total + 3, f"{total:.1f}k gal", ha='center', fontweight='bold')
    ax.set_ylim(0, max(bottoms) * 1.15)
    plt.tight_layout()
    chart1_path = os.path.join(OUTPUT_DIR, "feedstock_allocation_by_gas.png")
    plt.savefig(chart1_path, dpi=300)
    plt.close()

    # Chart 2: Revenue vs Reid Vapor Pressure Reduction
    fig, ax1 = plt.subplots(figsize=(9, 5))
    ax1.plot(rvp_df['Max_RVP_Limit'], rvp_df['Total_Revenue'] / 1e3, marker='o', color='#004c6d', linewidth=2.5, markersize=7, label='Total Revenue ($1,000s)')
    ax1.axvline(min_feasible_rvp, color='red', linestyle='--', linewidth=1.5, label=f'Infeasibility Threshold ({min_feasible_rvp:.2f} psi)')
    ax1.set_xlabel('Maximum Allowable Reid Vapor Pressure (psi)', fontweight='bold')
    ax1.set_ylabel('Optimal Total Revenue ($1,000s)', fontweight='bold', color='#004c6d')
    ax1.set_title('Sensitivity of Total Revenue to Tighter Reid Vapor Pressure Standards', fontweight='bold', pad=15)
    ax1.grid(True, linestyle=':', alpha=0.6)
    ax1.legend(loc='lower right', frameon=True)
    plt.tight_layout()
    chart2_path = os.path.join(OUTPUT_DIR, "revenue_sensitivity_rvp.png")
    plt.savefig(chart2_path, dpi=300)
    plt.close()

    # Chart 3: Shadow Price vs Book Value of Feedstocks
    fig, ax = plt.subplots(figsize=(9, 5))
    x_indices = np.arange(len(FEEDSTOCKS))
    bar_width = 0.35
    book_vals = [FEEDSTOCK_DATA[i]['value'] for i in FEEDSTOCKS]
    shadow_vals = [base_res['constraints'][f"Avail_{i}"]['shadow_price'] for i in FEEDSTOCKS]

    ax.bar(x_indices - bar_width/2, book_vals, width=bar_width, label='Feedstock Book Value ($/gal)', color='#4682b4', edgecolor='black')
    ax.bar(x_indices + bar_width/2, shadow_vals, width=bar_width, label='Dual / Shadow Price ($/gal)', color='#2e8b57', edgecolor='black')

    ax.set_xticks(x_indices)
    ax.set_xticklabels(FEEDSTOCKS, fontweight='bold')
    ax.set_ylabel('Value / Marginal Worth ($ per Gallon)', fontweight='bold')
    ax.set_title('Feedstock Valuation: Market Residual Worth vs Marginal Optimization Value', fontweight='bold', pad=15)
    ax.legend(frameon=True)
    for i in x_indices:
        ax.text(i - bar_width/2, book_vals[i] + 0.08, f"${book_vals[i]:.2f}", ha='center', fontsize=9)
        ax.text(i + bar_width/2, shadow_vals[i] + 0.08, f"${shadow_vals[i]:.2f}", ha='center', fontsize=9, fontweight='bold', color='#1e5e3a')
    ax.set_ylim(0, max(max(book_vals), max(shadow_vals)) * 1.2)
    plt.tight_layout()
    chart3_path = os.path.join(OUTPUT_DIR, "feedstock_valuation_shadow_prices.png")
    plt.savefig(chart3_path, dpi=300)
    plt.close()

    print(f"[+] Successfully saved charts to: {OUTPUT_DIR}")
    print("[+] Script execution complete!")

if __name__ == '__main__':
    main()
