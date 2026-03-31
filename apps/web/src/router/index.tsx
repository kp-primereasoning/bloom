import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { OnboardingGuard } from './OnboardingGuard';
import { UserRole } from '@bloom/shared';

// Auth pages
import { LoginPage } from '@/pages/LoginPage';
import { CallbackPage } from '@/pages/CallbackPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';

// Onboarding pages
import { RegisterPage, PropertyPage, SubscriptionPage as OnboardingSubscriptionPage } from '@/pages/onboarding';

// Customer pages
import {
  HomePage as CustomerHome,
  SubscriptionPage as CustomerSubscriptionPage,
  DeliveriesPage as CustomerDeliveries,
  AccountPage,
  BillingPage,
  HelpPage,
} from '@/pages/customer';

// Property Manager pages
import {
  OverviewPage,
  ParticipationPage,
  RewardsPage,
  SettingsPage as PMSettings,
} from '@/pages/pm';

// Florist pages
import {
  DeliveriesPage as FloristDeliveries,
  ProductsPage,
  AvailabilityPage,
  SettingsPage as FloristSettings,
} from '@/pages/florist';

// Admin pages
import {
  PropertiesPage,
  FloristsPage,
  UsersPage,
  PayoutsPage,
} from '@/pages/admin';

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  // Cognito OAuth callback
  {
    path: '/auth/callback',
    element: <CallbackPage />,
  },
  // Onboarding routes (with smart guard)
  {
    path: '/onboarding/register',
    element: (
      <OnboardingGuard>
        <RegisterPage />
      </OnboardingGuard>
    ),
  },
  {
    path: '/onboarding/property',
    element: (
      <OnboardingGuard>
        <PropertyPage />
      </OnboardingGuard>
    ),
  },
  {
    path: '/onboarding/subscription',
    element: (
      <OnboardingGuard>
        <OnboardingSubscriptionPage />
      </OnboardingGuard>
    ),
  },
  // Protected dashboard routes
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      // Root redirect - handled by DashboardLayout
      {
        index: true,
        element: <Navigate to="/customer/home" replace />,
      },
      // Customer routes
      {
        path: 'customer',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.CUSTOMER]}>
            <CustomerHome />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customer/home',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.CUSTOMER]}>
            <CustomerHome />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customer/subscription',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.CUSTOMER]}>
            <CustomerSubscriptionPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customer/deliveries',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.CUSTOMER]}>
            <CustomerDeliveries />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customer/account',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.CUSTOMER]}>
            <AccountPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customer/billing',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.CUSTOMER]}>
            <BillingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customer/help',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.CUSTOMER]}>
            <HelpPage />
          </ProtectedRoute>
        ),
      },
      // Property Manager routes
      {
        path: 'pm',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.PROPERTY_MANAGER]}>
            <OverviewPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'pm/overview',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.PROPERTY_MANAGER]}>
            <OverviewPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'pm/participation',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.PROPERTY_MANAGER]}>
            <ParticipationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'pm/rewards',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.PROPERTY_MANAGER]}>
            <RewardsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'pm/settings',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.PROPERTY_MANAGER]}>
            <PMSettings />
          </ProtectedRoute>
        ),
      },
      // Florist routes
      {
        path: 'florist',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.FLORIST]}>
            <FloristDeliveries />
          </ProtectedRoute>
        ),
      },
      {
        path: 'florist/deliveries',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.FLORIST]}>
            <FloristDeliveries />
          </ProtectedRoute>
        ),
      },
      {
        path: 'florist/products',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.FLORIST]}>
            <ProductsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'florist/availability',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.FLORIST]}>
            <AvailabilityPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'florist/settings',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.FLORIST]}>
            <FloristSettings />
          </ProtectedRoute>
        ),
      },
      // Admin routes
      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
            <PropertiesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/properties',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
            <PropertiesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/florists',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
            <FloristsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/payouts',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
            <PayoutsPage />
          </ProtectedRoute>
        ),
      },
      // Catch-all redirect
      {
        path: '*',
        element: <Navigate to="/login" replace />,
      },
    ],
  },
]);
