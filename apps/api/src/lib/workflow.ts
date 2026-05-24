import type { ChangeRequestStatus, UserRole } from '@prisma/client';

const TRANSITIONS: Record<ChangeRequestStatus, ChangeRequestStatus[]> = {
  PENDING_APPROVAL: ['APPROVED_ASSIGNED', 'REJECTED'],
  APPROVED_ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  REJECTED: [],
  CLOSED: [],
};

export function canTransition(from: ChangeRequestStatus, to: ChangeRequestStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Admin re-assigning an unassigned or returned CR stays in APPROVED_ASSIGNED */
export function canReassign(status: ChangeRequestStatus): boolean {
  return status === 'APPROVED_ASSIGNED';
}

/** CS staff may return tickets assigned to them before resolution */
export function canReturnToAdmin(status: ChangeRequestStatus): boolean {
  return status === 'APPROVED_ASSIGNED' || status === 'IN_PROGRESS';
}

export function rolesAllowedForStatus(target: ChangeRequestStatus): UserRole[] {
  switch (target) {
    case 'APPROVED_ASSIGNED':
    case 'REJECTED':
      return ['APPROVER', 'ADMIN'];
    case 'IN_PROGRESS':
    case 'RESOLVED':
      return ['CS_MEMBER', 'ADMIN', 'APPROVER'];
    case 'CLOSED':
      return ['APPROVER', 'ADMIN'];
    default:
      return ['ADMIN'];
  }
}
