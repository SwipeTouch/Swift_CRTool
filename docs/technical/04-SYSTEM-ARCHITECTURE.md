# System Architecture

## 1. High-level architecture

```mermaid
flowchart TB
    subgraph ClientBrowser["User browser"]
        SPA[React SPA\nVite + Ant Design]
    end

    subgraph Server["Application server"]
        API[Express API\nTypeScript + JWT]
        PRISMA[Prisma ORM]
    end

    subgraph Data["Data tier"]
        MYSQL[(MySQL 8\ncrms database)]
    end

    subgraph External["External (reference only)"]
        JIRA[JIRA]
        OSTICKET[osTicket]
    end

    SPA -->|"HTTPS / REST\nBearer JWT"| API
    API --> PRISMA
    PRISMA --> MYSQL
    SPA -.->|"Manual links"| JIRA & OSTICKET
```

---

## 2. Monorepo structure

```
Swift_CRTool/
├── apps/
│   ├── api/                 # Node.js Express backend
│   │   ├── prisma/          # Schema, seed, migrations
│   │   ├── scripts/         # SQL generator
│   │   └── src/
│   │       ├── lib/         # workflow, notifications, SLA, audit
│   │       ├── middleware/  # auth, RBAC
│   │       └── routes/      # REST endpoints
│   └── web/                 # React frontend
│       └── src/
│           ├── modules/     # Feature pages by domain
│           └── shared/      # Auth, API client, layout, hooks
├── docs/
│   ├── design/              # PRD, workflow summaries
│   ├── sql/                 # Full MySQL import script
│   └── technical/           # This documentation set
├── docker-compose.yml       # MySQL + Adminer (dev)
└── package.json             # npm workspaces root
```

---

## 3. Technology stack

| Layer | Technology | Version / notes |
|-------|------------|-----------------|
| Frontend | React | 18 |
| UI library | Ant Design | 5.x |
| Charts | @ant-design/plots | 2.x |
| Build | Vite | 5.x |
| Language | TypeScript | 5.x |
| Backend | Express | 4.x |
| ORM | Prisma | 5.x |
| Database | MySQL | 8.0 |
| Auth | JWT (jsonwebtoken) | Bearer token, 8h expiry |
| Password hashing | bcryptjs | Cost factor 12 |

---

## 4. Component diagram (frontend)

```mermaid
flowchart TB
    subgraph WebApp
        ROUTER[React Router]
        AUTH[AuthContext\nJWT storage]
        LAYOUT[AppLayout\nSidebar + Header]
        
        subgraph Modules
            DASH[Dashboard]
            CR[Change Requests]
            APPR[Approvals]
            RPT[Reports]
            ADM[Administration]
        end

        API_CLIENT[apiFetch client]
        NOTIF_HOOK[useNotifications]
    end

    ROUTER --> AUTH
    AUTH --> LAYOUT
    LAYOUT --> Modules
    Modules --> API_CLIENT
    LAYOUT --> NOTIF_HOOK
    NOTIF_HOOK --> API_CLIENT
    API_CLIENT -->|"HTTP + Bearer"| API[Express API]
```

### Web route map

| Path | Page | Roles |
|------|------|-------|
| `/login` | Login | Public |
| `/dashboard` | Dashboard | All authenticated |
| `/change-requests` | CR list | All |
| `/change-requests/new` | New CR | CLIENT |
| `/change-requests/:id` | CR detail | Scoped by role |
| `/approvals` | Pending approvals | APPROVER, ADMIN |
| `/reports` | Analytics | APPROVER, ADMIN |
| `/reports/schools/:id` | School drill-down | APPROVER, ADMIN |
| `/admin/organizations` | Institutions | APPROVER, ADMIN |
| `/admin/organizations/:id` | Institution detail | APPROVER, ADMIN |
| `/admin/users` | Users & staff | ADMIN |

---

## 5. Component diagram (backend)

```mermaid
flowchart TB
    subgraph ExpressAPI
        SERVER[server.ts]
        MW[requireAuth\nrequireRoles]
        
        subgraph Routes
            AUTH_R[auth]
            ORG_R[organizations]
            USER_R[users]
            CR_R[changeRequests]
            DASH_R[dashboard]
            RPT_R[reports]
            NOTIF_R[notifications]
        end

        subgraph Lib
            WF[workflow.ts]
            NOTIF_L[notifications.ts]
            SLA[sla.ts]
            AUDIT[audit.ts]
        end
    end

    SERVER --> MW --> Routes
    CR_R --> WF & NOTIF_L & AUDIT
    DASH_R --> SLA
    Routes --> PRISMA[Prisma Client]
    PRISMA --> MYSQL[(MySQL)]
```

---

## 6. API catalogue

Base URL (dev): `http://localhost:3002/api`

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Public | Email + password (+ org code for clients) |
| GET | `/auth/me` | JWT | Current user profile |

### Organizations

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/organizations` | Internal | List institutions |
| GET | `/organizations/:id` | Internal | Detail |
| GET | `/organizations/:id/change-requests` | Internal | CRs for org |
| POST | `/organizations` | ADMIN | Create institution |
| PATCH | `/organizations/:id` | ADMIN | Update |
| DELETE | `/organizations/:id` | ADMIN | Deactivate |

### Users

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/users` | Internal | List users (`?staff=true&role=CS_MEMBER`) |
| POST | `/users` | ADMIN | Create user |
| PATCH | `/users/:id` | ADMIN | Update user |

