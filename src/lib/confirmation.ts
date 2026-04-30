import type { SkillRating, TeamSkillRating } from '@/types/database'

export type ConfirmationState = 'open' | 'drift' | 'confirmed'

type Rateable = Pick<
  SkillRating | TeamSkillRating,
  'confirmation_status' | 'confirmed_level' | 'current_level'
>

/**
 * Bestätigungs-Status aus Manager-Sicht:
 *  - 'confirmed' → Manager hat bestätigt UND Selbst-Wert ist gleich Bestätigt
 *  - 'drift'     → Manager hat bestätigt, aber Selbst weicht inzwischen ab
 *  - 'open'      → noch nie bestätigt (oder kein Rating)
 */
export function getConfirmationState(
  rating: Rateable | undefined | null,
): ConfirmationState {
  if (!rating) return 'open'
  if (
    rating.confirmation_status !== 'confirmed' ||
    rating.confirmed_level === null ||
    rating.confirmed_level === undefined
  ) {
    return 'open'
  }
  return rating.confirmed_level === rating.current_level ? 'confirmed' : 'drift'
}

export interface StatusCounts {
  open: number
  drift: number
  confirmed: number
  total: number
}

export function emptyCounts(): StatusCounts {
  return { open: 0, drift: 0, confirmed: 0, total: 0 }
}

export function addToCounts(counts: StatusCounts, state: ConfirmationState) {
  counts[state] += 1
  counts.total += 1
}
