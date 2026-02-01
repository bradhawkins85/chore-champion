import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SchoolHoliday, SchoolHolidayCountdownSettings, SchoolHolidayCountdownMode } from '@/lib/types'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Plus, Trash, CalendarBlank, PencilSimple } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from '@phosphor-icons/react'

interface SchoolHolidaySettingsProps {
  holidays: SchoolHoliday[]
  displaySettings: SchoolHolidayCountdownSettings
  onUpdateDisplaySettings: (settings: SchoolHolidayCountdownSettings) => void
  onAdd: (holiday: Omit<SchoolHoliday, 'id' | 'createdAt'>) => void
  onEdit: (id: string, holiday: Omit<SchoolHoliday, 'id' | 'createdAt'>) => void
  onDelete: (id: string) => void
}

export function SchoolHolidaySettings({
  holidays,
  displaySettings,
  onUpdateDisplaySettings,
  onAdd,
  onEdit,
  onDelete,
}: SchoolHolidaySettingsProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<SchoolHoliday | null>(null)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleOpenDialog = (holiday?: SchoolHoliday) => {
    if (holiday) {
      setEditingHoliday(holiday)
      setName(holiday.name)
      setStartDate(format(new Date(holiday.startDate), 'yyyy-MM-dd'))
      setEndDate(format(new Date(holiday.endDate), 'yyyy-MM-dd'))
    } else {
      setEditingHoliday(null)
      setName('')
      setStartDate('')
      setEndDate('')
    }
    setShowDialog(true)
  }

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a holiday name')
      return
    }

    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
      toast.error('Start date must be before or equal to end date')
      return
    }

    const holidayData = {
      name: name.trim(),
      startDate: start.getTime(),
      endDate: end.getTime(),
    }

    if (editingHoliday) {
      onEdit(editingHoliday.id, holidayData)
    } else {
      onAdd(holidayData)
    }

    setShowDialog(false)
    setName('')
    setStartDate('')
    setEndDate('')
    setEditingHoliday(null)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this school holiday?')) {
      onDelete(id)
    }
  }

  const sortedHolidays = [...holidays].sort((a, b) => a.startDate - b.startDate)
  const now = Date.now()

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarBlank className="h-5 w-5" />
                School Holiday Calendar
              </CardTitle>
              <CardDescription>
                Manage school holiday dates to control chore visibility
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Holiday
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Set up school holidays here. When editing chores, you can mark them as "Inactive On School Holidays" or "Only On School Holidays" to control when they appear.
            </AlertDescription>
          </Alert>

          {sortedHolidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarBlank className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No school holidays configured</p>
              <p className="text-sm">Add holidays to control chore schedules</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedHolidays.map((holiday) => {
                const isPast = holiday.endDate < now
                const isCurrent = holiday.startDate <= now && holiday.endDate >= now
                const isFuture = holiday.startDate > now

                return (
                  <Card key={holiday.id} className={isPast ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{holiday.name}</h3>
                            {isCurrent && (
                              <Badge variant="default" className="text-xs">
                                Active Now
                              </Badge>
                            )}
                            {isFuture && (
                              <Badge variant="outline" className="text-xs">
                                Upcoming
                              </Badge>
                            )}
                            {isPast && (
                              <Badge variant="secondary" className="text-xs">
                                Past
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(holiday.startDate), 'MMM d, yyyy')} -{' '}
                            {format(new Date(holiday.endDate), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(holiday)}
                          >
                            <PencilSimple className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(holiday.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarBlank className="h-5 w-5" />
            School Holiday Countdown
          </CardTitle>
          <CardDescription>
            Show a holiday countdown card on the main screen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Countdown</Label>
              <p className="text-sm text-muted-foreground">
                Display the school holiday countdown next to the weather
              </p>
            </div>
            <Switch
              checked={displaySettings.enabled}
              onCheckedChange={(enabled) => onUpdateDisplaySettings({ ...displaySettings, enabled })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="holiday-countdown-mode">Countdown Type</Label>
            <Select
              value={displaySettings.countdownMode}
              onValueChange={(value) =>
                onUpdateDisplaySettings({
                  ...displaySettings,
                  countdownMode: value as SchoolHolidayCountdownMode,
                })
              }
              disabled={!displaySettings.enabled}
            >
              <SelectTrigger id="holiday-countdown-mode">
                <SelectValue placeholder="Select countdown type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar-days">Calendar days until holidays</SelectItem>
                <SelectItem value="school-days">School days until holidays</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Remaining Days During Holidays</Label>
              <p className="text-sm text-muted-foreground">
                Display how many holiday days are left when school is out
              </p>
            </div>
            <Switch
              checked={displaySettings.showRemainingDays}
              onCheckedChange={(showRemainingDays) =>
                onUpdateDisplaySettings({ ...displaySettings, showRemainingDays })
              }
              disabled={!displaySettings.enabled}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? 'Edit School Holiday' : 'Add School Holiday'}
            </DialogTitle>
            <DialogDescription>
              {editingHoliday
                ? 'Update the school holiday details'
                : 'Add a new school holiday period'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="holiday-name">Holiday Name</Label>
              <Input
                id="holiday-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Winter Break, Spring Break"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingHoliday ? 'Update' : 'Add'} Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
