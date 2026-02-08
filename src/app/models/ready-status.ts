export interface ReadyStatus {
  isReady: boolean;
  status: ReadyStatusType;
  message?: string;
  reason?: string;
  lastTransitionTime?: string;
}

export type ReadyStatusType = 'ready' | 'not-ready' | 'unknown' | 'in-progress';

export interface Condition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
  lastUpdateTime?: string;
  observedGeneration?: number;
}

export const READY_PHASES = [
  'Ready',
  'Running',
  'Active',
  'Bound',
  'Succeeded',
  'Available',
  'Healthy',
] as const;

export const NOT_READY_PHASES = [
  'Pending',
  'Failed',
  'Error',
  'Terminating',
  'Unknown',
  'Unhealthy',
] as const;

export const IN_PROGRESS_PHASES = [
  'Creating',
  'Updating',
  'Deleting',
  'Provisioning',
  'Initializing',
] as const;
