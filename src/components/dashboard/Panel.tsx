import type { ReactNode } from 'react';
import { PANEL } from './theme';

interface PanelProps {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Hairline instrument panel — the structural unit of the dispatcher board. */
export const Panel = ({
  title,
  meta,
  action,
  children,
  className = '',
  bodyClassName = '',
}: PanelProps) => (
  <section className={`flex flex-col ${PANEL} ${className}`}>
    <header className="h-10 shrink-0 px-4 flex items-center justify-between gap-3 border-b border-[rgba(15,44,92,0.10)] dark:border-white/10">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-[3px] h-3 bg-[#2F5FD1] dark:bg-sky-400 shrink-0" aria-hidden="true" />
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F2C5C] dark:text-white/85 truncate">
          {title}
        </h2>
        {meta ? (
          <span className="font-mono text-[10px] text-[#5B6478] dark:text-gray-400 truncate hidden sm:inline">
            {meta}
          </span>
        ) : null}
      </div>
      {action}
    </header>
    <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
  </section>
);
