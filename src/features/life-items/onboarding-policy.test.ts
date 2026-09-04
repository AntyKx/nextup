/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveInitialOnboardingState } from './onboarding-policy';

test('resolveInitialOnboardingState: fresh install with no existing data and no stored value shows onboarding', () => {
  assert.equal(resolveInitialOnboardingState({ hasExistingData: false, storedValue: null }), false);
});

test('resolveInitialOnboardingState: existing 0.3.x user with no onboarding key skips onboarding', () => {
  assert.equal(resolveInitialOnboardingState({ hasExistingData: true, storedValue: null }), true);
});

test('resolveInitialOnboardingState: an explicit stored value always wins over the data signal', () => {
  assert.equal(resolveInitialOnboardingState({ hasExistingData: true, storedValue: false }), false);
  assert.equal(resolveInitialOnboardingState({ hasExistingData: false, storedValue: true }), true);
});
