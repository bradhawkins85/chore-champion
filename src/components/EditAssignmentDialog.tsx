import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarBlank, X } from '@phosphor-icons/react'
import { ChoreAssignment, DayOfWeek, RepeatPattern } from '@/lib/types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface EditAssignmentDialogProps {
  assignment: ChoreAssignment | null
  choreName: string
  open: boolean
  onClose: () => void
  onSave: (
    assignmentId: string,
    updates: {
      startDate?: number
      endDate?: number
      daysOfWeek?: DayOfWeek[]
      repeatPattern?: RepeatPattern
    }
  ) => void
}

export function EditAssignmentDialog({
  assignment,
  choreName,
  open,
  onClose,
  onSave,
}: EditAssignmentDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([])
  const [repeatInterval, setRepeatInterval] = useState<number>(1)
  const [useRepeatPattern, setUseRepeatPattern] = useState(false)

  const daysOfWeek: { value: DayOfWeek; label: string }[] = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
  ]

  useEffect(() => {
    if (assignment && open) {
      setStartDate(assignment.startDate ? new Date(assignment.startDate) : undefined)
      setEndDate(assignment.endDate ? new Date(assignment.endDate) : undefined)
      setSelectedDays(assignment.daysOfWeek || [])
      if (assignment.repeatPattern) {
        setUseRepeatPattern(true)
        setRepeatInterval(assignment.repeatPattern.interval)
        setSelectedDays(assignment.repeatPattern.specificDays || [])
      } else {
        setUseRepeatPattern(false)
        setRepeatInterval(1)
      }
    }
  }, [assignment, open])

  const handleSave = () => {
    if (!assignment) return

    const updates: {
      startDate?: number
      endDate?: number
      daysOfWeek?: DayOfWeek[]
      repeatPattern?: RepeatPattern
    } = {
      startDate: startDate ? startDate.getTime() : undefined,
      endDate: endDate ? endDate.getTime() : undefined,
    }

    if (useRepeatPattern) {
      updates.repeatPattern = {
        interval: repeatInterval,
        unit: 'weeks',
        specificDays: selectedDays.length > 0 ? selectedDays : undefined,
        anchorDate: startDate ? startDate.getTime() : Date.now(),
      }
      updates.daysOfWeek = undefined
    } else {
      updates.daysOfWeek = selectedDays.length > 0 ? selectedDays : undefined
      updates.repeatPattern = undefined
    }

    onSave(assignment.id, updates)
    onClose()
  }

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleClearStartDate = () => {
    setStartDate(undefined)
  }

  const handleClearEndDate = () => {
    setEndDate(undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Schedule for {choreName}</DialogTitle>
          <DialogDescription>
            Customize when this chore is active for this child
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Start Date (Optional)</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarBlank className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'No start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {startDate && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearStartDate}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Chore becomes active starting from this date
            </p>
          </div>

          <div className="space-y-3">
            <Label>End Date (Optional)</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarBlank className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'No end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) =>
                      startDate ? date < startDate : false
                    }
                  />
                </PopoverContent>
              </Popover>
              {endDate && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearEndDate}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Chore becomes inactive after this date
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="use-repeat"
                checked={useRepeatPattern}
                onCheckedChange={(checked) => setUseRepeatPattern(checked === true)}
              />
              <Label htmlFor="use-repeat" className="cursor-pointer">
                Use repeat pattern (e.g., every 2 weeks)
              </Label>
            </div>

            {useRepeatPattern && (
              <div className="ml-6 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="repeat-interval">Repeat Every</Label>
                  <Select
                    value={repeatInterval.toString()}
                    onValueChange={(value) => setRepeatInterval(parseInt(value))}
                  >
                    <SelectTrigger id="repeat-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 week</SelectItem>
                      <SelectItem value="2">2 weeks</SelectItem>
                      <SelectItem value="3">3 weeks</SelectItem>
                      <SelectItem value="4">4 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Pattern starts from {startDate ? format(startDate, 'PPP') : 'today'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Active Days of Week</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedDays.includes(day.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  <Checkbox
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <span className="text-sm font-medium">{day.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedDays.length === 0
                ? 'No days selected - chore will be active every day'
                : `Active on ${selectedDays.length} day${selectedDays.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
