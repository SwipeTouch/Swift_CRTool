# Requirements Documentation

## 1. Background & problem statement

Schools and colleges using Swipetouch products submit customization and support requests through fragmented channels (email, osTicket, ad-hoc calls). There is no single system to:

- Track request status end-to-end
- Enforce an approval gate before work begins
- Assign work to the correct customer-success (CS) staff member
- Separate internal notes from client-visible updates
- Measure SLA compliance and per-institution analytics

**CRMS** centralizes change requests (CRs) into a workflow-driven platform with role-based portals for clients and Swipetouch internal teams.

---

## 2. Goals & objectives

| Goal | Success measure |
|------|-----------------|
| Structured CR intake | Clients submit via web form with module, priority, description |
| Controlled approval | No work starts without approver sign-off |
| Clear ownership | Every active CR has an assignee or is in the unassigned pool |
| Transparency for clients | Clients see status and client-visible updates only |
| Operational visibility | Admin/approver dashboards, reports, SLA tracking |
| Auditability | Every status change logged with actor and timestamp |

---

## 3. Stakeholders & user roles

| Role | Actor | Primary need |
|------|-------|--------------|
| **CLIENT** | School/college designated CR raiser | Submit and track requests for their institution |
| **APPROVER** | Swipetouch approver (e.g. account manager) | Review pending CRs, approve/reject, assign staff |
| **CS_MEMBER** | Customer-success / implementation staff | Work assigned tickets, update progress, link JIRA |
| **ADMIN** | Swipetouch system administrator | Manage institutions, users, full system access |

---

## 4. Functional requirements

### 4.1 Authentication & authorization

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AUTH-01 | Users authenticate with email + password | Must |
| FR-AUTH-02 | Client users must also provide organization code at login | Must |
| FR-AUTH-03 | JWT bearer token issued on successful login (8h expiry) | Must |
| FR-AUTH-04 | All API routes enforce role-based access control (RBAC) | Must |
| FR-AUTH-05 | Inactive users cannot log in | Must |

### 4.2 Organization (institution) management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-ORG-01 | Admin creates institution with profile (name, code, city, address, contacts, SLA days) | Must |
| FR-ORG-02 | Each institution has a unique login code | Must |
| FR-ORG-03 | Admin configures up to two designated CR raisers per institution | Must |
| FR-ORG-04 | Default approver can be linked per organization | Should |
| FR-ORG-05 | Approver can view institutions (read-only edits) | Should |
| FR-ORG-06 | Admin can deactivate institutions | Should |

### 4.3 User management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-USER-01 | Admin creates internal users (ADMIN, APPROVER, CS_MEMBER) | Must |
| FR-USER-02 | Client users are created as part of institution onboarding | Must |
| FR-USER-03 | Only designated raisers can submit new CRs | Must |
| FR-USER-04 | Admin can reset passwords and deactivate users | Should |

### 4.4 Change request lifecycle

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CR-01 | Client submits CR with title, description, module, priority | Must |
| FR-CR-02 | New CR starts in `PENDING_APPROVAL` status | Must |
| FR-CR-03 | SLA due date computed from institution SLA days on creation | Must |
| FR-CR-04 | Approver/admin approves and assigns CS staff | Must |
| FR-CR-05 | Approver/admin can reject with reason | Must |
| FR-CR-06 | Assigned staff starts work → `IN_PROGRESS` | Must |
| FR-CR-07 | Staff marks CR resolved → `RESOLVED` | Must |
| FR-CR-08 | Approver/admin closes resolved CR → `CLOSED` | Must |
| FR-CR-09 | CS staff can return wrongly assigned CR to admin with notes | Must |
| FR-CR-10 | Admin/approver can reassign returned/unassigned CRs | Must |
| FR-CR-11 | All transitions recorded in workflow audit log | Must |

### 4.5 Comments & external tickets

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-COM-01 | Internal staff add comments with INTERNAL or CLIENT_VISIBLE visibility | Must |
| FR-COM-02 | Clients see only CLIENT_VISIBLE comments on their CRs | Must |
| FR-COM-03 | Staff can link JIRA, osTicket, or other external ticket IDs | Must |

### 4.6 Notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-NOTIF-01 | Admin/approver notified when new CR submitted | Must |
| FR-NOTIF-02 | Notification status updates on approve/reject | Must |
| FR-NOTIF-03 | Admin/approver notified when staff returns CR for reassignment | Must |
| FR-NOTIF-04 | CS staff notified when CR assigned/reassigned to them | Must |
| FR-NOTIF-05 | Unread notification count shown in header bell | Should |

