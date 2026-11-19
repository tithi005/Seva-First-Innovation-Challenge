import type { Train } from '../../types';
import { Panel } from './Panel';
import { isLate } from './metrics';
import { ArrowRight } from 'lucide-react';

export type MovementFilter = 'ALL' | 'DELAYED' | 'EXPRESS' | 'FREIGHT';

const FILTERS: MovementFilter[] = ['ALL', 'DELAYED', 'EXPRESS', 'FREIGHT'];

interface MovementTableProps {
  trains: Train[];
  filter: MovementFilter;
  onFilterChange: (filter: MovementFilter) => void;
  onRowClick: (train: Train) => void;
  onOpenOperations: () => void;
  totalActive: number;
}

export const MovementTable = ({
  trains,
  filter,
  onFilterChange,
  onRowClick,
  onOpenOperations,
  totalActive,
}: MovementTableProps) => (
  <Panel
    title="Movement Register"
    meta={`${trains.length} shown`}
    action={
      <div className="flex items-stretch border border-[rgba(15,44,92,0.14)] dark:border-white/10">
        {FILTERS.map((option, index) => (
          <button
            key={option}
            type="button"
            onClick={() => onFilterChange(option)}
            aria-pressed={filter === option}
            className={`px-2 py-[3px] font-mono text-[9px] uppercase tracking-wider transition-colors ${
              index > 0 ? 'border-l border-[rgba(15,44,92,0.14)] dark:border-white/10' : ''
            } ${
              filter === option
                ? 'bg-[#0F2C5C] text-white dark:bg-sky-500 dark:text-slate-950'
                : 'text-[#5B6478] hover:text-[#0F2C5C] dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    }
  >
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="bg-[#F7F8FA] dark:bg-white/[0.03]">
            <th scope="col" className="w-10 px-3 py-2 text-left font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
              #
            </th>
            <th scope="col" className="px-2 py-2 text-left font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
              Train
            </th>
            <th scope="col" className="hidden md:table-cell px-2 py-2 text-left font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
              Type
            </th>
            <th scope="col" className="px-2 py-2 text-left font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
              Section
            </th>
            <th scope="col" className="px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
              Sched
            </th>
            <th scope="col" className="px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
              Delay
            </th>
            <th scope="col" className="px-3 py-2 text-left font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-400">
              State
            </th>
          </tr>
        </thead>
        <tbody>
          {trains.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#8C95A6] dark:text-gray-500">
                No movements match this filter
              </td>
            </tr>
          ) : (
            trains.map((train, index) => {
              const delay = train.delayMinutes ?? 0;
              const late = isLate(train);
              return (
                <tr
                  key={train.trainNo}
                  onClick={() => onRowClick(train)}
                  className="group cursor-pointer border-b border-[rgba(15,44,92,0.06)] dark:border-white/5 hover:bg-[#0F2C5C]/[0.025] dark:hover:bg-white/[0.035] transition-colors"
                >
                  <td className="border-l-2 border-transparent group-hover:border-[#2F5FD1] dark:group-hover:border-sky-400 px-3 py-2.5 font-mono text-[9px] tabular-nums text-[#8C95A6] dark:text-gray-500">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="font-mono text-[11.5px] font-bold leading-tight tabular-nums text-[#0F2C5C] dark:text-white">
                      {train.trainNo}
                    </div>
                    <div className="max-w-[170px] truncate text-[10px] leading-tight text-[#5B6478] dark:text-gray-400">
                      {train.name}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-2 py-2.5">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[#5B6478] dark:text-gray-400 border border-[rgba(15,44,92,0.12)] dark:border-white/10 px-1.5 py-0.5">
                      {train.trainType ?? train.priority ?? 'Service'}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 font-mono text-[10px] tabular-nums text-[#0F2C5C] dark:text-gray-200">
                    {train.sectionId ?? train.location}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-[10.5px] tabular-nums text-[#5B6478] dark:text-gray-300">
                    {train.scheduledTime?.slice(0, 5) ?? train.etd?.slice(0, 5) ?? '—'}
                  </td>
                  <td
                    className={`px-2 py-2.5 text-right font-mono text-[11px] font-semibold tabular-nums ${
                      late
                        ? 'text-[#C23636] dark:text-red-400'
                        : 'text-[#5B6478] dark:text-gray-400'
                    }`}
                  >
                    {delay > 0 ? `+${delay.toFixed(1)}` : '—'}
                    {delay > 0 ? <span className="ml-0.5 text-[8px] font-normal">MIN</span> : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`h-[6px] w-[6px] rounded-full ${
                          late
                            ? 'bg-[#C23636] dark:bg-red-400'
                            : 'bg-[#1E7F4F] dark:bg-emerald-400'
                        }`}
                      />
                      <span className="whitespace-nowrap font-mono text-[9px] uppercase tracking-wider text-[#5B6478] dark:text-gray-400">
                        {late ? 'Late' : 'On time'}
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>

    <div className="border-t border-[rgba(15,44,92,0.08)] dark:border-white/5 px-4 py-2.5 flex items-center justify-between">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8C95A6] dark:text-gray-500">
        Showing {trains.length} of {totalActive}
      </span>
      <button
        type="button"
        onClick={onOpenOperations}
        className="group flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#2F5FD1] dark:text-sky-400 hover:text-[#0F2C5C] dark:hover:text-white transition-colors"
      >
        Operations
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  </Panel>
);
