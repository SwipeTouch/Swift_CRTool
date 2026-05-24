# Swipetouch Change Request Management System (CRMS)

Workflow-driven change request platform for schools/colleges (clients) and Swipetouch internal teams (approvers, customer-success staff, admins).

**Stack:** React 18 + TypeScript + Vite + Ant Design · Node.js + Express + Prisma · MySQL 8  
(Structure aligned with [GeneralHR](../GeneralHR).)

## Features (MVP)

| Role | Capabilities |
|------|----------------|
| **CLIENT** | Login with org code, submit CRs, track status, see client-visible updates only |
| **APPROVER** | Pending approval queue, approve/reject, assign staff |
| **CS_MEMBER** | Assigned CRs, internal/client comments, link JIRA/osTicket |
| **ADMIN** | Institution CRUD (full profile, 2 CR raisers), company dashboard with charts & SLA |
| **APPROVER** | View institutions, approvals, company dashboard (read-only institution edits) |

## Quick start

```bash
# 1. Environment
cp .env.example .env

# 2. MySQL (port 3307 to avoid clashing with other projects)
docker compose up -d

# 3. Install & database
npm install
npm run db:push
npm run db:seed

# 4. Run API + web
npm run dev:all
```

- **Web:** http://localhost:3000  
- **API:** http://localhost:3002/api/health  
- **Adminer:** http://localhost:8081  

## Demo accounts (password: `demo123`)

| Portal | Email | Org code |
|--------|-------|----------|
| Client | `client@demoschool.local` | `demoschool` |
| Admin | `admin@swipetouch.local` | — |
| Approver | `approver@swipetouch.local` | — |
| Staff | `staff1@swipetouch.local` | — |

## Project layout

```
apps/api/          Express API, Prisma, MySQL
apps/web/          React SPA
docs/design/       PRD summary, schema, workflow
```

## Documentation

- [Design index](./docs/design/00-INDEX.md)
- [Workflow & comment visibility](./docs/design/03-WORKFLOW.md)

## Deployment note

Production target: VPS + Plesk (React static in `httpdocs/`, Node API under `/api` — see architecture PDF in project brief).
