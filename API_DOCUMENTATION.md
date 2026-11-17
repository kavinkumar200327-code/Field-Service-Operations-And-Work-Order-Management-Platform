# ServiSync Pro - REST API Specification & Developer Guide

## 1. Architectural Overview & Conventions

The **ServiSync Pro API** is built on **FastAPI** (Python 3.11+) and delivers high-throughput, type-safe field service operations management.

### Base URL
- **Local Development**: `http://localhost:8000/api`
- **Docker Compose**: `http://localhost:8000/api`
- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Technical Schema**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 2. Authentication & Authorization (RBAC)

All private endpoints require an `Authorization` header containing a valid JSON Web Token:
```http
Authorization: Bearer <access_token>
```

### Role-Based Access Scopes
| Role | Identifier | Permissions & Capabilities |
|---|---|---|
| **Super Admin** | `SUPER_ADMIN` | Full administrative control, user provisioning, rate matrix updates, audit inspection. |
| **Operations Manager** | `OPERATIONS_MANAGER` | Financial reports, technician utilization, inventory management, CSV analytics. |
| **Dispatcher** | `DISPATCHER` | Dispatch board, technician slot allocation, conflict-free scheduling, request triage. |
| **Field Technician** | `FIELD_TECHNICIAN` | Mobile job lifecycle execution, parts issuance, service report authorship. |
| **Customer** | `CUSTOMER` | Service requests, live appointment tracking, PDF downloads, 5-star ratings. |

---

## 3. Standard Response Envelope

All JSON responses follow a uniform contract via the generic `APIResponse[T]` schema:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "error": null,
  "timestamp": "2026-11-17T17:30:00Z"
}
```

In the event of an error:
```json
{
  "success": false,
  "data": null,
  "message": null,
  "error": {
    "code": "TECH_SCHEDULE_CONFLICT",
    "message": "Technician Alex Mercer is already committed to WO-2026-004 between 10:00 and 12:00."
  },
  "timestamp": "2026-11-17T17:30:00Z"
}
```

---

## 4. Complete Endpoints Reference

### 4.1 Authentication & Session (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates credentials and returns JWT access + refresh tokens. |
| `POST` | `/api/auth/register` | Public | Customer registration with profile creation. |
| `POST` | `/api/auth/refresh` | Public | Rotates refresh token and issues fresh access token. |
| `GET` | `/api/auth/me` | Authenticated | Retrieves current logged-in user profile and permissions. |
| `PUT` | `/api/auth/profile` | Authenticated | Updates current user profile details (name, email, phone). |
| `POST` | `/api/auth/change-password` | Authenticated | Changes user account password with current verification. |
| `POST` | `/api/auth/logout` | Authenticated | Revokes the active refresh token. |

#### Login Request Payload
```json
{
  "email": "admin@servisync.com",
  "password": "Admin@123"
}
```

---

### 4.2 Work Orders (`/api/work-orders`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/work-orders` | Staff / Customer | List work orders with pagination, status, priority, and date filters. |
| `POST` | `/api/work-orders` | Staff / Dispatcher | Create a new work order with validation. |
| `GET` | `/api/work-orders/{id}` | Authenticated | Fetch comprehensive work order details, history, and parts consumed. |
| `PUT` | `/api/work-orders/{id}` | Staff / Dispatcher | Update work order metadata and scope. |
| `POST` | `/api/work-orders/{id}/assign` | Dispatcher / Admin | Assigns a technician with conflict-free slot validation. |
| `POST` | `/api/work-orders/{id}/start` | Technician / Admin | Transition status to `IN_PROGRESS` and stamps `actual_start`. |
| `POST` | `/api/work-orders/{id}/hold` | Technician / Admin | Places order `ON_HOLD` with reason notes. |
| `POST` | `/api/work-orders/{id}/resume` | Technician / Admin | Resumes paused order back to `IN_PROGRESS`. |
| `POST` | `/api/work-orders/{id}/complete` | Technician / Admin | Finalizes order, settles costs, releases locks. |
| `POST` | `/api/work-orders/{id}/cancel` | Dispatcher / Admin | Cancels order and releases reserved parts. |
| `POST` | `/api/work-orders/{id}/parts` | Technician / Admin | Issues and deducts inventory parts from warehouse stock. |

---

