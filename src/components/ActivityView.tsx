import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  CheckCircle,
  ArrowCounterClockwise,
  Warning,
  MagnifyingGlass,
  Star,
  Gift,
  Sparkle,
  Clock,
  ArrowsClockwise,
  TrendUp,
  TrendDown,
  Calendar,
  XCircle,
  ClockCounterClockwise,
} from '@phosphor-icons/react'
import { 
  Child, 
  Chore, 
  ChoreCompletion,
  Category,
  ChoreAssignment,
  CategoryBonusCompletion,
  RewardPurchase,
  Reward,
  PointSwap,
  ChoreHistoryEvent,
} from '@/lib/types'
import { 
  isCompletionApproved, 
  getChoreCategoryPointsForChild,
  getExpiryStartTime,
  formatDate as formatDateHelper,
} from '@/lib/helpers'
import { format, isToday, isYesterday, startOfMonth } from 'date-fns'

interface ActivityViewProps {
  completions: ChoreCompletion[]
  childrenList: Child[]
  chores: Chore[]
  categories: Category[]
  assignments: ChoreAssignment[]
  bonusCompletions: CategoryBonusCompletion[]
  purchases: RewardPurchase[]
  rewards: Reward[]
  swaps: PointSwap[]
  history: ChoreHistoryEvent[]
  onUndoCompletion: (completionId: string) => void
}

type HistoryEventType = 'earned' | 'expired' | 'spent' | 'bonus' | 'swap-in' | 'swap-out'

interface PointsHistoryEvent {
  id: string
  type: HistoryEventType
  categoryId: string
  points: number
  timestamp: number
  description: string
  childId: string
  choreId?: string
  rewardId?: string
  swapId?: string
}

