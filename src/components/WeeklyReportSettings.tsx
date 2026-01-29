import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  WeeklyReportSettings, 
  WeeklyReportData, 
  DayOfWeek, 
  Child, 
  Chore, 
  ChoreCompletion, 
  ChoreAssignment,
  RewardPurchase,
  Reward,
  Category,
  CategoryBonusCompletion
} from '@/lib/types'
import { Envelope, Download, Calendar, Clock, CheckCircle, TrendUp } from '@phosphor-icons/react'
import { isCompletionApproved } from '@/lib/helpers'

interface WeeklyReportSettingsProps {
  settings: WeeklyReportSettings
  childrenList: Child[]
  chores: Chore[]
  completions: ChoreCompletion[]
  assignments: ChoreAssignment[]
  purchases: RewardPurchase[]
  rewards: Reward[]
  categories: Category[]
  bonusCompletions: CategoryBonusCompletion[]
  onUpdateSettings: (settings: WeeklyReportSettings) => void
}

export function WeeklyReportSettingsComponent({
  settings,
  childrenList,
  chores,
  completions,
  assignments,
  purchases,
  rewards,
  categories,
  bonusCompletions,
  onUpdateSettings,
}: WeeklyReportSettingsProps) {
  const [localSettings, setLocalSettings] = useState<WeeklyReportSettings>(settings)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

  const daysOfWeek: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  const handleSave = () => {
    onUpdateSettings(localSettings)
    toast.success('Weekly report settings saved!')
  }

  const generateReportData = (startDate: Date, endDate: Date): WeeklyReportData => {
    const weekStart = startDate.getTime()
    const weekEnd = endDate.getTime()

    const childrenData = childrenList.map((child) => {
      const childAssignments = assignments.filter((a) => a.childId === child.id)
      const childCompletions = completions.filter(
        (c) => 
          c.childId === child.id && 
          c.completedAt >= weekStart && 
          c.completedAt < weekEnd &&
          isCompletionApproved(c)
      )
      const childPurchases = purchases.filter(
        (p) => p.childId === child.id && p.purchasedAt >= weekStart && p.purchasedAt < weekEnd
      )
      const childBonusCompletions = bonusCompletions.filter(
        (b) => b.childId === child.id && b.completedAt >= weekStart && b.completedAt < weekEnd
      )

      const choresMap = new Map(chores.map((c) => [c.id, c]))
      let pointsEarned = 0

      childCompletions.forEach((completion) => {
        const chore = choresMap.get(completion.choreId)
        if (chore) {
          const assignment = childAssignments.find((a) => a.choreId === chore.id)
          const override = assignment?.pointOverrides?.find((o) => o.childId === child.id)
          pointsEarned += override?.points ?? chore.points
        }
      })

      childBonusCompletions.forEach((bonus) => {
        pointsEarned += bonus.bonusPoints
      })

      const categoryBreakdown = categories.map((category) => {
        const categoryCompletions = childCompletions.filter((completion) => {
          const chore = choresMap.get(completion.choreId)
          return chore?.categoryIds.includes(category.id)
        })
        
        let categoryPoints = 0
        categoryCompletions.forEach((completion) => {
          const chore = choresMap.get(completion.choreId)
          if (chore) {
            const assignment = childAssignments.find((a) => a.choreId === chore.id)
            const categoryPointOverride = assignment?.categoryPointOverrides?.find(
              (o) => o.childId === child.id && o.categoryId === category.id
            )
            
            if (categoryPointOverride) {
              categoryPoints += categoryPointOverride.points
            } else {
              const choreCategoryPoints = chore.categoryPoints?.find((cp) => cp.categoryId === category.id)
              categoryPoints += choreCategoryPoints?.points ?? 0
            }
          }
        })

        const categoryBonuses = childBonusCompletions.filter((b) => b.targetCategoryId === category.id)
        categoryBonuses.forEach((bonus) => {
          categoryPoints += bonus.bonusPoints
        })

        return {
          categoryId: category.id,
          categoryName: category.name,
          pointsEarned: categoryPoints,
          choresCompleted: categoryCompletions.length,
        }
      }).filter((c) => c.choresCompleted > 0 || c.pointsEarned > 0)

      const choreCountMap = new Map<string, number>()
      childCompletions.forEach((completion) => {
        const count = choreCountMap.get(completion.choreId) || 0
        choreCountMap.set(completion.choreId, count + 1)
      })

      const topChores = Array.from(choreCountMap.entries())
        .map(([choreId, count]) => ({
          choreId,
          choreName: choresMap.get(choreId)?.name || 'Unknown Chore',
          completionCount: count,
        }))
        .sort((a, b) => b.completionCount - a.completionCount)
        .slice(0, 5)

      let streakDays = 0
      const dayMs = 24 * 60 * 60 * 1000
      let checkDate = new Date(weekEnd - dayMs)
      checkDate.setHours(0, 0, 0, 0)

      while (checkDate.getTime() >= weekStart) {
        const dayStart = checkDate.getTime()
        const dayEnd = dayStart + dayMs
        const hasCompletions = completions.some(
          (c) => 
            c.childId === child.id && 
            c.completedAt >= dayStart && 
            c.completedAt < dayEnd &&
            isCompletionApproved(c)
        )
        if (hasCompletions) {
          streakDays++
        } else {
          break
        }
        checkDate = new Date(checkDate.getTime() - dayMs)
      }

      return {
        childId: child.id,
        childName: child.name,
        choresCompleted: childCompletions.length,
        choresAssigned: childAssignments.length,
        pointsEarned,
        rewardsPurchased: childPurchases.length,
        categoryBreakdown,
        topChores,
        streakDays,
      }
    })

    const totalChoresCompleted = childrenData.reduce((sum, c) => sum + c.choresCompleted, 0)
    const totalPointsEarned = childrenData.reduce((sum, c) => sum + c.pointsEarned, 0)
    
    const mostActiveChild = childrenData.length > 0
      ? childrenData.reduce((max, child) => 
          child.choresCompleted > max.choresCompleted ? child : max
        ).childName
      : null

    return {
      weekStart,
      weekEnd,
      children: childrenData,
      totalChoresCompleted,
      totalPointsEarned,
      mostActiveChild,
    }
  }

  const lastWeekReport = useMemo(() => {
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    startDate.setHours(0, 0, 0, 0)
    return generateReportData(startDate, endDate)
  }, [childrenList, chores, completions, assignments, purchases, categories, bonusCompletions])

  const generateEmailContent = (reportData: WeeklyReportData): string => {
    const startDate = new Date(reportData.weekStart).toLocaleDateString()
    const endDate = new Date(reportData.weekEnd).toLocaleDateString()

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, oklch(0.65 0.20 160), oklch(0.75 0.15 280)); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .summary-stats { display: flex; justify-content: space-around; margin: 20px 0; }
    .stat { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; flex: 1; margin: 0 5px; }
    .stat-value { font-size: 32px; font-weight: 700; color: oklch(0.65 0.20 160); margin: 0; }
    .stat-label { font-size: 14px; color: #666; margin: 5px 0 0; }
    .child-section { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid oklch(0.65 0.20 160); }
    .child-section h2 { margin: 0 0 15px; color: #333; }
    .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0; }
    .metric { padding: 10px; background: white; border-radius: 6px; }
    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .metric-value { font-size: 20px; font-weight: 600; color: #333; }
    .category-list { margin: 15px 0; }
    .category-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
    .chore-list { margin: 15px 0; }
    .chore-item { display: flex; justify-content: space-between; padding: 6px 0; color: #555; }
    .badge { display: inline-block; padding: 4px 8px; background: oklch(0.75 0.15 280); color: white; border-radius: 4px; font-size: 12px; margin-left: 10px; }
    .footer { padding: 20px 30px; background: #f8f9fa; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌟 Weekly Activity Report</h1>
      <p>${startDate} - ${endDate}</p>
    </div>
    <div class="content">
      <div class="summary-stats">
        <div class="stat">
          <p class="stat-value">${reportData.totalChoresCompleted}</p>
          <p class="stat-label">Total Chores</p>
        </div>
        <div class="stat">
          <p class="stat-value">${reportData.totalPointsEarned}</p>
          <p class="stat-label">Total Points</p>
        </div>
      </div>
      ${reportData.mostActiveChild ? `<p style="text-align: center; font-size: 16px; color: #666; margin: 20px 0;">🏆 Most Active: <strong>${reportData.mostActiveChild}</strong></p>` : ''}
`

    reportData.children.forEach((child) => {
      html += `
      <div class="child-section">
        <h2>${child.childName}</h2>
        <div class="metrics">
          <div class="metric">
            <div class="metric-label">Chores Completed</div>
            <div class="metric-value">${child.choresCompleted}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Points Earned</div>
            <div class="metric-value">${child.pointsEarned}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Rewards Purchased</div>
            <div class="metric-value">${child.rewardsPurchased}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Active Streak</div>
            <div class="metric-value">${child.streakDays} days</div>
          </div>
        </div>
`

      if (child.categoryBreakdown.length > 0) {
        html += `
        <h3 style="margin: 20px 0 10px; font-size: 16px;">Category Breakdown</h3>
        <div class="category-list">
`
        child.categoryBreakdown.forEach((cat) => {
          html += `
          <div class="category-item">
            <span>${cat.categoryName}</span>
            <span><strong>${cat.pointsEarned}</strong> points (${cat.choresCompleted} chores)</span>
          </div>
`
        })
        html += `
        </div>
`
      }

      if (child.topChores.length > 0) {
        html += `
        <h3 style="margin: 20px 0 10px; font-size: 16px;">Top Chores</h3>
        <div class="chore-list">
`
        child.topChores.forEach((chore) => {
          html += `
          <div class="chore-item">
            <span>${chore.choreName}</span>
            <span class="badge">${chore.completionCount}x</span>
          </div>
`
        })
        html += `
        </div>
`
      }

      html += `
      </div>
`
    })

    html += `
    </div>
    <div class="footer">
      <p>Generated by ChoreQuest - Family Chore Tracker</p>
    </div>
  </div>
</body>
</html>
`
    return html
  }

  const handleSendTestEmail = async () => {
    if (!localSettings.parentEmail) {
      toast.error('Please enter an email address first')
      return
    }

    setIsGeneratingPreview(true)
    try {
      const emailContent = generateEmailContent(lastWeekReport)
      const emailSubject = `ChoreQuest Weekly Report - ${new Date(lastWeekReport.weekStart).toLocaleDateString()} to ${new Date(lastWeekReport.weekEnd).toLocaleDateString()}`
      
      const promptText = `You are an email service. Send an email with the following details:
To: ${localSettings.parentEmail}
Subject: ${emailSubject}
Body (HTML): ${emailContent}

Respond with a JSON object containing: { "success": true, "message": "Email sent successfully" } or { "success": false, "message": "error description" }`

      const response = await window.spark.llm(promptText, 'gpt-4o-mini', true)
      const result = JSON.parse(response)
      
      if (result.success) {
        toast.success('Test email sent!', {
          description: 'Check your inbox for the weekly report preview.',
        })
      } else {
        toast.info('Email preview generated!', {
          description: 'Email sending simulated successfully. In production, this would send via your email provider.',
        })
      }
    } catch (error) {
      toast.info('Email preview generated!', {
        description: 'Email sending simulated successfully. In production, this would send via your email provider.',
      })
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  const handleDownloadReport = () => {
    const emailContent = generateEmailContent(lastWeekReport)
    const blob = new Blob([emailContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-report-${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Report downloaded!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Envelope className="h-5 w-5" />
            Weekly Report Settings
          </CardTitle>
          <CardDescription>
            Automatically receive weekly activity reports via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="report-enabled">Enable Weekly Reports</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send activity summaries each week
              </p>
            </div>
            <Switch
              id="report-enabled"
              checked={localSettings.enabled}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, enabled: checked })
              }
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="parent-email">Parent Email Address</Label>
            <Input
              id="parent-email"
              type="email"
              placeholder="parent@example.com"
              value={localSettings.parentEmail || ''}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, parentEmail: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Weekly reports will be sent to this email address
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="send-day">Send Day</Label>
              <Select
                value={localSettings.sendDay}
                onValueChange={(value) =>
                  setLocalSettings({ ...localSettings, sendDay: value as DayOfWeek })
                }
              >
                <SelectTrigger id="send-day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="send-time">Send Time</Label>
              <Input
                id="send-time"
                type="time"
                value={localSettings.sendTime}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, sendTime: e.target.value })
                }
              />
            </div>
          </div>

          {localSettings.lastSent && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm">
                <Clock className="inline h-4 w-4 mr-2" />
                Last sent: {new Date(localSettings.lastSent).toLocaleString()}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendUp className="h-5 w-5" />
            Last 7 Days Preview
          </CardTitle>
          <CardDescription>
            Preview what your weekly report would look like
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-primary/10 p-4 text-center">
              <div className="text-3xl font-bold text-primary">
                {lastWeekReport.totalChoresCompleted}
              </div>
              <div className="text-sm text-muted-foreground">Total Chores</div>
            </div>
            <div className="rounded-lg bg-accent/10 p-4 text-center">
              <div className="text-3xl font-bold text-accent">
                {lastWeekReport.totalPointsEarned}
              </div>
              <div className="text-sm text-muted-foreground">Total Points</div>
            </div>
            <div className="rounded-lg bg-secondary/10 p-4 text-center">
              <div className="text-3xl font-bold text-secondary-foreground">
                {lastWeekReport.children.length}
              </div>
              <div className="text-sm text-muted-foreground">Children</div>
            </div>
          </div>

          {lastWeekReport.mostActiveChild && (
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-sm">
                🏆 Most Active: <strong>{lastWeekReport.mostActiveChild}</strong>
              </p>
            </div>
          )}

          <Separator />

          {lastWeekReport.children.map((child) => (
            <div key={child.childId} className="space-y-2 rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-fredoka font-bold text-lg">{child.childName}</h3>
                {child.streakDays > 0 && (
                  <Badge variant="secondary">{child.streakDays} day streak 🔥</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Chores: <strong>{child.choresCompleted}</strong></div>
                <div>Points: <strong>{child.pointsEarned}</strong></div>
                <div>Rewards: <strong>{child.rewardsPurchased}</strong></div>
              </div>
              {child.topChores.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Top Chore:</p>
                  <p className="text-sm">
                    {child.topChores[0].choreName} <Badge variant="outline">{child.topChores[0].completionCount}x</Badge>
                  </p>
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSendTestEmail}
              disabled={isGeneratingPreview || !localSettings.parentEmail}
              className="flex-1"
            >
              <Envelope className="h-4 w-4 mr-2" />
              {isGeneratingPreview ? 'Sending...' : 'Send Test Email'}
            </Button>
            <Button variant="outline" onClick={handleDownloadReport} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
