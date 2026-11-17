# Entity-Relationship Architecture & Database Schema

## 1. System Overview
The **ServiSync Pro** platform is engineered with a relational PostgreSQL database schema. The architecture guarantees:
- **Strict Referential Integrity**: Foreign keys with indexed lookup constraints.
- **Race Condition Immunity**: Pessimistic row-level locking (`SELECT ... FOR UPDATE`) during technician assignment and inventory deduction.
- **Auditing & Traceability**: Work order status state transitions, technician assignment logs, and security events are stored immutably.

---

## 2. Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ REFRESH_TOKENS : "issues"
    USERS ||--o| TECHNICIANS : "identifies"
    USERS ||--o| CUSTOMERS : "authenticates"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ AUDIT_LOGS : "triggers"

    CUSTOMERS ||--o{ SERVICE_REQUESTS : "creates"
    CUSTOMERS ||--o{ WORK_ORDERS : "receives"
    CUSTOMERS ||--o{ FEEDBACK : "submits"

    SERVICES ||--o{ SERVICE_REQUESTS : "categorizes"
    SERVICES ||--o{ WORK_ORDERS : "defines"
    SERVICES ||--o{ SERVICE_PARTS : "requires"
    SERVICES ||--o{ SERVICE_SKILLS : "mandates"

    TECHNICIANS ||--o{ TECHNICIAN_AVAILABILITY : "logs"
    TECHNICIANS ||--o{ TECHNICIAN_SKILLS : "possesses"
    TECHNICIANS ||--o{ WORK_ORDERS : "executes"
    TECHNICIANS ||--o{ SERVICE_REPORTS : "authors"

    SERVICE_REQUESTS ||--o| WORK_ORDERS : "converts_to"
    SERVICE_REQUESTS ||--o{ SERVICE_REQUEST_ATTACHMENTS : "includes"

    WORK_ORDERS ||--o{ WORK_ORDER_HISTORY : "tracks"
    WORK_ORDERS ||--o{ WORK_ORDER_PARTS : "consumes"
    WORK_ORDERS ||--o{ SERVICE_REPORTS : "documents"
    WORK_ORDERS ||--o| FEEDBACK : "receives"

    PARTS ||--o{ WORK_ORDER_PARTS : "supplies"
    PARTS ||--o{ SERVICE_PARTS : "allocated_in"

    SERVICE_REPORTS ||--o{ SERVICE_REPORT_ATTACHMENTS : "attaches"

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string role
        string phone
        boolean is_active
        timestamp created_at
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        timestamp expires_at
        boolean revoked
        timestamp created_at
    }

    CUSTOMERS {
        uuid id PK
        uuid user_id FK
        string name
        string email
        string phone
        string customer_type
        string address
        string city
        string state
        string postal_code
        string service_location
        string status
        timestamp created_at
    }

    TECHNICIANS {
        uuid id PK
        uuid user_id FK
        string assigned_region
        string employment_status
        string availability_status
        time work_start_time
        time work_end_time
        timestamp created_at
    }

    TECHNICIAN_SKILLS {
        uuid id PK
        uuid technician_id FK
        string skill_name
    }

    TECHNICIAN_AVAILABILITY {
        uuid id PK
        uuid technician_id FK
        timestamp start_time
        timestamp end_time
        string status
        string reason
    }

    SERVICES {
        uuid id PK
        string name
        string category
        string description
        integer estimated_duration
        decimal base_price
        string status
        timestamp created_at
    }

    SERVICE_SKILLS {
        uuid id PK
        uuid service_id FK
        string skill_name
    }

    SERVICE_PARTS {
        uuid id PK
        uuid service_id FK
        uuid part_id FK
        integer default_quantity
    }

    SERVICE_REQUESTS {
        uuid id PK
        string request_number UK
        uuid customer_id FK
        uuid service_id FK
        string title
        text description
        string priority
        string service_location
        string status
        timestamp preferred_time
        text cancellation_reason
        timestamp created_at
    }

    SERVICE_REQUEST_ATTACHMENTS {
        uuid id PK
        uuid service_request_id FK
        string file_name
        string file_path
        string mime_type
        integer file_size
        timestamp created_at
    }

    WORK_ORDERS {
        uuid id PK
        string work_order_number UK
        uuid service_request_id FK
        uuid customer_id FK
        uuid service_id FK
        uuid assigned_technician_id FK
        string status
        string priority
        text description
        string service_location
        timestamp scheduled_start
        timestamp scheduled_end
        timestamp actual_start
        timestamp actual_end
        decimal estimated_cost
        decimal actual_cost
        text customer_notes
        text internal_notes
        text cancellation_reason
        timestamp created_at
        timestamp updated_at
    }

    WORK_ORDER_HISTORY {
        uuid id PK
        uuid work_order_id FK
        string old_status
        string new_status
        uuid changed_by_id FK
        text notes
        timestamp changed_at
    }

    PARTS {
        uuid id PK
        string sku UK
        string name
        text description
        string category
        integer available_quantity
        integer reserved_quantity
        decimal unit_cost
        integer reorder_threshold
        string status
        timestamp created_at
    }

    WORK_ORDER_PARTS {
        uuid id PK
        uuid work_order_id FK
        uuid part_id FK
        integer quantity
        decimal unit_cost
        string status
        timestamp created_at
    }

    SERVICE_REPORTS {
        uuid id PK
        uuid work_order_id FK
        uuid technician_id FK
        text work_summary
        text diagnosis
        text actions_performed
        timestamp start_time
        timestamp completion_time
        text customer_remarks
        text recommendations
        string pdf_report_path
        timestamp created_at
    }

    SERVICE_REPORT_ATTACHMENTS {
        uuid id PK
        uuid service_report_id FK
        string file_name
        string file_path
        string mime_type
        integer file_size
        string attachment_type
        timestamp created_at
    }

    FEEDBACK {
        uuid id PK
        uuid work_order_id FK
        uuid customer_id FK
        integer rating
        integer timeliness_rating
        integer quality_rating
        integer technician_rating
        text comments
        timestamp created_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        string title
        text message
        string notification_type
        string link_url
        boolean is_read
        timestamp created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        string action
        string entity_name
        string entity_id
        jsonb old_values
        jsonb new_values
        string ip_address
        timestamp created_at
    }
```

---

## 3. Concurrency & Integrity Mechanics

### 3.1 Overlap Prevention Algorithm
Technician assignment checks the mathematical condition:
$$\text{Overlap} \iff \max(\text{start}_A, \text{start}_B) < \min(\text{end}_A, \text{end}_B)$$
Equivalently:
$$\text{start}_A < \text{end}_B \quad \text{and} \quad \text{end}_A > \text{start}_B$$
Query executed with pessimistic locking:
```python
conflicts = db.query(WorkOrder).filter(
    WorkOrder.assigned_technician_id == tech_id,
    WorkOrder.status.in_([WorkOrderStatus.SCHEDULED.value, WorkOrderStatus.ASSIGNED.value, WorkOrderStatus.IN_PROGRESS.value]),
    WorkOrder.scheduled_start < new_end,
    WorkOrder.scheduled_end > new_start
).with_for_update().all()
```

### 3.2 Inventory Race Condition Prevention
When a technician issues parts on site:
```python
part = db.query(Part).filter(Part.id == part_id).with_for_update().first()
if part.available_quantity < requested_qty:
    raise InsufficientInventoryException("Stock depleted")
part.available_quantity -= requested_qty
part.reserved_quantity += requested_qty
```
This guarantees zero negative inventory anomalies under high transaction volume.