### 4.3 Scheduling & Interactive Dispatch Board (`/api/schedule`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/schedule` | Staff | Returns calendar events within date ranges with technician filtering. |
| `GET` | `/api/schedule/dispatch-board` | Dispatcher / Admin | Real-time technician timelines, current assignments, and workload metrics. |
| `GET` | `/api/schedule/technicians/availability` | Dispatcher / Admin | Verifies available working hours, region, and existing bookings. |
| `POST` | `/api/schedule/leaves` | Admin / Manager | Logs technician planned time off / vacation. |

---

### 4.4 Technicians Roster (`/api/technicians`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/technicians` | Staff | List all technicians with status, region, and efficiency ratings. |
| `GET` | `/api/technicians/{id}` | Staff | Detailed technician profile, certified skills, and vehicle stock. |
| `POST` | `/api/technicians/{id}/skills` | Admin / Manager | Assigns specialized skill badges (HVAC, Electrical, Plumbing, Fiber). |
| `PUT` | `/api/technicians/{id}/status` | Admin / Self | Updates status (`AVAILABLE`, `ON_JOB`, `ON_LEAVE`, `OFFLINE`). |

---

### 4.5 Service Catalog & Rates (`/api/services`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/services` | Public / Auth | List available maintenance services, pricing, and required duration. |
| `POST` | `/api/services` | Admin / Manager | Creates a service offering with base price and required skill tags. |
| `GET` | `/api/services/categories` | Public / Auth | List high-level service domains. |
| `PUT` | `/api/services/{id}` | Admin / Manager | Updates pricing matrices and labor estimates. |

---

### 4.6 Parts Inventory Management (`/api/parts`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/parts` | Staff | List inventory items, available vs reserved counts, and reorder alerts. |
| `POST` | `/api/parts` | Admin / Manager | Creates a new SKU entry in the parts registry. |
| `GET` | `/api/parts/{id}` | Staff | Part specifications, suppliers, and transaction ledger. |
| `POST` | `/api/parts/{id}/adjust` | Admin / Manager | Restock or reconcile physical warehouse stock with audit trail. |

---

### 4.7 PDF Service Reports & Downloads (`/api/reports`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/reports` | Authenticated | List finalized service reports. |
| `POST` | `/api/reports` | Technician / Admin | Submits a completed field report with customer sign-off notes. |
| `GET` | `/api/reports/{id}` | Authenticated | Fetch report details, parts breakdown, and technician summary. |
| `GET` | `/api/reports/{id}/download` | Authenticated | **Streams dynamic ReportLab PDF binary (`application/pdf`)** for physical print and archiving. |

---

### 4.8 Customer Feedback & Ratings (`/api/feedback`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/feedback` | Staff | List verified customer reviews and NPS metrics. |
| `POST` | `/api/feedback` | Customer | Submits 1-to-5 star rating with comments on a completed work order. |
| `GET` | `/api/feedback/work-order/{id}` | Authenticated | Checks if review has already been submitted for a work order. |

---

### 4.9 Executive Dashboards & Analytics (`/api/analytics`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/analytics/dashboards/super-admin` | Super Admin | System health, tenant logs, service rate overview. |
| `GET` | `/api/analytics/dashboards/operations` | Manager / Admin | Revenue actual vs estimated, completion trends, SLA rates. |
| `GET` | `/api/analytics/dashboards/dispatcher` | Dispatcher / Admin | Unassigned queues, today's schedule, technician workloads. |
| `GET` | `/api/analytics/dashboards/technician` | Technician / Admin | Assigned jobs, active work order timer, daily appointment agenda. |
| `GET` | `/api/analytics/dashboards/customer` | Customer / Admin | Active orders, past service reports, feedback ratings. |
| `GET` | `/api/analytics/reports/work-orders` | Manager / Admin | Work order report with JSON or CSV export option (`?format=csv`). |
| `GET` | `/api/analytics/reports/technician-performance` | Manager / Admin | Technician efficiency and jobs completed CSV export. |
| `GET` | `/api/analytics/reports/parts-consumption` | Manager / Admin | Inventory usage and expenditure CSV export. |

---

### 4.10 Real-Time Notifications & WebSockets (`/api/notifications`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Authenticated | List user notifications with unread count. |
| `PUT` | `/api/notifications/{id}/read` | Authenticated | Marks a single notification as read. |
| `POST` | `/api/notifications/read-all` | Authenticated | Marks all unread alerts as read. |
| `WS` | `/api/notifications/ws/{user_id}` | Authenticated | WebSocket stream for live dispatch alerts and system banners. |
