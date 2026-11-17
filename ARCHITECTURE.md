# ServiSync Pro - Architecture & System Design Document

## 1. High-Level System Architecture

ServiSync Pro is an enterprise field service operations and work order management platform. The application is designed as a decoupled, multi-tier architecture with real-time capabilities.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                 │
│  React 18 SPA (Vite) + Tailwind CSS + Lucide Icons + Recharts Analytics     │
│  Context API (AuthContext, ToastContext) + Axios Interceptors (JWT Refresh) │
│  Real-Time WebSocket Client (`/ws/notifications/{user_id}`)                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API (JSON) + WebSockets
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY & ROUTING                            │
│  FastAPI (Python 3.11/3.14) + Uvicorn ASGI Server                           │
│  CORS Middleware + Global Exception Handlers + Request Rate Limiting        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
     ┌─────────────────────────────────┼─────────────────────────────────┐
     ▼                                 ▼                                 ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│   CORE BUSINESS LOGIC   │ │  SECURITY & AUTH (RBAC) │ │   DOCUMENT GENERATION   │
│ - Scheduling Engine     │ │ - JWT Access Tokens     │ │ - ReportLab Engine      │
│ - Overlap Conflict Check│ │ - Refresh Token Rotation│ │ - PDF Field Reports     │
│ - Inventory Deduction   │ │ - Bcrypt Password Hash  │ │ - Multi-Page Invoices   │
│ - Work Order Lifecycle  │ │ - Role-Based Scopes     │ │ - Media Attachments     │
└────────────┬────────────┘ └────────────┬────────────┘ └────────────┬────────────┘
             │                           │                           │
             └───────────────────────────┼───────────────────────────┘
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA PERSISTENCE LAYER                           │
│  SQLAlchemy 2.0 ORM + Alembic Schema Migrations                             │
│  PostgreSQL 16/18 with Row-Level Locking (`SELECT ... FOR UPDATE`)          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Functional Domains

### 2.1 Authentication, Token Rotation & RBAC
- **Token Strategy**:
  - `access_token`: Short-lived HS256 JWT (60 minutes default), containing user subject UUID and role claim.
  - `refresh_token`: Opaque cryptographically secure random token (256-bit entropy) hashed using SHA-256 and stored in the database.
- **Refresh Token Rotation**:
  - Every call to `/api/auth/refresh` immediately revokes the incoming token and issues a new pair.
  - Mitigates replay attacks and session hijacking.
- **Role-Based Access Control (RBAC)**:
  - 5 distinct user roles: `SUPER_ADMIN`, `OPERATIONS_MANAGER`, `DISPATCHER`, `FIELD_TECHNICIAN`, `CUSTOMER`.
  - Enforced via FastAPI dependency injection:
    `current_user = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.DISPATCHER]))`.

### 2.2 Scheduling & Technician Allocation Engine
The platform implements conflict-free scheduling taking into account:
1. **Technician Skill Matching**:
   Technicians must possess all skill sets tagged on the required service.
2. **Working Hours Verification**:
   Appointments must fall strictly within the technician's shift (e.g. 08:00 to 18:00).
3. **Leave & Unavailability Checks**:
   Queries `technician_availability` to reject bookings on approved leave or sick days.
4. **Interval Overlap Conflict Detection**:
   $$\text{Overlap} \iff \text{start}_A < \text{end}_B \quad \text{and} \quad \text{end}_A > \text{start}_B$$
   Pessimistic row locking (`with_for_update()`) guarantees no two dispatchers can simultaneously book the same technician into overlapping slots.

### 2.3 Job Execution & State Machine
Work orders follow a strictly enforced finite state machine:
```
DRAFT ──> SCHEDULED ──> ASSIGNED ──> EN_ROUTE ──> IN_PROGRESS ──> COMPLETED
  │           │            │            │               │
  └──> CANCELLED <─────────┴────────────┴───────────────┴──> ON_HOLD
                                                                 │
                                                                 └──> IN_PROGRESS
```
- Timestamps recorded at each transition (`actual_start`, `actual_end`).
- Every state change logs a record into `work_order_history` with the acting user's ID and notes.
- Terminal states (`COMPLETED`, `CANCELLED`) are protected against accidental overwriting.

### 2.4 Concurrency-Safe Parts & Inventory Management
- Available vs. Reserved quantity segregation.
- When parts are issued to a work order:
  1. Row lock acquired on `Part`.
  2. Stock availability validated.
  3. `available_quantity` decremented, `reserved_quantity` incremented.
- When work order completes:
  - `reserved_quantity` decremented, part marked `CONSUMED`.
- Support for returning unused parts back to stock.
- Low-stock threshold triggers notification events.

### 2.5 PDF Service Reports (ReportLab)
- Automated PDF report compilation upon work order completion.
- Features:
  - Company branding & Work Order metadata
  - Diagnosis & Work Summary
  - Actions Performed & Technician Recommendations
  - Itemized Parts Consumed table with unit costs and total invoice value
  - Customer remarks and digital sign-off confirmation

### 2.6 Real-Time WebSocket Notifications
- WebSocket endpoint: `/ws/notifications/{user_id}`
- Events broadcasted:
  - `SERVICE_REQUEST_CREATED`
  - `WORK_ORDER_ASSIGNED`
  - `TECHNICIAN_EN_ROUTE`
  - `JOB_COMPLETED`
  - `LOW_STOCK_ALERT`
- In-app notification bell with live counter, mark-as-read, and quick deep-linking.

---

## 3. Security Hardening
- **Password Storage**: Passwords hashed with `bcrypt` (work factor 12).
- **CORS Protection**: Origin whitelisting for trusted production domains.
- **SQL Injection Prevention**: 100% parameterized queries via SQLAlchemy 2.0 ORM.
- **File Upload Protection**: Content type validation, UUID-based file renaming, and size limits (max 10MB).
- **Audit Logging**: `audit_logs` table records user ID, IP address, entity changed, old values, and new values.
