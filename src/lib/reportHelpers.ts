import {
  ReportTemplate,
  ReportData,
  ChildReportData,
  ReportSummary,
  Child,
  Chore,
  ChoreCompletion,
  ChoreAssignment,
  RewardPurchase,
  Category,
  ReportPeriod,
} from './types'

export const DEFAULT_REPORT_TEMPLATES: Omit<ReportTemplate, 'id' | 'createdAt'>[] = [
  {
    name: 'Weekly Summary',
    description: 'Basic weekly activity overview',
    period: 'weekly',
    metrics: [
      'chores-completed',
      'chores-completion-rate',
      'points-earned',
      'rewards-purchased',
      'category-breakdown',
    ],
    includeCharts: true,
    includeChildComparison: true,
    includeCategoryBreakdown: true,
    isDefault: true,
  },
  {
    name: 'Detailed Performance',
    description: 'Comprehensive analysis of all activities',
    period: 'weekly',
    metrics: [
      'chores-completed',
      'chores-completion-rate',
      'points-earned',
      'rewards-purchased',
      'category-breakdown',
      'top-chores',
      'streak-days',
      'completion-by-day',
      'completion-by-time',
      'missed-chores',
      'pending-approvals',
    ],
    includeCharts: true,
    includeChildComparison: true,
    includeCategoryBreakdown: true,
  },
  {
    name: 'Quick Stats',
    description: 'Essential metrics at a glance',
    period: 'daily',
    metrics: [
      'chores-completed',
      'points-earned',
      'most-active-child',
    ],
    includeCharts: false,
    includeChildComparison: false,
    includeCategoryBreakdown: false,
  },
  {
    name: 'Monthly Overview',
    description: 'Month-long activity summary',
    period: 'monthly',
    metrics: [
      'chores-completed',
      'chores-completion-rate',
      'points-earned',
      'rewards-purchased',
      'category-breakdown',
      'top-chores',
      'streak-days',
      'most-active-child',
    ],
    includeCharts: true,
    includeChildComparison: true,
    includeCategoryBreakdown: true,
  },
]

