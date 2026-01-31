import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GeneratedReport, ReportTemplate, Category } from '@/lib/types'
import { ArrowLeft, Download, Calendar } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { getMetricDisplayName } from '@/lib/reportHelpers'

interface ReportViewerProps {
  report: GeneratedReport
  template: ReportTemplate
  categories: Category[]
  onBack: () => void
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

export function ReportViewer({ report, template, categories, onBack }: ReportViewerProps) {
  const { data } = report
  const startDate = new Date(data.period.start).toLocaleDateString()
  const endDate = new Date(data.period.end).toLocaleDateString()

  const handleExport = () => {
    const reportText = generateReportText(report, template)
    const blob = new Blob([reportText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasMetric = (metric: string) => template.metrics.includes(metric as any)

  return (
    <div className="h-full overflow-y-auto bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-fredoka font-bold">{template.name}</h1>
              {template.description && (
                <p className="text-muted-foreground">{template.description}</p>
              )}
            </div>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {startDate} - {endDate}
              </span>
              <Badge variant="secondary" className="ml-2">
                {template.period}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {hasMetric('chores-completed') && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Chores</p>
                  <p className="text-3xl font-fredoka font-bold">
                    {data.summary.totalChoresCompleted}
                  </p>
                </div>
              )}
              {hasMetric('points-earned') && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Points</p>
                  <p className="text-3xl font-fredoka font-bold">
                    {data.summary.totalPointsEarned}
                  </p>
                </div>
              )}
              {hasMetric('rewards-purchased') && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Rewards</p>
                  <p className="text-3xl font-fredoka font-bold">
                    {data.summary.totalRewardsPurchased}
                  </p>
                </div>
              )}
              {hasMetric('chores-completion-rate') && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Avg. Completion</p>
                  <p className="text-3xl font-fredoka font-bold">
                    {data.summary.averageCompletionRate}%
                  </p>
                </div>
              )}
            </div>
            {hasMetric('most-active-child') && data.summary.mostActiveChild && (
              <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Most Active Child</p>
                <p className="text-xl font-fredoka font-bold">{data.summary.mostActiveChild}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {template.includeChildComparison && template.includeCharts && (
          <Card>
            <CardHeader>
              <CardTitle>Child Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.children.map((c) => ({
                  name: c.childName,
                  chores: c.metrics.choresCompleted,
                  points: c.metrics.pointsEarned,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {hasMetric('chores-completed') && <Bar dataKey="chores" fill="#8b5cf6" name="Chores" />}
                  {hasMetric('points-earned') && <Bar dataKey="points" fill="#3b82f6" name="Points" />}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {data.children.map((child) => (
          <Card key={child.childId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{child.childName}</span>
                {hasMetric('chores-completion-rate') && (
                  <Badge variant={child.metrics.completionRate >= 80 ? 'default' : 'secondary'}>
                    {child.metrics.completionRate}% Complete
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {hasMetric('chores-completed') && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Chores</p>
                    <p className="text-2xl font-fredoka font-bold">
                      {child.metrics.choresCompleted}
                    </p>
                  </div>
                )}
                {hasMetric('points-earned') && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Points</p>
                    <p className="text-2xl font-fredoka font-bold">
                      {child.metrics.pointsEarned}
                    </p>
                  </div>
                )}
                {hasMetric('rewards-purchased') && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Rewards</p>
                    <p className="text-2xl font-fredoka font-bold">
                      {child.metrics.rewardsPurchased}
                    </p>
                  </div>
                )}
                {hasMetric('streak-days') && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Streak</p>
                    <p className="text-2xl font-fredoka font-bold">
                      {child.metrics.streakDays} days
                    </p>
                  </div>
                )}
                {hasMetric('missed-chores') && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Missed</p>
                    <p className="text-2xl font-fredoka font-bold">
                      {child.metrics.missedChores}
                    </p>
                  </div>
                )}
                {hasMetric('pending-approvals') && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-fredoka font-bold">
                      {child.metrics.pendingApprovals}
                    </p>
                  </div>
                )}
              </div>

              {hasMetric('chores-completion-rate') && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <span className="font-medium">{child.metrics.completionRate}%</span>
                  </div>
                  <Progress value={child.metrics.completionRate} />
                </div>
              )}

              {hasMetric('category-breakdown') && template.includeCategoryBreakdown && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Category Breakdown</h4>
                  {template.includeCharts ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={child.categoryBreakdown.map((cat) => ({
                            name: cat.categoryName,
                            value: cat.pointsEarned,
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {child.categoryBreakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="space-y-2">
                      {child.categoryBreakdown.map((cat) => (
                        <div key={cat.categoryId} className="flex justify-between items-center">
                          <span className="text-sm">{cat.categoryName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{cat.pointsEarned} pts</span>
                            <span className="text-xs text-muted-foreground">
                              ({cat.choresCompleted} chores)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {hasMetric('top-chores') && child.topChores.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Top Chores</h4>
                  <div className="space-y-2">
                    {child.topChores.map((chore, index) => (
                      <div
                        key={chore.choreId}
                        className="flex justify-between items-center p-2 bg-muted/50 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <span className="text-sm">{chore.choreName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {chore.completionCount}x
                          </span>
                          <span className="font-medium">{chore.pointsEarned} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasMetric('completion-by-day') && template.includeCharts && child.completionByDay.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Completions by Day</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={child.completionByDay.map((d) => ({
                      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      count: d.count,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {hasMetric('completion-by-time') && template.includeCharts && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Completions by Time</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={child.completionByTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timeOfDay" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function generateReportText(report: GeneratedReport, template: ReportTemplate): string {
  const { data } = report
  const startDate = new Date(data.period.start).toLocaleDateString()
  const endDate = new Date(data.period.end).toLocaleDateString()

  let text = `${template.name}\n`
  text += `${'='.repeat(template.name.length)}\n\n`
  if (template.description) {
    text += `${template.description}\n\n`
  }
  text += `Report Period: ${startDate} - ${endDate}\n`
  text += `Generated: ${new Date(report.generatedAt).toLocaleString()}\n\n`

  text += `SUMMARY\n${'='.repeat(50)}\n`
  text += `Total Chores Completed: ${data.summary.totalChoresCompleted}\n`
  text += `Total Points Earned: ${data.summary.totalPointsEarned}\n`
  text += `Total Rewards Purchased: ${data.summary.totalRewardsPurchased}\n`
  text += `Average Completion Rate: ${data.summary.averageCompletionRate}%\n`
  if (data.summary.mostActiveChild) {
    text += `Most Active Child: ${data.summary.mostActiveChild}\n`
  }
  text += `\n`

  data.children.forEach((child) => {
    text += `\n${child.childName.toUpperCase()}\n${'='.repeat(50)}\n`
    text += `Chores Completed: ${child.metrics.choresCompleted} / ${child.metrics.choresAssigned}\n`
    text += `Completion Rate: ${child.metrics.completionRate}%\n`
    text += `Points Earned: ${child.metrics.pointsEarned}\n`
    text += `Rewards Purchased: ${child.metrics.rewardsPurchased}\n`
    text += `Streak Days: ${child.metrics.streakDays}\n`
    text += `Missed Chores: ${child.metrics.missedChores}\n`
    text += `Pending Approvals: ${child.metrics.pendingApprovals}\n\n`

    if (child.categoryBreakdown.length > 0) {
      text += `Category Breakdown:\n`
      child.categoryBreakdown.forEach((cat) => {
        text += `  - ${cat.categoryName}: ${cat.pointsEarned} points (${cat.choresCompleted} chores, ${cat.completionRate}% rate)\n`
      })
      text += `\n`
    }

    if (child.topChores.length > 0) {
      text += `Top Chores:\n`
      child.topChores.forEach((chore, index) => {
        text += `  ${index + 1}. ${chore.choreName}: ${chore.completionCount}x (${chore.pointsEarned} points)\n`
      })
      text += `\n`
    }
  })

  return text
}
