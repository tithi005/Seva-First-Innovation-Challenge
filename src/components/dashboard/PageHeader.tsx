import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Small caps line above the title. */
  eyebrow: string;
  title: string;
  /** Right-aligned chips or readouts. */
  children?: ReactNode;
  /** Adds the pulsing live dot to the eyebrow. */
  live?: boolean;
}

/**
 * Console header used by every board page: eyebrow, title, hairline rule and
 * an optional action cluster on the right.
 */
export const PageHeader = ({ eyebrow, title, children, live = false }: PageHeaderProps) => (
  <header className="flex flex-col gap-3 border-b border-[rgba(15,44,92,0.14)] dark:border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[#5B6478] dark:text-gray-400">
        {live ? (
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#1E7F4F] opacity-70 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1E7F4F] dark:bg-emerald-400" />
          </span>
        ) : null}
        {eyebrow}
      </div>
      <h1 className="mt-2 text-[21px] font-semibold tracking-tight text-[#0F2C5C] dark:text-white">
        {title}
      </h1>
    </div>

    {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
  </header>
);
