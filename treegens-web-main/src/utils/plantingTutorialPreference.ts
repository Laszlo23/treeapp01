/**
 * Persisted preference: user tapped "Skip" on the planting tutorial once —
 * FAB and tutorial route should skip straight to new plant flow.
 */
const SKIP_KEY = 'treegens_skip_planting_tutorial'

export function markPlantingTutorialSkipped(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SKIP_KEY, '1')
  } catch {
    /* quota / private mode */
  }
}

export function hasSkippedPlantingTutorial(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SKIP_KEY) === '1'
  } catch {
    return false
  }
}

/** Clears skip so the user can open `/tutorial` again from Profile / Earn. */
export function clearPlantingTutorialSkip(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SKIP_KEY)
  } catch {
    /* quota / private mode */
  }
}
