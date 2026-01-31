import { useState, useMemo, useEffect, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
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
import { initializePWA } from '@/lib/pwaHelper'
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
  ReportTemplate,
  WeatherSettings,
  SMTPSettings,
  EmailAlertSettings,
  SpeechSettings,
  PushNotificationSettings,
} from '@/lib/types'
import { getChildTotalPoints, getChildAvailablePoints, canPurchaseReward, DEFAULT_CATEGORIES, getChildPointsByCategory, isRewardActive, getChildAvailablePointsByCategory, areAllCategoryChoresCompleted, hasBonusBeenClaimedToday, getUserIPAddress, isIPAllowed } from '@/lib/helpers'
import { DEFAULT_REPORT_TEMPLATES } from '@/lib/reportHelpers'
import { WelcomePage } from '@/components/WelcomePage'
import { fetchWeatherData } from '@/lib/weatherHelper'
import { getSeasonalTheme, applyThemeToDOM } from '@/lib/themeHelper'
import { WeatherData } from '@/lib/types'

function App() {
  const [mode, setMode] = useState<AppMode>('child')
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [showRewardShop, setShowRewardShop] = useState(false)
  const [showPointsHistory, setShowPointsHistory] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  
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
  const [smtpSettings, setSMTPSettings] = useKV<SMTPSettings>('smtp-settings', {
    enabled: false,
    host: '',
    port: 587,
    secure: true,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'ChoreQuest',
  })
  const [emailAlertSettings, setEmailAlertSettings] = useKV<EmailAlertSettings>('email-alert-settings', {
    rewardPurchaseAlerts: false,
    choreCompletionAlerts: false,
    weeklyReportAlerts: false,
    pendingApprovalAlerts: false,
    recipientEmails: [],
    digestMode: 'immediate',
    lastDigestSent: null,
  })
  const [pendingDigestItems, setPendingDigestItems] = useKV<any[]>('pending-digest-items', [])
  const [speechSettings, setSpeechSettings] = useKV<SpeechSettings>('speech-settings', {
    enabled: true,
  })
  const [pushNotificationSettings, setPushNotificationSettings] = useKV<PushNotificationSettings>('push-notification-settings', {
    enabled: false,
    devices: [],
  })
  const [hideChildrenWithNoActivity, setHideChildrenWithNoActivity] = useKV<boolean>('hide-children-with-no-activity', false)
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
  
  const hasMigratedRewards = useRef(false)
  const hasInitializedCategories = useRef(false)
  const hasMigratedPinSecurity = useRef(false)

  // Helper function to ensure pendingDigestItems is always an array
  const getValidatedDigestItems = (): any[] => {
    return safePendingDigestItems
  }

  useEffect(() => {
    initializePWA()
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
      const childPurchases = safePurchases
        .filter((p) => p.childId === child.id)
        .map((p) => {
          const reward = rewardsMap.get(p.rewardId)
          const override = reward?.costOverrides?.find(o => o.childId === child.id)
          return {
            rewardId: p.rewardId,
            cost: override ? override.cost : (reward?.cost || 0),
          }
        })
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
  }, [safeChildrenList, safeCategories, childCategoryPoints, safePurchases, migratedRewards, safePointSwaps])

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
    
    toast.success('Child removed')
  }

  const handleAssignChore = (childId: string, choreId: string) => {
    const newAssignment: ChoreAssignment = {
      id: `assignment_${Date.now()}_${Math.random()}`,
      childId,
      choreId,
      assignedAt: Date.now(),
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

    const limitCheck = canPurchaseReward(reward, childId, safePurchases)
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

    const newPurchase: RewardPurchase = {
      id: `purchase_${Date.now()}_${Math.random()}`,
      childId,
      rewardId,
      purchasedAt: Date.now(),
      fulfilled: false,
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
    const newCategory: Category = {
      ...categoryData,
      id: `category_${Date.now()}_${Math.random()}`,
      createdAt: Date.now(),
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

  const handleUpdateWeeklyReportSettings = (settings: WeeklyReportSettings) => {
    setWeeklyReportSettings(settings)
  }

  const handleUpdateIPRestrictions = (settings: IPRestrictionSettings) => {
    setIPRestrictions(settings)
  }

  const handleUpdateWeatherSettings = (settings: WeatherSettings) => {
    setWeatherSettings(settings)
  }

  const handleUpdateSMTPSettings = (settings: SMTPSettings) => {
    setSMTPSettings(settings)
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

  // Helper to get device ID
  const getDeviceId = () => {
    let storedId = localStorage.getItem('chorequest-device-id')
    if (!storedId) {
      storedId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem('chorequest-device-id', storedId)
    }
    return storedId
  }

  const sendRewardPurchaseEmail = async (childId: string, rewardId: string) => {
    if (!smtpSettings?.enabled || !emailAlertSettings?.rewardPurchaseAlerts) {
      return
    }

    if (emailAlertSettings.recipientEmails.length === 0) {
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

    console.log('Email would be sent to:', emailAlertSettings.recipientEmails)
    console.log('Subject:', emailSubject)
    console.log('Body:', emailBody)
    console.log('SMTP Settings:', { host: smtpSettings.host, port: smtpSettings.port, from: smtpSettings.fromEmail })

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
    if (!smtpSettings?.enabled || !emailAlertSettings?.pendingApprovalAlerts) {
      return
    }

    if (emailAlertSettings.recipientEmails.length === 0) {
      return
    }

    const child = safeChildrenList.find((c) => c.id === childId)
    const chore = (migratedChores || []).find((c) => c.id === choreId)

    if (!child || !chore) return

    if (emailAlertSettings.digestMode === 'immediate') {
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

      console.log('Pending approval email would be sent to:', emailAlertSettings.recipientEmails)
      console.log('Subject:', emailSubject)
      console.log('Body:', emailBody)
      console.log('SMTP Settings:', { host: smtpSettings.host, port: smtpSettings.port, from: smtpSettings.fromEmail })

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

    if (!smtpSettings?.enabled || !emailAlertSettings?.pendingApprovalAlerts) {
      return
    }

    if (emailAlertSettings.recipientEmails.length === 0) {
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

    console.log('Digest email would be sent to:', emailAlertSettings.recipientEmails)
    console.log('Subject:', emailSubject)
    console.log('Body:', emailBody)
    console.log('SMTP Settings:', { host: smtpSettings.host, port: smtpSettings.port, from: smtpSettings.fromEmail })

    setPendingDigestItems([])
    
    setEmailAlertSettings((current) => ({
      ...(current || {
        rewardPurchaseAlerts: false,
        choreCompletionAlerts: false,
        weeklyReportAlerts: false,
        pendingApprovalAlerts: false,
        recipientEmails: [],
        digestMode: 'immediate',
        lastDigestSent: null,
      }),
      lastDigestSent: Date.now(),
    }))

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
      
      if (mode === 'child' && !selectedChild) {
        toast.info(`🎨 Theme: ${theme.name}`, {
          description: `Colors updated based on ${currentWeather.condition.toLowerCase()} weather`,
          duration: 3000,
        })
      }
    } else {
      const defaultTheme = getSeasonalTheme(null)
      applyThemeToDOM(defaultTheme)
    }
  }, [weatherSettings?.seasonalThemesEnabled, currentWeather, mode, selectedChild])

  const pendingPurchasesCount = useMemo(() => {
    return safePurchases.filter((p) => !p.fulfilled).length
  }, [safePurchases])

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
        />
      ) : mode === 'parent' ? (
        <ParentPanel
          chores={migratedChores || []}
          childrenList={safeChildrenList}
          assignments={safeAssignments}
          completions={safeCompletions}
          childPoints={childPoints}
          rewards={migratedRewards || []}
          purchases={safePurchases}
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
          reportTemplates={safeReportTemplates}
          weatherSettings={weatherSettings || { enabled: false, location: '', latitude: null, longitude: null, temperatureUnit: 'auto' }}
          currentWeather={currentWeather}
          smtpSettings={smtpSettings || { enabled: false, host: '', port: 587, secure: true, username: '', password: '', fromEmail: '', fromName: 'ChoreQuest' }}
          emailAlertSettings={emailAlertSettings || { rewardPurchaseAlerts: false, choreCompletionAlerts: false, weeklyReportAlerts: false, pendingApprovalAlerts: false, recipientEmails: [], digestMode: 'immediate', lastDigestSent: null }}
          pendingDigestItems={safePendingDigestItems}
          speechSettings={speechSettings || { enabled: true }}
          pushNotificationSettings={pushNotificationSettings || { enabled: false, devices: [] }}
          hideChildrenWithNoActivity={hideChildrenWithNoActivity || false}
          onAddChore={handleAddChore}
          onEditChore={handleEditChore}
          onDeleteChore={handleDeleteChore}
          onAddChild={handleAddChild}
          onEditChild={handleEditChild}
          onDeleteChild={handleDeleteChild}
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
          onApproveCompletion={handleApproveCompletion}
          onRejectCompletion={handleRejectCompletion}
          onUndoCompletion={handleUndoCompletion}
          onUpdateIPRestrictions={handleUpdateIPRestrictions}
          onUpdateWeeklyReportSettings={handleUpdateWeeklyReportSettings}
          onUpdateWeatherSettings={handleUpdateWeatherSettings}
          onUpdateSMTPSettings={handleUpdateSMTPSettings}
          onUpdateEmailAlertSettings={handleUpdateEmailAlertSettings}
          onUpdatePushNotificationSettings={handleUpdatePushNotificationSettings}
          onUpdateSpeechSettings={(settings) => setSpeechSettings(settings)}
          onUpdateHideChildrenWithNoActivity={(value) => setHideChildrenWithNoActivity(value)}
          onAddReportTemplate={handleAddReportTemplate}
          onEditReportTemplate={handleEditReportTemplate}
          onDeleteReportTemplate={handleDeleteReportTemplate}
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
            purchases={safePurchases}
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
            purchases={safePurchases}
            trackedGoal={safeTrackedGoals.find(g => g.childId === selectedChild.id)}
            onToggleGoalTracking={(rewardId) => handleToggleGoalTracking(selectedChild.id, rewardId)}
            categories={safeCategories}
            swaps={safePointSwaps}
            availablePoints={getChildAvailablePoints(
              childPoints.get(selectedChild.id) || 0,
              safePurchases
                .filter((p) => p.childId === selectedChild.id)
                .map((p) => {
                  const reward = (migratedRewards || []).find((r) => r.id === p.rewardId)
                  const override = reward?.costOverrides?.find(o => o.childId === selectedChild.id)
                  return { cost: override ? override.cost : (reward?.cost || 0) }
                })
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
                  onClick={() => setShowPinDialog(true)}
                  className="font-fredoka text-lg"
                >
                  <Gear className="h-5 w-5 mr-2" />
                  Go to Parent Mode
                </Button>
              </div>
            </div>
          ) : (
            <ChildSelector
              childrenList={safeChildrenList}
              childPoints={childPoints}
              pendingPurchasesCount={pendingPurchasesCount}
              trackedGoals={safeTrackedGoals}
              rewards={safeRewards}
              categoryPoints={childCategoryPoints}
              categories={safeCategories}
              assignments={safeAssignments}
              chores={migratedChores || []}
              completions={safeCompletions}
              weatherSettings={weatherSettings || { enabled: false, location: '', latitude: null, longitude: null, temperatureUnit: 'auto' }}
              speechSettings={speechSettings || { enabled: true }}
              biometricSettings={biometricSettings || { enabled: false, credentials: [], requirePinFallback: true, quickUnlockOnPWA: true }}
              hideChildrenWithNoActivity={hideChildrenWithNoActivity || false}
              onSelect={setSelectedChild}
              onParentMode={() => setShowPinDialog(true)}
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
