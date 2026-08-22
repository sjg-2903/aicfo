import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import LoadingPage from '@/components/LoadingPage';
import { ToastProvider } from '@/components/Toast';
import AppLayout from '@/components/layout/AppLayout';

// Pages - lazy loaded for better performance
const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const FinancialHealth = lazy(() => import('@/pages/FinancialHealth'));
const Transactions = lazy(() => import('@/pages/Transactions'));
const Invoices = lazy(() => import('@/pages/Invoices'));
const Expenses = lazy(() => import('@/pages/Expenses'));
const GST = lazy(() => import('@/pages/GST'));
const Loans = lazy(() => import('@/pages/Loans'));
const CashFlow = lazy(() => import('@/pages/CashFlow'));
const RiskAnalysis = lazy(() => import('@/pages/RiskAnalysis'));
const LoanReadiness = lazy(() => import('@/pages/LoanReadiness'));
const AICFO = lazy(() => import('@/pages/AICFO'));
const Recommendations = lazy(() => import('@/pages/Recommendations'));
const Alerts = lazy(() => import('@/pages/Alerts'));
const Reports = lazy(() => import('@/pages/Reports'));
const History = lazy(() => import('@/pages/History'));
const Profile = lazy(() => import('@/pages/Profile'));
const Settings = lazy(() => import('@/pages/Settings'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function PageLoader() {
  // Branded full-screen loading page shown while lazy route chunks load.
  return <LoadingPage message="Loading page" />;
}

const AppContent = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected routes (nested under AppLayout) */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/financial-health" element={<FinancialHealth />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/gst" element={<GST />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/cash-flow" element={<CashFlow />} />
              <Route path="/risk-analysis" element={<RiskAnalysis />} />
              <Route path="/loan-readiness" element={<LoanReadiness />} />
              <Route path="/ai-cfo" element={<AICFO />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/history" element={<History />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
