/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveHasPreExistingData, resolveInitialOnboardingState } from './onboarding-policy';

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

// v0.4.2 regression: migrateLegacyDataIfNeeded() writes
// legacy_migration_status = 'not_needed' on EVERY fresh native install (not
// just upgrades) once it confirms there's no legacy JSON to migrate. That
// status must never be read as "this is an existing install" on its own.
test('resolveHasPreExistingData: fresh install with legacy_migration_status "not_needed" is NOT existing data', () => {
  assert.equal(
    resolveHasPreExistingData({ itemCount: 0, historyCount: 0, legacyMigrationStatus: 'not_needed', hasItemsSeededSetting: false }),
    false,
  );
});

test('resolveHasPreExistingData: completely clean install (no legacy status at all) is not existing data', () => {
  assert.equal(
    resolveHasPreExistingData({ itemCount: 0, historyCount: 0, legacyMigrationStatus: null, hasItemsSeededSetting: false }),
    false,
  );
});

test('resolveHasPreExistingData: any life item present is existing data', () => {
  assert.equal(
    resolveHasPreExistingData({ itemCount: 1, historyCount: 0, legacyMigrationStatus: 'not_needed', hasItemsSeededSetting: false }),
    true,
  );
});

test('resolveHasPreExistingData: completion history alone is existing data', () => {
  assert.equal(
    resolveHasPreExistingData({ itemCount: 0, historyCount: 1, legacyMigrationStatus: 'not_needed', hasItemsSeededSetting: false }),
    true,
  );
});

test('resolveHasPreExistingData: a completed legacy migration is existing data', () => {
  assert.equal(
    resolveHasPreExistingData({ itemCount: 0, historyCount: 0, legacyMigrationStatus: 'done', hasItemsSeededSetting: false }),
    true,
  );
});

test('resolveHasPreExistingData: a failed legacy migration is existing data (a legacy snapshot was found)', () => {
  assert.equal(
    resolveHasPreExistingData({ itemCount: 0, historyCount: 0, legacyMigrationStatus: 'failed', hasItemsSeededSetting: false }),
    true,
  );
});

test('resolveHasPreExistingData: a legacy items_seeded marker is existing data', () => {
  assert.equal(
    resolveHasPreExistingData({ itemCount: 0, historyCount: 0, legacyMigrationStatus: 'not_needed', hasItemsSeededSetting: true }),
    true,
  );
});

test('resolveHasPreExistingData + resolveInitialOnboardingState: fresh native install shows onboarding end-to-end', () => {
  const hasExistingData = resolveHasPreExistingData({
    itemCount: 0,
    historyCount: 0,
    legacyMigrationStatus: 'not_needed',
    hasItemsSeededSetting: false,
  });
  assert.equal(hasExistingData, false);
  assert.equal(resolveInitialOnboardingState({ hasExistingData, storedValue: null }), false);
});
