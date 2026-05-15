import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import BillingDashboardPage from './pages/BillingDashboardPage';
import SalesRevenueAnalyticsPage from './pages/SalesRevenueAnalyticsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BillingDashboardPage />} />
        <Route path="/revenue-analytics" element={<SalesRevenueAnalyticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
