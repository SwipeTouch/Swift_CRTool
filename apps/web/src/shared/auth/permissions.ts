export type AppRole = 'CLIENT' | 'APPROVER' | 'CS_MEMBER' | 'ADMIN';

export function isClient(role: AppRole) {
  return role === 'CLIENT';
}

export function isInternal(role: AppRole) {
  return role === 'ADMIN' || role === 'APPROVER' || role === 'CS_MEMBER';
}

export function canManageOrgs(role: AppRole) {
  return role === 'ADMIN' || role === 'APPROVER';
}

export function canManageUsers(role: AppRole) {
  return role === 'ADMIN';
}

export function canApprove(role: AppRole) {
  return role === 'ADMIN' || role === 'APPROVER';
}

export function canViewReports(role: AppRole) {
  return role === 'ADMIN' || role === 'APPROVER';
}

export const ROLE_LABELS: Record<AppRole, string> = {
  CLIENT: 'Client',
  APPROVER: 'Approver',
  CS_MEMBER: 'Staff',
  ADMIN: 'Administrator',
};