### Change requests

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/change-requests` | All | List (role-scoped; search, sort params) |
| GET | `/change-requests/:id` | Scoped | Detail + logs + comments |
| POST | `/change-requests` | CLIENT | Submit new CR |
| POST | `/change-requests/:id/transition` | Role-based | Status transition |
| POST | `/change-requests/:id/return-to-admin` | CS_MEMBER | Return with notes |
| POST | `/change-requests/:id/reassign` | APPROVER, ADMIN | Reassign staff |
| POST | `/change-requests/:id/comments` | Internal | Add comment |
| POST | `/change-requests/:id/external-tickets` | Internal | Link JIRA/osTicket |

### Dashboard

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/dashboard/summary` | All | Role-specific KPI counts |
| GET | `/dashboard/company` | APPROVER, ADMIN | Charts, SLA, top clients |

### Reports

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/reports/summary` | APPROVER, ADMIN | Aggregate stats |
| GET | `/reports/overview` | APPROVER, ADMIN | Trend data |
| GET | `/reports/organizations/:id` | APPROVER, ADMIN | Per-school summary |
| GET | `/reports/organizations/:id/change-requests` | APPROVER, ADMIN | Paginated CR grid |
| GET | `/reports/modules` | APPROVER, ADMIN | Module breakdown |

### Notifications

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/notifications` | APPROVER, ADMIN, CS_MEMBER | List notifications |
| GET | `/notifications/pending-count` | APPROVER, ADMIN, CS_MEMBER | Unread action count |
| PATCH | `/notifications/:id/read` | Owner | Mark read |
| PATCH | `/notifications/read-all` | Owner | Mark all read |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | `{ status: "ok" }` |

---

## 7. Security model

```mermaid
flowchart LR
    REQ[HTTP Request] --> CORS[CORS check]
    CORS --> JWT{JWT valid?}
    JWT -->|No| E401[401 Unauthorized]
    JWT -->|Yes| RBAC{Role allowed?}
    RBAC -->|No| E403[403 Forbidden]
    RBAC -->|Yes| SCOPE{Data scope OK?}
    SCOPE -->|No| E403
    SCOPE -->|Yes| HANDLER[Route handler]
```

| Control | Implementation |
|---------|----------------|
| Authentication | JWT in `Authorization: Bearer` header |
| Authorization | `requireRoles()` middleware + per-route checks |
| Data scoping | CLIENT: own org; CS_MEMBER: assigned + pool; APPROVER/ADMIN: all |
| Password storage | bcrypt hash, never returned in API |
| CORS | Configurable via `CORS_ORIGINS` env var |
| SQL injection | Prisma parameterized queries |

---

## 8. Workflow state machine

```mermaid
stateDiagram-v2
    [*] --> PENDING_APPROVAL: Client submits
    PENDING_APPROVAL --> APPROVED_ASSIGNED: Approve + assign
    PENDING_APPROVAL --> REJECTED: Reject
    APPROVED_ASSIGNED --> IN_PROGRESS: Staff starts
    APPROVED_ASSIGNED --> APPROVED_ASSIGNED: Return to admin\n(unassigned pool)
    IN_PROGRESS --> APPROVED_ASSIGNED: Return to admin
    IN_PROGRESS --> RESOLVED: Mark resolved
    RESOLVED --> CLOSED: Close ticket
    APPROVED_ASSIGNED --> APPROVED_ASSIGNED: Admin reassigns
    REJECTED --> [*]
    CLOSED --> [*]
```

---

## 9. Environment configuration

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | MySQL connection | `mysql://crms:crms_dev@localhost:3307/crms` |
| `API_PORT` | API listen port | `3002` |
| `WEB_PORT` | Vite dev port | `3000` |
| `JWT_ACCESS_SECRET` | Token signing key | min 32 chars |
| `JWT_ACCESS_EXPIRY` | Token TTL | `8h` |
| `CORS_ORIGINS` | Allowed web origins | `http://localhost:3000` |

See `.env.example` for full list.

---

## 10. Deployment architecture (production target)

```mermaid
flowchart TB
    USER[Users] --> HTTPS[Plesk / Nginx\nHTTPS]
    HTTPS --> STATIC[Static files\nReact build in httpdocs/]
    HTTPS --> PROXY[Reverse proxy\n/api → Node]
    PROXY --> NODE[Node.js\nExpress API]
    NODE --> MYSQL_PROD[(MySQL 8\nProduction DB)]
```

| Component | Deployment |
|-----------|------------|
| Web | `npm run build:web` → upload `apps/web/dist/` |
| API | `npm run build --workspace=@crms/api` → PM2 or Plesk Node app |
| Database | MySQL on same VPS or managed service; import `docs/sql/crms-full-import.sql` |

---

## 11. Development commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start MySQL + Adminer |
| `npm install` | Install all workspaces |
| `npm run db:push` | Sync Prisma schema to DB |
| `npm run db:seed` | Load demo data via Prisma |
| `npm run dev:all` | Start API + web concurrently |
| `npm run build` | Production build (api + web) |
| `npm run sql:generate --workspace=@crms/api` | Regenerate SQL import file |
