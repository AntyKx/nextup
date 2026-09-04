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
