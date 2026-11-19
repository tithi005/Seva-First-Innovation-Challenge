export type KpiTone = 'default' | 'positive' | 'caution' | 'danger';

export interface KpiItem {
  id: string;
  label: string;
  value: string;
  unit?: string;
  note: string;
  tone?: KpiTone;
  /** 0–100. Renders a calibrated rail under the figure. */
  meter?: number;
  /** Marks a threshold tick on the meter (0–100). */
  threshold?: number;
}

const TONE_TEXT: Record<KpiTone, string> = {
  default: 'text-[#0F2C5C] dark:text-white',
  positive: 'text-[#1E7F4F] dark:text-emerald-400',
  caution: 'text-[#B9790A] dark:text-amber-400',
  danger: 'text-[#C23636] dark:text-red-400',
};

const TONE_BAR: Record<KpiTone, string> = {
  default: 'bg-[#2F5FD1] dark:bg-sky-400',
  positive: 'bg-[#1E7F4F] dark:bg-emerald-400',
  caution: 'bg-[#B9790A] dark:bg-amber-400',
  danger: 'bg-[#C23636] dark:bg-red-400',
};

const GRID: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6',
};

export const KpiRail = ({
  items,
  columns = 6,
}: {
  items: KpiItem[];
  /** Number of cells per row at the widest breakpoint. */
  columns?: 2 | 3 | 4 | 6;
}) => (
  <div
    className={`grid ${GRID[columns] ?? GRID[6]} gap-px bg-[rgba(15,44,92,0.14)] dark:bg-white/10 border border-[rgba(15,44,92,0.14)] dark:border-white/10`}
  >
    {items.map((item, index) => {
      const tone = item.tone ?? 'default';
      return (
        <div key={item.id} className="relative bg-white dark:bg-[#0C1424] px-4 py-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[#5B6478] dark:text-gray-400 truncate">
              {item.label}
            </span>
            <span className="font-mono text-[9px] text-[#8C95A6]/60 dark:text-white/20 tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline gap-1">
            <span
              className={`font-mono text-[27px] leading-none font-semibold tracking-tight tabular-nums ${TONE_TEXT[tone]}`}
            >
              {item.value}
            </span>
            {item.unit ? (
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#5B6478] dark:text-gray-400">
                {item.unit}
              </span>
            ) : null}
          </div>

          <p className="mt-1.5 text-[10px] leading-tight text-[#5B6478] dark:text-gray-400 truncate">
            {item.note}
          </p>

          <div className="relative mt-3 h-[3px]">
            {item.meter !== undefined ? (
              <>
                <div className="h-[3px] w-full bg-[rgba(15,44,92,0.08)] dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full ${TONE_BAR[tone]}`}
                    style={{ width: `${Math.max(0, Math.min(100, item.meter))}%` }}
                  />
                </div>
                {item.threshold !== undefined ? (
                  <span
                    className="absolute -top-[2px] h-[7px] w-px bg-[#0F2C5C]/40 dark:bg-white/40"
                    style={{ left: `${Math.max(0, Math.min(100, item.threshold))}%` }}
                    aria-hidden="true"
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      );
    })}
  </div>
);