### 4.7 Dashboards & reporting

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DASH-01 | Role-specific dashboard KPIs on login | Must |
| FR-DASH-02 | Admin/approver dashboard with charts, SLA, pending queue | Must |
| FR-DASH-03 | CS staff dashboard with queue charts and assignment panel | Should |
| FR-RPT-01 | Reports: summary, overview, per-organization drill-down | Must |
| FR-RPT-02 | Per-school CR grid with search, sort, pagination | Should |
| FR-RPT-03 | Module-level analytics | Should |

### 4.8 Change request list

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-LIST-01 | Paginated CR list scoped by role | Must |
| FR-LIST-02 | Search by title, module, client name | Should |
| FR-LIST-03 | Sort by multiple columns | Should |
| FR-LIST-04 | Export filtered list to XLS | Should |

---

## 5. Non-functional requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | **Performance:** List and dashboard pages load within 3s on typical broadband |
| NFR-02 | **Security:** Passwords stored as bcrypt hashes (cost factor 12) |
| NFR-03 | **Security:** JWT secret configurable via environment variable |
| NFR-04 | **Availability:** Stateless API suitable for horizontal scaling behind reverse proxy |
| NFR-05 | **Data integrity:** Foreign keys enforce referential integrity; workflow transitions validated server-side |
| NFR-06 | **Audit:** Workflow log immutable append-only trail per CR |
| NFR-07 | **Compatibility:** MySQL 8+, modern browsers (Chrome, Firefox, Safari, Edge) |
| NFR-08 | **Maintainability:** Monorepo with shared TypeScript; Prisma ORM for schema management |
| NFR-09 | **Localization:** English UI; dates in locale format via dayjs |
| NFR-10 | **Deployment:** Static React build + Node API; target VPS/Plesk hosting |

---

## 6. User stories (selected)

### Client

> **As a** designated CR raiser at a school  
> **I want to** submit a change request with module and priority  
> **So that** Swipetouch can track and deliver the customization formally.

**Acceptance:** Form validates required fields; CR appears as Pending approval; client cannot see internal comments.

### Approver

> **As an** approver  
> **I want to** see a queue of pending CRs with notifications  
> **So that** I can approve valid requests and assign the right staff member.

**Acceptance:** Pending CRs listed; approve requires staff selection; approver and admin receive notifications.

### CS Staff

> **As a** CS team member  
> **I want to** return a ticket to admin if it was assigned to the wrong SME  
> **So that** it can be reassigned without losing context.

**Acceptance:** Return requires reason; ticket enters unassigned pool; admin notified; reassignment notifies new assignee.

### Admin

> **As an** administrator  
> **I want to** onboard a new institution with profile and two raisers  
> **So that** the client can log in and raise CRs immediately.

**Acceptance:** Institution created with unique code; raisers can log in with org code + email + password.

---

## 7. Out of scope (Phase 2+)

- File attachments on CRs
- WhatsApp / SMS notifications
- AI-based categorization or priority suggestion
- Multi-level approval chains
- Billing or time-tracking integration
- Mobile native apps
- SSO / OAuth (Google, Microsoft)

---

## 8. Constraints & assumptions

- One Swipetouch deployment serves multiple client institutions (multi-tenant by `organization_id`).
- Email delivery is console/log in MVP (`EMAIL_PROVIDER=console`); SMTP configurable for production.
- External JIRA/osTicket links are references only — no API sync in MVP.
- Single default approver per organization; reassignment handled manually.

---

## 9. Traceability matrix (requirements → modules)

| Requirement area | API routes | Web modules |
|------------------|------------|-------------|
| Auth | `/api/auth/*` | `LoginPage`, `AuthContext` |
| Organizations | `/api/organizations/*` | `OrganizationsPage`, `OrganizationDetailPage` |
| Users | `/api/users/*` | `UsersPage` |
| Change requests | `/api/change-requests/*` | `ChangeRequest*Page` |
| Dashboard | `/api/dashboard/*` | `DashboardPage`, `AdminDashboard`, `StaffDashboard` |
| Reports | `/api/reports/*` | `ReportsPage`, `ClientReportDetailPage` |
| Notifications | `/api/notifications/*` | `NotificationBell`, notification panels |
