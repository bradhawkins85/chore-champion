import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Package, Check, Sparkle, Users, ListChecks, Gift, X, Gear, ClockCounterClockwise, Warning, ClipboardText, Shield, Envelope, FileText, SpeakerHigh, Bell, House, Pulse, FolderUser, Devices, RocketLaunch, Question, CreditCard, ImageSquare, Pencil, Trash, CaretUp, CaretDown, SunHorizon, MoonStars, Clock, Calendar } from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSubscription } from '@/hooks/use-subscription'
import { Child, Chore, ChoreAssignment, Reward, RewardPurchase, ChoreCompletion, ChoreHistoryEvent, MissedChore, CelebrationSettings, Category, DayOfWeek, RepeatPattern, BiometricSettings, IPRestrictionSettings, IPAccessAttempt, WeeklyReportSettings, CategoryBonusCompletion, ReportTemplate, WeatherSettings, PointSwap, EmailAlertSettings, WeatherData, SpeechSettings, PushNotificationSettings, SchoolHoliday, SchoolHolidayCountdownSettings, ChildAvailabilityEntry, EmailAlertSettingsMap, WeeklyReportSettingsMap, GettingStartedState, WallpaperSettings, DeviceWallpaperSettingsMap, ChoreTimeOfDay } from '@/lib/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useApiKV } from '@/hooks/use-api-kv'
import { ChoreCard } from './ChoreCard'
import { ChildCard } from './ChildCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChoreDialog } from './ChoreDialog'
import { ChildDialog } from './ChildDialog'
import { AssignChoresView } from './AssignChoresView'
import { RewardDialog } from './RewardDialog'
import { RewardCard } from './RewardCard'
import { PurchaseHistoryCard } from './PurchaseHistoryCard'
import { WeeklySummary } from './WeeklySummary'
import { ChangePinDialog } from './ChangePinDialog'
import { ActivityView } from './ActivityView'
import { MissedChoresManager } from './MissedChoresManager'
import { CelebrationSettingsComponent } from './CelebrationSettings'
import { CategoryManager } from './CategoryManager'
import { PendingApprovalsManager } from './PendingApprovalsManager'
import { BiometricSettings as BiometricSettingsComponent } from './BiometricSettings'
import { IPRestrictions } from './IPRestrictions'
import { ReportTemplatesManager } from './ReportTemplatesManager'
import { WeatherSettingsComponent } from './WeatherSettings'
import { PushNotificationSettingsComponent } from './PushNotificationSettings'
import { SpeechSettings as SpeechSettingsComponent } from './SpeechSettings'
import { DisplayPreferencesSettings } from './DisplayPreferencesSettings'
import { SchoolHolidaySettings } from './SchoolHolidaySettings'
import { ChildAvailabilitySchedule } from './ChildAvailabilitySchedule'
import { AccountSettings } from './AccountSettings'
import { DeviceManagement } from './DeviceManagement'
import { GettingStartedMenu } from './GettingStartedMenu'
import { HelpMenu } from './HelpMenu'
import { DeviceSettings } from './DeviceSettings'
import { SubscriptionSettings } from './SubscriptionSettings'
import { WallpaperSettingsPanel } from './WallpaperSettingsPanel'
import { generateICSFeed, downloadICSFile } from '@/lib/icsHelper'
import { isChoreActive, isChoreActiveToday, isChildAvailableForTimeOfDay, formatTime12Hour } from '@/lib/helpers'
import { toast } from 'sonner'

const welcomeCardIds = ['children', 'chores', 'approvals', 'missed', 'rewards', 'purchases']

const timeOfDayOrder: Record<string, number> = { 'am': 1, 'pm': 2, 'both': 3, 'anytime': 4, 'undefined': 5 }

const normalizeCardOrder = (order: string[], allIds: string[]) => {
  const unique = order.filter((id, index) => order.indexOf(id) === index && allIds.includes(id))
  const missing = allIds.filter((id) => !unique.includes(id))
  return [...unique, ...missing]
}

const areArraysEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index])

// Sortable card component
interface SortableCardProps {
  id: string
  children: React.ReactNode
}

function SortableCard({ id, children }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      role="button"
      aria-label={`Draggable card: ${id}`}
    >
      {children}
    </div>
  )
}

