import { ChoreCompletion, ChoreFrequency, ChoreTimeOfDay, Chore, ChoreAssignment, DayOfWeek } from './types'

export function getCurrentDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[new Date().getDay()]
}

export function isChoreActiveToday(chore: Chore): boolean {
  if (!chore.daysOfWeek || chore.daysOfWeek.length === 0) {
    return true
  }
  const today = getCurrentDayOfWeek()
  return chore.daysOfWeek.includes(today)
}

export function getCurrentTimeOfDay(): 'am' | 'pm' {
  const hour = new Date().getHours()
  return hour < 12 ? 'am' : 'pm'
}

export function isChoreAvailableNow(timeOfDay: ChoreTimeOfDay): boolean {
  if (timeOfDay === 'anytime' || timeOfDay === 'both') {
    return true
  }
  return getCurrentTimeOfDay() === timeOfDay
}

export function isChoreMissed(
  timeOfDay: ChoreTimeOfDay,
  completions: ChoreCompletion[],
  choreId: string,
  childId: string
): boolean {
  const currentTimeOfDay = getCurrentTimeOfDay()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (timeOfDay === 'am' && currentTimeOfDay === 'pm') {
    const completedToday = completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= today.getTime() &&
        c.timeOfDay === 'am'
    )
    return !completedToday
  }
  
  return false
}

export function isChoreCompletedForTimeOfDay(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string,
  timeOfDay: 'am' | 'pm'
): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return completions.some(
    (c) =>
      c.choreId === choreId &&
      c.childId === childId &&
      c.completedAt >= today.getTime() &&
      c.timeOfDay === timeOfDay
  )
}

export function isChoreCompletedByAnyChildToday(
  completions: ChoreCompletion[],
  choreId: string,
  timeOfDay?: 'am' | 'pm'
): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return completions.some(
    (c) =>
      c.choreId === choreId &&
      c.completedAt >= today.getTime() &&
      (!timeOfDay || c.timeOfDay === timeOfDay)
  )
}

export function isChoreCompletedToday(
  completions: ChoreCompletion[],
  choreId: string,
  childId: string,
  choreTimeOfDay: ChoreTimeOfDay
): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (choreTimeOfDay === 'both') {
    const amCompleted = isChoreCompletedForTimeOfDay(completions, choreId, childId, 'am')
    const pmCompleted = isChoreCompletedForTimeOfDay(completions, choreId, childId, 'pm')
    return amCompleted && pmCompleted
  }
  
  if (choreTimeOfDay === 'am' || choreTimeOfDay === 'pm') {
    return isChoreCompletedForTimeOfDay(completions, choreId, childId, choreTimeOfDay)
  }
  
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
  childId: string,
  choreTimeOfDay: ChoreTimeOfDay
): boolean {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  
  if (choreTimeOfDay === 'both') {
    const amCompleted = completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfWeek.getTime() &&
        c.timeOfDay === 'am'
    )
    const pmCompleted = completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfWeek.getTime() &&
        c.timeOfDay === 'pm'
    )
    return amCompleted && pmCompleted
  }
  
  if (choreTimeOfDay === 'am' || choreTimeOfDay === 'pm') {
    return completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfWeek.getTime() &&
        c.timeOfDay === choreTimeOfDay
    )
  }
  
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
  childId: string,
  choreTimeOfDay: ChoreTimeOfDay
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
  
  if (choreTimeOfDay === 'both') {
    const amCompleted = completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfBiWeek.getTime() &&
        c.timeOfDay === 'am'
    )
    const pmCompleted = completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfBiWeek.getTime() &&
        c.timeOfDay === 'pm'
    )
    return amCompleted && pmCompleted
  }
  
  if (choreTimeOfDay === 'am' || choreTimeOfDay === 'pm') {
    return completions.some(
      (c) =>
        c.choreId === choreId &&
        c.childId === childId &&
        c.completedAt >= startOfBiWeek.getTime() &&
        c.timeOfDay === choreTimeOfDay
    )
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
  frequency: ChoreFrequency,
  choreTimeOfDay: ChoreTimeOfDay
): boolean {
  if (frequency === 'daily') {
    return isChoreCompletedToday(completions, choreId, childId, choreTimeOfDay)
  } else if (frequency === 'weekly') {
    return isChoreCompletedThisWeek(completions, choreId, childId, choreTimeOfDay)
  } else {
    return isChoreCompletedThisBiWeek(completions, choreId, childId, choreTimeOfDay)
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
  choresMap: Map<string, { points: number; completionType?: string }>,
  childId: string,
  assignments?: ChoreAssignment[]
): number {
  return completions
    .filter((c) => c.childId === childId)
    .reduce((sum, c) => {
      const chore = choresMap.get(c.choreId)
      if (!chore) return sum
      
      if (chore.completionType === 'shareable' && assignments) {
        const assignedChildren = assignments.filter(a => a.choreId === c.choreId).length
        if (assignedChildren > 1) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const completionsToday = completions.filter(comp => 
            comp.choreId === c.choreId && 
            comp.completedAt >= today.getTime() &&
            (!c.timeOfDay || comp.timeOfDay === c.timeOfDay)
          )
          
          const childrenWhoCompleted = new Set(completionsToday.map(comp => comp.childId)).size
          if (childrenWhoCompleted > 0) {
            return sum + (chore.points / childrenWhoCompleted)
          }
        }
      }
      
      return sum + chore.points
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
