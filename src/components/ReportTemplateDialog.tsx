import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ReportTemplate, ReportMetric, ReportPeriod } from '@/lib/types'
import { getMetricDisplayName } from '@/lib/reportHelpers'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ReportTemplateDialogProps {
  open: boolean
  onClose: () => void
  onSave: (templateData: Omit<ReportTemplate, 'id' | 'createdAt'>) => void
  editingTemplate?: ReportTemplate | null
}

const AVAILABLE_METRICS: ReportMetric[] = [
  'chores-completed',
  'chores-completion-rate',
  'points-earned',
  'rewards-purchased',
  'category-breakdown',
  'top-chores',
  'streak-days',
  'most-active-child',
  'completion-by-day',
  'completion-by-time',
  'missed-chores',
  'pending-approvals',
]

export function ReportTemplateDialog({
  open,
  onClose,
  onSave,
  editingTemplate,
}: ReportTemplateDialogProps) {
  const [name, setName] = useState(editingTemplate?.name || '')
  const [description, setDescription] = useState(editingTemplate?.description || '')
  const [period, setPeriod] = useState<ReportPeriod>(editingTemplate?.period || 'weekly')
  const [selectedMetrics, setSelectedMetrics] = useState<ReportMetric[]>(
    editingTemplate?.metrics || ['chores-completed', 'points-earned']
  )
  const [includeCharts, setIncludeCharts] = useState(
    editingTemplate?.includeCharts ?? true
  )
  const [includeChildComparison, setIncludeChildComparison] = useState(
    editingTemplate?.includeChildComparison ?? true
  )
  const [includeCategoryBreakdown, setIncludeCategoryBreakdown] = useState(
    editingTemplate?.includeCategoryBreakdown ?? true
  )

  const handleMetricToggle = (metric: ReportMetric) => {
    setSelectedMetrics((current) =>
      current.includes(metric)
        ? current.filter((m) => m !== metric)
        : [...current, metric]
    )
  }

  const handleSubmit = () => {
    if (!name.trim()) return

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      period,
      metrics: selectedMetrics,
      includeCharts,
      includeChildComparison,
      includeCategoryBreakdown,
    })
    
    setName('')
    setDescription('')
    setPeriod('weekly')
    setSelectedMetrics(['chores-completed', 'points-earned'])
    setIncludeCharts(true)
    setIncludeChildComparison(true)
    setIncludeCategoryBreakdown(true)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? 'Edit Report Template' : 'Create Report Template'}
          </DialogTitle>
          <DialogDescription>
            Customize which metrics to include in your activity reports
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="My Custom Report"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                placeholder="What this report is for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-period">Report Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
                <SelectTrigger id="template-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom (select dates when generating)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Metrics to Include</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVAILABLE_METRICS.map((metric) => (
                  <div key={metric} className="flex items-center space-x-2">
                    <Checkbox
                      id={`metric-${metric}`}
                      checked={selectedMetrics.includes(metric)}
                      onCheckedChange={() => handleMetricToggle(metric)}
                    />
                    <Label
                      htmlFor={`metric-${metric}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {getMetricDisplayName(metric)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label>Display Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-charts"
                    checked={includeCharts}
                    onCheckedChange={(checked) => setIncludeCharts(!!checked)}
                  />
                  <Label
                    htmlFor="include-charts"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Include charts and visualizations
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-comparison"
                    checked={includeChildComparison}
                    onCheckedChange={(checked) => setIncludeChildComparison(!!checked)}
                  />
                  <Label
                    htmlFor="include-comparison"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Include child comparison
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-category"
                    checked={includeCategoryBreakdown}
                    onCheckedChange={(checked) => setIncludeCategoryBreakdown(!!checked)}
                  />
                  <Label
                    htmlFor="include-category"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Include category breakdown
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || selectedMetrics.length === 0}>
            {editingTemplate ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
