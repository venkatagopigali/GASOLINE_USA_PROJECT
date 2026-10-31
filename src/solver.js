import solver from 'javascript-lp-solver';

export const INITIAL_FEEDSTOCKS = {
  'Alkylate':   { avail: 140, value: 4.50, rvp: 5,  oct_low: 98,  oct_high: 107 },
  'CCG':        { avail: 130, value: 2.50, rvp: 8,  oct_low: 87,  oct_high: 93 },
  'SRG':        { avail: 140, value: 2.25, rvp: 4,  oct_low: 83,  oct_high: 89 },
  'Isopentane': { avail: 110, value: 2.35, rvp: 20, oct_low: 101, oct_high: 108 }
};

export const INITIAL_GASOLINES = {
  'A': { req: 120, price: 3.00, max_rvp: 7.0, min_oct: 90.0, tel: 'Low' },
  'B': { req: 130, price: 3.50, max_rvp: 7.0, min_oct: 97.0, tel: 'High' },
  'C': { req: 120, price: 4.00, max_rvp: 7.0, min_oct: 100.0, tel: 'High' }
};

export function solveBlendingModel(params = {}, calcShadowPrices = true) {
  const {
    feedstocks = INITIAL_FEEDSTOCKS,
    gasolines = INITIAL_GASOLINES,
    sideConstraint = true,
    bTel = 'High',
    rvpLimit = 7.0,
    aMinOct = 90.0
  } = params;

  const feedstockNames = Object.keys(feedstocks);
  const gasNames = Object.keys(gasolines);

  const model = {
    optimize: 'revenue',
    opType: 'max',
    constraints: {},
    variables: {}
  };

  // 1. Availability constraints: sum_j x_ij + s_i <= avail_i
  for (const f of feedstockNames) {
    model.constraints[`avail_${f}`] = { max: feedstocks[f].avail };
  }

  // 2. Demand constraints: sum_i x_ij >= req_j
  for (const g of gasNames) {
    model.constraints[`demand_${g}`] = { min: gasolines[g].req };
  }

  // 3. Reid Vapor Pressure: sum_i (rvp_i - rvpLimit) * x_ij <= 0
  for (const g of gasNames) {
    model.constraints[`rvp_${g}`] = { max: 0 };
  }

  // 4. Minimum Octane Rating: sum_i (oct_ij - min_oct_j) * x_ij >= 0
  for (const g of gasNames) {
    model.constraints[`oct_${g}`] = { min: 0 };
  }

  // 5. Side Policy Constraint: Prod(A) >= Prod(B) ==> Prod(A) - Prod(B) >= 0
  if (sideConstraint) {
    model.constraints['policy_A_ge_B'] = { min: 0 };
  }

  // Build Variables: x_ig
  for (const f of feedstockNames) {
    for (const g of gasNames) {
      const varName = `blend_${f}_${g}`;
      const v = {
        revenue: gasolines[g].price,
        [`avail_${f}`]: 1,
        [`demand_${g}`]: 1
      };

      // RVP coefficient
      v[`rvp_${g}`] = feedstocks[f].rvp - rvpLimit;

      // Octane rating coefficient
      let octRating = feedstocks[f].oct_high;
      let minOct = gasolines[g].min_oct;
      if (g === 'A') {
        octRating = feedstocks[f].oct_low;
        minOct = aMinOct;
      } else if (g === 'B' && bTel.toLowerCase() === 'medium') {
        octRating = (feedstocks[f].oct_low + feedstocks[f].oct_high) / 2.0;
      }
      v[`oct_${g}`] = octRating - minOct;

      // Side constraint coefficients
      if (sideConstraint) {
        if (g === 'A') v['policy_A_ge_B'] = 1;
        if (g === 'B') v['policy_A_ge_B'] = -1;
      }

      model.variables[varName] = v;
    }

    // Leftover variable s_i
    const leftoverVar = `leftover_${f}`;
    model.variables[leftoverVar] = {
      revenue: feedstocks[f].value,
      [`avail_${f}`]: 1
    };
  }

  const raw = solver.Solve(model);

  if (!raw.feasible) {
    return {
      feasible: false,
      status: 'Infeasible',
      reason: 'The specified chemical specifications and demand targets cannot be simultaneously satisfied by the available feedstocks.',
      revenue: 0,
      production: { A: 0, B: 0, C: 0 },
      blend: {},
      leftover: {},
      realizedRvp: {},
      realizedOctane: {}
    };
  }

  // Parse solution
  const blend = {};
  const production = { A: 0, B: 0, C: 0 };
  const leftover = {};

  for (const f of feedstockNames) {
    leftover[f] = raw[`leftover_${f}`] || 0;
    for (const g of gasNames) {
      const val = raw[`blend_${f}_${g}`] || 0;
      blend[`${f}_${g}`] = val;
      production[g] += val;
    }
  }

  // Realized quality
  const realizedRvp = {};
  const realizedOctane = {};
  for (const g of gasNames) {
    const totalProd = production[g];
    if (totalProd > 0) {
      realizedRvp[g] = feedstockNames.reduce((acc, f) => acc + (blend[`${f}_${g}`] * feedstocks[f].rvp), 0) / totalProd;
      
      let octVal = 0;
      if (g === 'A') {
        octVal = feedstockNames.reduce((acc, f) => acc + (blend[`${f}_${g}`] * feedstocks[f].oct_low), 0) / totalProd;
      } else if (g === 'B' && bTel.toLowerCase() === 'medium') {
        octVal = feedstockNames.reduce((acc, f) => {
          const med = (feedstocks[f].oct_low + feedstocks[f].oct_high) / 2.0;
          return acc + (blend[`${f}_${g}`] * med);
        }, 0) / totalProd;
      } else {
        octVal = feedstockNames.reduce((acc, f) => acc + (blend[`${f}_${g}`] * feedstocks[f].oct_high), 0) / totalProd;
      }
      realizedOctane[g] = octVal;
    } else {
      realizedRvp[g] = 0;
      realizedOctane[g] = 0;
    }
  }

  // Revenue breakdowns
  const gasRevenue = Object.keys(production).reduce((acc, g) => acc + (production[g] * gasolines[g].price * 1000), 0);
  const leftoverRevenue = feedstockNames.reduce((acc, f) => acc + (leftover[f] * feedstocks[f].value * 1000), 0);
  const totalRevenue = gasRevenue + leftoverRevenue;

  // Calculate shadow prices via finite difference without infinite recursion
  const shadowPrices = {};
  if (calcShadowPrices) {
    for (const f of feedstockNames) {
      if (leftover[f] > 0.05) {
        shadowPrices[f] = feedstocks[f].value;
      } else {
        const perturbedFeedstocks = {
          ...feedstocks,
          [f]: { ...feedstocks[f], avail: feedstocks[f].avail + 1.0 }
        };
        const pRes = solveBlendingModel({
          feedstocks: perturbedFeedstocks,
          gasolines,
          sideConstraint,
          bTel,
          rvpLimit,
          aMinOct
        }, false); // Pass false to prevent infinite recursion
        if (pRes.feasible) {
          shadowPrices[f] = (pRes.revenue - totalRevenue) / 1000.0;
        } else {
          shadowPrices[f] = feedstocks[f].value;
        }
      }
    }
  }

  return {
    feasible: true,
    status: 'Optimal',
    revenue: totalRevenue,
    gasRevenue,
    leftoverRevenue,
    production,
    blend,
    leftover,
    realizedRvp,
    realizedOctane,
    shadowPrices
  };
}
