import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { SiteSettingsProvider } from '@/hooks/useSiteSettings';
import ToastContainer from '@/components/common/ToastContainer';
import { RequireApproved, RequirePermission } from '@/components/auth/guards';
import PublicLayout from '@/layouts/PublicLayout';
import PortalLayout from '@/layouts/PortalLayout';
import HomePage from '@/pages/public/HomePage';
import ProductDetailPage from '@/pages/public/ProductDetailPage';
import CollectionPage from '@/pages/public/CollectionPage';
import StaffPage from '@/pages/public/StaffPage';
import LoginPage from '@/pages/public/LoginPage';
import AuthCallbackPage from '@/pages/public/AuthCallbackPage';
import ProfileSetupPage from '@/pages/public/ProfileSetupPage';
import PortalOverview from '@/pages/portal/PortalOverview';
import PortalProducts from '@/pages/portal/PortalProducts';
import PortalProductEdit from '@/pages/portal/PortalProductEdit';
import PortalCollections from '@/pages/portal/PortalCollections';
import PortalDrops from '@/pages/portal/PortalDrops';
import PortalMagazine from '@/pages/portal/PortalMagazine';
import PortalMagazineEdit from '@/pages/portal/PortalMagazineEdit';
import PortalTeam from '@/pages/portal/PortalTeam';
import PortalHomepage from '@/pages/portal/PortalHomepage';
import PortalSettings from '@/pages/portal/PortalSettings';
import PortalAccess from '@/pages/portal/PortalAccess';
import PortalPermissions from '@/pages/portal/PortalPermissions';
import PortalAudit from '@/pages/portal/PortalAudit';
import MagazinePage from '@/pages/public/MagazinePage';
import ArticlePage from '@/pages/public/ArticlePage';

export default function App() {
  return (
    <AuthProvider>
      <SiteSettingsProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/products/:slug" element={<ProductDetailPage />} />
                <Route path="/collections/:slug" element={<CollectionPage />} />
                <Route path="/magazine" element={<MagazinePage />} />
                <Route path="/magazine/:slug" element={<ArticlePage />} />
                <Route path="/staff" element={<StaffPage />} />
              </Route>

              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/profile-setup" element={<ProfileSetupPage />} />

              <Route path="/portal" element={<RequireApproved />}>
                <Route element={<PortalLayout />}>
                  <Route index element={<PortalOverview />} />
                  <Route path="products" element={<PortalProducts />} />
                  <Route path="products/new" element={<PortalProductEdit />} />
                  <Route path="products/:id/edit" element={<PortalProductEdit />} />
                  <Route path="collections" element={<PortalCollections />} />
                  <Route path="drops" element={<PortalDrops />} />
                  <Route path="magazine" element={<PortalMagazine />} />
                  <Route path="magazine/new" element={<PortalMagazineEdit />} />
                  <Route path="magazine/:id/edit" element={<PortalMagazineEdit />} />
                  <Route path="team" element={<PortalTeam />} />
                  <Route path="homepage" element={<PortalHomepage />} />
                  <Route path="settings" element={<PortalSettings />} />
                  <Route element={<RequirePermission permission="accounts.view" />}>
                    <Route path="access" element={<PortalAccess />} />
                  </Route>
                  <Route path="employees" element={<Navigate to="/portal/team" replace />} />
                  <Route element={<RequirePermission permission="permissions.view" />}>
                    <Route path="permissions" element={<PortalPermissions />} />
                  </Route>
                  <Route element={<RequirePermission permission="audit.view" />}>
                    <Route path="audit" element={<PortalAudit />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <ToastContainer />
          </BrowserRouter>
        </ToastProvider>
      </SiteSettingsProvider>
    </AuthProvider>
  );
}
