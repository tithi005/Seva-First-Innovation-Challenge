import React, { useEffect, useMemo, useState } from 'react';
import { useSystem } from '../context/SystemContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';
import type { Train } from '../types';
import { MoreHorizontal, RefreshCw, Search, X } from 'lucide-react';
import { computeDelayRisk } from '../data/analyticsData';
import { Panel } from '../components/dashboard/Panel';
import { KpiRail } from '../components/dashboard/KpiRail';
import type { KpiItem } from '../components/dashboard/KpiRail';
import { PageHeader } from '../components/dashboard/PageHeader';
import { SECTIONS } from '../components/dashboard/corridor';
import { DELAY_THRESHOLD_MIN, isLate } from '../components/dashboard/metrics';
import { FIELD, PAGE, THEAD, TROW, tag } from '../components/dashboard/theme';

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

type Focus = 'ALL' | 'LATE' | 'RISK' | 'SINGLE';

const FOCUS_OPTIONS: Array<{ id: Focus; label: string }> = [
  { id: 'ALL', label: 'ALL' },
  { id: 'LATE', label: 'LATE' },
  { id: 'RISK', label: 'HIGH RISK' },
  { id: 'SINGLE', label: 'SINGLE' },
];

const riskTone = (risk: number) => (risk >= 60 ? 'danger' : risk >= 35 ? 'caution' : 'positive');
const riskLabel = (risk: number) => (risk >= 60 ? 'HIGH' : risk >= 35 ? 'MED' : 'LOW');

const RiskTag = ({ risk }: { risk: number }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={tag(riskTone(risk))}>{riskLabel(risk)}</span>
    <span className="font-mono text-[10px] tabular-nums text-[#5B6478] dark:text-gray-400">
      {risk}%
    </span>
  </span>
);

/** Small divided readout used inside the telemetry sheet. */
const Readout = ({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'danger' | 'positive';
}) => (
  <div className="min-w-0 bg-white dark:bg-[#0C1424] px-3 py-2.5">
    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400 truncate">
      {label}
    </div>
    <div
      className={`mt-1 font-mono text-[13px] font-semibold tabular-nums truncate ${
        tone === 'danger'
          ? 'text-[#C23636] dark:text-red-400'
          : tone === 'positive'
            ? 'text-[#1E7F4F] dark:text-emerald-400'
            : 'text-[#0F2C5C] dark:text-white'
      }`}
    >
      {value}
    </div>
  </div>
);

