import { ChoreCompletion, ChoreFrequency } from './types'

export function isChoreCompletedToday(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string
): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return completions.some(
    (c) =>
      c.choreId === choreId &&
      c.childId === childId &&
      c.completedAt >= today.getTime()
  )
}

export function isChoreCompletedThisWeek(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string
): boolean {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  
  return completions.some(
    (c) =>
      c.choreId === choreId &&
      c.childId === childId &&
      c.completedAt >= startOfWeek.getTime()
  )
}

export function isChoreCompletedThisBiWeek(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string
): boolean {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  
  const startOfBiWeek = new Date(startOfWeek)
  const weekNumber = Math.floor((startOfWeek.getTime() - new Date(startOfWeek.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
  
  if (weekNumber % 2 === 1) {
    startOfBiWeek.setDate(startOfBiWeek.getDate() - 7)
  }
  
  return completions.some(
    (c) =>
      c.choreId === choreId &&
      c.childId === childId &&
      c.completedAt >= startOfBiWeek.getTime()
  )
}

export function isChoreCompleted(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string,
  frequency: ChoreFrequency
): boolean {
  if (frequency === 'daily') {
    return isChoreCompletedToday(completions, choreId, childId)
  } else if (frequency === 'weekly') {
    return isChoreCompletedThisWeek(completions, choreId, childId)
  } else {
    return isChoreCompletedThisBiWeek(completions, choreId, childId)
  }
}

export function isChoreActive(chore: { startDate?: number; endDate?: number }): boolean {
  const now = Date.now()
  
  if (chore.startDate && now < chore.startDate) {
    return false
  }
  
  if (chore.endDate && now > chore.endDate) {
    return false
  }
  
  return true
}

export function getChildTotalPoints(
  completions: ChoreCompletion[],
  choresMap: Map<string, { points: number }>,
  childId: string
): number {
  return completions
    .filter((c) => c.childId === childId)
    .reduce((sum, c) => {
      const chore = choresMap.get(c.choreId)
      return sum + (chore?.points || 0)
    }, 0)
}

export function getChildAvailablePoints(
  totalPoints: number,
  purchases: { cost: number }[]
): number {
  const spent = purchases.reduce((sum, p) => sum + p.cost, 0)
  return totalPoints - spent
}

export const AVATAR_COLORS = [
  'oklch(0.6 0.22 290)',
  'oklch(0.72 0.18 45)',
  'oklch(0.65 0.12 240)',
  'oklch(0.7 0.18 150)',
  'oklch(0.68 0.2 340)',
  'oklch(0.75 0.15 80)',
]
