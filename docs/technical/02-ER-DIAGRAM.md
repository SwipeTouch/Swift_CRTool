# Entity-Relationship Diagram

**Schema source:** `apps/api/prisma/schema.prisma`  
**Database:** MySQL 8, InnoDB, `utf8mb4_unicode_ci`

---

## 1. ER diagram (conceptual)

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ SYSTEM_USERS : "has client users"
    ORGANIZATIONS ||--o{ CHANGE_REQUESTS : "raises"
    ORGANIZATIONS }o--o| SYSTEM_USERS : "default approver"

    SYSTEM_USERS ||--o{ CHANGE_REQUESTS : "requested_by"
    SYSTEM_USERS ||--o{ CHANGE_REQUESTS : "approver"
    SYSTEM_USERS ||--o{ CHANGE_REQUESTS : "assigned_staff"
    SYSTEM_USERS ||--o{ WORKFLOW_LOGS : "triggered_by"
    SYSTEM_USERS ||--o{ CR_COMMENTS : "author"
    SYSTEM_USERS ||--o{ NOTIFICATIONS : "recipient"
    SYSTEM_USERS ||--o{ NOTIFICATIONS : "acted_by"

    CHANGE_REQUESTS ||--o{ WORKFLOW_LOGS : "audit trail"
    CHANGE_REQUESTS ||--o{ CR_COMMENTS : "has"
    CHANGE_REQUESTS ||--o{ EXTERNAL_TICKET_LINKS : "links"
    CHANGE_REQUESTS ||--o{ NOTIFICATIONS : "triggers"

    ORGANIZATIONS {
        char36 id PK
        varchar name
        varchar code UK
        varchar segment
        varchar country
        varchar city
        text address
        varchar contact_phone
        varchar contact_email
        varchar primary_contact_name
        int sla_days
        enum status "active|inactive"
        char36 default_approver_id FK
        datetime created_at
        datetime updated_at
    }

    SYSTEM_USERS {
        char36 id PK
        varchar email UK
        varchar password_hash
        enum role "CLIENT|APPROVER|CS_MEMBER|ADMIN"
        char36 organization_id FK
        varchar full_name
        boolean is_designated_raiser
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    CHANGE_REQUESTS {
        char36 id PK
        char36 organization_id FK
        char36 requested_by_id FK
        char36 approver_id FK
        char36 assigned_staff_id FK
        varchar title
        text description
        varchar module_affected
        enum status
        enum priority
        text rejection_reason
        datetime approved_at
        datetime assigned_at
        datetime resolved_at
        datetime closed_at
        datetime sla_due_at
        datetime created_at
        datetime updated_at
    }

    WORKFLOW_LOGS {
        char36 id PK
        char36 change_request_id FK
        char36 triggered_by_id FK
        varchar previous_status
        varchar new_status
        text action_note
        datetime logged_at
    }

    CR_COMMENTS {
        char36 id PK
        char36 change_request_id FK
        char36 author_id FK
        text content
        enum visibility "INTERNAL|CLIENT_VISIBLE"
        datetime created_at
    }

    EXTERNAL_TICKET_LINKS {
        char36 id PK
        char36 change_request_id FK
        enum system "JIRA|OSTICKET|OTHER"
        varchar external_id
        varchar url
        char36 linked_by_id
        datetime created_at
    }

    NOTIFICATIONS {
        char36 id PK
        char36 user_id FK
        char36 change_request_id FK
        enum status
        boolean is_read
        char36 acted_by_id FK
        datetime acted_at
        datetime created_at
        datetime updated_at
    }
```

---

## 2. Entity descriptions

### organizations

Represents a client institution (school, college). The `code` field is used at client login together with email.

| Column | Description |
|--------|-------------|
| `sla_days` | Default SLA window for new CRs (days from creation) |
| `default_approver_id` | Optional link to approver user |
| `status` | `active` institutions can raise CRs |

### system_users

All login accounts. Internal users have `organization_id = NULL`. Client users belong to one organization.

| Column | Description |
|--------|-------------|
| `is_designated_raiser` | Only `true` client users may submit new CRs |
| `role` | Determines portal access and API permissions |

### change_requests

Master ledger of all change requests.

| Status enum | Meaning |
|-------------|---------|
| `PENDING_APPROVAL` | Awaiting approver decision |
| `APPROVED_ASSIGNED` | Approved; may have assignee or be in unassigned pool |
| `IN_PROGRESS` | Staff actively working |
| `RESOLVED` | Work done; awaiting close |
| `REJECTED` | Terminal — rejected by approver |
| `CLOSED` | Terminal — formally closed |

| Priority enum | Values |
|---------------|--------|
| `priority` | LOW, MEDIUM, HIGH, URGENT |

### workflow_logs

Append-only audit of every status transition. `action_note` captures rejection reasons, return-to-admin notes, reassignment context.

### cr_comments

Discussion thread on a CR. Visibility enforced at API and UI layer.

### external_ticket_links

Reference to JIRA, osTicket, or other external systems — not a live sync.

### notifications

Per-user inbox tied to a CR. Status drives UI labels (pending, approved, returned, assigned).

| Notification status | Meaning |
|---------------------|---------|
| `PENDING_APPROVAL` | CR awaiting approver action |
| `APPROVED` | CR was approved (inbox resolved) |
| `REJECTED` | CR was rejected |
| `RETURNED_FOR_REASSIGN` | Staff returned CR; admin must reassign |
| `ASSIGNED` | CR assigned/reassigned to this staff member |

**Unique constraint:** `(user_id, change_request_id)` — one notification row per user per CR.

---

## 3. Relationship cardinality

| From | To | Cardinality | On delete |
|------|-----|-------------|-----------|
| Organization | User (clients) | 1:N | SET NULL |
| Organization | ChangeRequest | 1:N | RESTRICT |
| User | ChangeRequest (requested) | 1:N | RESTRICT |
| User | ChangeRequest (assigned) | 1:N | SET NULL |
| ChangeRequest | WorkflowLog | 1:N | CASCADE |
| ChangeRequest | CrComment | 1:N | CASCADE |
| ChangeRequest | Notification | 1:N | CASCADE |
| User | Notification | 1:N | CASCADE |

---

## 4. Indexes (performance)

| Table | Index | Purpose |
|-------|-------|---------|
| `change_requests` | `(organization_id, created_at)` | Client history, reports |
| `change_requests` | `(status)` | Queue dashboards |
| `change_requests` | `(assigned_staff_id, status)` | Staff workload |
| `workflow_logs` | `(change_request_id, logged_at)` | Timeline display |
| `notifications` | `(user_id, status, is_read)` | Bell badge count |
| `system_users` | `(role, is_active)` | Staff picker, notifications |

---

## 5. Physical table map

Prisma `@map` names (MySQL table names):

| Prisma model | MySQL table |
|--------------|-------------|
| Organization | `organizations` |
| User | `system_users` |
| ChangeRequest | `change_requests` |
| WorkflowLog | `workflow_logs` |
| CrComment | `cr_comments` |
| ExternalTicketLink | `external_ticket_links` |
| Notification | `notifications` |

Full DDL + demo data: [`docs/sql/crms-full-import.sql`](../sql/crms-full-import.sql)

---

## 6. ER diagram (simplified — core entities only)

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : employs
    ORGANIZATION ||--o{ CHANGE_REQUEST : owns
    USER ||--o{ CHANGE_REQUEST : submits
    USER ||--o{ CHANGE_REQUEST : assigned_to
    CHANGE_REQUEST ||--o{ WORKFLOW_LOG : logs
    CHANGE_REQUEST ||--o{ COMMENT : has
    CHANGE_REQUEST ||--o{ NOTIFICATION : alerts
```
