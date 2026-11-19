import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useSystem } from '../context/SystemContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Panel } from '../components/dashboard/Panel';
import { KpiRail } from '../components/dashboard/KpiRail';
import type { KpiItem } from '../components/dashboard/KpiRail';
import { PageHeader } from '../components/dashboard/PageHeader';
import { PAGE, SECTION_LABEL, THEAD, TROW, tag } from '../components/dashboard/theme';
import { MoreHorizontal, Loader2 } from 'lucide-react';
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

      // Calendar context for the ML model (API expects 1=Mon … 7=Sun)
      const today      = new Date();
      const dayOfWeek  = today.getDay() === 0 ? 7 : today.getDay();
      const isWeekend  = today.getDay() === 0 || today.getDay() === 6 ? 1 : 0;

      const payloadWithPredictions = await Promise.all(
        trainsToOptimize.map(async (train) => {
          const reqBody = {
            train_type: train.trainType || 'Freight',
            priority: train.priorityLevel || 3,
            section_id: train.sectionId || 'BWN-GUS',
            day_of_week: dayOfWeek,
            is_weekend: isWeekend,
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
          } catch {
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
      
    } catch {
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

  const kpis: KpiItem[] = [
    {
      id: 'fleet',
      label: 'Fleet delayed rate',
      value: `${DATASET_OVERVIEW.delayedPct}`,
      unit: '%',
      note: `${DATASET_OVERVIEW.delayedCount.toLocaleString()} of 50,000 journeys`,
      tone: 'danger',
      meter: DATASET_OVERVIEW.delayedPct,
      threshold: 50,
    },
    {
      id: 'freight',
      label: 'Freight delay rate',
      value: `${freightDelayPct}`,
      unit: '%',
      note: 'Highest risk category · avg 14.7 min',
      tone: 'danger',
      meter: freightDelayPct,
    },
    {
      id: 'acc',
      label: 'Classifier accuracy',
      value: `${DATASET_OVERVIEW.classifierAccuracy}`,
      unit: '%',
      note: `MAE ${DATASET_OVERVIEW.regressorMAE} min · R² ${DATASET_OVERVIEW.regressorR2}`,
      tone: 'positive',
      meter: DATASET_OVERVIEW.classifierAccuracy,
      threshold: 85,
    },
    {
      id: 'express',
      label: 'Express on-time rate',
      value: `${(100 - expressDelayPct).toFixed(1)}`,
      unit: '%',
      note: 'Best performing type · 8.1 min when late',
      tone: 'positive',
      meter: 100 - expressDelayPct,
      threshold: 85,
    },
  ];

  return (
    <div className={PAGE}>

      {/* ── Console header ───────────────────────────────────────────────── */}
      <PageHeader eyebrow="Dispatch · constraint solver" title="Optimization" live>
        <span className={tag('muted')}>50k records · RF + HGB pipeline</span>
      </PageHeader>

      <KpiRail columns={4} items={kpis} />

      {/* ── Two-column: Feature Importance + Worst Sections ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <Panel title="Feature importance" meta="RandomForest classifier">
          <div className="p-4">
            <ReactECharts
              option={getFeatureImportanceOption(isDark)}
              style={{ height: 300 }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </Panel>

        <Panel title="Section performance" meta="ranked across 8 sections">
          <div>
            {SECTION_DELAY_STATS.map((s, i) => {
              const onTime = +(100 - s.delayedPct).toFixed(1);
              const barColor = s.avgDelay > 10 ? '#B9790A' : '#1E7F4F';
              return (
                <div
                  key={s.section}
                  className="px-4 py-2.5 flex items-center gap-3 border-b border-[rgba(15,44,92,0.07)] dark:border-white/[0.06] last:border-0"
                >
                  <span className="w-4 shrink-0 font-mono text-[9px] tabular-nums text-[#8C95A6] dark:text-gray-500">
                    {i + 1}
                  </span>
                  <span className="w-20 shrink-0 font-mono text-[11px] font-semibold text-[#0F2C5C] dark:text-gray-200">
                    {s.section}
                  </span>
                  <div className="flex-1 h-[3px] bg-[rgba(15,44,92,0.08)] dark:bg-white/10">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${onTime}%`, background: barColor }}
                    />
                  </div>
                  <span
                    className={`w-10 shrink-0 text-right font-mono text-[9px] tabular-nums font-semibold ${
                      s.avgDelay > 10
                        ? 'text-[#B9790A] dark:text-amber-400'
                        : 'text-[#1E7F4F] dark:text-emerald-400'
                    }`}
                  >
                    {onTime}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-[rgba(15,44,92,0.10)] dark:border-white/10 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
            Worst {worstSection.section} · {worstSection.delayedPct}% delayed · avg {worstSection.avgDelay} min
          </div>
        </Panel>
      </div>

      {/* ── Dispatch optimizer ───────────────────────────────────────────── */}
      <Panel
        title="OR-Tools CP-SAT dispatch optimizer"
        meta="12-train cluster · single-track bottleneck"
        action={
          <button
            type="button"
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
            className={`flex items-center gap-1.5 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] transition-colors disabled:opacity-50 ${
              simStep === 0
                ? 'bg-[#0F2C5C] dark:bg-sky-500 text-white dark:text-slate-950 hover:bg-[#2F5FD1] dark:hover:bg-sky-400'
                : 'border border-[rgba(15,44,92,0.16)] dark:border-white/12 text-[#5B6478] dark:text-gray-300 hover:bg-[#0F2C5C]/[0.04] dark:hover:bg-white/5'
            }`}
          >
            {isOptimizing && <Loader2 className="w-3 h-3 animate-spin" />}
            {simStep === 0 ? (isOptimizing ? 'Solving' : 'Run solver') : 'Reset'}
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[rgba(15,44,92,0.10)] dark:divide-white/[0.08]">

          {/* Queue */}
          <div className="p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5B6478] dark:text-gray-400">
                {simStep === 2 ? 'Optimized dispatch queue' : 'Unoptimized FIFO queue'}
              </span>
              <span className={tag(simStep === 2 ? 'positive' : 'danger')}>
                {simStep === 2 ? 'Max efficiency' : 'High delay risk'}
              </span>
            </div>

            <div className="space-y-1">
              {(optSchedule || unoptimizedSchedule).map((t: any, i: number) => (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-2 border-l-2 px-2.5 py-1.5 ${
                    simStep === 2
                      ? 'border-l-[#1E7F4F] dark:border-l-emerald-400 bg-[#1E7F4F]/[0.04] dark:bg-emerald-400/[0.05]'
                      : 'border-l-[#C23636] dark:border-l-red-400'
                  }`}
                >
                  <span className="min-w-0 truncate font-mono text-[10px] text-[#0F2C5C] dark:text-gray-300">
                    <span className="text-[#8C95A6] dark:text-gray-500">
                      {String(i + 1).padStart(2, '0')}
                    </span>{' '}
                    {t.id}
                    {simStep === 2 && t.start !== undefined ? ` · T+${t.start}` : ''}
                    {t.predicted_delay > 0 && (
                      <span className={`ml-1.5 ${tag('danger')}`}>+{t.predicted_delay}m</span>
                    )}
                  </span>
                  <span
                    className={tag(
                      t.priority === 1 ? 'positive' : t.priority === 2 ? 'caution' : 'danger'
                    )}
                  >
                    P{t.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SimPy log */}
          <div className="p-4 flex flex-col md:h-[520px]">
            <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5B6478] dark:text-gray-400">
                SimPy discrete-event log
              </span>
              {isOptimizing && (
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#2F5FD1] dark:text-sky-400 animate-pulse">
                  Solving
                </span>
              )}
              {simStep === 2 && <span className={tag('positive')}>Optimized</span>}
            </div>

            <div className="flex-1 min-h-[280px] overflow-y-auto bg-[#080C14] border border-white/[0.07] p-3 font-mono text-[10px] leading-relaxed">
              {simStep === 0 && (
                <span className="text-gray-500">
                  Waiting for solver execution. Run the solver to stream the dispatch log.
                </span>
              )}
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
                return (
                  <div
                    key={i}
                    className={`flex gap-3 mb-1.5 ${
                      isClear ? 'text-emerald-400' : isEnter ? 'text-amber-400' : 'text-gray-300'
                    }`}
                  >
                    <span className="text-sky-400 shrink-0 tabular-nums">[{log.time}]</span>
                    <span>{log.msg}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {simStep === 2 && optMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-[rgba(15,44,92,0.10)] dark:border-white/10 divide-y sm:divide-y-0 sm:divide-x divide-[rgba(15,44,92,0.10)] dark:divide-white/10">
            <div className="px-4 py-3.5">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5B6478] dark:text-gray-400">
                Cumulative wait · system delay
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-mono text-[26px] leading-none font-semibold tabular-nums text-[#1E7F4F] dark:text-emerald-400">
                  {optMetrics.optWait}m
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[#8C95A6] dark:text-gray-500 line-through">
                  {optMetrics.fifoWait}m FIFO
                </span>
              </div>
              <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#1E7F4F] dark:text-emerald-400">
                {optMetrics.fifoWait - optMetrics.optWait} min avoided
              </div>
            </div>

            <div className="px-4 py-3.5">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5B6478] dark:text-gray-400">
                Bottleneck clearance · makespan
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-mono text-[26px] leading-none font-semibold tabular-nums text-[#0F2C5C] dark:text-white">
                  {optMetrics.optMakespan}m
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[#8C95A6] dark:text-gray-500 line-through">
                  {optMetrics.fifoMakespan}m FIFO
                </span>
              </div>
              <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
                Held despite ML penalties
              </div>
            </div>
          </div>
        )}

        {(isGeneratingInsights || aiInsights) && (
          <div className="flex items-start gap-3 border-t border-[rgba(15,44,92,0.10)] dark:border-white/10 bg-[#2F5FD1]/[0.04] dark:bg-sky-400/[0.05] px-4 py-3.5">
            <span className="mt-0.5 h-8 w-[3px] shrink-0 bg-[#2F5FD1] dark:bg-sky-400" aria-hidden="true" />
            <div className="min-w-0">
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#0F2C5C] dark:text-white">
                AI station master insights
              </div>
              {isGeneratingInsights ? (
                <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-[#5B6478] dark:text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  analysing dispatch logs and network impact...
                </div>
              ) : (
                <p className="mt-1 text-[11px] leading-relaxed text-[#0F2C5C] dark:text-gray-300">
                  {aiInsights}
                </p>
              )}
            </div>
          </div>
        )}
      </Panel>

      {/* ── Live risk register ───────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className={SECTION_LABEL}>
            <span className="w-[3px] h-3 bg-[#2F5FD1] dark:bg-sky-400" aria-hidden="true" />
            Live train operations · ML risk
          </div>
          <button
            type="button"
            onClick={() => addToast('Syncing AI operation feeds...', 'info')}
            className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#1E7F4F] dark:text-emerald-400"
          >
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#1E7F4F] opacity-70 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1E7F4F] dark:bg-emerald-400" />
            </span>
            Live
          </button>
        </div>

        <Panel
          title="Risk register"
          meta={`${displayTrains.length} of ${trains.length} tracked`}
          bodyClassName="overflow-x-auto"
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={THEAD}>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Train no.</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Type</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Section</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Status</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Delay</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">ML risk</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Departure</th>
                <th className="py-2.5 px-4 font-medium text-right whitespace-nowrap" />
              </tr>
            </thead>
            <tbody>
              {displayTrains.map((train) => {
                const risk = computeDelayRisk(train);
                const tone = risk >= 60 ? 'danger' : risk >= 35 ? 'caution' : 'positive';
                const label = risk >= 60 ? 'High' : risk >= 35 ? 'Med' : 'Low';

                return (
                  <tr
                    key={train.trainNo}
                    className={`${TROW} cursor-pointer`}
                    onClick={() => addToast(`Analyzing optimization metrics for ${train.trainNo}`, 'info')}
                  >
                    <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-[#0F2C5C] dark:text-white whitespace-nowrap">
                      {train.trainNo}
                    </td>
                    <td className="py-2.5 px-4 text-[11px] text-[#0F2C5C] dark:text-gray-300 whitespace-nowrap">
                      {train.trainType}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#5B6478] dark:text-gray-400 whitespace-nowrap">
                      {train.sectionId}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <StatusBadge status={train.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] tabular-nums whitespace-nowrap">
                      <span className={
                        train.delayMin && train.delayMin > 20
                          ? 'text-[#C23636] dark:text-red-400 font-semibold'
                          : train.delayMin && train.delayMin > 0
                            ? 'text-[#B9790A] dark:text-amber-400 font-semibold'
                            : 'text-[#5B6478] dark:text-gray-500'
                      }>
                        {train.delay}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={tag(tone)}>{label}</span>
                        <span className="font-mono text-[9px] tabular-nums text-[#5B6478] dark:text-gray-500">{risk}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] tabular-nums text-[#0F2C5C] dark:text-gray-300 whitespace-nowrap">
                      {train.scheduledDeparture || train.etd}
                    </td>
                    <td className="py-2.5 px-4 text-right relative whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setActiveMenuTrain(activeMenuTrain === train.trainNo ? null : train.trainNo)}
                        className="p-1 text-[#5B6478] dark:text-gray-400 hover:text-[#0F2C5C] dark:hover:text-white hover:bg-[#0F2C5C]/[0.04] dark:hover:bg-white/5 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {activeMenuTrain === train.trainNo && (
                        <div className="absolute right-4 mt-1 w-48 z-30 border border-[rgba(15,44,92,0.15)] dark:border-white/10 bg-white dark:bg-[#0C1424] shadow-xl py-1 text-left">
                          <button
                            type="button"
                            onClick={() => {
                              updateTrainStatus(train.trainNo, 'ON TIME', '—');
                              addToast(`AI Optimizer cleared delay for ${train.trainNo}`, 'success');
                              setActiveMenuTrain(null);
                            }}
                            className="w-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#1E7F4F] dark:text-emerald-400 hover:bg-[#F6F8FB] dark:hover:bg-white/5 transition-colors"
                          >
                            Optimize &amp; clear delay
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>

    </div>
  );
};
