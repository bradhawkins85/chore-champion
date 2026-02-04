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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSubscription } from '@/hooks/use-subscription'
import { Child, CalendarRefreshInterval } from '@/lib/types'
import { AVATAR_COLORS } from '@/lib/helpers'

interface ChildDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (child: Omit<Child, 'id' | 'createdAt' | 'totalPoints'>) => void
  editChild?: Child
}

export function ChildDialog({ open, onOpenChange, onSave, editChild }: ChildDialogProps) {
  const { subscription } = useSubscription()
  const [name, setName] = useState(editChild?.name || '')
  const [avatarColor, setAvatarColor] = useState(
    editChild?.avatarColor || AVATAR_COLORS[0]
  )
  const [icsUrl, setIcsUrl] = useState(editChild?.icsUrl || '')
  const [calendarAutoRefresh, setCalendarAutoRefresh] = useState(
    editChild?.calendarAutoRefresh ?? false
  )
  const [calendarRefreshInterval, setCalendarRefreshInterval] = useState<CalendarRefreshInterval>(
    editChild?.calendarRefreshInterval || '15min'
  )
  const [calendarShowTimes, setCalendarShowTimes] = useState(
    editChild?.calendarShowTimes ?? true
  )
  const pricePerChildAUD = subscription?.plan?.pricePerChildAUD ?? 0
  const showBillingWarning = !editChild && subscription?.plan?.tier === 'paid'

  useEffect(() => {
    if (open) {
      setName(editChild?.name || '')
      setAvatarColor(editChild?.avatarColor || AVATAR_COLORS[0])
      setIcsUrl(editChild?.icsUrl || '')
      setCalendarAutoRefresh(editChild?.calendarAutoRefresh ?? false)
      setCalendarRefreshInterval(editChild?.calendarRefreshInterval || '15min')
      setCalendarShowTimes(editChild?.calendarShowTimes ?? true)
    }
  }, [open, editChild])

  const handleSave = () => {
    if (!name.trim()) return

    onSave({
      name: name.trim(),
      avatarColor,
      icsUrl: icsUrl.trim() || undefined,
      calendarAutoRefresh,
      calendarRefreshInterval,
      calendarShowTimes,
    })

    if (!editChild) {
      setName('')
      setAvatarColor(AVATAR_COLORS[0])
      setIcsUrl('')
      setCalendarAutoRefresh(false)
      setCalendarRefreshInterval('15min')
      setCalendarShowTimes(true)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editChild ? 'Edit Child' : 'Add New Child'}</DialogTitle>
          <DialogDescription>Add a child to your family chore tracker</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {showBillingWarning && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Adding a child will increase your subscription by {pricePerChildAUD > 0
                ? `$${pricePerChildAUD.toFixed(2)} AUD per child`
                : 'the per-child rate'}.
              {' '}The additional charge will be prorated on your next billing cycle.
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="child-name">Child's Name</Label>
            <Input
              id="child-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Emma"
            />
          </div>
          <div className="grid gap-2">
            <Label>Avatar Color</Label>
            <div className="flex gap-3">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setAvatarColor(color)}
                  className={`w-12 h-12 rounded-full transition-transform ${
                    avatarColor === color ? 'ring-4 ring-ring scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ics-url">Calendar Feed URL (Optional)</Label>
            <Input
              id="ics-url"
              value={icsUrl}
              onChange={(e) => setIcsUrl(e.target.value)}
              placeholder="https://calendar.example.com/events.ics"
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Add an ICS calendar feed to display events on the child's main page
            </p>
          </div>
          {icsUrl && (
            <>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-refresh">Auto-refresh calendar feed</Label>
                  <Switch
                    id="auto-refresh"
                    checked={calendarAutoRefresh}
                    onCheckedChange={setCalendarAutoRefresh}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically refresh the calendar feed at regular intervals
                </p>
              </div>
              {calendarAutoRefresh && (
                <div className="grid gap-2">
                  <Label htmlFor="refresh-interval">Refresh Interval</Label>
                  <Select
                    value={calendarRefreshInterval}
                    onValueChange={(value) => setCalendarRefreshInterval(value as CalendarRefreshInterval)}
                  >
                    <SelectTrigger id="refresh-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5min">Every 5 minutes</SelectItem>
                      <SelectItem value="15min">Every 15 minutes</SelectItem>
                      <SelectItem value="30min">Every 30 minutes</SelectItem>
                      <SelectItem value="1hour">Every hour</SelectItem>
                      <SelectItem value="6hours">Every 6 hours</SelectItem>
                      <SelectItem value="12hours">Every 12 hours</SelectItem>
                      <SelectItem value="24hours">Every 24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How often to check for calendar updates
                  </p>
                </div>
              )}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-times">Show event times in calendar</Label>
                  <Switch
                    id="show-times"
                    checked={calendarShowTimes}
                    onCheckedChange={setCalendarShowTimes}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Display event times in the calendar view, or group by date only
                </p>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{editChild ? 'Save Changes' : 'Add Child'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