export function getPeriodDates(period: ReportPeriod, customStart?: number, customEnd?: number): { start: number; end: number } {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  
  let start: Date
  
  switch (period) {
    case 'daily':
      start = new Date(now)
      start.setHours(0, 0, 0, 0)
      break
    case 'weekly':
      start = new Date(now)
      start.setDate(start.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      break
    case 'bi-weekly':
      start = new Date(now)
      start.setDate(start.getDate() - 14)
      start.setHours(0, 0, 0, 0)
      break
    case 'monthly':
      start = new Date(now)
      start.setMonth(start.getMonth() - 1)
      start.setHours(0, 0, 0, 0)
      break
    case 'custom':
      if (customStart && customEnd) {
        return { start: customStart, end: customEnd }
      }
      start = new Date(now)
      start.setDate(start.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      break
  }
  
  return { start: start.getTime(), end: end.getTime() }
}

export function generateReport(
  template: ReportTemplate,
  children: Child[],
  chores: Chore[],
  assignments: ChoreAssignment[],
  completions: ChoreCompletion[],
  purchases: RewardPurchase[],
  categories: Category[],
  customPeriod?: { start: number; end: number }
): ReportData {
  const { start, end } = customPeriod || getPeriodDates(template.period)
  
  const periodCompletions = completions.filter(
    (c) => c.completedAt >= start && c.completedAt <= end
  )
  const periodPurchases = purchases.filter(
    (p) => p.purchasedAt >= start && p.purchasedAt <= end
  )
  
  const childrenData: ChildReportData[] = children.map((child) =>
    generateChildReportData(
      child,
      chores,
      assignments,
      periodCompletions,
      periodPurchases,
      categories,
      start,
      end,
      template.metrics
    )
  )
  
  const summary = generateReportSummary(
    childrenData,
    children,
    chores,
    categories
  )
  
  return {
    period: { start, end },
    children: childrenData,
    summary,
  }
}

function generateChildReportData(
  child: Child,
  chores: Chore[],
  assignments: ChoreAssignment[],
  completions: ChoreCompletion[],
  purchases: RewardPurchase[],
  categories: Category[],
  start: number,
  end: number,
  metrics: string[]
): ChildReportData {
  const childCompletions = completions.filter((c) => c.childId === child.id)
  const childAssignments = assignments.filter((a) => a.childId === child.id)
  const childPurchases = purchases.filter((p) => p.childId === child.id)
  
  const choresMap = new Map(chores.map((c) => [c.id, c]))
  
  const approvedCompletions = childCompletions.filter(
    (c) => !c.approvalStatus || c.approvalStatus === 'approved'
  )
  const pendingCompletions = childCompletions.filter(
    (c) => c.approvalStatus === 'pending'
  )
  
  const uniqueChoreIds = new Set(
    childAssignments.map((a) => a.choreId)
  )
  const totalAssigned = uniqueChoreIds.size
  
  const completionRate = totalAssigned > 0 
    ? Math.round((approvedCompletions.length / totalAssigned) * 100) 
    : 0
  
  let pointsEarned = 0
  approvedCompletions.forEach((completion) => {
    const chore = choresMap.get(completion.choreId)
    if (chore) {
      pointsEarned += chore.points || 0
    }
  })
  
  const categoryBreakdown = categories.map((category) => {
    const categoryChores = chores.filter((c) =>
      c.categoryIds.includes(category.id)
    )
    const categoryCompletions = approvedCompletions.filter((c) =>
      categoryChores.some((ch) => ch.id === c.choreId)
    )
    
    let catPoints = 0
    categoryCompletions.forEach((completion) => {
      const chore = choresMap.get(completion.choreId)
      if (chore && chore.categoryPoints) {
        const catPoint = chore.categoryPoints.find(
          (cp) => cp.categoryId === category.id
        )
        catPoints += catPoint?.points || chore.points || 0
      } else if (chore) {
        catPoints += chore.points || 0
      }
    })
    
    const catAssignedCount = childAssignments.filter((a) =>
      categoryChores.some((ch) => ch.id === a.choreId)
    ).length
    
    const catCompletionRate = catAssignedCount > 0
      ? Math.round((categoryCompletions.length / catAssignedCount) * 100)
      : 0
    
    return {
      categoryId: category.id,
      categoryName: category.name,
      pointsEarned: catPoints,
      choresCompleted: categoryCompletions.length,
      completionRate: catCompletionRate,
    }
  })
  
  const choreCompletionCounts = new Map<string, number>()
  const chorePoints = new Map<string, number>()
  
  approvedCompletions.forEach((completion) => {
    const count = choreCompletionCounts.get(completion.choreId) || 0
    choreCompletionCounts.set(completion.choreId, count + 1)
    
    const chore = choresMap.get(completion.choreId)
    if (chore) {
      const points = chorePoints.get(completion.choreId) || 0
      chorePoints.set(completion.choreId, points + (chore.points || 0))
    }
  })
  
  const topChores = Array.from(choreCompletionCounts.entries())
    .map(([choreId, count]) => {
      const chore = choresMap.get(choreId)
      return {
        choreId,
        choreName: chore?.name || 'Unknown',
        completionCount: count,
        pointsEarned: chorePoints.get(choreId) || 0,
      }
    })
    .sort((a, b) => b.completionCount - a.completionCount)
    .slice(0, 5)
  
  const completionByDay: { date: number; count: number }[] = []
  const dayMap = new Map<string, number>()
  
  approvedCompletions.forEach((completion) => {
    const date = new Date(completion.completedAt)
    date.setHours(0, 0, 0, 0)
    const dateKey = date.toISOString().split('T')[0]
    dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + 1)
  })
  
  dayMap.forEach((count, dateKey) => {
    completionByDay.push({
      date: new Date(dateKey).getTime(),
      count,
    })
  })
  
  completionByDay.sort((a, b) => a.date - b.date)
  
  const completionByTime: { timeOfDay: 'am' | 'pm' | 'anytime'; count: number }[] = [
    { timeOfDay: 'am', count: 0 },
    { timeOfDay: 'pm', count: 0 },
    { timeOfDay: 'anytime', count: 0 },
  ]
  
  approvedCompletions.forEach((completion) => {
    if (completion.timeOfDay === 'am') {
      completionByTime[0].count++
    } else if (completion.timeOfDay === 'pm') {
      completionByTime[1].count++
    } else {
      completionByTime[2].count++
    }
  })
  
  const streakDays = calculateStreakDays(approvedCompletions, end)
  
  const missedChores = totalAssigned - approvedCompletions.length
  
  return {
    childId: child.id,
    childName: child.name,
    metrics: {
      choresCompleted: approvedCompletions.length,
      choresAssigned: totalAssigned,
      completionRate,
      pointsEarned,
      rewardsPurchased: childPurchases.length,
      missedChores: missedChores > 0 ? missedChores : 0,
      pendingApprovals: pendingCompletions.length,
      streakDays,
    },
    categoryBreakdown,
    topChores,
    completionByDay,
    completionByTime,
  }
}

function generateReportSummary(
  childrenData: ChildReportData[],
  children: Child[],
  chores: Chore[],
  categories: Category[]
): ReportSummary {
  const totalChoresCompleted = childrenData.reduce(
    (sum, child) => sum + child.metrics.choresCompleted,
    0
  )
  const totalChoresAssigned = childrenData.reduce(
    (sum, child) => sum + child.metrics.choresAssigned,
    0
  )
  const totalPointsEarned = childrenData.reduce(
    (sum, child) => sum + child.metrics.pointsEarned,
    0
  )
  const totalRewardsPurchased = childrenData.reduce(
    (sum, child) => sum + child.metrics.rewardsPurchased,
    0
  )
  
  const averageCompletionRate = childrenData.length > 0
    ? Math.round(
        childrenData.reduce((sum, child) => sum + child.metrics.completionRate, 0) /
          childrenData.length
      )
    : 0
  
  let mostActiveChild: string | null = null
  let maxCompletions = 0
  childrenData.forEach((child) => {
    if (child.metrics.choresCompleted > maxCompletions) {
      maxCompletions = child.metrics.choresCompleted
      mostActiveChild = child.childName
    }
  })
  
  const choreCompletionCounts = new Map<string, number>()
  childrenData.forEach((child) => {
    child.topChores.forEach((chore) => {
      const count = choreCompletionCounts.get(chore.choreId) || 0
      choreCompletionCounts.set(chore.choreId, count + chore.completionCount)
    })
  })
  
  let mostCompletedChore: string | null = null
  let maxChoreCompletions = 0
  choreCompletionCounts.forEach((count, choreId) => {
    if (count > maxChoreCompletions) {
      maxChoreCompletions = count
      const chore = chores.find((c) => c.id === choreId)
      mostCompletedChore = chore?.name || null
    }
  })
  
  const categoryPoints = new Map<string, number>()
  childrenData.forEach((child) => {
    child.categoryBreakdown.forEach((cat) => {
      const points = categoryPoints.get(cat.categoryId) || 0
      categoryPoints.set(cat.categoryId, points + cat.pointsEarned)
    })
  })
  
  let mostEarnedCategory: string | null = null
  let maxCategoryPoints = 0
  categoryPoints.forEach((points, categoryId) => {
    if (points > maxCategoryPoints) {
      maxCategoryPoints = points
      const category = categories.find((c) => c.id === categoryId)
      mostEarnedCategory = category?.name || null
    }
  })
  
  return {
    totalChoresCompleted,
    totalChoresAssigned,
    totalPointsEarned,
    totalRewardsPurchased,
    averageCompletionRate,
    mostActiveChild,
    mostCompletedChore,
    mostEarnedCategory,
  }
}

function calculateStreakDays(completions: ChoreCompletion[], endDate: number): number {
  if (completions.length === 0) return 0
  
  const completionDates = new Set<string>()
  completions.forEach((completion) => {
    const date = new Date(completion.completedAt)
    date.setHours(0, 0, 0, 0)
    completionDates.add(date.toISOString().split('T')[0])
  })
  
  let streak = 0
  let currentDate = new Date(endDate)
  currentDate.setHours(0, 0, 0, 0)
  
  while (true) {
    const dateKey = currentDate.toISOString().split('T')[0]
    if (completionDates.has(dateKey)) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }
  
  return streak
}

export function getMetricDisplayName(metric: string): string {
  const names: Record<string, string> = {
    'chores-completed': 'Chores Completed',
    'chores-completion-rate': 'Completion Rate',
    'points-earned': 'Points Earned',
    'rewards-purchased': 'Rewards Purchased',
    'category-breakdown': 'Category Breakdown',
    'top-chores': 'Top Chores',
    'streak-days': 'Current Streak',
    'most-active-child': 'Most Active Child',
    'completion-by-day': 'Completions by Day',
    'completion-by-time': 'Completions by Time',
    'missed-chores': 'Missed Chores',
    'pending-approvals': 'Pending Approvals',
    'average-completion-time': 'Avg. Completion Time',
  }
  return names[metric] || metric
}
