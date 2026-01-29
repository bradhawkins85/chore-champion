import { useState, useMemo } from 'react'
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

interface ReportTemplatesManagerProps {
  templates: ReportTemplate[]
  children: Child[]
  chores: Chore[]
  assignments: ChoreAssignment[]
  completions: ChoreCompletion[]
  purchases: RewardPurchase[]
  categories: Category[]
  onAddTemplate: (templateData: Omit<ReportTemplate, 'id' | 'createdAt'>) => void
  onEditTemplate: (id: string, templateData: Omit<ReportTemplate, 'id' | 'createdAt'>) => void
  onDeleteTemplate: (id: string) => void
}

export function ReportTemplatesManager({
  templates,
  children: childrenList,
  chores,
  assignments,
  completions,
  purchases,
  categories,
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
      id: `report_${Date.now()}_${Math.random()}`,
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
