import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  TrendUp, 
  TrendDown, 
  Calendar,
  Clock,
  Star,
  Gift,
  Sparkle,
  ArrowsClockwise,
} from '@phosphor-icons/react'
import { 
  ChoreCompletion, 
  Child, 
  Chore, 
  Category, 
  ChoreAssignment,
  CategoryBonusCompletion,
  RewardPurchase,
  Reward,
  PointSwap,
} from '@/lib/types'
import { 
  isCompletionApproved, 
  getChoreCategoryPointsForChild,
  getExpiryStartTime,
  formatDate,
} from '@/lib/helpers'

interface PointsHistoryViewProps {
  child: Child
  chores: Chore[]
  completions: ChoreCompletion[]
  categories: Category[]
  assignments: ChoreAssignment[]
  bonusCompletions: CategoryBonusCompletion[]
  purchases: RewardPurchase[]
  rewards: Reward[]
  swaps: PointSwap[]
  onBack: () => void
}

type HistoryEventType = 'earned' | 'expired' | 'spent' | 'bonus' | 'swap-in' | 'swap-out'

interface PointsHistoryEvent {
  id: string
  type: HistoryEventType
  categoryId: string
  points: number
  timestamp: number
  description: string
  choreId?: string
  rewardId?: string
  swapId?: string
}

