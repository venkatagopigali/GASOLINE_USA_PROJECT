const solver = require('javascript-lp-solver');

const FEEDSTOCKS = ['Alkylate', 'CCG', 'SRG', 'Isopentane'];
const GASES = ['A', 'B', 'C'];

const FEEDSTOCK_DATA = {
  'Alkylate':   { avail: 140, value: 4.50, rvp: 5,  oct_low: 98,  oct_high: 107 },
  'CCG':        { avail: 130, value: 2.50, rvp: 8,  oct_low: 87,  oct_high: 93 },
  'SRG':        { avail: 140, value: 2.25, rvp: 4,  oct_low: 83,  oct_high: 89 },
  'Isopentane': { avail: 110, value: 2.35, rvp: 20, oct_low: 101, oct_high: 108 }
};

const GAS_DATA = {
  'A': { req: 120, price: 3.00, max_rvp: 7, min_oct: 90, tel: 'Low' },
  'B': { req: 130, price: 3.50, max_rvp: 7, min_oct: 97, tel: 'High' },
  'C': { req: 120, price: 4.00, max_rvp: 7, min_oct: 100, tel: 'High' }
};

function solveJansenGas(options = {}) {
  const {
    sideConstraint = true,
    bTel = 'High',
    rvpDelta = 0,
    aMinOct = 90
  } = options;

  const model = {
    optimize: 'revenue',
    opType: 'max',
    constraints: {},
    variables: {}
  };

  // 1. Availability constraints
  for (const f of FEEDSTOCKS) {
    model.constraints[`avail_${f}`] = { max: FEEDSTOCK_DATA[f].avail };
  }

  // 2. Minimum demand constraints
  for (const g of GASES) {
    model.constraints[`demand_${g}`] = { min: GAS_DATA[g].req };
  }

  // 3. Max RVP: sum_i (rvp_i - max_rvp_g) * x_ig <= 0
  for (const g of GASES) {
    const limitRvp = GAS_DATA[g].max_rvp - rvpDelta;
    model.constraints[`rvp_${g}`] = { max: 0 };
  }

  // 4. Min Octane: sum_i (oct_ig - min_oct_g) * x_ig >= 0
  for (const g of GASES) {
    model.constraints[`oct_${g}`] = { min: 0 };
  }

  // 5. Side constraint: Prod(A) >= Prod(B) ==> Prod(A) - Prod(B) >= 0
  if (sideConstraint) {
    model.constraints['policy_A_ge_B'] = { min: 0 };
  }

  // Variables x_ig (Feedstock i in Gas g)
  for (const f of FEEDSTOCKS) {
    for (const g of GASES) {
      const varName = `blend_${f}_${g}`;
      const v = {
        revenue: GAS_DATA[g].price,
        [`avail_${f}`]: 1,
        [`demand_${g}`]: 1
      };

      // RVP coefficient
      const limitRvp = GAS_DATA[g].max_rvp - rvpDelta;
      v[`rvp_${g}`] = FEEDSTOCK_DATA[f].rvp - limitRvp;

      // Octane coefficient
      let octRating = FEEDSTOCK_DATA[f].oct_high;
      let minOct = GAS_DATA[g].min_oct;
      if (g === 'A') {
        octRating = FEEDSTOCK_DATA[f].oct_low;
        minOct = aMinOct;
      } else if (g === 'B' && bTel.toLowerCase() === 'medium') {
        octRating = (FEEDSTOCK_DATA[f].oct_low + FEEDSTOCK_DATA[f].oct_high) / 2;
      }
      v[`oct_${g}`] = octRating - minOct;

      if (sideConstraint) {
        if (g === 'A') v['policy_A_ge_B'] = 1;
        if (g === 'B') v['policy_A_ge_B'] = -1;
      }

      model.variables[varName] = v;
    }

    // Variable leftover s_i
    const leftoverVar = `leftover_${f}`;
    model.variables[leftoverVar] = {
      revenue: FEEDSTOCK_DATA[f].value,
      [`avail_${f}`]: 1
    };
  }

  const result = solver.Solve(model);
  return result;
}

const res = solveJansenGas();
console.log('Feasible:', res.feasible);
console.log('Total Revenue ($):', (res.result * 1000).toFixed(2));
console.log('Production:');
for (const g of GASES) {
  let prod = 0;
  for (const f of FEEDSTOCKS) {
    prod += res[`blend_${f}_${g}`] || 0;
  }
  console.log(`  Gas ${g}: ${prod.toFixed(2)}k gal`);
}
for (const f of FEEDSTOCKS) {
  console.log(`  Leftover ${f}: ${(res[`leftover_${f}`] || 0).toFixed(2)}k gal`);
}
