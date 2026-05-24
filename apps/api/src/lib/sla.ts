import type { ChangeRequestStatus } from '@prisma/client';

const TERMINAL: ChangeRequestStatus[] = ['CLOSED', 'REJECTED', 'RESOLVED'];

export function computeSlaDueAt(from: Date, slaDays: number): Date {
  const due = new Date(from);
  due.setDate(due.getDate() + slaDays);
  return due;
}

export function isSlaBreached(
  status: ChangeRequestStatus,
  slaDueAt: Date | null,
  now = new Date(),
): boolean {
  if (!slaDueAt || TERMINAL.includes(status)) return false;
  return now > slaDueAt;
}

export function isSlaAtRisk(
  status: ChangeRequestStatus,
  slaDueAt: Date | null,
  now = new Date(),
  riskDays = 3,
): boolean {
  if (!slaDueAt || TERMINAL.includes(status) || isSlaBreached(status, slaDueAt, now)) return false;
  const riskStart = new Date(slaDueAt);
  riskStart.setDate(riskStart.getDate() - riskDays);
  return now >= riskStart;
}
