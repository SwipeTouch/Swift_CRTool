import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/shared/auth/AuthContext';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { RequireRole } from '@/shared/auth/RequireRole';
import { AppLayout } from '@/shared/layout/AppLayout';
import { LoginPage } from '@/modules/auth/LoginPage';
import { DashboardPage } from '@/modules/dashboard/DashboardPage';
import { ChangeRequestListPage } from '@/modules/changeRequests/ChangeRequestListPage';
import { ChangeRequestDetailPage } from '@/modules/changeRequests/ChangeRequestDetailPage';
import { ChangeRequestNewPage } from '@/modules/changeRequests/ChangeRequestNewPage';
import { ApprovalsPage } from '@/modules/approvals/ApprovalsPage';
import { OrganizationsPage } from '@/modules/admin/OrganizationsPage';
import { OrganizationDetailPage } from '@/modules/admin/OrganizationDetailPage';
import { UsersPage } from '@/modules/admin/UsersPage';
import { ReportsPage } from '@/modules/reports/ReportsPage';
import { ClientReportDetailPage } from '@/modules/reports/ClientReportDetailPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/change-requests" element={<ChangeRequestListPage />} />
            <Route path="/change-requests/new" element={<ChangeRequestNewPage />} />
            <Route path="/change-requests/:id" element={<ChangeRequestDetailPage />} />
            <Route
              path="/approvals"
              element={
                <RequireRole allowed={['ADMIN', 'APPROVER']}>
                  <ApprovalsPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/organizations"
              element={
                <RequireRole allowed={['ADMIN', 'APPROVER']}>
                  <OrganizationsPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/organizations/:id"
              element={
                <RequireRole allowed={['ADMIN', 'APPROVER']}>
                  <OrganizationDetailPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireRole allowed={['ADMIN']}>
                  <UsersPage />
                </RequireRole>
              }
            />
            <Route
              path="/reports/schools/:id"
              element={
                <RequireRole allowed={['ADMIN', 'APPROVER']}>
                  <ClientReportDetailPage />
                </RequireRole>
              }
            />
            <Route
              path="/reports"
              element={
                <RequireRole allowed={['ADMIN', 'APPROVER']}>
                  <ReportsPage />
                </RequireRole>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