export function ActivityView({
  completions,
  childrenList,
  chores,
  categories,
  assignments,
  bonusCompletions,
  purchases,
  rewards,
  swaps,
  history,
  onUndoCompletion,
}: ActivityViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [selectedChore, setSelectedChore] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [undoConfirmId, setUndoConfirmId] = useState<string | null>(null)

  const choresMap = useMemo(() => {
    return new Map(chores.map((c) => [c.id, c]))
  }, [chores])

  const rewardsMap = useMemo(() => {
    return new Map(rewards.map((r) => [r.id, r]))
  }, [rewards])

  const pointsHistoryEvents = useMemo((): PointsHistoryEvent[] => {
    const events: PointsHistoryEvent[] = []

    completions
      .filter((c) => isCompletionApproved(c))
      .forEach((completion) => {
        const chore = choresMap.get(completion.choreId)
        if (!chore) return

        chore.categoryIds.forEach((categoryId) => {
          const assignment = assignments.find(
            (a) => a.childId === completion.childId && a.choreId === completion.choreId
          )
          const points = getChoreCategoryPointsForChild(chore, assignment, completion.childId, categoryId)
          
          if (points > 0) {
            events.push({
              id: `earned_${completion.id}_${categoryId}`,
              type: 'earned',
              categoryId,
              points,
              timestamp: completion.completedAt,
              description: chore.name,
              childId: completion.childId,
              choreId: chore.id,
            })
          }
        })
      })

    bonusCompletions.forEach((bonus) => {
      events.push({
        id: `bonus_${bonus.id}`,
        type: 'bonus',
        categoryId: bonus.targetCategoryId,
        points: bonus.bonusPoints,
        timestamp: bonus.completedAt,
        description: `${categories.find((c) => c.id === bonus.categoryId)?.name || 'Category'} completion bonus`,
        childId: bonus.childId,
      })
    })

    purchases.forEach((purchase) => {
      const reward = rewardsMap.get(purchase.rewardId)
      if (!reward) return

      reward.categoryIds.forEach((categoryId) => {
        const override = reward.costOverrides?.find((o) => o.childId === purchase.childId)
        const cost = override ? override.cost : reward.cost

        events.push({
          id: `spent_${purchase.id}_${categoryId}`,
          type: 'spent',
          categoryId,
          points: cost,
          timestamp: purchase.purchasedAt,
          description: reward.name,
          childId: purchase.childId,
          rewardId: reward.id,
        })
      })
    })

    swaps.forEach((swap) => {
      events.push({
        id: `swap_out_${swap.id}`,
        type: 'swap-out',
        categoryId: swap.fromCategoryId,
        points: swap.fromAmount,
        timestamp: swap.swappedAt,
        description: `Swapped to ${categories.find((c) => c.id === swap.toCategoryId)?.name || 'category'}`,
        childId: swap.childId,
        swapId: swap.id,
      })

      events.push({
        id: `swap_in_${swap.id}`,
        type: 'swap-in',
        categoryId: swap.toCategoryId,
        points: swap.toAmount,
        timestamp: swap.swappedAt,
        description: `Swapped from ${categories.find((c) => c.id === swap.fromCategoryId)?.name || 'category'}`,
        childId: swap.childId,
        swapId: swap.id,
      })
    })

    categories.forEach((category) => {
      if (!category.pointsExpiry || !category.pointsExpiry.enabled || category.pointsExpiry.interval === 'never') {
        return
      }

      const expiryStartTime = getExpiryStartTime(category.pointsExpiry.interval)

      completions
        .filter((c) => isCompletionApproved(c) && c.completedAt < expiryStartTime)
        .forEach((completion) => {
          const chore = choresMap.get(completion.choreId)
          if (!chore || !chore.categoryIds.includes(category.id)) return

          const assignment = assignments.find(
            (a) => a.childId === completion.childId && a.choreId === completion.choreId
          )
          const points = getChoreCategoryPointsForChild(chore, assignment, completion.childId, category.id)

          if (points > 0) {
            events.push({
              id: `expired_${completion.id}_${category.id}`,
              type: 'expired',
              categoryId: category.id,
              points,
              timestamp: expiryStartTime,
              description: `${chore.name} (earned ${formatDateHelper(completion.completedAt)})`,
              childId: completion.childId,
              choreId: chore.id,
            })
          }
        })

      bonusCompletions
        .filter((bc) => bc.targetCategoryId === category.id && bc.completedAt < expiryStartTime)
        .forEach((bonus) => {
          events.push({
            id: `expired_bonus_${bonus.id}`,
            type: 'expired',
            categoryId: bonus.targetCategoryId,
            points: bonus.bonusPoints,
            timestamp: expiryStartTime,
            description: `${categories.find((c) => c.id === bonus.categoryId)?.name || 'Category'} bonus (earned ${formatDateHelper(bonus.completedAt)})`,
            childId: bonus.childId,
          })
        })
    })

    return events.sort((a, b) => b.timestamp - a.timestamp)
  }, [completions, choresMap, assignments, bonusCompletions, purchases, rewardsMap, swaps, categories])

  const filteredCompletions = useMemo(() => {
    let filtered = [...completions]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((completion) => {
        const child = childrenList.find((c) => c.id === completion.childId)
        const chore = chores.find((c) => c.id === completion.choreId)
        return (
          child?.name.toLowerCase().includes(query) ||
          chore?.name.toLowerCase().includes(query)
        )
      })
    }

    if (selectedChild !== 'all') {
      filtered = filtered.filter((c) => c.childId === selectedChild)
    }

    if (selectedChore !== 'all') {
      filtered = filtered.filter((c) => c.choreId === selectedChore)
    }

    if (dateFilter !== 'all') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTimestamp = today.getTime()

      filtered = filtered.filter((completion) => {
        switch (dateFilter) {
          case 'today':
            return completion.completedAt >= todayTimestamp
          case 'week': {
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            weekAgo.setHours(0, 0, 0, 0)
            return completion.completedAt >= weekAgo.getTime()
          }
          case 'month':
            return completion.completedAt >= startOfMonth(today).getTime()
          default:
            return true
        }
      })
    }

    return filtered.sort((a, b) => b.completedAt - a.completedAt)
  }, [completions, searchQuery, selectedChild, selectedChore, dateFilter, childrenList, chores])

  const filteredPointsEvents = useMemo(() => {
    let filtered = pointsHistoryEvents

    if (selectedChild !== 'all') {
      filtered = filtered.filter((e) => e.childId === selectedChild)
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((e) => e.categoryId === selectedCategory)
    }

    if (dateFilter !== 'all') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      let cutoffTime = 0

      switch (dateFilter) {
        case 'today':
          cutoffTime = today.getTime()
          break
        case 'week': {
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          weekAgo.setHours(0, 0, 0, 0)
          cutoffTime = weekAgo.getTime()
          break
        }
        case 'month':
          cutoffTime = startOfMonth(today).getTime()
          break
      }

      filtered = filtered.filter((e) => e.timestamp >= cutoffTime)
    }

    return filtered
  }, [pointsHistoryEvents, selectedChild, selectedCategory, dateFilter])

  const filteredActivityHistory = useMemo(() => {
    let filtered = [...history]

    if (selectedChild !== 'all') {
      filtered = filtered.filter((e) => e.childId === selectedChild)
    }

    if (selectedChore !== 'all') {
      filtered = filtered.filter((e) => e.choreId === selectedChore)
    }

    if (dateFilter !== 'all') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      let cutoffTime = 0

      switch (dateFilter) {
        case 'today':
          cutoffTime = today.getTime()
          break
        case 'week': {
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          weekAgo.setHours(0, 0, 0, 0)
          cutoffTime = weekAgo.getTime()
          break
        }
        case 'month':
          cutoffTime = startOfMonth(today).getTime()
          break
      }

      filtered = filtered.filter((e) => e.timestamp >= cutoffTime)
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp)
  }, [history, selectedChild, selectedChore, dateFilter])

  const categorySummaries = useMemo(() => {
    const summaries = new Map<string, { 
      earned: number
      expired: number
      spent: number
      net: number
      category: Category
    }>()

    categories.forEach((category) => {
      const categoryEvents = filteredPointsEvents.filter((e) => e.categoryId === category.id)
      
      const earned = categoryEvents
        .filter((e) => e.type === 'earned' || e.type === 'bonus' || e.type === 'swap-in')
        .reduce((sum, e) => sum + e.points, 0)
      
      const expired = categoryEvents
        .filter((e) => e.type === 'expired')
        .reduce((sum, e) => sum + e.points, 0)
      
      const spent = categoryEvents
        .filter((e) => e.type === 'spent' || e.type === 'swap-out')
        .reduce((sum, e) => sum + e.points, 0)

      summaries.set(category.id, {
        earned,
        expired,
        spent,
        net: earned - expired - spent,
        category,
      })
    })

    return summaries
  }, [categories, filteredPointsEvents])

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`
    } else {
      return format(date, 'MMM d, yyyy \'at\' h:mm a')
    }
  }

  const getChildName = (childId: string) => {
    return childrenList.find((c) => c.id === childId)?.name || 'Unknown'
  }

  const getChoreName = (choreId: string) => {
    return chores.find((c) => c.id === choreId)?.name || 'Unknown Chore'
  }

  const handleUndoClick = (completionId: string) => {
    setUndoConfirmId(completionId)
  }

  const handleConfirmUndo = () => {
    if (undoConfirmId) {
      onUndoCompletion(undoConfirmId)
      setUndoConfirmId(null)
    }
  }

  const getApprovalStatusBadge = (completion: ChoreCompletion) => {
    if (!completion.approvalStatus || completion.approvalStatus === 'approved') {
      return null
    }

    if (completion.approvalStatus === 'pending') {
      return (
        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
          Pending Approval
        </Badge>
      )
    }

    if (completion.approvalStatus === 'rejected') {
      return (
        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
          Rejected
        </Badge>
      )
    }

    return null
  }

  const getEventIcon = (type: HistoryEventType) => {
    switch (type) {
      case 'earned':
        return <Star weight="fill" className="h-4 w-4" />
      case 'bonus':
        return <Sparkle weight="fill" className="h-4 w-4" />
      case 'spent':
        return <Gift weight="fill" className="h-4 w-4" />
      case 'expired':
        return <Clock weight="fill" className="h-4 w-4" />
      case 'swap-in':
      case 'swap-out':
        return <ArrowsClockwise weight="fill" className="h-4 w-4" />
    }
  }

  const getEventColor = (type: HistoryEventType) => {
    switch (type) {
      case 'earned':
        return 'text-primary'
      case 'bonus':
        return 'text-accent'
      case 'spent':
        return 'text-muted-foreground'
      case 'expired':
        return 'text-destructive'
      case 'swap-in':
        return 'text-primary'
      case 'swap-out':
        return 'text-muted-foreground'
    }
  }

  const getEventLabel = (type: HistoryEventType) => {
    switch (type) {
      case 'earned':
        return 'Earned'
      case 'bonus':
        return 'Bonus'
      case 'spent':
        return 'Spent'
      case 'expired':
        return 'Expired'
      case 'swap-in':
        return 'Swapped In'
      case 'swap-out':
        return 'Swapped Out'
    }
  }

  const totalCompletions = filteredCompletions.length
  const approvedCount = filteredCompletions.filter(
    (c) => !c.approvalStatus || c.approvalStatus === 'approved'
  ).length
  const pendingCount = filteredCompletions.filter(
    (c) => c.approvalStatus === 'pending'
  ).length
  const rejectedCount = filteredCompletions.filter(
    (c) => c.approvalStatus === 'rejected'
  ).length

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-fredoka">Activity & History</CardTitle>
          <p className="text-sm text-muted-foreground">
            View all chore completions, points activity, and history
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger>
                <SelectValue placeholder="All Children" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Children</SelectItem>
                {childrenList.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedChore} onValueChange={setSelectedChore}>
              <SelectTrigger>
                <SelectValue placeholder="All Chores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chores</SelectItem>
                {chores.map((chore) => (
                  <SelectItem key={chore.id} value={chore.id}>
                    {chore.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="completions" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="completions">
                <CheckCircle className="h-4 w-4 mr-2" />
                Completions
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {totalCompletions}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="points">
                <Star className="h-4 w-4 mr-2" />
                Points Activity
              </TabsTrigger>
              <TabsTrigger value="history">
                <ClockCounterClockwise className="h-4 w-4 mr-2" />
                Action History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="completions" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="text-sm">
                  {totalCompletions} Total
                </Badge>
                <Badge variant="default" className="text-sm bg-green-600">
                  {approvedCount} Approved
                </Badge>
                {pendingCount > 0 && (
                  <Badge variant="outline" className="text-sm bg-yellow-50 text-yellow-700 border-yellow-200">
                    {pendingCount} Pending
                  </Badge>
                )}
                {rejectedCount > 0 && (
                  <Badge variant="outline" className="text-sm bg-red-50 text-red-700 border-red-200">
                    {rejectedCount} Rejected
                  </Badge>
                )}
              </div>

              {filteredCompletions.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">
                    {completions.length === 0
                      ? 'No completions yet. Chores will appear here as they are completed.'
                      : 'No completions match your filters.'}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {filteredCompletions.map((completion) => {
                      const child = childrenList.find((c) => c.id === completion.childId)
                      const chore = chores.find((c) => c.id === completion.choreId)

                      return (
                        <div
                          key={completion.id}
                          className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="mt-0.5">
                            {completion.overridden ? (
                              <Warning className="h-5 w-5 text-primary" weight="fill" />
                            ) : (
                              <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium">{getChildName(completion.childId)}</span>
                              <span className="text-muted-foreground">completed</span>
                              <span className="font-medium">{getChoreName(completion.choreId)}</span>
                              {completion.timeOfDay && (
                                <Badge variant="secondary" className="text-xs">
                                  {completion.timeOfDay.toUpperCase()}
                                </Badge>
                              )}
                              {completion.overridden && (
                                <Badge variant="outline" className="text-xs">
                                  Parent Override
                                </Badge>
                              )}
                              {getApprovalStatusBadge(completion)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatTimestamp(completion.completedAt)}
                            </div>
                            {completion.rejectedReason && (
                              <div className="text-sm text-red-600 mt-1">
                                Reason: {completion.rejectedReason}
                              </div>
                            )}
                            {completion.approvalStatus === 'approved' && completion.approvedAt && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Approved {formatTimestamp(completion.approvedAt)}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {child && (
                              <div
                                className="w-8 h-8 rounded-full flex-shrink-0"
                                style={{ backgroundColor: child.avatarColor }}
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUndoClick(completion.id)}
                              className="flex-shrink-0"
                            >
                              <ArrowCounterClockwise className="h-4 w-4 mr-2" />
                              Undo
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="points" className="space-y-4">
              {Array.from(categorySummaries.values()).filter(s => s.earned > 0 || s.spent > 0 || s.expired > 0).length > 0 && (
                <div className="grid gap-4 mb-6">
                  {Array.from(categorySummaries.values())
                    .filter(s => s.earned > 0 || s.spent > 0 || s.expired > 0)
                    .map((summary) => (
                      <Card
                        key={summary.category.id}
                        className="transition-all hover:shadow-lg"
                        style={{
                          borderLeft: `4px solid ${summary.category.color}`,
                        }}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between">
                            <span className="text-lg">{summary.category.name}</span>
                            <div className="flex items-center gap-2">
                              {summary.category.pointsExpiry?.enabled && summary.category.pointsExpiry.interval !== 'never' && (
                                <Badge variant="outline" className="text-xs">
                                  Expires {summary.category.pointsExpiry.interval}
                                </Badge>
                              )}
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                                <TrendUp className="h-4 w-4" />
                                <span className="text-2xl font-bold">{summary.earned}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Earned</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 text-destructive mb-1">
                                <TrendDown className="h-4 w-4" />
                                <span className="text-2xl font-bold">{summary.expired + summary.spent}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Lost</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 text-accent mb-1">
                                <Star weight="fill" className="h-4 w-4" />
                                <span className="text-2xl font-bold">{summary.net}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Net</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}

              {filteredPointsEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No points activity found for this period</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {filteredPointsEvents.map((event) => {
                      const category = categories.find((c) => c.id === event.categoryId)
                      const child = childrenList.find((c) => c.id === event.childId)
                      if (!category) return null

                      return (
                        <div key={event.id} className="flex items-start gap-4">
                          <div
                            className={`rounded-full p-2 ${getEventColor(event.type)} bg-secondary`}
                          >
                            {getEventIcon(event.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium">{child?.name || 'Unknown'}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-medium">{event.description}</span>
                              <Badge
                                variant="secondary"
                                className="text-xs"
                                style={{
                                  backgroundColor: `${category.color}20`,
                                  color: category.color,
                                }}
                              >
                                {category.name}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{formatTimestamp(event.timestamp)}</span>
                              <span>•</span>
                              <span>{getEventLabel(event.type)}</span>
                            </div>
                          </div>
                          <div className={`text-lg font-bold ${getEventColor(event.type)}`}>
                            {event.type === 'spent' || event.type === 'expired' || event.type === 'swap-out' ? '-' : '+'}
                            {event.points}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {filteredActivityHistory.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">
                    {history.length === 0
                      ? 'No history yet. Activity will appear here as chores are completed and undone.'
                      : 'No activity matches your filters.'}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {filteredActivityHistory.map((event) => {
                      const child = childrenList.find((c) => c.id === event.childId)
                      const chore = chores.find((c) => c.id === event.choreId)

                      return (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="mt-0.5">
                            {event.type === 'complete' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
                            ) : event.type === 'undo' ? (
                              <ArrowCounterClockwise className="h-5 w-5 text-orange-600" weight="fill" />
                            ) : event.type === 'override-complete' ? (
                              <Warning className="h-5 w-5 text-primary" weight="fill" />
                            ) : event.type === 'approve' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
                            ) : event.type === 'reject' ? (
                              <XCircle className="h-5 w-5 text-red-600" weight="fill" />
                            ) : (
                              <XCircle className="h-5 w-5 text-muted-foreground" weight="fill" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{getChildName(event.childId)}</span>
                              <span className="text-muted-foreground">
                                {event.type === 'complete' 
                                  ? 'completed' 
                                  : event.type === 'undo' 
                                  ? 'undid' 
                                  : event.type === 'override-complete'
                                  ? 'was awarded points for'
                                  : event.type === 'approve'
                                  ? 'had approved'
                                  : event.type === 'reject'
                                  ? 'had rejected'
                                  : 'had dismissed'}
                              </span>
                              <span className="font-medium">{getChoreName(event.choreId)}</span>
                              {event.timeOfDay && (
                                <Badge variant="secondary" className="text-xs">
                                  {event.timeOfDay.toUpperCase()}
                                </Badge>
                              )}
                              {(event.type === 'override-complete' || event.type === 'override-dismiss') && (
                                <Badge variant="outline" className="text-xs">
                                  Parent Override
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {formatTimestamp(event.timestamp)}
                            </div>
                            {event.rejectedReason && (
                              <div className="text-sm text-red-600 mt-1">
                                Reason: {event.rejectedReason}
                              </div>
                            )}
                          </div>

                          {child && (
                            <div
                              className="w-8 h-8 rounded-full flex-shrink-0"
                              style={{ backgroundColor: child.avatarColor }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={undoConfirmId !== null} onOpenChange={() => setUndoConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo Chore Completion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to undo this chore completion? This will remove the points awarded for this chore and mark it as incomplete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUndo}>
              Undo Completion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
