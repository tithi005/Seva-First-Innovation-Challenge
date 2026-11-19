import React, { useState } from 'react';
import type { Train } from '../types';
import { useSystem } from '../context/SystemContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Panel } from '../components/dashboard/Panel';
import { KpiRail } from '../components/dashboard/KpiRail';
import type { KpiItem } from '../components/dashboard/KpiRail';
import { PageHeader } from '../components/dashboard/PageHeader';
import { RouteMap } from '../components/dashboard/RouteMap';
import type { NetworkSelection } from '../components/dashboard/RouteMap';
import {
  LEVEL,
  SECTIONS,
  STATIONS,
  STATION_NAMES,
  levelOf,
} from '../components/dashboard/corridor';
import { DELAY_THRESHOLD_MIN, isLate } from '../components/dashboard/metrics';
import { PAGE, SECTION_LABEL, THEAD, TROW, tag } from '../components/dashboard/theme';

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

/** Mean measured delay rate across all block sections. */
const SECTION_MEAN_RATE = mean(SECTIONS.map((section) => section.delayRate));

const levelTag = (rate: number) => {
  const level = levelOf(rate);
  return tag(level === 'restricted' ? 'danger' : level === 'caution' ? 'caution' : 'positive');
};

/** Small divided readout strip that matches the KPI rail. */
const StatStrip = ({
  cells,
}: {
  cells: Array<{ label: string; value: string; unit?: string; tone?: 'default' | 'positive' | 'caution' | 'danger' }>;
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[rgba(15,44,92,0.10)] dark:bg-white/10 border-b border-[rgba(15,44,92,0.10)] dark:border-white/10">
    {cells.map((cell) => (
      <div key={cell.label} className="bg-white dark:bg-[#0C1424] px-3 py-2.5 min-w-0">
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400 truncate">
          {cell.label}
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span
            className={`font-mono text-[17px] leading-none font-semibold tabular-nums ${
              cell.tone === 'danger'
                ? 'text-[#C23636] dark:text-red-400'
                : cell.tone === 'caution'
                  ? 'text-[#B9790A] dark:text-amber-400'
                  : cell.tone === 'positive'
                    ? 'text-[#1E7F4F] dark:text-emerald-400'
                    : 'text-[#0F2C5C] dark:text-white'
            }`}
          >
            {cell.value}
          </span>
          {cell.unit ? (
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#5B6478] dark:text-gray-400">
              {cell.unit}
            </span>
          ) : null}
        </div>
      </div>
    ))}
  </div>
);

/* ── Station inspector ────────────────────────────────────────────────────── */

const StationInspector = ({
  code,
  trains,
  onSelect,
}: {
  code: string;
  trains: Train[];
  onSelect: (next: NetworkSelection) => void;
}) => {
  const here = trains.filter((t) => t.location === code);
  const late = here.filter(isLate);
  const platforms = [...new Set(here.map((t) => t.platform).filter(Boolean))].sort();
  const avgLate = mean(late.map((t) => t.delayMinutes ?? 0));
  const index = STATIONS.indexOf(code);
  const upstream = index > 0 ? SECTIONS[index - 1] : null;
  const downstream = index < SECTIONS.length ? SECTIONS[index] : null;
  const rows = [...here]
    .sort((a, b) => (b.delayMinutes ?? 0) - (a.delayMinutes ?? 0))
    .slice(0, 6);

  const tone = late.length === 0 ? 'positive' : late.length > 2 ? 'danger' : 'caution';
  const label = late.length === 0 ? 'Clear' : late.length > 2 ? 'Congested' : 'Busy';

  return (
    <Panel
      title={`Station · ${code}`}
      meta={STATION_NAMES[code]}
      action={<span className={tag(tone)}>{label}</span>}
    >
      <StatStrip
        cells={[
          { label: 'Rakes held', value: String(here.length) },
          { label: 'Running late', value: String(late.length), tone: late.length ? 'danger' : 'positive' },
          { label: 'Platforms in use', value: platforms.length ? platforms.join(' ') : '—' },
          {
            label: 'Mean delay · late',
            value: late.length ? avgLate.toFixed(1) : '0.0',
            unit: 'min',
            tone: late.length ? 'caution' : 'positive',
          },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-[rgba(15,44,92,0.10)] dark:border-white/10 divide-y sm:divide-y-0 sm:divide-x divide-[rgba(15,44,92,0.10)] dark:divide-white/10">
        {[
          { section: upstream, direction: 'Upstream' },
          { section: downstream, direction: 'Downstream' },
        ].map(({ section, direction }) =>
          section ? (
            <button
              key={direction}
              type="button"
              onClick={() => onSelect({ kind: 'section', id: section.id })}
              className="flex items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-[#F6F8FB] dark:hover:bg-white/[0.03]"
            >
              <span className="min-w-0">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
                  {direction}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] font-semibold text-[#0F2C5C] dark:text-gray-200">
                  {section.id}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className={`font-mono text-[11px] font-semibold tabular-nums ${LEVEL[levelOf(section.delayRate)].text}`}>
                  {section.delayRate.toFixed(1)}%
                </span>
                <span className={levelTag(section.delayRate)}>{LEVEL[levelOf(section.delayRate)].label}</span>
              </span>
            </button>
          ) : (
            <div
              key={direction}
              className="flex items-center justify-between gap-2 px-4 py-2.5 text-[#8C95A6] dark:text-gray-500"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.14em]">{direction}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em]">Terminus</span>
            </div>
          )
        )}
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={THEAD}>
                <th className="py-2 px-3 font-medium whitespace-nowrap">Train</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">Type</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">Status</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">Delay</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">Plat</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">ETD</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((train) => (
                <tr key={train.trainNo} className={TROW}>
                  <td className="py-2 px-3 font-mono text-[11px] font-semibold text-[#0F2C5C] dark:text-white whitespace-nowrap">
                    {train.trainNo}
                  </td>
                  <td className="py-2 px-3 text-[10px] text-[#5B6478] dark:text-gray-400 whitespace-nowrap">
                    {train.trainType ?? '—'}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <StatusBadge status={train.status} size="sm" />
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] tabular-nums whitespace-nowrap">
                    <span
                      className={
                        isLate(train)
                          ? 'font-semibold text-[#C23636] dark:text-red-400'
                          : 'text-[#5B6478] dark:text-gray-400'
                      }
                    >
                      {train.delay}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-[#0F2C5C] dark:text-gray-300 whitespace-nowrap">
                    {train.platform || '—'}
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] tabular-nums text-[#0F2C5C] dark:text-gray-300 whitespace-nowrap">
                    {train.etd || train.scheduledDeparture || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5B6478] dark:text-gray-400">
            No rakes held
          </div>
          <p className="mx-auto mt-2 max-w-xs text-[11px] leading-relaxed text-[#8C95A6] dark:text-gray-500">
            {code === 'PAN'
              ? 'Panagarh is the eastern terminus — trains are discharged here and re-formed for the return working.'
              : `No live trains are standing at ${STATION_NAMES[code]} on this feed.`}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(15,44,92,0.10)] dark:border-white/10 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
        <span>{DELAY_THRESHOLD_MIN} min late threshold</span>
        <span className="text-[#8C95A6] dark:text-gray-500">
          Block: {downstream ? downstream.id : upstream ? upstream.id : '—'}
        </span>
      </div>
    </Panel>
  );
};

/* ── Section inspector ────────────────────────────────────────────────────── */

const SectionInspector = ({ id, trains }: { id: string; trains: Train[] }) => {
  const section = SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
  const level = LEVEL[levelOf(section.delayRate)];
  const onSection = trains.filter((t) => t.sectionId === section.id);
  const late = onSection.filter(isLate);
  const rows = [...onSection].sort((a, b) => (b.delayMinutes ?? 0) - (a.delayMinutes ?? 0));

  return (
    <Panel
      title={`Section · ${section.id}`}
      meta={`${STATION_NAMES[section.from]} → ${STATION_NAMES[section.to]}`}
      action={<span className={levelTag(section.delayRate)}>{level.label}</span>}
    >
      <StatStrip
        cells={[
          {
            label: 'Measured delay rate',
            value: section.delayRate.toFixed(1),
            unit: '%',
            tone: levelOf(section.delayRate) === 'restricted' ? 'danger' : 'caution',
          },
          { label: 'Mean delay · late', value: section.avgLate.toFixed(1), unit: 'min', tone: 'caution' },
          { label: 'Trains on block', value: String(onSection.length) },
          { label: 'Running late', value: String(late.length), tone: late.length ? 'danger' : 'positive' },
        ]}
      />

      <div className="px-4 py-3 border-b border-[rgba(15,44,92,0.10)] dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
            Delay rate against the 8-section average
          </span>
          <span className={`font-mono text-[10px] font-semibold tabular-nums ${level.text}`}>
            {section.delayRate.toFixed(1)}% / {SECTION_MEAN_RATE.toFixed(1)}%
          </span>
        </div>
        <div className="relative mt-2 h-[3px] w-full bg-[rgba(15,44,92,0.08)] dark:bg-white/10">
          <div className={`h-full ${level.bar}`} style={{ width: `${section.delayRate}%` }} />
          <span
            className="absolute -top-[3px] h-[9px] w-px bg-[#0F2C5C]/50 dark:bg-white/50"
            style={{ left: `${SECTION_MEAN_RATE}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-[#8C95A6] dark:text-gray-500">
          <span>0%</span>
          <span>dataset mean</span>
          <span>100%</span>
        </div>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={THEAD}>
                <th className="py-2 px-3 font-medium whitespace-nowrap">Train</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">Type</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">Destination</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">Status</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">Delay</th>
                <th className="py-2 px-3 font-medium whitespace-nowrap">Speed</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((train) => (
                <tr key={train.trainNo} className={TROW}>
                  <td className="py-2 px-3 font-mono text-[11px] font-semibold text-[#0F2C5C] dark:text-white whitespace-nowrap">
                    {train.trainNo}
                  </td>
                  <td className="py-2 px-3 text-[10px] text-[#5B6478] dark:text-gray-400 whitespace-nowrap">
                    {train.trainType ?? '—'}
                  </td>
                  <td className="py-2 px-3 text-[10px] text-[#0F2C5C] dark:text-gray-300 whitespace-nowrap">
                    {train.destination}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <StatusBadge status={train.status} size="sm" />
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] tabular-nums whitespace-nowrap">
                    <span
                      className={
                        isLate(train)
                          ? 'font-semibold text-[#C23636] dark:text-red-400'
                          : 'text-[#5B6478] dark:text-gray-400'
                      }
                    >
                      {train.delay}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] tabular-nums text-[#5B6478] dark:text-gray-400 whitespace-nowrap">
                    {train.speed ? `${train.speed} km/h` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 py-8 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[#5B6478] dark:text-gray-400">
          Block currently clear
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(15,44,92,0.10)] dark:border-white/10 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
        <span>{onSection.length - late.length} on time · {late.length} late</span>
        <span className="text-[#8C95A6] dark:text-gray-500">Mean when late {section.avgLate.toFixed(1)} min</span>
      </div>
    </Panel>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────── */

export const Network: React.FC = () => {
  const { corridors, trains } = useSystem();
  const [selection, setSelection] = useState<NetworkSelection>({ kind: 'station', id: 'HWH' });

  const lateTrains = trains.filter(isLate);
  const approaching = trains.filter((t) => t.status === 'APPROACHING').length;
  const reportingStations = STATIONS.filter((code) => trains.some((t) => t.location === code));
  const platformsInUse = new Set(
    trains.map((t) => `${t.location}-${t.platform}`).filter((key) => !key.endsWith('-'))
  ).size;
  const avgLate = mean(lateTrains.map((t) => t.delayMinutes ?? 0));
  const corridorLoad = mean(corridors.map((c) => c.load));
  const peakLoad = corridors.reduce((max, c) => Math.max(max, c.load), 0);
  const worstSection = SECTIONS.reduce((a, b) => (b.delayRate > a.delayRate ? b : a));
  const worstLive = trains.filter((t) => t.sectionId === worstSection.id).filter(isLate).length;

  const kpis: KpiItem[] = [
    {
      id: 'on-line',
      label: 'Trains on line',
      value: String(trains.length),
      unit: 'rakes',
      note: `${lateTrains.length} past ${DELAY_THRESHOLD_MIN} min · ${approaching} approaching`,
      tone: 'default',
    },
    {
      id: 'stations',
      label: 'Stations reporting',
      value: `${reportingStations.length}/${STATIONS.length}`,
      note: `PAN terminus · ${platformsInUse} berths in use`,
      tone: 'default',
      meter: (reportingStations.length / STATIONS.length) * 100,
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
      id: 'load',
      label: 'Corridor load',
      value: String(Math.round(corridorLoad)),
      unit: '%',
      note: `Peak ${peakLoad}% · ${corridors.length} corridors`,
      tone: peakLoad >= 90 ? 'danger' : 'caution',
      meter: corridorLoad,
      threshold: 85,
    },
    {
      id: 'worst',
      label: 'Hardest section',
      value: worstSection.delayRate.toFixed(1),
      unit: '%',
      note: `${worstSection.id} · ${worstLive} late now`,
      tone: 'danger',
      meter: worstSection.delayRate,
      threshold: 50,
    },
  ];

  return (
    <div className={PAGE}>
      <PageHeader eyebrow="Topology · Howrah–Burdwan main line" title="Network" live>
        <span className={tag('muted')}>{STATIONS.length} stations</span>
        <span className={tag('muted')}>{SECTIONS.length} block sections</span>
        <span className={tag('positive')}>{trains.length} rakes reporting</span>
      </PageHeader>

      <KpiRail items={kpis} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Panel title="Route diagram" meta="HWH → PAN">
            <RouteMap trains={trains} selection={selection} onSelect={setSelection} />
          </Panel>
        </div>

        <div className="lg:col-span-7">
          {selection.kind === 'station' ? (
            <StationInspector code={selection.id} trains={trains} onSelect={setSelection} />
          ) : (
            <SectionInspector id={selection.id} trains={trains} />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className={SECTION_LABEL}>
          <span className="w-[3px] h-3 bg-[#2F5FD1] dark:bg-sky-400" aria-hidden="true" />
          Section delay profile · measured over 50,000 journeys
        </div>

        <Panel title="Sections" meta="ranked by delay rate" bodyClassName="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={THEAD}>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Section</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Between</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Delay rate</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Mean when late</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">On block</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Aspect</th>
              </tr>
            </thead>
            <tbody>
              {[...SECTIONS]
                .sort((a, b) => b.delayRate - a.delayRate)
                .map((section) => {
                  const level = LEVEL[levelOf(section.delayRate)];
                  const onSection = trains.filter((t) => t.sectionId === section.id);
                  const liveLate = onSection.filter(isLate).length;
                  return (
                    <tr
                      key={section.id}
                      className={`${TROW} cursor-pointer`}
                      onClick={() => setSelection({ kind: 'section', id: section.id })}
                    >
                      <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-[#0F2C5C] dark:text-white whitespace-nowrap">
                        {section.id}
                      </td>
                      <td className="py-2.5 px-4 text-[10px] text-[#5B6478] dark:text-gray-400 whitespace-nowrap">
                        {STATION_NAMES[section.from]} → {STATION_NAMES[section.to]}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-[3px] w-20 bg-[rgba(15,44,92,0.08)] dark:bg-white/10">
                            <div className={`h-full ${level.bar}`} style={{ width: `${section.delayRate}%` }} />
                          </div>
                          <span className={`font-mono text-[11px] font-semibold tabular-nums ${level.text}`}>
                            {section.delayRate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] tabular-nums text-[#0F2C5C] dark:text-gray-300 whitespace-nowrap">
                        {section.avgLate.toFixed(1)} min
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] tabular-nums whitespace-nowrap">
                        <span className="text-[#0F2C5C] dark:text-gray-300">{onSection.length} trn</span>
                        {liveLate > 0 ? (
                          <span className="ml-1.5 text-[#C23636] dark:text-red-400">· {liveLate} late</span>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={levelTag(section.delayRate)}>{level.label}</span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="space-y-3">
        <div className={SECTION_LABEL}>
          <span className="w-[3px] h-3 bg-[#2F5FD1] dark:bg-sky-400" aria-hidden="true" />
          Corridor allocation
        </div>

        <Panel title="Route capacity" meta="live load vs tracks" bodyClassName="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={THEAD}>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Corridor</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Tracks</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Load</th>
                <th className="py-2.5 px-4 font-medium whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...corridors]
                .sort((a, b) => b.load - a.load)
                .map((corridor) => (
                  <tr key={corridor.id} className={TROW}>
                    <td className="py-2.5 px-4 text-[11px] text-[#0F2C5C] dark:text-gray-200 whitespace-nowrap">
                      {corridor.name}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] tabular-nums text-[#5B6478] dark:text-gray-400 whitespace-nowrap">
                      {corridor.tracks}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-[3px] w-24 bg-[rgba(15,44,92,0.08)] dark:bg-white/10">
                          <div
                            className={`h-full ${
                              corridor.load >= 85
                                ? 'bg-[#C23636] dark:bg-red-400'
                                : corridor.load >= 60
                                  ? 'bg-[#B9790A] dark:bg-amber-400'
                                  : 'bg-[#1E7F4F] dark:bg-emerald-400'
                            }`}
                            style={{ width: `${corridor.load}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-semibold tabular-nums text-[#0F2C5C] dark:text-white">
                          {corridor.load}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <StatusBadge status={corridor.status} size="sm" />
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
