# ServiSync Pro - Field Service Operations & Work Order Management Platform

An enterprise-grade, full-stack application engineered with **React 18**, **FastAPI**, **PostgreSQL**, **Tailwind CSS**, and **SQLAlchemy**. Designed for organizations delivering on-site installation, maintenance, repair, and inspection services.

---

## 🌟 Key Functional Features

- **5 User Roles & RBAC**:
  - 👑 **Super Admin**: System configuration, service catalog pricing, user accounts, and security audit logs.
  - 📊 **Operations Manager**: Team utilization KPIs, revenue variances, inventory management, and CSV reporting.
  - 🗓️ **Dispatcher**: Interactive visual schedule board, technician assignment, skill matching, and conflict avoidance.
  - 🔧 **Field Technician**: Real-time job execution (Start / Hold / Resume / Complete), parts consumption, and PDF service reports.
  - 👤 **Customer**: Request creation, appointment tracking, service history, and verified 5-star feedback ratings.
- **Conflict-Free Scheduling Engine**:
  - Mathematical interval overlap detection ($\text{start}_A < \text{end}_B \land \text{end}_A > \text{start}_B$).
  - Technician working hours validation and approved leave checks.
  - Pessimistic row locking (`with_for_update()`) to prevent concurrent double-booking.
- **Inventory & Parts Management**:
  - Live stock tracking (Available vs Reserved).
  - Concurrency-safe parts reservation, consumption, and return workflows.
  - Low-stock threshold notifications.
- **Automated PDF Service Reports**:
  - Built-in ReportLab engine generating downloadable PDF service reports with itemized costs and customer sign-off.
- **Real-Time WebSockets**:
  - Live notification alerts for dispatch updates, job milestones, and inventory warnings.
- **Executive Analytics & Reporting**:
  - Recharts visual metrics, date-range filtering, and instant CSV downloads.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS, Lucide Icons, Recharts, Axios |
| **Backend** | Python 3.11+, FastAPI, Pydantic v2, Uvicorn, ReportLab (PDF) |
| **Database** | PostgreSQL 16+, SQLAlchemy 2.0 ORM, Alembic Migrations |
| **Security** | JWT Access Tokens, Refresh Token Rotation, Bcrypt Hashing, Role Dependencies |
| **Testing** | Pytest, HTTPX, Vitest |
| **DevOps** | Docker, Docker Compose, Nginx Reverse Proxy |

---

## 🔑 Pre-Seeded Evaluation Accounts

The platform includes demo credentials for all 5 roles. You can also use the **1-Click Demo Fill buttons** on the login page.

| Role | Email | Password | Primary Permissions |
|---|---|---|---|
| **Super Admin** | `admin@servisync.com` | `Admin@123` | Full access, user admin, catalog pricing, audits |
| **Operations Manager** | `manager@servisync.com` | `Manager@123` | Performance analytics, CSV exports, inventory |
| **Dispatcher** | `dispatcher@servisync.com` | `Dispatcher@123` | Dispatch board, technician scheduling, triage |
| **Field Technician** | `tech.alex@servisync.com` | `Tech@123` | Mobile-ready execution, parts usage, reports |
| **Customer** | `customer.john@example.com` | `Customer@123` | Service requests, tracking, PDF download, reviews |

---

## 🚀 Quick Start with Docker Compose

Ensure Docker and Docker Compose are installed:

```bash
# Clone the repository and navigate to root directory
cd "Field Service Operations & Work Order Management Platform"

# Build and start all services (Postgres, FastAPI Backend, React Frontend)
docker-compose up --build
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **FastAPI REST API**: [http://localhost:8000/api](http://localhost:8000/api)
- **Swagger Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc API Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 💻 Manual Local Development Setup

### 1. Backend Setup

```bash
cd Backend

# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure .env (ensure PostgreSQL is running locally)
# Copy example if needed or edit .env:
# DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/field_service_ops

# Run Alembic migrations
alembic upgrade head

# Seed initial evaluation data (demo users, services, technicians, inventory)
python -m app.core.seed_data

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd Frontend

# Install node dependencies
npm install

# Start Vite development server
npm run dev
# The application will launch on http://localhost:5173 (proxied to backend on port 8000)
```

---

## 🧪 Automated Testing

### Backend Unit & Integration Tests (Pytest)
```bash
cd Backend
pytest
# Output: 10 passed in ~4s
```

### Frontend Unit & Logic Tests (Vitest)
```bash
cd Frontend
npm test
# Output: 4 test suites passed, 15 tests passed
```

### Frontend Production Build Verification
```bash
cd Frontend
npm run build
# Compiles minified production bundle in dist/
```

---

## 📑 Postman Collection

A Postman collection is included in the project root:
- [`Postman_Collection.json`](./Postman_Collection.json)

**How to use:**
1. Open Postman -> Click **Import** -> Select `Postman_Collection.json`.
2. Set the `base_url` variable to `http://localhost:8000/api`.
3. Run the **Login (Super Admin)** request. The collection test script automatically saves the `access_token` and `refresh_token` variables for subsequent requests.

---

## 📐 Architecture & ER Diagrams

- Complete relational database schema and Mermaid ER diagrams: [`ER_DIAGRAM.md`](./ER_DIAGRAM.md)
- In-depth architectural design, concurrency controls, and security model: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
