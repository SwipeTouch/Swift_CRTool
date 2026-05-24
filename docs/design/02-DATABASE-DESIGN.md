# Database Design

Prisma schema: `apps/api/prisma/schema.prisma`

## Core entities

- **organizations** — Schools/colleges with full profile (city, address, contact, SLA days) and login `code`
- **system_users** — All logins with `role` + optional `organization_id`
- **change_requests** — Master CR ledger
- **workflow_logs** — Status transition audit trail
- **cr_comments** — `INTERNAL` | `CLIENT_VISIBLE`
- **external_ticket_links** — JIRA / OSTICKET / OTHER

## Status enum

`PENDING_APPROVAL` → `APPROVED_ASSIGNED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`  
Rejection path: `REJECTED`

## Indexes

- `(organization_id, created_at)` — client history & reports
- `(status)` — queue dashboards
- `(assigned_staff_id, status)` — staff workload
