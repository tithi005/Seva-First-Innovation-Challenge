import type { Train } from '../../types';

/** The classifier's delay threshold (delay_threshold.pkl). A train is only
 *  counted as late once it exceeds this, which keeps the dashboard consistent
 *  with the ML pipeline and the 47.2% dataset delay rate. */
export const DELAY_THRESHOLD_MIN = 10;

export const isLate = (train: Train): boolean =>
  (train.delayMinutes ?? 0) >= DELAY_THRESHOLD_MIN;
