import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useSystem } from '../context/SystemContext';
import { useToast } from '../context/ToastContext';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { MoreHorizontal, BarChart3, Brain, Zap, Loader2, Sparkles } from 'lucide-react';
import {
  DATASET_OVERVIEW,
  DELAY_BY_TRAIN_TYPE,
  SECTION_DELAY_STATS,
  computeDelayRisk,
  getFeatureImportanceOption,
} from '../data/analyticsData';

const useDarkMode = () => {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
};

const COMPLEX_CLUSTER_SCENARIO = [
  { trainNo: 'FR-991', trainType: 'Freight', priorityLevel: 3, sectionId: 'SHE-SKG', season: 'Monsoon', weatherFlag: 2, sectionCongestionLevel: 0.9, upstreamDelayMin: 15, timeOfDayBucket: 'Peak', trackType: 'Single' },
  { trainNo: 'EX-120', trainType: 'Express', priorityLevel: 1, sectionId: 'SHE-SKG', season: 'Monsoon', weatherFlag: 2, sectionCongestionLevel: 0.9, upstreamDelayMin: 5, timeOfDayBucket: 'Peak', trackType: 'Single' },
  { trainNo: 'EX-121', trainType: 'Express', priorityLevel: 1, sectionId: 'SHE-SKG', season: 'Monsoon', weatherFlag: 1, sectionCongestionLevel: 0.8, upstreamDelayMin: 0, timeOfDayBucket: 'Peak', trackType: 'Single' },
  { trainNo: 'PA-405', trainType: 'Passenger', priorityLevel: 2, sectionId: 'SHE-SKG', season: 'Monsoon', weatherFlag: 1, sectionCongestionLevel: 0.8, upstreamDelayMin: 10, timeOfDayBucket: 'Peak', trackType: 'Single' },
  { trainNo: 'FR-992', trainType: 'Freight', priorityLevel: 3, sectionId: 'SHE-SKG', season: 'Monsoon', weatherFlag: 2, sectionCongestionLevel: 0.9, upstreamDelayMin: 20, timeOfDayBucket: 'Peak', trackType: 'Single' },
  { trainNo: 'SU-811', trainType: 'Suburban', priorityLevel: 2, sectionId: 'SHE-SKG', season: 'Monsoon', weatherFlag: 1, sectionCongestionLevel: 0.7, upstreamDelayMin: 0, timeOfDayBucket: 'Peak', trackType: 'Single' },
  { trainNo: 'EX-122', trainType: 'Express', priorityLevel: 1, sectionId: 'SHE-SKG', season: 'Monsoon', weatherFlag: 0, sectionCongestionLevel: 0.6, upstreamDelayMin: 0, timeOfDayBucket: 'Peak', trackType: 'Single' },
  { trainNo: 'PA-406', trainType: 'Passenger', priorityLevel: 2, sectionId: 'SHE-SKG', season: 'Monsoon', weatherFlag: 0, sectionCongestionLevel: 0.6, upstreamDelayMin: 0, timeOfDayBucket: 'Peak', trackType: 'Single' },
  { trainNo: 'EX-123', trainType: 'Express', priorityLevel: 1, sectionId: 'SHE-SKG', season: 'Monsoon', weatherFlag: 2, sectionCongestionLevel: 0.9, upstreamDelayMin: 12, timeOfDayBucket: 'Peak', trackType: 'Single' },
  { trainNo: 'FR-993', trainType: 'Freight', priorityLevel: 3, sectionId: 'SHE-SKG', season: 'Monsoon', weatherFlag: 2, sectionCongestionLevel: 0.95, upstreamDelayMin: 30, timeOfDayBucket: 'Peak', trackType: 'Single' },
  { trainNo: 'EX-124', trainType: 'Express', priorityLevel: 1, sectionId: 'SHE-SKG', season: 'Monsoon', weatherFlag: 1, sectionCongestionLevel: 0.8, upstreamDelayMin: 0, timeOfDayBucket: 'Peak', trackType: 'Single' },
  { trainNo: 'PA-407', trainType: 'Passenger', priorityLevel: 2, sectionId: 'SHE-SKG', season: 'Monsoon', weatherFlag: 1, sectionCongestionLevel: 0.8, upstreamDelayMin: 5, timeOfDayBucket: 'Peak', trackType: 'Single' },
];

