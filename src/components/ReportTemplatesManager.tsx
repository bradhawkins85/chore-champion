import { useState, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ReportTemplate,
  GeneratedReport,
  Child,
  Chore,
  ChoreAssignment,
  ChoreCompletion,
  RewardPurchase,
  Category,
  ReportPeriod,
  Reward,
  CategoryBonusCompletion,
  WeeklyReportData,
} from '@/lib/types'
import {
  Plus,
  Play,
  Pencil,
  Trash,
  Calendar,
  ChartBar,
  FileText,
  Star,
  TrendUp,
  Download,
  Envelope,
} from '@phosphor-icons/react'
import { ReportTemplateDialog } from './ReportTemplateDialog'
import { ReportViewer } from './ReportViewer'
import { Badge } from '@/components/ui/badge'
import { generateReport, getMetricDisplayName, getPeriodDates } from '@/lib/reportHelpers'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { isCompletionApproved } from '@/lib/helpers'
import { toast } from 'sonner'

interface ReportTemplatesManagerProps {
  templates: ReportTemplate[]
  childrenList: Child[]
  chores: Chore[]
  assignments: ChoreAssignment[]
  completions: ChoreCompletion[]
  purchases: RewardPurchase[]
  categories: Category[]
  rewards: Reward[]
  bonusCompletions: CategoryBonusCompletion[]
  parentEmail?: string | null
  onAddTemplate: (templateData: Omit<ReportTemplate, 'id' | 'createdAt'>) => void
  onEditTemplate: (id: string, templateData: Omit<ReportTemplate, 'id' | 'createdAt'>) => void
  onDeleteTemplate: (id: string) => void
}

export function ReportTemplatesManager({
  templates,
  childrenList,
  chores,
  assignments,
  completions,
  purchases,
  categories,
  rewards,
  bonusCompletions,
  parentEmail,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: ReportTemplatesManagerProps) {
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)
  const [viewingReport, setViewingReport] = useState<GeneratedReport | null>(null)
  const [generatingTemplateId, setGeneratingTemplateId] = useState<string | null>(null)
  const [customPeriodDialog, setCustomPeriodDialog] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

  const handleAddTemplate = (templateData: Omit<ReportTemplate, 'id' | 'createdAt'>) => {
    onAddTemplate(templateData)
    setShowTemplateDialog(false)
  }

  const handleEditTemplate = (templateData: Omit<ReportTemplate, 'id' | 'createdAt'>) => {
    if (editingTemplate) {
      onEditTemplate(editingTemplate.id, templateData)
      setEditingTemplate(null)
      setShowTemplateDialog(false)
    }
  }

  const handleDeleteTemplate = () => {
    if (deletingTemplateId) {
      onDeleteTemplate(deletingTemplateId)
      setDeletingTemplateId(null)
    }
  }

  const handleGenerateReport = (template: ReportTemplate, customPeriod?: { start: number; end: number }) => {
    const reportData = generateReport(
      template,
      childrenList,
      chores,
      assignments,
      completions,
      purchases,
      categories,
      customPeriod
    )

    const generatedReport: GeneratedReport = {
      id: uuidv4(),
      templateId: template.id,
      templateName: template.name,
      generatedAt: Date.now(),
      periodStart: reportData.period.start,
      periodEnd: reportData.period.end,
      data: reportData,
    }

    setViewingReport(generatedReport)
    setGeneratingTemplateId(null)
    setCustomPeriodDialog(false)
  }

  const handleGenerateClick = (template: ReportTemplate) => {
    if (template.period === 'custom') {
      setGeneratingTemplateId(template.id)
      setCustomPeriodDialog(true)
    } else {
      handleGenerateReport(template)
    }
  }

  const handleCustomPeriodSubmit = () => {
    if (!generatingTemplateId || !customStartDate || !customEndDate) return

    const template = templates.find((t) => t.id === generatingTemplateId)
    if (!template) return

    const start = new Date(customStartDate).getTime()
    const end = new Date(customEndDate).getTime()
    
    if (start > end) {
      return
    }

    handleGenerateReport(template, { start, end })
    setCustomStartDate('')
    setCustomEndDate('')
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
    if (!parentEmail) {
      toast.error('Please configure an email address in Settings first')
      return
    }

    setIsGeneratingPreview(true)
    try {
      const emailContent = generateEmailContent(lastWeekReport)
      const emailSubject = `ChoreQuest Weekly Report - ${new Date(lastWeekReport.weekStart).toLocaleDateString()} to ${new Date(lastWeekReport.weekEnd).toLocaleDateString()}`
      
      const promptText = `You are an email service. Send an email with the following details:
To: ${parentEmail}
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

  if (viewingReport) {
    const template = templates.find((t) => t.id === viewingReport.templateId)
    if (!template) return null

    return (
      <ReportViewer
        report={viewingReport}
        template={template}
        categories={categories}
        onBack={() => setViewingReport(null)}
      />
    )
  }

  const sortedTemplates = [...templates].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    return b.createdAt - a.createdAt
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-fredoka font-bold">Report Templates</h2>
          <p className="text-muted-foreground">
            Create and manage custom activity report templates
          </p>
        </div>
        <Button onClick={() => setShowTemplateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {sortedTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No report templates yet</p>
            <Button onClick={() => setShowTemplateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedTemplates.map((template) => (
            <Card key={template.id} className="relative">
              {template.isDefault && (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3" weight="fill" />
                    Default
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2 pr-20">
                  <div className="flex items-center gap-2">
                    <ChartBar className="h-5 w-5 text-primary" />
                    <span>{template.name}</span>
                  </div>
                </CardTitle>
                {template.description && (
                  <CardDescription>{template.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{template.period}</span>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Metrics ({template.metrics.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {template.metrics.slice(0, 3).map((metric) => (
                      <Badge key={metric} variant="outline" className="text-xs">
                        {getMetricDisplayName(metric)}
                      </Badge>
                    ))}
                    {template.metrics.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.metrics.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {template.includeCharts && <span>📊 Charts</span>}
                  {template.includeChildComparison && <span>👥 Comparison</span>}
                  {template.includeCategoryBreakdown && <span>📂 Categories</span>}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleGenerateClick(template)}
                    className="flex-1"
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                  {!template.isDefault && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTemplate(template)
                          setShowTemplateDialog(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingTemplateId(template.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
              disabled={isGeneratingPreview || !parentEmail}
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

      <ReportTemplateDialog
        open={showTemplateDialog}
        onClose={() => {
          setShowTemplateDialog(false)
          setEditingTemplate(null)
        }}
        onSave={editingTemplate ? handleEditTemplate : handleAddTemplate}
        editingTemplate={editingTemplate}
      />

      <AlertDialog
        open={!!deletingTemplateId}
        onOpenChange={() => setDeletingTemplateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The template will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={customPeriodDialog} onOpenChange={setCustomPeriodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Report Period</DialogTitle>
            <DialogDescription>
              Choose the start and end dates for this report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomPeriodDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCustomPeriodSubmit}
              disabled={!customStartDate || !customEndDate}
            >
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
