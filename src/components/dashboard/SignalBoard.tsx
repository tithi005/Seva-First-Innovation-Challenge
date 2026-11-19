import type { Train } from '../../types';
import { Panel } from './Panel';
import { isLate } from './metrics';

import { LEVEL, SECTIONS, STATIONS, levelOf } from './corridor';
import type { Level } from './corridor';

const Legend = () => (
  <div className="hidden md:flex items-center gap-3">
    {(['clear', 'caution', 'restricted'] as Level[]).map((level) => (
      <span
        key={level}
        className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#5B6478] dark:text-gray-400"
      >
        <span className={`w-3 h-[3px] ${LEVEL[level].bar}`} aria-hidden="true" />
        {LEVEL[level].label}
      </span>
    ))}
  </div>
);

const Readout = ({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'danger';
}) => (
  <div className="flex items-baseline gap-2">
    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-500">
      {label}
    </span>
    <span
      className={`font-mono text-[11px] font-semibold tabular-nums ${
        tone === 'danger' ? 'text-[#C23636] dark:text-red-400' : 'text-[#0F2C5C] dark:text-gray-200'
      }`}
    >
      {value}
    </span>
  </div>
);

interface SignalBoardProps {
  trains: Train[];
  updatedAt: string;
}

export const SignalBoard = ({ trains, updatedAt }: SignalBoardProps) => {
  const sections = SECTIONS.map((section) => {
    const onSection = trains.filter((t) => t.sectionId === section.id);
    return {
      ...section,
      trains: onSection,
      delayed: onSection.filter(isLate).length,
    };
  });

  const totalTrains = sections.reduce((sum, s) => sum + s.trains.length, 0);
  const avgRate = sections.reduce((sum, s) => sum + s.delayRate, 0) / sections.length;
  const worst = sections.reduce((a, b) => (b.delayRate > a.delayRate ? b : a));

  return (
    <Panel
      title="Corridor Signal Diagram"
      meta={`${sections.length} sections · ${totalTrains} trains on line`}
      action={<Legend />}
    >
      <div className="overflow-x-auto px-5 pt-4 pb-5 bg-[radial-gradient(circle_at_center,rgba(15,44,92,0.055)_1px,transparent_1px)] bg-[length:16px_16px] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)]">
        <div className="min-w-[620px]">
          {/* Section designations */}
          <div className="flex">
            {sections.map((section) => (
              <div key={section.id} className="flex-1 text-center">
                <span
                  className={`font-mono text-[9px] uppercase tracking-[0.12em] ${
                    section.id === worst.id
                      ? 'text-[#C23636] dark:text-red-400 font-bold'
                      : 'text-[#5B6478] dark:text-gray-400'
                  }`}
                >
                  {section.id}
                </span>
              </div>
            ))}
          </div>

          {/* Rail band with live train ticks */}
          <div className="relative mt-2 h-12">
            <div
              className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[rgba(15,44,92,0.15)] dark:bg-white/10"
              aria-hidden="true"
            />
            <div className="absolute inset-0 flex">
              {sections.map((section) => {
                const level = LEVEL[levelOf(section.delayRate)];
                const count = Math.max(1, section.trains.length);
                return (
                  <div key={section.id} className="relative flex-1 group">
                    <div
                      className={`absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 transition-opacity group-hover:opacity-80 ${level.bar}`}
                      aria-hidden="true"
                    />
                    {section.trains.slice(0, 9).map((train, index) => {
                      const late = isLate(train);
                      return (
                        <span
                          key={train.trainNo}
                          title={`${train.trainNo} · ${train.name} · ${
                            late ? `+${train.delayMinutes?.toFixed(1)} min` : 'on time'
                          } · ${train.speed ?? '—'} km/h`}
                          className={`absolute top-[calc(50%-14px)] h-[9px] w-[2px] ${
                            late
                              ? 'bg-[#C23636] dark:bg-red-400'
                              : 'bg-[#0F2C5C]/45 dark:bg-white/55'
                          }`}
                          style={{ left: `${((index + 0.5) / count) * 100}%` }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Station nodes */}
            {STATIONS.map((station, index) => {
              const left = (index / (STATIONS.length - 1)) * 100;
              const terminus = index === 0 || index === STATIONS.length - 1;
              return (
                <div
                  key={station}
                  className="absolute top-1/2"
                  style={{
                    left: `${left}%`,
                    transform: `translate(${
                      index === 0 ? '0' : index === STATIONS.length - 1 ? '-100%' : '-50%'
                    }, -50%)`,
                  }}
                >
                  <span
                    className={`block w-[7px] h-[7px] rotate-45 border ${
                      terminus
                        ? 'bg-[#0F2C5C] border-[#0F2C5C] dark:bg-white dark:border-white'
                        : 'bg-white border-[#0F2C5C]/45 dark:bg-[#0C1424] dark:border-white/40'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Station codes */}
          <div className="relative h-4 mt-1">
            {STATIONS.map((station, index) => {
              const left = (index / (STATIONS.length - 1)) * 100;
              return (
                <span
                  key={station}
                  className="absolute font-mono text-[9px] tracking-wide text-[#8C95A6] dark:text-gray-500"
                  style={{
                    left: `${left}%`,
                    transform: `translateX(${
                      index === 0 ? '0' : index === STATIONS.length - 1 ? '-100%' : '-50%'
                    })`,
                  }}
                >
                  {station}
                </span>
              );
            })}
          </div>

          {/* Per-section measured delay rate */}
          <div className="flex mt-3 pt-3 border-t border-[rgba(15,44,92,0.08)] dark:border-white/5">
            {sections.map((section) => {
              const level = LEVEL[levelOf(section.delayRate)];
              return (
                <div key={section.id} className="flex-1 text-center">
                  <div className={`font-mono text-[15px] font-semibold leading-none tabular-nums ${level.text}`}>
                    {section.delayRate.toFixed(1)}
                    <span className="text-[9px] font-normal ml-0.5">%</span>
                  </div>
                  <div className="mt-1.5 font-mono text-[8.5px] uppercase tracking-wider text-[#5B6478] dark:text-gray-400">
                    {section.trains.length} trn
                  </div>
                  <div className="font-mono text-[8.5px] uppercase tracking-wider">
                    {section.delayed > 0 ? (
                      <span className="text-[#C23636] dark:text-red-400">{section.delayed} late</span>
                    ) : (
                      <span className="text-[#1E7F4F] dark:text-emerald-400">clear</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-[rgba(15,44,92,0.10)] dark:border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Readout label="On line" value={`${totalTrains} trains`} />
          <Readout label="Avg section delay" value={`${avgRate.toFixed(1)}%`} />
          <Readout
            label="Bottleneck"
            value={`${worst.id} · ${worst.delayRate.toFixed(1)}%`}
            tone="danger"
          />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5B6478] dark:text-gray-500">
          Updated {updatedAt}
        </span>
      </div>
    </Panel>
  );
};
