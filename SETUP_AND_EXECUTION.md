# ServiSync Pro - Setup & Execution Guide

This document provides step-by-step instructions for configuring, launching, evaluating, and testing the **Field Service Operations & Work Order Management Platform** on **Windows**, **macOS/Linux**, and **Docker**.

---

## 1. System Requirements

- **Python**: 3.11 or higher (Python 3.11 - 3.14 supported)
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **PostgreSQL**: v15.0 or higher (or Docker)
- **Docker & Docker Compose** *(Optional, for containerized run)*

---

## 2. Option A: 1-Click Containerized Run (Docker Compose)

The easiest way to boot the complete ecosystem (PostgreSQL 16, FastAPI Backend, and React Vite Frontend) is with Docker Compose:

```bash
# 1. Open a terminal and navigate to the project root
cd "Field Service Operations & Work Order Management Platform"

# 2. Build and launch containers
docker-compose up --build
```

### Active Service Endpoints:
- **Web Frontend**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend API**: [http://localhost:8000/api](http://localhost:8000/api)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL Database**: `localhost:5432` (`field_service_ops`)

---

## 3. Option B: Manual Local Setup (Windows & macOS/Linux)

### Step 3.1: PostgreSQL Database Initialization
Ensure PostgreSQL is running locally, then create the database:
```sql
CREATE DATABASE field_service_ops;
CREATE DATABASE field_service_ops_test;
```

---

### Step 3.2: Backend API Setup

1. **Navigate to the Backend directory**:
   ```bash
   cd Backend
   ```

2. **Create and activate a Python virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   # Windows:
   copy .env.example .env
   # Linux/macOS:
   cp .env.example .env
   ```
   *Verify that `DATABASE_URL` in `.env` matches your PostgreSQL username and password.*

5. **Apply Database Migrations (Alembic)**:
   ```bash
   python -m alembic upgrade head
   ```

6. **Seed Initial Demo Evaluation Data**:
   Populates users, services, technicians, inventory parts, and sample work orders:
   ```bash
   python -m app.core.seed_data
   ```

7. **Start the FastAPI Backend Server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   *The backend will be available at [http://localhost:8000](http://localhost:8000).*

---

### Step 3.3: Frontend Application Setup

1. **Open a new terminal and navigate to the Frontend directory**:
   ```bash
   cd Frontend
   ```

2. **Install Node dependencies**:
   ```bash
   # Windows (use npm.cmd if PowerShell script execution is restricted):
   npm.cmd install
   # Linux / macOS:
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   # Windows:
   copy .env.example .env
   # Linux/macOS:
   cp .env.example .env
   ```

4. **Start the Vite Development Server**:
   ```bash
   npm.cmd run dev
   # Or on Linux/macOS:
   npm run dev
   ```
   *The frontend application will launch at [http://localhost:3000](http://localhost:3000).*

---

## 4. Automated Testing Suites

Both backend and frontend automated test suites can be executed independently.

### 4.1 Backend Automated Tests (Pytest)
Executes unit tests, authentication JWT flows, work order state machines, and binary PDF report generation:
```bash
cd Backend
python -m pytest tests/ -v
```
**Expected Output**: `12 passed in ~5s` (100% pass rate).

### 4.2 Frontend Automated Tests (Vitest)
Executes unit tests covering RBAC permissions, scheduling algorithms, and status lifecycles:
```bash
cd Frontend
npm.cmd test
# Or on Linux/macOS:
npm test
```
**Expected Output**: `4 test files passed, 15 tests passed`.

### 4.3 Frontend Production Build Check
Verifies bundle optimization and compilation without errors:
```bash
cd Frontend
npm.cmd run build
```

---

## 5. Evaluation & Demo Accounts

Use the **1-Click Demo Fill buttons** on the login page or enter credentials manually:

| Role | Email | Password | Primary Workflow |
|---|---|---|---|
| **Super Admin** | `admin@servisync.com` | `Admin@123` | Platform governance, rates, user admin, audits |
| **Operations Manager** | `manager@servisync.com` | `Manager@123` | Financial KPI dashboards, CSV exports, inventory |
| **Dispatcher** | `dispatcher@servisync.com` | `Dispatcher@123` | Interactive dispatch board, slot scheduling |
| **Field Technician** | `tech.alex@servisync.com` | `Tech@123` | Job start/hold/complete, parts, PDF reports |
| **Customer** | `customer.john@example.com` | `Customer@123` | Book service request, live track, 5-star review |

---

## 6. PDF Service Report Download Verification

1. Log in as **Super Admin** or **Field Technician**.
2. Navigate to **Service Reports** from the sidebar (`/service-reports`).
3. Click **Download PDF** on any completed service report.
4. The system streams a dynamically generated ReportLab PDF document with itemized labor, parts consumed, and digital sign-off.

---

## 7. Troubleshooting & Common Pitfalls

- **PowerShell Execution Policy Error (`File npm.ps1 cannot be loaded`)**:
  - Run `npm.cmd` instead of `npm`, or run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.
- **Port 8000 / 3000 already in use**:
  - Identify the owning process: `netstat -ano | findstr :8000`
  - Terminate the conflicting PID: `taskkill /PID <PID> /F`
- **Database Connection Refused**:
  - Ensure the local PostgreSQL service is running (`Get-Service postgresql*` on Windows).
  - Verify credentials in `Backend/.env`.
