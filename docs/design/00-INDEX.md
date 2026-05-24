# Swipetouch CRMS — Design Index

| Doc | Description |
|-----|-------------|
| [01-PRD-SUMMARY.md](./01-PRD-SUMMARY.md) | Product requirements distilled from PRD |
| [02-DATABASE-DESIGN.md](./02-DATABASE-DESIGN.md) | MySQL schema, roles, workflow |
| [03-WORKFLOW.md](./03-WORKFLOW.md) | Change request lifecycle & visibility rules |

## Tech stack (aligned with GeneralHR)

- **Frontend:** React 18, TypeScript, Vite, Ant Design
- **Backend:** Node.js, Express, TypeScript, Prisma
- **Database:** MySQL 8 (InnoDB, utf8mb4)
- **Auth:** JWT bearer tokens, RBAC

## User roles

| Role | Portal | Capabilities |
|------|--------|--------------|
| `CLIENT` | Client dashboard | Submit CRs, track status, view client-visible updates |
| `APPROVER` | Internal | Approve/reject, assign staff |
| `CS_MEMBER` | Staff | Work assigned CRs, internal comments, link JIRA/OS Ticket |
| `ADMIN` | Admin | Onboard orgs & users, full visibility, reporting |
