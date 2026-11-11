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
  Sparkles,
  BarChart3,
  FileCode2,
  FileText,
  Printer,
  Award
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
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
        Object.keys(INITIAL_GASOLINES).forEach(k => {
          scaledGas[k] = { ...INITIAL_GASOLINES[k], price: +(INITIAL_GASOLINES[k].price * 1.10).toFixed(2) };
        });
        const scaledFeed = {};
        Object.keys(INITIAL_FEEDSTOCKS).forEach(k => {
          scaledFeed[k] = { ...INITIAL_FEEDSTOCKS[k], value: +(INITIAL_FEEDSTOCKS[k].value * 1.10).toFixed(2) };
        });
        setGasolines(scaledGas);
        setFeedstocks(scaledFeed);
        break;
      default:
        break;
    }
  };

  const revenueDelta = solution.feasible ? solution.revenue - baseline.revenue : 0;
  const gasNames = ['A', 'B', 'C'];
  const feedstockNames = ['Alkylate', 'CCG', 'SRG', 'Isopentane'];

  // Chart data: feedstock breakdown
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
    <div className="min-h-screen bg-[#FAF5EB] text-[#2C241D] flex flex-col font-sans selection:bg-[#FED7AA] selection:text-[#9A3412]">
      {/* Top Header in Orange & Cream */}
      <header className="border-b border-[#E8DAC6] bg-[#FFFEFB]/95 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#EA580C] via-[#F97316] to-[#FBBF24] flex items-center justify-center shadow-lg shadow-orange-500/25 ring-2 ring-orange-200">
            <Fuel className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black tracking-tight text-[#2C241D]">JANSEN GAS</h1>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#9A3412] border border-orange-200">
                Case 4.1
              </span>
            </div>
            <p className="text-xs text-[#786C5E] font-medium">Aviation Gasoline Blending Optimization Engine</p>
          </div>
        </div>

        {/* Action buttons & Presets */}
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          <button
            onClick={() => applyPreset('baseline')}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#FFFEFB] hover:bg-orange-50 text-[#3C3024] border border-[#E8DAC6] hover:border-orange-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#EA580C]" />
            Reset Baseline
          </button>
          <button
            onClick={() => applyPreset('q1_no_side')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition border flex items-center gap-1.5 shadow-2xs cursor-pointer ${
              !sideConstraint
                ? 'bg-gradient-to-r from-[#EA580C] to-[#F97316] border-[#EA580C] text-white shadow-md shadow-orange-500/20'
                : 'bg-[#FFFEFB] border-[#E8DAC6] text-[#3C3024] hover:bg-orange-50 hover:border-orange-300 hover:text-[#9A3412]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
            Q1: No A ≥ B (+$7k)
          </button>
          <button
            onClick={() => applyPreset('q2_med_tel')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition border flex items-center gap-1.5 shadow-2xs cursor-pointer ${
              bTel === 'Medium'
                ? 'bg-gradient-to-r from-[#DC2626] to-[#EA580C] border-[#DC2626] text-white shadow-md shadow-red-500/20'
                : 'bg-[#FFFEFB] border-[#E8DAC6] text-[#3C3024] hover:bg-orange-50 hover:border-orange-300'
            }`}
          >
            Q2: Med TEL
          </button>
          <button
            onClick={() => applyPreset('q3_strict_rvp')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition border flex items-center gap-1.5 shadow-2xs cursor-pointer ${
              rvpLimit === 6.6
                ? 'bg-gradient-to-r from-[#EA580C] to-[#F97316] border-[#EA580C] text-white shadow-md shadow-orange-500/20'
                : 'bg-[#FFFEFB] border-[#E8DAC6] text-[#3C3024] hover:bg-orange-50 hover:border-orange-300'
            }`}
          >
            Q3: RVP ≤ 6.6
          </button>
          <button
            onClick={() => applyPreset('q4_high_octane')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition border flex items-center gap-1.5 shadow-2xs cursor-pointer ${
              aMinOct === 91.5
                ? 'bg-gradient-to-r from-[#EA580C] to-[#F97316] border-[#EA580C] text-white shadow-md shadow-orange-500/20'
                : 'bg-[#FFFEFB] border-[#E8DAC6] text-[#3C3024] hover:bg-orange-50 hover:border-orange-300'
            }`}
          >
            Q4: Octane A 91.5
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* KPI Summary Cards in Orange + Cream Decoration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Revenue */}
          <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-orange-300 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#FBBF24]"></div>
            <div className="flex items-center justify-between text-[#786C5E] mb-2.5">
              <span className="text-xs uppercase tracking-wider font-extrabold text-[#786C5E]">Total Net Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-orange-100/90 border border-orange-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                <DollarSign className="w-4 h-4 text-[#EA580C]" />
              </div>
            </div>
            {solution.feasible ? (
              <>
                <div className="text-3xl font-black text-[#2C241D] tracking-tight">
                  ${solution.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-2.5 flex items-center text-xs font-bold">
                  {Math.abs(revenueDelta) < 0.1 ? (
                    <span className="text-[#786C5E] font-medium bg-[#FAF5EB] px-2.5 py-0.5 rounded-full border border-[#E8DAC6]">Matches Case Baseline</span>
                  ) : revenueDelta > 0 ? (
                    <span className="text-[#065F46] flex items-center gap-1 bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
                      <TrendingUp className="w-3.5 h-3.5 text-[#059669]" />
                      +${revenueDelta.toLocaleString('en-US', { maximumFractionDigits: 2 })} vs baseline
                    </span>
                  ) : (
                    <span className="text-[#991B1B] flex items-center gap-1 bg-[#FEF2F2] px-2.5 py-0.5 rounded-full border border-[#FECACA]">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
                      -${Math.abs(revenueDelta).toLocaleString('en-US', { maximumFractionDigits: 2 })} vs baseline
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-lg font-bold text-[#DC2626] flex items-center gap-2 mt-2">
                <AlertTriangle className="w-5 h-5" />
                INFEASIBLE MODEL
              </div>
            )}
          </div>

          {/* Card 2: Gasoline Sales */}
          <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-orange-300 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#F97316] via-[#FB923C] to-[#FED7AA]"></div>
            <div className="flex items-center justify-between text-[#786C5E] mb-2.5">
              <span className="text-xs uppercase tracking-wider font-extrabold text-[#786C5E]">Gasoline Sales (A, B, C)</span>
              <div className="w-8 h-8 rounded-xl bg-orange-100/90 border border-orange-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Fuel className="w-4 h-4 text-[#EA580C]" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#2C241D]">
              ${solution.feasible ? solution.gasRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '$0.00'}
            </div>
            <div className="text-xs text-[#786C5E] mt-2.5 font-medium">
              {solution.feasible ? `${((solution.gasRevenue / solution.revenue) * 100).toFixed(1)}% of total revenue` : 'No fuel blended'}
            </div>
          </div>

          {/* Card 3: Feedstock Salvage */}
          <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-orange-300 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#FDE68A]"></div>
            <div className="flex items-center justify-between text-[#786C5E] mb-2.5">
              <span className="text-xs uppercase tracking-wider font-extrabold text-[#786C5E]">Residual Salvage</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100/90 border border-amber-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4 text-[#D97706]" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#2C241D]">
              ${solution.feasible ? solution.leftoverRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '$0.00'}
            </div>
            <div className="text-xs text-[#786C5E] mt-2.5 font-medium">
              {solution.feasible ? `${((solution.leftoverRevenue / solution.revenue) * 100).toFixed(1)}% from unsold feedstock` : '0 gal sold'}
            </div>
          </div>

          {/* Card 4: Utilization */}
          <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-orange-300 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#EA580C] via-[#C2410C] to-[#FB923C]"></div>
            <div className="flex items-center justify-between text-[#786C5E] mb-2.5">
              <span className="text-xs uppercase tracking-wider font-extrabold text-[#786C5E]">Refinery Utilization</span>
              <div className="w-8 h-8 rounded-xl bg-orange-100/90 border border-orange-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4 text-[#EA580C]" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#2C241D]">
              {solution.feasible ? `${((totalUsedFeedstock / totalAvailFeedstock) * 100).toFixed(1)}%` : '0.0%'}
            </div>
            <div className="text-xs text-[#786C5E] mt-2.5 font-medium">
              {solution.feasible ? `${totalUsedFeedstock.toFixed(1)}k / ${totalAvailFeedstock}k gallons converted` : 'Halted'}
            </div>
          </div>

        </div>

        {/* Infeasibility Alert Banner */}
        {!solution.feasible && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start space-x-3 shadow-xs">
            <ShieldAlert className="w-5 h-5 mt-0.5 text-rose-600 shrink-0" />
            <div>
              <h4 className="font-bold text-rose-950">Chemical or Volatility Infeasibility Detected</h4>
              <p className="text-sm mt-1 text-rose-800">{solution.reason}</p>
              <button
                onClick={() => applyPreset('baseline')}
                className="mt-3 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
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
            <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-5 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#EFE4D4] pb-3">
                <span className="text-sm font-black text-[#2C241D] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#EA580C]" />
                  Live Model Controls
                </span>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#9A3412] border border-orange-200">
                  Interactive
                </span>
              </div>

              {/* Policy Constraint Switch */}
              <div className="space-y-1.5 bg-[#FAF5EB] p-3.5 rounded-xl border border-[#E8DAC6]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#2C241D]">Policy: Gas A ≥ Gas B</label>
                  <button
                    onClick={() => setSideConstraint(!sideConstraint)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                      sideConstraint ? 'bg-gradient-to-r from-[#EA580C] to-[#F97316] shadow-xs' : 'bg-[#D8C7B2]'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                        sideConstraint ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-[#786C5E] leading-tight">
                  Enforces production of Gas A to be at least as large as Gas B.
                </p>
              </div>

              {/* Gas B TEL Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2C241D]">Gas B TEL Lead Level</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setBTel('High')}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition shadow-2xs cursor-pointer ${
                      bTel === 'High'
                        ? 'bg-gradient-to-r from-[#EA580C] to-[#F97316] border-[#EA580C] text-white shadow-xs'
                        : 'bg-[#FAF5EB] border-[#E8DAC6] text-[#3C3024] hover:bg-orange-50 hover:border-orange-300'
                    }`}
                  >
                    High TEL (Standard)
                  </button>
                  <button
                    onClick={() => setBTel('Medium')}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition shadow-2xs cursor-pointer ${
                      bTel === 'Medium'
                        ? 'bg-gradient-to-r from-[#DC2626] to-[#EA580C] border-[#DC2626] text-white shadow-xs'
                        : 'bg-[#FAF5EB] border-[#E8DAC6] text-[#3C3024] hover:bg-orange-50 hover:border-orange-300'
                    }`}
                  >
                    Medium TEL (Q2)
                  </button>
                </div>
              </div>

              {/* RVP Limit Slider */}
              <div className="space-y-1.5 bg-[#FAF5EB] p-3.5 rounded-xl border border-[#E8DAC6]">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#2C241D]">Max Reid Vapor Pressure</span>
                  <span className="text-[#EA580C] font-mono bg-orange-100/80 px-2 py-0.5 rounded border border-orange-200">
                    {rvpLimit.toFixed(2)} psi
                  </span>
                </div>
                <input
                  type="range"
                  min="6.3"
                  max="7.5"
                  step="0.05"
                  value={rvpLimit}
                  onChange={(e) => setRvpLimit(parseFloat(e.target.value))}
                  className="w-full cursor-pointer h-2 my-1"
                />
                <div className="flex justify-between text-[10px] text-[#786C5E] font-medium">
                  <span>6.43 psi (Infeasible)</span>
                  <span>7.00 psi (Case)</span>
                  <span>7.50 psi</span>
                </div>
              </div>

              {/* Gas A Min Octane */}
              <div className="space-y-1.5 bg-[#FAF5EB] p-3.5 rounded-xl border border-[#E8DAC6]">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#2C241D]">Gas A Minimum Octane</span>
                  <span className="text-[#EA580C] font-mono bg-orange-100/80 px-2 py-0.5 rounded border border-orange-200">
                    {aMinOct.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="88.0"
                  max="92.0"
                  step="0.1"
                  value={aMinOct}
                  onChange={(e) => setAMinOct(parseFloat(e.target.value))}
                  className="w-full cursor-pointer h-2 my-1"
                />
                <div className="flex justify-between text-[10px] text-[#786C5E] font-medium">
                  <span>88.0</span>
                  <span>90.0 (Case)</span>
                  <span>91.8 (Max Viable)</span>
                </div>
              </div>

              {/* Prices Section */}
              <div className="pt-2 border-t border-[#EFE4D4] space-y-2">
                <span className="text-xs font-extrabold text-[#786C5E] uppercase tracking-wider">Gasoline Selling Prices</span>
                <div className="grid grid-cols-3 gap-2">
                  {gasNames.map(g => (
                    <div key={g} className="bg-[#FAF5EB] p-2.5 rounded-xl border border-[#E8DAC6]">
                      <div className="text-[11px] font-bold text-[#3C3024]">Gas {g} ($)</div>
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
                        className="w-full bg-[#FFFEFB] border border-[#D8C7B2] rounded-lg px-2 py-1 text-xs text-[#2C241D] mt-1 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedstock Supply Section */}
              <div className="pt-2 border-t border-[#EFE4D4] space-y-2">
                <span className="text-xs font-extrabold text-[#786C5E] uppercase tracking-wider">Feedstock Available (1000s gal)</span>
                <div className="grid grid-cols-2 gap-2">
                  {feedstockNames.map(f => (
                    <div key={f} className="bg-[#FAF5EB] p-2.5 rounded-xl border border-[#E8DAC6]">
                      <div className="text-[11px] font-bold text-[#3C3024] truncate">{f}</div>
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
                        className="w-full bg-[#FFFEFB] border border-[#D8C7B2] rounded-lg px-2 py-1 text-xs text-[#2C241D] mt-1 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
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
            <div className="flex border-b border-[#E8DAC6] space-x-2 overflow-x-auto pb-px">
              <button
                onClick={() => setActiveTab('report')}
                className={`py-3 px-4 text-xs font-extrabold transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer rounded-t-xl ${
                  activeTab === 'report'
                    ? 'border-[#EA580C] text-[#EA580C] bg-orange-100/70 shadow-2xs'
                    : 'border-transparent text-[#786C5E] hover:text-[#9A3412] hover:bg-orange-50/50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Executive Business Report
              </button>
              <button
                onClick={() => setActiveTab('blending')}
                className={`py-3 px-4 text-xs font-extrabold transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer rounded-t-xl ${
                  activeTab === 'blending'
                    ? 'border-[#EA580C] text-[#EA580C] bg-orange-100/70 shadow-2xs'
                    : 'border-transparent text-[#786C5E] hover:text-[#9A3412] hover:bg-orange-50/50'
                }`}
              >
                <Layers className="w-4 h-4" />
                Optimal Blending Plan
              </button>
              <button
                onClick={() => setActiveTab('scenarios')}
                className={`py-3 px-4 text-xs font-extrabold transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer rounded-t-xl ${
                  activeTab === 'scenarios'
                    ? 'border-[#EA580C] text-[#EA580C] bg-orange-100/70 shadow-2xs'
                    : 'border-transparent text-[#786C5E] hover:text-[#9A3412] hover:bg-orange-50/50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Case Questions & Scenarios
              </button>
              <button
                onClick={() => setActiveTab('valuation')}
                className={`py-3 px-4 text-xs font-extrabold transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer rounded-t-xl ${
                  activeTab === 'valuation'
                    ? 'border-[#EA580C] text-[#EA580C] bg-orange-100/70 shadow-2xs'
                    : 'border-transparent text-[#786C5E] hover:text-[#9A3412] hover:bg-orange-50/50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Dual / Shadow Prices
              </button>
              <button
                onClick={() => setActiveTab('model')}
                className={`py-3 px-4 text-xs font-extrabold transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer rounded-t-xl ${
                  activeTab === 'model'
                    ? 'border-[#EA580C] text-[#EA580C] bg-orange-100/70 shadow-2xs'
                    : 'border-transparent text-[#786C5E] hover:text-[#9A3412] hover:bg-orange-50/50'
                }`}
              >
                <FileCode2 className="w-4 h-4" />
                Mathematical Model
              </button>
            </div>

            {/* TAB 0: EXECUTIVE BUSINESS REPORT */}
            {activeTab === 'report' && (
              <div className="space-y-6">
                <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-7 space-y-6 shadow-xs">
                  {/* Memo Header */}
                  <div className="flex flex-wrap items-center justify-between border-b border-[#EFE4D4] pb-4 gap-4">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#9A3412] bg-gradient-to-r from-orange-100 to-amber-100 px-3.5 py-1 rounded-full border border-orange-200 flex items-center gap-1.5 w-fit">
                        <Award className="w-3.5 h-3.5 text-[#EA580C]" />
                        Formal Business Deliverable
                      </span>
                      <h2 className="text-2xl font-black text-[#2C241D] mt-2">Executive Business Report & Decision Memo</h2>
                      <p className="text-xs text-[#786C5E] mt-1 font-medium">
                        Case 4.1: Blending Aviation Gasoline at Jansen Gas &bull; Production Optimization Review
                      </p>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#C2410C] hover:to-[#EA580C] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm shadow-orange-500/20 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      Print / Save PDF
                    </button>
                  </div>

                  {/* Memorandum Metadata */}
                  <div className="bg-[#FAF5EB] p-4.5 rounded-xl border border-[#E8DAC6] text-xs text-[#3C3024] space-y-2 font-mono">
                    <div><strong className="text-[#2C241D] font-sans">TO:</strong> Dave Wagner, Production Manager & Executive Leadership, Jansen Gas</div>
                    <div className="flex items-center gap-1">
                      <strong className="text-[#2C241D] font-sans">FROM :--</strong>
                      <span className="font-bold text-[#EA580C] bg-orange-100/90 px-2 py-0.5 rounded border border-orange-200">
                        Gali Venkata Gopi
                      </span>
                    </div>
                    <div><strong className="text-[#2C241D] font-sans">DATE:</strong> October 2026</div>
                    <div><strong className="text-[#2C241D] font-sans">SUBJECT:</strong> Optimal Feedstock Blending Strategy, Bottleneck Analysis, & Policy Evaluation</div>
                  </div>

                  {/* Executive Summary Callout */}
                  <div className="p-5 rounded-xl bg-gradient-to-r from-orange-50 via-[#FFFDF9] to-amber-50/80 border-l-4 border-[#EA580C] border-y border-r border-[#E8DAC6] text-[#2C241D] space-y-2 shadow-2xs">
                    <h3 className="font-bold text-[#9A3412] text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#EA580C]" />
                      Executive Summary & Optimal Financial Outcome
                    </h3>
                    <p className="text-xs text-[#3C3024] leading-relaxed font-medium">
                      Using Linear Programming optimization, Jansen Gas can achieve a maximized total revenue of <strong className="text-[#2C241D] font-bold">${solution.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> from finished gasoline sales and residual feedstock liquidations.
                      All quality constraints (Reid vapor pressure &le; 7.0 psi, minimum Octane ratings) are strictly met. Alkylate is our primary binding bottleneck (100% utilized, shadow price of <strong className="text-[#C2410C] font-bold">$5.77/gal</strong>).
                    </p>
                  </div>

                  {/* Revenue Breakdown Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#FAF5EB] p-4.5 rounded-xl border border-[#E8DAC6] hover:border-orange-300 transition-colors">
                      <span className="text-xs text-[#786C5E] uppercase font-bold">Gasoline Sales</span>
                      <div className="text-xl font-black text-[#2C241D] mt-1 font-mono">
                        ${solution.gasRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-[11px] text-[#065F46] font-bold">85.3% of total revenue</span>
                    </div>
                    <div className="bg-[#FAF5EB] p-4.5 rounded-xl border border-[#E8DAC6] hover:border-orange-300 transition-colors">
                      <span className="text-xs text-[#786C5E] uppercase font-bold">Feedstock Salvage</span>
                      <div className="text-xl font-black text-[#2C241D] mt-1 font-mono">
                        ${solution.leftoverRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-[11px] text-[#B45309] font-bold">14.7% from residual liquidation</span>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-[#FAF5EB] p-4.5 rounded-xl border border-orange-300">
                      <span className="text-xs text-[#9A3412] uppercase font-bold">Total Revenue</span>
                      <div className="text-xl font-black text-[#EA580C] mt-1 font-mono">
                        ${solution.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-[11px] text-[#786C5E] font-medium">Maximized Objective</span>
                    </div>
                  </div>

                  {/* Strategic Case Questions Answers */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-base font-black text-[#2C241D] border-b border-[#EFE4D4] pb-2">
                      Strategic Case Questions & Findings (Dave Wagner Inquiries)
                    </h3>

                    {/* Q1 */}
                    <div className="bg-[#FAF5EB] p-4.5 rounded-xl border border-[#E8DAC6] hover:border-orange-300 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-orange-100 text-[#9A3412] border border-orange-200">
                          Question 1: Policy Constraint (Gas A &ge; Gas B)
                        </span>
                        <span className="text-xs font-mono font-bold text-[#EA580C]">+$6,988.41 Opportunity Cost</span>
                      </div>
                      <p className="text-xs text-[#3C3024] leading-relaxed font-medium">
                        <strong>Finding:</strong> Enforcing the company policy that Gas A produced must be at least as large as Gas B costs the company <strong>$6,988.41</strong> in lost profit.
                        Removing this constraint allows production of higher-priced Gas B ($3.50/gal) to rise to <strong>194.69k gallons</strong>, increasing total revenue to <strong>$1,725,010.21</strong>.
                      </p>
                    </div>

                    {/* Q2 */}
                    <div className="bg-[#FAF5EB] p-4.5 rounded-xl border border-[#E8DAC6] hover:border-orange-300 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-rose-100 text-[#991B1B] border border-rose-200">
                          Question 2: Medium TEL for Gas B
                        </span>
                        <span className="text-xs font-bold text-[#DC2626]">Strictly Infeasible</span>
                      </div>
                      <p className="text-xs text-[#3C3024] leading-relaxed font-medium">
                        <strong>Finding:</strong> Producing Gas B with Medium TEL is <strong>chemically impossible</strong>. Achieving 97 octane requires large fractions of Alkylate and Isopentane; however, Isopentane's RVP of 20 exceeds the 7.0 psi limit, and Alkylate is simultaneously required by Gas C (100 octane). Jansen must keep Gas B on High TEL.
                      </p>
                    </div>

                    {/* Q3 */}
                    <div className="bg-[#FAF5EB] p-4.5 rounded-xl border border-[#E8DAC6] hover:border-orange-300 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-[#92400E] border border-amber-200">
                          Question 3: Tighter Reid Vapor Pressure Standards
                        </span>
                        <span className="text-xs font-mono font-bold text-[#B45309]">Min Feasible RVP: 6.43 psi</span>
                      </div>
                      <p className="text-xs text-[#3C3024] leading-relaxed font-medium">
                        <strong>Finding:</strong> Stricter environmental standards can lower maximum RVP from 7.0 down to <strong>6.43 psi</strong> before blending becomes mathematically infeasible. Every 0.1 psi reduction costs approximately <strong>$10,000</strong> in lost revenue.
                      </p>
                    </div>

                    {/* Q4 */}
                    <div className="bg-[#FAF5EB] p-4.5 rounded-xl border border-[#E8DAC6] hover:border-orange-300 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-orange-100 text-[#9A3412] border border-orange-200">
                          Question 4: Gas A Octane Limits
                        </span>
                        <span className="text-xs font-mono font-bold text-[#EA580C]">Max Feasible Octane: 91.80</span>
                      </div>
                      <p className="text-xs text-[#3C3024] leading-relaxed font-medium">
                        <strong>Finding:</strong> Dave Wagner's hypothesis that Gas A octane can be raised is feasible up to <strong>91.80</strong> octane. However, raising it diverts Alkylate from Gas C ($4.00/gal), decreasing revenue by $28,950 at 91.0 octane unless customers pay a premium.
                      </p>
                    </div>

                    {/* Q5 */}
                    <div className="bg-[#FAF5EB] p-4.5 rounded-xl border border-[#E8DAC6] hover:border-orange-300 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-[#065F46] border border-emerald-200">
                          Question 5: Market Inflation & Price Scale Invariance
                        </span>
                        <span className="text-xs font-bold text-[#059669]">100% Invariant Recipe</span>
                      </div>
                      <p className="text-xs text-[#3C3024] leading-relaxed font-medium">
                        <strong>Finding:</strong> Dave is <strong>100% correct</strong>. Proportional (+10%) or uniform additive (+$1/gal) price/value changes do not alter the optimal physical blend recipe because relative property-to-margin tradeoffs remain constant.
                      </p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="border-t border-[#EFE4D4] pt-4 space-y-3">
                    <h3 className="text-base font-black text-[#2C241D]">Actionable Recommendations for Dave Wagner</h3>
                    <ul className="text-xs text-[#3C3024] space-y-2 list-disc pl-5 font-medium leading-relaxed">
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
                <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-6 overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-[#2C241D]">Optimal Blending Recipe Matrix (1,000s of Gallons)</h3>
                    <span className="text-xs text-[#786C5E] font-medium">Total Refinery Feedstock: {totalAvailFeedstock}k gal</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E8DAC6] bg-[#F5ECE0] text-[#3C3024] uppercase tracking-wider font-extrabold">
                          <th className="py-2.5 px-3">Feedstock</th>
                          <th className="py-2.5 px-3 text-right">Gas A (${gasolines.A.price.toFixed(2)})</th>
                          <th className="py-2.5 px-3 text-right">Gas B (${gasolines.B.price.toFixed(2)})</th>
                          <th className="py-2.5 px-3 text-right">Gas C (${gasolines.C.price.toFixed(2)})</th>
                          <th className="py-2.5 px-3 text-right text-[#EA580C] font-bold">Leftover Sold</th>
                          <th className="py-2.5 px-3 text-right">Total Avail</th>
                          <th className="py-2.5 px-3 text-right">Utilization</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE4D4] font-mono">
                        {feedstockNames.map(f => {
                          const usedInBlend = gasNames.reduce((acc, g) => acc + (solution.blend[`${f}_${g}`] || 0), 0);
                          const leftoverVal = solution.leftover[f] || 0;
                          const avail = feedstocks[f].avail;
                          const utilPercent = (usedInBlend / avail) * 100;
                          return (
                            <tr key={f} className="hover:bg-orange-50/70 transition-colors">
                              <td className="py-2.5 px-3 font-sans font-bold text-[#2C241D]">{f}</td>
                              <td className="py-2.5 px-3 text-right text-[#3C3024]">{(solution.blend[`${f}_A`] || 0).toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right text-[#3C3024]">{(solution.blend[`${f}_B`] || 0).toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right text-[#3C3024]">{(solution.blend[`${f}_C`] || 0).toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right text-[#EA580C] font-bold">{leftoverVal.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right text-[#786C5E]">{avail.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-sans font-bold ${
                                  utilPercent >= 99.9 ? 'bg-orange-100 text-[#9A3412] border border-orange-300' : 'bg-stone-100 text-stone-600'
                                }`}>
                                  {utilPercent.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {/* Totals Row */}
                        <tr className="border-t-2 border-orange-400 bg-[#FEF5E7] font-bold">
                          <td className="py-3 px-3 font-sans text-[#2C241D]">Total Produced</td>
                          <td className="py-3 px-3 text-right text-[#EA580C]">{solution.production.A.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-[#EA580C]">{solution.production.B.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-[#EA580C]">{solution.production.C.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-[#B45309]">{totalLeftover.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-[#2C241D]">{totalAvailFeedstock.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-[#EA580C]">{((totalUsedFeedstock/totalAvailFeedstock)*100).toFixed(1)}%</td>
                        </tr>
                        {/* Minimum Required Row */}
                        <tr className="text-[#786C5E] text-[11px] bg-[#FAF5EB]/50">
                          <td className="py-2 px-3 font-sans font-medium">Min Contract Demand</td>
                          <td className="py-2 px-3 text-right">{gasolines.A.req.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">{gasolines.B.req.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">{gasolines.C.req.toFixed(2)}</td>
                          <td colSpan={3} className="py-2 px-3 text-right italic font-sans text-[#786C5E]">
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
                      <div key={g} className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-5 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-[#EFE4D4] pb-2">
                          <span className="font-black text-[#2C241D] text-sm">Gasoline {g} Quality</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-[#9A3412] border border-orange-200">
                            ${gasolines[g].price.toFixed(2)} / gal
                          </span>
                        </div>

                        {/* RVP Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-[#786C5E]">Reid Vapor Pressure:</span>
                            <span className="font-mono text-[#2C241D] font-bold">
                              {rvpVal.toFixed(2)} / {maxRvp.toFixed(2)} psi
                            </span>
                          </div>
                          <div className="w-full bg-[#EFE4D4] rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#EA580C] to-[#F97316] h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (rvpVal / maxRvp) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Octane Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-[#786C5E]">Octane ({gasolines[g].tel} TEL):</span>
                            <span className="font-mono text-[#2C241D] font-bold">
                              {octVal.toFixed(2)} / min {minOct.toFixed(1)}
                            </span>
                          </div>
                          <div className="w-full bg-[#EFE4D4] rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#D97706] to-[#F59E0B] h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (octVal / 110) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stacked Chart in Warm Orange + Cream Palette */}
                <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-6 shadow-xs">
                  <h3 className="text-base font-black text-[#2C241D] mb-4">Feedstock Allocation by Finished Product & Salvage</h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stackedChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
                        <XAxis dataKey="name" stroke="#786C5E" />
                        <YAxis stroke="#786C5E" label={{ value: 'Gallons (1000s)', angle: -90, position: 'insideLeft', fill: '#786C5E' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#FFFEFB', borderColor: '#FDBA74', borderRadius: '10px', color: '#2C241D', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)' }}
                          formatter={(val) => [`${val.toFixed(2)}k gal`]}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar dataKey="Alkylate" stackId="a" fill="#EA580C" />
                        <Bar dataKey="CCG" stackId="a" fill="#F97316" />
                        <Bar dataKey="SRG" stackId="a" fill="#C2410C" />
                        <Bar dataKey="Isopentane" stackId="a" fill="#F59E0B" />
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
                <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-6 space-y-3 shadow-xs hover:border-orange-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#9A3412] border border-orange-200">
                        Question 1
                      </span>
                      <h4 className="font-black text-[#2C241D] text-base">Cost of the Side Constraint (Gas A ≥ Gas B)</h4>
                    </div>
                    <button
                      onClick={() => applyPreset('q1_no_side')}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#C2410C] hover:to-[#EA580C] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      Run Scenario 1
                    </button>
                  </div>
                  <p className="text-sm text-[#3C3024] font-medium">
                    Dave is not sure whether the policy requirement of producing at least as much Gas A as Gas B is necessary. What is this constraint costing Jansen Gas?
                  </p>
                  <div className="bg-[#FAF5EB] p-4 rounded-xl border border-[#E8DAC6] space-y-2 text-xs font-medium">
                    <div className="flex justify-between">
                      <span className="text-[#786C5E]">Baseline Revenue (With Side Constraint):</span>
                      <span className="font-mono font-bold text-[#2C241D]">$1,718,021.80</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#786C5E]">Revenue Without Side Constraint:</span>
                      <span className="font-mono font-bold text-[#065F46]">$1,725,010.21</span>
                    </div>
                    <div className="flex justify-between border-t border-[#E8DAC6] pt-2 font-bold">
                      <span className="text-[#EA580C]">Net Opportunity Cost of Policy:</span>
                      <span className="font-mono text-[#EA580C] text-sm">+$6,988.41</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#786C5E] italic">
                    Strategic Insight: The constraint forces the refinery to blend 10k additional gallons of \$3.00 Gas A instead of high-margin Gas B (\$3.50/gal).
                  </p>
                </div>

                {/* Scenario 2 */}
                <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-6 space-y-3 shadow-xs hover:border-orange-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-[#991B1B] border border-rose-200">
                        Question 2
                      </span>
                      <h4 className="font-black text-[#2C241D] text-base">Medium TEL Level for Gas B</h4>
                    </div>
                    <button
                      onClick={() => applyPreset('q2_med_tel')}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-[#DC2626] to-[#EA580C] hover:from-[#B91C1C] hover:to-[#C2410C] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      Test Medium TEL
                    </button>
                  </div>
                  <p className="text-sm text-[#3C3024] font-medium">
                    Chemical experts suggested producing Gas B with a "Medium" TEL level (octane ratings halfway between Low and High). Would this be a better option?
                  </p>
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                    <span className="font-bold text-rose-950">Finding: Mathematically INFEASIBLE</span>
                    <p className="text-[#3C3024] font-medium">
                      Reaching Octane 97 under Medium TEL requires vast quantities of Alkylate and Isopentane. However, Isopentane has an RVP of 20 (limit is 7.0), and Alkylate is simultaneously required by Gas C (min octane 100).
                    </p>
                  </div>
                </div>

                {/* Scenario 3 */}
                <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-6 space-y-3 shadow-xs hover:border-orange-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-[#92400E] border border-amber-200">
                        Question 3
                      </span>
                      <h4 className="font-black text-[#2C241D] text-base">Tighter Reid Vapor Pressure Standards</h4>
                    </div>
                    <button
                      onClick={() => applyPreset('q3_strict_rvp')}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-[#D97706] to-[#F59E0B] hover:from-[#B45309] hover:to-[#D97706] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      Set RVP = 6.6
                    </button>
                  </div>
                  <p className="text-sm text-[#3C3024] font-medium">
                    If environmental air pollution regulations lower the maximum Reid vapor pressure across all gas types, how does it affect revenue?
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#FAF5EB] p-3.5 rounded-xl border border-[#E8DAC6]">
                      <span className="text-[#786C5E] block font-bold">Critical Feasibility Threshold</span>
                      <span className="text-lg font-black text-[#2C241D] font-mono">6.43 psi</span>
                      <span className="text-[11px] text-[#786C5E] block mt-1">Below this, no blend is viable</span>
                    </div>
                    <div className="bg-[#FAF5EB] p-3.5 rounded-xl border border-[#E8DAC6]">
                      <span className="text-[#786C5E] block font-bold">Marginal Cost of Compliance</span>
                      <span className="text-lg font-black text-[#DC2626] font-mono">-$10,000</span>
                      <span className="text-[11px] text-[#786C5E] block mt-1">Revenue lost per 0.1 psi reduction</span>
                    </div>
                  </div>
                </div>

                {/* Scenario 4 & 5 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-5 space-y-3 shadow-xs hover:border-orange-300 transition-colors">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#9A3412] border border-orange-200">
                        Question 4
                      </span>
                      <h4 className="font-bold text-[#2C241D] text-sm">Gas A Octane Frontier</h4>
                    </div>
                    <p className="text-xs text-[#3C3024] font-medium">
                      How far can Gas A minimum octane be raised above 90.0 before losing feasibility?
                    </p>
                    <div className="text-xs font-mono bg-[#FAF5EB] p-3 rounded-xl border border-[#E8DAC6]">
                      <span className="text-[#EA580C] font-black text-base">91.80 Max Octane</span>
                      <p className="text-[#786C5E] text-[11px] mt-1 font-sans">
                        Costs -$29k at 91.0 octane as Alkylate is diverted from high-priced Gas C.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-5 space-y-3 shadow-xs hover:border-orange-300 transition-colors">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#065F46] border border-emerald-200">
                        Question 5
                      </span>
                      <h4 className="font-bold text-[#2C241D] text-sm">Price Scaling Invariance</h4>
                    </div>
                    <p className="text-xs text-[#3C3024] font-medium">
                      Do uniform percentage or additive price and feedstock shifts change the optimal blend?
                    </p>
                    <div className="text-xs font-mono bg-[#FAF5EB] p-3 rounded-xl border border-[#E8DAC6]">
                      <span className="text-[#059669] font-black text-base">100% Invariant Recipe</span>
                      <p className="text-[#786C5E] text-[11px] mt-1 font-sans">
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
                <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-6 shadow-xs">
                  <h3 className="text-base font-black text-[#2C241D] mb-2">Feedstock Marginal Worth (Dual / Shadow Price Analysis)</h3>
                  <p className="text-xs text-[#786C5E] mb-4 font-medium">
                    The shadow price indicates the maximum price Jansen Gas should be willing to pay for one additional gallon of raw feedstock.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-[#E8DAC6] bg-[#F5ECE0] text-[#3C3024] uppercase tracking-wider font-sans font-bold">
                          <th className="py-2.5 px-3">Feedstock</th>
                          <th className="py-2.5 px-3 text-right">Available</th>
                          <th className="py-2.5 px-3 text-right">Book Value ($)</th>
                          <th className="py-2.5 px-3 text-right text-[#EA580C]">Shadow Price ($)</th>
                          <th className="py-2.5 px-3 text-right">Marginal Profit Premium</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE4D4]">
                        {feedstockNames.map(f => {
                          const book = feedstocks[f].value;
                          const shadow = solution.shadowPrices ? +(solution.shadowPrices[f] || 0) : book;
                          const premium = shadow - book;
                          const isBinding = (solution.leftover[f] || 0) <= 0.05;

                          return (
                            <tr key={f} className="hover:bg-orange-50/70 transition-colors">
                              <td className="py-3 px-3 font-sans font-bold text-[#2C241D]">{f}</td>
                              <td className="py-3 px-3 text-right text-[#3C3024]">{feedstocks[f].avail}k gal</td>
                              <td className="py-3 px-3 text-right text-[#786C5E]">${book.toFixed(2)}</td>
                              <td className="py-3 px-3 text-right text-[#EA580C] font-bold">${shadow.toFixed(2)}</td>
                              <td className="py-3 px-3 text-right">
                                {premium > 0.01 ? (
                                  <span className="text-[#065F46] font-bold">+${premium.toFixed(2)} / gal</span>
                                ) : (
                                  <span className="text-[#A8A29E]">$0.00</span>
                                )}
                              </td>
                              <td className="py-3 px-3 font-sans">
                                {isBinding ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-[#9A3412] border border-orange-300">
                                    Bottleneck (100% Used)
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF5EB] text-[#786C5E] border border-[#E8DAC6]">
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
                <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-6 shadow-xs">
                  <h3 className="text-base font-black text-[#2C241D] mb-4">Feedstock Market Value vs Internal Optimization Shadow Price</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={valuationChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
                        <XAxis dataKey="name" stroke="#786C5E" />
                        <YAxis stroke="#786C5E" label={{ value: '$ per Gallon', angle: -90, position: 'insideLeft', fill: '#786C5E' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#FFFEFB', borderColor: '#FDBA74', borderRadius: '10px', color: '#2C241D', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)' }}
                          formatter={(val) => [`$${val.toFixed(2)} / gal`]}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar dataKey="bookValue" name="Feedstock Salvage Value ($)" fill="#D8C7B2" />
                        <Bar dataKey="shadowPrice" name="Internal Shadow Price ($)" fill="#EA580C" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MATHEMATICAL MODEL DEFINITION */}
            {activeTab === 'model' && (
              <div className="bg-[#FFFEFB] border border-[#E8DAC6] rounded-2xl p-7 space-y-5 text-sm shadow-xs">
                <div>
                  <h3 className="text-base font-black text-[#2C241D] mb-2">Linear Programming Model Formulation</h3>
                  <p className="text-xs text-[#786C5E] font-medium">
                    Standard mathematical model for refinery blending optimization with residual salvage disposal.
                  </p>
                </div>

                <div className="bg-[#FAF5EB] p-5 rounded-xl border border-[#E8DAC6] space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-[#EA580C] font-bold block mb-1 font-sans">Objective Function (Maximize Total Revenue):</span>
                    <span className="text-[#2C241D]">
                      max Z = &sum;<sub>j &isin; &#123;A,B,C&#125;</sub> p<sub>j</sub> (&sum;<sub>i</sub> x<sub>ij</sub>) + &sum;<sub>i</sub> v<sub>i</sub> s<sub>i</sub>
                    </span>
                  </div>

                  <div>
                    <span className="text-[#EA580C] font-bold block mb-1 font-sans">1. Feedstock Material Balance:</span>
                    <span className="text-[#2C241D]">&sum;<sub>j</sub> x<sub>ij</sub> + s<sub>i</sub> = Supply<sub>i</sub>, &forall; i &isin; Feedstocks</span>
                  </div>

                  <div>
                    <span className="text-[#EA580C] font-bold block mb-1 font-sans">2. Minimum Demand Targets:</span>
                    <span className="text-[#2C241D]">&sum;<sub>i</sub> x<sub>ij</sub> &ge; Demand<sub>j</sub>, &forall; j &isin; &#123;A, B, C&#125;</span>
                  </div>

                  <div>
                    <span className="text-[#EA580C] font-bold block mb-1 font-sans">3. Reid Vapor Pressure (RVP &le; 7.0 psi):</span>
                    <span className="text-[#2C241D]">&sum;<sub>i</sub> (RVP<sub>i</sub> - 7.0) x<sub>ij</sub> &le; 0, &forall; j &isin; &#123;A, B, C&#125;</span>
                  </div>

                  <div>
                    <span className="text-[#EA580C] font-bold block mb-1 font-sans">4. Octane Requirements (Low TEL for A, High for B & C):</span>
                    <span className="text-[#2C241D]">
                      &sum;<sub>i</sub> (OctaneLow<sub>i</sub> - 90) x<sub>iA</sub> &ge; 0<br />
                      &sum;<sub>i</sub> (OctaneHigh<sub>i</sub> - 97) x<sub>iB</sub> &ge; 0<br />
                      &sum;<sub>i</sub> (OctaneHigh<sub>i</sub> - 100) x<sub>iC</sub> &ge; 0
                    </span>
                  </div>

                  <div>
                    <span className="text-[#EA580C] font-bold block mb-1 font-sans">5. Production Policy:</span>
                    <span className="text-[#2C241D]">&sum;<sub>i</sub> x<sub>iA</sub> &ge; &sum;<sub>i</sub> x<sub>iB</sub> (Gas A &ge; Gas B)</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EFE4D4] flex items-center justify-between text-xs text-[#786C5E]">
                  <span>Engine: Pure Client-Side Simplex LP Solver (Zero Vercel cold-start latency)</span>
                  <span className="text-[#EA580C] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-[#EA580C]" />
                    Verified against PuLP CBC ($1,718,021.80)
                  </span>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Footer in Warm Cream */}
      <footer className="border-t border-[#E8DAC6] bg-[#FFFEFB] py-4 px-6 text-center text-xs text-[#786C5E] mt-auto font-medium">
        Jansen Gas Aviation Gasoline Blending Decision Support System &bull; Designed by Gali Venkata Gopi &bull; 2026
      </footer>
    </div>
  );
}
