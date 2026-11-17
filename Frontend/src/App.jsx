import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Main Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { WorkOrdersListPage } from './pages/work-orders/WorkOrdersListPage';
import { WorkOrderDetailPage } from './pages/work-orders/WorkOrderDetailPage';
import { DispatchBoardPage } from './pages/schedule/DispatchBoardPage';
import { SchedulePage } from './pages/schedule/SchedulePage';
import { ServiceRequestsListPage } from './pages/service-requests/ServiceRequestsListPage';
import { TechniciansListPage } from './pages/technicians/TechniciansListPage';
import { TechnicianDetailPage } from './pages/technicians/TechnicianDetailPage';
import { CustomersListPage } from './pages/customers/CustomersListPage';
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage';
import { ServicesCatalogPage } from './pages/services/ServicesCatalogPage';
import { PartsInventoryPage } from './pages/inventory/PartsInventoryPage';
import { ServiceReportsListPage } from './pages/reports/ServiceReportsListPage';
import { CustomerFeedbackPage } from './pages/feedback/CustomerFeedbackPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { ProfileSettingsPage } from './pages/profile/ProfileSettingsPage';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* General Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/work-orders" element={<WorkOrdersListPage />} />
              <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
              <Route path="/work-orders/:workOrderId" element={<WorkOrderDetailPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/service-requests" element={<ServiceRequestsListPage />} />
              <Route path="/services" element={<ServicesCatalogPage />} />
              <Route path="/service-reports" element={<ServiceReportsListPage />} />
              <Route path="/feedback" element={<CustomerFeedbackPage />} />
              <Route path="/profile" element={<ProfileSettingsPage />} />
            </Route>

            {/* Dispatcher & Manager Roles */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'DISPATCHER']}
                />
              }
            >
              <Route path="/dispatch-board" element={<DispatchBoardPage />} />
              <Route path="/technicians" element={<TechniciansListPage />} />
              <Route path="/customers" element={<CustomersListPage />} />
            </Route>

            {/* Technician Detail Route (Supervisors and Technicians themselves) */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'DISPATCHER', 'FIELD_TECHNICIAN']}
                />
              }
            >
              <Route path="/technicians/:id" element={<TechnicianDetailPage />} />
              <Route path="/technicians/:technicianId" element={<TechnicianDetailPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
              <Route path="/inventory" element={<PartsInventoryPage />} />
            </Route>

            {/* Executive Management & Reports Route */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={['SUPER_ADMIN', 'OPERATIONS_MANAGER']}
                />
              }
            >
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </BrowserRouter>
);
}

export default App;
