import type { AlertItem } from '../../types';
import { Panel } from './Panel';

const SEVERITY: Record<
  AlertItem['severity'],
  { label: string; text: string; rail: string }
> = {
  critical: {
    label: 'CRIT',
    text: 'text-[#C23636] dark:text-red-400',
    rail: 'bg-[#C23636] dark:bg-red-400',
  },
  warning: {
    label: 'WARN',
    text: 'text-[#B9790A] dark:text-amber-400',
    rail: 'bg-[#B9790A] dark:bg-amber-400',
  },
  info: {
    label: 'INFO',
    text: 'text-[#2F5FD1] dark:text-sky-400',
    rail: 'bg-[#2F5FD1] dark:bg-sky-400',
  },
  resolved: {
    label: 'CLR',
    text: 'text-[#1E7F4F] dark:text-emerald-400',
    rail: 'bg-[#1E7F4F] dark:bg-emerald-400',
  },
};

interface AlertQueueProps {
  alerts: AlertItem[];
  onAcknowledge: (alert: AlertItem) => void;
}

export const AlertQueue = ({ alerts, onAcknowledge }: AlertQueueProps) => {
  const open = alerts.filter((a) => a.severity === 'critical' || a.severity === 'warning').length;

  return (
    <Panel
      title="Signal & Safety Queue"
      meta={`${open} open`}
      action={
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#1E7F4F] dark:text-emerald-400">
          <span className="h-[6px] w-[6px] rounded-full bg-[#1E7F4F] dark:bg-emerald-400 animate-pulse" />
          Live
        </span>
      }
    >
      <div className="max-h-[248px] overflow-y-auto">
        {alerts.slice(0, 6).map((alert) => {
          const severity = SEVERITY[alert.severity];
          return (
            <button
              key={alert.id}
              type="button"
              onClick={() => onAcknowledge(alert)}
              className="group relative w-full pl-5 pr-4 py-2.5 text-left border-b border-[rgba(15,44,92,0.06)] dark:border-white/5 last:border-b-0 hover:bg-[#0F2C5C]/[0.025] dark:hover:bg-white/[0.035] transition-colors"
            >
              <span
                className={`absolute left-0 top-0 bottom-0 w-[2px] ${severity.rail} opacity-70 group-hover:opacity-100`}
                aria-hidden="true"
              />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] ${severity.text}`}
                    >
                      {severity.label}
                    </span>
                    <span className="truncate font-mono text-[9px] text-[#8C95A6] dark:text-gray-500">
                      {alert.location}
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-snug text-[#0F2C5C] dark:text-gray-200">
                    {alert.message}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[9px] tabular-nums text-[#8C95A6] dark:text-gray-500">
                  {alert.timestamp}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
};