interface ParentPanelProps {
  chores: Chore[]
  childrenList: Child[]
  assignments: ChoreAssignment[]
  completions: ChoreCompletion[]
  childPoints: Map<string, number>
  rewards: Reward[]
  purchases: RewardPurchase[]
  history: ChoreHistoryEvent[]
  dismissedMissedChores: MissedChore[]
  parentPin: string | null
  celebrationSettings: CelebrationSettings
  biometricSettings: BiometricSettings
  categories: Category[]
  childCategoryPoints?: Map<string, Map<string, number>>
  bonusCompletions: CategoryBonusCompletion[]
  pointSwaps: PointSwap[]
  ipRestrictions: IPRestrictionSettings
  currentIP: string | null
  accessHistory: IPAccessAttempt[]
  weeklyReportSettings: WeeklyReportSettings
  emailAlertSettings: EmailAlertSettings
  emailAlertSettingsMap: EmailAlertSettingsMap
  weeklyReportSettingsMap: WeeklyReportSettingsMap
  reportTemplates: ReportTemplate[]
  weatherSettings: WeatherSettings
  currentWeather: WeatherData | null
  pendingDigestItems: any[]
  speechSettings: SpeechSettings
  pushNotificationSettings: PushNotificationSettings
  currentDeviceId: string
  hideChildrenWithNoActivity: boolean
  blockParentModeOnLinkedDevices: boolean
  schoolHolidays: SchoolHoliday[]
  childAvailability: ChildAvailabilityEntry[]
  schoolHolidayCountdownSettings: SchoolHolidayCountdownSettings
  gettingStartedState: GettingStartedState
  wallpaperSettings: WallpaperSettings
  deviceWallpaperSettings: DeviceWallpaperSettingsMap
  onAddChore: (chore: Omit<Chore, 'id' | 'createdAt'>) => void
  onEditChore: (id: string, chore: Omit<Chore, 'id' | 'createdAt'>) => void
  onDeleteChore: (id: string) => void
  onAddChild: (child: Omit<Child, 'id' | 'createdAt' | 'totalPoints'>) => void
  onEditChild: (id: string, child: Omit<Child, 'id' | 'createdAt' | 'totalPoints'>) => void
  onDeleteChild: (id: string) => void
  onAddChildAvailability: (entry: Omit<ChildAvailabilityEntry, 'id'>) => void
  onUpdateChildAvailability: (id: string, updates: Omit<ChildAvailabilityEntry, 'id'>) => void
  onDeleteChildAvailability: (id: string) => void
  onAssignChore: (childId: string, choreId: string) => void
  onUnassignChore: (assignmentId: string) => void
  onEditAssignment: (
    assignmentId: string,
    updates: {
      startDate?: number
      endDate?: number
      daysOfWeek?: DayOfWeek[]
      repeatPattern?: RepeatPattern
    }
  ) => void
  onAddReward: (reward: Omit<Reward, 'id' | 'createdAt'>) => void
  onEditReward: (id: string, reward: Omit<Reward, 'id' | 'createdAt'>) => void
  onDeleteReward: (id: string) => void
  onToggleRewardDisabled: (id: string) => void
  onFulfillPurchase: (purchaseId: string) => void
  onUnfulfillPurchase: (purchaseId: string) => void
  onChangePin: (newPin: string) => void
  onCelebrationSettingsChange: (settings: CelebrationSettings) => void
  onBiometricSettingsChange: (settings: BiometricSettings) => void
  onOverrideComplete: (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => void
  onDismissMissed: (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => void
  onAddCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void
  onEditCategory: (id: string, category: Omit<Category, 'id' | 'createdAt'>) => void
  onDeleteCategory: (id: string) => void
  onReorderCategories: (categories: Category[]) => void
  onApproveCompletion: (completionId: string) => void
  onRejectCompletion: (completionId: string, reason?: string) => void
  onUndoCompletion: (completionId: string) => void
  onUndoDismissMissed: (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => void
  onUpdateIPRestrictions: (settings: IPRestrictionSettings) => void
  onUpdateWeeklyReportSettings: (settings: WeeklyReportSettings) => void
  onUpdateWeatherSettings: (settings: WeatherSettings) => void
  onUpdateEmailAlertSettings: (settings: EmailAlertSettings) => void
  onUpdateEmailAlertSettingsMap: (settings: EmailAlertSettingsMap) => void
  onUpdateWeeklyReportSettingsMap: (settings: WeeklyReportSettingsMap) => void
  onUpdatePushNotificationSettings: (settings: PushNotificationSettings) => Promise<void>
  onUpdateSpeechSettings: (settings: SpeechSettings) => void
  onUpdateHideChildrenWithNoActivity: (value: boolean) => void
  onUpdateBlockParentModeOnLinkedDevices: (value: boolean) => void
  onUpdateWallpaperSettings: (settings: WallpaperSettings) => void
  onUpdateDeviceWallpaperSettings: (settings: DeviceWallpaperSettingsMap) => void
  onAddReportTemplate: (templateData: Omit<ReportTemplate, 'id' | 'createdAt'>) => void
  onEditReportTemplate: (id: string, templateData: Omit<ReportTemplate, 'id' | 'createdAt'>) => void
  onDeleteReportTemplate: (id: string) => void
  onAddSchoolHoliday: (holiday: Omit<SchoolHoliday, 'id' | 'createdAt'>) => void
  onEditSchoolHoliday: (id: string, holiday: Omit<SchoolHoliday, 'id' | 'createdAt'>) => void
  onDeleteSchoolHoliday: (id: string) => void
  onUpdateSchoolHolidayCountdownSettings: (settings: SchoolHolidayCountdownSettings) => void
  onUpdateGettingStartedState: (state: GettingStartedState) => void
  onSendDigestNow: () => void
  onExitParentMode: () => void
}

export function ParentPanel({
  chores,
  childrenList,
  assignments,
  completions,
  childPoints,
  rewards,
  purchases,
  history,
  dismissedMissedChores,
  parentPin,
  celebrationSettings,
  biometricSettings,
  categories,
  childCategoryPoints,
  bonusCompletions,
  pointSwaps,
  reportTemplates,
  weatherSettings,
  currentWeather,
  pendingDigestItems,
  onAddChore,
  onEditChore,
  onDeleteChore,
  onAddChild,
  onEditChild,
  onDeleteChild,
  onAddChildAvailability,
  onUpdateChildAvailability,
  onDeleteChildAvailability,
  onAssignChore,
  onUnassignChore,
  onEditAssignment,
  onAddReward,
  onEditReward,
  onDeleteReward,
  onToggleRewardDisabled,
  onFulfillPurchase,
  onUnfulfillPurchase,
  onChangePin,
  onCelebrationSettingsChange,
  onBiometricSettingsChange,
  onOverrideComplete,
  onDismissMissed,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onReorderCategories,
  onApproveCompletion,
  onRejectCompletion,
  onUndoCompletion,
  onUndoDismissMissed,
  ipRestrictions,
  currentIP,
  accessHistory,
  onUpdateIPRestrictions,
  weeklyReportSettings,
  emailAlertSettings,
  emailAlertSettingsMap,
  weeklyReportSettingsMap,
  onUpdateWeeklyReportSettings,
  onUpdateWeatherSettings,
  onUpdateEmailAlertSettings,
  onUpdateEmailAlertSettingsMap,
  onUpdateWeeklyReportSettingsMap,
  pushNotificationSettings,
  currentDeviceId,
  onUpdatePushNotificationSettings,
  speechSettings,
  onUpdateSpeechSettings,
  hideChildrenWithNoActivity,
  onUpdateHideChildrenWithNoActivity,
  blockParentModeOnLinkedDevices,
  onUpdateBlockParentModeOnLinkedDevices,
  onUpdateWallpaperSettings,
  onUpdateDeviceWallpaperSettings,
  onAddReportTemplate,
  onEditReportTemplate,
  onDeleteReportTemplate,
  schoolHolidays,
  childAvailability,
  schoolHolidayCountdownSettings,
  gettingStartedState,
  wallpaperSettings,
  deviceWallpaperSettings,
  onAddSchoolHoliday,
  onEditSchoolHoliday,
  onDeleteSchoolHoliday,
  onUpdateSchoolHolidayCountdownSettings,
  onUpdateGettingStartedState,
  onSendDigestNow,
  onExitParentMode,
}: ParentPanelProps) {
  const { limits } = useSubscription()
  
  // Calculate canAddChild locally for immediate UI feedback
  const canAddChild = useMemo(() => {
    if (!limits) return false // Disable button until limits are loaded
    const maxChildren = limits.limits.maxChildren
    const currentChildren = childrenList.length
    // If maxChildren is null, there's no limit (unlimited)
    // Otherwise, check if current count is less than max
    return maxChildren === null || currentChildren < maxChildren
  }, [limits, childrenList.length])
  
  const [choreDialogOpen, setChoreDialogOpen] = useState(false)
  const [childDialogOpen, setChildDialogOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | undefined>()
  const [editingChild, setEditingChild] = useState<Child | undefined>()
  const [deleteChoreId, setDeleteChoreId] = useState<string | null>(null)
  const [deleteChildId, setDeleteChildId] = useState<string | null>(null)
  const [deleteRewardId, setDeleteRewardId] = useState<string | null>(null)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [changePinDialogOpen, setChangePinDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('welcome')
  const [activitiesSubTab, setActivitiesSubTab] = useState('approvals')
  const [managementSubTab, setManagementSubTab] = useState('children')
  const [settingsSubTab, setSettingsSubTab] = useState('account')
  const [choreSortColumn, setChoreSortColumn] = useState<string | null>(null)
  const [choreSortDirection, setChoreSortDirection] = useState<'asc' | 'desc'>('asc')

  // State for welcome card order - save order immediately when changed
  const [welcomeCardOrder, setWelcomeCardOrder] = useApiKV<string[]>(
    'welcomeCardOrder',
    welcomeCardIds
  )
  const normalizedWelcomeCardOrder = useMemo(
    () => normalizeCardOrder(welcomeCardOrder, welcomeCardIds),
    [welcomeCardOrder]
  )

  useEffect(() => {
    if (!areArraysEqual(normalizedWelcomeCardOrder, welcomeCardOrder)) {
      setWelcomeCardOrder(normalizedWelcomeCardOrder)
    }
  }, [normalizedWelcomeCardOrder, setWelcomeCardOrder, welcomeCardOrder])

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = normalizedWelcomeCardOrder.indexOf(active.id as string)
      const newIndex = normalizedWelcomeCardOrder.indexOf(over.id as string)
      
      const newOrder = arrayMove(normalizedWelcomeCardOrder, oldIndex, newIndex)
      // Save order immediately using useApiKV
      setWelcomeCardOrder(newOrder)
    }
  }

  const pendingApprovalsCount = useMemo(() => {
    return completions.filter((c) => c.approvalStatus === 'pending').length
  }, [completions])

  const missedChoresCount = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()
    const currentTimeOfDay = new Date().getHours() < 12 ? 'am' : 'pm'

    let count = 0
    childrenList.forEach((child) => {
      const childAssignments = assignments.filter((a) => a.childId === child.id)

      childAssignments.forEach((assignment) => {
        const chore = chores.find((c) => c.id === assignment.choreId)
        if (!chore || !isChoreActive(assignment) || !isChoreActiveToday(assignment)) return
        const isDismissed = (timeOfDay?: 'am' | 'pm') =>
          dismissedMissedChores.some(
            (d) =>
              d.childId === child.id &&
              d.choreId === chore.id &&
              d.timeOfDay === timeOfDay &&
              d.missedDate === todayTimestamp &&
              d.dismissed
          )

        if (chore.timeOfDay === 'both') {
          const amCompleted = completions.some(
            (c) =>
              c.choreId === chore.id &&
              c.childId === child.id &&
              c.completedAt >= todayTimestamp &&
              c.timeOfDay === 'am'
          )
          
          if (currentTimeOfDay === 'pm' && !amCompleted && !isDismissed('am')) {
            if (!isChildAvailableForTimeOfDay(child.id, childAvailability, today, 'am')) return
            count++
          }
        } else if (chore.timeOfDay === 'am') {
          if (currentTimeOfDay === 'pm') {
            const amCompleted = completions.some(
              (c) =>
                c.choreId === chore.id &&
                c.childId === child.id &&
                c.completedAt >= todayTimestamp &&
                c.timeOfDay === 'am'
            )
            if (!amCompleted && !isDismissed('am')) {
              if (!isChildAvailableForTimeOfDay(child.id, childAvailability, today, 'am')) return
              count++
            }
          }
        } else if (chore.timeOfDay === 'pm') {
          if (!isChildAvailableForTimeOfDay(child.id, childAvailability, today, 'pm')) return
        } else if (!isChildAvailableForTimeOfDay(child.id, childAvailability, today, 'anytime')) {
          return
        }
      })
    })

    return count
  }, [childrenList, chores, assignments, completions, dismissedMissedChores, childAvailability])

  // Auto-update getting started tasks based on actual progress
  useEffect(() => {
    if (gettingStartedState.dismissed) return

    let updated = false
    const updatedTasks = gettingStartedState.tasks.map(task => {
      if (task.completed || task.ignored) return task

      let shouldComplete = false

      switch (task.id) {
        case 'add-child':
          shouldComplete = childrenList.length > 0
          break
        case 'create-chore':
          shouldComplete = chores.length > 0
          break
        case 'assign-chore':
          shouldComplete = assignments.length > 0
          break
        case 'add-reward':
          shouldComplete = rewards.length > 0
          break
        case 'set-pin':
          shouldComplete = parentPin !== null && parentPin !== '0000'
          break
        case 'invite-parent':
          // Check if there are multiple users in emailAlertSettingsMap or weeklyReportSettingsMap
          shouldComplete = (emailAlertSettingsMap && Object.keys(emailAlertSettingsMap).length > 1) || 
                          (weeklyReportSettingsMap && Object.keys(weeklyReportSettingsMap).length > 1)
          break
        case 'setup-weather':
          shouldComplete = weatherSettings.enabled && !!weatherSettings.location
          break
        case 'add-school-holidays':
          shouldComplete = schoolHolidays.length > 0
          break
        case 'configure-notifications':
          // Check if email or push notifications are configured
          const hasEmailAlerts = emailAlertSettingsMap && Object.values(emailAlertSettingsMap).some((settings: any) => 
            settings.rewardPurchaseAlerts || 
            settings.weeklyReportAlerts || settings.pendingApprovalAlerts
          )
          const hasPushNotifications = pushNotificationSettings.enabled && 
            pushNotificationSettings.devices && pushNotificationSettings.devices.length > 0
          shouldComplete = hasEmailAlerts || hasPushNotifications
          break
        case 'link-device':
          // Check if device settings have been explicitly configured
          shouldComplete = blockParentModeOnLinkedDevices !== undefined
          break
        case 'manage-chores-children':
          // Same as assign-chore - check if chores are assigned
          shouldComplete = assignments.length > 0
          break
      }

      if (shouldComplete) {
        updated = true
        return { ...task, completed: true }
      }
      return task
    })

    if (updated) {
      onUpdateGettingStartedState({
        ...gettingStartedState,
        tasks: updatedTasks,
      })
    }
  }, [childrenList, chores, assignments, rewards, parentPin, emailAlertSettingsMap, weeklyReportSettingsMap, 
      weatherSettings, schoolHolidays, pushNotificationSettings, blockParentModeOnLinkedDevices, 
      gettingStartedState, onUpdateGettingStartedState])
  // Define welcome cards with their content
  const welcomeCards = useMemo(() => {
    const cardDefinitions: Record<string, { icon: React.ReactNode; title: string; value: number; description: string }> = {
      children: {
        icon: <Users className="h-6 w-6 text-primary" />,
        title: 'Children',
        value: childrenList.length,
        description: 'Active children',
      },
      chores: {
        icon: <ListChecks className="h-6 w-6 text-primary" />,
        title: 'Chores',
        value: chores.length,
        description: 'Total chores',
      },
      approvals: {
        icon: <Check className="h-6 w-6 text-primary" />,
        title: 'Pending Approvals',
        value: pendingApprovalsCount,
        description: 'Need attention',
      },
      missed: {
        icon: <Warning className="h-6 w-6 text-primary" />,
        title: 'Missed Chores',
        value: missedChoresCount,
        description: 'Outstanding',
      },
      rewards: {
        icon: <Gift className="h-6 w-6 text-primary" />,
        title: 'Rewards',
        value: rewards.length,
        description: 'Available',
      },
      purchases: {
        icon: <Package className="h-6 w-6 text-primary" />,
        title: 'Unfulfilled Purchases',
        value: purchases.filter((p) => !p.fulfilled).length,
        description: 'To fulfill',
      },
    }

    // Return cards in the saved order
    return normalizedWelcomeCardOrder.map((cardId) => ({
      id: cardId,
      ...cardDefinitions[cardId],
    }))
  }, [
    childrenList,
    chores,
    pendingApprovalsCount,
    missedChoresCount,
    rewards,
    purchases,
    normalizedWelcomeCardOrder,
  ])

  const handleEditChore = (chore: Chore) => {
    setEditingChore(chore)
    setChoreDialogOpen(true)
  }

  const handleSaveChore = (chore: Omit<Chore, 'id' | 'createdAt'>) => {
    if (editingChore) {
      onEditChore(editingChore.id, chore)
      setEditingChore(undefined)
    } else {
      onAddChore(chore)
    }
  }

  const handleEditChild = (child: Child) => {
    setEditingChild(child)
    setChildDialogOpen(true)
  }

  const handleSaveChild = (child: Omit<Child, 'id' | 'createdAt' | 'totalPoints'>) => {
    if (editingChild) {
      onEditChild(editingChild.id, child)
      setEditingChild(undefined)
    } else {
      onAddChild(child)
    }
  }

  const handleChildCardClick = (child: Child) => {
    setSelectedChild(child)
  }

  const handleDownloadICS = (child: Child) => {
    const icsContent = generateICSFeed(child, completions, chores, assignments)
    downloadICSFile(child, icsContent)
    toast.success(`Calendar downloaded for ${child.name}`, {
      description: 'Import this file into your calendar app to view chore history',
    })
  }

  // Sort chores function
  const handleSortColumn = (column: string) => {
    if (choreSortColumn === column) {
      // Toggle direction if same column
      setChoreSortDirection(choreSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to ascending
      setChoreSortColumn(column)
      setChoreSortDirection('asc')
    }
  }

  // Helper function to get timeOfDay display badge
  const getTimeOfDayBadge = (timeOfDay?: ChoreTimeOfDay) => {
    if (!timeOfDay || timeOfDay === 'anytime') {
      return <span className="text-sm text-muted-foreground">Anytime</span>
    }
    
    switch (timeOfDay) {
      case 'am':
        return (
          <Badge variant="outline" className="flex items-center gap-1 w-fit">
            <SunHorizon className="h-3 w-3" />
            AM
          </Badge>
        )
      case 'pm':
        return (
          <Badge variant="outline" className="flex items-center gap-1 w-fit">
            <MoonStars className="h-3 w-3" />
            PM
          </Badge>
        )
      case 'both':
        return (
          <Badge variant="outline" className="flex items-center gap-1 w-fit">
            <ClockCounterClockwise className="h-3 w-3" />
            Both
          </Badge>
        )
      default:
        return <span className="text-sm text-muted-foreground">Anytime</span>
    }
  }

  // Sorted chores array
  const sortedChores = useMemo(() => {
    if (!choreSortColumn) {
      return chores
    }

    return [...chores].sort((a, b) => {
      let aValue: string | number = ''
      let bValue: string | number = ''

      switch (choreSortColumn) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'points':
          aValue = a.points
          bValue = b.points
          break
        case 'frequency':
          aValue = a.frequency
          bValue = b.frequency
          break
        case 'timeOfDay':
          aValue = a.timeOfDay ? timeOfDayOrder[a.timeOfDay] : timeOfDayOrder['undefined']
          bValue = b.timeOfDay ? timeOfDayOrder[b.timeOfDay] : timeOfDayOrder['undefined']
          break
        case 'desiredTime':
          aValue = a.desiredTime || ''
          bValue = b.desiredTime || ''
          break
        case 'timeWindow':
          aValue = a.timeWindow?.startTime || ''
          bValue = b.timeWindow?.startTime || ''
          break
        default:
          return 0
      }

      if (aValue < bValue) {
        return choreSortDirection === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return choreSortDirection === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [chores, choreSortColumn, choreSortDirection])

  if (selectedChild) {
    return (
      <AssignChoresView
        child={selectedChild}
        allChores={chores}
        assignments={assignments}
        categories={categories}
        onBack={() => {
          setSelectedChild(null)
          setActiveTab('management')
          setManagementSubTab('children')
        }}
        onAssign={(choreId) => onAssignChore(selectedChild.id, choreId)}
        onUnassign={onUnassignChore}
        onEditAssignment={onEditAssignment}
      />
    )
  }

  return (
    <div className="mx-auto p-6 max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-fredoka font-bold mb-2">Parent Dashboard</h1>
          <p className="text-muted-foreground">
            Manage chores, children, and assignments
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={onExitParentMode}
          className="font-fredoka"
        >
          <X className="h-5 w-5 mr-2" />
          Exit Parent Mode
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="welcome">
            <House className="h-4 w-4 mr-2" />
            Welcome
          </TabsTrigger>
          <TabsTrigger value="activities">
            <Pulse className="h-4 w-4 mr-2" />
            Activities
            {(pendingApprovalsCount > 0 || missedChoresCount > 0 || purchases.filter((p) => !p.fulfilled).length > 0) && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                {pendingApprovalsCount + missedChoresCount + purchases.filter((p) => !p.fulfilled).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="management">
            <FolderUser className="h-4 w-4 mr-2" />
            Management
          </TabsTrigger>
          <TabsTrigger value="settings-tab">
            <Gear className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="help">
            <Question className="h-4 w-4 mr-2" />
            Help
          </TabsTrigger>
          {!gettingStartedState.dismissed && (
            <TabsTrigger value="getting-started">
              <RocketLaunch className="h-4 w-4 mr-2" />
              Getting Started
            </TabsTrigger>
          )}
        </TabsList>

        {/* Welcome Tab */}
        <TabsContent value="welcome" className="space-y-4">
          <WeeklySummary
            childrenList={childrenList}
            chores={chores}
            completions={completions}
            purchases={purchases}
            childPoints={childPoints}
          />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={normalizedWelcomeCardOrder}
              strategy={rectSortingStrategy}
            >
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {welcomeCards.map((card) => (
                  <SortableCard key={card.id} id={card.id}>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                          {card.icon}
                          <h3 className="font-fredoka font-semibold text-lg">{card.title}</h3>
                        </div>
                        <p className="text-3xl font-bold mb-1">{card.value}</p>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </CardContent>
                    </Card>
                  </SortableCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </TabsContent>

        {/* Activities Tab with Nested Tabs */}
        <TabsContent value="activities" className="space-y-4">
          <Tabs value={activitiesSubTab} onValueChange={setActivitiesSubTab} className="space-y-4">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="approvals">
                <Check className="h-4 w-4 mr-2" />
                Pending Approvals
                {pendingApprovalsCount > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                    {pendingApprovalsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="missed">
                <Warning className="h-4 w-4 mr-2" />
                Missed Chores
                {missedChoresCount > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                    {missedChoresCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity">
                <ClipboardText className="h-4 w-4 mr-2" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="purchases">
                <Package className="h-4 w-4 mr-2" />
                Purchase History
                {purchases.filter((p) => !p.fulfilled).length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                    {purchases.filter((p) => !p.fulfilled).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reports">
                <FileText className="h-4 w-4 mr-2" />
                Reports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="approvals" className="space-y-4">
              <PendingApprovalsManager
                childrenList={childrenList}
                chores={chores}
                completions={completions}
                onApprove={onApproveCompletion}
                onReject={onRejectCompletion}
                emailAlertSettings={emailAlertSettings}
                pendingDigestItems={pendingDigestItems}
                onSendDigestNow={onSendDigestNow}
              />
            </TabsContent>

            <TabsContent value="missed" className="space-y-4">
              <MissedChoresManager
                childrenList={childrenList}
                chores={chores}
                assignments={assignments}
                completions={completions}
                dismissedMissedChores={dismissedMissedChores}
                childAvailability={childAvailability}
                onOverrideComplete={onOverrideComplete}
                onDismissMissed={onDismissMissed}
              />
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <ActivityView
                completions={completions}
                childrenList={childrenList}
                chores={chores}
                categories={categories}
                assignments={assignments}
                bonusCompletions={bonusCompletions}
                purchases={purchases}
                rewards={rewards}
                swaps={pointSwaps || []}
                history={history}
                dismissedMissedChores={dismissedMissedChores}
                onUndoCompletion={onUndoCompletion}
                onUndoDismissMissed={onUndoDismissMissed}
              />
            </TabsContent>

            <TabsContent value="purchases" className="space-y-4">
              {purchases.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg text-muted-foreground">
                      No purchases yet. Children can redeem rewards from the Reward Shop!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const pendingPurchases = purchases.filter((p) => !p.fulfilled)
                        pendingPurchases.forEach((p) => onFulfillPurchase(p.id))
                      }}
                      disabled={purchases.filter((p) => !p.fulfilled).length === 0}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Fulfill All Pending
                    </Button>
                  </div>
                  {[...purchases]
                    .sort((a, b) => b.purchasedAt - a.purchasedAt)
                    .map((purchase) => {
                      const reward = rewards.find((r) => r.id === purchase.rewardId)
                      const child = childrenList.find((c) => c.id === purchase.childId)
                      return (
                        <PurchaseHistoryCard
                          key={purchase.id}
                          purchase={purchase}
                          reward={reward}
                          child={child}
                          categories={categories}
                          onFulfill={onFulfillPurchase}
                          onUnfulfill={onUnfulfillPurchase}
                        />
                      )
                    })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <ReportTemplatesManager
                templates={reportTemplates}
                childrenList={childrenList}
                chores={chores}
                assignments={assignments}
                completions={completions}
                purchases={purchases}
                categories={categories}
                rewards={rewards}
                bonusCompletions={bonusCompletions}
                parentEmail={weeklyReportSettings.parentEmail}
                onAddTemplate={onAddReportTemplate}
                onEditTemplate={onEditReportTemplate}
                onDeleteTemplate={onDeleteReportTemplate}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Management Tab with Nested Tabs */}
        <TabsContent value="management" className="space-y-4">
          <Tabs value={managementSubTab} onValueChange={setManagementSubTab} className="space-y-4">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="children">
                <Users className="h-4 w-4 mr-2" />
                Children
              </TabsTrigger>
              <TabsTrigger value="chores">
                <ListChecks className="h-4 w-4 mr-2" />
                Chores
              </TabsTrigger>
              <TabsTrigger value="categories">
                <Sparkle className="h-4 w-4 mr-2" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="rewards">
                <Gift className="h-4 w-4 mr-2" />
                Rewards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="children" className="space-y-4">
          <div className="flex justify-end">
            {!canAddChild ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button 
                      onClick={() => setChildDialogOpen(true)}
                      disabled={true}
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Child
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upgrade to paid plan to add more children</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button onClick={() => setChildDialogOpen(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Add Child
              </Button>
            )}
          </div>

          {childrenList.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-lg text-muted-foreground mb-4">
                  No children added yet. Add your first child to get started!
                </p>
                {!canAddChild ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button 
                          onClick={() => setChildDialogOpen(true)}
                          disabled={true}
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Add Your First Child
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upgrade to paid plan to add more children</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button onClick={() => setChildDialogOpen(true)}>
                    <Plus className="h-5 w-5 mr-2" />
                    Add Your First Child
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {childrenList.map((child) => (
                <ChildCard
                  key={child.id}
                  child={child}
                  totalPoints={childPoints.get(child.id) || 0}
                  categoryPoints={childCategoryPoints?.get(child.id)}
                  categories={categories}
                  onEdit={handleEditChild}
                  onDelete={setDeleteChildId}
                  onClick={handleChildCardClick}
                  onDownloadICS={handleDownloadICS}
                />
              ))}
            </div>
          )}

              <ChildAvailabilitySchedule
                childrenList={childrenList}
                entries={childAvailability}
                onAddEntry={onAddChildAvailability}
                onUpdateEntry={onUpdateChildAvailability}
                onDeleteEntry={onDeleteChildAvailability}
              />

              <DisplayPreferencesSettings
                hideChildrenWithNoActivity={hideChildrenWithNoActivity}
                onHideChildrenWithNoActivityChange={onUpdateHideChildrenWithNoActivity}
              />
            </TabsContent>

            <TabsContent value="chores" className="space-y-4">
              <div className="flex justify-end">
                <div className="flex gap-2">
                  {!limits?.canAddChore ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button 
                            onClick={() => setChoreDialogOpen(true)}
                            disabled={true}
                          >
                            <Plus className="h-5 w-5 mr-2" />
                            Add Chore
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Upgrade to paid plan to add more chores</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button onClick={() => setChoreDialogOpen(true)}>
                      <Plus className="h-5 w-5 mr-2" />
                      Add Chore
                    </Button>
                  )}
                </div>
              </div>

              {chores.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-lg text-muted-foreground mb-4">
                      No chores created yet. Create your first chore to assign to children!
                    </p>
                    {!limits?.canAddChore ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button 
                              onClick={() => setChoreDialogOpen(true)}
                              disabled={true}
                            >
                              <Plus className="h-5 w-5 mr-2" />
                              Create Your First Chore
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Upgrade to paid plan to add more chores</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button onClick={() => setChoreDialogOpen(true)}>
                        <Plus className="h-5 w-5 mr-2" />
                        Create Your First Chore
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="font-semibold cursor-pointer select-none"
                            onClick={() => handleSortColumn('name')}
                          >
                            <div className="flex items-center gap-1">
                              Chore Name
                              {choreSortColumn === 'name' && (
                                choreSortDirection === 'asc' ? 
                                  <CaretUp className="h-3 w-3" /> : 
                                  <CaretDown className="h-3 w-3" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="font-semibold cursor-pointer select-none"
                            onClick={() => handleSortColumn('points')}
                          >
                            <div className="flex items-center gap-1">
                              Points
                              {choreSortColumn === 'points' && (
                                choreSortDirection === 'asc' ? 
                                  <CaretUp className="h-3 w-3" /> : 
                                  <CaretDown className="h-3 w-3" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="font-semibold cursor-pointer select-none"
                            onClick={() => handleSortColumn('frequency')}
                          >
                            <div className="flex items-center gap-1">
                              Frequency
                              {choreSortColumn === 'frequency' && (
                                choreSortDirection === 'asc' ? 
                                  <CaretUp className="h-3 w-3" /> : 
                                  <CaretDown className="h-3 w-3" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="font-semibold cursor-pointer select-none"
                            onClick={() => handleSortColumn('timeOfDay')}
                          >
                            <div className="flex items-center gap-1">
                              Time of Day
                              {choreSortColumn === 'timeOfDay' && (
                                choreSortDirection === 'asc' ? 
                                  <CaretUp className="h-3 w-3" /> : 
                                  <CaretDown className="h-3 w-3" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="font-semibold cursor-pointer select-none"
                            onClick={() => handleSortColumn('desiredTime')}
                          >
                            <div className="flex items-center gap-1">
                              Desired Time
                              {choreSortColumn === 'desiredTime' && (
                                choreSortDirection === 'asc' ? 
                                  <CaretUp className="h-3 w-3" /> : 
                                  <CaretDown className="h-3 w-3" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="font-semibold cursor-pointer select-none"
                            onClick={() => handleSortColumn('timeWindow')}
                          >
                            <div className="flex items-center gap-1">
                              Time Window
                              {choreSortColumn === 'timeWindow' && (
                                choreSortDirection === 'asc' ? 
                                  <CaretUp className="h-3 w-3" /> : 
                                  <CaretDown className="h-3 w-3" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedChores.map((chore) => (
                          <TableRow key={chore.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {chore.emoji && <span className="text-xl">{chore.emoji}</span>}
                                <div>
                                  <div className="font-fredoka font-semibold">{chore.name}</div>
                                  {chore.description && (
                                    <div className="text-xs text-muted-foreground mt-0.5 max-w-xs line-clamp-2">
                                      {chore.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-fredoka">
                                {chore.points} pts
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-4 w-4" />
                                <span className="capitalize">{chore.frequency}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getTimeOfDayBadge(chore.timeOfDay)}
                            </TableCell>
                            <TableCell>
                              {chore.desiredTime ? (
                                <div className="text-sm">{formatTime12Hour(chore.desiredTime)}</div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {chore.timeWindow ? (
                                <Badge variant="outline" className="flex items-center gap-1 w-fit whitespace-nowrap">
                                  <Clock className="h-3 w-3" />
                                  {formatTime12Hour(chore.timeWindow.startTime)} - {formatTime12Hour(chore.timeWindow.endTime)}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditChore(chore)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => setDeleteChoreId(chore.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <CategoryManager
                categories={categories}
                onAddCategory={onAddCategory}
                onEditCategory={onEditCategory}
                onDeleteCategory={onDeleteCategory}
                onReorderCategories={onReorderCategories}
              />
            </TabsContent>

            <TabsContent value="rewards" className="space-y-4">
              <div className="flex justify-end">
                <RewardDialog 
                  onSave={onAddReward} 
                  childrenList={childrenList} 
                  chores={chores} 
                  categories={categories}
                  disabled={!limits?.canAddReward}
                  disabledTooltip="Upgrade to paid plan to add more rewards"
                />
              </div>

              {rewards.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-lg text-muted-foreground mb-4">
                      No rewards created yet. Add rewards for children to redeem with their points!
                    </p>
                    <RewardDialog 
                      onSave={onAddReward} 
                      childrenList={childrenList} 
                      chores={chores} 
                      categories={categories}
                      disabled={!limits?.canAddReward}
                      disabledTooltip="Upgrade to paid plan to add more rewards"
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {rewards.map((reward) => {
                    const purchaseCount = purchases.filter(
                      (p) => p.rewardId === reward.id
                    ).length
                    return (
                      <RewardCard
                        key={reward.id}
                        reward={reward}
                        childrenList={childrenList}
                        chores={chores}
                        categories={categories}
                        onEdit={onEditReward}
                        onDelete={setDeleteRewardId}
                        onToggleDisabled={onToggleRewardDisabled}
                        purchaseCount={purchaseCount}
                      />
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Settings Tab with Nested Tabs */}
        <TabsContent value="settings-tab" className="space-y-4">
          <Tabs value={settingsSubTab} onValueChange={setSettingsSubTab} className="space-y-4">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="account">
                <FolderUser className="h-4 w-4 mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger value="subscription">
                <CreditCard className="h-4 w-4 mr-2" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Gear className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="wallpapers">
                <ImageSquare className="h-4 w-4 mr-2" />
                Wallpapers
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="devices">
                <Devices className="h-4 w-4 mr-2" />
                Devices
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4">
              <WeatherSettingsComponent
                settings={weatherSettings}
                onUpdate={onUpdateWeatherSettings}
              />

              <SchoolHolidaySettings
                holidays={schoolHolidays}
                displaySettings={schoolHolidayCountdownSettings}
                onUpdateDisplaySettings={onUpdateSchoolHolidayCountdownSettings}
                onAdd={onAddSchoolHoliday}
                onEdit={onEditSchoolHoliday}
                onDelete={onDeleteSchoolHoliday}
              />

              <CelebrationSettingsComponent 
                settings={celebrationSettings}
                onUpdate={onCelebrationSettingsChange}
              />

              <SpeechSettingsComponent
                settings={speechSettings}
                onUpdate={onUpdateSpeechSettings}
              />
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <PushNotificationSettingsComponent
                pushSettings={pushNotificationSettings}
                deviceId={currentDeviceId}
                onUpdatePushSettings={onUpdatePushNotificationSettings}
              />

              <AccountSettings
                emailAlertSettingsMap={emailAlertSettingsMap}
                weeklyReportSettingsMap={weeklyReportSettingsMap}
                onUpdateEmailAlertSettingsMap={onUpdateEmailAlertSettingsMap}
                onUpdateWeeklyReportSettingsMap={onUpdateWeeklyReportSettingsMap}
                showOnlyNotifications={true}
              />
            </TabsContent>

            <TabsContent value="wallpapers" className="space-y-4">
              <WallpaperSettingsPanel
                wallpaperSettings={wallpaperSettings}
                deviceWallpaperSettings={deviceWallpaperSettings}
                onUpdateWallpaperSettings={onUpdateWallpaperSettings}
                onUpdateDeviceWallpaperSettings={onUpdateDeviceWallpaperSettings}
              />
            </TabsContent>

            <TabsContent value="account" className="space-y-4">
              <AccountSettings
                emailAlertSettingsMap={emailAlertSettingsMap}
                weeklyReportSettingsMap={weeklyReportSettingsMap}
                onUpdateEmailAlertSettingsMap={onUpdateEmailAlertSettingsMap}
                onUpdateWeeklyReportSettingsMap={onUpdateWeeklyReportSettingsMap}
              />
            </TabsContent>

            <TabsContent value="subscription" className="space-y-4">
              <SubscriptionSettings childrenCount={childrenList.length} />
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-fredoka font-semibold text-lg">Parent Mode PIN</h3>
                        <p className="text-sm text-muted-foreground">
                          {parentPin
                            ? 'Change your PIN to protect Parent Mode access'
                            : 'Set a PIN to protect Parent Mode access'}
                        </p>
                      </div>
                      <Button
                        onClick={() => setChangePinDialogOpen(true)}
                        variant="outline"
                        className="font-fredoka"
                      >
                        {parentPin ? 'Change PIN' : 'Set PIN'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <BiometricSettingsComponent
                settings={biometricSettings}
                onChange={onBiometricSettingsChange}
              />

              <IPRestrictions
                settings={ipRestrictions}
                currentIP={currentIP}
                accessHistory={accessHistory}
                onUpdateSettings={onUpdateIPRestrictions}
              />
            </TabsContent>

            <TabsContent value="devices" className="space-y-4">
              <DeviceSettings
                blockParentModeOnLinkedDevices={blockParentModeOnLinkedDevices}
                onBlockParentModeOnLinkedDevicesChange={onUpdateBlockParentModeOnLinkedDevices}
              />

              <DeviceManagement />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help" className="space-y-4">
          <HelpMenu />
        </TabsContent>

        {/* Getting Started Tab */}
        {!gettingStartedState.dismissed && (
          <TabsContent value="getting-started" className="space-y-4">
            <GettingStartedMenu
              state={gettingStartedState}
              onUpdateState={onUpdateGettingStartedState}
              onNavigate={(tab, subTab) => {
                setActiveTab(tab)
                if (subTab) {
                  if (tab === 'management') {
                    setManagementSubTab(subTab)
                  } else if (tab === 'settings-tab') {
                    setSettingsSubTab(subTab)
                  }
                }
              }}
            />
          </TabsContent>
        )}
      </Tabs>

      <ChangePinDialog
        open={changePinDialogOpen}
        onClose={() => setChangePinDialogOpen(false)}
        onSuccess={onChangePin}
        currentPin={parentPin}
      />

      <ChoreDialog
        open={choreDialogOpen}
        onOpenChange={(open) => {
          setChoreDialogOpen(open)
          if (!open) setEditingChore(undefined)
        }}
        onSave={handleSaveChore}
        editChore={editingChore}
        childrenList={childrenList}
        assignments={assignments}
        onAssignChild={onAssignChore}
        onUnassignChild={onUnassignChore}
        categories={categories}
        canAddChore={limits?.canAddChore ?? true}
      />

      <ChildDialog
        open={childDialogOpen}
        onOpenChange={(open) => {
          setChildDialogOpen(open)
          if (!open) setEditingChild(undefined)
        }}
        onSave={handleSaveChild}
        editChild={editingChild}
      />

      <AlertDialog open={deleteChoreId !== null} onOpenChange={() => setDeleteChoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chore</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chore? This will also remove all assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteChoreId) onDeleteChore(deleteChoreId)
                setDeleteChoreId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteChildId !== null} onOpenChange={() => setDeleteChildId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Child</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this child? This will remove the child immediately,
              including all history. Your subscription fee will be reduced at the end of the
              current billing cycle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteChildId) onDeleteChild(deleteChildId)
                setDeleteChildId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteRewardId !== null} onOpenChange={() => setDeleteRewardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reward</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reward? Past purchases will remain in history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteRewardId) onDeleteReward(deleteRewardId)
                setDeleteRewardId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
