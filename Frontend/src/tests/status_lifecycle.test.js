import { describe, it, expect } from 'vitest';

// State machine definitions matching backend business rules
const WORK_ORDER_TRANSITIONS = {
  DRAFT: ['SCHEDULED', 'ASSIGNED', 'CANCELLED'],
  SCHEDULED: ['ASSIGNED', 'CANCELLED', 'SCHEDULED'],
  ASSIGNED: ['EN_ROUTE', 'IN_PROGRESS', 'SCHEDULED', 'CANCELLED'],
  EN_ROUTE: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [], // Terminal unless supervisor correction
  CANCELLED: [], // Terminal
};

export function canTransitionWorkOrder(currentStatus, targetStatus) {
  const allowed = WORK_ORDER_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

const SERVICE_REQUEST_TRANSITIONS = {
  NEW: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['CONVERTED', 'CANCELLED'],
  REJECTED: [],
  CONVERTED: [],
  CANCELLED: [],
};

export function canTransitionServiceRequest(currentStatus, targetStatus) {
  const allowed = SERVICE_REQUEST_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

describe('Work Order & Service Request Lifecycle State Machines', () => {
  it('allows valid progression: DRAFT -> SCHEDULED -> ASSIGNED -> EN_ROUTE -> IN_PROGRESS -> COMPLETED', () => {
    expect(canTransitionWorkOrder('DRAFT', 'SCHEDULED')).toBe(true);
    expect(canTransitionWorkOrder('SCHEDULED', 'ASSIGNED')).toBe(true);
    expect(canTransitionWorkOrder('ASSIGNED', 'EN_ROUTE')).toBe(true);
    expect(canTransitionWorkOrder('EN_ROUTE', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionWorkOrder('IN_PROGRESS', 'COMPLETED')).toBe(true);
  });

  it('prohibits illegal skips or jumping into COMPLETED directly from DRAFT', () => {
    expect(canTransitionWorkOrder('DRAFT', 'COMPLETED')).toBe(false);
    expect(canTransitionWorkOrder('DRAFT', 'IN_PROGRESS')).toBe(false);
    expect(canTransitionWorkOrder('SCHEDULED', 'COMPLETED')).toBe(false);
  });

  it('allows pausing into ON_HOLD and resuming back to IN_PROGRESS', () => {
    expect(canTransitionWorkOrder('IN_PROGRESS', 'ON_HOLD')).toBe(true);
    expect(canTransitionWorkOrder('ON_HOLD', 'IN_PROGRESS')).toBe(true);
  });

  it('protects terminal states COMPLETED and CANCELLED against arbitrary alterations', () => {
    expect(canTransitionWorkOrder('COMPLETED', 'IN_PROGRESS')).toBe(false);
    expect(canTransitionWorkOrder('COMPLETED', 'CANCELLED')).toBe(false);
    expect(canTransitionWorkOrder('CANCELLED', 'ASSIGNED')).toBe(false);
  });

  it('enforces service request conversion workflow', () => {
    expect(canTransitionServiceRequest('NEW', 'UNDER_REVIEW')).toBe(true);
    expect(canTransitionServiceRequest('UNDER_REVIEW', 'APPROVED')).toBe(true);
    expect(canTransitionServiceRequest('APPROVED', 'CONVERTED')).toBe(true);
    expect(canTransitionServiceRequest('CONVERTED', 'NEW')).toBe(false);
    expect(canTransitionServiceRequest('REJECTED', 'APPROVED')).toBe(false);
  });
});
