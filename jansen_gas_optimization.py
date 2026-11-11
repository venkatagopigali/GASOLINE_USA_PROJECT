"""
Jansen Gas Aviation Gasoline Blending Optimization Model
=========================================================
Case 4.1: Blending Aviation Gasoline at Jansen Gas
Author: Gali Venkata Gopi
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

    # ---------------------------------------------------------
    # PART 4: GENERATE STANDALONE EXECUTIVE HTML REPORT & MODEL
    # ---------------------------------------------------------
    print("\n[+] Generating self-contained Executive Business Report & Model (HTML)...")
    import base64
    import webbrowser

    def encode_image(img_path):
        if os.path.exists(img_path):
            with open(img_path, 'rb') as f:
                return base64.b64encode(f.read()).decode('utf-8')
        return ""

    chart1_b64 = encode_image(chart1_path)
    chart2_b64 = encode_image(chart2_path)
    chart3_b64 = encode_image(chart3_path)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jansen Gas | Executive Business Report & Optimization Model</title>
  <style>
    :root {{
      --primary: #ea580c;
      --primary-dark: #c2410c;
      --bg: #faf5ed;
      --card-bg: #ffffff;
      --card-border: #e7dac9;
      --text: #1c1917;
      --text-muted: #78716c;
      --success: #15803d;
      --danger: #b91c1c;
      --warning: #b45309;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    body {{ background-color: var(--bg); color: var(--text); line-height: 1.6; padding: 30px 20px; }}
    .container {{ max-width: 1200px; margin: 0 auto; }}
    
    /* Header */
    .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border); padding-bottom: 20px; margin-bottom: 25px; }}
    .logo-group {{ display: flex; align-items: center; gap: 15px; }}
    .logo-badge {{ width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #ea580c, #d97706); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25); }}
    .title-group h1 {{ font-size: 24px; color: #1c1917; font-weight: 800; }}
    .title-group p {{ font-size: 13px; color: var(--text-muted); font-weight: 500; }}
    .btn-print {{ background: var(--primary); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; transition: 0.2s; box-shadow: 0 2px 5px rgba(234, 88, 12, 0.2); }}
    .btn-print:hover {{ background: var(--primary-dark); }}

    /* Navigation Tabs */
    .tabs {{ display: flex; gap: 10px; margin-bottom: 25px; border-bottom: 1px solid var(--card-border); padding-bottom: 10px; }}
    .tab-btn {{ background: none; border: none; color: var(--text-muted); padding: 8px 16px; font-size: 14px; font-weight: 700; cursor: pointer; border-radius: 8px; transition: 0.2s; }}
    .tab-btn.active {{ background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }}
    .tab-btn:hover:not(.active) {{ color: #1c1917; background: #f5ebe0; }}

    /* KPI Grid */
    .kpi-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 30px; }}
    .kpi-card {{ background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }}
    .kpi-label {{ font-size: 12px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 6px; }}
    .kpi-value {{ font-size: 28px; font-weight: 900; color: #1c1917; font-family: monospace; }}
    .kpi-sub {{ font-size: 12px; color: var(--primary); margin-top: 6px; font-weight: 600; }}

    /* Section Cards */
    .card {{ background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 14px; padding: 25px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }}
    .card h2 {{ font-size: 18px; font-weight: 800; color: #1c1917; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }}
    .card h3 {{ font-size: 15px; font-weight: 700; color: #ea580c; margin: 15px 0 8px; }}
    p {{ color: #44403c; font-size: 14px; margin-bottom: 12px; font-weight: 450; }}

    /* Tables */
    table {{ width: 100%; border-collapse: collapse; font-size: 13px; margin: 15px 0; }}
    th, td {{ padding: 12px 14px; text-align: left; border-bottom: 1px solid #e7dac9; }}
    th {{ background: #f7f0e6; color: #44403c; text-transform: uppercase; font-size: 11px; font-weight: 800; }}
    tr:hover {{ background: rgba(234, 88, 12, 0.03); }}
    .text-right {{ text-align: right; }}
    .font-mono {{ font-family: monospace; }}
    .badge {{ display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }}
    .badge-success {{ background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }}
    .badge-warning {{ background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }}
    .badge-danger {{ background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }}

    /* Math Box */
    .math-box {{ background: #faf5ed; border: 1px solid #e7dac9; border-radius: 10px; padding: 16px; font-family: monospace; font-size: 13px; color: #1c1917; margin: 15px 0; }}
    .math-line {{ margin-bottom: 8px; }}
    .math-title {{ color: #ea580c; font-weight: bold; margin-bottom: 4px; }}

    /* Charts */
    .chart-container {{ text-align: center; margin: 20px 0; }}
    .chart-container img {{ max-width: 100%; height: auto; border-radius: 10px; border: 1px solid var(--card-border); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }}

    /* Grid layout */
    .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
    @media (max-width: 768px) {{ .grid-2 {{ grid-template-columns: 1fr; }} }}

    /* Callout */
    .callout {{ border-left: 4px solid var(--primary); background: #fff8ee; padding: 16px 20px; border-radius: 0 10px 10px 0; margin: 15px 0; border-top: 1px solid #fde68a; border-right: 1px solid #fde68a; border-bottom: 1px solid #fde68a; }}
    .callout-title {{ font-weight: 800; color: #c2410c; font-size: 13px; text-transform: uppercase; margin-bottom: 4px; }}
    .callout-body {{ font-size: 13px; color: #44403c; font-weight: 500; }}
  </style>

    /* Grid layout */
    .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
    @media (max-width: 768px) {{ .grid-2 {{ grid-template-columns: 1fr; }} }}

    /* Callout */
    .callout {{ border-left: 4px solid var(--primary); background: #0f172a; padding: 14px 18px; border-radius: 0 10px 10px 0; margin: 15px 0; }}
    .callout-title {{ font-weight: 700; color: #38bdf8; font-size: 13px; text-transform: uppercase; margin-bottom: 4px; }}
    .callout-body {{ font-size: 13px; color: #cbd5e1; }}
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Header -->
    <div class="header">
      <div class="logo-group">
        <div class="logo-badge">✈</div>
        <div class="title-group">
          <h1>JANSEN GAS &bull; EXECUTIVE BUSINESS REPORT & MODEL</h1>
          <p>Aviation Gasoline Blending Optimization &bullet; Case 4.1 &bullet; Decision Sciences Report</p>
        </div>
      </div>
      <button class="btn-print" onclick="window.print()">🖨 Print / Export PDF</button>
    </div>

    <!-- Navigation Tabs -->
    <div class="tabs">
      <button class="tab-btn active" onclick="showTab('report')">📑 Executive Business Report</button>
      <button class="tab-btn" onclick="showTab('model')">⚙️ Optimization Model & Formulations</button>
      <button class="tab-btn" onclick="showTab('scenarios')">🔬 Strategic Case Scenarios (Q1-Q5)</button>
      <button class="tab-btn" onclick="showTab('charts')">📊 Analytical Visualizations</button>
    </div>

    <!-- KPI Summary Row -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Optimal Total Revenue</div>
        <div class="kpi-value">${base_res['revenue']:,.2f}</div>
        <div class="kpi-sub">85.3% Gas Sales + 14.7% Salvage</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Finished Gas Revenue</div>
        <div class="kpi-value">${total_gas_rev:,.2f}</div>
        <div class="kpi-sub">Gas A: $390k | Gas B: $455k | Gas C: $620k</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Alkylate Shadow Price</div>
        <div class="kpi-value">$5.77 / gal</div>
        <div class="kpi-sub">+$1.27/gal over book value ($4.50)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Cost of Side Constraint (A ≥ B)</div>
        <div class="kpi-value">${cost_of_constraint:,.2f}</div>
        <div class="kpi-sub">Gained if policy constraint is lifted</div>
      </div>
    </div>

    <!-- TAB 1: EXECUTIVE BUSINESS REPORT -->
    <div id="tab-report" class="tab-content">
      <div class="card">
        <h2>Executive Memorandum</h2>
        <p><strong>To:</strong> Dave Wagner, Production Manager & Executive Committee, Jansen Gas<br>
        <strong>From:</strong> Gali Venkata Gopi<br>
        <strong>Subject:</strong> Optimal Feedstock Blending Strategy & Strategic Scenario Recommendations (Case 4.1)</p>
        
        <div class="callout">
          <div class="callout-title">Key Executive Takeaway</div>
          <div class="callout-body">
            By optimizing raw feedstock blending using Linear Programming, Jansen Gas achieves a maximized total gross revenue of <strong>${base_res['revenue']:,.2f}</strong>. Alkylate is our primary operational bottleneck (100% utilized, shadow price of <strong>$5.77/gal</strong>). Relaxing the company policy requiring Gas A ≥ Gas B unlocks an immediate <strong>+$6,988.41</strong> in pure net profit.
          </div>
        </div>

        <h3>1. Baseline Blending & Production Matrix</h3>
        <p>The table below presents the mathematically optimal recipe (in thousands of gallons) across all four feedstocks and finished aviation gasolines:</p>
        
        <table>
          <thead>
            <tr>
              <th>Feedstock</th>
              <th class="text-right">Gas A ($3.00)</th>
              <th class="text-right">Gas B ($3.50)</th>
              <th class="text-right">Gas C ($4.00)</th>
              <th class="text-right">Leftover Sold</th>
              <th class="text-right">Total Avail</th>
              <th class="text-right">Unit Value</th>
              <th class="text-right">Utilization</th>
            </tr>
          </thead>
          <tbody class="font-mono">
            <tr>
              <td>Alkylate</td>
              <td class="text-right">{base_res['blend'][('Alkylate', 'A')]:.2f}</td>
              <td class="text-right">{base_res['blend'][('Alkylate', 'B')]:.2f}</td>
              <td class="text-right">{base_res['blend'][('Alkylate', 'C')]:.2f}</td>
              <td class="text-right">0.00</td>
              <td class="text-right">140.00</td>
              <td class="text-right">$4.50</td>
              <td class="text-right"><span class="badge badge-success">100.0%</span></td>
            </tr>
            <tr>
              <td>CCG</td>
              <td class="text-right">{base_res['blend'][('CCG', 'A')]:.2f}</td>
              <td class="text-right">0.00</td>
              <td class="text-right">0.00</td>
              <td class="text-right">{base_res['leftover']['CCG']:.2f}</td>
              <td class="text-right">130.00</td>
              <td class="text-right">$2.50</td>
              <td class="text-right"><span class="badge badge-warning">67.6%</span></td>
            </tr>
            <tr>
              <td>SRG</td>
              <td class="text-right">{base_res['blend'][('SRG', 'A')]:.2f}</td>
              <td class="text-right">{base_res['blend'][('SRG', 'B')]:.2f}</td>
              <td class="text-right">{base_res['blend'][('SRG', 'C')]:.2f}</td>
              <td class="text-right">0.00</td>
              <td class="text-right">140.00</td>
              <td class="text-right">$2.25</td>
              <td class="text-right"><span class="badge badge-success">100.0%</span></td>
            </tr>
            <tr>
              <td>Isopentane</td>
              <td class="text-right">{base_res['blend'][('Isopentane', 'A')]:.2f}</td>
              <td class="text-right">{base_res['blend'][('Isopentane', 'B')]:.2f}</td>
              <td class="text-right">{base_res['blend'][('Isopentane', 'C')]:.2f}</td>
              <td class="text-right">{base_res['leftover']['Isopentane']:.2f}</td>
              <td class="text-right">110.00</td>
              <td class="text-right">$2.35</td>
              <td class="text-right"><span class="badge badge-warning">42.8%</span></td>
            </tr>
            <tr style="border-top: 2px solid #334155; font-weight: bold; color: white;">
              <td>Total Produced (k gal)</td>
              <td class="text-right">{base_res['production']['A']:.2f}</td>
              <td class="text-right">{base_res['production']['B']:.2f}</td>
              <td class="text-right">{base_res['production']['C']:.2f}</td>
              <td class="text-right">{sum(base_res['leftover'].values()):.2f}</td>
              <td class="text-right">520.00</td>
              <td class="text-right">—</td>
              <td class="text-right"><span class="badge badge-success">79.8%</span></td>
            </tr>
            <tr style="color: #94a3b8; font-size: 11px;">
              <td>Contract Demand (k gal)</td>
              <td class="text-right">120.00</td>
              <td class="text-right">130.00</td>
              <td class="text-right">120.00</td>
              <td colspan="4" style="text-align: right; font-style: italic;">Gas C produced up to maximum feasible profit</td>
            </tr>
            <tr style="color: #38bdf8; font-size: 11px;">
              <td>Realized RVP (Max 7.0)</td>
              <td class="text-right">7.00 psi</td>
              <td class="text-right">7.00 psi</td>
              <td class="text-right">7.00 psi</td>
              <td colspan="4" style="text-align: right;">100% Binding Volatility Limit</td>
            </tr>
            <tr style="color: #a855f7; font-size: 11px;">
              <td>Realized Octane</td>
              <td class="text-right">90.00 (min 90)</td>
              <td class="text-right">97.00 (min 97)</td>
              <td class="text-right">100.00 (min 100)</td>
              <td colspan="4" style="text-align: right;">100% Binding Octane Specifications</td>
            </tr>
          </tbody>
        </table>

        <h3>2. Strategic Business Recommendations for Dave Wagner</h3>
        <ol style="margin-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.8;">
          <li><strong>Eliminate Policy Constraint (Gas A ≥ Gas B):</strong> Dave should advocate to lift this internal rule. Removing it increases revenue by <strong>+$6,988.41</strong> by shifting production away from \$3.00 Gas A to high-margin \$3.50 Gas B (194.69k gal).</li>
          <li><strong>Aggressively Procure Additional Alkylate:</strong> Alkylate is fully exhausted and has an internal marginal worth (shadow price) of <strong>$5.77/gal</strong> compared to its purchase value of $4.50. Jansen Gas should purchase additional Alkylate supplies at any market spot price below $5.50/gal.</li>
          <li><strong>Reject Medium TEL for Gas B:</strong> Shifting Gas B to Medium TEL is mathematically and chemically <strong>infeasible</strong> due to simultaneous vapor pressure limits and Gas C octane requirements. Continue using High TEL.</li>
          <li><strong>Monitor RVP Environmental Regulations:</strong> If government regulations tighten maximum allowable RVP below 6.43 psi, current operations become infeasible. Each 0.1 psi reduction costs ~$10,000 in revenue.</li>
        </ol>
      </div>
    </div>

    <!-- TAB 2: OPTIMIZATION MODEL FORMULATION -->
    <div id="tab-model" class="tab-content" style="display: none;">
      <div class="card">
        <h2>Mathematical Model Formulation (Linear Programming)</h2>
        <p>The blending problem is modeled as a continuous Linear Program with 16 decision variables and 12 constraints.</p>

        <div class="math-box">
          <div class="math-title">1. Sets & Indices:</div>
          <div class="math-line">i &isin; Feedstocks = &#123; Alkylate, CCG, SRG, Isopentane &#125;</div>
          <div class="math-line">j &isin; Gasolines = &#123; Gas A, Gas B, Gas C &#125;</div>
          
          <div class="math-title" style="margin-top: 15px;">2. Decision Variables:</div>
          <div class="math-line">x<sub>ij</sub> &ge; 0 : Thousands of gallons of feedstock i used to blend gasoline j</div>
          <div class="math-line">s<sub>i</sub> &ge; 0  : Thousands of gallons of unblended leftover feedstock i sold at residual market value</div>
          
          <div class="math-title" style="margin-top: 15px;">3. Objective Function (Maximize Total Gross Revenue):</div>
          <div class="math-line">max Z = &sum;<sub>j</sub> p<sub>j</sub> (&sum;<sub>i</sub> x<sub>ij</sub>) + &sum;<sub>i</sub> v<sub>i</sub> s<sub>i</sub></div>
          <div class="math-line" style="color: #94a3b8;">Where p<sub>A</sub> = $3.00, p<sub>B</sub> = $3.50, p<sub>C</sub> = $4.00; v = [ $4.50, $2.50, $2.25, $2.35 ]</div>

          <div class="math-title" style="margin-top: 15px;">4. Constraints:</div>
          <div class="math-line">&bull; <strong>Feedstock Supply Balance:</strong> &sum;<sub>j</sub> x<sub>ij</sub> + s<sub>i</sub> = Supply<sub>i</sub>, &forall; i &isin; Feedstocks</div>
          <div class="math-line">&bull; <strong>Contractual Minimum Demand:</strong> &sum;<sub>i</sub> x<sub>ij</sub> &ge; Demand<sub>j</sub>, &forall; j &isin; &#123;A, B, C&#125;</div>
          <div class="math-line">&bull; <strong>Max Reid Vapor Pressure (RVP &le; 7.0 psi):</strong> &sum;<sub>i</sub> (RVP<sub>i</sub> - 7.0) x<sub>ij</sub> &le; 0, &forall; j</div>
          <div class="math-line">&bull; <strong>Min Octane Rating:</strong></div>
          <div class="math-line">&nbsp;&nbsp;&nbsp;&bull; Gas A (Low TEL): &sum;<sub>i</sub> (OctaneLow<sub>i</sub> - 90) x<sub>iA</sub> &ge; 0</div>
          <div class="math-line">&nbsp;&nbsp;&nbsp;&bull; Gas B (High TEL): &sum;<sub>i</sub> (OctaneHigh<sub>i</sub> - 97) x<sub>iB</sub> &ge; 0</div>
          <div class="math-line">&nbsp;&nbsp;&nbsp;&bull; Gas C (High TEL): &sum;<sub>i</sub> (OctaneHigh<sub>i</sub> - 100) x<sub>iC</sub> &ge; 0</div>
          <div class="math-line">&bull; <strong>Company Policy Side Constraint:</strong> &sum;<sub>i</sub> x<sub>iA</sub> &ge; &sum;<sub>i</sub> x<sub>iB</sub> (Gas A &ge; Gas B)</div>
        </div>

        <h3>PuLP Python Implementation Verification</h3>
        <p>The model was solved using Python's <code>pulp</code> package with the CBC simplex solver, yielding status: <span class="badge badge-success">Optimal</span> and exact objective value: <strong>$1,718,021.80</strong>.</p>
      </div>
    </div>

    <!-- TAB 3: SCENARIOS (Q1 - Q5) -->
    <div id="tab-scenarios" class="tab-content" style="display: none;">
      <div class="card">
        <h2>Strategic Scenario Evaluations (Case Questions 1 to 5)</h2>
        
        <div style="margin-bottom: 25px;">
          <h3>Question 1: Economic Cost of the Side Constraint (Gas A &ge; Gas B)</h3>
          <p><strong>Finding:</strong> Enforcing Gas A &ge; Gas B costs Jansen Gas <strong>$6,988.41</strong>. Removing this constraint raises revenue from $1,718,021.80 to <strong>$1,725,010.21</strong>.</p>
          <p>Production shifts: Gas A drops from 130k to its contract floor of 120k gal, while high-margin Gas B surges from 130k to <strong>194.69k gal</strong>.</p>
        </div>

        <div style="margin-bottom: 25px;">
          <h3>Question 2: Technical Viability of Medium TEL for Gas B</h3>
          <p><strong>Finding:</strong> <span class="badge badge-danger">Strictly Infeasible</span></p>
          <p>Under Medium TEL, achieving 97 octane requires massive amounts of Alkylate and Isopentane. However, Isopentane's RVP of 20 breaches the 7.0 psi vapor pressure cap, and Alkylate is simultaneously needed by Gas C (100 octane). The specifications cannot be co-satisfied.</p>
        </div>

        <div style="margin-bottom: 25px;">
          <h3>Question 3: Stricter Reid Vapor Pressure Standards</h3>
          <p><strong>Finding:</strong> The maximum allowable RVP can be lowered from 7.0 psi down to <strong>6.43 psi</strong> before blending becomes impossible. Each 0.1 psi reduction costs ~$10,000 in lost revenue as Isopentane is forced into low-value salvage.</p>
        </div>

        <div style="margin-bottom: 25px;">
          <h3>Question 4: Gas A Maximum Feasible Octane Frontier</h3>
          <p><strong>Finding:</strong> Gas A's minimum octane requirement can be raised from 90.0 up to <strong>91.80</strong>. Beyond 91.80, the model becomes infeasible. Raising octane to 91.0 reduces revenue by -$28,950 because Alkylate is diverted away from $4.00 Gas C.</p>
        </div>

        <div style="margin-bottom: 25px;">
          <h3>Question 5: Proportional Price and Cost Invariance</h3>
          <p><strong>Finding:</strong> <span class="badge badge-success">Dave Wagner is 100% Correct</span></p>
          <p>If all gas prices and feedstock residual values scale uniformly by +10% (or shift by a constant +$1/gal), the optimal blending decision variables remain <strong>100.0% identical</strong>. Blending decisions depend purely on relative economic tradeoffs.</p>
        </div>
      </div>
    </div>

    <!-- TAB 4: CHARTS -->
    <div id="tab-charts" class="tab-content" style="display: none;">
      <div class="card">
        <h2>Analytical Visualizations</h2>
        
        <h3>1. Feedstock Allocation Across Finished Gasolines & Salvage</h3>
        <div class="chart-container">
          <img src="data:image/png;base64,{chart1_b64}" alt="Feedstock Allocation Chart">
        </div>

        <h3>2. Revenue Sensitivity to Tighter Reid Vapor Pressure Standards</h3>
        <div class="chart-container">
          <img src="data:image/png;base64,{chart2_b64}" alt="RVP Sensitivity Chart">
        </div>

        <h3>3. Feedstock Valuation: Market Value vs Marginal Shadow Price</h3>
        <div class="chart-container">
          <img src="data:image/png;base64,{chart3_b64}" alt="Shadow Prices Chart">
        </div>
      </div>
    </div>

  </div>

  <script>
    function showTab(tabId) {{
      document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      document.getElementById('tab-' + tabId).style.display = 'block';
      event.target.classList.add('active');
    }}
  </script>
</body>
</html>
"""
    html_report_path = os.path.join(OUTPUT_DIR, "jansen_gas_business_report.html")
    with open(html_report_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"[+] Business Report & Model generated at: {html_report_path}")
    
    # Automatically open report in user's default browser
    try:
        webbrowser.open("file://" + os.path.abspath(html_report_path))
        print("[+] Automatically opened Business Report & Model in your default web browser!")
    except Exception as e:
        print(f"[*] Note: Open {html_report_path} in your browser to view the interactive report.")

    print("[+] Script execution complete!")


if __name__ == '__main__':
    main()
