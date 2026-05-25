# Data Flow Diagram (DFD)

This document describes how data moves through the Swipetouch CRMS at context, Level-0, Level-1, and Level-2 (change request workflow).

**Notation:**
- **External entity** — actor outside the system (rectangle in classic DFD; shown as labeled nodes in Mermaid)
- **Process** — transformation (rounded box)
- **Data store** — persistent storage (database tables)
- **Data flow** — labeled arrow

---

## 1. Context diagram (Level 0)

Shows CRMS as a single system and its interactions with external actors.

```mermaid
flowchart LR
    subgraph External
        CLIENT[Client User\nSchool / College]
        APPROVER[Approver\nSwipetouch]
        STAFF[CS Staff\nSwipetouch]
        ADMIN[Administrator\nSwipetouch]
        JIRA[JIRA / osTicket\nExternal systems]
    end

    CRMS((Swipetouch CRMS))

    CLIENT -->|"Login, submit CR,\nview status"| CRMS
    CRMS -->|"Status, client-visible\nupdates"| CLIENT

    APPROVER -->|"Approve, reject,\nassign, reassign"| CRMS
    CRMS -->|"Pending queue,\nnotifications, reports"| APPROVER

    STAFF -->|"Start work, resolve,\nreturn to admin, comments"| CRMS
    CRMS -->|"Assigned queue,\nnotifications"| STAFF

    ADMIN -->|"Manage orgs/users,\nfull operations"| CRMS
    CRMS -->|"Dashboards, analytics,\nadmin reports"| ADMIN

    STAFF -->|"Ticket ID, URL"| JIRA
    CRMS -->|"External link\nreference stored"| JIRA
```

### External entities

| Entity | Description |
|--------|-------------|
| **Client User** | Designated CR raiser at an institution |
| **Approver** | Reviews and approves incoming CRs |
| **CS Staff** | Executes approved work |
| **Administrator** | System and institution management |
| **JIRA / osTicket** | External ticket systems (reference links only) |

---

## 2. Level-1 DFD — major processes

Decomposes CRMS into primary functional processes and data stores.

```mermaid
flowchart TB
    subgraph Actors
        C[Client]
        A[Approver / Admin]
        S[CS Staff]
    end

    subgraph Processes
        P1[1.0 Authentication\n& Session]
        P2[2.0 Organization\n& User Mgmt]
        P3[3.0 Change Request\nLifecycle]
        P4[4.0 Comments &\nExternal Links]
        P5[5.0 Notifications]
        P6[6.0 Dashboard\n& Reporting]
    end

    subgraph DataStores
        D1[(D1: organizations)]
        D2[(D2: system_users)]
        D3[(D3: change_requests)]
        D4[(D4: workflow_logs)]
        D5[(D5: cr_comments)]
        D6[(D6: external_ticket_links)]
        D7[(D7: notifications)]
    end

    C & A & S --> P1
    P1 -->|"JWT, user profile"| C & A & S
    P1 <--> D2

    A --> P2
    P2 <--> D1
    P2 <--> D2

    C -->|"New CR"| P3
    A -->|"Approve / reject / reassign"| P3
    S -->|"Start / resolve / return"| P3
    P3 -->|"CR list, detail"| C & A & S
    P3 <--> D3
    P3 --> D4

    S & A --> P4
    P4 <--> D5
    P4 <--> D6
    P4 -->|"Client-visible updates"| C

    P3 -->|"CR events"| P5
    P5 <--> D7
    P5 -->|"Alerts"| A & S

    C & A & S --> P6
    P6 -->|"KPIs, charts"| A & S
    P6 -->|"Summary stats"| C
    P6 <--> D3
    P6 <--> D1
```

### Process catalogue

| Process | Description | Primary data stores |
|---------|-------------|---------------------|
| **1.0 Authentication** | Login, JWT issue, `/me` profile | D2 |
| **2.0 Organization & User Mgmt** | CRUD institutions, users, raisers | D1, D2 |
| **3.0 Change Request Lifecycle** | Submit, transition, return, reassign | D3, D4 |
| **4.0 Comments & External Links** | Internal/client comments, JIRA links | D5, D6 |
| **5.0 Notifications** | Create, resolve, read notifications | D7 |
| **6.0 Dashboard & Reporting** | Aggregations, charts, exports | D1, D3 |

---

## 3. Level-2 DFD — Process 3.0 Change Request Lifecycle

Detailed flow for the core CR workflow.

