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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Plus, Package, Check, Sparkle, Users, ListChecks, Gift, X, Gear, ClockCounterClockwise, Warning, ClipboardText, Shield, Envelope, FileText, SpeakerHigh, Bell, House, Pulse, FolderUser, Devices, RocketLaunch } from '@phosphor-icons/react'
import { Child, Chore, ChoreAssignment, Reward, RewardPurchase, ChoreCompletion, ChoreHistoryEvent, MissedChore, CelebrationSettings, Category, DayOfWeek, RepeatPattern, BiometricSettings, IPRestrictionSettings, IPAccessAttempt, WeeklyReportSettings, CategoryBonusCompletion, ReportTemplate, WeatherSettings, PointSwap, EmailAlertSettings, WeatherData, SpeechSettings, PushNotificationSettings, SchoolHoliday, SchoolHolidayCountdownSettings, ChildAvailabilityEntry, EmailAlertSettingsMap, WeeklyReportSettingsMap, GettingStartedState } from '@/lib/types'
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
import { choreTemplates, ChoreTemplate } from '@/lib/choreTemplates'
import { ChoreCard } from './ChoreCard'
import { ChildCard } from './ChildCard'
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
import { LegacyDataMigration } from './LegacyDataMigration'
import { GettingStartedMenu } from './GettingStartedMenu'
import { DeviceSettings } from './DeviceSettings'
import { generateICSFeed, downloadICSFile } from '@/lib/icsHelper'
import { isChoreActive, isChoreActiveToday, isChildAvailableForTimeOfDay } from '@/lib/helpers'
import { toast } from 'sonner'

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
  onUpdatePushNotificationSettings: (settings: PushNotificationSettings) => void
  onUpdateSpeechSettings: (settings: SpeechSettings) => void
  onUpdateHideChildrenWithNoActivity: (value: boolean) => void
  onUpdateBlockParentModeOnLinkedDevices: (value: boolean) => void
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
  onAddReportTemplate,
  onEditReportTemplate,
  onDeleteReportTemplate,
  schoolHolidays,
  childAvailability,
  schoolHolidayCountdownSettings,
  gettingStartedState,
  onAddSchoolHoliday,
  onEditSchoolHoliday,
  onDeleteSchoolHoliday,
  onUpdateSchoolHolidayCountdownSettings,
  onUpdateGettingStartedState,
  onSendDigestNow,
  onExitParentMode,
}: ParentPanelProps) {
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

  // State for welcome card order - save order immediately when changed
  const [welcomeCardOrder, setWelcomeCardOrder] = useApiKV<string[]>(
    'welcomeCardOrder',
    ['children', 'chores', 'approvals', 'missed', 'rewards', 'purchases']
  )

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
      const oldIndex = welcomeCardOrder.indexOf(active.id as string)
      const newIndex = welcomeCardOrder.indexOf(over.id as string)
      
      const newOrder = arrayMove(welcomeCardOrder, oldIndex, newIndex)
      // Save order immediately using useApiKV
      setWelcomeCardOrder(newOrder)
    }
  }

  const popularTemplates = choreTemplates.slice(0, 6)

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
  }, [childrenList, chores, assignments, rewards, parentPin, gettingStartedState, onUpdateGettingStartedState])
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
    return welcomeCardOrder.map((cardId) => ({
      id: cardId,
      ...cardDefinitions[cardId],
    }))
  }, [childrenList, chores, pendingApprovalsCount, missedChoresCount, rewards, purchases, welcomeCardOrder])

  const handleQuickAddTemplate = (template: ChoreTemplate) => {
    const firstCategoryId = categories[0]?.id
    const choreData: Omit<Chore, 'id' | 'createdAt'> = {
      name: template.name,
      description: template.description,
      points: template.points,
      frequency: template.frequency,
      timeOfDay: template.timeOfDay,
      completionType: 'individual',
      categoryIds: firstCategoryId ? [firstCategoryId] : [],
    }
    onAddChore(choreData)
  }

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
          {!gettingStartedState.dismissed && (
            <TabsTrigger value="getting-started">
              <RocketLaunch className="h-4 w-4 mr-2" />
              Getting Started
            </TabsTrigger>
          )}
        </TabsList>

        {/* Welcome Tab */}
        <TabsContent value="welcome" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-fredoka font-bold">Welcome to ChoreQuest</h2>
              <p className="text-sm text-muted-foreground">
                Your family's chore management dashboard
              </p>
            </div>
          </div>

          <LegacyDataMigration />

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
              items={welcomeCardOrder}
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
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-fredoka font-bold">Activities</h2>
              <p className="text-sm text-muted-foreground">
                View and manage family chore activities
              </p>
            </div>
          </div>

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
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-fredoka font-bold">Pending Approvals</h2>
                  <p className="text-sm text-muted-foreground">
                    Review and approve chore completions that require verification
                  </p>
                </div>
                {pendingApprovalsCount > 0 && (
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {pendingApprovalsCount} pending
                  </Badge>
                )}
              </div>

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
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-fredoka font-bold">Missed Chores</h2>
                  <p className="text-sm text-muted-foreground">
                    Override missed chores by awarding points or dismissing them
                  </p>
                </div>
                {missedChoresCount > 0 && (
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {missedChoresCount} missed
                  </Badge>
                )}
              </div>

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
                onUndoCompletion={onUndoCompletion}
                onUndoDismissMissed={onUndoDismissMissed}
              />
            </TabsContent>

            <TabsContent value="purchases" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-fredoka font-bold">Purchase History</h2>
                {purchases.filter((p) => !p.fulfilled).length > 0 && (
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {purchases.filter((p) => !p.fulfilled).length} pending
                  </Badge>
                )}
              </div>

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
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-fredoka font-bold">Management</h2>
              <p className="text-sm text-muted-foreground">
                Manage children, chores, categories, and rewards
              </p>
            </div>
          </div>

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
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-fredoka font-bold">Children</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Manage Chores" on any child to assign chores
              </p>
            </div>
            <Button onClick={() => setChildDialogOpen(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Add Child
            </Button>
          </div>

          {childrenList.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-lg text-muted-foreground mb-4">
                  No children added yet. Add your first child to get started!
                </p>
                <Button onClick={() => setChildDialogOpen(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Your First Child
                </Button>
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
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-fredoka font-bold">Chores Library</h2>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        <Sparkle className="h-5 w-5 mr-2" />
                        Quick Add
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-fredoka font-semibold mb-1">Popular Templates</h4>
                          <p className="text-xs text-muted-foreground">
                            Click to instantly add a chore
                          </p>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {popularTemplates.map((template, index) => (
                            <Card
                              key={index}
                              className="cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => handleQuickAddTemplate(template)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{template.icon}</span>
                                  <span className="font-medium text-sm">{template.name}</span>
                                </div>
                                <div className="flex gap-1">
                                  <Badge variant="secondary" className="text-xs h-5">
                                    {template.points} pts
                                  </Badge>
                                  <Badge variant="outline" className="text-xs h-5">
                                    {template.frequency}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => setChoreDialogOpen(true)}
                        >
                          Browse All Templates
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button onClick={() => setChoreDialogOpen(true)}>
                    <Plus className="h-5 w-5 mr-2" />
                    Add Chore
                  </Button>
                </div>
              </div>

              {chores.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-lg text-muted-foreground mb-4">
                      No chores created yet. Create your first chore to assign to children!
                    </p>
                    <Button onClick={() => setChoreDialogOpen(true)}>
                      <Plus className="h-5 w-5 mr-2" />
                      Create Your First Chore
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {chores.map((chore) => (
                    <ChoreCard
                      key={chore.id}
                      chore={chore}
                      categories={categories}
                      onEdit={handleEditChore}
                      onDelete={setDeleteChoreId}
                    />
                  ))}
                </div>
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
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-fredoka font-bold">Rewards Shop</h2>
                <RewardDialog onSave={onAddReward} childrenList={childrenList} chores={chores} categories={categories} />
              </div>

              {rewards.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-lg text-muted-foreground mb-4">
                      No rewards created yet. Add rewards for children to redeem with their points!
                    </p>
                    <RewardDialog onSave={onAddReward} childrenList={childrenList} chores={chores} categories={categories} />
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
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-fredoka font-bold">Settings</h2>
              <p className="text-sm text-muted-foreground">
                Manage security and app preferences
              </p>
            </div>
          </div>

          <Tabs value={settingsSubTab} onValueChange={setSettingsSubTab} className="space-y-4">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="account">
                <FolderUser className="h-4 w-4 mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Gear className="h-4 w-4 mr-2" />
                Settings
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

              <DisplayPreferencesSettings
                hideChildrenWithNoActivity={hideChildrenWithNoActivity}
                onHideChildrenWithNoActivityChange={onUpdateHideChildrenWithNoActivity}
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

            <TabsContent value="account" className="space-y-4">
              <AccountSettings
                emailAlertSettingsMap={emailAlertSettingsMap}
                weeklyReportSettingsMap={weeklyReportSettingsMap}
                onUpdateEmailAlertSettingsMap={onUpdateEmailAlertSettingsMap}
                onUpdateWeeklyReportSettingsMap={onUpdateWeeklyReportSettingsMap}
                onResetGettingStarted={() => {
                  onUpdateGettingStartedState({
                    ...gettingStartedState,
                    dismissed: false,
                  })
                }}
              />
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

        {/* Getting Started Tab */}
        {!gettingStartedState.dismissed && (
          <TabsContent value="getting-started" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-fredoka font-bold">Getting Started</h2>
                <p className="text-sm text-muted-foreground">
                  Set up your ChoreQuest account
                </p>
              </div>
            </div>

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
              Are you sure you want to delete this child? This will remove all their assignments
              and completion history.
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
