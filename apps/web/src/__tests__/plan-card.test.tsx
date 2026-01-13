/**
 * Feature: customer-subscriptions-page
 * Property 4: Plan Cards Contain Required Information
 * Property 5: Correct Action Buttons Based on Status
 * Validates: Requirements 3.2, 3.3, 3.4, 4.2, 5.1, 7.1, 7.2
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { PlanCard } from '../components/PlanCard';
import { SUBSCRIPTION_PLANS } from '../config/planConfig';
import { ALL_SUBSCRIPTION_STATUSES } from '@bloom/shared';

// Arbitrary for generating plan configs
const planArbitrary = fc.constantFrom(...SUBSCRIPTION_PLANS);

// Arbitrary for generating subscription status values (including null)
const statusArbitrary = fc.constantFrom(...ALL_SUBSCRIPTION_STATUSES, null);

// Arbitrary for generating boolean values
const booleanArbitrary = fc.boolean();

describe('PlanCard - Property 4: Plan Cards Contain Required Information', () => {
  afterEach(() => {
    cleanup();
  });

  it('should display plan name for any plan', () => {
    fc.assert(
      fc.property(planArbitrary, statusArbitrary, booleanArbitrary, (plan, status, isCurrentPlan) => {
        cleanup();
        const onAction = vi.fn();

        render(
          <PlanCard
            plan={plan}
            isCurrentPlan={isCurrentPlan}
            subscriptionStatus={status}
            onAction={onAction}
            isLoading={false}
          />
        );

        const nameElement = screen.getByTestId('plan-name');
        expect(nameElement.textContent).toBe(plan.name);

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('should display cadence label for any plan with cadenceLabel', () => {
    fc.assert(
      fc.property(planArbitrary, statusArbitrary, booleanArbitrary, (plan, status, isCurrentPlan) => {
        cleanup();
        const onAction = vi.fn();

        render(
          <PlanCard
            plan={plan}
            isCurrentPlan={isCurrentPlan}
            subscriptionStatus={status}
            onAction={onAction}
            isLoading={false}
          />
        );

        // Cadence element is only rendered if plan.cadenceLabel is truthy
        if (plan.cadenceLabel) {
          const cadenceElement = screen.getByTestId('plan-cadence');
          expect(cadenceElement.textContent).toBe(plan.cadenceLabel);
        } else {
          expect(screen.queryByTestId('plan-cadence')).toBeNull();
        }

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('should display all features for any plan', () => {
    fc.assert(
      fc.property(planArbitrary, statusArbitrary, booleanArbitrary, (plan, status, isCurrentPlan) => {
        cleanup();
        const onAction = vi.fn();

        render(
          <PlanCard
            plan={plan}
            isCurrentPlan={isCurrentPlan}
            subscriptionStatus={status}
            onAction={onAction}
            isLoading={false}
          />
        );

        const featureElements = screen.getAllByTestId('plan-feature');
        expect(featureElements).toHaveLength(plan.features.length);

        plan.features.forEach((feature, index) => {
          expect(featureElements[index].textContent).toBe(feature);
        });

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('should highlight current plan with distinct styling', () => {
    SUBSCRIPTION_PLANS.forEach((plan) => {
      cleanup();
      const onAction = vi.fn();

      const { container } = render(
        <PlanCard
          plan={plan}
          isCurrentPlan={true}
          subscriptionStatus="ACTIVE"
          onAction={onAction}
          isLoading={false}
        />
      );

      const card = container.querySelector(`[data-testid="plan-card-${plan.id}"]`);
      expect(card?.className).toContain('ring-2');
      expect(card?.className).toContain('ring-green-500');

      cleanup();
    });
  });

  it('should not highlight non-current plans', () => {
    SUBSCRIPTION_PLANS.forEach((plan) => {
      cleanup();
      const onAction = vi.fn();

      const { container } = render(
        <PlanCard
          plan={plan}
          isCurrentPlan={false}
          subscriptionStatus="ACTIVE"
          onAction={onAction}
          isLoading={false}
        />
      );

      const card = container.querySelector(`[data-testid="plan-card-${plan.id}"]`);
      expect(card?.className).not.toContain('ring-2');

      cleanup();
    });
  });
});

describe('PlanCard - Property 5: Correct Action Buttons Based on Status', () => {
  afterEach(() => {
    cleanup();
  });

  it('should show "Activate this plan" for CREATED status on any plan', () => {
    fc.assert(
      fc.property(planArbitrary, booleanArbitrary, (plan, isCurrentPlan) => {
        cleanup();
        const onAction = vi.fn();

        render(
          <PlanCard
            plan={plan}
            isCurrentPlan={isCurrentPlan}
            subscriptionStatus="CREATED"
            onAction={onAction}
            isLoading={false}
          />
        );

        const button = screen.getByTestId('plan-action-button');
        expect(button.textContent).toBe('Activate this plan');

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('should show "Activate this plan" for null status on any plan', () => {
    fc.assert(
      fc.property(planArbitrary, booleanArbitrary, (plan, isCurrentPlan) => {
        cleanup();
        const onAction = vi.fn();

        render(
          <PlanCard
            plan={plan}
            isCurrentPlan={isCurrentPlan}
            subscriptionStatus={null}
            onAction={onAction}
            isLoading={false}
          />
        );

        const button = screen.getByTestId('plan-action-button');
        expect(button.textContent).toBe('Activate this plan');

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('should show "Pause subscription" for ACTIVE status on current plan', () => {
    SUBSCRIPTION_PLANS.forEach((plan) => {
      cleanup();
      const onAction = vi.fn();

      render(
        <PlanCard
          plan={plan}
          isCurrentPlan={true}
          subscriptionStatus="ACTIVE"
          onAction={onAction}
          isLoading={false}
        />
      );

      const button = screen.getByTestId('plan-action-button');
      expect(button.textContent).toBe('Pause subscription');

      cleanup();
    });
  });

  it('should show "Switch to this plan" for ACTIVE status on non-current plan', () => {
    SUBSCRIPTION_PLANS.forEach((plan) => {
      cleanup();
      const onAction = vi.fn();

      render(
        <PlanCard
          plan={plan}
          isCurrentPlan={false}
          subscriptionStatus="ACTIVE"
          onAction={onAction}
          isLoading={false}
        />
      );

      const button = screen.getByTestId('plan-action-button');
      expect(button.textContent).toBe('Switch to this plan');

      cleanup();
    });
  });

  it('should show "Resume subscription" for PAUSED status on current plan', () => {
    SUBSCRIPTION_PLANS.forEach((plan) => {
      cleanup();
      const onAction = vi.fn();

      render(
        <PlanCard
          plan={plan}
          isCurrentPlan={true}
          subscriptionStatus="PAUSED"
          onAction={onAction}
          isLoading={false}
        />
      );

      const button = screen.getByTestId('plan-action-button');
      expect(button.textContent).toBe('Resume subscription');

      cleanup();
    });
  });

  it('should show "Switch to this plan" for PAUSED status on non-current plan', () => {
    SUBSCRIPTION_PLANS.forEach((plan) => {
      cleanup();
      const onAction = vi.fn();

      render(
        <PlanCard
          plan={plan}
          isCurrentPlan={false}
          subscriptionStatus="PAUSED"
          onAction={onAction}
          isLoading={false}
        />
      );

      const button = screen.getByTestId('plan-action-button');
      expect(button.textContent).toBe('Switch to this plan');

      cleanup();
    });
  });
});

describe('PlanCard - Button Actions', () => {
  afterEach(() => {
    cleanup();
  });

  it('should call onAction with activate action when clicking activate button', () => {
    const plan = SUBSCRIPTION_PLANS[0];
    const onAction = vi.fn();

    render(
      <PlanCard
        plan={plan}
        isCurrentPlan={false}
        subscriptionStatus="CREATED"
        onAction={onAction}
        isLoading={false}
      />
    );

    const button = screen.getByTestId('plan-action-button');
    fireEvent.click(button);

    expect(onAction).toHaveBeenCalledWith({ type: 'activate', planId: plan.id });
  });

  it('should call onAction with pause action when clicking pause button', () => {
    const plan = SUBSCRIPTION_PLANS[0];
    const onAction = vi.fn();

    render(
      <PlanCard
        plan={plan}
        isCurrentPlan={true}
        subscriptionStatus="ACTIVE"
        onAction={onAction}
        isLoading={false}
      />
    );

    const button = screen.getByTestId('plan-action-button');
    fireEvent.click(button);

    expect(onAction).toHaveBeenCalledWith({ type: 'pause' });
  });

  it('should call onAction with resume action when clicking resume button', () => {
    const plan = SUBSCRIPTION_PLANS[0];
    const onAction = vi.fn();

    render(
      <PlanCard
        plan={plan}
        isCurrentPlan={true}
        subscriptionStatus="PAUSED"
        onAction={onAction}
        isLoading={false}
      />
    );

    const button = screen.getByTestId('plan-action-button');
    fireEvent.click(button);

    expect(onAction).toHaveBeenCalledWith({ type: 'resume' });
  });

  it('should call onAction with switch action when clicking switch button', () => {
    const plan = SUBSCRIPTION_PLANS[0];
    const onAction = vi.fn();

    render(
      <PlanCard
        plan={plan}
        isCurrentPlan={false}
        subscriptionStatus="ACTIVE"
        onAction={onAction}
        isLoading={false}
      />
    );

    const button = screen.getByTestId('plan-action-button');
    fireEvent.click(button);

    expect(onAction).toHaveBeenCalledWith({ type: 'switch', planId: plan.id });
  });

  it('should disable button when isLoading is true', () => {
    const plan = SUBSCRIPTION_PLANS[0];
    const onAction = vi.fn();

    render(
      <PlanCard
        plan={plan}
        isCurrentPlan={false}
        subscriptionStatus="CREATED"
        onAction={onAction}
        isLoading={true}
      />
    );

    const button = screen.getByTestId('plan-action-button');
    expect(button).toBeDisabled();
    expect(button.textContent).toContain('Loading');
  });

  it('should not call onAction when button is disabled', () => {
    const plan = SUBSCRIPTION_PLANS[0];
    const onAction = vi.fn();

    render(
      <PlanCard
        plan={plan}
        isCurrentPlan={false}
        subscriptionStatus="CREATED"
        onAction={onAction}
        isLoading={true}
      />
    );

    const button = screen.getByTestId('plan-action-button');
    fireEvent.click(button);

    expect(onAction).not.toHaveBeenCalled();
  });
});
