import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import ToastContainer from '@/components/common/ToastContainer';
import PublicLayout from '@/layouts/PublicLayout';
import PortalLayout from '@/layouts/PortalLayout';
import HomePage from '@/pages/public/HomePage';
import ProductDetailPage from '@/pages/public/ProductDetailPage';
import CollectionPage from '@/pages/public/CollectionPage';
import StaffPage from '@/pages/public/StaffPage';
import LoginPage from '@/pages/public/LoginPage';
import PortalOverview from '@/pages/portal/PortalOverview';
import PortalProducts from '@/pages/portal/PortalProducts';
import PortalProductEdit from '@/pages/portal/PortalProductEdit';
import PortalCollections from '@/pages/portal/PortalCollections';
import PortalDrops from '@/pages/portal/PortalDrops';
import PortalTeam from '@/pages/portal/PortalTeam';
import PortalHomepage from '@/pages/portal/PortalHomepage';
import PortalSettings from '@/pages/portal/PortalSettings';

function ProtectedPortal() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <PortalLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/products/:slug" element={<ProductDetailPage />} />
              <Route path="/collections/:slug" element={<CollectionPage />} />
              <Route path="/staff" element={<StaffPage />} />
            </Route>

            {/* Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Portal routes */}
            <Route path="/portal" element={<ProtectedPortal />}>
              <Route index element={<PortalOverview />} />
              <Route path="products" element={<PortalProducts />} />
              <Route path="products/new" element={<PortalProductEdit />} />
              <Route path="products/:id/edit" element={<PortalProductEdit />} />
              <Route path="collections" element={<PortalCollections />} />
              <Route path="drops" element={<PortalDrops />} />
              <Route path="team" element={<PortalTeam />} />
              <Route path="homepage" element={<PortalHomepage />} />
              <Route path="settings" element={<PortalSettings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
