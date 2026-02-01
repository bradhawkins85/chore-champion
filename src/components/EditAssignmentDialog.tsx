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
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarBlank, X, Info, Star, Clock } from '@phosphor-icons/react'
import { ChoreAssignment, DayOfWeek, RepeatPattern, ChoreTimeOfDay, TimeWindow, ChorePointOverride, CategoryPointOverride, Child, Category } from '@/lib/types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

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
      timeOfDay?: ChoreTimeOfDay
      timeWindow?: TimeWindow
      pointOverrides?: ChorePointOverride[]
      categoryPointOverrides?: CategoryPointOverride[]
    }
  ) => void
  child?: Child
  chorePoints?: number
  choreCategories?: { id: string; name: string; color: string; points: number }[]
  categories?: Category[]
}

export function EditAssignmentDialog({
  assignment,
  choreName,
  open,
  onClose,
  onSave,
  child,
  chorePoints = 10,
  choreCategories = [],
  categories = [],
}: EditAssignmentDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([])
  const [repeatInterval, setRepeatInterval] = useState<number>(1)
  const [useRepeatPattern, setUseRepeatPattern] = useState(false)
  const [timeOfDay, setTimeOfDay] = useState<ChoreTimeOfDay>('anytime')
  const [useTimeWindow, setUseTimeWindow] = useState(false)
  const [timeWindowStart, setTimeWindowStart] = useState('')
  const [timeWindowEnd, setTimeWindowEnd] = useState('')
  const [categoryPointOverrides, setCategoryPointOverrides] = useState<CategoryPointOverride[]>([])

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
      setTimeOfDay(assignment.timeOfDay || 'anytime')
      setUseTimeWindow(!!assignment.timeWindow)
      setTimeWindowStart(assignment.timeWindow?.startTime || '')
      setTimeWindowEnd(assignment.timeWindow?.endTime || '')
      
      setCategoryPointOverrides(assignment.categoryPointOverrides || [])
      
      if (assignment.repeatPattern) {
        setUseRepeatPattern(true)
        setRepeatInterval(assignment.repeatPattern.interval)
        setSelectedDays(assignment.repeatPattern.specificDays || [])
      } else {
        setUseRepeatPattern(false)
        setRepeatInterval(1)
      }
    }
  }, [assignment, open, child])

  const handleSave = () => {
    if (!assignment) return

    const updates: {
      startDate?: number
      endDate?: number
      daysOfWeek?: DayOfWeek[]
      repeatPattern?: RepeatPattern
      timeOfDay?: ChoreTimeOfDay
      timeWindow?: TimeWindow
      pointOverrides?: ChorePointOverride[]
      categoryPointOverrides?: CategoryPointOverride[]
    } = {
      startDate: startDate ? startDate.getTime() : undefined,
      endDate: endDate ? endDate.getTime() : undefined,
      timeOfDay,
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

    if (useTimeWindow && timeWindowStart && timeWindowEnd) {
      updates.timeWindow = {
        startTime: timeWindowStart,
        endTime: timeWindowEnd,
      }
    } else {
      updates.timeWindow = undefined
    }

    if (categoryPointOverrides.length > 0) {
      updates.categoryPointOverrides = categoryPointOverrides
    } else {
      updates.categoryPointOverrides = []
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
          <DialogTitle>Manage Chore: {choreName}</DialogTitle>
          <DialogDescription>
            Customize schedule, time restrictions, and points for {child?.name || 'this child'}
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

          <Separator />

          <div className="space-y-3">
            <Label htmlFor="time-of-day-assignment">Time of Day</Label>
            <Select value={timeOfDay} onValueChange={(v) => setTimeOfDay(v as ChoreTimeOfDay)}>
              <SelectTrigger id="time-of-day-assignment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anytime">Anytime</SelectItem>
                <SelectItem value="am">AM Only (before noon)</SelectItem>
                <SelectItem value="pm">PM Only (after noon)</SelectItem>
                <SelectItem value="both">Both AM & PM</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {timeOfDay === 'am' && 'Must be completed before noon or will be marked missed'}
              {timeOfDay === 'pm' && 'Only shows after noon'}
              {timeOfDay === 'both' && 'Requires completion in morning and evening'}
              {timeOfDay === 'anytime' && 'Can be completed at any time of day'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-time-window-assignment" className="text-base font-semibold">
                  <Clock className="inline h-4 w-4 mr-2" />
                  Time Window Restriction
                </Label>
                <p className="text-xs text-muted-foreground">
                  Restrict when this chore can be completed
                </p>
              </div>
              <Switch
                id="use-time-window-assignment"
                checked={useTimeWindow}
                onCheckedChange={(checked) => {
                  setUseTimeWindow(checked)
                  if (!checked) {
                    setTimeWindowStart('')
                    setTimeWindowEnd('')
                  }
                }}
              />
            </div>
            
            {useTimeWindow && (
              <div className="space-y-4 pl-4 border-l-2 border-primary">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {child?.name} will only be able to complete this chore during the specified time window
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="time-window-start-assignment">Start Time</Label>
                    <Input
                      id="time-window-start-assignment"
                      type="time"
                      value={timeWindowStart}
                      onChange={(e) => setTimeWindowStart(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="time-window-end-assignment">End Time</Label>
                    <Input
                      id="time-window-end-assignment"
                      type="time"
                      value={timeWindowEnd}
                      onChange={(e) => setTimeWindowEnd(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {timeWindowStart && timeWindowEnd && (
                  <p className="text-xs text-muted-foreground">
                    This chore can only be completed between {timeWindowStart} and {timeWindowEnd}
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {child && choreCategories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-semibold">Custom Category Points for {child.name}</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Override the default category points for this child (optional)
              </p>
              <div className="space-y-2">
                {choreCategories.map((category) => {
                  const override = categoryPointOverrides.find(
                    cpo => cpo.childId === child.id && cpo.categoryId === category.id
                  )
                  
                  return (
                    <Card key={category.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Badge
                            style={{
                              backgroundColor: category.color,
                              color: 'white',
                            }}
                            className="flex-shrink-0"
                          >
                            {category.name}
                          </Badge>
                          <span className="text-sm text-muted-foreground flex-1">
                            Default: {category.points} pts
                          </span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder={category.points.toString()}
                              value={override?.points ?? ''}
                              onChange={(e) => {
                                const value = e.target.value
                                setCategoryPointOverrides(current => {
                                  const filtered = current.filter(
                                    cpo => !(cpo.childId === child.id && cpo.categoryId === category.id)
                                  )
                                  if (value === '') {
                                    return filtered
                                  }
                                  return [
                                    ...filtered,
                                    {
                                      childId: child.id,
                                      categoryId: category.id,
                                      points: parseInt(value) || 0,
                                    },
                                  ]
                                })
                              }}
                              className="w-24"
                              min="0"
                            />
                            <span className="text-sm text-muted-foreground">pts</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
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
