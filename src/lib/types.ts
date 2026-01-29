export type ChoreFrequency = 'daily' | 'weekly' | 'bi-weekly'
export type ChoreTimeOfDay = 'am' | 'pm' | 'both' | 'anytime'
export type ChoreCompletionType = 'individual' | 'shareable' | 'once-per-day'
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface Category {
  id: string
  name: string
  color: string
  description?: string
  createdAt: number
}

export interface RepeatPattern {
  interval: number
  unit: 'weeks'
  specificDays?: DayOfWeek[]
  anchorDate?: number
}

export interface CategoryPoints {
  categoryId: string
  points: number
}

export interface ChorePointOverride {
  childId: string
  points: number
}

export interface CategoryPointOverride {
  childId: string
  categoryId: string
  points: number
}

export interface TimeWindow {
  startTime: string
  endTime: string
}

export interface Chore {
  id: string
  name: string
  description: string
  points: number
  frequency: ChoreFrequency
  completionType: ChoreCompletionType
  createdAt: number
  categoryIds: string[]
  categoryPoints?: CategoryPoints[]
  desiredTime?: string
  timeOfDay?: ChoreTimeOfDay
  timeWindow?: TimeWindow
  estimatedDuration?: number
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
  startDate?: number
  endDate?: number
  daysOfWeek?: DayOfWeek[]
  repeatPattern?: RepeatPattern
  timeOfDay?: ChoreTimeOfDay
  timeWindow?: TimeWindow
  pointOverrides?: ChorePointOverride[]
  categoryPointOverrides?: CategoryPointOverride[]
}

export interface ChoreCompletion {
  id: string
  childId: string
  choreId: string
  completedAt: number
  timeOfDay?: 'am' | 'pm'
  undoneAt?: number
  overridden?: boolean
}

export interface MissedChore {
  childId: string
  choreId: string
  timeOfDay?: 'am' | 'pm'
  missedDate: number
  dismissed?: boolean
}

export interface ChoreHistoryEvent {
  id: string
  type: 'complete' | 'undo' | 'override-complete' | 'override-dismiss'
  childId: string
  choreId: string
  timestamp: number
  timeOfDay?: 'am' | 'pm'
  completionId?: string
}

export interface RewardCostOverride {
  childId: string
  cost: number
}

export interface RewardRequirement {
  childId: string
  requiredChoreIds: string[]
}

export type PurchaseLimitInterval = 'day' | 'week' | 'month' | 'ever'
export type PurchaseLimitScope = 'per-child' | 'total'

export interface PurchaseLimit {
  maxPurchases: number
  interval: PurchaseLimitInterval
  scope: PurchaseLimitScope
}

export interface Reward {
  id: string
  name: string
  description: string
  cost: number
  imageEmoji: string
  createdAt: number
  categoryIds: string[]
  costOverrides?: RewardCostOverride[]
  requirements?: RewardRequirement[]
  purchaseLimit?: PurchaseLimit
  disabled?: boolean
  startDate?: number
  expiryDate?: number
}

export interface RewardPurchase {
  id: string
  childId: string
  rewardId: string
  purchasedAt: number
  fulfilled: boolean
}

export type AppMode = 'parent' | 'child'

export type CelebrationAnimation = 
  | 'confetti'
  | 'fireworks'
  | 'sparkles'
  | 'stars'
  | 'bubbles'
  | 'hearts'

export interface CelebrationSettings {
  enabled: boolean
  animations: {
    [key in CelebrationAnimation]: boolean
  }
}

export interface GoalTracker {
  childId: string
  rewardId: string
}
