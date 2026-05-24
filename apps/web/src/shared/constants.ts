export const CR_STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: 'Pending approval',
  APPROVED_ASSIGNED: 'Approved & assigned',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
};

export const CR_STATUS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: 'gold',
  APPROVED_ASSIGNED: 'blue',
  IN_PROGRESS: 'processing',
  RESOLVED: 'green',
  CLOSED: 'default',
  REJECTED: 'red',
};

export const MODULE_OPTIONS = [
  'Admissions',
  'Attendance',
  'Finance',
  'Reports',
  'Timetable',
  'Examinations',
  'Communication',
  'Other',
];