const INITIAL_UNOPTIMIZED = COMPLEX_CLUSTER_SCENARIO.map(t => ({
  id: `${t.trainNo} (${t.trainType})`,
  priority: t.priorityLevel,
  travel_time: t.priorityLevel === 1 ? 10 : t.priorityLevel === 2 ? 18 : 25,
  predicted_delay: 0
}));

export const Optimization: React.FC = () => {
  const { trains, updateTrainStatus } = useSystem();
  const { addToast } = useToast();
  const [activeMenuTrain, setActiveMenuTrain] = useState<string | null>(null);
  const [simStep, setSimStep] = useState(0); // 0: Conflict, 1: Loop, 2: Overtake
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [simLogs, setSimLogs] = useState<{time: string, msg: string}[] | null>(null);
  const [optSchedule, setOptSchedule] = useState<any[] | null>(null);
  const [unoptimizedSchedule, setUnoptimizedSchedule] = useState<any[]>(INITIAL_UNOPTIMIZED);
  const [optMetrics, setOptMetrics] = useState<{ optWait: number, fifoWait: number, optMakespan: number, fifoMakespan: number } | null>(null);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const isDark = useDarkMode();

  const runOptimizationSolver = async () => {
    setIsOptimizing(true);
    setSimLogs(null);
    setOptSchedule(null);
    try {
      // 1. Fetch ML predictions for the complex cluster scenario
      const trainsToOptimize = COMPLEX_CLUSTER_SCENARIO;
      
      const payloadWithPredictions = await Promise.all(
        trainsToOptimize.map(async (train, i) => {
          const reqBody = {
            train_type: train.trainType || 'Freight',
            priority: train.priorityLevel || 3,
            section_id: train.sectionId || 'BWN-GUS',
            day_of_week: train.dayOfWeek || 1,
            is_weekend: train.isWeekend ? 1 : 0,
            time_of_day_bucket: train.timeOfDayBucket || 'Peak',
            season: train.season || 'Monsoon',
            upstream_delay_min: train.upstreamDelayMin || 0,
            section_congestion_level: train.sectionCongestionLevel || 0.75,
            weather_flag: train.weatherFlag || 0,
            track_type: train.trackType || 'Single'
          };
          
          let predictedDelay = 0;
          try {
            const predRes = await fetch('http://localhost:8000/predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reqBody)
            });
            if (predRes.ok) {
              const predData = await predRes.json();
              predictedDelay = predData.predicted_delay_min || 0;
            }
          } catch (e) {
            console.warn('Prediction failed for', train.trainNo);
          }
          
          // Base travel time logic based on priority
          const baseTravelTime = train.priorityLevel === 1 ? 10 : train.priorityLevel === 2 ? 18 : 25;
          const adjustedTravelTime = Math.round(baseTravelTime + predictedDelay);
          
          return {
            id: `${train.trainNo} (${train.trainType})`,
            priority: train.priorityLevel || 3,
            travel_time: adjustedTravelTime,
            predicted_delay: predictedDelay
          };
        })
      );

      // Update the UI to show the new dynamic queue with ML penalties applied
      setUnoptimizedSchedule(payloadWithPredictions);

      // 2. Feed the dynamically adjusted payload into OR-Tools CP-SAT
      const res = await fetch('http://localhost:8000/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trains: payloadWithPredictions })
      });
      const data = await res.json();
      setSimLogs(data.optimized.logs);
      setOptSchedule(data.optimized.schedule);
      
      const fifoWait = data.manual.schedule.reduce((acc: number, t: any) => acc + t.start, 0);
      const optWait = data.optimized.schedule.reduce((acc: number, t: any) => acc + t.start, 0);
      const fifoMakespan = Math.max(...data.manual.schedule.map((t: any) => t.end));
      const optMakespan = Math.max(...data.optimized.schedule.map((t: any) => t.end));
      
      setOptMetrics({ optWait, fifoWait, optMakespan, fifoMakespan });
      setSimStep(2);
      
      // 3. Generate GenAI Insights
      setIsGeneratingInsights(true);
      try {
        const insightsRes = await fetch('http://localhost:8000/generate-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opt_wait: optWait,
            fifo_wait: fifoWait,
            opt_makespan: optMakespan,
            fifo_makespan: fifoMakespan,
            schedule: data.optimized.schedule
          })
        });
        const insightsData = await insightsRes.json();
        setAiInsights(insightsData.insights);
      } catch (err) {
        console.error("Failed to fetch insights", err);
        setAiInsights("Failed to fetch insights from NVIDIA API.");
      } finally {
        setIsGeneratingInsights(false);
      }
      
    } catch (err) {
      addToast('Failed to reach OR-Tools API. Ensure uvicorn is running.', 'error');
      setSimStep(0);
      setOptSchedule(null);
    } finally {
      setIsOptimizing(false);
    }
  };

  const displayTrains = trains.slice(0, 6);

  // Real derived KPIs from dataset
  const freightDelayPct = DELAY_BY_TRAIN_TYPE.find(t => t.type === 'Freight')!.delayedPct;
  const worstSection = SECTION_DELAY_STATS[0];
  const expressDelayPct = DELAY_BY_TRAIN_TYPE.find(t => t.type === 'Express')!.delayedPct;

  return (
    <div className="space-y-8 max-w-7xl">

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 pb-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-[#0F2C5C] dark:text-white tracking-tight transition-colors">
            Optimization
          </h1>
          <span className="font-mono text-[11px] text-[#5B6478] dark:text-gray-400 uppercase tracking-wider transition-colors">
            ML-Driven Route & Schedule Optimization
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#5B6478] dark:text-gray-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded self-start sm:self-auto">
          50K records · RF + HGB pipeline
        </span>
      </div>

      {/* KPI Strip — all real numbers from dataset */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6478] dark:text-gray-400 mb-4 transition-colors">
          DATASET-DERIVED PERFORMANCE METRICS
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl p-4 shadow-sm hover:border-[#C23636]/30 transition-all">
            <StatCard
              label="Fleet Delayed Rate"
              value={`${DATASET_OVERVIEW.delayedPct}%`}
              delta="Threshold > 10 min"
              deltaType="negative"
              subLabel={`${DATASET_OVERVIEW.delayedCount.toLocaleString()} of 50,000 journeys`}
            />
          </div>
          <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl p-4 shadow-sm hover:border-[#F5821F]/30 transition-all">
            <StatCard
              label="Freight Delay Rate"
              value={`${freightDelayPct}%`}
              delta="Highest risk category"
              deltaType="negative"
              subLabel="Avg 14.7 min when delayed"
            />
          </div>
          <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl p-4 shadow-sm hover:border-[#1E7F4F]/30 transition-all">
            <StatCard
              label="Classifier Accuracy"
              value={`${DATASET_OVERVIEW.classifierAccuracy}%`}
              delta={`R² = ${DATASET_OVERVIEW.regressorR2}`}
              deltaType="positive"
              subLabel={`MAE: ${DATASET_OVERVIEW.regressorMAE} min`}
            />
          </div>
          <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl p-4 shadow-sm hover:border-[#2F5FD1]/30 transition-all">
            <StatCard
              label="Express On-Time Rate"
              value={`${(100 - expressDelayPct).toFixed(1)}%`}
              delta="Best performing type"
              deltaType="positive"
              subLabel="Avg 8.1 min delay when late"
            />
          </div>
        </div>
      </div>

      {/* Two-column: Feature Importance + Worst Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Feature Importance Chart */}
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3.5 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937] flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-[#0F2C5C] dark:text-sky-400" />
            <div>
              <h3 className="text-xs font-bold text-[#0F2C5C] dark:text-white uppercase tracking-wider">
                Feature Importance
              </h3>
              <span className="text-[10px] text-[#5B6478] dark:text-gray-400">RandomForestClassifier · grouped by feature</span>
            </div>
          </div>
          <div className="p-4">
            <ReactECharts
              option={getFeatureImportanceOption(isDark)}
              style={{ height: 300 }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </div>

        {/* Section Delay Summary Table */}
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3.5 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937] flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#0F2C5C] dark:text-sky-400" />
            <div>
              <h3 className="text-xs font-bold text-[#0F2C5C] dark:text-white uppercase tracking-wider">
                Section Performance
              </h3>
              <span className="text-[10px] text-[#5B6478] dark:text-gray-400">Delay % ranked across all 8 sections</span>
            </div>
          </div>
          <div className="divide-y divide-[rgba(15,44,92,0.06)] dark:divide-white/5">
            {SECTION_DELAY_STATS.map((s, i) => {
              const onTime = +(100 - s.delayedPct).toFixed(1);
              const barColor = s.avgDelay > 10 ? '#F5821F' : '#1E7F4F';
              return (
                <div key={s.section} className="px-4 py-3 flex items-center gap-3">
                  <span className="font-mono text-[10px] text-[#5B6478] dark:text-gray-500 w-4 shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#0F2C5C] dark:text-gray-200 w-20 shrink-0">
                    {s.section}
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${onTime}%`, background: barColor }}
                    />
                  </div>
                  <span className={`font-mono text-[10px] font-bold w-10 text-right shrink-0 ${
                    s.avgDelay > 10 ? 'text-[#F5821F]' : 'text-[#1E7F4F]'
                  }`}>
                    {onTime}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="px-4 py-2.5 bg-[#F8F9FB] dark:bg-[#1f2937] border-t border-[rgba(15,44,92,0.06)] dark:border-white/5">
            <span className="text-[10px] text-[#5B6478] dark:text-gray-400">
              Worst: <b className="text-[#0F2C5C] dark:text-white">{worstSection.section}</b> — {worstSection.delayedPct}% delayed, avg {worstSection.avgDelay} min
            </span>
          </div>
        </div>
      </div>

      {/* AI Rerouting Simulator for Hackathon Demo */}
      <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937] flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2F5FD1]/10 rounded-lg">
              <Zap className="w-5 h-5 text-[#2F5FD1] dark:text-sky-400" />
            </div>
            <div>
              <h3 className="font-bold text-[#0F2C5C] dark:text-white tracking-tight text-sm sm:text-base flex items-center gap-2">
                OR-Tools CP-SAT Dispatch Optimizer
                <span className="font-mono text-[9px] bg-[#2F5FD1]/10 text-[#2F5FD1] px-1.5 py-0.5 rounded border border-[#2F5FD1]/20">SimPy Live</span>
              </h3>
              <p className="text-xs text-[#5B6478] dark:text-gray-400">
                Live API Demonstration: Scheduling a complex 12-train cluster through a high-congestion bottleneck.
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (simStep === 0) {
                setSimStep(1);
                runOptimizationSolver();
              } else {
                setSimStep(0);
                setSimLogs(null);
                setOptSchedule(null);
                setOptMetrics(null);
                setAiInsights(null);
              }
            }}
            disabled={isOptimizing}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-2 disabled:opacity-50 ${
              simStep === 0 
                ? 'bg-[#0F2C5C] text-white hover:bg-[#1a3d7c] dark:bg-[#2F5FD1] dark:hover:bg-[#2351b8] shadow-md'
                : 'bg-slate-100 text-[#5B6478] dark:bg-slate-800 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {isOptimizing && <Loader2 className="w-3 h-3 animate-spin" />}
            {simStep === 0 ? (isOptimizing ? 'Solving...' : 'Run OR-Tools Solver') : 'Reset'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[rgba(15,44,92,0.08)] dark:divide-white/5 bg-[#F8F9FA] dark:bg-[#0f172a]/50">
          
          {/* Left: Original Queue */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
               <div className="text-[10px] text-[#5B6478] dark:text-gray-400 font-mono tracking-wider">
                 {simStep === 2 ? 'OPTIMIZED DISPATCH QUEUE' : 'UNOPTIMIZED FIFO QUEUE (12 TRAINS)'}
               </div>
               <div className={`text-[9px] px-2 py-0.5 rounded font-bold font-mono border ${simStep === 2 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-[#1E7F4F] dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-red-100 dark:bg-red-900/30 text-[#C23636] dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                 {simStep === 2 ? 'MAX EFFICIENCY' : 'HIGH DELAY RISK'}
               </div>
            </div>
            <div className="space-y-1.5">
               {(optSchedule || unoptimizedSchedule).map((t: any, i: number) => (
                  <div key={i} className={`flex justify-between items-center px-3 py-2 border rounded shadow-sm text-xs transition-colors ${simStep === 2 ? 'bg-[#F0FDF4] dark:bg-[#064e3b]/30 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-[#1f2937] border-slate-200 dark:border-slate-700'}`}>
                     <span className="font-mono text-[#0F2C5C] dark:text-gray-300">
                       {i+1}. {t.id} {simStep === 2 && t.start !== undefined ? `(T+${t.start})` : ''}
                       {t.predicted_delay > 0 && (
                         <span className="ml-2 text-[9px] text-[#C23636] dark:text-red-400 font-bold bg-red-100 dark:bg-red-900/30 px-1 py-0.5 rounded">
                           +{t.predicted_delay}m ML penalty
                         </span>
                       )}
                     </span>
                     <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        t.priority === 1 ? 'bg-emerald-50 text-[#1E7F4F] dark:bg-emerald-950/30 dark:text-emerald-400' : 
                        t.priority === 2 ? 'bg-amber-50 text-[#F5821F] dark:bg-amber-950/30 dark:text-amber-400' : 
                        'bg-red-50 text-[#C23636] dark:bg-red-950/30 dark:text-red-400'
                     }`}>
                       Priority {t.priority}
                     </span>
                  </div>
               ))}
            </div>
          </div>

          {/* Right: SimPy Log Terminal */}
          <div className="p-5 h-[350px] sm:h-[400px] md:h-[480px] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
               <div className="text-[10px] text-[#5B6478] dark:text-gray-400 font-mono tracking-wider">SIMPY DISCRETE-EVENT LOG</div>
               {isOptimizing && <div className="text-[10px] text-[#2F5FD1] dark:text-sky-400 animate-pulse font-mono font-bold">SOLVING...</div>}
               {simStep === 2 && <div className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-[#1E7F4F] dark:text-emerald-400 px-2 py-0.5 rounded font-bold font-mono border border-emerald-200 dark:border-emerald-800">OPTIMIZED</div>}
            </div>
            
            <div className="flex-1 bg-[#090D14] rounded-lg border border-slate-700 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed shadow-inner">
               {simStep === 0 && <span className="text-gray-500">Waiting for solver execution... Click "Run OR-Tools Solver" to begin.</span>}
               {simStep === 1 && !simLogs && (
                 <div className="text-sky-400 space-y-1">
                   <div>[SYSTEM] Initializing OR-Tools CP-SAT model...</div>
                   <div>[SYSTEM] Generating variables for 12 clustered trains...</div>
                   <div>[SYSTEM] Applying single-track NoOverlap constraints...</div>
                   <div className="animate-pulse">[SYSTEM] Running solver...</div>
                 </div>
               )}
               {simLogs && simLogs.map((log, i) => {
                  const isClear = log.msg.includes('cleared');
                  const isEnter = log.msg.includes('granted clearance');
                  const isReq = log.msg.includes('requesting');
                  return (
                    <div key={i} className={`flex gap-3 mb-1.5 ${isClear ? 'text-emerald-400' : isEnter ? 'text-amber-400' : 'text-gray-300'}`}>
              <span className="text-sky-400 shrink-0">[{log.time}]</span>
                      <span>{log.msg}</span>
                    </div>
                  );
               })}
            </div>
          </div>
        </div>

        {simStep === 2 && optMetrics && (
          <div className="p-5 border-t border-[rgba(15,44,92,0.08)] dark:border-white/5 bg-[#F8F9FA] dark:bg-[#0f172a]/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="p-4 bg-white dark:bg-[#1f2937] border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
               <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Cumulative Wait Time (System Delay)</div>
               <div className="flex items-end gap-3">
                 <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{optMetrics.optWait}m</span>
                 <span className="text-sm text-gray-400 line-through mb-1.5">{optMetrics.fifoWait}m (FIFO)</span>
               </div>
               <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded inline-block border border-emerald-100 dark:border-emerald-800">
                  ↓ {optMetrics.fifoWait - optMetrics.optWait} total minutes of delay avoided!
               </div>
             </div>
             <div className="p-4 bg-white dark:bg-[#1f2937] border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
               <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Time to Clear Bottleneck (Makespan)</div>
               <div className="flex items-end gap-3">
                 <span className="text-3xl font-bold text-[#0F2C5C] dark:text-white">{optMetrics.optMakespan}m</span>
                 <span className="text-sm text-gray-400 line-through mb-1.5">{optMetrics.fifoMakespan}m (FIFO)</span>
               </div>
               <div className="text-[11px] text-[#0F2C5C] dark:text-gray-300 font-bold mt-2 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded inline-block border border-slate-100 dark:border-slate-700">
                  Efficiency maintained despite massive ML penalties
               </div>
             </div>
          </div>
        )}

        {/* AI Insights Panel */}
        {(isGeneratingInsights || aiInsights) && (
          <div className="p-5 border-t border-[rgba(15,44,92,0.08)] dark:border-white/5 bg-gradient-to-r from-[#2F5FD1]/5 to-[#8A2BE2]/5 dark:from-[#2F5FD1]/10 dark:to-[#8A2BE2]/10">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[#0F2C5C] dark:text-white mb-1 flex items-center gap-2">
                  AI Station Master Insights
                </h4>
                {isGeneratingInsights ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing dispatch logs and calculating network impact...
                  </div>
                ) : (
                  <p className="text-sm text-[#0F2C5C] dark:text-gray-300 leading-relaxed font-medium">
                    {aiInsights}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Train Operations Sub-Table */}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6478] dark:text-gray-400 transition-colors">
            LIVE TRAIN OPERATIONS · ML RISK OVERVIEW
          </div>
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => addToast('Syncing AI operation feeds...', 'info')}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1E7F4F] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1E7F4F]"></span>
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#1E7F4F] tracking-wider uppercase">
              LIVE
            </span>
          </div>
        </div>

        <div className="border border-[rgba(15,44,92,0.10)] dark:border-white/10 overflow-x-auto bg-white dark:bg-[#111827] transition-colors shadow-sm rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgba(15,44,92,0.10)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937] text-[11px] font-mono uppercase text-[#5B6478] dark:text-gray-400 tracking-wider transition-colors">
                <th className="py-3 px-4 font-medium whitespace-nowrap">Train No.</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">Type</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">Section</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">Status</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">Delay</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">ML Risk</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">Departure</th>
                <th className="py-3 px-4 font-medium text-right whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(15,44,92,0.08)] dark:divide-white/10 text-xs">
              {displayTrains.map((train) => {
                const risk = computeDelayRisk(train);
                const { label, cls } = risk >= 60
                  ? { label: 'HIGH', cls: 'bg-red-100 dark:bg-red-950/40 text-[#C23636] dark:text-red-400' }
                  : risk >= 35
                  ? { label: 'MED',  cls: 'bg-amber-100 dark:bg-amber-950/40 text-[#F5821F] dark:text-amber-400' }
                  : { label: 'LOW',  cls: 'bg-emerald-100 dark:bg-emerald-950/40 text-[#1E7F4F] dark:text-emerald-400' };

                return (
                  <tr
                    key={train.trainNo}
                    className="hover:bg-[#F8F9FA] dark:hover:bg-[#1f2937] transition-colors cursor-pointer group"
                    onClick={() => addToast(`Analyzing optimization metrics for ${train.trainNo}`, 'info')}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-[#0F2C5C] dark:text-white transition-colors whitespace-nowrap">
                      {train.trainNo}
                    </td>
                    <td className="py-3 px-4 text-[#0F2C5C] dark:text-gray-300 transition-colors whitespace-nowrap">
                      {train.trainType}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#5B6478] dark:text-gray-400 transition-colors whitespace-nowrap">
                      {train.sectionId}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={train.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <span className={
                        train.delayMin && train.delayMin > 20
                          ? 'text-[#C23636] dark:text-[#f87171] font-medium'
                          : train.delayMin && train.delayMin > 0 ? 'text-[#B9790A] dark:text-[#fbbf24] font-medium' : 'text-[#5B6478] dark:text-gray-500'
                      }>
                        {train.delay}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${cls}`}>
                          {label}
                        </span>
                        <span className="font-mono text-[10px] text-[#5B6478] dark:text-gray-500">{risk}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#0F2C5C] dark:text-gray-300 transition-colors whitespace-nowrap">
                      {train.scheduledDeparture || train.etd}
                    </td>
                    <td className="py-3 px-4 text-right relative whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveMenuTrain(activeMenuTrain === train.trainNo ? null : train.trainNo)}
                        className="p-1 hover:bg-slate-200/70 dark:hover:bg-slate-700/50 text-[#5B6478] dark:text-gray-400 hover:text-[#0F2C5C] dark:hover:text-white transition-colors rounded"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {activeMenuTrain === train.trainNo && (
                        <div className="absolute right-4 mt-1 w-44 bg-white dark:bg-[#1E293B] border border-[rgba(15,44,92,0.15)] dark:border-white/10 shadow-xl py-1 z-30 text-left font-sans rounded-lg">
                          <button
                            onClick={() => {
                              updateTrainStatus(train.trainNo, 'ON TIME', '—');
                              addToast(`AI Optimizer cleared delay for ${train.trainNo}`, 'success');
                              setActiveMenuTrain(null);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-[#1E7F4F] dark:text-[#4ade80] hover:bg-slate-50 dark:hover:bg-[#334155] flex items-center font-medium transition-colors"
                          >
                            Optimize &amp; Clear Delay
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
