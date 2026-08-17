import React, { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useSystem } from '../context/SystemContext';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  WEEKLY_PERFORMANCE,
  DELAY_BY_TRAIN_TYPE,
  SECTION_DELAY_STATS,
  WEATHER_IMPACT,
  DELAY_BY_SEASON,
  DELAY_BY_TIME_BUCKET,
  ML_PREDICTIONS,
  DATASET_OVERVIEW,
  getTrainTypeChartOption,
  getOnTimePieOption,
  getSectionRadarOption,
  getWeatherImpactOption,
  getWeeklyLineOption,
  getSeasonChartOption,
} from '../data/analyticsData';
import {
  Brain,
  Zap,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  CloudRain,
  Clock,
  BarChart3,
  Target,
  Activity,
  ChevronRight,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
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

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6478] dark:text-gray-400 transition-colors mb-4">
    {label}
  </div>
);

// ── Weather badge ─────────────────────────────────────────────────────────────
const weatherColors: Record<string, string> = {
  Clear:    'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
  Moderate: 'text-amber-600  dark:text-amber-400   bg-amber-50   dark:bg-amber-950/40',
  Severe:   'text-red-600    dark:text-red-400     bg-red-50     dark:bg-red-950/40',
};

// ── Main Component ────────────────────────────────────────────────────────────
export const Analytics: React.FC = () => {
  const { trains } = useSystem();
  const isDark = useDarkMode();
  const departures = trains.slice(0, 8);

  // Chart options update when theme changes
  const chartOpts = {
    trainType:   getTrainTypeChartOption(isDark),
    onTimePie:   getOnTimePieOption(isDark),
    sectionRadar: getSectionRadarOption(isDark),
    weather:     getWeatherImpactOption(isDark),
    weekly:      getWeeklyLineOption(isDark),
    season:      getSeasonChartOption(isDark),
  };

  return (
    <div className="space-y-10 max-w-7xl pb-10">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 pb-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-[#0F2C5C] dark:text-white tracking-tight transition-colors">
            Analytics
          </h1>
          <span className="font-mono text-[11px] text-[#5B6478] dark:text-gray-400 uppercase tracking-wider transition-colors">
            Northern Zone · ML-Powered Delay Intelligence
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-[#1E7F4F] dark:text-emerald-400 bg-[#1E7F4F]/10 border border-[#1E7F4F]/20 px-2 py-1 rounded font-bold tracking-wider">
            50,000 RECORDS ANALYSED
          </span>
          <span className="font-mono text-[10px] text-[#2F5FD1] dark:text-sky-400 bg-[#2F5FD1]/10 border border-[#2F5FD1]/20 px-2 py-1 rounded font-bold tracking-wider">
            RF + HGB MODELS
          </span>
        </div>
      </div>

      {/* ── Model Performance KPI Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl p-4 shadow-sm hover:border-[#1E7F4F]/40 transition-all">
          <StatCard
            label="Classifier Accuracy"
            value={`${DATASET_OVERVIEW.classifierAccuracy}%`}
            delta="RandomForest · Binary"
            deltaType="positive"
            subLabel={`Delay threshold: >${DATASET_OVERVIEW.delayThreshold} min`}
          />
        </div>
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl p-4 shadow-sm hover:border-[#2F5FD1]/40 transition-all">
          <StatCard
            label="Regressor MAE"
            value={`${DATASET_OVERVIEW.regressorMAE} min`}
            delta={`R² = ${DATASET_OVERVIEW.regressorR2}`}
            deltaType="positive"
            subLabel="HistGradientBoosting regressor"
          />
        </div>
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl p-4 shadow-sm hover:border-[#C23636]/40 transition-all">
          <StatCard
            label="Fleet Delayed Rate"
            value={`${DATASET_OVERVIEW.delayedPct}%`}
            delta={`Avg: ${DATASET_OVERVIEW.avgDelayAll} min`}
            deltaType="negative"
            subLabel={`${DATASET_OVERVIEW.delayedCount.toLocaleString()} delayed of 50K`}
          />
        </div>
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl p-4 shadow-sm hover:border-[#F5821F]/40 transition-all">
          <StatCard
            label="On-Time Performance"
            value={`${DATASET_OVERVIEW.onTimePct}%`}
            delta={`+0.4% vs last week`}
            deltaType="positive"
            subLabel={`${DATASET_OVERVIEW.onTimeCount.toLocaleString()} on-time trains`}
          />
        </div>
      </div>

      {/* ── Row 1: Pie + Weekly Line ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* On-Time vs Delayed Donut */}
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937] flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-[#0F2C5C] dark:text-sky-400" />
            <h3 className="text-xs font-bold text-[#0F2C5C] dark:text-white uppercase tracking-wider">
              On-Time vs Delayed Split
            </h3>
          </div>
          <div className="p-4">
            <ReactECharts
              option={chartOpts.onTimePie}
              style={{ height: 220 }}
              theme={isDark ? 'dark' : undefined}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </div>

        {/* Weekly On-Time Line */}
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937] flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#0F2C5C] dark:text-sky-400" />
            <h3 className="text-xs font-bold text-[#0F2C5C] dark:text-white uppercase tracking-wider">
              Weekly On-Time Performance
            </h3>
          </div>
          <div className="p-4">
            <ReactECharts
              option={chartOpts.weekly}
              style={{ height: 220 }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </div>
      </div>

      {/* ── Row 2: Train Type Bar + Section Radar ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Delay % by Train Type */}
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-[#0F2C5C] dark:text-sky-400" />
              <h3 className="text-xs font-bold text-[#0F2C5C] dark:text-white uppercase tracking-wider">
                Delay % by Train Type
              </h3>
            </div>
            <span className="font-mono text-[10px] text-[#5B6478] dark:text-gray-400">
              Threshold: &gt;10 min
            </span>
          </div>
          <div className="p-4">
            <ReactECharts
              option={chartOpts.trainType}
              style={{ height: 200 }}
              opts={{ renderer: 'canvas' }}
            />
            {/* Inline legend */}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {DELAY_BY_TRAIN_TYPE.map(t => (
                <div key={t.type} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: t.color }} />
                    <span className="text-[#0F2C5C] dark:text-gray-200 font-medium">{t.type}</span>
                  </div>
                  <span className="font-mono text-[#5B6478] dark:text-gray-400">{t.delayedPct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section Health Radar */}
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937] flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-[#0F2C5C] dark:text-sky-400" />
            <h3 className="text-xs font-bold text-[#0F2C5C] dark:text-white uppercase tracking-wider">
              Section On-Time Health (Radar)
            </h3>
          </div>
          <div className="p-4">
            <ReactECharts
              option={chartOpts.sectionRadar}
              style={{ height: 240 }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </div>
      </div>

      {/* ── Row 3: Weather Impact + Season Comparison ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Weather Impact Bar */}
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937] flex items-center gap-2">
            <CloudRain className="w-3.5 h-3.5 text-[#0F2C5C] dark:text-sky-400" />
            <h3 className="text-xs font-bold text-[#0F2C5C] dark:text-white uppercase tracking-wider">
              Weather Impact on Average Delay
            </h3>
          </div>
          <div className="p-4">
            <ReactECharts
              option={chartOpts.weather}
              style={{ height: 180 }}
              opts={{ renderer: 'canvas' }}
            />
            <div className="mt-3 flex justify-between text-[10px] font-mono text-[#5B6478] dark:text-gray-400">
              <span>Clear → <b className="text-[#1E7F4F]">8.3 min</b></span>
              <span>Moderate → <b className="text-[#F5821F]">14.4 min</b></span>
              <span>Severe → <b className="text-[#C23636]">20.7 min</b></span>
            </div>
          </div>
        </div>

        {/* Season Horizontal Bar */}
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937] flex items-center gap-2">
            <TrendingDown className="w-3.5 h-3.5 text-[#0F2C5C] dark:text-sky-400" />
            <h3 className="text-xs font-bold text-[#0F2C5C] dark:text-white uppercase tracking-wider">
              Average Delay by Season
            </h3>
          </div>
          <div className="p-4">
            <ReactECharts
              option={chartOpts.season}
              style={{ height: 180 }}
              opts={{ renderer: 'canvas' }}
            />
            <div className="mt-3 flex justify-between text-[10px] font-mono text-[#5B6478] dark:text-gray-400">
              {DELAY_BY_SEASON.map(s => (
                <span key={s.season}>
                  {s.season}: <b style={{ color: s.color }}>{s.delayedPct}%</b>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section Table ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionLabel label="Section-wise Delay Analysis" />
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-mono uppercase text-[#5B6478] dark:text-gray-400 tracking-wider transition-colors border-b border-[rgba(15,44,92,0.10)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937]">
                  <th className="py-3 px-4 font-medium">Section</th>
                  <th className="py-3 px-4 font-medium">Avg Delay</th>
                  <th className="py-3 px-4 font-medium">Delayed %</th>
                  <th className="py-3 px-4 font-medium">On-Time %</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Health Bar</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-[rgba(15,44,92,0.06)] dark:divide-white/5">
                {SECTION_DELAY_STATS.map(s => {
                  const onTime = +(100 - s.delayedPct).toFixed(1);
                  const barColor = s.status === 'HIGH' ? '#F5821F' : '#1E7F4F';
                  return (
                    <tr key={s.section} className="hover:bg-[#F8F9FB]/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#0F2C5C] dark:text-gray-200">{s.section}</td>
                      <td className={`py-3 px-4 font-mono font-bold ${s.avgDelay > 10 ? 'text-[#F5821F]' : 'text-[#1E7F4F]'}`}>
                        {s.avgDelay} min
                      </td>
                      <td className="py-3 px-4 font-mono text-[#C23636] dark:text-red-400 font-semibold">
                        {s.delayedPct}%
                      </td>
                      <td className="py-3 px-4 font-mono text-[#1E7F4F] dark:text-emerald-400 font-semibold">
                        {onTime}%
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={s.status === 'HIGH' ? 'DELAYED' : 'ON TIME'} size="sm" />
                      </td>
                      <td className="py-3 px-4 w-32">
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${onTime}%`, background: barColor }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Time-of-Day Summary ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionLabel label="Delay by Time of Day" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DELAY_BY_TIME_BUCKET.map(t => (
            <div
              key={t.bucket}
              className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl p-4 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#5B6478] dark:text-gray-400" />
                <div>
                  <div className="text-xs font-semibold text-[#0F2C5C] dark:text-white">{t.bucket}</div>
                  <div className="text-[10px] text-[#5B6478] dark:text-gray-400">{t.delayedPct}% delayed</div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className="font-mono text-lg font-bold"
                  style={{ color: t.color }}
                >
                  {t.avgDelay} min
                </div>
                <div className="text-[10px] text-[#5B6478] dark:text-gray-400">avg delay</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ML Prediction Feed ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionLabel label="AI Model Predictions · Live Inference Scenarios" />
        <div className="space-y-3">
          {ML_PREDICTIONS.map(pred => (
            <div
              key={pred.id}
              className={`bg-white dark:bg-[#111827] border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 transition-all ${
                pred.isDelayed
                  ? 'border-[#C23636]/30 hover:border-[#C23636]/60'
                  : 'border-[#1E7F4F]/30 hover:border-[#1E7F4F]/60'
              }`}
            >
              {/* Left: prediction info */}
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  pred.isDelayed ? 'bg-red-50 dark:bg-red-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'
                }`}>
                  {pred.isDelayed
                    ? <AlertTriangle className="w-4 h-4 text-[#C23636] dark:text-red-400" />
                    : <CheckCircle2 className="w-4 h-4 text-[#1E7F4F] dark:text-emerald-400" />
                  }
                </div>
                <div className="min-w-0">
                  {/* Tags row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-[#2F5FD1] dark:text-sky-300 bg-[#2F5FD1]/10 px-1.5 py-0.5 rounded">
                      {pred.trainType}
                    </span>
                    <span className="font-mono text-[10px] text-[#5B6478] dark:text-gray-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {pred.section}
                    </span>
                    <span className="font-mono text-[10px] text-[#5B6478] dark:text-gray-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {pred.season}
                    </span>
                    <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded ${weatherColors[pred.weather] || ''}`}>
                      {pred.weather} ☁
                    </span>
                    <span className="font-mono text-[10px] text-[#5B6478] dark:text-gray-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {pred.timeBucket}
                    </span>
                  </div>
                  <p className="text-xs text-[#0F2C5C] dark:text-gray-200 leading-relaxed">
                    {pred.description}
                  </p>
                </div>
              </div>

              {/* Right: stats */}
              <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-1.5 shrink-0">
                <div className="text-center sm:text-right">
                  <div className={`font-mono text-lg font-bold ${
                    pred.isDelayed ? 'text-[#C23636] dark:text-red-400' : 'text-[#1E7F4F] dark:text-emerald-400'
                  }`}>
                    {pred.isDelayed ? `+${pred.predictedDelay} min` : `${pred.predictedDelay} min`}
                  </div>
                  <div className="text-[10px] text-[#5B6478] dark:text-gray-400">predicted delay</div>
                </div>
                <div className="text-center sm:text-right">
                  <div className="font-mono text-sm font-bold text-[#0F2C5C] dark:text-white">
                    {pred.confidence}%
                  </div>
                  <div className="text-[10px] text-[#5B6478] dark:text-gray-400">confidence</div>
                </div>
                <span className={`font-mono text-[10px] font-bold px-2 py-1 rounded ${
                  pred.isDelayed
                    ? 'bg-red-100 dark:bg-red-950/50 text-[#C23636] dark:text-red-400'
                    : 'bg-emerald-100 dark:bg-emerald-950/50 text-[#1E7F4F] dark:text-emerald-400'
                }`}>
                  {pred.isDelayed ? '⚠ DELAYED' : '✓ ON TIME'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* AI insight footer */}
        <div className="bg-gradient-to-r from-[#0F2C5C]/5 via-[#2F5FD1]/5 to-transparent dark:from-[#2F5FD1]/10 dark:to-transparent border border-[#2F5FD1]/20 rounded-xl p-4 flex items-start gap-3">
          <Zap className="w-4 h-4 text-[#2F5FD1] dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-xs font-bold text-[#0F2C5C] dark:text-white">
              AI Model Insights
            </div>
            <p className="text-xs text-[#5B6478] dark:text-gray-400 leading-relaxed">
              The <b className="text-[#0F2C5C] dark:text-white">RandomForest classifier</b> achieves <b className="text-[#1E7F4F]">87.17% accuracy</b> identifying delayed trains.
              The <b className="text-[#0F2C5C] dark:text-white">HistGradientBoosting regressor</b> predicts delay magnitude with just <b className="text-[#1E7F4F]">1.59 min MAE</b> and R² = 0.878.
              Key delay drivers: <b>Freight trains</b> (81.7% delayed), <b>SHE-SKG section</b> (worst on-time, 56.6% delay), <b>Winter &amp; Monsoon</b> seasons, and <b>Severe weather</b> (20.7 min avg delay vs 8.3 min clear).
            </p>
          </div>
        </div>
      </div>

      {/* ── Live Departure Schedule ───────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionLabel label="Live Departure Schedule" />
        <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-mono uppercase text-[#5B6478] dark:text-gray-400 tracking-wider border-b border-[rgba(15,44,92,0.10)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937]">
                  <th className="py-2.5 px-4 font-medium">Train</th>
                  <th className="py-2.5 px-4 font-medium">Destination</th>
                  <th className="py-2.5 px-4 font-medium">Platform</th>
                  <th className="py-2.5 px-4 font-medium">Scheduled</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-[rgba(15,44,92,0.06)] dark:divide-white/5">
                {departures.map((row) => (
                  <tr key={row.trainNo} className="hover:bg-[#F8F9FB]/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0F2C5C] dark:text-gray-200">{row.trainNo}</td>
                    <td className="py-3.5 px-4 font-medium text-[#0F2C5C] dark:text-gray-200">{row.destination}</td>
                    <td className="py-3.5 px-4 font-mono text-[#0F2C5C] dark:text-gray-200">{row.platform}</td>
                    <td className="py-3.5 px-4 font-mono text-[#0F2C5C] dark:text-gray-200">{row.scheduledDeparture ?? row.etd}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={row.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};