export function PointsHistoryView({
  child,
  chores,
  completions,
  categories,
  assignments,
  bonusCompletions,
  purchases,
  rewards,
  swaps,
  onBack,
}: PointsHistoryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  const choresMap = useMemo(() => {
    return new Map(chores.map((c) => [c.id, c]))
  }, [chores])

  const rewardsMap = useMemo(() => {
    return new Map(rewards.map((r) => [r.id, r]))
  }, [rewards])

  const historyEvents = useMemo((): PointsHistoryEvent[] => {
    const events: PointsHistoryEvent[] = []

    completions
      .filter((c) => c.childId === child.id && isCompletionApproved(c))
      .forEach((completion) => {
        const chore = choresMap.get(completion.choreId)
        if (!chore) return

        chore.categoryIds.forEach((categoryId) => {
          const assignment = assignments.find(
            (a) => a.childId === child.id && a.choreId === completion.choreId
          )
          const points = getChoreCategoryPointsForChild(chore, assignment, child.id, categoryId)
          
          if (points > 0) {
            events.push({
              id: `earned_${completion.id}_${categoryId}`,
              type: 'earned',
              categoryId,
              points,
              timestamp: completion.completedAt,
              description: chore.name,
              choreId: chore.id,
            })
          }
        })
      })

    bonusCompletions
      .filter((bc) => bc.childId === child.id)
      .forEach((bonus) => {
        events.push({
          id: `bonus_${bonus.id}`,
          type: 'bonus',
          categoryId: bonus.targetCategoryId,
          points: bonus.bonusPoints,
          timestamp: bonus.completedAt,
          description: `${categories.find((c) => c.id === bonus.categoryId)?.name || 'Category'} completion bonus`,
        })
      })

    purchases
      .filter((p) => p.childId === child.id)
      .forEach((purchase) => {
        const reward = rewardsMap.get(purchase.rewardId)
        if (!reward) return

        reward.categoryIds.forEach((categoryId) => {
          const override = reward.costOverrides?.find((o) => o.childId === child.id)
          const cost = override ? override.cost : reward.cost

          events.push({
            id: `spent_${purchase.id}_${categoryId}`,
            type: 'spent',
            categoryId,
            points: cost,
            timestamp: purchase.purchasedAt,
            description: reward.name,
            rewardId: reward.id,
          })
        })
      })

    swaps
      .filter((s) => s.childId === child.id)
      .forEach((swap) => {
        events.push({
          id: `swap_out_${swap.id}`,
          type: 'swap-out',
          categoryId: swap.fromCategoryId,
          points: swap.fromAmount,
          timestamp: swap.swappedAt,
          description: `Swapped to ${categories.find((c) => c.id === swap.toCategoryId)?.name || 'category'}`,
          swapId: swap.id,
        })

        events.push({
          id: `swap_in_${swap.id}`,
          type: 'swap-in',
          categoryId: swap.toCategoryId,
          points: swap.toAmount,
          timestamp: swap.swappedAt,
          description: `Swapped from ${categories.find((c) => c.id === swap.fromCategoryId)?.name || 'category'}`,
          swapId: swap.id,
        })
      })

    categories.forEach((category) => {
      if (!category.pointsExpiry || !category.pointsExpiry.enabled || category.pointsExpiry.interval === 'never') {
        return
      }

      const expiryStartTime = getExpiryStartTime(category.pointsExpiry.interval)

      completions
        .filter((c) => c.childId === child.id && isCompletionApproved(c) && c.completedAt < expiryStartTime)
        .forEach((completion) => {
          const chore = choresMap.get(completion.choreId)
          if (!chore || !chore.categoryIds.includes(category.id)) return

          const assignment = assignments.find(
            (a) => a.childId === child.id && a.choreId === completion.choreId
          )
          const points = getChoreCategoryPointsForChild(chore, assignment, child.id, category.id)

          if (points > 0) {
            events.push({
              id: `expired_${completion.id}_${category.id}`,
              type: 'expired',
              categoryId: category.id,
              points,
              timestamp: expiryStartTime,
              description: `${chore.name} (earned ${formatDate(completion.completedAt)})`,
              choreId: chore.id,
            })
          }
        })

      bonusCompletions
        .filter((bc) => bc.childId === child.id && bc.targetCategoryId === category.id && bc.completedAt < expiryStartTime)
        .forEach((bonus) => {
          events.push({
            id: `expired_bonus_${bonus.id}`,
            type: 'expired',
            categoryId: bonus.targetCategoryId,
            points: bonus.bonusPoints,
            timestamp: expiryStartTime,
            description: `${categories.find((c) => c.id === bonus.categoryId)?.name || 'Category'} bonus (earned ${formatDate(bonus.completedAt)})`,
          })
        })
    })

    return events.sort((a, b) => b.timestamp - a.timestamp)
  }, [child.id, completions, choresMap, assignments, bonusCompletions, purchases, rewardsMap, swaps, categories])

  const filteredEvents = useMemo(() => {
    let filtered = historyEvents

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((e) => e.categoryId === selectedCategory)
    }

    if (timeFilter !== 'all') {
      const now = Date.now()
      let cutoffTime = 0

      switch (timeFilter) {
        case 'today': {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          cutoffTime = today.getTime()
          break
        }
        case 'week': {
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          weekAgo.setHours(0, 0, 0, 0)
          cutoffTime = weekAgo.getTime()
          break
        }
        case 'month': {
          const monthAgo = new Date()
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          monthAgo.setHours(0, 0, 0, 0)
          cutoffTime = monthAgo.getTime()
          break
        }
      }

      filtered = filtered.filter((e) => e.timestamp >= cutoffTime)
    }

    return filtered
  }, [historyEvents, selectedCategory, timeFilter])

  const categorySummaries = useMemo(() => {
    const summaries = new Map<string, { 
      earned: number
      expired: number
      spent: number
      net: number
      category: Category
    }>()

    categories.forEach((category) => {
      const categoryEvents = filteredEvents.filter((e) => e.categoryId === category.id)
      
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
  }, [categories, filteredEvents])

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

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date >= today) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } else if (date >= yesterday) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-accent/5 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Points History</h1>
            <p className="text-muted-foreground">{child.name}'s activity</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={timeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFilter('all')}
          >
            All Time
          </Button>
          <Button
            variant={timeFilter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFilter('today')}
          >
            Today
          </Button>
          <Button
            variant={timeFilter === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFilter('week')}
          >
            This Week
          </Button>
          <Button
            variant={timeFilter === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFilter('month')}
          >
            This Month
          </Button>
        </div>

        <div className="grid gap-4 mb-6">
          {Array.from(categorySummaries.values()).map((summary) => (
            <Card
              key={summary.category.id}
              className="cursor-pointer transition-all hover:shadow-lg"
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Activity Timeline</CardTitle>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No activity found for this period</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((event) => {
                    const category = categories.find((c) => c.id === event.categoryId)
                    if (!category) return null

                    return (
                      <div key={event.id} className="flex items-start gap-4">
                        <div
                          className={`rounded-full p-2 ${getEventColor(event.type)} bg-secondary`}
                        >
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
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
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
