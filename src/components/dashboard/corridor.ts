/**
 * Corridor topology for the Howrah–Burdwan line.
 *
 * Section delay rates come from the 50,000-record dataset and are shared by the
 * dashboard signal diagram and the network route map so the two can never drift.
 */

export interface SectionMeta {
  /** Canonical section id, e.g. 'SHE-SKG'. */
  id: string;
  from: string;
  to: string;
  /** Delay rate (%) measured over the dataset. */
  delayRate: number;
  /** Mean delay (min) for trains that were late on this section. */
  avgLate: number;
}

const RAW_SECTIONS: Array<[string, number, number]> = [
  ['HWH-BLY', 38.6, 14.9],
  ['BLY-BDC', 38.9, 14.8],
  ['BDC-SHE', 38.7, 15.0],
  ['SHE-SKG', 56.6, 15.5],
  ['SKG-MMR', 50.6, 15.5],
  ['MMR-BWN', 50.8, 15.4],
  ['BWN-GUS', 52.0, 15.5],
  ['GUS-PAN', 51.7, 15.3],
];

export const SECTIONS: SectionMeta[] = RAW_SECTIONS.map(([id, delayRate, avgLate]) => {
  const [from, to] = id.split('-');
  return { id, from, to, delayRate, avgLate };
});

export const SECTION_BY_ID: Record<string, SectionMeta> = Object.fromEntries(
  SECTIONS.map((section) => [section.id, section])
);

/** Station codes in route order, Howrah to Panagarh. */
export const STATIONS: string[] = ['HWH', 'BLY', 'BDC', 'SHE', 'SKG', 'MMR', 'BWN', 'GUS', 'PAN'];

export const STATION_NAMES: Record<string, string> = {
  HWH: 'Howrah',
  BLY: 'Bally',
  BDC: 'Bandel',
  SHE: 'Seoraphuli',
  SKG: 'Saktigarh',
  MMR: 'Memari',
  BWN: 'Barddhaman',
  GUS: 'Guskara',
  PAN: 'Panagarh',
};

export type Level = 'clear' | 'caution' | 'restricted';

export const levelOf = (rate: number): Level =>
  rate >= 55 ? 'restricted' : rate >= 48 ? 'caution' : 'clear';

export const LEVEL: Record<Level, { bar: string; text: string; label: string }> = {
  clear: {
    bar: 'bg-[#1E7F4F] dark:bg-emerald-400',
    text: 'text-[#1E7F4F] dark:text-emerald-400',
    label: 'CLEAR',
  },
  caution: {
    bar: 'bg-[#B9790A] dark:bg-amber-400',
    text: 'text-[#B9790A] dark:text-amber-400',
    label: 'CAUTION',
  },
  restricted: {
    bar: 'bg-[#C23636] dark:bg-red-400',
    text: 'text-[#C23636] dark:text-red-400',
    label: 'RESTRICTED',
  },
};
