export type ChoreFrequency = 'daily' | 'weekly' | 'bi-weekly'

export interface Chore {
  id: string
  name: string
  description: string
  points: number
  frequency: ChoreFrequency
  createdAt: number
  startDate?: number
  endDate?: number
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
