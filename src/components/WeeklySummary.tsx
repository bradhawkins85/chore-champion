import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  TrendUp,
  TrendDown,
  Trophy,
  CheckCircle,
  Sparkle,
  Calendar,
  Users,
} from '@phosphor-icons/react'
import { Child, Chore, ChoreCompletion, RewardPurchase } from '@/lib/types'
import { getShareableChoreCompletionCount } from '@/lib/helpers'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'

interface WeeklySummaryProps {
  childrenList: Child[]
  chores: Chore[]
  completions: ChoreCompletion[]
  purchases: RewardPurchase[]
  childPoints: Map<string, number>
}

interface DayData {
  day: string
  [key: string]: number | string
}

interface ChildStats {
  child: Child
  thisWeekCompletions: number
  lastWeekCompletions: number
  thisWeekPoints: number
  lastWeekPoints: number
  thisWeekPurchases: number
  totalPoints: number
  trend: 'up' | 'down' | 'same'
  topChore: { name: string; count: number } | null
}

export function WeeklySummary({
  childrenList,
  chores,
  completions,
  purchases,
  childPoints,
}: WeeklySummaryProps) {
  const choresMap = useMemo(() => {
    return new Map(chores.map((c) => [c.id, c]))
  }, [chores])

  const { weekStart, lastWeekStart } = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(weekStart.getDate() - 7)

    return { weekStart: weekStart.getTime(), lastWeekStart: lastWeekStart.getTime() }
  }, [])

  const childStats: ChildStats[] = useMemo(() => {
    return childrenList.map((child) => {
      const thisWeekCompletions = completions.filter(
        (c) => c.childId === child.id && c.completedAt >= weekStart
      )
      const lastWeekCompletions = completions.filter(
        (c) =>
          c.childId === child.id &&
          c.completedAt >= lastWeekStart &&
          c.completedAt < weekStart
      )

      const thisWeekPoints = thisWeekCompletions.reduce((sum, c) => {
        const chore = choresMap.get(c.choreId)
        return sum + (chore?.points || 0)
      }, 0)

      const lastWeekPoints = lastWeekCompletions.reduce((sum, c) => {
        const chore = choresMap.get(c.choreId)
        return sum + (chore?.points || 0)
      }, 0)

      const thisWeekPurchases = purchases.filter(
        (p) => p.childId === child.id && p.purchasedAt >= weekStart
      ).length

      const trend =
        thisWeekPoints > lastWeekPoints
          ? 'up'
          : thisWeekPoints < lastWeekPoints
            ? 'down'
            : 'same'

      const choreCount = new Map<string, number>()
      thisWeekCompletions.forEach((c) => {
        choreCount.set(c.choreId, (choreCount.get(c.choreId) || 0) + 1)
      })

      let topChore: { name: string; count: number } | null = null
      let maxCount = 0
      choreCount.forEach((count, choreId) => {
        if (count > maxCount) {
          maxCount = count
          const chore = choresMap.get(choreId)
          if (chore) {
            topChore = { name: chore.name, count }
          }
        }
      })

      return {
        child,
        thisWeekCompletions: thisWeekCompletions.length,
        lastWeekCompletions: lastWeekCompletions.length,
        thisWeekPoints,
        lastWeekPoints,
        thisWeekPurchases,
        totalPoints: childPoints.get(child.id) || 0,
        trend,
        topChore,
      }
    })
  }, [childrenList, completions, purchases, weekStart, lastWeekStart, choresMap, childPoints])

  const weeklyChartData: DayData[] = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const data: DayData[] = days.map((day, index) => {
      const dayStart = new Date(weekStart)
      dayStart.setDate(dayStart.getDate() + index)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const dayData: DayData = { day }

      childrenList.forEach((child) => {
        const dayCompletions = completions.filter(
          (c) =>
            c.childId === child.id &&
            c.completedAt >= dayStart.getTime() &&
            c.completedAt < dayEnd.getTime()
        )
        dayData[child.name] = dayCompletions.length
      })

      return dayData
    })
    return data
  }, [childrenList, completions, weekStart])

  const pointsChartData = useMemo(() => {
    return childrenList.map((child) => {
      const stats = childStats.find((s) => s.child.id === child.id)
      return {
        name: child.name,
        thisWeek: stats?.thisWeekPoints || 0,
        lastWeek: stats?.lastWeekPoints || 0,
        color: child.avatarColor,
      }
    })
  }, [childrenList, childStats])

  const topPerformer = useMemo(() => {
    return childStats.reduce((top, current) => {
      if (!top || current.thisWeekPoints > top.thisWeekPoints) {
        return current
      }
      return top
    }, null as ChildStats | null)
  }, [childStats])

  const totalCompletionsThisWeek = useMemo(() => {
    return childStats.reduce((sum, s) => sum + s.thisWeekCompletions, 0)
  }, [childStats])

  const totalPointsThisWeek = useMemo(() => {
    return childStats.reduce((sum, s) => sum + s.thisWeekPoints, 0)
  }, [childStats])

  const shareableChoresProgress = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return chores
      .filter((chore) => chore.completionType === 'shareable' && chore.maxCompletions)
      .map((chore) => {
        const amCount = chore.timeOfDay === 'both' || chore.timeOfDay === 'am' 
          ? getShareableChoreCompletionCount(completions, chore.id, 'am', chore.resetPeriod)
          : 0
        const pmCount = chore.timeOfDay === 'both' || chore.timeOfDay === 'pm'
          ? getShareableChoreCompletionCount(completions, chore.id, 'pm', chore.resetPeriod)
          : 0
        const anytimeCount = chore.timeOfDay === 'anytime'
          ? getShareableChoreCompletionCount(completions, chore.id, undefined, chore.resetPeriod)
          : 0

        return {
          chore,
          amCount,
          pmCount,
          anytimeCount,
          maxCompletions: chore.maxCompletions || 0,
        }
      })
      .filter((item) => item.amCount > 0 || item.pmCount > 0 || item.anytimeCount > 0)
  }, [chores, completions])

  if (childrenList.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            Add children to see weekly summary reports
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weekly Completions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-fredoka font-bold">{totalCompletionsThisWeek}</div>
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total chores completed this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Points Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-fredoka font-bold">{totalPointsThisWeek}</div>
              <Sparkle className="h-5 w-5 text-accent" weight="fill" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Total points this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {topPerformer ? (
                <>
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-fredoka font-bold"
                    style={{ backgroundColor: topPerformer.child.avatarColor }}
                  >
                    {topPerformer.child.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{topPerformer.child.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {topPerformer.thisWeekPoints} points
                    </div>
                  </div>
                  <Trophy className="h-5 w-5 text-accent" weight="fill" />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No completions yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {shareableChoresProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-fredoka flex items-center gap-2">
              <Users className="h-5 w-5" />
              Today's Shareable Chores Progress
            </CardTitle>
            <p className="text-sm text-muted-foreground">Track which children have completed shareable tasks</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shareableChoresProgress.map(({ chore, amCount, pmCount, anytimeCount, maxCompletions }) => (
                <div key={chore.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{chore.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      Max {maxCompletions} {maxCompletions === 1 ? 'child' : 'children'}
                    </Badge>
                  </div>
                  {chore.timeOfDay === 'anytime' && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">{anytimeCount}/{maxCompletions} completed</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(anytimeCount / maxCompletions) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {(chore.timeOfDay === 'am' || chore.timeOfDay === 'both') && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Morning</span>
                        <span className="font-semibold">{amCount}/{maxCompletions} completed</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(amCount / maxCompletions) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {(chore.timeOfDay === 'pm' || chore.timeOfDay === 'both') && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Evening</span>
                        <span className="font-semibold">{pmCount}/{maxCompletions} completed</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(pmCount / maxCompletions) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-fredoka">Daily Activity</CardTitle>
          <p className="text-sm text-muted-foreground">Chores completed each day this week</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 85)" />
              <XAxis dataKey="day" stroke="oklch(0.5 0 0)" />
              <YAxis stroke="oklch(0.5 0 0)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(1 0 0)',
                  border: '1px solid oklch(0.88 0.01 85)',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              {childrenList.map((child) => (
                <Bar
                  key={child.id}
                  dataKey={child.name}
                  fill={child.avatarColor}
                  radius={[8, 8, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-fredoka">Points Comparison</CardTitle>
          <p className="text-sm text-muted-foreground">This week vs last week</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pointsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 85)" />
              <XAxis dataKey="name" stroke="oklch(0.5 0 0)" />
              <YAxis stroke="oklch(0.5 0 0)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(1 0 0)',
                  border: '1px solid oklch(0.88 0.01 85)',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Bar dataKey="thisWeek" name="This Week" fill="oklch(0.6 0.22 290)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="lastWeek" name="Last Week" fill="oklch(0.85 0.15 95)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {childStats.map((stats) => (
          <Card key={stats.child.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white font-fredoka font-bold text-lg"
                  style={{ backgroundColor: stats.child.avatarColor }}
                >
                  {stats.child.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="font-fredoka">{stats.child.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Weekly Report</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Chores Completed</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{stats.thisWeekCompletions}</Badge>
                    {stats.trend === 'up' && (
                      <TrendUp className="h-4 w-4 text-green-600" weight="bold" />
                    )}
                    {stats.trend === 'down' && (
                      <TrendDown className="h-4 w-4 text-orange-600" weight="bold" />
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last week: {stats.lastWeekCompletions}
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Points Earned</span>
                  <Badge className="bg-primary text-primary-foreground">
                    {stats.thisWeekPoints}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last week: {stats.lastWeekPoints}
                </div>
              </div>

              <Separator />

              {stats.topChore && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Most Frequent</div>
                  <div className="font-medium">
                    {stats.topChore.name}{' '}
                    <span className="text-muted-foreground">({stats.topChore.count}×)</span>
                  </div>
                </div>
              )}

              {stats.thisWeekPurchases > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Rewards Claimed</div>
                    <div className="font-medium">{stats.thisWeekPurchases}</div>
                  </div>
                </>
              )}

              <Separator />

              <div className="pt-2">
                <div className="text-xs text-muted-foreground mb-1">Total Points</div>
                <div className="text-2xl font-fredoka font-bold text-primary">
                  {stats.totalPoints}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
