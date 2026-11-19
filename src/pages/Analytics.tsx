import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useSystem } from '../context/SystemContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Panel } from '../components/dashboard/Panel';
import { KpiRail } from '../components/dashboard/KpiRail';
import type { KpiItem } from '../components/dashboard/KpiRail';
import { PageHeader } from '../components/dashboard/PageHeader';
import { PAGE, SECTION_LABEL, THEAD, TROW, tag } from '../components/dashboard/theme';
import {
  DELAY_BY_TRAIN_TYPE,
  SECTION_DELAY_STATS,
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
import { Zap } from 'lucide-react';

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

// ── Weather tones for the prediction feed ─────────────────────────────────────
const weatherTone: Record<string, 'positive' | 'caution' | 'danger'> = {
  Clear: 'positive',
  Moderate: 'caution',
  Severe: 'danger',
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

  const kpis: KpiItem[] = [
    {
      id: 'acc',
      label: 'Classifier accuracy',
      value: `${DATASET_OVERVIEW.classifierAccuracy}`,
      unit: '%',
      note: `RandomForest · ${DATASET_OVERVIEW.delayThreshold} min threshold`,
      tone: 'positive',
      meter: DATASET_OVERVIEW.classifierAccuracy,
      threshold: 85,
    },
    {
      id: 'mae',
      label: 'Regressor MAE',
      value: `${DATASET_OVERVIEW.regressorMAE}`,
      unit: 'min',
      note: `R² ${DATASET_OVERVIEW.regressorR2} · HistGradientBoosting`,
      tone: 'positive',
      meter: (1 - DATASET_OVERVIEW.regressorMAE / 10) * 100,
    },
    {
      id: 'delayed',
      label: 'Fleet delayed rate',
      value: `${DATASET_OVERVIEW.delayedPct}`,
      unit: '%',
      note: `${DATASET_OVERVIEW.delayedCount.toLocaleString()} of 50k journeys`,
      tone: 'danger',
      meter: DATASET_OVERVIEW.delayedPct,
      threshold: 50,
    },
    {
      id: 'ontime',
      label: 'On-time performance',
      value: `${DATASET_OVERVIEW.onTimePct}`,
      unit: '%',
      note: `Target ≥ 85% · ${DATASET_OVERVIEW.onTimeCount.toLocaleString()} cleared`,
      tone: 'caution',
      meter: DATASET_OVERVIEW.onTimePct,
      threshold: 85,
    },
  ];

  const timeKpis: KpiItem[] = DELAY_BY_TIME_BUCKET.map((t) => ({
    id: t.bucket,
    label: t.bucket,
    value: `${t.avgDelay}`,
    unit: 'min',
    note: `${t.delayedPct}% delayed · avg when late`,
    tone: t.avgDelay > 10 ? 'caution' : 'positive',
    meter: t.delayedPct,
    threshold: 50,
  }));

  return (
    <div className={PAGE}>

      {/* ── Console header ───────────────────────────────────────────────── */}
      <PageHeader eyebrow="Intelligence · 50k journey corpus" title="Analytics" live>
        <span className={tag('positive')}>50,000 records analysed</span>
        <span className={tag('info')}>RF + HGB models</span>
      </PageHeader>

      <KpiRail columns={4} items={kpis} />

      {/* ── Row 1: Pie + Weekly Line ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Panel title="On-time vs delayed split" meta="50k journeys">
          <div className="p-4">
            <ReactECharts
              option={chartOpts.onTimePie}
              style={{ height: 220 }}
              theme={isDark ? 'dark' : undefined}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </Panel>

        <Panel title="Weekly on-time performance" meta="rolling 7 day window">
          <div className="p-4">
            <ReactECharts
              option={chartOpts.weekly}
              style={{ height: 220 }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </Panel>
      </div>

      {/* ── Row 2: Train Type Bar + Section Radar ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Panel title="Delay by train type" meta="threshold > 10 min">
          <div className="p-4">
            <ReactECharts
              option={chartOpts.trainType}
              style={{ height: 200 }}
              opts={{ renderer: 'canvas' }}
            />
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {DELAY_BY_TRAIN_TYPE.map((t) => (
                <div key={t.type} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 inline-block" style={{ background: t.color }} />
                    <span className="font-mono text-[#0F2C5C] dark:text-gray-200">{t.type}</span>
                  </div>
                  <span className="font-mono tabular-nums text-[#5B6478] dark:text-gray-400">{t.delayedPct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Section on-time health" meta="8 sections · radar">
          <div className="p-4">
            <ReactECharts
              option={chartOpts.sectionRadar}
              style={{ height: 240 }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </Panel>
      </div>

      {/* ── Row 3: Weather Impact + Season Comparison ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Panel title="Weather impact on delay" meta="mean delay by condition">
          <div className="p-4">
            <ReactECharts
              option={chartOpts.weather}
              style={{ height: 180 }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
          <div className="grid grid-cols-3 border-t border-[rgba(15,44,92,0.10)] dark:border-white/10 divide-x divide-[rgba(15,44,92,0.10)] dark:divide-white/10">
            <div className="px-3 py-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">Clear</div>
              <div className="mt-0.5 font-mono text-[13px] font-semibold tabular-nums text-[#1E7F4F] dark:text-emerald-400">8.3 min</div>
            </div>
            <div className="px-3 py-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">Moderate</div>
              <div className="mt-0.5 font-mono text-[13px] font-semibold tabular-nums text-[#B9790A] dark:text-amber-400">14.4 min</div>
            </div>
            <div className="px-3 py-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">Severe</div>
              <div className="mt-0.5 font-mono text-[13px] font-semibold tabular-nums text-[#C23636] dark:text-red-400">20.7 min</div>
            </div>
          </div>
        </Panel>

        <Panel title="Average delay by season" meta="% delayed">
          <div className="p-4">
            <ReactECharts
              option={chartOpts.season}
              style={{ height: 180 }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(15,44,92,0.10)] dark:border-white/10 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#5B6478] dark:text-gray-400">
            {DELAY_BY_SEASON.map((s) => (
              <span key={s.season}>
                {s.season} <b className="tabular-nums" style={{ color: s.color }}>{s.delayedPct}%</b>
              </span>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Section Table ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className={SECTION_LABEL}>
          <span className="w-[3px] h-3 bg-[#2F5FD1] dark:bg-sky-400" aria-hidden="true" />
          Section-wise delay analysis
        </div>

        <Panel title="Section register" meta="ranked by delay rate" bodyClassName="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={THEAD}>
                <th className="py-2.5 px-4 font-medium">Section</th>
                <th className="py-2.5 px-4 font-medium">Avg delay</th>
                <th className="py-2.5 px-4 font-medium">Delayed %</th>
                <th className="py-2.5 px-4 font-medium">On-time %</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Health</th>
              </tr>
            </thead>
            <tbody>
              {SECTION_DELAY_STATS.map((s) => {
                const onTime = +(100 - s.delayedPct).toFixed(1);
                const barColor = s.status === 'HIGH' ? '#B9790A' : '#1E7F4F';
                return (
                  <tr key={s.section} className={TROW}>
                    <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-[#0F2C5C] dark:text-gray-200">
                      {s.section}
                    </td>
                    <td className={`py-2.5 px-4 font-mono text-[11px] tabular-nums font-semibold ${
                      s.avgDelay > 10 ? 'text-[#B9790A] dark:text-amber-400' : 'text-[#1E7F4F] dark:text-emerald-400'
                    }`}>
                      {s.avgDelay} min
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] tabular-nums font-semibold text-[#C23636] dark:text-red-400">
                      {s.delayedPct}%
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] tabular-nums font-semibold text-[#1E7F4F] dark:text-emerald-400">
                      {onTime}%
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={s.status === 'HIGH' ? 'DELAYED' : 'ON TIME'} size="sm" />
                    </td>
                    <td className="py-2.5 px-4 w-32">
                      <div className="h-[3px] w-full bg-[rgba(15,44,92,0.08)] dark:bg-white/10">
                        <div
                          className="h-full transition-all duration-500"
                          style={{ width: `${onTime}%`, background: barColor }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>

      {/* ── Time-of-Day Summary ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className={SECTION_LABEL}>
          <span className="w-[3px] h-3 bg-[#2F5FD1] dark:bg-sky-400" aria-hidden="true" />
          Delay by time of day
        </div>
        <KpiRail columns={3} items={timeKpis} />
      </div>

      {/* ── ML Prediction Feed ───────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className={SECTION_LABEL}>
          <span className="w-[3px] h-3 bg-[#2F5FD1] dark:bg-sky-400" aria-hidden="true" />
          AI model predictions · live inference scenarios
        </div>

        <Panel
          title="Prediction feed"
          meta={`${ML_PREDICTIONS.length} scenarios`}
          bodyClassName="divide-y divide-[rgba(15,44,92,0.08)] dark:divide-white/[0.06]"
        >
          {ML_PREDICTIONS.map((pred) => (
            <div
              key={pred.id}
              className="px-4 py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 hover:bg-[#F6F8FB] dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`mt-[3px] w-[3px] h-6 shrink-0 ${
                    pred.isDelayed ? 'bg-[#C23636] dark:bg-red-400' : 'bg-[#1E7F4F] dark:bg-emerald-400'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1 mb-1.5">
                    <span className={tag('info')}>{pred.trainType}</span>
                    <span className={tag('muted')}>{pred.section}</span>
                    <span className={tag('muted')}>{pred.season}</span>
                    <span className={tag(weatherTone[pred.weather] ?? 'muted')}>{pred.weather}</span>
                    <span className={tag('muted')}>{pred.timeBucket}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#0F2C5C] dark:text-gray-300">
                    {pred.description}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-1 shrink-0 pl-6 sm:pl-0">
                <div className="text-center sm:text-right">
                  <div className={`font-mono text-[15px] font-semibold tabular-nums ${
                    pred.isDelayed ? 'text-[#C23636] dark:text-red-400' : 'text-[#1E7F4F] dark:text-emerald-400'
                  }`}>
                    {pred.isDelayed ? `+${pred.predictedDelay}` : pred.predictedDelay} min
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
                    predicted delay
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <div className="font-mono text-[11px] font-semibold tabular-nums text-[#0F2C5C] dark:text-white">
                    {pred.confidence}%
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
                    confidence
                  </div>
                </div>
                <span className={tag(pred.isDelayed ? 'danger' : 'positive')}>
                  {pred.isDelayed ? 'Delayed' : 'On time'}
                </span>
              </div>
            </div>
          ))}
        </Panel>

        <div className="flex items-start gap-3 border border-[#2F5FD1]/25 dark:border-sky-400/25 bg-[#2F5FD1]/[0.04] dark:bg-sky-400/[0.06] px-4 py-3">
          <Zap className="w-4 h-4 shrink-0 mt-0.5 text-[#2F5FD1] dark:text-sky-400" />
          <div>
            <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#0F2C5C] dark:text-white">
              Model insights
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#5B6478] dark:text-gray-400">
              The RandomForest classifier reaches 87.17% accuracy separating delayed from on-time
              runs; the HistGradientBoosting regressor estimates magnitude at 1.59 min MAE
              (R² 0.878). Delay is driven by Freight traffic (81.7% delayed), the SHE-SKG section
              (56.6% delayed), Winter and Monsoon seasons, and severe weather at 20.7 min average.
            </p>
          </div>
        </div>
      </div>

      {/* ── Live Departure Schedule ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className={SECTION_LABEL}>
          <span className="w-[3px] h-3 bg-[#2F5FD1] dark:bg-sky-400" aria-hidden="true" />
          Live departure schedule
        </div>

        <Panel title="Next departures" meta={`${departures.length} of ${trains.length} tracked`} bodyClassName="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={THEAD}>
                <th className="py-2.5 px-4 font-medium">Train</th>
                <th className="py-2.5 px-4 font-medium">Destination</th>
                <th className="py-2.5 px-4 font-medium">Platform</th>
                <th className="py-2.5 px-4 font-medium">Scheduled</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {departures.map((row) => (
                <tr key={row.trainNo} className={TROW}>
                  <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-[#0F2C5C] dark:text-gray-200">{row.trainNo}</td>
                  <td className="py-2.5 px-4 text-[11px] text-[#0F2C5C] dark:text-gray-300">{row.destination}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px] tabular-nums text-[#0F2C5C] dark:text-gray-300">{row.platform}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px] tabular-nums text-[#0F2C5C] dark:text-gray-300">{row.scheduledDeparture ?? row.etd}</td>
                  <td className="py-2.5 px-4">
                    <StatusBadge status={row.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

    </div>
  );
};