```mermaid
flowchart TB
    subgraph Actors
        CL[Client]
        AP[Approver / Admin]
        ST[CS Staff]
    end

    subgraph P3_ChangeRequestLifecycle
        P31[3.1 Submit CR]
        P32[3.2 Review &\nApprove/Reject]
        P33[3.3 Assign /\nReassign Staff]
        P34[3.4 Execute Work]
        P35[3.5 Return to Admin]
        P36[3.6 Resolve & Close]
    end

    D3[(change_requests)]
    D4[(workflow_logs)]
    D7[(notifications)]

    CL -->|"title, description,\nmodule, priority"| P31
    P31 --> D3
    P31 --> D4
    P31 -->|"new CR event"| D7

    AP --> P32
    P32 -->|"approve + staffId"| P33
    P32 -->|"reject + reason"| D3
    P32 --> D4
    P32 --> D7

    AP --> P33
    P33 --> D3
    P33 --> D4
    P33 -->|"ASSIGNED notification"| D7

    ST -->|"start work"| P34
    P34 --> D3
    P34 --> D4

    ST -->|"return + reason"| P35
    P35 -->|"clear assignee,\nAPPROVED_ASSIGNED"| D3
    P35 --> D4
    P35 -->|"RETURNED_FOR_REASSIGN"| D7

    ST -->|"mark resolved"| P36
    AP -->|"close ticket"| P36
    P36 --> D3
    P36 --> D4
```

### Status transitions (data written to D3)

| From | To | Triggered by | Data updated |
|------|-----|--------------|--------------|
| — | `PENDING_APPROVAL` | Client submit | `requested_by_id`, `sla_due_at`, `created_at` |
| `PENDING_APPROVAL` | `APPROVED_ASSIGNED` | Approve | `approver_id`, `assigned_staff_id`, `approved_at`, `assigned_at` |
| `PENDING_APPROVAL` | `REJECTED` | Reject | `rejection_reason`, `approver_id` |
| `APPROVED_ASSIGNED` | `IN_PROGRESS` | Staff start | `status` |
| `IN_PROGRESS` / `APPROVED_ASSIGNED` | `APPROVED_ASSIGNED` (unassigned) | Return to admin | `assigned_staff_id = NULL` |
| `APPROVED_ASSIGNED` | `APPROVED_ASSIGNED` (new assignee) | Reassign | `assigned_staff_id`, `assigned_at` |
| `IN_PROGRESS` | `RESOLVED` | Staff resolve | `resolved_at` |
| `RESOLVED` | `CLOSED` | Approver/admin close | `closed_at` |

Every transition appends one row to **D4 (workflow_logs)**.

---

## 4. Level-2 DFD — Process 5.0 Notifications

```mermaid
flowchart LR
    P3[3.0 CR Lifecycle] -->|"CR created"| N1[5.1 Notify\nApprovers]
    P3 -->|"Approved / Rejected"| N2[5.2 Resolve\nApproval Notifs]
    P3 -->|"Returned to admin"| N3[5.3 Notify\nReassignment]
    P3 -->|"Staff assigned"| N4[5.4 Notify\nAssignee]

    N1 & N2 & N3 & N4 --> D7[(notifications)]
    D7 --> UI[Web: Bell +\nDashboard panels]
    UI -->|"PATCH read"| D7
```

| Event | Recipients | Notification status |
|-------|------------|---------------------|
| CR submitted | ADMIN, APPROVER | `PENDING_APPROVAL` |
| CR approved | ADMIN, APPROVER (update) | `APPROVED` |
| CR rejected | ADMIN, APPROVER (update) | `REJECTED` |
| CR returned by staff | ADMIN, APPROVER | `RETURNED_FOR_REASSIGN` |
| CR assigned/reassigned | Target CS_MEMBER | `ASSIGNED` |

---

## 5. Data flow — client comment visibility

```mermaid
flowchart LR
    ST[CS Staff] -->|"POST comment\nvisibility=CLIENT_VISIBLE"| API[API]
    API --> D5[(cr_comments)]
    API -->|"Filter: CLIENT role\nsees CLIENT_VISIBLE only"| WEB[Web UI]
    CL[Client] --> WEB
    ST -->|"visibility=INTERNAL"| API
    API -.->|"Hidden from client"| CL
```

---

## 6. Data flow — reporting pipeline

```mermaid
flowchart TB
    D1[(organizations)] --> RPT[6.0 Reporting]
    D3[(change_requests)] --> RPT
    RPT -->|"GET /reports/summary"| SUM[Summary KPIs]
    RPT -->|"GET /reports/overview"| OVR[Charts & trends]
    RPT -->|"GET /reports/organizations/:id"| DRILL[School drill-down]
    SUM & OVR & DRILL --> UI[Reports Page]
```

Aggregations computed at request time from MySQL — no separate analytics warehouse in MVP.

---

## 7. DFD ↔ API mapping

| DFD process | Primary API endpoints |
|-------------|----------------------|
| 1.0 Auth | `POST /api/auth/login`, `GET /api/auth/me` |
| 2.0 Org/Users | `/api/organizations/*`, `/api/users/*` |
| 3.0 CR Lifecycle | `/api/change-requests/*` |
| 4.0 Comments/Links | `POST .../comments`, `POST .../external-tickets` |
| 5.0 Notifications | `/api/notifications/*` |
| 6.0 Dashboard/Reports | `/api/dashboard/*`, `/api/reports/*` |
