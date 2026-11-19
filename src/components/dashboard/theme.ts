/**
 * Shared class tokens for the dispatcher signal-board layout.
 *
 * Tailwind strings live here instead of in each page so the hairlines, type
 * scale and tag treatment stay identical across Dashboard, Predict,
 * Analytics and Optimization.
 */

/** The page shell: full-width board with consistent vertical rhythm. */
export const PAGE = 'max-w-[1600px] space-y-5 pb-12';

/** Hairline panel surface, used by Panel.tsx. */
export const PANEL =
  'bg-white dark:bg-[#0C1424] border border-[rgba(15,44,92,0.14)] dark:border-white/10';

/** Small caps label above a group of panels. */
export const SECTION_LABEL =
  'flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#5B6478] dark:text-gray-400';

/** Table header row. */
export const THEAD =
  'bg-[#F6F8FB] dark:bg-white/[0.03] text-[9px] font-mono uppercase tracking-[0.16em] text-[#5B6478] dark:text-gray-400 border-b border-[rgba(15,44,92,0.10)] dark:border-white/10';

/** Table row hover + divider. */
export const TROW =
  'border-b border-[rgba(15,44,92,0.07)] dark:border-white/[0.06] hover:bg-[#F6F8FB] dark:hover:bg-white/[0.03] transition-colors';

/** Form control — square, monospaced, hairline. */
export const FIELD =
  'mt-1 w-full bg-white dark:bg-[#0A1120] border border-[rgba(15,44,92,0.18)] dark:border-white/12 px-2.5 py-2 font-mono text-[11px] text-[#0F2C5C] dark:text-gray-200 focus:outline-none focus:border-[#2F5FD1] dark:focus:border-sky-400 transition-colors';

export type TagTone = 'info' | 'positive' | 'caution' | 'danger' | 'muted';

const TAG_TONE: Record<TagTone, string> = {
  info: 'text-[#2F5FD1] dark:text-sky-400 border-[#2F5FD1]/25 dark:border-sky-400/30 bg-[#2F5FD1]/[0.06] dark:bg-sky-400/10',
  positive:
    'text-[#1E7F4F] dark:text-emerald-400 border-[#1E7F4F]/25 dark:border-emerald-400/30 bg-[#1E7F4F]/[0.06] dark:bg-emerald-400/10',
  caution:
    'text-[#B9790A] dark:text-amber-400 border-[#B9790A]/25 dark:border-amber-400/30 bg-[#B9790A]/[0.06] dark:bg-amber-400/10',
  danger:
    'text-[#C23636] dark:text-red-400 border-[#C23636]/25 dark:border-red-400/30 bg-[#C23636]/[0.06] dark:bg-red-400/10',
  muted:
    'text-[#5B6478] dark:text-gray-400 border-[rgba(15,44,92,0.14)] dark:border-white/10 bg-transparent',
};

/** Small status chip. `tag(tone)` keeps every badge the same size and tracking. */
export const tag = (tone: TagTone = 'muted', extra = '') =>
  `inline-flex items-center gap-1 border px-1.5 py-[3px] font-mono text-[9px] font-bold uppercase tracking-[0.12em] whitespace-nowrap ${TAG_TONE[tone]} ${extra}`;
