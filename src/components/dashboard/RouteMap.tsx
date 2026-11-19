import { Fragment } from 'react';
import type { Train } from '../../types';
import { isLate } from './metrics';
import { LEVEL, SECTIONS, STATIONS, STATION_NAMES, levelOf } from './corridor';

export interface NetworkSelection {
  kind: 'station' | 'section';
  id: string;
}

interface RouteMapProps {
  trains: Train[];
  selection: NetworkSelection;
  onSelect: (next: NetworkSelection) => void;
}

const Legend = () => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 border-b border-[rgba(15,44,92,0.10)] dark:border-white/10">
    {(['clear', 'caution', 'restricted'] as const).map((level) => (
      <span
        key={level}
        className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#5B6478] dark:text-gray-400"
      >
        <span className={`h-[3px] w-3 ${LEVEL[level].bar}`} aria-hidden="true" />
        {LEVEL[level].label}
      </span>
    ))}
    <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#5B6478] dark:text-gray-400">
      <span className="h-[9px] w-[2px] bg-[#C23636] dark:bg-red-400" aria-hidden="true" />
      late
    </span>
  </div>
);

/**
 * Vertical route diagram for the Howrah–Burdwan corridor.
 *
 * Stations are nodes in route order; the connector between two stations is the
 * section, coloured by its measured delay rate. Live trains appear as ticks on
 * the section they are currently occupying.
 */
export const RouteMap = ({ trains, selection, onSelect }: RouteMapProps) => {
  const atStation = (code: string) => trains.filter((t) => t.location === code);

  return (
    <div>
      <Legend />

      <ol className="relative px-4 py-3">
        {/* Continuous rail behind the nodes */}
        <span
          className="absolute left-6 top-8 bottom-8 w-px -translate-x-1/2 bg-[rgba(15,44,92,0.16)] dark:bg-white/12"
          aria-hidden="true"
        />

        {STATIONS.map((code, index) => {
          const section = SECTIONS[index];
          const here = atStation(code);
          const lateHere = here.filter(isLate).length;
          const stationSelected = selection.kind === 'station' && selection.id === code;
          const sectionSelected =
            section && selection.kind === 'section' && selection.id === section.id;
          const sectionTrains = section ? trains.filter((t) => t.sectionId === section.id) : [];
          const sectionLate = sectionTrains.filter(isLate).length;
          const level = section ? LEVEL[levelOf(section.delayRate)] : null;
          const terminus = index === 0 || index === STATIONS.length - 1;

          return (
            <Fragment key={code}>
              <li>
                <button
                  type="button"
                  aria-pressed={stationSelected}
                  onClick={() => onSelect({ kind: 'station', id: code })}
                  className={`relative flex w-full items-center gap-3 px-1 -mx-1 py-1.5 text-left transition-colors ${
                    stationSelected
                      ? 'bg-[#2F5FD1]/[0.07] dark:bg-sky-400/[0.09]'
                      : 'hover:bg-[#F6F8FB] dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center">
                    <span
                      className={`block h-[9px] w-[9px] rotate-45 border ${
                        stationSelected
                          ? 'bg-[#2F5FD1] border-[#2F5FD1] dark:bg-sky-400 dark:border-sky-400'
                          : terminus
                            ? 'bg-[#0F2C5C] border-[#0F2C5C] dark:bg-white dark:border-white'
                            : 'bg-white border-[#0F2C5C]/45 dark:bg-[#0C1424] dark:border-white/35'
                      }`}
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono text-[11px] font-semibold text-[#0F2C5C] dark:text-gray-100">
                        {code}
                      </span>
                      <span className="truncate text-[10px] text-[#5B6478] dark:text-gray-400">
                        {STATION_NAMES[code]}
                      </span>
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="font-mono text-[11px] tabular-nums text-[#0F2C5C] dark:text-gray-200">
                      {here.length}
                    </span>
                    <span className="ml-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8C95A6] dark:text-gray-500">
                      rakes
                    </span>
                    {lateHere > 0 ? (
                      <span className="ml-1.5 font-mono text-[9px] font-semibold tabular-nums text-[#C23636] dark:text-red-400">
                        {lateHere} late
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>

              {section && level ? (
                <li>
                  <button
                    type="button"
                    aria-pressed={sectionSelected}
                    onClick={() => onSelect({ kind: 'section', id: section.id })}
                    className={`flex w-full items-stretch gap-3 px-1 -mx-1 text-left transition-colors ${
                      sectionSelected
                        ? 'bg-[#2F5FD1]/[0.07] dark:bg-sky-400/[0.09]'
                        : 'hover:bg-[#F6F8FB] dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="flex w-4 shrink-0 justify-center">
                      <span
                        className={`${level.bar} transition-all ${
                          sectionSelected ? 'w-[5px]' : 'w-[3px]'
                        }`}
                        aria-hidden="true"
                      />
                    </span>

                    <span className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`font-mono text-[9px] uppercase tracking-[0.12em] ${
                            sectionSelected
                              ? 'font-semibold text-[#0F2C5C] dark:text-white'
                              : 'text-[#5B6478] dark:text-gray-400'
                          }`}
                        >
                          {section.id}
                        </span>

                        <span className="flex items-center gap-[2px]" aria-hidden="true">
                          {sectionTrains.slice(0, 8).map((train) => (
                            <span
                              key={train.trainNo}
                              title={`${train.trainNo} · ${train.name} · ${
                                isLate(train)
                                  ? `+${(train.delayMinutes ?? 0).toFixed(1)} min`
                                  : 'on time'
                              }`}
                              className={`h-[9px] w-[2px] ${
                                isLate(train)
                                  ? 'bg-[#C23636] dark:bg-red-400'
                                  : 'bg-[#0F2C5C]/40 dark:bg-white/45'
                              }`}
                            />
                          ))}
                        </span>
                      </span>

                      <span className="shrink-0 text-right">
                        <span className={`font-mono text-[11px] font-semibold tabular-nums ${level.text}`}>
                          {section.delayRate.toFixed(1)}%
                        </span>
                        <span className="ml-1.5 font-mono text-[9px] tabular-nums text-[#8C95A6] dark:text-gray-500">
                          {sectionTrains.length} trn
                          {sectionLate > 0 ? ` · ${sectionLate} late` : ''}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[rgba(15,44,92,0.10)] dark:border-white/10 px-4 py-2.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
          {STATIONS.length} stations · {SECTIONS.length} block sections
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8C95A6] dark:text-gray-500">
          Select a node or section
        </span>
      </div>
    </div>
  );
};
