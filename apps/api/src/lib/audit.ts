import { prisma } from './prisma.js';
import type { ChangeRequestStatus } from '@prisma/client';

export async function logWorkflow(params: {
  changeRequestId: string;
  triggeredById: string;
  previousStatus: ChangeRequestStatus | null;
  newStatus: ChangeRequestStatus;
  actionNote?: string;
}) {
  await prisma.workflowLog.create({
    data: {
      changeRequestId: params.changeRequestId,
      triggeredById: params.triggeredById,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      actionNote: params.actionNote,
    },
  });
}
