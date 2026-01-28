export type ChoreFrequency = 'daily' | 'weekly' | 'bi-weekly'
export type ChoreTimeOfDay = 'am' | 'pm' | 'both' | 'anytime'
export type ChoreCompletionType = 'individual' | 'shareable' | 'once-per-day'
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface Chore {
  id: string
  name: string
  description: string
  points: number
  frequency: ChoreFrequency
  timeOfDay: ChoreTimeOfDay
  completionType: ChoreCompletionType
  createdAt: number
  startDate?: number
  endDate?: number
  daysOfWeek?: DayOfWeek[]
}

export interface Child {
  id: string
  name: string
  avatarColor: string
  totalPoints: number
  createdAt: number
}

export interface ChoreAssignment {
  id: string
  childId: string
  choreId: string
  assignedAt: number
}

export interface ChoreCompletion {
  id: string
  childId: string
  choreId: string
  completedAt: number
  timeOfDay?: 'am' | 'pm'
}

export interface Reward {
  id: string
  name: string
  description: string
  cost: number
  imageEmoji: string
  createdAt: number
}

export interface RewardPurchase {
  id: string
  childId: string
  rewardId: string
  purchasedAt: number
  fulfilled: boolean
}

export type AppMode = 'parent' | 'child'
