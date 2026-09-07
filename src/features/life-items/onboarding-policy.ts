/**
 * Pure policy for the one question that matters the first time this
 * function is ever called: has this install already been onboarded?
 * Kept separate from I/O (no repository imports) so it's directly
 * unit-testable (see `onboarding-policy.test.ts`).
 */
export type OnboardingSignals = {
  /** True if the install already had data (items, history, or a legacy-migration trace) before onboarding_completed was ever written. */
  hasExistingData: boolean;
  /** The stored value, or null if the setting key has never been written. */
  storedValue: boolean | null;
};

/**
 * Returns true when onboarding should be treated as already done (skip it).
 * An explicit stored value always wins. Only when the key has never been
 * written do we infer it — a pre-existing install (upgrading from 0.3.x, or
 * an 0.4.0 fresh install that already seeded sample data) must not be
 * forced through onboarding as if it were brand new.
 */
export function resolveInitialOnboardingState(signals: OnboardingSignals): boolean {
  if (signals.storedValue !== null) return signals.storedValue;
  return signals.hasExistingData;
}

export type ExistingInstallSignals = {
  itemCount: number;
  historyCount: number;
  /**
   * `'not_needed'` means the legacy-JSON migration ran and found nothing to
   * migrate — true for every fresh install, not just upgrades. It must NOT
   * be treated as evidence of an existing install; only `'done'` (a legacy
   * snapshot was actually migrated) or `'failed'` (one was found and an
   * import was attempted) count.
   */
  legacyMigrationStatus: 'done' | 'not_needed' | 'failed' | 'none' | null;
  hasItemsSeededSetting: boolean;
};

/**
 * Whether this install had any real data before `onboarding_completed` was
 * ever written. Feeds `resolveInitialOnboardingState`'s `hasExistingData`.
 */
export function resolveHasPreExistingData(signals: ExistingInstallSignals): boolean {
  if (signals.itemCount > 0) return true;
  if (signals.historyCount > 0) return true;
  if (signals.legacyMigrationStatus === 'done') return true;
  if (signals.legacyMigrationStatus === 'failed') return true;
  if (signals.hasItemsSeededSetting) return true;
  return false;
}