export const Operations: React.FC = () => {
  const { trains, updateTrainStatus, istTime } = useSystem();
  const { addToast } = useToast();
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [activeMenuTrain, setActiveMenuTrain] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState<Focus>('ALL');
  const [section, setSection] = useState('ALL');

  // Click-away and Escape dismiss the dispatch menu.
  useEffect(() => {
    if (!activeMenuTrain) return;
    const close = () => setActiveMenuTrain(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [activeMenuTrain]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setActiveMenuTrain(null);
      setSelectedTrain(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ranked = useMemo(
    () =>
      trains
        .map((train) => ({ train, risk: computeDelayRisk(train), late: isLate(train) }))
        .sort((a, b) => b.risk - a.risk || (b.train.delayMinutes ?? 0) - (a.train.delayMinutes ?? 0)),
    [trains]
  );

  const lateTrains = ranked.filter((entry) => entry.late);
  const highRisk = ranked.filter((entry) => entry.risk >= 60);
  const singleLine = ranked.filter((entry) => entry.train.trackType === 'Single');
  const sectionsReporting = new Set(trains.map((t) => t.sectionId).filter(Boolean)).size;
  const avgLate = mean(lateTrains.map((entry) => entry.train.delayMinutes ?? 0));
  const meanCongestion =
    mean(trains.map((t) => (t.sectionCongestionLevel ?? 0) * 100)) || 0;

  const needle = query.trim().toLowerCase();
  const filtered = ranked.filter(({ train, risk }) => {
    if (section !== 'ALL' && train.sectionId !== section) return false;
    if (focus === 'LATE' && !isLate(train)) return false;
    if (focus === 'RISK' && risk < 60) return false;
    if (focus === 'SINGLE' && train.trackType !== 'Single') return false;
    if (!needle) return true;
    return `${train.trainNo} ${train.name} ${train.destination}`.toLowerCase().includes(needle);
  });

  const filtersActive = query.trim() !== '' || focus !== 'ALL' || section !== 'ALL';
  const clearFilters = () => {
    setQuery('');
    setFocus('ALL');
    setSection('ALL');
  };

  const kpis: KpiItem[] = [
    {
      id: 'rakes',
      label: 'Rakes reporting',
      value: String(trains.length),
      unit: 'rakes',
      note: `${sectionsReporting} sections · ${lateTrains.length} past ${DELAY_THRESHOLD_MIN} min`,
      tone: 'default',
    },
    {
      id: 'late',
      label: 'Late share',
      value: String(Math.round((lateTrains.length / (trains.length || 1)) * 100)),
      unit: '%',
      note: `${lateTrains.length} of ${trains.length} rakes delayed`,
      tone: 'danger',
      meter: (lateTrains.length / (trains.length || 1)) * 100,
      threshold: 50,
    },
    {
      id: 'mean-late',
      label: 'Mean delay · late',
      value: avgLate.toFixed(1),
      unit: 'min',
      note: `${DELAY_THRESHOLD_MIN} min truncated from mean`,
      tone: 'caution',
      meter: (avgLate / 25) * 100,
      threshold: (DELAY_THRESHOLD_MIN / 25) * 100,
    },
    {
      id: 'risk',
      label: 'High ML risk',
      value: String(highRisk.length),
      unit: 'rakes',
      note: `RF score ≥ 60 · ${Math.round((highRisk.length / (trains.length || 1)) * 100)}% of board`,
      tone: 'danger',
      meter: (highRisk.length / (trains.length || 1)) * 100,
    },
    {
      id: 'congestion',
      label: 'Mean section congestion',
      value: String(Math.round(meanCongestion)),
      unit: '%',
      note: 'feature level across reporting rakes',
      tone: meanCongestion >= 65 ? 'danger' : 'caution',
      meter: meanCongestion,
      threshold: 65,
    },
    {
      id: 'single',
      label: 'Single-line workings',
      value: String(singleLine.length),
      unit: 'rakes',
      note: `${Math.round((singleLine.length / (trains.length || 1)) * 100)}% of board on single line`,
      tone: 'default',
      meter: (singleLine.length / (trains.length || 1)) * 100,
    },
  ];

  const lateShown = filtered.filter((entry) => entry.late).length;

  return (
    <div className={PAGE}>
      <PageHeader eyebrow="Dispatch desk · Howrah–Burdwan main line" title="Operations" live>
        <span className={tag('info')}>RF risk · feature-weighted</span>
        <span className={`${tag('muted')} hidden sm:inline-flex`}>Feed {istTime}</span>
        <button
          type="button"
          onClick={() => addToast('Live feed synced', 'success')}
          className="flex items-center gap-1.5 border border-[rgba(15,44,92,0.16)] dark:border-white/12 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#0F2C5C] dark:text-gray-300 hover:bg-[#0F2C5C]/[0.04] dark:hover:bg-white/5 transition-colors"
          title="Sync live telemetry"
        >
          <RefreshCw className="h-3 w-3" />
          Sync
        </button>
      </PageHeader>

      <KpiRail items={kpis} />

      <Panel
        title="Movement register"
        meta={`${filtered.length} of ${trains.length} rakes · risk-ranked`}
        action={
          <span className={tag(lateShown > 0 ? 'danger' : 'positive')}>
            {lateShown} late
          </span>
        }
      >
        {/* Control strip */}
        <div className="flex flex-col gap-2 border-b border-[rgba(15,44,92,0.10)] dark:border-white/10 px-4 py-2.5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8C95A6] dark:text-gray-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by train no, name or destination"
              aria-label="Filter movements"
              className={`${FIELD} mt-0 w-full py-1.5 pl-8 pr-2.5`}
            />
          </div>

          <select
            value={section}
            onChange={(event) => setSection(event.target.value)}
            aria-label="Filter by section"
            className={`${FIELD} mt-0 py-1.5 lg:w-40`}
          >
            <option value="ALL">All sections</option>
            {SECTIONS.map((meta) => (
              <option key={meta.id} value={meta.id}>
                {meta.id}
              </option>
            ))}
          </select>

          <div className="flex items-stretch border border-[rgba(15,44,92,0.14)] dark:border-white/10 self-start lg:self-auto">
            {FOCUS_OPTIONS.map((option, index) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFocus(option.id)}
                aria-pressed={focus === option.id}
                className={`px-2.5 py-[5px] font-mono text-[9px] uppercase tracking-wider transition-colors ${
                  index > 0 ? 'border-l border-[rgba(15,44,92,0.14)] dark:border-white/10' : ''
                } ${
                  focus === option.id
                    ? 'bg-[#0F2C5C] text-white dark:bg-sky-500 dark:text-slate-950'
                    : 'text-[#5B6478] hover:text-[#0F2C5C] dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 self-start font-mono text-[9px] uppercase tracking-[0.14em] text-[#2F5FD1] dark:text-sky-400 hover:text-[#0F2C5C] dark:hover:text-white transition-colors lg:self-auto"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className={THEAD}>
                <th scope="col" className="w-10 py-2.5 px-3 font-medium">#</th>
                <th scope="col" className="py-2.5 px-3 font-medium">Train</th>
                <th scope="col" className="py-2.5 px-3 font-medium">Type</th>
                <th scope="col" className="py-2.5 px-3 font-medium">Section</th>
                <th scope="col" className="py-2.5 px-3 font-medium">Status</th>
                <th scope="col" className="py-2.5 px-3 font-medium">Delay</th>
                <th scope="col" className="py-2.5 px-3 font-medium">ML risk</th>
                <th scope="col" className="py-2.5 px-3 font-medium">Track</th>
                <th scope="col" className="py-2.5 px-3 font-medium">Departure</th>
                <th scope="col" className="py-2.5 px-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#8C95A6] dark:text-gray-500"
                  >
                    No rakes match this filter ·{' '}
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-[#2F5FD1] dark:text-sky-400 hover:underline"
                    >
                      clear
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map(({ train, risk, late }, index) => {
                  const menuOpen = activeMenuTrain === train.trainNo;
                  const openUp = index >= filtered.length - 4;
                  const delay = train.delayMinutes ?? 0;

                  return (
                    <tr
                      key={train.trainNo}
                      onClick={() => {
                        setSelectedTrain(train);
                        addToast(`Accessing telemetry for ${train.trainNo}`, 'info');
                      }}
                      className={`group cursor-pointer ${TROW}`}
                    >
                      <td className="py-2.5 px-3 font-mono text-[9px] tabular-nums text-[#8C95A6] dark:text-gray-500">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-[11.5px] font-semibold leading-tight tabular-nums text-[#0F2C5C] dark:text-white">
                          {train.trainNo}
                        </div>
                        <div className="max-w-[180px] truncate text-[10px] leading-tight text-[#5B6478] dark:text-gray-400">
                          {train.name}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="whitespace-nowrap border border-[rgba(15,44,92,0.12)] dark:border-white/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#5B6478] dark:text-gray-400">
                          {train.trainType ?? 'Service'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10.5px] tabular-nums text-[#0F2C5C] dark:text-gray-200 whitespace-nowrap">
                        {train.sectionId ?? train.location}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <StatusBadge status={train.status} size="sm" />
                      </td>
                      <td
                        className={`py-2.5 px-3 font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap ${
                          late
                            ? 'text-[#C23636] dark:text-red-400'
                            : 'text-[#5B6478] dark:text-gray-400'
                        }`}
                      >
                        {delay > 0 ? `+${delay.toFixed(1)}` : '—'}
                        {delay > 0 ? (
                          <span className="ml-0.5 text-[8px] font-normal">MIN</span>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <RiskTag risk={risk} />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10.5px] whitespace-nowrap text-[#0F2C5C] dark:text-gray-300">
                        {train.trackType ?? '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10.5px] tabular-nums whitespace-nowrap text-[#0F2C5C] dark:text-gray-300">
                        {train.scheduledDeparture?.slice(0, 5) ?? '—'}
                      </td>
                      <td
                        className="relative py-2.5 px-3 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          aria-label={`Dispatch actions for ${train.trainNo}`}
                          aria-expanded={menuOpen}
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveMenuTrain(menuOpen ? null : train.trainNo);
                          }}
                          className="p-1 text-[#5B6478] dark:text-gray-400 hover:text-[#0F2C5C] dark:hover:text-white hover:bg-[#0F2C5C]/[0.06] dark:hover:bg-white/10 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {menuOpen ? (
                          <div
                            className={`absolute right-3 z-30 w-52 border border-[rgba(15,44,92,0.15)] dark:border-white/12 bg-white dark:bg-[#0C1424] py-1 text-left ${
                              openUp ? 'bottom-full mb-1' : 'top-full mt-1'
                            }`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10">
                              Dispatch override
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                updateTrainStatus(train.trainNo, 'ON TIME', '—');
                                addToast(`Dispatched override: ${train.trainNo} is Clear`, 'success');
                                setActiveMenuTrain(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-[11px] font-medium text-[#1E7F4F] dark:text-emerald-400 hover:bg-[#F6F8FB] dark:hover:bg-white/[0.06] transition-colors"
                            >
                              Set clear / on time
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateTrainStatus(train.trainNo, 'DELAYED', '+15 min');
                                addToast(`Flagged delay for ${train.trainNo}`, 'warning');
                                setActiveMenuTrain(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-[11px] font-medium text-[#C23636] dark:text-red-400 hover:bg-[#F6F8FB] dark:hover:bg-white/[0.06] transition-colors"
                            >
                              Flag delay (+15m)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTrain(train);
                                addToast(`Viewing telemetry for ${train.trainNo}`, 'info');
                                setActiveMenuTrain(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-[11px] text-[#0F2C5C] dark:text-gray-200 hover:bg-[#F6F8FB] dark:hover:bg-white/[0.06] transition-colors"
                            >
                              View telemetry
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[rgba(15,44,92,0.10)] dark:border-white/10 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
          <span>
            Showing {filtered.length} of {trains.length} rakes
          </span>
          <span className="text-[#8C95A6] dark:text-gray-500">
            {DELAY_THRESHOLD_MIN} min late threshold · ranked by ML risk
          </span>
        </div>
      </Panel>

      {/* Telemetry sheet */}
      {selectedTrain ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F2C5C]/25 dark:bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedTrain(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Telemetry for ${selectedTrain.trainNo}`}
            className="w-full max-w-lg border border-[rgba(15,44,92,0.16)] dark:border-white/12 bg-white dark:bg-[#0C1424]"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-[rgba(15,44,92,0.10)] dark:border-white/10 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-mono text-[16px] font-semibold tabular-nums text-[#0F2C5C] dark:text-white">
                    {selectedTrain.trainNo}
                  </span>
                  <span className="text-[11px] font-medium text-[#5B6478] dark:text-gray-300">
                    {selectedTrain.trainType} · Priority {selectedTrain.priorityLevel}
                  </span>
                </div>
                <p className="mt-1 truncate font-mono text-[10px] text-[#5B6478] dark:text-gray-400">
                  {selectedTrain.sectionId ?? selectedTrain.location} · {selectedTrain.destination}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={selectedTrain.status} size="sm" />
                <button
                  type="button"
                  onClick={() => setSelectedTrain(null)}
                  aria-label="Close telemetry"
                  className="p-1 text-[#5B6478] dark:text-gray-400 hover:text-[#0F2C5C] dark:hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[rgba(15,44,92,0.10)] dark:bg-white/10 border-b border-[rgba(15,44,92,0.10)] dark:border-white/10">
              <Readout label="Track" value={selectedTrain.trackType || '—'} />
              <Readout
                label="Current delay"
                value={selectedTrain.delay}
                tone={isLate(selectedTrain) ? 'danger' : 'positive'}
              />
              <Readout label="Platform" value={selectedTrain.platform || '—'} />
              <Readout label="Sched. arrival" value={selectedTrain.scheduledArrival || '—'} />
              <Readout label="Upstream delay" value={`${selectedTrain.upstreamDelayMin ?? 0} min`} />
              <Readout label="Time of day" value={selectedTrain.timeOfDayBucket || '—'} />
            </div>

            <div className="divide-y divide-[rgba(15,44,92,0.10)] dark:divide-white/10">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
                    ML delay risk
                  </div>
                  <div className="mt-0.5 text-[10px] text-[#8C95A6] dark:text-gray-500">
                    RandomForest · feature-weighted proxy
                  </div>
                </div>
                <RiskTag risk={computeDelayRisk(selectedTrain)} />
              </div>

              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
                  Section congestion
                </span>
                <span className="font-mono text-[13px] font-semibold tabular-nums text-[#C23636] dark:text-red-400">
                  {((selectedTrain.sectionCongestionLevel ?? 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-[rgba(15,44,92,0.10)] dark:border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={() => setSelectedTrain(null)}
                className="border border-[rgba(15,44,92,0.16)] dark:border-white/12 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-300 hover:bg-[#F6F8FB] dark:hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  updateTrainStatus(selectedTrain.trainNo, 'ON TIME', '—');
                  addToast(
                    `Track cleared and schedule resolved for ${selectedTrain.trainNo}`,
                    'success'
                  );
                  setSelectedTrain(null);
                }}
                className="bg-[#0F2C5C] dark:bg-sky-500 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white dark:text-slate-950 hover:bg-[#2F5FD1] dark:hover:bg-sky-400 transition-colors"
              >
                Resolve &amp; clear track
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
};
