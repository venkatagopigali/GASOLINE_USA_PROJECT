import React, { useState, useMemo } from 'react';
import {
  solveBlendingModel,
  INITIAL_FEEDSTOCKS,
  INITIAL_GASOLINES
} from './solver.js';
import {
  Fuel,
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  DollarSign,
  Layers,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  BarChart3,
  HelpCircle,
  FileCode2,
  ExternalLink,
  FileText,
  Printer
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'blending' | 'scenarios' | 'valuation' | 'model'
  const [sideConstraint, setSideConstraint] = useState(true);
  const [bTel, setBTel] = useState('High');
  const [rvpLimit, setRvpLimit] = useState(7.0);
  const [aMinOct, setAMinOct] = useState(90.0);
  const [gasolines, setGasolines] = useState(INITIAL_GASOLINES);
  const [feedstocks, setFeedstocks] = useState(INITIAL_FEEDSTOCKS);

  // Baseline solution for delta comparisons
  const baseline = useMemo(() => {
    return solveBlendingModel({
      feedstocks: INITIAL_FEEDSTOCKS,
      gasolines: INITIAL_GASOLINES,
      sideConstraint: true,
      bTel: 'High',
      rvpLimit: 7.0,
      aMinOct: 90.0
    });
  }, []);

  // Current solution based on active controls
  const solution = useMemo(() => {
    return solveBlendingModel({
      feedstocks,
      gasolines,
      sideConstraint,
      bTel,
      rvpLimit,
      aMinOct
    });
  }, [feedstocks, gasolines, sideConstraint, bTel, rvpLimit, aMinOct]);

  // Handler for presets
  const applyPreset = (presetKey) => {
    switch (presetKey) {
      case 'baseline':
        setSideConstraint(true);
        setBTel('High');
        setRvpLimit(7.0);
        setAMinOct(90.0);
        setGasolines(INITIAL_GASOLINES);
        setFeedstocks(INITIAL_FEEDSTOCKS);
        break;
      case 'q1_no_side':
        setSideConstraint(false);
        setBTel('High');
        setRvpLimit(7.0);
        setAMinOct(90.0);
        setGasolines(INITIAL_GASOLINES);
        setFeedstocks(INITIAL_FEEDSTOCKS);
        break;
      case 'q2_med_tel':
        setSideConstraint(true);
        setBTel('Medium');
        setRvpLimit(7.0);
        setAMinOct(90.0);
        setGasolines(INITIAL_GASOLINES);
        setFeedstocks(INITIAL_FEEDSTOCKS);
        break;
      case 'q3_strict_rvp':
        setSideConstraint(true);
        setBTel('High');
        setRvpLimit(6.6);
        setAMinOct(90.0);
        setGasolines(INITIAL_GASOLINES);
        setFeedstocks(INITIAL_FEEDSTOCKS);
        break;
      case 'q4_high_octane':
        setSideConstraint(true);
        setBTel('High');
        setRvpLimit(7.0);
        setAMinOct(91.5);
        setGasolines(INITIAL_GASOLINES);
        setFeedstocks(INITIAL_FEEDSTOCKS);
        break;
      case 'q5_inflation':
        setSideConstraint(true);
        setBTel('High');
        setRvpLimit(7.0);
        setAMinOct(90.0);
        const scaledGas = {};
        for (const k in INITIAL_GASOLINES) {
          scaledGas[k] = { ...INITIAL_GASOLINES[k], price: +(INITIAL_GASOLINES[k].price * 1.1).toFixed(2) };
        }
        const scaledFeed = {};
        for (const k in INITIAL_FEEDSTOCKS) {
          scaledFeed[k] = { ...INITIAL_FEEDSTOCKS[k], value: +(INITIAL_FEEDSTOCKS[k].value * 1.1).toFixed(2) };
        }
        setGasolines(scaledGas);
        setFeedstocks(scaledFeed);
        break;
      default:
        break;
    }
  };

  const revenueDelta = solution.feasible ? solution.revenue - baseline.revenue : 0;
  const feedstockNames = Object.keys(feedstocks);
  const gasNames = Object.keys(gasolines);

  // Chart data: stacked feedstock allocation (warm palette)
  const stackedChartData = [
    {
      name: 'Gas A',
      Alkylate: solution.blend['Alkylate_A'] || 0,
      CCG: solution.blend['CCG_A'] || 0,
      SRG: solution.blend['SRG_A'] || 0,
      Isopentane: solution.blend['Isopentane_A'] || 0,
    },
    {
      name: 'Gas B',
      Alkylate: solution.blend['Alkylate_B'] || 0,
      CCG: solution.blend['CCG_B'] || 0,
      SRG: solution.blend['SRG_B'] || 0,
      Isopentane: solution.blend['Isopentane_B'] || 0,
    },
    {
      name: 'Gas C',
      Alkylate: solution.blend['Alkylate_C'] || 0,
      CCG: solution.blend['CCG_C'] || 0,
      SRG: solution.blend['SRG_C'] || 0,
      Isopentane: solution.blend['Isopentane_C'] || 0,
    },
    {
      name: 'Leftover Sold',
      Alkylate: solution.leftover['Alkylate'] || 0,
      CCG: solution.leftover['CCG'] || 0,
      SRG: solution.leftover['SRG'] || 0,
      Isopentane: solution.leftover['Isopentane'] || 0,
    }
  ];

  // Chart data: shadow price vs book value
  const valuationChartData = feedstockNames.map(f => ({
    name: f,
    bookValue: feedstocks[f].value,
    shadowPrice: solution.shadowPrices ? +(solution.shadowPrices[f] || 0).toFixed(2) : feedstocks[f].value
  }));

  const totalAvailFeedstock = feedstockNames.reduce((acc, f) => acc + feedstocks[f].avail, 0);
  const totalLeftover = solution.feasible
    ? feedstockNames.reduce((acc, f) => acc + (solution.leftover[f] || 0), 0)
    : 0;
  const totalUsedFeedstock = totalAvailFeedstock - totalLeftover;

  return (
    <div className="min-h-screen bg-[#faf5ed] text-stone-900 flex flex-col font-sans">
      {/* Top Navigation Bar in Orange & Cream */}
      <header className="border-b border-[#e7dac9] bg-white/95 backdrop-blur sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Fuel className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold tracking-tight text-stone-900">JANSEN GAS</h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                Case 4.1
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium">Aviation Gasoline Blending Optimization Engine</p>
          </div>
        </div>

        {/* Action buttons & Presets */}
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          <button
            onClick={() => applyPreset('baseline')}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#fffdfa] hover:bg-orange-50 text-stone-700 border border-[#e7dac9] transition flex items-center gap-1.5 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
            Reset Baseline
          </button>
          <button
            onClick={() => applyPreset('q1_no_side')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border flex items-center gap-1.5 shadow-2xs ${
              !sideConstraint
                ? 'bg-orange-600 border-orange-700 text-white shadow-sm'
                : 'bg-white border-[#e7dac9] text-stone-700 hover:bg-orange-50 hover:text-orange-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Q1: No A ≥ B (+$7k)
          </button>
          <button
            onClick={() => applyPreset('q2_med_tel')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border flex items-center gap-1.5 shadow-2xs ${
              bTel === 'Medium'
                ? 'bg-rose-600 border-rose-700 text-white shadow-sm'
                : 'bg-white border-[#e7dac9] text-stone-700 hover:bg-orange-50'
            }`}
          >
            Q2: Med TEL
          </button>
          <button
            onClick={() => applyPreset('q3_strict_rvp')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border flex items-center gap-1.5 shadow-2xs ${
              rvpLimit === 6.6
                ? 'bg-orange-600 border-orange-700 text-white shadow-sm'
                : 'bg-white border-[#e7dac9] text-stone-700 hover:bg-orange-50'
            }`}
          >
            Q3: RVP ≤ 6.6
          </button>
          <button
            onClick={() => applyPreset('q4_high_octane')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border flex items-center gap-1.5 shadow-2xs ${
              aMinOct === 91.5
                ? 'bg-orange-600 border-orange-700 text-white shadow-sm'
                : 'bg-white border-[#e7dac9] text-stone-700 hover:bg-orange-50'
            }`}
          >
            Q4: Octane A 91.5
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* KPI Summary Cards in Warm Cream & Orange */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Revenue */}
          <div className="bg-white border border-[#e7dac9] rounded-2xl p-5 shadow-xs hover:shadow-md transition relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs uppercase tracking-wider font-bold">Total Net Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            {solution.feasible ? (
              <>
                <div className="text-3xl font-black text-stone-900 tracking-tight">
                  ${solution.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-2 flex items-center text-xs font-bold">
                  {Math.abs(revenueDelta) < 0.1 ? (
                    <span className="text-stone-400 font-medium">Matches Case Baseline</span>
                  ) : revenueDelta > 0 ? (
                    <span className="text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +${revenueDelta.toLocaleString('en-US', { maximumFractionDigits: 2 })} vs baseline
                    </span>
                  ) : (
                    <span className="text-rose-700 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      -${Math.abs(revenueDelta).toLocaleString('en-US', { maximumFractionDigits: 2 })} vs baseline
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-lg font-bold text-rose-600 flex items-center gap-2 mt-2">
                <AlertTriangle className="w-5 h-5" />
                INFEASIBLE MODEL
              </div>
            )}
          </div>

          {/* Card 2: Gasoline Sales */}
          <div className="bg-white border border-[#e7dac9] rounded-2xl p-5 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs uppercase tracking-wider font-bold">Gasoline Sales (A, B, C)</span>
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Fuel className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl font-black text-stone-900">
              ${solution.feasible ? solution.gasRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '$0.00'}
            </div>
            <div className="text-xs text-stone-500 mt-2 font-medium">
              {solution.feasible ? `${((solution.gasRevenue / solution.revenue) * 100).toFixed(1)}% of total revenue` : 'No fuel blended'}
            </div>
          </div>

          {/* Card 3: Feedstock Salvage */}
          <div className="bg-white border border-[#e7dac9] rounded-2xl p-5 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs uppercase tracking-wider font-bold">Residual Salvage</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Layers className="w-4 h-4 text-amber-700" />
              </div>
            </div>
            <div className="text-2xl font-black text-stone-900">
              ${solution.feasible ? solution.leftoverRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '$0.00'}
            </div>
            <div className="text-xs text-stone-500 mt-2 font-medium">
              {solution.feasible ? `${((solution.leftoverRevenue / solution.revenue) * 100).toFixed(1)}% from unsold feedstock` : '0 gal sold'}
            </div>
          </div>

          {/* Card 4: Utilization */}
          <div className="bg-white border border-[#e7dac9] rounded-2xl p-5 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs uppercase tracking-wider font-bold">Refinery Utilization</span>
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl font-black text-stone-900">
              {solution.feasible ? `${((totalUsedFeedstock / totalAvailFeedstock) * 100).toFixed(1)}%` : '0.0%'}
            </div>
            <div className="text-xs text-stone-500 mt-2 font-medium">
              {solution.feasible ? `${totalUsedFeedstock.toFixed(1)}k / ${totalAvailFeedstock}k gallons converted` : 'Halted'}
            </div>
          </div>

        </div>

        {/* Infeasibility Alert Banner */}
        {!solution.feasible && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3 shadow-xs">
            <ShieldAlert className="w-5 h-5 mt-0.5 text-rose-600 shrink-0" />
            <div>
              <h4 className="font-bold text-rose-900">Chemical or Volatility Infeasibility Detected</h4>
              <p className="text-sm mt-1 text-rose-700">{solution.reason}</p>
              <button
                onClick={() => applyPreset('baseline')}
                className="mt-3 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
              >
                Restore Feasible Baseline
              </button>
            </div>
          </div>
        )}

        {/* Layout: Sidebar Controls + Main Content Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Column: Interactive Controls */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white border border-[#e7dac9] rounded-2xl p-5 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#eee4d7] pb-3">
                <span className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-orange-600" />
                  Live Model Controls
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                  Interactive
                </span>
              </div>

              {/* Policy Constraint Switch */}
              <div className="space-y-1.5 bg-[#faf5ed] p-3 rounded-xl border border-[#ede3d5]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800">Policy: Gas A ≥ Gas B</label>
                  <button
                    onClick={() => setSideConstraint(!sideConstraint)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      sideConstraint ? 'bg-orange-600' : 'bg-stone-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                        sideConstraint ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-stone-500 leading-tight">
                  Enforces production of Gas A to be at least as large as Gas B.
                </p>
              </div>

              {/* Gas B TEL Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800">Gas B TEL Lead Level</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setBTel('High')}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition shadow-2xs ${
                      bTel === 'High'
                        ? 'bg-orange-600 border-orange-700 text-white'
                        : 'bg-[#faf5ed] border-[#e7dac9] text-stone-700 hover:bg-orange-50'
                    }`}
                  >
                    High TEL (Standard)
                  </button>
                  <button
                    onClick={() => setBTel('Medium')}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition shadow-2xs ${
                      bTel === 'Medium'
                        ? 'bg-rose-600 border-rose-700 text-white'
                        : 'bg-[#faf5ed] border-[#e7dac9] text-stone-700 hover:bg-orange-50'
                    }`}
                  >
                    Medium TEL (Q2)
                  </button>
                </div>
              </div>

              {/* RVP Limit Slider */}
              <div className="space-y-1.5 bg-[#faf5ed] p-3 rounded-xl border border-[#ede3d5]">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-stone-700">Max Reid Vapor Pressure</span>
                  <span className="text-orange-600 font-mono">{rvpLimit.toFixed(2)} psi</span>
                </div>
                <input
                  type="range"
                  min="6.3"
                  max="7.5"
                  step="0.05"
                  value={rvpLimit}
                  onChange={(e) => setRvpLimit(parseFloat(e.target.value))}
                  className="w-full accent-orange-600 bg-orange-200 rounded-lg cursor-pointer h-2"
                />
                <div className="flex justify-between text-[10px] text-stone-500 font-medium">
                  <span>6.43 psi (Infeasible)</span>
                  <span>7.00 psi (Case)</span>
                  <span>7.50 psi</span>
                </div>
              </div>

              {/* Gas A Min Octane */}
              <div className="space-y-1.5 bg-[#faf5ed] p-3 rounded-xl border border-[#ede3d5]">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-stone-700">Gas A Minimum Octane</span>
                  <span className="text-orange-600 font-mono">{aMinOct.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="88.0"
                  max="92.0"
                  step="0.1"
                  value={aMinOct}
                  onChange={(e) => setAMinOct(parseFloat(e.target.value))}
                  className="w-full accent-orange-600 bg-orange-200 rounded-lg cursor-pointer h-2"
                />
                <div className="flex justify-between text-[10px] text-stone-500 font-medium">
                  <span>88.0</span>
                  <span>90.0 (Case)</span>
                  <span>91.8 (Max Feasible)</span>
                </div>
              </div>

              {/* Prices Section */}
              <div className="pt-2 border-t border-[#eee4d7] space-y-2">
                <span className="text-xs font-extrabold text-stone-600 uppercase tracking-wider">Gasoline Selling Prices</span>
                <div className="grid grid-cols-3 gap-2">
                  {gasNames.map(g => (
                    <div key={g} className="bg-[#faf5ed] p-2 rounded-lg border border-[#e7dac9]">
                      <div className="text-[11px] font-bold text-stone-600">Gas {g} ($)</div>
                      <input
                        type="number"
                        step="0.10"
                        value={gasolines[g].price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setGasolines({
                            ...gasolines,
                            [g]: { ...gasolines[g], price: val }
                          });
                        }}
                        className="w-full bg-white border border-[#d6c5b3] rounded px-1.5 py-1 text-xs text-stone-900 mt-1 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedstock Supply Section */}
              <div className="pt-2 border-t border-[#eee4d7] space-y-2">
                <span className="text-xs font-extrabold text-stone-600 uppercase tracking-wider">Feedstock Available (1000s gal)</span>
                <div className="grid grid-cols-2 gap-2">
                  {feedstockNames.map(f => (
                    <div key={f} className="bg-[#faf5ed] p-2 rounded-lg border border-[#e7dac9]">
                      <div className="text-[11px] font-bold text-stone-600 truncate">{f}</div>
                      <input
                        type="number"
                        step="5"
                        value={feedstocks[f].avail}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFeedstocks({
                            ...feedstocks,
                            [f]: { ...feedstocks[f], avail: val }
                          });
                        }}
                        className="w-full bg-white border border-[#d6c5b3] rounded px-1.5 py-1 text-xs text-stone-900 mt-1 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Main Content Tabs */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Tab Navigation in Orange & Cream */}
            <div className="flex border-b border-[#e7dac9] space-x-2 overflow-x-auto pb-px">
              <button
                onClick={() => setActiveTab('report')}
                className={`pb-3 px-4 text-sm font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'report'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Executive Business Report
              </button>
              <button
                onClick={() => setActiveTab('blending')}
                className={`pb-3 px-4 text-sm font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'blending'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                Optimal Blending Plan
              </button>
              <button
                onClick={() => setActiveTab('scenarios')}
                className={`pb-3 px-4 text-sm font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'scenarios'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Case Questions & Scenarios
              </button>
              <button
                onClick={() => setActiveTab('valuation')}
                className={`pb-3 px-4 text-sm font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'valuation'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Dual / Shadow Prices
              </button>
              <button
                onClick={() => setActiveTab('model')}
                className={`pb-3 px-4 text-sm font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'model'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <FileCode2 className="w-4 h-4" />
                Mathematical Model
              </button>
            </div>

            {/* TAB 0: EXECUTIVE BUSINESS REPORT */}
            {activeTab === 'report' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#e7dac9] rounded-2xl p-7 space-y-6 shadow-xs">
                  {/* Memo Header */}
                  <div className="flex flex-wrap items-center justify-between border-b border-[#eee4d7] pb-4 gap-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-orange-800 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
                        Formal Business Deliverable
                      </span>
                      <h2 className="text-2xl font-black text-stone-900 mt-2">Executive Business Report & Decision Memo</h2>
                      <p className="text-xs text-stone-500 mt-1 font-medium">
                        Case 4.1: Blending Aviation Gasoline at Jansen Gas &bull; Production Optimization Review
                      </p>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg border border-orange-700 text-xs font-bold flex items-center gap-2 transition shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                      Print / Save PDF
                    </button>
                  </div>

                  {/* Memorandum Metadata */}
                  <div className="bg-[#faf5ed] p-4 rounded-xl border border-[#e7dac9] text-xs text-stone-700 space-y-1.5 font-mono">
                    <div><strong className="text-stone-900 font-sans">TO:</strong> Dave Wagner, Production Manager & Executive Leadership, Jansen Gas</div>
                    <div><strong className="text-stone-900 font-sans">FROM :--</strong> Gali Venkata Gopi</div>
                    <div><strong className="text-stone-900 font-sans">DATE:</strong> October 2026</div>
                    <div><strong className="text-stone-900 font-sans">SUBJECT:</strong> Optimal Feedstock Blending Strategy, Bottleneck Analysis, & Policy Evaluation</div>
                  </div>

                  {/* Executive Summary Callout */}
                  <div className="p-5 rounded-xl bg-gradient-to-r from-orange-50 via-[#fffaf2] to-amber-50 border-l-4 border-orange-500 text-stone-800 space-y-2 shadow-2xs">
                    <h3 className="font-bold text-orange-900 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-orange-600" />
                      Executive Summary & Optimal Financial Outcome
                    </h3>
                    <p className="text-xs text-stone-700 leading-relaxed font-medium">
                      Using Linear Programming optimization, Jansen Gas can achieve a maximized total revenue of <strong className="text-stone-900 font-bold">${solution.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> from finished gasoline sales and residual feedstock liquidations.
                      All quality constraints (Reid vapor pressure &le; 7.0 psi, minimum Octane ratings) are strictly met. Alkylate is our primary binding bottleneck (100% utilized, shadow price of <strong className="text-orange-700 font-bold">$5.77/gal</strong>).
                    </p>
                  </div>

                  {/* Revenue Breakdown Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#faf5ed] p-4 rounded-xl border border-[#e7dac9]">
                      <span className="text-xs text-stone-500 uppercase font-bold">Gasoline Sales</span>
                      <div className="text-xl font-black text-stone-900 mt-1 font-mono">
                        ${solution.gasRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-[11px] text-emerald-700 font-bold">85.3% of total revenue</span>
                    </div>
                    <div className="bg-[#faf5ed] p-4 rounded-xl border border-[#e7dac9]">
                      <span className="text-xs text-stone-500 uppercase font-bold">Feedstock Salvage</span>
                      <div className="text-xl font-black text-stone-900 mt-1 font-mono">
                        ${solution.leftoverRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-[11px] text-amber-700 font-bold">14.7% from residual liquidation</span>
                    </div>
                    <div className="bg-[#faf5ed] p-4 rounded-xl border border-[#e7dac9]">
                      <span className="text-xs text-stone-500 uppercase font-bold">Total Revenue</span>
                      <div className="text-xl font-black text-orange-600 mt-1 font-mono">
                        ${solution.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-[11px] text-stone-500 font-medium">Maximized Objective</span>
                    </div>
                  </div>

                  {/* Strategic Case Questions Answers */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-base font-extrabold text-stone-900 border-b border-[#eee4d7] pb-2">
                      Strategic Case Questions & Findings (Dave Wagner Inquiries)
                    </h3>

                    {/* Q1 */}
                    <div className="bg-[#faf5ed] p-4 rounded-xl border border-[#e7dac9] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-orange-100 text-orange-800 border border-orange-200">
                          Question 1: Policy Constraint (Gas A &ge; Gas B)
                        </span>
                        <span className="text-xs font-mono font-bold text-orange-700">+$6,988.41 Opportunity Cost</span>
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed font-medium">
                        <strong>Finding:</strong> Enforcing the company policy that Gas A produced must be at least as large as Gas B costs the company <strong>$6,988.41</strong> in lost profit.
                        Removing this constraint allows production of higher-priced Gas B ($3.50/gal) to rise to <strong>194.69k gallons</strong>, increasing total revenue to <strong>$1,725,010.21</strong>.
                      </p>
                    </div>

                    {/* Q2 */}
                    <div className="bg-[#faf5ed] p-4 rounded-xl border border-[#e7dac9] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                          Question 2: Medium TEL for Gas B
                        </span>
                        <span className="text-xs font-bold text-rose-700">Strictly Infeasible</span>
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed font-medium">
                        <strong>Finding:</strong> Producing Gas B with Medium TEL is <strong>chemically impossible</strong>. Achieving 97 octane requires large fractions of Alkylate and Isopentane; however, Isopentane's RVP of 20 exceeds the 7.0 psi limit, and Alkylate is simultaneously required by Gas C (100 octane). Jansen must keep Gas B on High TEL.
                      </p>
                    </div>

                    {/* Q3 */}
                    <div className="bg-[#faf5ed] p-4 rounded-xl border border-[#e7dac9] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                          Question 3: Tighter Reid Vapor Pressure Standards
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-700">Min Feasible RVP: 6.43 psi</span>
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed font-medium">
                        <strong>Finding:</strong> Stricter environmental standards can lower maximum RVP from 7.0 down to <strong>6.43 psi</strong> before blending becomes mathematically infeasible. Every 0.1 psi reduction costs approximately <strong>$10,000</strong> in lost revenue.
                      </p>
                    </div>

                    {/* Q4 */}
                    <div className="bg-[#faf5ed] p-4 rounded-xl border border-[#e7dac9] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-orange-100 text-orange-800 border border-orange-200">
                          Question 4: Gas A Octane Limits
                        </span>
                        <span className="text-xs font-mono font-bold text-orange-700">Max Feasible Octane: 91.80</span>
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed font-medium">
                        <strong>Finding:</strong> Dave Wagner's hypothesis that Gas A octane can be raised is feasible up to <strong>91.80</strong> octane. However, raising it diverts Alkylate from Gas C ($4.00/gal), decreasing revenue by $28,950 at 91.0 octane unless customers pay a premium.
                      </p>
                    </div>

                    {/* Q5 */}
                    <div className="bg-[#faf5ed] p-4 rounded-xl border border-[#e7dac9] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Question 5: Market Inflation & Price Scale Invariance
                        </span>
                        <span className="text-xs font-bold text-emerald-700">100% Invariant Recipe</span>
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed font-medium">
                        <strong>Finding:</strong> Dave is <strong>100% correct</strong>. Proportional (+10%) or uniform additive (+$1/gal) price/value changes do not alter the optimal physical blend recipe because relative property-to-margin tradeoffs remain constant.
                      </p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="border-t border-[#eee4d7] pt-4 space-y-3">
                    <h3 className="text-base font-extrabold text-stone-900">Actionable Recommendations for Dave Wagner</h3>
                    <ul className="text-xs text-stone-700 space-y-2 list-disc pl-5 font-medium leading-relaxed">
                      <li><strong>Remove Policy Constraint:</strong> Recommend executive approval to eliminate $Gas\ A \ge Gas\ B$, capturing <strong>+$6,988.41</strong> in immediate margin.</li>
                      <li><strong>Procure Extra Alkylate:</strong> Alkylate has an internal optimization worth of <strong>$5.77/gal</strong> (vs $4.50 book value). Acquire up to 50k additional gallons at any price under $5.50/gal.</li>
                      <li><strong>Maintain High TEL on Gas B:</strong> Reject Medium TEL suggestions from chemical staff due to severe infeasibility.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: BLENDING PLAN */}
            {activeTab === 'blending' && (
              <div className="space-y-6">
                
                {/* Table: Optimal Blending Matrix */}
                <div className="bg-white border border-[#e7dac9] rounded-2xl p-6 overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-extrabold text-stone-900">Optimal Blending Recipe Matrix (1,000s of Gallons)</h3>
                    <span className="text-xs text-stone-500 font-medium">Total Refinery Feedstock: {totalAvailFeedstock}k gal</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#e7dac9] bg-[#f7f0e6] text-stone-700 uppercase tracking-wider font-bold">
                          <th className="py-2.5 px-3">Feedstock</th>
                          <th className="py-2.5 px-3 text-right">Gas A (${gasolines.A.price.toFixed(2)})</th>
                          <th className="py-2.5 px-3 text-right">Gas B (${gasolines.B.price.toFixed(2)})</th>
                          <th className="py-2.5 px-3 text-right">Gas C (${gasolines.C.price.toFixed(2)})</th>
                          <th className="py-2.5 px-3 text-right text-orange-700 font-bold">Leftover Sold</th>
                          <th className="py-2.5 px-3 text-right">Total Avail</th>
                          <th className="py-2.5 px-3 text-right">Utilization</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eee4d7] font-mono">
                        {feedstockNames.map(f => {
                          const usedInBlend = gasNames.reduce((acc, g) => acc + (solution.blend[`${f}_${g}`] || 0), 0);
                          const leftoverVal = solution.leftover[f] || 0;
                          const avail = feedstocks[f].avail;
                          const utilPercent = (usedInBlend / avail) * 100;
                          return (
                            <tr key={f} className="hover:bg-orange-50/50 transition">
                              <td className="py-2.5 px-3 font-sans font-bold text-stone-900">{f}</td>
                              <td className="py-2.5 px-3 text-right text-stone-700">{(solution.blend[`${f}_A`] || 0).toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right text-stone-700">{(solution.blend[`${f}_B`] || 0).toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right text-stone-700">{(solution.blend[`${f}_C`] || 0).toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right text-orange-700 font-bold">{leftoverVal.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right text-stone-500">{avail.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-sans font-bold ${
                                  utilPercent >= 99.9 ? 'bg-orange-100 text-orange-800 border border-orange-300' : 'bg-stone-100 text-stone-600'
                                }`}>
                                  {utilPercent.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {/* Totals Row */}
                        <tr className="border-t-2 border-orange-300 bg-[#fff8ee] font-bold">
                          <td className="py-3 px-3 font-sans text-stone-900">Total Produced</td>
                          <td className="py-3 px-3 text-right text-orange-600">{solution.production.A.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-orange-600">{solution.production.B.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-orange-600">{solution.production.C.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-amber-700">{totalLeftover.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-stone-900">{totalAvailFeedstock.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-orange-700">{((totalUsedFeedstock/totalAvailFeedstock)*100).toFixed(1)}%</td>
                        </tr>
                        {/* Minimum Required Row */}
                        <tr className="text-stone-500 text-[11px] bg-stone-50/50">
                          <td className="py-2 px-3 font-sans font-medium">Min Contract Demand</td>
                          <td className="py-2 px-3 text-right">{gasolines.A.req.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">{gasolines.B.req.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">{gasolines.C.req.toFixed(2)}</td>
                          <td colSpan={3} className="py-2 px-3 text-right italic font-sans text-stone-500">
                            Gas C produced up to maximum feasible profit
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Finished Gasoline Chemical Specifications (Quality Checks) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {gasNames.map(g => {
                    const rvpVal = solution.realizedRvp[g] || 0;
                    const octVal = solution.realizedOctane[g] || 0;
                    const minOct = g === 'A' ? aMinOct : gasolines[g].min_oct;
                    const maxRvp = rvpLimit;

                    return (
                      <div key={g} className="bg-white border border-[#e7dac9] rounded-2xl p-5 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-[#eee4d7] pb-2">
                          <span className="font-extrabold text-stone-900 text-sm">Gasoline {g} Quality</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                            ${gasolines[g].price.toFixed(2)} / gal
                          </span>
                        </div>

                        {/* RVP Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-stone-500">Reid Vapor Pressure:</span>
                            <span className="font-mono text-stone-900">
                              {rvpVal.toFixed(2)} / {maxRvp.toFixed(2)} psi
                            </span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-orange-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (rvpVal / maxRvp) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Octane Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-stone-500">Octane ({gasolines[g].tel} TEL):</span>
                            <span className="font-mono text-stone-900">
                              {octVal.toFixed(2)} / min {minOct.toFixed(1)}
                            </span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-amber-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (octVal / 110) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stacked Chart in Warm Orange + Cream Palette */}
                <div className="bg-white border border-[#e7dac9] rounded-2xl p-6 shadow-xs">
                  <h3 className="text-base font-extrabold text-stone-900 mb-4">Feedstock Allocation by Finished Product & Salvage</h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stackedChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0e6d8" />
                        <XAxis dataKey="name" stroke="#78716c" fontBold />
                        <YAxis stroke="#78716c" label={{ value: 'Gallons (1000s)', angle: -90, position: 'insideLeft', fill: '#78716c' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7dac9', borderRadius: '8px', color: '#1c1917' }}
                          formatter={(val) => [`${val.toFixed(2)}k gal`]}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar dataKey="Alkylate" stackId="a" fill="#ea580c" />
                        <Bar dataKey="CCG" stackId="a" fill="#d97706" />
                        <Bar dataKey="SRG" stackId="a" fill="#c2410c" />
                        <Bar dataKey="Isopentane" stackId="a" fill="#fb923c" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: STRATEGIC SCENARIOS */}
            {activeTab === 'scenarios' && (
              <div className="space-y-4">
                
                {/* Scenario 1 */}
                <div className="bg-white border border-[#e7dac9] rounded-2xl p-6 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                        Question 1
                      </span>
                      <h4 className="font-extrabold text-stone-900 text-base">Cost of the Side Constraint (Gas A ≥ Gas B)</h4>
                    </div>
                    <button
                      onClick={() => applyPreset('q1_no_side')}
                      className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
                    >
                      Run Scenario 1
                    </button>
                  </div>
                  <p className="text-sm text-stone-700 font-medium">
                    Dave is not sure whether the policy requirement of producing at least as much Gas A as Gas B is necessary. What is this constraint costing Jansen Gas?
                  </p>
                  <div className="bg-[#faf5ed] p-4 rounded-xl border border-[#e7dac9] space-y-2 text-xs font-medium">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Baseline Revenue (With Side Constraint):</span>
                      <span className="font-mono font-bold text-stone-900">$1,718,021.80</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Revenue Without Side Constraint:</span>
                      <span className="font-mono font-bold text-emerald-700">$1,725,010.21</span>
                    </div>
                    <div className="flex justify-between border-t border-[#e7dac9] pt-2 font-bold">
                      <span className="text-orange-700">Net Opportunity Cost of Policy:</span>
                      <span className="font-mono text-orange-700 text-sm">+$6,988.41</span>
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 italic">
                    Strategic Insight: The constraint forces the refinery to blend 10k additional gallons of \$3.00 Gas A instead of high-margin Gas B (\$3.50/gal).
                  </p>
                </div>

                {/* Scenario 2 */}
                <div className="bg-white border border-[#e7dac9] rounded-2xl p-6 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                        Question 2
                      </span>
                      <h4 className="font-extrabold text-stone-900 text-base">Medium TEL Level for Gas B</h4>
                    </div>
                    <button
                      onClick={() => applyPreset('q2_med_tel')}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
                    >
                      Test Medium TEL
                    </button>
                  </div>
                  <p className="text-sm text-stone-700 font-medium">
                    Chemical experts suggested producing Gas B with a "Medium" TEL level (octane ratings halfway between Low and High). Would this be a better option?
                  </p>
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                    <span className="font-bold text-rose-900">Finding: Mathematically INFEASIBLE</span>
                    <p className="text-stone-600 font-medium">
                      Reaching Octane 97 under Medium TEL requires vast quantities of Alkylate and Isopentane. However, Isopentane has an RVP of 20 (limit is 7.0), and Alkylate is simultaneously required by Gas C (min octane 100).
                    </p>
                  </div>
                </div>

                {/* Scenario 3 */}
                <div className="bg-white border border-[#e7dac9] rounded-2xl p-6 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                        Question 3
                      </span>
                      <h4 className="font-extrabold text-stone-900 text-base">Tighter Reid Vapor Pressure Standards</h4>
                    </div>
                    <button
                      onClick={() => applyPreset('q3_strict_rvp')}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
                    >
                      Set RVP = 6.6
                    </button>
                  </div>
                  <p className="text-sm text-stone-700 font-medium">
                    If environmental air pollution regulations lower the maximum Reid vapor pressure across all gas types, how does it affect revenue?
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#faf5ed] p-3.5 rounded-xl border border-[#e7dac9]">
                      <span className="text-stone-500 block font-bold">Critical Feasibility Threshold</span>
                      <span className="text-lg font-black text-stone-900 font-mono">6.43 psi</span>
                      <span className="text-[11px] text-stone-500 block mt-1">Below this, no blend is viable</span>
                    </div>
                    <div className="bg-[#faf5ed] p-3.5 rounded-xl border border-[#e7dac9]">
                      <span className="text-stone-500 block font-bold">Marginal Cost of Compliance</span>
                      <span className="text-lg font-black text-rose-700 font-mono">-$10,000</span>
                      <span className="text-[11px] text-stone-500 block mt-1">Revenue lost per 0.1 psi reduction</span>
                    </div>
                  </div>
                </div>

                {/* Scenario 4 & 5 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-[#e7dac9] rounded-2xl p-5 space-y-3 shadow-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                        Question 4
                      </span>
                      <h4 className="font-bold text-stone-900 text-sm">Gas A Octane Frontier</h4>
                    </div>
                    <p className="text-xs text-stone-600 font-medium">
                      How far can Gas A minimum octane be raised above 90.0 before losing feasibility?
                    </p>
                    <div className="text-xs font-mono bg-[#faf5ed] p-3 rounded-xl border border-[#e7dac9]">
                      <span className="text-orange-700 font-black text-base">91.80 Max Octane</span>
                      <p className="text-stone-500 text-[11px] mt-1 font-sans">
                        Costs -$29k at 91.0 octane as Alkylate is diverted from high-priced Gas C.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-[#e7dac9] rounded-2xl p-5 space-y-3 shadow-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Question 5
                      </span>
                      <h4 className="font-bold text-stone-900 text-sm">Price Scaling Invariance</h4>
                    </div>
                    <p className="text-xs text-stone-600 font-medium">
                      Do uniform percentage or additive price and feedstock shifts change the optimal blend?
                    </p>
                    <div className="text-xs font-mono bg-[#faf5ed] p-3 rounded-xl border border-[#e7dac9]">
                      <span className="text-emerald-700 font-black text-base">100% Invariant Recipe</span>
                      <p className="text-stone-500 text-[11px] mt-1 font-sans">
                        Dave is 100% correct. Decision variables depend exclusively on relative margins.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: DUAL / SHADOW PRICES */}
            {activeTab === 'valuation' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#e7dac9] rounded-2xl p-6 shadow-xs">
                  <h3 className="text-base font-extrabold text-stone-900 mb-2">Feedstock Marginal Worth (Dual / Shadow Price Analysis)</h3>
                  <p className="text-xs text-stone-500 mb-4 font-medium">
                    The shadow price indicates the maximum price Jansen Gas should be willing to pay for one additional gallon of raw feedstock.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-[#e7dac9] bg-[#f7f0e6] text-stone-700 uppercase tracking-wider font-sans font-bold">
                          <th className="py-2.5 px-3">Feedstock</th>
                          <th className="py-2.5 px-3 text-right">Available</th>
                          <th className="py-2.5 px-3 text-right">Book Value ($)</th>
                          <th className="py-2.5 px-3 text-right text-orange-700">Shadow Price ($)</th>
                          <th className="py-2.5 px-3 text-right">Marginal Profit Premium</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eee4d7]">
                        {feedstockNames.map(f => {
                          const book = feedstocks[f].value;
                          const shadow = solution.shadowPrices ? +(solution.shadowPrices[f] || 0) : book;
                          const premium = shadow - book;
                          const isBinding = (solution.leftover[f] || 0) <= 0.05;

                          return (
                            <tr key={f} className="hover:bg-orange-50/50 transition">
                              <td className="py-3 px-3 font-sans font-bold text-stone-900">{f}</td>
                              <td className="py-3 px-3 text-right text-stone-700">{feedstocks[f].avail}k gal</td>
                              <td className="py-3 px-3 text-right text-stone-500">${book.toFixed(2)}</td>
                              <td className="py-3 px-3 text-right text-orange-700 font-bold">${shadow.toFixed(2)}</td>
                              <td className="py-3 px-3 text-right">
                                {premium > 0.01 ? (
                                  <span className="text-emerald-700 font-bold">+${premium.toFixed(2)} / gal</span>
                                ) : (
                                  <span className="text-stone-400">$0.00</span>
                                )}
                              </td>
                              <td className="py-3 px-3 font-sans">
                                {isBinding ? (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
                                    Bottleneck (100% Used)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-600">
                                    Surplus ({(solution.leftover[f] || 0).toFixed(1)}k gal unsold)
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Valuation Bar Chart */}
                <div className="bg-white border border-[#e7dac9] rounded-2xl p-6 shadow-xs">
                  <h3 className="text-base font-extrabold text-stone-900 mb-4">Feedstock Market Value vs Internal Optimization Shadow Price</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={valuationChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0e6d8" />
                        <XAxis dataKey="name" stroke="#78716c" fontBold />
                        <YAxis stroke="#78716c" label={{ value: '$ per Gallon', angle: -90, position: 'insideLeft', fill: '#78716c' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7dac9', borderRadius: '8px', color: '#1c1917' }}
                          formatter={(val) => [`$${val.toFixed(2)} / gal`]}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar dataKey="bookValue" name="Feedstock Salvage Value ($)" fill="#a8a29e" />
                        <Bar dataKey="shadowPrice" name="Internal Shadow Price ($)" fill="#ea580c" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MATHEMATICAL MODEL DEFINITION */}
            {activeTab === 'model' && (
              <div className="bg-white border border-[#e7dac9] rounded-2xl p-7 space-y-5 text-sm shadow-xs">
                <div>
                  <h3 className="text-base font-extrabold text-stone-900 mb-2">Linear Programming Model Formulation</h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Standard mathematical model for refinery blending optimization with residual salvage disposal.
                  </p>
                </div>

                <div className="bg-[#faf5ed] p-5 rounded-xl border border-[#e7dac9] space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-orange-700 font-bold block mb-1 font-sans">Objective Function (Maximize Total Revenue):</span>
                    <span className="text-stone-800">
                      max Z = &sum;<sub>j &isin; &#123;A,B,C&#125;</sub> p<sub>j</sub> (&sum;<sub>i</sub> x<sub>ij</sub>) + &sum;<sub>i</sub> v<sub>i</sub> s<sub>i</sub>
                    </span>
                  </div>

                  <div>
                    <span className="text-orange-700 font-bold block mb-1 font-sans">1. Feedstock Material Balance:</span>
                    <span className="text-stone-800">&sum;<sub>j</sub> x<sub>ij</sub> + s<sub>i</sub> = Supply<sub>i</sub>, &forall; i &isin; Feedstocks</span>
                  </div>

                  <div>
                    <span className="text-orange-700 font-bold block mb-1 font-sans">2. Minimum Demand Targets:</span>
                    <span className="text-stone-800">&sum;<sub>i</sub> x<sub>ij</sub> &ge; Demand<sub>j</sub>, &forall; j &isin; &#123;A, B, C&#125;</span>
                  </div>

                  <div>
                    <span className="text-orange-700 font-bold block mb-1 font-sans">3. Reid Vapor Pressure (RVP &le; 7.0 psi):</span>
                    <span className="text-stone-800">&sum;<sub>i</sub> (RVP<sub>i</sub> - 7.0) x<sub>ij</sub> &le; 0, &forall; j &isin; &#123;A, B, C&#125;</span>
                  </div>

                  <div>
                    <span className="text-orange-700 font-bold block mb-1 font-sans">4. Octane Requirements (Low TEL for A, High for B & C):</span>
                    <span className="text-stone-800">
                      &sum;<sub>i</sub> (OctaneLow<sub>i</sub> - 90) x<sub>iA</sub> &ge; 0<br />
                      &sum;<sub>i</sub> (OctaneHigh<sub>i</sub> - 97) x<sub>iB</sub> &ge; 0<br />
                      &sum;<sub>i</sub> (OctaneHigh<sub>i</sub> - 100) x<sub>iC</sub> &ge; 0
                    </span>
                  </div>

                  <div>
                    <span className="text-orange-700 font-bold block mb-1 font-sans">5. Production Policy:</span>
                    <span className="text-stone-800">&sum;<sub>i</sub> x<sub>iA</sub> &ge; &sum;<sub>i</sub> x<sub>iB</sub> (Gas A &ge; Gas B)</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#eee4d7] flex items-center justify-between text-xs text-stone-500">
                  <span>Engine: Pure Client-Side Simplex LP Solver (Zero Vercel cold-start latency)</span>
                  <span className="text-orange-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-orange-600" />
                    Verified against PuLP CBC ($1,718,021.80)
                  </span>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Footer in Warm Cream */}
      <footer className="border-t border-[#e7dac9] bg-white py-4 px-6 text-center text-xs text-stone-500 mt-auto">
        Jansen Gas Aviation Gasoline Blending Decision Support System &bull; Designed by Gali Venkata Gopi &bull; 2026
      </footer>
    </div>
  );
}
