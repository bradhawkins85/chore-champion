export type ChoreFrequency = 'daily' | 'weekly'

export interface Chore {
  id: string
  name: string
  description: string
  points: number
  frequency: ChoreFrequency
  createdAt: number
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

export type AppMode = 'parent' | 'child'
