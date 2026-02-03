import { useState, useMemo, useEffect, useRef } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useApiKV as useKV } from '@/hooks/use-api-kv'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Gear } from '@phosphor-icons/react'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { ParentPanel } from '@/components/ParentPanel'
import { ChildSelector } from '@/components/ChildSelector'
import { ChildChoreView } from '@/components/ChildChoreView'
import { RewardShop } from '@/components/RewardShop'
import { ParentPinDialog } from '@/components/ParentPinDialog'
import { QuickUnlockPrompt } from '@/components/QuickUnlockPrompt'
import { PointsHistoryView } from '@/components/PointsHistoryView'
import { CalendarView } from '@/components/CalendarView'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { AuthPage } from '@/components/AuthPage'
import { AcceptInvitationPage } from '@/components/AcceptInvitationPage'
import { DeviceLinkingScreen } from '@/components/DeviceLinkingScreen'
import { ApproveAccessPage } from '@/components/ApproveAccessPage'
import { initializePWA } from '@/lib/pwaHelper'
import { getDeviceId, registerDevice, getDeviceGuid, getLinkedDevices } from '@/lib/deviceHelper'
import {
  AppMode,
  Child,
  Chore,
  ChoreAssignment,
  ChoreCompletion,
  ChoreHistoryEvent,
  Reward,
  RewardPurchase,
  MissedChore,
  CelebrationSettings,
  CelebrationAnimation,
  GoalTracker,
  Category,
  DayOfWeek,
  RepeatPattern,
  PinSecurity,
  BiometricSettings,
  PointSwap,
  CategoryBonusCompletion,
  IPRestrictionSettings,
  IPAccessAttempt,
  WeeklyReportSettings,
  EmailAlertSettings,
  EmailAlertSettingsMap,
  WeeklyReportSettingsMap,
  ParentEmailAlertSettings,
  ReportTemplate,
  WeatherSettings,
  SpeechSettings,
  PushNotificationSettings,
  SchoolHoliday,
  ChildAvailabilityEntry,
  SchoolHolidayCountdownSettings,
  GettingStartedState,
} from '@/lib/types'
import { getChildTotalPoints, getChildAvailablePoints, canPurchaseReward, DEFAULT_CATEGORIES, getChildPointsByCategory, isRewardActive, getChildAvailablePointsByCategory, areAllCategoryChoresCompleted, hasBonusBeenClaimedToday, getUserIPAddress, isIPAllowed, isPrerequisiteCategoryCompleted, getUpdatedRotationState } from '@/lib/helpers'
import { DEFAULT_REPORT_TEMPLATES } from '@/lib/reportHelpers'
import { WelcomePage } from '@/components/WelcomePage'
import { fetchWeatherData } from '@/lib/weatherHelper'
import { getSeasonalTheme, applyThemeToDOM } from '@/lib/themeHelper'
import { WeatherData } from '@/lib/types'

