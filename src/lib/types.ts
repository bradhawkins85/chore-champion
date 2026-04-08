export type ChoreFrequency = 'daily' | 'weekly' | 'bi-weekly'
export type ChoreTimeOfDay = 'am' | 'pm' | 'both' | 'anytime'
export type ChoreCompletionType = 'individual' | 'shareable' | 'once-per-day' | 'rotational'
export type ChoreResetPeriod = 'daily' | 'weekly' | 'bi-weekly' | 'monthly'
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export type RotationMode = 'one-child-per-interval' | 'all-children'
export type RotationOrder = 'random' | 'specific'

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
  order?: number
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
  emoji?: string
  startDate: number
  endDate: number
  createdAt: number
}

export type SchoolHolidayCountdownMode = 'calendar-days' | 'school-days'

export interface SchoolHolidayCountdownSettings {
  enabled: boolean
  countdownMode: SchoolHolidayCountdownMode
  showRemainingDays: boolean
}

export interface RotationConfig {
  mode: RotationMode
  order: RotationOrder
  childOrder?: string[] // Only used when order is 'specific'
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
  specificDates?: number[]
  isActive?: boolean
  rotationConfig?: RotationConfig
  emoji?: string
  defaultStartDate?: number
  defaultEndDate?: number
  defaultDaysOfWeek?: DayOfWeek[]
  defaultRepeatPattern?: RepeatPattern
}

export type CalendarRefreshInterval = 'never' | '5min' | '15min' | '30min' | '1hour' | '6hours' | '12hours' | '24hours'

export interface Child {
  id: string
  name: string
  avatarColor: string
  totalPoints: number
  createdAt: number
  isActive?: boolean
  icsUrl?: string
  calendarLastRefresh?: number
  calendarAutoRefresh?: boolean
  calendarRefreshInterval?: CalendarRefreshInterval
  calendarShowTimes?: boolean
}

export type ChildAvailabilityType = 'home' | 'away'
export type ChildAvailabilityScheduleType = 'one-time' | 'recurring'

export interface ChildAvailabilityEntry {
  id: string
  childId: string
  type: ChildAvailabilityType
  scheduleType: ChildAvailabilityScheduleType
  startDate: number
  endDate: number
  repeatPattern?: RepeatPattern
  note?: string
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
  rotationState?: {
    currentChildId?: string // For rotational chores, who is currently assigned
    lastRotationDate?: number // When the last rotation occurred
    completedByChildIds?: string[] // For all-children mode, track who has completed
  }
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
  type: 'complete' | 'undo' | 'override-complete' | 'override-dismiss' | 'undo-dismiss' | 'approve' | 'reject'
  childId: string
  choreId: string
  timestamp: number
  timeOfDay?: 'am' | 'pm'
  completionId?: string
  rejectedReason?: string
}

export interface DayOfWeekCost {
  [key: string]: number // day of week (e.g., 'monday') to cost mapping
}

export interface RewardCostOverride {
  childId: string
  cost?: number // Default cost for all days (backward compatible)
  costByDay?: DayOfWeekCost // Optional per-day costs
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
  isActive?: boolean
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
  inactiveOnSchoolHolidays?: boolean
  onlyOnSchoolHolidays?: boolean
  holidayCostOverride?: number
}

export interface RewardPurchase {
  id: string
  childId: string
  rewardId: string
  purchasedAt: number
  fulfilled: boolean
  cost: number
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

export interface IPAccessRequest {
  id: string
  ip: string
  token: string
  requestedAt: number
  expiresAt: number
  approved: boolean
  approvedAt?: number
}

export interface IPRequestThrottle {
  ip: string
  attempts: number
  lastAttempt: number
  blockedUntil: number | null
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

export interface DeviceSettings {
  blockParentModeOnLinkedDevices: boolean
}

export interface WeeklyReportSettings {
  enabled: boolean
  parentEmail: string | null
  sendDay: DayOfWeek
  sendTime: string
  lastSent: number | null
}

// Per-parent weekly report settings
export interface ParentWeeklyReportSettings {
  enabled: boolean
  sendDay: DayOfWeek
  sendTime: string
  lastSent: number | null
}

// Map of userId to their weekly report settings
export interface WeeklyReportSettingsMap {
  [userId: string]: ParentWeeklyReportSettings
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

export type WallpaperMode = 'weather' | 'non-weather' | 'gallery'

export interface WallpaperSettings {
  enabled: boolean
  weatherWallpapersEnabled: boolean
  nonWeatherWallpapersEnabled: boolean
  galleryWallpapersEnabled: boolean
  animationsEnabled: boolean
  defaultMode: WallpaperMode
  galleryWallpaperId: string | null
}

export interface DeviceWallpaperSettings {
  mode: WallpaperMode
}

export interface DeviceWallpaperSettingsMap {
  [deviceId: string]: DeviceWallpaperSettings
}

export interface WallpaperAsset {
  id: string
  name: string
  fileType: 'image' | 'video'
  mimeType: string
  url: string
  createdAt: string
}

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
  weeklyReportAlerts: boolean
  pendingApprovalAlerts: boolean
  recipientEmails: string[]
  digestMode: DigestInterval
  lastDigestSent: number | null
}

// Per-parent email alert settings
export interface ParentEmailAlertSettings {
  rewardPurchaseAlerts: boolean
  weeklyReportAlerts: boolean
  pendingApprovalAlerts: boolean
  digestMode: DigestInterval
  lastDigestSent: number | null
}

// Map of userId to their email alert settings
export interface EmailAlertSettingsMap {
  [userId: string]: ParentEmailAlertSettings
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

export interface GettingStartedTask {
  id: string
  label: string
  completed: boolean
  ignored: boolean
  targetTab?: string
  targetSubTab?: string
}

export interface GettingStartedState {
  dismissed: boolean
  tasks: GettingStartedTask[]
}

// Subscription & Billing Types
export type SubscriptionTier = 'free' | 'paid' | 'unlimited'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid'
export type BillingInterval = 'monthly' | 'annual'

export interface SubscriptionPlanLimits {
  maxChildren: number | null // null = unlimited
  maxDevices: number | null // null = unlimited
  maxChores: number | null // null = unlimited
  maxRewards: number | null // null = unlimited
}

export interface SubscriptionPlan {
  id: string
  name: string
  tier: SubscriptionTier
  description: string
  limits: SubscriptionPlanLimits
  pricePerChildAUD: number // Price in AUD per child per month (0 for free/unlimited)
  basePrice: number // Base monthly price (for non-per-child tiers)
  billingInterval: BillingInterval
  features: string[]
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface Subscription {
  id: string
  tenantId: string
  planId: string
  plan?: SubscriptionPlan
  status: SubscriptionStatus
  currentPeriodStart: number
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
  canceledAt: number | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  createdAt: number
  updatedAt: number
}

export interface Invoice {
  id: string
  tenantId: string
  subscriptionId: string
  amountDue: number // Amount in cents (AUD)
  amountPaid: number
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  dueDate: number
  paidAt: number | null
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
  stripeInvoiceId: string | null
  description: string
  createdAt: number
}

export interface PaymentMethod {
  id: string
  tenantId: string
  stripePaymentMethodId: string
  type: 'card' | 'bank_account'
  last4: string
  brand: string // e.g., 'visa', 'mastercard'
  expiryMonth: number
  expiryYear: number
  isDefault: boolean
  createdAt: number
}

export interface UsageStats {
  childrenCount: number
  devicesCount: number
  choresCount: number
  rewardsCount: number
}
