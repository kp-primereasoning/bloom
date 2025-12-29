/**
 * Feature: repo-scaffold-dashboard-shell
 * Property 2: Placeholder Page Completeness
 * Validates: Requirements 4.1, 4.2, 4.3
 *
 * For any navigation item in the sidebar configuration, there SHALL exist
 * a corresponding placeholder page that renders both the page title and
 * a "coming soon" description.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ALL_ROLES } from '@bloom/shared';
import { sidebarConfig } from '../config/sidebarConfig';

// Import all page components
import * as CustomerPages from '../pages/customer';
import * as PMPages from '../pages/pm';
import * as FloristPages from '../pages/florist';
import * as AdminPages from '../pages/admin';

// Map paths to page components
const pageComponents: Record<string, React.ComponentType> = {
  // Customer pages
  '/customer/home': CustomerPages.HomePage,
  '/customer/subscription': CustomerPages.SubscriptionPage,
  '/customer/deliveries': CustomerPages.DeliveriesPage,
  '/customer/account': CustomerPages.AccountPage,
  // PM pages
  '/pm/overview': PMPages.OverviewPage,
  '/pm/participation': PMPages.ParticipationPage,
  '/pm/rewards': PMPages.RewardsPage,
  '/pm/settings': PMPages.SettingsPage,
  // Florist pages
  '/florist/deliveries': FloristPages.DeliveriesPage,
  '/florist/products': FloristPages.ProductsPage,
  '/florist/availability': FloristPages.AvailabilityPage,
  '/florist/settings': FloristPages.SettingsPage,
  // Admin pages
  '/admin/properties': AdminPages.PropertiesPage,
  '/admin/florists': AdminPages.FloristsPage,
  '/admin/assignments': AdminPages.AssignmentsPage,
  '/admin/exceptions': AdminPages.ExceptionsPage,
};

// Get all nav items from all roles
const allNavItems = ALL_ROLES.flatMap((role) =>
  sidebarConfig[role].navItems.map((item) => ({
    role,
    label: item.label,
    path: item.path,
  }))
);

// Arbitrary for generating random nav items
const navItemArbitrary = fc.constantFrom(...allNavItems);

describe('Placeholder Pages - Property 2: Placeholder Page Completeness', () => {
  afterEach(() => {
    cleanup();
  });

  it('should have a page component for every nav item', () => {
    fc.assert(
      fc.property(navItemArbitrary, ({ path }) => {
        // Every nav item path should have a corresponding page component
        expect(pageComponents[path]).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('should render page title for any nav item', () => {
    fc.assert(
      fc.property(navItemArbitrary, ({ label, path }) => {
        cleanup(); // Clean up before each iteration
        const PageComponent = pageComponents[path];

        render(
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={path} element={<PageComponent />} />
            </Routes>
          </MemoryRouter>
        );

        // The page should display a heading with the label
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
        expect(heading.textContent).toBe(label);

        cleanup(); // Clean up after each iteration
      }),
      { numRuns: 100 }
    );
  });

  it('should render description text for any nav item', () => {
    fc.assert(
      fc.property(navItemArbitrary, ({ path }) => {
        cleanup(); // Clean up before each iteration
        const PageComponent = pageComponents[path];

        const { container } = render(
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={path} element={<PageComponent />} />
            </Routes>
          </MemoryRouter>
        );

        // The page should have a paragraph with description text
        const paragraphs = container.querySelectorAll('p');
        expect(paragraphs.length).toBeGreaterThan(0);

        // At least one paragraph should have content
        const hasContent = Array.from(paragraphs).some(
          (p) => p.textContent && p.textContent.length > 0
        );
        expect(hasContent).toBe(true);

        cleanup(); // Clean up after each iteration
      }),
      { numRuns: 100 }
    );
  });
});
