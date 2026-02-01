import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PencilSimple, Trash, ArrowsDownUp } from '@phosphor-icons/react'
import { Child, ChildAvailabilityEntry, ChildAvailabilityScheduleType, ChildAvailabilityType } from '@/lib/types'
import { toast } from 'sonner'

interface ChildAvailabilityScheduleProps {
  childrenList: Child[]
  entries: ChildAvailabilityEntry[]
  onAddEntry: (entry: Omit<ChildAvailabilityEntry, 'id'>) => void
  onUpdateEntry: (id: string, entry: Omit<ChildAvailabilityEntry, 'id'>) => void
  onDeleteEntry: (id: string) => void
}

const formatDateInput = (timestamp: number): string => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatTimeInput = (timestamp: number): string => {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

const formatDateTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}

const parseDateTime = (dateValue: string, timeValue: string): number => {
  return new Date(`${dateValue}T${timeValue}`).getTime()
}

export function ChildAvailabilitySchedule({
  childrenList,
  entries,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}: ChildAvailabilityScheduleProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [childId, setChildId] = useState(childrenList[0]?.id || '')
  const [type, setType] = useState<ChildAvailabilityType>('home')
  const [scheduleType, setScheduleType] = useState<ChildAvailabilityScheduleType>('one-time')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('17:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('09:00')
  const [intervalWeeks, setIntervalWeeks] = useState(2)
  const [note, setNote] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [filterChildId, setFilterChildId] = useState('all')
  const [filterType, setFilterType] = useState<'all' | ChildAvailabilityType>('all')
  const [filterSchedule, setFilterSchedule] = useState<'all' | ChildAvailabilityScheduleType>('all')
  const [sortKey, setSortKey] = useState<'start' | 'child' | 'type'>('start')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (!childId && childrenList.length > 0) {
      setChildId(childrenList[0].id)
    }
  }, [childId, childrenList])

  const resetForm = () => {
    setEditingId(null)
    setChildId(childrenList[0]?.id || '')
    setType('home')
    setScheduleType('one-time')
    setStartDate('')
    setStartTime('17:00')
    setEndDate('')
    setEndTime('09:00')
    setIntervalWeeks(2)
    setNote('')
  }

  const handleEditEntry = (entry: ChildAvailabilityEntry) => {
    setEditingId(entry.id)
    setChildId(entry.childId)
    setType(entry.type)
    setScheduleType(entry.scheduleType)
    setStartDate(formatDateInput(entry.startDate))
    setStartTime(formatTimeInput(entry.startDate))
    setEndDate(formatDateInput(entry.endDate))
    setEndTime(formatTimeInput(entry.endDate))
    setIntervalWeeks(entry.repeatPattern?.interval || 2)
    setNote(entry.note || '')
  }

  const handleSubmit = () => {
    if (!childId) {
      toast.error('Select a child for this schedule')
      return
    }
    if (!startDate || !endDate) {
      toast.error('Select a start and end date')
      return
    }

    const startTimestamp = parseDateTime(startDate, startTime)
    const endTimestamp = parseDateTime(endDate, endTime)

    if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
      toast.error('Enter a valid date and time')
      return
    }
    if (endTimestamp <= startTimestamp) {
      toast.error('End time must be after the start time')
      return
    }

    const entryPayload: Omit<ChildAvailabilityEntry, 'id'> = {
      childId,
      type,
      scheduleType,
      startDate: startTimestamp,
      endDate: endTimestamp,
      repeatPattern: scheduleType === 'recurring'
        ? { interval: Math.max(intervalWeeks, 1), unit: 'weeks', anchorDate: startTimestamp }
        : undefined,
      note: note.trim() || undefined,
    }

    if (editingId) {
      onUpdateEntry(editingId, entryPayload)
    } else {
      onAddEntry(entryPayload)
    }

    resetForm()
  }

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filterChildId !== 'all' && entry.childId !== filterChildId) return false
      if (filterType !== 'all' && entry.type !== filterType) return false
      if (filterSchedule !== 'all' && entry.scheduleType !== filterSchedule) return false

      if (searchQuery.trim()) {
        const childName = childrenList.find((child) => child.id === entry.childId)?.name || ''
        const query = searchQuery.toLowerCase()
        const noteText = entry.note?.toLowerCase() || ''
        return childName.toLowerCase().includes(query) || noteText.includes(query)
      }

      return true
    })
  }, [entries, filterChildId, filterSchedule, filterType, searchQuery, childrenList])

  const sortedEntries = useMemo(() => {
    const sorted = [...filteredEntries]
    sorted.sort((a, b) => {
      let compareValue = 0
      if (sortKey === 'start') {
        compareValue = a.startDate - b.startDate
      } else if (sortKey === 'type') {
        compareValue = a.type.localeCompare(b.type)
      } else {
        const childA = childrenList.find((child) => child.id === a.childId)?.name || ''
        const childB = childrenList.find((child) => child.id === b.childId)?.name || ''
        compareValue = childA.localeCompare(childB)
      }

      return sortDirection === 'asc' ? compareValue : -compareValue
    })

    return sorted
  }, [filteredEntries, sortKey, sortDirection, childrenList])

  const hasChildren = childrenList.length > 0

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl font-fredoka">Child Availability Schedule</CardTitle>
        <p className="text-sm text-muted-foreground">
          Track when children are home or away so chores only appear when they are available.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="availability-child">Child</Label>
              <Select value={childId} onValueChange={setChildId} disabled={!hasChildren}>
                <SelectTrigger id="availability-child">
                  <SelectValue placeholder={hasChildren ? 'Select child' : 'Add a child first'} />
                </SelectTrigger>
                <SelectContent>
                  {childrenList.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="availability-type">Availability Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as ChildAvailabilityType)}>
                <SelectTrigger id="availability-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="away">Away</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="availability-schedule">Schedule</Label>
              <Select value={scheduleType} onValueChange={(value) => setScheduleType(value as ChildAvailabilityScheduleType)}>
                <SelectTrigger id="availability-schedule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-time">One-time range</SelectItem>
                  <SelectItem value="recurring">Recurring every N weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scheduleType === 'recurring' && (
              <div className="grid gap-2">
                <Label htmlFor="availability-interval">Repeat Interval (weeks)</Label>
                <Input
                  id="availability-interval"
                  type="number"
                  min={1}
                  value={intervalWeeks}
                  onChange={(event) => setIntervalWeeks(Number(event.target.value))}
                />
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Start</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>End</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="availability-note">Notes (optional)</Label>
              <Textarea
                id="availability-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Shared custody, summer schedule, etc."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSubmit} disabled={!hasChildren}>
            {editingId ? 'Save Schedule' : 'Add Schedule'}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={resetForm}>
              Cancel Edit
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="grid gap-2">
              <Label htmlFor="availability-search">Search</Label>
              <Input
                id="availability-search"
                placeholder="Search by child or note"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="availability-filter-child">Child</Label>
              <Select value={filterChildId} onValueChange={setFilterChildId}>
                <SelectTrigger id="availability-filter-child">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All children</SelectItem>
                  {childrenList.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="availability-filter-type">Type</Label>
              <Select value={filterType} onValueChange={(value) => setFilterType(value as 'all' | ChildAvailabilityType)}>
                <SelectTrigger id="availability-filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="away">Away</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="availability-filter-schedule">Schedule</Label>
              <Select value={filterSchedule} onValueChange={(value) => setFilterSchedule(value as 'all' | ChildAvailabilityScheduleType)}>
                <SelectTrigger id="availability-filter-schedule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All schedules</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="availability-sort">Sort</Label>
              <div className="flex gap-2">
                <Select value={sortKey} onValueChange={(value) => setSortKey(value as 'start' | 'child' | 'type')}>
                  <SelectTrigger id="availability-sort" className="min-w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">Start date</SelectItem>
                    <SelectItem value="child">Child name</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  aria-label="Toggle sort direction"
                >
                  <ArrowsDownUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No availability schedules found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedEntries.map((entry) => {
                    const childName = childrenList.find((child) => child.id === entry.childId)?.name || 'Unknown'
                    const repeatLabel = entry.scheduleType === 'recurring'
                      ? `Every ${entry.repeatPattern?.interval || 1} week${entry.repeatPattern?.interval === 1 ? '' : 's'}`
                      : 'One-time'
                    return (
                      <TableRow key={entry.id} className="border-b">
                        <TableCell className="font-medium">{childName}</TableCell>
                        <TableCell>
                          <Badge variant={entry.type === 'home' ? 'secondary' : 'outline'}>
                            {entry.type === 'home' ? 'Home' : 'Away'}
                          </Badge>
                        </TableCell>
                        <TableCell>{repeatLabel}</TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            <div>{formatDateTime(entry.startDate)}</div>
                            <div>to {formatDateTime(entry.endDate)}</div>
                          </div>
                        </TableCell>
                        <TableCell>{entry.note || '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditEntry(entry)}
                            >
                              <PencilSimple className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onDeleteEntry(entry.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