function App() {
  const location = useLocation()
  const { user, token, loading: authLoading, logout, loginWithDevice, getTenantUsers } = useAuth()
  
  // Handle accept-invitation route
  if (location.pathname === '/accept-invitation') {
    return <AcceptInvitationPage />
  }
  
  const [mode, setMode] = useState<AppMode>('child')
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [showRewardShop, setShowRewardShop] = useState(false)
  const [showPointsHistory, setShowPointsHistory] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [showDeviceLinking, setShowDeviceLinking] = useState(false)
  const [deviceIsLinked, setDeviceIsLinked] = useState(false)
  const [deviceAllowedChildrenIds, setDeviceAllowedChildrenIds] = useState<string[]>([])
  const [deviceRegistrationComplete, setDeviceRegistrationComplete] = useState(false)
  
  const [parentPin, setParentPin] = useKV<string | null>('parent-pin', '0000')
  const [pinSecurity, setPinSecurity] = useKV<PinSecurity>('pin-security', {
    attempts: [],
    lockedUntil: null,
    failedAttempts: 0,
  })
  const [biometricSettings, setBiometricSettings] = useKV<BiometricSettings>('biometric-settings', {
    enabled: false,
    credentials: [],
    requirePinFallback: true,
    quickUnlockOnPWA: true,
  })

  const [chores, setChores] = useKV<Chore[]>('chores', [])
  const [childrenList, setChildrenList] = useKV<Child[]>('children', [])
  const [assignments, setAssignments] = useKV<ChoreAssignment[]>('assignments', [])
  const [completions, setCompletions] = useKV<ChoreCompletion[]>('completions', [])
  const [rewards, setRewards] = useKV<Reward[]>('rewards', [])
  const [purchases, setPurchases] = useKV<RewardPurchase[]>('purchases', [])
  const [history, setHistory] = useKV<ChoreHistoryEvent[]>('chore-history', [])
  const [dismissedMissedChores, setDismissedMissedChores] = useKV<MissedChore[]>('dismissed-missed-chores', [])
  const [celebrationSettings, setCelebrationSettings] = useKV<CelebrationSettings>('celebration-settings', {
    enabled: true,
    animations: {
      confetti: true,
      fireworks: true,
      sparkles: true,
      stars: true,
      bubbles: true,
      hearts: true,
    },
    showUndoButton: true,
  })
  const [trackedGoals, setTrackedGoals] = useKV<GoalTracker[]>('tracked-goals', [])
  const [categories, setCategories] = useKV<Category[]>('categories', [])
  const [pointSwaps, setPointSwaps] = useKV<PointSwap[]>('point-swaps', [])
  const [bonusCompletions, setBonusCompletions] = useKV<CategoryBonusCompletion[]>('bonus-completions', [])
  const [ipRestrictions, setIPRestrictions] = useKV<IPRestrictionSettings>('ip-restrictions', {
    enabled: false,
    allowedIPs: [],
    overridePin: null,
    requirePinForUnapproved: false,
  })
  const [accessHistory, setAccessHistory] = useKV<IPAccessAttempt[]>('access-history', [])
  const [weeklyReportSettings, setWeeklyReportSettings] = useKV<WeeklyReportSettings>('weekly-report-settings', {
    enabled: false,
    parentEmail: null,
    sendDay: 'sunday',
    sendTime: '18:00',
    lastSent: null,
  })
  const [reportTemplates, setReportTemplates] = useKV<ReportTemplate[]>('report-templates', [])
  const [weatherSettings, setWeatherSettings] = useKV<WeatherSettings>('weather-settings', {
    enabled: false,
    location: '',
    latitude: null,
    longitude: null,
    temperatureUnit: 'auto',
    seasonalThemesEnabled: false,
  })
  const [smtpEnabled, setSmtpEnabled] = useState(false)
  const [emailAlertSettings, setEmailAlertSettings] = useKV<EmailAlertSettings>('email-alert-settings', {
    rewardPurchaseAlerts: false,
    choreCompletionAlerts: false,
    weeklyReportAlerts: false,
    pendingApprovalAlerts: false,
    recipientEmails: [],
    digestMode: 'immediate',
    lastDigestSent: null,
  })
  // New per-parent settings maps
  const [emailAlertSettingsMap, setEmailAlertSettingsMap] = useKV<EmailAlertSettingsMap>('email-alert-settings-map', {})
  const [weeklyReportSettingsMap, setWeeklyReportSettingsMap] = useKV<WeeklyReportSettingsMap>('weekly-report-settings-map', {})
  const [pendingDigestItems, setPendingDigestItems] = useKV<any[]>('pending-digest-items', [])
  const [speechSettings, setSpeechSettings] = useKV<SpeechSettings>('speech-settings', {
    enabled: true,
  })
  const [pushNotificationSettings, setPushNotificationSettings] = useKV<PushNotificationSettings>('push-notification-settings', {
    enabled: false,
    devices: [],
  })
  const [schoolHolidays, setSchoolHolidays] = useKV<SchoolHoliday[]>('school-holidays', [])
  const [childAvailability, setChildAvailability] = useKV<ChildAvailabilityEntry[]>('child-availability', [])
  const [schoolHolidayCountdownSettings, setSchoolHolidayCountdownSettings] = useKV<SchoolHolidayCountdownSettings>('school-holiday-countdown-settings', {
    enabled: false,
    countdownMode: 'calendar-days',
    showRemainingDays: true,
  })
  const [hideChildrenWithNoActivity, setHideChildrenWithNoActivity] = useKV<boolean>('hide-children-with-no-activity', false)
  const [blockParentModeOnLinkedDevices, setBlockParentModeOnLinkedDevices] = useKV<boolean>('block-parent-mode-on-linked-devices', false)
  const [gettingStartedState, setGettingStartedState] = useKV<GettingStartedState>('getting-started-state', {
    dismissed: false,
    tasks: [
      { id: 'dismiss', label: "I Don't Need Help Getting Started", completed: false, ignored: false },
      { id: 'add-child', label: 'Add Your First Child', completed: false, ignored: false, targetTab: 'management', targetSubTab: 'children' },
      { id: 'create-chore', label: 'Create Your First Chore', completed: false, ignored: false, targetTab: 'management', targetSubTab: 'chores' },
      { id: 'assign-chore', label: 'Assign Chores to Children', completed: false, ignored: false, targetTab: 'management', targetSubTab: 'children' },
      { id: 'add-reward', label: 'Add Your First Reward', completed: false, ignored: false, targetTab: 'management', targetSubTab: 'rewards' },
      { id: 'set-pin', label: 'Set Your Parent PIN', completed: false, ignored: false, targetTab: 'settings-tab', targetSubTab: 'security' },
    ],
  })
  const normalizedParentPin = (() => {
    if (typeof parentPin !== 'string') {
      return parentPin ?? null
    }
    const trimmedPin = parentPin.trim()
    if (!trimmedPin || trimmedPin === 'null' || trimmedPin === 'undefined') {
      return null
    }
    return trimmedPin
  })()
  const [currentIP, setCurrentIP] = useState<string | null>(null)
  const [ipAccessGranted, setIPAccessGranted] = useState<boolean>(false)
  const [isCheckingIP, setIsCheckingIP] = useState<boolean>(true)
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null)
  const [showApprovalPage, setShowApprovalPage] = useState<boolean>(false)
  const [approvalToken, setApprovalToken] = useState<string | null>(null)

  const coerceArray = <T,>(value: unknown): T[] => {
    if (Array.isArray(value)) return value
    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, T>)
    }
    return []
  }

  const safeChores = coerceArray<Chore>(chores)
  const safeChildrenList = coerceArray<Child>(childrenList)
  const safeCategories = coerceArray<Category>(categories)
  const safeAssignments = coerceArray<ChoreAssignment>(assignments)
  const safeCompletions = coerceArray<ChoreCompletion>(completions)
  const safeRewards = coerceArray<Reward>(rewards)
  const safePurchases = coerceArray<RewardPurchase>(purchases)
  const safeHistory = coerceArray<ChoreHistoryEvent>(history)
  const safeDismissedMissedChores = coerceArray<MissedChore>(dismissedMissedChores)
  const safePointSwaps = coerceArray<PointSwap>(pointSwaps)
  const safeBonusCompletions = coerceArray<CategoryBonusCompletion>(bonusCompletions)
  const safeTrackedGoals = coerceArray<GoalTracker>(trackedGoals)
  const safeAccessHistory = coerceArray<IPAccessAttempt>(accessHistory)
  const safeReportTemplates = coerceArray<ReportTemplate>(reportTemplates)
  const safePendingDigestItems = coerceArray<any>(pendingDigestItems)
  const safeChildAvailability = coerceArray<ChildAvailabilityEntry>(childAvailability)
  
  // Filter children based on device restrictions
  // If deviceAllowedChildrenIds is empty array, all children are allowed (default behavior)
  // If it has specific IDs, only those children are allowed
  const filteredChildrenList = useMemo(() => {
    if (deviceIsLinked && deviceAllowedChildrenIds.length > 0) {
      return safeChildrenList.filter(child => deviceAllowedChildrenIds.includes(child.id))
    }
    return safeChildrenList
  }, [safeChildrenList, deviceIsLinked, deviceAllowedChildrenIds])
  
  const hasMigratedRewards = useRef(false)
  const hasInitializedCategories = useRef(false)
  const hasMigratedPinSecurity = useRef(false)
  const hasRegisteredDevice = useRef(false)

  // Helper function to ensure pendingDigestItems is always an array
  const getValidatedDigestItems = (): any[] => {
    return safePendingDigestItems
  }

  useEffect(() => {
    initializePWA()
    
    // Check if URL contains an approval token
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    if (token) {
      setApprovalToken(token)
      setShowApprovalPage(true)
    }
  }, [])

  // Register device on app mount and handle auto-login
  useEffect(() => {
    // Only run device registration once, after initial auth check is complete
    if (authLoading || hasRegisteredDevice.current) {
      return
    }

    hasRegisteredDevice.current = true

    const registerDeviceOnMount = async () => {
      try {
        const deviceInfo = await registerDevice()
        setDeviceIsLinked(deviceInfo.isLinked)
        
        // If device is linked and user is not authenticated, auto-login with device
        if (deviceInfo.isLinked && !user) {
          try {
            await loginWithDevice(deviceInfo.deviceGuid)
          } catch (error) {
            console.error('Error auto-logging in with device:', error)
            // If device login fails, user will see the normal auth page
          }
        }
      } catch (error) {
        console.error('Error registering device:', error)
      } finally {
        // Mark device registration as complete
        setDeviceRegistrationComplete(true)
      }
    }
    
    registerDeviceOnMount()
  }, [authLoading, user, loginWithDevice])

  // Fetch device configuration to get allowed children IDs
  useEffect(() => {
    const fetchDeviceConfig = async () => {
      if (!token || !deviceIsLinked) {
        setDeviceAllowedChildrenIds([])
        return
      }
      
      try {
        const devices = await getLinkedDevices(token)
        const currentDeviceGuid = getDeviceGuid()
        const currentDevice = devices.find(d => d.deviceGuid === currentDeviceGuid)
        
        if (currentDevice && currentDevice.allowedChildrenIds) {
          setDeviceAllowedChildrenIds(currentDevice.allowedChildrenIds)
        } else {
          // Empty array means all children are allowed
          setDeviceAllowedChildrenIds([])
        }
      } catch (error) {
        console.error('Error fetching device configuration:', error)
        // On error, allow all children
        setDeviceAllowedChildrenIds([])
      }
    }
    
    fetchDeviceConfig()
  }, [token, deviceIsLinked])

  // Fetch SMTP configuration status from server
  useEffect(() => {
    const fetchSmtpStatus = async () => {
      try {
        const response = await fetch('/api/config/smtp-status')
        if (!response.ok) {
          throw new Error('Failed to fetch SMTP status')
        }
        const data = await response.json()
        setSmtpEnabled(data.enabled)
      } catch (error) {
        console.error('Error fetching SMTP status:', error)
        setSmtpEnabled(false)
      }
    }
    
    fetchSmtpStatus()
  }, [])

  useEffect(() => {
    if (parentPin !== normalizedParentPin) {
      setParentPin(normalizedParentPin)
    }
  }, [parentPin, normalizedParentPin, setParentPin])

  // Validate and fix pinSecurity data structure - one-time migration
  useEffect(() => {
    if (pinSecurity && !hasMigratedPinSecurity.current) {
      // Ensure attempts is always an array (handles null, undefined, or non-array values)
      if (!Array.isArray(pinSecurity.attempts)) {
        const fixedSecurity: PinSecurity = {
          attempts: [],
          lockedUntil: pinSecurity.lockedUntil || null,
          failedAttempts: pinSecurity.failedAttempts || 0,
        }
        setPinSecurity(fixedSecurity)
        hasMigratedPinSecurity.current = true
      } else {
        hasMigratedPinSecurity.current = true
      }
    }
  }, [pinSecurity, setPinSecurity]) // Dependencies included for proper reactivity

  useEffect(() => {
    const checkIPAccess = async () => {
      setIsCheckingIP(true)
      const ip = await getUserIPAddress()
      setCurrentIP(ip)
      
      if (!ipRestrictions || !ipRestrictions.enabled) {
        setIPAccessGranted(true)
        setIsCheckingIP(false)
        return
      }
      
      const allowed = isIPAllowed(ip, ipRestrictions)
      setIPAccessGranted(allowed)
      setIsCheckingIP(false)
      
      const accessAttempt: IPAccessAttempt = {
        ip: ip || 'unknown',
        timestamp: Date.now(),
        granted: allowed,
        usedPin: false,
      }
      setAccessHistory((current) => [...(current || []), accessAttempt])
    }
    
    checkIPAccess()
  }, [ipRestrictions?.enabled, ipRestrictions?.allowedIPs])

  useEffect(() => {
    if (!hasInitializedCategories.current && safeCategories.length === 0) {
      const defaultCategories = DEFAULT_CATEGORIES.map((cat, index) => {
        const categoryId = `category_default_${index}`
        const exchangeRates = cat.exchangeRates?.map(rate => ({
          ...rate,
          fromCategoryId: categoryId,
          toCategoryId: rate.toCategoryId === 'Extra' ? `category_default_1` : rate.toCategoryId,
        }))
        
        return {
          ...cat,
          id: categoryId,
          createdAt: 0,
          exchangeRates,
          pointsExpiry: cat.pointsExpiry || { enabled: false, interval: 'never' as const },
        }
      })
      setCategories(defaultCategories)
      hasInitializedCategories.current = true
    }
  }, [safeCategories, setCategories])

  useEffect(() => {
    if (safeReportTemplates.length === 0) {
      const defaultTemplates = DEFAULT_REPORT_TEMPLATES.map((template, index: number) => ({
        ...template,
        id: `template_default_${index}`,
        createdAt: Date.now(),
      }))
      setReportTemplates(defaultTemplates)
    }
  }, [safeReportTemplates, setReportTemplates])

  useEffect(() => {
    if (safeRewards.length > 0) {
      const needsUpdate = safeRewards.some(r => 
        r.expiryDate && Date.now() > r.expiryDate && !r.disabled
      )
      
      if (needsUpdate) {
        setRewards(currentRewards =>
          (currentRewards || []).map(reward => {
            if (reward.expiryDate && Date.now() > reward.expiryDate && !reward.disabled) {
              return { ...reward, disabled: true }
            }
            return reward
          })
        )
      }
    }
  }, [safeRewards, setRewards])

  const migratedChores = useMemo(() => {
    if (!safeChores || safeChores.length === 0) return safeChores || []
    
    let needsAnyMigration = false
    for (const chore of safeChores) {
      if (!chore.timeOfDay || !chore.completionType || !chore.categoryIds || !chore.categoryPoints) {
        needsAnyMigration = true
        break
      }
    }
    
    if (!needsAnyMigration) {
      return safeChores
    }
    
    const firstCategoryId = safeCategories[0]?.id
    
    return safeChores.map((chore) => {
      const needsMigration = !chore.timeOfDay || !chore.completionType || !chore.categoryIds || !chore.categoryPoints
      
      if (needsMigration) {
        const migratedChore: Chore = {
          ...chore,
          timeOfDay: chore.timeOfDay || 'anytime',
          completionType: chore.completionType || 'individual',
          categoryIds: chore.categoryIds || (firstCategoryId ? [firstCategoryId] : []),
        }
        
        if (!chore.categoryPoints && migratedChore.categoryIds.length > 0) {
          migratedChore.categoryPoints = migratedChore.categoryIds.map(catId => ({
            categoryId: catId,
            points: chore.points || 10,
          }))
        }
        
        return migratedChore
      }
      
      return chore
    })
  }, [safeChores, safeCategories])

  useEffect(() => {
    if (safeAssignments && safeAssignments.length > 0) {
      const oldChores = safeChores
      const needsMigration = oldChores.some((c: any) => c.daysOfWeek || c.repeatPattern || c.startDate || c.endDate)
      
      if (needsMigration) {
        const updatedAssignments = safeAssignments.map(assignment => {
          const oldChore: any = oldChores.find((c: any) => c.id === assignment.choreId)
          if (oldChore && !assignment.daysOfWeek && !assignment.repeatPattern && !assignment.startDate && !assignment.endDate) {
            return {
              ...assignment,
              daysOfWeek: oldChore.daysOfWeek,
              repeatPattern: oldChore.repeatPattern,
              startDate: oldChore.startDate,
              endDate: oldChore.endDate,
            }
          }
          return assignment
        })
        setAssignments(updatedAssignments)
        
        const cleanedChores = oldChores.map((chore: any) => {
          const { daysOfWeek, repeatPattern, startDate, endDate, ...rest } = chore
          return rest
        })
        setChores(cleanedChores)
      }
    }
  }, [safeAssignments, safeChores, setAssignments, setChores])

  const choresMap = useMemo(() => {
    return new Map((migratedChores || []).map((c) => [c.id, c]))
  }, [migratedChores])

  const childPoints = useMemo(() => {
    const points = new Map<string, number>()
    safeChildrenList.forEach((child) => {
      points.set(child.id, getChildTotalPoints(safeCompletions, choresMap, child.id, safeAssignments))
    })
    return points
  }, [safeChildrenList, safeCompletions, choresMap, safeAssignments])

  const migratedRewards = useMemo(() => {
    if (!safeRewards || safeRewards.length === 0) return safeRewards || []
    
    const needsMigration = safeRewards.some(r => !Array.isArray(r.categoryIds) || r.categoryIds === undefined || r.categoryIds === null)
    if (!needsMigration) return safeRewards
    
    const firstCategoryId = safeCategories[0]?.id
    
    return safeRewards.map((reward) => {
      const rewardCategoryIds = reward.categoryIds
      const hasValidCategoryIds = Array.isArray(rewardCategoryIds) && rewardCategoryIds !== null && rewardCategoryIds !== undefined
      
      return {
        ...reward,
        categoryIds: hasValidCategoryIds ? [...rewardCategoryIds] : (firstCategoryId ? [firstCategoryId] : []),
      }
    })
  }, [safeRewards, safeCategories])

  const migratedPurchases = useMemo(() => {
    if (!safePurchases || safePurchases.length === 0) return safePurchases || []
    
    const needsMigration = safePurchases.some(p => typeof p.cost !== 'number')
    if (!needsMigration) return safePurchases
    
    const rewardsMap = new Map((migratedRewards || []).map((r) => [r.id, r]))
    
    return safePurchases.map((purchase) => {
      if (typeof purchase.cost === 'number') {
        return purchase
      }
      
      const reward = rewardsMap.get(purchase.rewardId)
      if (!reward) {
        return { ...purchase, cost: 0 }
      }
      
      const override = reward.costOverrides?.find(o => o.childId === purchase.childId)
      const cost = override ? override.cost : reward.cost
      
      return { ...purchase, cost }
    })
  }, [safePurchases, migratedRewards])

  const childCategoryPoints = useMemo(() => {
    const categoryPointsMap = new Map<string, Map<string, number>>()
    safeChildrenList.forEach((child) => {
      const childCatPoints = new Map<string, number>()
      safeCategories.forEach((category) => {
        const points = getChildPointsByCategory(
          safeCompletions,
          choresMap,
          child.id,
          category.id,
          safeAssignments,
          safeBonusCompletions,
          category
        )
        childCatPoints.set(category.id, points)
      })
      categoryPointsMap.set(child.id, childCatPoints)
    })
    return categoryPointsMap
  }, [safeChildrenList, safeCategories, safeCompletions, choresMap, safeAssignments, safeBonusCompletions])

  const childAvailableCategoryPoints = useMemo(() => {
    const availableCategoryPointsMap = new Map<string, Map<string, number>>()
    safeChildrenList.forEach((child) => {
      const childAvailPoints = new Map<string, number>()
      const rewardsMap = new Map((migratedRewards || []).map((r) => [r.id, r]))
      const childPurchases = migratedPurchases
        .filter((p) => p.childId === child.id)
        .map((p) => ({
          rewardId: p.rewardId,
          cost: p.cost,
        }))
      const childSwaps = safePointSwaps.filter((s) => s.childId === child.id)
      
      safeCategories.forEach((category) => {
        const totalPoints = childCategoryPoints.get(child.id)?.get(category.id) || 0
        const availablePoints = getChildAvailablePointsByCategory(
          totalPoints,
          childPurchases,
          rewardsMap,
          category.id,
          childSwaps
        )
        childAvailPoints.set(category.id, availablePoints)
      })
      availableCategoryPointsMap.set(child.id, childAvailPoints)
    })
    return availableCategoryPointsMap
  }, [safeChildrenList, safeCategories, childCategoryPoints, migratedPurchases, migratedRewards, safePointSwaps])

  const handleAddChore = (choreData: Omit<Chore, 'id' | 'createdAt'>) => {
    const newChore: Chore = {
      ...choreData,
      id: `chore_${Date.now()}_${Math.random()}`,
      createdAt: Date.now(),
    }
    setChores((current) => [...(current || []), newChore])
    toast.success(`Chore "${newChore.name}" created!`)
  }

  const handleEditChore = (
    id: string,
    choreData: Omit<Chore, 'id' | 'createdAt'>
  ) => {
    setChores((current) =>
      (current || []).map((c) =>
        c.id === id ? { ...c, ...choreData } : c
      )
    )
    toast.success('Chore updated!')
  }

  const handleDeleteChore = (id: string) => {
    setChores((current) => (current || []).filter((c) => c.id !== id))
    setAssignments((current) => (current || []).filter((a) => a.choreId !== id))
    toast.success('Chore deleted')
  }

  const handleAddChild = (
    childData: Omit<Child, 'id' | 'createdAt' | 'totalPoints'>
  ) => {
    const newChild: Child = {
      ...childData,
      id: `child_${Date.now()}_${Math.random()}`,
      totalPoints: 0,
      createdAt: Date.now(),
    }
    setChildrenList((current) => [...(current || []), newChild])
    toast.success(`${newChild.name} added!`)
  }

  const handleEditChild = (
    id: string,
    childData: Omit<Child, 'id' | 'createdAt' | 'totalPoints'>
  ) => {
    setChildrenList((current) =>
      (current || []).map((c) =>
        c.id === id ? { ...c, ...childData } : c
      )
    )
    toast.success('Child updated!')
  }

  const handleDeleteChild = (id: string) => {
    setChildrenList((current) => (current || []).filter((c) => c.id !== id))
    setAssignments((current) => (current || []).filter((a) => a.childId !== id))
    setCompletions((current) => (current || []).filter((c) => c.childId !== id))
    setChildAvailability((current) => (current || []).filter((entry) => entry.childId !== id))
    
    toast.success('Child removed')
  }

  const handleAddChildAvailability = (
    entryData: Omit<ChildAvailabilityEntry, 'id'>
  ) => {
    const newEntry: ChildAvailabilityEntry = {
      ...entryData,
      id: `availability_${Date.now()}_${Math.random()}`,
    }
    setChildAvailability((current) => [...(current || []), newEntry])
    toast.success('Availability added')
  }

  const handleUpdateChildAvailability = (
    id: string,
    updates: Omit<ChildAvailabilityEntry, 'id'>
  ) => {
    setChildAvailability((current) =>
      (current || []).map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry
      )
    )
    toast.success('Availability updated')
  }

  const handleDeleteChildAvailability = (id: string) => {
    setChildAvailability((current) => (current || []).filter((entry) => entry.id !== id))
    toast.success('Availability removed')
  }

  const handleAssignChore = (childId: string, choreId: string) => {
    const chore = (migratedChores || []).find((c) => c.id === choreId)
    const newAssignment: ChoreAssignment = {
      id: `assignment_${Date.now()}_${Math.random()}`,
      childId,
      choreId,
      assignedAt: Date.now(),
    }
    
    // Initialize rotation state for rotational chores
    if (chore?.completionType === 'rotational' && chore.rotationConfig) {
      const { mode, order, childOrder } = chore.rotationConfig
      const allChoreAssignments = [...(safeAssignments || []), newAssignment]
      const assignedChildren = allChoreAssignments.filter(a => a.choreId === choreId)
      
      if (mode === 'one-child-per-interval') {
        // Set the first child as current if this is the first assignment
        if (assignedChildren.length === 1) {
          newAssignment.rotationState = {
            currentChildId: childId,
            lastRotationDate: undefined,
            completedByChildIds: []
          }
        }
      } else if (mode === 'all-children') {
        // Initialize empty completed list
        if (assignedChildren.length === 1) {
          newAssignment.rotationState = {
            currentChildId: undefined,
            lastRotationDate: undefined,
            completedByChildIds: []
          }
        }
      }
    }
    
    setAssignments((current) => [...(current || []), newAssignment])
    toast.success('Chore assigned!')
  }

  const handleUnassignChore = (assignmentId: string) => {
    setAssignments((current) => (current || []).filter((a) => a.id !== assignmentId))
    toast.success('Chore unassigned')
  }

  const handleEditAssignment = (
    assignmentId: string,
    updates: {
      startDate?: number
      endDate?: number
      daysOfWeek?: DayOfWeek[]
      repeatPattern?: RepeatPattern
      timeOfDay?: 'am' | 'pm' | 'both' | 'anytime'
      timeWindow?: { startTime: string; endTime: string }
      pointOverrides?: { childId: string; points: number }[]
      categoryPointOverrides?: { childId: string; categoryId: string; points: number }[]
    }
  ) => {
    setAssignments((current) =>
      (current || []).map((a) =>
        a.id === assignmentId ? { ...a, ...updates } : a
      )
    )
    toast.success('Assignment updated!')
  }

  const handleCompleteChore = (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => {
    const chore = (migratedChores || []).find((c) => c.id === choreId)
    if (!chore) return
    
    // Check if all category prerequisites are met
    const choreCategories = chore.categoryIds || []
    for (const categoryId of choreCategories) {
      const prerequisiteMet = isPrerequisiteCategoryCompleted(
        childId,
        categoryId,
        safeCategories,
        safeAssignments,
        choresMap,
        safeCompletions
      )
      
      if (!prerequisiteMet) {
        const category = safeCategories.find((c) => c.id === categoryId)
        const prerequisiteCategory = safeCategories.find(
          (c) => c.id === category?.prerequisiteCategoryId
        )
        toast.error('Cannot complete this chore', {
          description: prerequisiteCategory
            ? `You must complete all ${prerequisiteCategory.name} chores first.`
            : 'Category prerequisites not met.',
        })
        return
      }
    }
    
    const requiresApproval = chore ? chore.approvalConfigs?.find(c => c.childId === childId)?.requiresApproval : false
    
    const completionId = `completion_${Date.now()}_${Math.random()}`
    const newCompletion: ChoreCompletion = {
      id: completionId,
      childId,
      choreId,
      completedAt: Date.now(),
      timeOfDay,
      approvalStatus: requiresApproval ? 'pending' : 'approved',
    }
    setCompletions((current) => [...(current || []), newCompletion])
    
    const historyEvent: ChoreHistoryEvent = {
      id: `history_${Date.now()}_${Math.random()}`,
      type: 'complete',
      childId,
      choreId,
      timestamp: Date.now(),
      timeOfDay,
      completionId,
    }
    setHistory((current) => [...(current || []), historyEvent])
    
    // Update rotation state for rotational chores
    if (chore.completionType === 'rotational' && chore.rotationConfig) {
      const choreAssignments = safeAssignments.filter(a => a.choreId === choreId)
      const childAssignment = choreAssignments.find(a => a.childId === childId)
      
      if (childAssignment) {
        const updatedRotationState = getUpdatedRotationState(
          chore,
          childAssignment,
          childId,
          choreAssignments,
          safeChildrenList,
          safeChildAvailability || [],
          new Date()
        )
        
        // Update all assignments for this chore with the new rotation state
        setAssignments((current) =>
          (current || []).map((a) =>
            a.choreId === choreId ? { ...a, rotationState: updatedRotationState } : a
          )
        )
      }
    }
    
    if (requiresApproval) {
      toast.info('Chore marked for parent approval', {
        description: 'Points will be awarded after approval',
      })
      sendPendingApprovalEmail(childId, choreId, completionId)
    }

    if (!requiresApproval) {
      setTimeout(() => {
        checkAndAwardCategoryBonuses(childId, [...safeCompletions, newCompletion])
      }, 500)
    }
  }

  const checkAndAwardCategoryBonuses = (childId: string, currentCompletions: ChoreCompletion[]) => {
    safeCategories.forEach((category) => {
      if (!category.completionBonus) return

      const alreadyClaimed = hasBonusBeenClaimedToday(
        childId,
        category.id,
        safeBonusCompletions
      )
      if (alreadyClaimed) return

      const allCompleted = areAllCategoryChoresCompleted(
        childId,
        category.id,
        safeAssignments,
        choresMap,
        currentCompletions
      )

      if (allCompleted) {
        const bonusCompletion: CategoryBonusCompletion = {
          id: `bonus_${Date.now()}_${Math.random()}`,
          childId,
          categoryId: category.id,
          completedAt: Date.now(),
          bonusPoints: category.completionBonus.bonusPoints,
          targetCategoryId: category.completionBonus.targetCategoryId,
        }
        setBonusCompletions((current) => [...(current || []), bonusCompletion])

        const targetCategory = safeCategories.find(
          (c) => c.id === category.completionBonus?.targetCategoryId
        )
        toast.success(`🎉 Category Bonus!`, {
          description: `Completed all ${category.name} chores! Earned ${category.completionBonus.bonusPoints} ${targetCategory?.name || 'bonus'} points!`,
        })
      }
    })
  }

  const handleUndoChore = (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => {
    setCompletions((current) => {
      const currentCompletions = current || []
      const sortedCompletions = [...currentCompletions].sort((a, b) => b.completedAt - a.completedAt)
      
      const completionToRemove = sortedCompletions.find(
        (c) =>
          c.childId === childId &&
          c.choreId === choreId &&
          c.timeOfDay === timeOfDay
      )
      
      if (completionToRemove) {
        toast.info('Chore completion undone')
        
        const historyEvent: ChoreHistoryEvent = {
          id: `history_${Date.now()}_${Math.random()}`,
          type: 'undo',
          childId,
          choreId,
          timestamp: Date.now(),
          timeOfDay,
          completionId: completionToRemove.id,
        }
        setHistory((currentHistory) => [...(currentHistory || []), historyEvent])
        
        return currentCompletions.filter((c) => c.id !== completionToRemove.id)
      }
      
      return currentCompletions
    })
  }

  const handleAddReward = (rewardData: Omit<Reward, 'id' | 'createdAt'>) => {
    const categoryIdsArray = Array.isArray(rewardData.categoryIds) ? [...rewardData.categoryIds] : []
    
    const newReward: Reward = {
      ...rewardData,
      id: `reward_${Date.now()}_${Math.random()}`,
      createdAt: Date.now(),
      categoryIds: categoryIdsArray,
    }
    setRewards((current) => [...(current || []), newReward])
    toast.success(`Reward "${newReward.name}" created!`)
  }

  const handleEditReward = (
    id: string,
    rewardData: Omit<Reward, 'id' | 'createdAt'>
  ) => {
    const categoryIdsArray = Array.isArray(rewardData.categoryIds) ? [...rewardData.categoryIds] : []
    
    setRewards((current) =>
      (current || []).map((r) =>
        r.id === id ? { 
          ...r, 
          ...rewardData,
          categoryIds: categoryIdsArray,
        } : r
      )
    )
    toast.success('Reward updated!')
  }

  const handleDeleteReward = (id: string) => {
    setRewards((current) => (current || []).filter((r) => r.id !== id))
    toast.success('Reward deleted')
  }

  const handleToggleRewardDisabled = (id: string) => {
    setRewards((current) =>
      (current || []).map((r) =>
        r.id === id ? { ...r, disabled: !r.disabled } : r
      )
    )
    const reward = safeRewards.find((r) => r.id === id)
    if (reward) {
      toast.success(reward.disabled ? 'Reward enabled' : 'Reward disabled')
    }
  }

  const handlePurchaseReward = (childId: string, rewardId: string, cost: number) => {
    const reward = safeRewards.find((r) => r.id === rewardId)
    if (!reward) return

    const limitCheck = canPurchaseReward(reward, childId, migratedPurchases)
    if (!limitCheck.canPurchase) {
      toast.error('Cannot purchase reward', {
        description: limitCheck.reason,
      })
      return
    }

    if (reward.isPointSwap && reward.swapConfig) {
      handleSwapPoints(
        childId,
        reward.swapConfig.fromCategoryId,
        reward.swapConfig.toCategoryId,
        reward.swapConfig.fromAmount,
        reward.swapConfig.toAmount
      )
      return
    }

    // Validate that child has enough points in at least one category
    const childCategoryPoints = childAvailableCategoryPoints.get(childId)
    if (childCategoryPoints && reward.categoryIds.length > 0) {
      const hasEnoughInOneCategory = reward.categoryIds.some(categoryId => {
        const availableInCategory = childCategoryPoints.get(categoryId) || 0
        return availableInCategory >= cost
      })
      
      if (!hasEnoughInOneCategory) {
        // Find which category they're closest to affording it in
        let minShortfall = Infinity
        let closestCategoryName = 'a category'
        
        reward.categoryIds.forEach(categoryId => {
          const availableInCategory = childCategoryPoints.get(categoryId) || 0
          const shortfall = cost - availableInCategory
          if (shortfall > 0 && shortfall < minShortfall) {
            minShortfall = shortfall
            const category = safeCategories.find(c => c.id === categoryId)
            closestCategoryName = category?.name || 'points'
          }
        })
        
        const message = minShortfall === Infinity 
          ? 'You need enough points in a single category to purchase this reward.'
          : `You need ${minShortfall} more ${closestCategoryName} points to purchase this reward.`
        
        toast.error('Not enough points', {
          description: message,
        })
        return
      }
    }

    const newPurchase: RewardPurchase = {
      id: `purchase_${Date.now()}_${Math.random()}`,
      childId,
      rewardId,
      purchasedAt: Date.now(),
      fulfilled: false,
      cost,
    }
    setPurchases((current) => [...(current || []), newPurchase])
    
    sendRewardPurchaseEmail(childId, rewardId)
    
    if (reward) {
      toast.success(`🎉 You got ${reward.name}!`, {
        description: `${cost} points spent. Ask your parents for your reward!`,
      })
    }
  }

  const handleFulfillPurchase = (purchaseId: string) => {
    setPurchases((current) =>
      (current || []).map((p) =>
        p.id === purchaseId ? { ...p, fulfilled: true } : p
      )
    )
    toast.success('Reward marked as fulfilled!')
  }

  const handleUnfulfillPurchase = (purchaseId: string) => {
    setPurchases((current) =>
      (current || []).map((p) =>
        p.id === purchaseId ? { ...p, fulfilled: false } : p
      )
    )
    toast.info('Reward marked as unfulfilled')
  }

  const handlePinSuccess = () => {
    setShowPinDialog(false)
    setMode('parent')
  }

  const handleRequestParentMode = () => {
    // Check if parent mode should be blocked on this linked device
    if (deviceIsLinked && blockParentModeOnLinkedDevices) {
      toast.error('Parent Mode is blocked on linked devices. Please use the primary device to access Parent Mode.')
      return
    }
    setShowPinDialog(true)
  }

  const handleSetPin = (pin: string) => {
    setParentPin(pin)
    toast.success('Parent PIN set successfully!')
  }

  const handleChangePin = (newPin: string) => {
    setParentPin(newPin)
    toast.success('Parent PIN changed successfully!')
  }

  const handleOverrideComplete = (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => {
    const completionId = `completion_${Date.now()}_${Math.random()}`
    const newCompletion: ChoreCompletion = {
      id: completionId,
      childId,
      choreId,
      completedAt: Date.now(),
      timeOfDay,
      overridden: true,
    }
    setCompletions((current) => [...(current || []), newCompletion])
    
    const historyEvent: ChoreHistoryEvent = {
      id: `history_${Date.now()}_${Math.random()}`,
      type: 'override-complete',
      childId,
      choreId,
      timestamp: Date.now(),
      timeOfDay,
      completionId,
    }
    setHistory((current) => [...(current || []), historyEvent])

    const chore = (migratedChores || []).find((c) => c.id === choreId)
    const child = safeChildrenList.find((c) => c.id === childId)
    toast.success(`Awarded ${chore?.points || 0} points to ${child?.name || 'child'}`, {
      description: 'Missed chore marked as complete',
    })
  }

  const handleDismissMissed = (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const dismissedChore: MissedChore = {
      childId,
      choreId,
      timeOfDay,
      missedDate: today.getTime(),
      dismissed: true,
    }
    setDismissedMissedChores((current) => [...(current || []), dismissedChore])
    
    const historyEvent: ChoreHistoryEvent = {
      id: `history_${Date.now()}_${Math.random()}`,
      type: 'override-dismiss',
      childId,
      choreId,
      timestamp: Date.now(),
      timeOfDay,
    }
    setHistory((current) => [...(current || []), historyEvent])

    toast.info('Missed chore dismissed')
  }

  const handleUndoDismissMissed = (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()
    
    // Remove the dismissed chore from the list
    setDismissedMissedChores((current) =>
      (current || []).filter(
        (c) => !(
          c.childId === childId &&
          c.choreId === choreId &&
          c.timeOfDay === timeOfDay &&
          c.missedDate === todayTimestamp
        )
      )
    )
    
    // Add history event for the undo action
    const historyEvent: ChoreHistoryEvent = {
      id: `history_${Date.now()}_${Math.random()}`,
      type: 'undo-dismiss',
      childId,
      choreId,
      timestamp: Date.now(),
      timeOfDay,
    }
    setHistory((current) => [...(current || []), historyEvent])
    
    const chore = (migratedChores || []).find((c) => c.id === choreId)
    const child = safeChildrenList.find((c) => c.id === childId)
    toast.success('Missed chore dismiss undone', {
      description: `${child?.name}'s "${chore?.name}" is now back in missed chores`,
    })
  }

  const handleToggleGoalTracking = (childId: string, rewardId: string) => {
    setTrackedGoals((current) => {
      const currentGoals = current || []
      const existingGoal = currentGoals.find(g => g.childId === childId)
      
      if (existingGoal?.rewardId === rewardId) {
        toast.info('Goal tracking removed')
        return currentGoals.filter(g => g.childId !== childId)
      } else {
        const reward = safeRewards.find(r => r.id === rewardId)
        if (reward) {
          toast.success(`Tracking goal: ${reward.name}`)
        }
        if (existingGoal) {
          return currentGoals.map(g => 
            g.childId === childId ? { ...g, rewardId } : g
          )
        } else {
          return [...currentGoals, { childId, rewardId }]
        }
      }
    })
  }

  const handleAddCategory = (categoryData: Omit<Category, 'id' | 'createdAt'>) => {
    // Find the highest order value, defaulting to -1 if no categories exist
    const maxOrder = (categories || []).reduce((max, c) => Math.max(max, c.order ?? -1), -1)
    
    const newCategory: Category = {
      ...categoryData,
      id: `category_${Date.now()}_${Math.random()}`,
      createdAt: Date.now(),
      order: maxOrder + 1,
    }
    setCategories((current) => [...(current || []), newCategory])
    toast.success(`Category "${newCategory.name}" created!`)
  }

  const handleEditCategory = (
    id: string,
    categoryData: Omit<Category, 'id' | 'createdAt'>
  ) => {
    setCategories((current) =>
      (current || []).map((c) =>
        c.id === id ? { ...c, ...categoryData } : c
      )
    )
    toast.success('Category updated!')
  }

  const handleDeleteCategory = (id: string) => {
    setChores((current) =>
      (current || []).map((chore) => ({
        ...chore,
        categoryIds: chore.categoryIds.filter((cid) => cid !== id),
      }))
    )
    setRewards((current) =>
      (current || []).map((reward) => ({
        ...reward,
        categoryIds: reward.categoryIds.filter((cid) => cid !== id),
      }))
    )
    setCategories((current) => (current || []).filter((c) => c.id !== id))
    toast.success('Category deleted')
  }

  const handleReorderCategories = (reorderedCategories: Category[]) => {
    setCategories(reorderedCategories)
    toast.success('Category order updated')
  }

  const handleSwapPoints = (
    childId: string,
    fromCategoryId: string,
    toCategoryId: string,
    fromAmount: number,
    toAmount: number
  ) => {
    const childAvailablePoints = childAvailableCategoryPoints.get(childId)
    const availablePoints = childAvailablePoints?.get(fromCategoryId) || 0

    if (availablePoints < fromAmount) {
      toast.error('Not enough points', {
        description: `You need ${fromAmount} points but only have ${availablePoints}`,
      })
      return
    }

    const newSwap: PointSwap = {
      id: `swap_${Date.now()}_${Math.random()}`,
      childId,
      fromCategoryId,
      toCategoryId,
      fromAmount,
      toAmount,
      swappedAt: Date.now(),
    }
    setPointSwaps((current) => [...(current || []), newSwap])

    const fromCategory = safeCategories.find((c) => c.id === fromCategoryId)
    const toCategory = safeCategories.find((c) => c.id === toCategoryId)
    
    toast.success(`Swapped ${fromAmount} ${fromCategory?.name} for ${toAmount} ${toCategory?.name}!`)
  }

  const handleApproveCompletion = (completionId: string) => {
    setCompletions((current) =>
      (current || []).map((c) =>
        c.id === completionId ? { ...c, approvalStatus: 'approved' as const, approvedAt: Date.now() } : c
      )
    )
    
    const completion = safeCompletions.find((c) => c.id === completionId)
    if (completion) {
      const historyEvent: ChoreHistoryEvent = {
        id: `history_${Date.now()}_${Math.random()}`,
        type: 'approve',
        childId: completion.childId,
        choreId: completion.choreId,
        timestamp: Date.now(),
        timeOfDay: completion.timeOfDay,
        completionId,
      }
      setHistory((current) => [...(current || []), historyEvent])

      setTimeout(() => {
        const updatedCompletions = safeCompletions.map((c) =>
          c.id === completionId ? { ...c, approvalStatus: 'approved' as const, approvedAt: Date.now() } : c
        )
        checkAndAwardCategoryBonuses(completion.childId, updatedCompletions)
      }, 500)
    }
    
    toast.success('Chore approved! Points awarded.')
  }

  const handleRejectCompletion = (completionId: string, reason?: string) => {
    setCompletions((current) =>
      (current || []).map((c) =>
        c.id === completionId ? { ...c, approvalStatus: 'rejected' as const, rejectedReason: reason } : c
      )
    )
    
    const completion = safeCompletions.find((c) => c.id === completionId)
    if (completion) {
      const historyEvent: ChoreHistoryEvent = {
        id: `history_${Date.now()}_${Math.random()}`,
        type: 'reject',
        childId: completion.childId,
        choreId: completion.choreId,
        timestamp: Date.now(),
        timeOfDay: completion.timeOfDay,
        completionId,
        rejectedReason: reason,
      }
      setHistory((current) => [...(current || []), historyEvent])
    }
    
    toast.info('Chore completion rejected')
  }

  const handleUndoCompletion = (completionId: string) => {
    const completion = safeCompletions.find((c) => c.id === completionId)
    
    if (completion) {
      setCompletions((current) => (current || []).filter((c) => c.id !== completionId))
      
      const historyEvent: ChoreHistoryEvent = {
        id: `history_${Date.now()}_${Math.random()}`,
        type: 'undo',
        childId: completion.childId,
        choreId: completion.choreId,
        timestamp: Date.now(),
        timeOfDay: completion.timeOfDay,
        completionId,
      }
      setHistory((current) => [...(current || []), historyEvent])
      
      const chore = (migratedChores || []).find((c) => c.id === completion.choreId)
      const child = safeChildrenList.find((c) => c.id === completion.childId)
      toast.success('Chore completion undone', {
        description: `${child?.name}'s completion of "${chore?.name}" has been removed`,
      })
    }
  }

  const handlePinOverride = (pin: string) => {
    if (!ipRestrictions || !ipRestrictions.overridePin) {
      toast.error('No access PIN configured')
      return
    }

    if (pin === ipRestrictions.overridePin) {
      setIPAccessGranted(true)
      
      const accessAttempt: IPAccessAttempt = {
        ip: currentIP || 'unknown',
        timestamp: Date.now(),
        granted: true,
        usedPin: true,
      }
      setAccessHistory((current) => [...(current || []), accessAttempt])
      
      toast.success('Access granted via PIN override')
    } else {
      const accessAttempt: IPAccessAttempt = {
        ip: currentIP || 'unknown',
        timestamp: Date.now(),
        granted: false,
        usedPin: true,
      }
      setAccessHistory((current) => [...(current || []), accessAttempt])
      
      toast.error('Incorrect PIN')
    }
  }

  const handleRequestAccess = async (parentPin: string) => {
    if (!user?.tenantId || !currentIP) {
      toast.error('Unable to request access')
      return
    }

    try {
      const response = await fetch('/api/ip-access/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: user.tenantId,
          ip: currentIP,
          parentPin: parentPin,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.error || 'Failed to request access')
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error requesting access:', error)
      throw error
    }
  }

  const handleApproveAccess = async (token: string) => {
    try {
      const response = await fetch('/api/ip-access/approve-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        return { success: true, ip: data.ip }
      } else {
        return { success: false, error: data.error || 'Failed to approve access' }
      }
    } catch (error) {
      console.error('Error approving access:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const handleApprovalComplete = () => {
    setShowApprovalPage(false)
    setApprovalToken(null)
    // Remove token from URL
    window.history.replaceState({}, document.title, window.location.pathname)
    // Re-check IP access instead of full page reload
    setIsCheckingIP(true)
    getUserIPAddress().then((ip) => {
      setCurrentIP(ip)
      if (!ipRestrictions || !ipRestrictions.enabled) {
        setIPAccessGranted(true)
        setIsCheckingIP(false)
        return
      }
      
      const allowed = isIPAllowed(ip, ipRestrictions)
      setIPAccessGranted(allowed)
      setIsCheckingIP(false)
      
      if (allowed) {
        toast.success('Access granted! You can now use the application.')
      }
    })
  }

  const handleUpdateWeeklyReportSettings = (settings: WeeklyReportSettings) => {
    setWeeklyReportSettings(settings)
  }

  const handleUpdateIPRestrictions = (settings: IPRestrictionSettings) => {
    setIPRestrictions(settings)
  }

  const handleUpdateWeatherSettings = (settings: WeatherSettings) => {
    setWeatherSettings(settings)
  }

  const handleUpdateEmailAlertSettings = (settings: EmailAlertSettings) => {
    setEmailAlertSettings(settings)
  }

  const handleUpdatePushNotificationSettings = (settings: PushNotificationSettings) => {
    setPushNotificationSettings(settings)
  }

  const sendPushNotification = async (
    title: string,
    body: string,
    alertType: 'rewardPurchaseAlerts' | 'pendingApprovalAlerts' | 'weeklyReportAlerts',
    data?: any
  ) => {
    if (!pushNotificationSettings?.enabled) {
      return
    }

    const deviceId = getDeviceId()
    const currentDeviceSettings = pushNotificationSettings.devices.find(d => d.deviceId === deviceId)

    if (!currentDeviceSettings || !currentDeviceSettings.enabled || !currentDeviceSettings.subscription) {
      return
    }

    // Check if the alert type is enabled for this device
    if (!currentDeviceSettings[alertType]) {
      return
    }

    // For pending approvals, also check digest mode
    if (alertType === 'pendingApprovalAlerts') {
      // Only send immediate notifications here - digest will be handled separately
      if (currentDeviceSettings.digestMode !== 'immediate') {
        return
      }
    }

    // Check if service worker is ready
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        
        // Show notification on current device
        await registration.showNotification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'chorequest-notification',
          data,
        })
        
        console.log('Push notification sent')
      } catch (error) {
        console.error('Failed to send push notification:', error)
      }
    }
  }

  // Helper function to get parent emails for a specific alert type
  const getParentEmailsForAlert = async (alertType: keyof Pick<ParentEmailAlertSettings, 'rewardPurchaseAlerts' | 'choreCompletionAlerts' | 'weeklyReportAlerts' | 'pendingApprovalAlerts'>): Promise<string[]> => {
    try {
      const users = await getTenantUsers()
      const enabledEmails: string[] = []
      
      for (const user of users) {
        const userSettings = emailAlertSettingsMap?.[user.id]
        if (userSettings && userSettings[alertType]) {
          enabledEmails.push(user.email)
        }
      }
      
      return enabledEmails
    } catch (error) {
      console.error('Failed to get tenant users for email alerts:', error)
      return []
    }
  }

  const sendRewardPurchaseEmail = async (childId: string, rewardId: string) => {
    if (!smtpEnabled) {
      return
    }

    // Get parent emails that have this alert enabled
    const recipientEmails = await getParentEmailsForAlert('rewardPurchaseAlerts')
    
    if (recipientEmails.length === 0) {
      return
    }

    const child = safeChildrenList.find((c) => c.id === childId)
    const reward = safeRewards.find((r) => r.id === rewardId)

    if (!child || !reward) return

    const emailSubject = `🎁 ${child.name} claimed a reward!`
    const emailBody = `
${child.name} has claimed the reward: ${reward.name}

Reward Details:
- Name: ${reward.name}
- Description: ${reward.description}
- Cost: ${reward.cost} points
- Time: ${new Date().toLocaleString()}

Please fulfill this reward when you get a chance!
    `.trim()

    console.log('Email would be sent to:', recipientEmails)
    console.log('Subject:', emailSubject)
    console.log('Body:', emailBody)
    console.log('SMTP is enabled via environment variables')

    toast.info('Email notification sent to parents', {
      description: `${child.name}'s reward claim notification sent`,
    })

    // Also send push notification if enabled
    await sendPushNotification(
      '🎁 Reward Claimed!',
      `${child.name} claimed ${reward.name}`,
      'rewardPurchaseAlerts',
      { type: 'reward-purchase', childId, rewardId }
    )
  }

  const sendPendingApprovalEmail = async (childId: string, choreId: string, completionId: string) => {
    if (!smtpEnabled) {
      return
    }

    // Get parent emails that have this alert enabled
    const recipientEmails = await getParentEmailsForAlert('pendingApprovalAlerts')
    
    if (recipientEmails.length === 0) {
      return
    }

    const child = safeChildrenList.find((c) => c.id === childId)
    const chore = (migratedChores || []).find((c) => c.id === choreId)

    if (!child || !chore) return

    // Check digest mode - send immediately if ANY parent has immediate mode
    const users = await getTenantUsers()
    const hasImmediateMode = users.some((user) => {
      const userSettings = emailAlertSettingsMap?.[user.id]
      // If user has this alert enabled and has immediate mode (or no mode set, default to immediate)
      return userSettings?.pendingApprovalAlerts && 
             (!userSettings.digestMode || userSettings.digestMode === 'immediate')
    })
    
    if (hasImmediateMode) {
      const emailSubject = `⏳ ${child.name} completed a chore - Approval needed`
      const emailBody = `
${child.name} has completed a chore that requires your approval:

Chore Details:
- Name: ${chore.name}
- Description: ${chore.description || 'No description'}
- Points: ${chore.points}
- Time: ${new Date().toLocaleString()}

Please log in to ChoreQuest to approve or reject this completion.
      `.trim()

      console.log('Pending approval email would be sent to:', recipientEmails)
      console.log('Subject:', emailSubject)
      console.log('Body:', emailBody)
      console.log('SMTP is enabled via environment variables')

      toast.info('Approval notification sent to parents', {
        description: `${child.name}'s chore pending approval`,
      })

      // Also send push notification if enabled (immediate mode)
      await sendPushNotification(
        '✅ Chore Needs Approval',
        `${child.name} completed ${chore.name}`,
        'pendingApprovalAlerts',
        { type: 'pending-approval', childId, choreId, completionId }
      )
    } else {
      setPendingDigestItems((current) => [
        ...(current || []),
        {
          childId,
          choreId,
          completionId,
          timestamp: Date.now(),
        },
      ])
    }
  }

  const sendDigestEmail = async () => {
    // Use helper function to ensure pendingDigestItems is always an array
    const items = getValidatedDigestItems()
    
    if (items.length === 0) {
      return
    }

    if (!smtpEnabled) {
      return
    }

    // Get parent emails that have this alert enabled
    const recipientEmails = await getParentEmailsForAlert('pendingApprovalAlerts')
    
    if (recipientEmails.length === 0) {
      return
    }

    const groupedByChild = new Map<string, any[]>()
    
    for (const item of items) {
      if (!groupedByChild.has(item.childId)) {
        groupedByChild.set(item.childId, [])
      }
      groupedByChild.get(item.childId)!.push(item)
    }

    let emailBody = `You have ${items.length} chore${items.length > 1 ? 's' : ''} pending approval:\n\n`

    for (const [childId, items] of groupedByChild.entries()) {
      const child = safeChildrenList.find((c) => c.id === childId)
      if (!child) continue

      emailBody += `${child.name}:\n`
      
      for (const item of items) {
        const chore = (migratedChores || []).find((c) => c.id === item.choreId)
        if (!chore) continue
        
        const timeStr = new Date(item.timestamp).toLocaleString()
        emailBody += `  - ${chore.name} (${chore.points} points) - ${timeStr}\n`
      }
      
      emailBody += '\n'
    }

    emailBody += 'Please log in to ChoreQuest to approve or reject these completions.'

    const emailSubject = `⏳ ${items.length} Chore${items.length > 1 ? 's' : ''} Pending Approval`

    console.log('Digest email would be sent to:', recipientEmails)
    console.log('Subject:', emailSubject)
    console.log('Body:', emailBody)
    console.log('SMTP is enabled via environment variables')

    setPendingDigestItems([])
    
    // Update lastDigestSent for all users who have this alert enabled
    const updatedMap = { ...(emailAlertSettingsMap || {}) }
    const users = await getTenantUsers()
    for (const user of users) {
      if (updatedMap[user.id]?.pendingApprovalAlerts) {
        updatedMap[user.id] = {
          ...updatedMap[user.id],
          lastDigestSent: Date.now(),
        }
      }
    }
    setEmailAlertSettingsMap(updatedMap)

    toast.success('Digest email sent to parents', {
      description: `${items.length} pending approval${items.length > 1 ? 's' : ''} notified`,
    })

    // Also send push notification digest if enabled
    const deviceId = getDeviceId()
    const currentDeviceSettings = pushNotificationSettings?.devices.find(d => d.deviceId === deviceId)
    
    if (currentDeviceSettings?.enabled && currentDeviceSettings.pendingApprovalAlerts && currentDeviceSettings.subscription) {
      const childrenCount = groupedByChild.size
      const summaryText = childrenCount === 1
        ? `${items.length} chore${items.length > 1 ? 's' : ''} pending approval`
        : `${items.length} chore${items.length > 1 ? 's' : ''} from ${childrenCount} children pending approval`
      
      // Send as pending approval with special digest data
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready
          await registration.showNotification('⏳ Chores Pending Approval', {
            body: summaryText,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: 'chorequest-digest',
            data: { type: 'digest', count: items.length },
          })
          console.log('Push digest notification sent')
        } catch (error) {
          console.error('Failed to send push digest notification:', error)
        }
      }
    }
  }

  const getDigestIntervalMs = (interval: string): number => {
    switch (interval) {
      case '15min': return 15 * 60 * 1000
      case '30min': return 30 * 60 * 1000
      case '1hour': return 60 * 60 * 1000
      case '2hours': return 2 * 60 * 60 * 1000
      case '4hours': return 4 * 60 * 60 * 1000
      case 'daily': return 24 * 60 * 60 * 1000
      default: return 0
    }
  }

  useEffect(() => {
    if (!emailAlertSettings || emailAlertSettings.digestMode === 'immediate') {
      return
    }

    // Use helper function to ensure pendingDigestItems is always an array
    const items = getValidatedDigestItems()
    
    if (items.length === 0) {
      return
    }

    const intervalMs = getDigestIntervalMs(emailAlertSettings.digestMode)
    if (intervalMs === 0) return

    const lastSent = emailAlertSettings.lastDigestSent || 0
    const timeSinceLastSend = Date.now() - lastSent
    
    if (timeSinceLastSend >= intervalMs) {
      sendDigestEmail()
    } else {
      const timeout = setTimeout(() => {
        sendDigestEmail()
      }, intervalMs - timeSinceLastSend)

      return () => clearTimeout(timeout)
    }
  }, [pendingDigestItems, emailAlertSettings?.digestMode, emailAlertSettings?.lastDigestSent])


  const handleAddReportTemplate = (templateData: Omit<ReportTemplate, 'id' | 'createdAt'>) => {
    const newTemplate: ReportTemplate = {
      ...templateData,
      id: `template_${Date.now()}_${Math.random()}`,
      createdAt: Date.now(),
    }
    setReportTemplates((current) => [...(current || []), newTemplate])
    toast.success(`Report template "${newTemplate.name}" created!`)
  }

  const handleEditReportTemplate = (
    id: string,
    templateData: Omit<ReportTemplate, 'id' | 'createdAt'>
  ) => {
    setReportTemplates((current) =>
      (current || []).map((t) =>
        t.id === id ? { ...t, ...templateData } : t
      )
    )
    toast.success('Report template updated!')
  }

  const handleDeleteReportTemplate = (id: string) => {
    setReportTemplates((current) => (current || []).filter((t) => t.id !== id))
    toast.success('Report template deleted')
  }

  const handleAddSchoolHoliday = (holidayData: Omit<SchoolHoliday, 'id' | 'createdAt'>) => {
    const newHoliday: SchoolHoliday = {
      ...holidayData,
      id: `holiday_${Date.now()}_${Math.random()}`,
      createdAt: Date.now(),
    }
    setSchoolHolidays((current) => [...(current || []), newHoliday])
    toast.success(`School holiday "${newHoliday.name}" added!`)
  }

  const handleEditSchoolHoliday = (
    id: string,
    holidayData: Omit<SchoolHoliday, 'id' | 'createdAt'>
  ) => {
    setSchoolHolidays((current) =>
      (current || []).map((h) =>
        h.id === id ? { ...h, ...holidayData } : h
      )
    )
    toast.success('School holiday updated!')
  }

  const handleDeleteSchoolHoliday = (id: string) => {
    setSchoolHolidays((current) => (current || []).filter((h) => h.id !== id))
    toast.success('School holiday deleted')
  }

  const handleUpdateCalendarRefresh = (childId: string, timestamp: number) => {
    setChildrenList((current) =>
      (current || []).map((child) =>
        child.id === childId ? { ...child, calendarLastRefresh: timestamp } : child
      )
    )
  }

  useEffect(() => {
    if (hasMigratedRewards.current) return
    if (!safeRewards || !safeCategories) return
    
    const needsMigration = safeRewards.some(r => !Array.isArray(r.categoryIds) || r.categoryIds === undefined || r.categoryIds === null)
    if (needsMigration) {
      const firstCategoryId = safeCategories[0]?.id
      const migrated = safeRewards.map((reward) => {
        const rewardCategoryIds = reward.categoryIds
        const hasValidCategoryIds = Array.isArray(rewardCategoryIds) && rewardCategoryIds !== null && rewardCategoryIds !== undefined
        
        return {
          ...reward,
          categoryIds: hasValidCategoryIds ? [...rewardCategoryIds] : (firstCategoryId ? [firstCategoryId] : []),
        }
      })
      setRewards(migrated)
      hasMigratedRewards.current = true
    }
  }, [safeRewards, safeCategories, setRewards])

  useEffect(() => {
    const fetchWeather = async () => {
      if (!weatherSettings?.enabled || !weatherSettings.latitude || !weatherSettings.longitude) {
        setCurrentWeather(null)
        return
      }

      const effectiveUnit = weatherSettings.temperatureUnit === 'auto' 
        ? (weatherSettings.autoDetectedUnit || 'fahrenheit')
        : weatherSettings.temperatureUnit

      try {
        const weatherData = await fetchWeatherData(
          weatherSettings.latitude,
          weatherSettings.longitude,
          effectiveUnit
        )
        setCurrentWeather(weatherData)
      } catch (error) {
        console.error('Failed to fetch weather:', error)
        setCurrentWeather(null)
      }
    }

    fetchWeather()
    const interval = setInterval(fetchWeather, 15 * 60 * 1000)

    return () => clearInterval(interval)
  }, [weatherSettings?.enabled, weatherSettings?.latitude, weatherSettings?.longitude, weatherSettings?.temperatureUnit, weatherSettings?.autoDetectedUnit])

  useEffect(() => {
    if (weatherSettings?.seasonalThemesEnabled && currentWeather) {
      const theme = getSeasonalTheme(currentWeather)
      applyThemeToDOM(theme)
    } else {
      const defaultTheme = getSeasonalTheme(null)
      applyThemeToDOM(defaultTheme)
    }
  }, [weatherSettings?.seasonalThemesEnabled, currentWeather, mode, selectedChild])

  const pendingPurchasesCount = useMemo(() => {
    return migratedPurchases.filter((p) => !p.fulfilled).length
  }, [migratedPurchases])

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-fredoka font-bold mb-2">Loading...</h2>
          <p className="text-muted-foreground">Checking authentication</p>
        </div>
      </div>
    )
  }

  // Show auth page if not authenticated
  if (!user) {
    return <AuthPage />
  }

  // Show approval page if token is present in URL
  if (showApprovalPage && approvalToken) {
    return (
      <>
        <Toaster position="top-center" />
        <ApproveAccessPage
          token={approvalToken}
          onApprove={handleApproveAccess}
          onComplete={handleApprovalComplete}
        />
      </>
    )
  }

  return (
    <div className="h-screen overflow-y-auto bg-background">
      {isCheckingIP ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-fredoka font-bold mb-2">Loading...</h2>
            <p className="text-muted-foreground">Checking access permissions</p>
          </div>
        </div>
      ) : !ipAccessGranted ? (
        <WelcomePage
          currentIP={currentIP}
          onPinSubmit={handlePinOverride}
          onRequestAccess={handleRequestAccess}
        />
      ) : mode === 'parent' ? (
        <ParentPanel
          chores={migratedChores || []}
          childrenList={safeChildrenList}
          assignments={safeAssignments}
          completions={safeCompletions}
          childPoints={childPoints}
          rewards={migratedRewards || []}
          purchases={migratedPurchases}
          history={safeHistory}
          dismissedMissedChores={safeDismissedMissedChores}
          parentPin={normalizedParentPin}
          celebrationSettings={celebrationSettings || { enabled: true, animations: { confetti: true, fireworks: true, sparkles: true, stars: true, bubbles: true, hearts: true }, showUndoButton: true }}
          biometricSettings={biometricSettings || { enabled: false, credentials: [], requirePinFallback: true, quickUnlockOnPWA: true }}
          categories={safeCategories}
          childCategoryPoints={childCategoryPoints}
          bonusCompletions={safeBonusCompletions}
          pointSwaps={safePointSwaps}
          ipRestrictions={ipRestrictions || { enabled: false, allowedIPs: [], overridePin: null, requirePinForUnapproved: false }}
          currentIP={currentIP}
          accessHistory={safeAccessHistory}
          weeklyReportSettings={weeklyReportSettings || { enabled: false, parentEmail: null, sendDay: 'sunday', sendTime: '18:00', lastSent: null }}
          emailAlertSettings={emailAlertSettings || { rewardPurchaseAlerts: false, choreCompletionAlerts: false, weeklyReportAlerts: false, pendingApprovalAlerts: false, recipientEmails: [], digestMode: 'immediate', lastDigestSent: null }}
          emailAlertSettingsMap={emailAlertSettingsMap || {}}
          weeklyReportSettingsMap={weeklyReportSettingsMap || {}}
          reportTemplates={safeReportTemplates}
          weatherSettings={weatherSettings || { enabled: false, location: '', latitude: null, longitude: null, temperatureUnit: 'auto' }}
          currentWeather={currentWeather}
          pendingDigestItems={safePendingDigestItems}
          speechSettings={speechSettings || { enabled: true }}
          pushNotificationSettings={pushNotificationSettings || { enabled: false, devices: [] }}
          currentDeviceId={getDeviceId()}
          hideChildrenWithNoActivity={hideChildrenWithNoActivity || false}
          schoolHolidays={schoolHolidays || []}
          childAvailability={safeChildAvailability}
          schoolHolidayCountdownSettings={schoolHolidayCountdownSettings || { enabled: false, countdownMode: 'calendar-days', showRemainingDays: true }}
          gettingStartedState={gettingStartedState}
          onAddChore={handleAddChore}
          onEditChore={handleEditChore}
          onDeleteChore={handleDeleteChore}
          onAddChild={handleAddChild}
          onEditChild={handleEditChild}
          onDeleteChild={handleDeleteChild}
          onAddChildAvailability={handleAddChildAvailability}
          onUpdateChildAvailability={handleUpdateChildAvailability}
          onDeleteChildAvailability={handleDeleteChildAvailability}
          onAssignChore={handleAssignChore}
          onUnassignChore={handleUnassignChore}
          onEditAssignment={handleEditAssignment}
          onAddReward={handleAddReward}
          onEditReward={handleEditReward}
          onDeleteReward={handleDeleteReward}
          onToggleRewardDisabled={handleToggleRewardDisabled}
          onFulfillPurchase={handleFulfillPurchase}
          onUnfulfillPurchase={handleUnfulfillPurchase}
          onChangePin={handleChangePin}
          onCelebrationSettingsChange={(settings) => setCelebrationSettings(settings)}
          onBiometricSettingsChange={(settings) => setBiometricSettings(settings)}
          onOverrideComplete={handleOverrideComplete}
          onDismissMissed={handleDismissMissed}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          onReorderCategories={handleReorderCategories}
          onApproveCompletion={handleApproveCompletion}
          onRejectCompletion={handleRejectCompletion}
          onUndoCompletion={handleUndoCompletion}
          onUndoDismissMissed={handleUndoDismissMissed}
          onUpdateIPRestrictions={handleUpdateIPRestrictions}
          onUpdateWeeklyReportSettings={handleUpdateWeeklyReportSettings}
          onUpdateWeatherSettings={handleUpdateWeatherSettings}
          onUpdateEmailAlertSettings={handleUpdateEmailAlertSettings}
          onUpdateEmailAlertSettingsMap={(settings) => setEmailAlertSettingsMap(settings)}
          onUpdateWeeklyReportSettingsMap={(settings) => setWeeklyReportSettingsMap(settings)}
          onUpdatePushNotificationSettings={handleUpdatePushNotificationSettings}
          onUpdateSpeechSettings={(settings) => setSpeechSettings(settings)}
          onUpdateHideChildrenWithNoActivity={(value) => setHideChildrenWithNoActivity(value)}
          onUpdateBlockParentModeOnLinkedDevices={(value: boolean) => setBlockParentModeOnLinkedDevices(value)}
          blockParentModeOnLinkedDevices={blockParentModeOnLinkedDevices}
          onAddReportTemplate={handleAddReportTemplate}
          onEditReportTemplate={handleEditReportTemplate}
          onDeleteReportTemplate={handleDeleteReportTemplate}
          onAddSchoolHoliday={handleAddSchoolHoliday}
          onEditSchoolHoliday={handleEditSchoolHoliday}
          onDeleteSchoolHoliday={handleDeleteSchoolHoliday}
          onUpdateSchoolHolidayCountdownSettings={(settings) => setSchoolHolidayCountdownSettings(settings)}
          onUpdateGettingStartedState={(state) => setGettingStartedState(state)}
          onSendDigestNow={sendDigestEmail}
          onExitParentMode={() => {
            setMode('child')
            setSelectedChild(null)
            setShowRewardShop(false)
            setShowRewardShop(false)
            setShowCalendar(false)
          }}
        />
      ) : selectedChild ? (
        showCalendar ? (
          <CalendarView
            child={selectedChild}
            chores={migratedChores || []}
            assignments={safeAssignments}
            completions={safeCompletions}
            categories={safeCategories}
            schoolHolidays={schoolHolidays || []}
            childAvailability={safeChildAvailability}
            onBack={() => setShowCalendar(false)}
          />
        ) : showPointsHistory ? (
          <PointsHistoryView
            child={selectedChild}
            chores={migratedChores || []}
            completions={safeCompletions}
            categories={safeCategories}
            assignments={safeAssignments}
            bonusCompletions={safeBonusCompletions}
            purchases={migratedPurchases}
            rewards={migratedRewards || []}
            swaps={safePointSwaps}
            onBack={() => setShowPointsHistory(false)}
          />
        ) : showRewardShop ? (
          <RewardShop
            child={selectedChild}
            rewards={migratedRewards || []}
            chores={migratedChores || []}
            completions={safeCompletions}
            purchases={migratedPurchases}
            trackedGoal={safeTrackedGoals.find(g => g.childId === selectedChild.id)}
            onToggleGoalTracking={(rewardId) => handleToggleGoalTracking(selectedChild.id, rewardId)}
            categories={safeCategories}
            swaps={safePointSwaps}
            availablePoints={getChildAvailablePoints(
              childPoints.get(selectedChild.id) || 0,
              migratedPurchases
                .filter((p) => p.childId === selectedChild.id)
                .map((p) => ({ cost: p.cost }))
            )}
            onPurchase={(rewardId) => {
              const reward = (migratedRewards || []).find((r) => r.id === rewardId)
              if (reward) {
                const override = reward.costOverrides?.find(o => o.childId === selectedChild.id)
                const cost = override ? override.cost : reward.cost
                handlePurchaseReward(selectedChild.id, rewardId, cost)
              }
            }}
            onBack={() => setShowRewardShop(false)}
          />
        ) : (
          <ChildChoreView
            child={selectedChild}
            chores={migratedChores || []}
            assignments={safeAssignments}
            completions={safeCompletions}
            totalPoints={childPoints.get(selectedChild.id) || 0}
            celebrationSettings={celebrationSettings || { enabled: true, animations: { confetti: true, fireworks: true, sparkles: true, stars: true, bubbles: true, hearts: true }, showUndoButton: true }}
            trackedGoal={safeTrackedGoals.find(g => g.childId === selectedChild.id)}
            rewards={safeRewards}
            categories={safeCategories}
            categoryPoints={childCategoryPoints.get(selectedChild.id)}
            availableCategoryPoints={childAvailableCategoryPoints.get(selectedChild.id)}
            currentWeather={currentWeather}
            schoolHolidays={schoolHolidays || []}
            childAvailability={safeChildAvailability}
            onComplete={(choreId, timeOfDay) => handleCompleteChore(selectedChild.id, choreId, timeOfDay)}
            onUndo={(choreId, timeOfDay) => handleUndoChore(selectedChild.id, choreId, timeOfDay)}
            onBack={() => {
              setSelectedChild(null)
              setShowPointsHistory(false)
              setShowRewardShop(false)
              setShowCalendar(false)
            }}
            onShopClick={() => setShowRewardShop(true)}
            onHistoryClick={() => setShowPointsHistory(true)}
            onCalendarClick={() => setShowCalendar(true)}
            onSwapPoints={(fromCategoryId, toCategoryId, fromAmount, toAmount) =>
              handleSwapPoints(selectedChild.id, fromCategoryId, toCategoryId, fromAmount, toAmount)
            }
            onUpdateCalendarRefresh={(timestamp) => handleUpdateCalendarRefresh(selectedChild.id, timestamp)}
          />
        )
      ) : (
        <>
          {safeChildrenList.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <h1 className="text-4xl font-fredoka font-bold mb-4">
                  Welcome to ChoreQuest!
                </h1>
                <p className="text-xl text-muted-foreground mb-6">
                  Switch to Parent Mode to add children and create chores.
                </p>
                <Button
                  size="lg"
                  onClick={handleRequestParentMode}
                  className="font-fredoka text-lg"
                >
                  <Gear className="h-5 w-5 mr-2" />
                  Go to Parent Mode
                </Button>
              </div>
            </div>
          ) : (
            <ChildSelector
              childrenList={filteredChildrenList}
              childPoints={childPoints}
              pendingPurchasesCount={pendingPurchasesCount}
              trackedGoals={safeTrackedGoals}
              rewards={safeRewards}
              categoryPoints={childCategoryPoints}
              categories={safeCategories}
              assignments={safeAssignments}
              chores={migratedChores || []}
              completions={safeCompletions}
              childAvailability={safeChildAvailability}
              weatherSettings={weatherSettings || { enabled: false, location: '', latitude: null, longitude: null, temperatureUnit: 'auto' }}
              speechSettings={speechSettings || { enabled: true }}
              biometricSettings={biometricSettings || { enabled: false, credentials: [], requirePinFallback: true, quickUnlockOnPWA: true }}
              hideChildrenWithNoActivity={hideChildrenWithNoActivity || false}
              schoolHolidays={schoolHolidays || []}
              schoolHolidayCountdownSettings={schoolHolidayCountdownSettings || { enabled: false, countdownMode: 'calendar-days', showRemainingDays: true }}
              deviceIsLinked={deviceIsLinked}
              blockParentModeOnLinkedDevices={blockParentModeOnLinkedDevices}
              deviceRegistrationComplete={deviceRegistrationComplete}
              onSelect={setSelectedChild}
              onParentMode={handleRequestParentMode}
            />
          )}
        </>
      )}

      <ParentPinDialog
        open={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onSuccess={handlePinSuccess}
        storedPin={normalizedParentPin}
        onSetPin={handleSetPin}
        pinSecurity={pinSecurity || { attempts: [], lockedUntil: null, failedAttempts: 0 }}
        onUpdatePinSecurity={(security) => setPinSecurity(security)}
        biometricSettings={biometricSettings || { enabled: false, credentials: [], requirePinFallback: true, quickUnlockOnPWA: true }}
        onUpdateBiometricSettings={(settings) => setBiometricSettings(settings)}
      />

      <QuickUnlockPrompt
        biometricSettings={biometricSettings || null}
        pinSecurity={pinSecurity || { attempts: [], lockedUntil: null, failedAttempts: 0 }}
        onSuccess={handlePinSuccess}
        onUpdatePinSecurity={(security) => setPinSecurity(security)}
        onUpdateBiometricSettings={(settings) => setBiometricSettings(settings)}
      />

      <Toaster />
      <PWAInstallPrompt />
      <OfflineIndicator />
    </div>
  )
}

export default App
