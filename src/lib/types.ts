export type ChoreFrequency = 'daily' | 'weekly' | 'bi-weekly'
export type ChoreTimeOfDay = 'am' | 'pm' | 'both' | 'anytime'
export type ChoreCompletionType = 'individual' | 'shareable' | 'once-per-day'
export type ChoreResetPeriod = 'daily' | 'weekly' | 'bi-weekly' | 'monthly'
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface ExchangeRate {
  fromCategoryId: string
  toCategoryId: string
  fromAmount: number
  toAmount: number
}

export interface CategoryCompletionBonus {
  targetCategoryId: string
  bonusPoints: number
}

export type PointsExpiryInterval = 'daily' | 'weekly' | 'monthly' | 'never'

export interface PointsExpiryConfig {
  enabled: boolean
  interval: PointsExpiryInterval
}

export interface Category {
  id: string
  name: string
  color: string
  description?: string
  createdAt: number
  exchangeRates?: ExchangeRate[]
  completionBonus?: CategoryCompletionBonus
  pointsExpiry?: PointsExpiryConfig
  showInUpNext?: boolean
  showInCalendar?: boolean
  prerequisiteCategoryId?: string
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

export interface ApprovalConfig {
  childId: string
  requiresApproval: boolean
}

export type WeatherConditionFilter = 
  | 'any'
  | 'clear'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'hot'
  | 'cold'
  | 'mild'

export interface WeatherConditionRequirement {
  conditions?: WeatherConditionFilter[]
  minTemp?: number
  maxTemp?: number
  unit?: 'celsius' | 'fahrenheit'
}

export interface SchoolHoliday {
  id: string
  name: string
  startDate: number
  endDate: number
  createdAt: number
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
  approvalConfigs?: ApprovalConfig[]
  maxCompletions?: number
  resetPeriod?: ChoreResetPeriod
  weatherConditions?: WeatherConditionRequirement
  speakDescription?: boolean
  inactiveOnSchoolHolidays?: boolean
  onlyOnSchoolHolidays?: boolean
}

export type CalendarRefreshInterval = 'never' | '5min' | '15min' | '30min' | '1hour' | '6hours' | '12hours' | '24hours'

export interface Child {
  id: string
  name: string
  avatarColor: string
  totalPoints: number
  createdAt: number
  icsUrl?: string
  calendarLastRefresh?: number
  calendarAutoRefresh?: boolean
  calendarRefreshInterval?: CalendarRefreshInterval
  calendarShowTimes?: boolean
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
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  approvedAt?: number
  approvedBy?: string
  rejectedReason?: string
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
  type: 'complete' | 'undo' | 'override-complete' | 'override-dismiss' | 'approve' | 'reject'
  childId: string
  choreId: string
  timestamp: number
  timeOfDay?: 'am' | 'pm'
  completionId?: string
  rejectedReason?: string
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
  isPointSwap?: boolean
  swapConfig?: {
    fromCategoryId: string
    toCategoryId: string
    fromAmount: number
    toAmount: number
  }
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
  showUndoButton?: boolean
}

export interface GoalTracker {
  childId: string
  rewardId: string
}

export interface PinAttempt {
  timestamp: number
  success: boolean
}

export interface PinSecurity {
  attempts: PinAttempt[]
  lockedUntil: number | null
  failedAttempts: number
}

export interface BiometricCredential {
  id: string
  publicKey: string
  counter: number
  createdAt: number
  lastUsed: number
  name: string
}

export interface BiometricSettings {
  enabled: boolean
  credentials: BiometricCredential[]
  requirePinFallback: boolean
  quickUnlockOnPWA: boolean
}

export interface PointSwap {
  id: string
  childId: string
  fromCategoryId: string
  toCategoryId: string
  fromAmount: number
  toAmount: number
  swappedAt: number
}

export interface CategoryBonusCompletion {
  id: string
  childId: string
  categoryId: string
  completedAt: number
  bonusPoints: number
  targetCategoryId: string
}

export interface IPRestrictionSettings {
  enabled: boolean
  allowedIPs: string[]
  overridePin: string | null
  requirePinForUnapproved: boolean
}

export interface IPAccessAttempt {
  ip: string
  timestamp: number
  granted: boolean
  usedPin: boolean
}

export interface DeviceConfig {
  id: string
  name: string
  firstSeen: number
  lastSeen: number
  createdAt: number
  allowedChildIds: string[]
  parentModeEnabled: boolean
}

export interface WeeklyReportSettings {
  enabled: boolean
  parentEmail: string | null
  sendDay: DayOfWeek
  sendTime: string
  lastSent: number | null
}

export interface WeeklyReportData {
  weekStart: number
  weekEnd: number
  children: {
    childId: string
    childName: string
    choresCompleted: number
    choresAssigned: number
    pointsEarned: number
    rewardsPurchased: number
    categoryBreakdown: {
      categoryId: string
      categoryName: string
      pointsEarned: number
      choresCompleted: number
    }[]
    topChores: {
      choreId: string
      choreName: string
      completionCount: number
    }[]
    streakDays: number
  }[]
  totalChoresCompleted: number
  totalPointsEarned: number
  mostActiveChild: string | null
}

export type ReportMetric = 
  | 'chores-completed'
  | 'chores-completion-rate'
  | 'points-earned'
  | 'rewards-purchased'
  | 'category-breakdown'
  | 'top-chores'
  | 'streak-days'
  | 'most-active-child'
  | 'completion-by-day'
  | 'completion-by-time'
  | 'missed-chores'
  | 'pending-approvals'
  | 'average-completion-time'

export type ReportPeriod = 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'custom'

export interface ReportTemplate {
  id: string
  name: string
  description?: string
  period: ReportPeriod
  metrics: ReportMetric[]
  includeCharts: boolean
  includeChildComparison: boolean
  includeCategoryBreakdown: boolean
  createdAt: number
  isDefault?: boolean
}

export interface GeneratedReport {
  id: string
  templateId: string
  templateName: string
  generatedAt: number
  periodStart: number
  periodEnd: number
  data: ReportData
}

export interface ReportData {
  period: {
    start: number
    end: number
  }
  children: ChildReportData[]
  summary: ReportSummary
}

export interface ChildReportData {
  childId: string
  childName: string
  metrics: {
    choresCompleted: number
    choresAssigned: number
    completionRate: number
    pointsEarned: number
    rewardsPurchased: number
    missedChores: number
    pendingApprovals: number
    streakDays: number
    averageCompletionTime?: number
  }
  categoryBreakdown: {
    categoryId: string
    categoryName: string
    pointsEarned: number
    choresCompleted: number
    completionRate: number
  }[]
  topChores: {
    choreId: string
    choreName: string
    completionCount: number
    pointsEarned: number
  }[]
  completionByDay: {
    date: number
    count: number
  }[]
  completionByTime: {
    timeOfDay: 'am' | 'pm' | 'anytime'
    count: number
  }[]
}

export interface ReportSummary {
  totalChoresCompleted: number
  totalChoresAssigned: number
  totalPointsEarned: number
  totalRewardsPurchased: number
  averageCompletionRate: number
  mostActiveChild: string | null
  mostCompletedChore: string | null
  mostEarnedCategory: string | null
}

export type TemperatureUnit = 'auto' | 'celsius' | 'fahrenheit'

export interface WeatherSettings {
  enabled: boolean
  location: string
  latitude: number | null
  longitude: number | null
  temperatureUnit: TemperatureUnit
  autoDetectedUnit?: 'celsius' | 'fahrenheit'
  seasonalThemesEnabled?: boolean
}

export interface WeatherData {
  temperature: number
  condition: string
  conditionCode: number
  feels_like: number
  humidity: number
  description: string
  unit: 'celsius' | 'fahrenheit'
}

export interface SMTPSettings {
  enabled: boolean
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  fromEmail: string
  fromName: string
}

export type DigestInterval = 'immediate' | '15min' | '30min' | '1hour' | '2hours' | '4hours' | 'daily'

export interface EmailAlertSettings {
  rewardPurchaseAlerts: boolean
  choreCompletionAlerts: boolean
  weeklyReportAlerts: boolean
  pendingApprovalAlerts: boolean
  recipientEmails: string[]
  digestMode: DigestInterval
  lastDigestSent: number | null
}

export interface PendingDigestItem {
  childId: string
  choreId: string
  completionId: string
  timestamp: number
}

export interface SpeechSettings {
  enabled: boolean
}

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface DevicePushSettings {
  deviceId: string
  subscription: PushSubscription | null
  enabled: boolean
  rewardPurchaseAlerts: boolean
  weeklyReportAlerts: boolean
  pendingApprovalAlerts: boolean
  digestMode: DigestInterval
  lastDigestSent: number | null
  createdAt: number
  updatedAt: number
}

export interface PushNotificationSettings {
  enabled: boolean
  devices: DevicePushSettings[]
}
