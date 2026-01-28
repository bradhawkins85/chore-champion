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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkle, User } from '@phosphor-icons/react'
import { Chore, ChoreFrequency, ChoreTimeOfDay, ChoreCompletionType, Child, ChoreAssignment, DayOfWeek } from '@/lib/types'
import { choreTemplates, choreCategories, getTemplatesByCategory, ChoreTemplate } from '@/lib/choreTemplates'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'

interface ChoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (chore: Omit<Chore, 'id' | 'createdAt'>) => void
  editChore?: Chore
  childrenList?: Child[]
  assignments?: ChoreAssignment[]
  onAssignChild?: (childId: string, choreId: string) => void
  onUnassignChild?: (assignmentId: string) => void
}

export function ChoreDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  editChore,
  childrenList = [],
  assignments = [],
  onAssignChild,
  onUnassignChild,
}: ChoreDialogProps) {
  const [name, setName] = useState(editChore?.name || '')
  const [description, setDescription] = useState(editChore?.description || '')
  const [points, setPoints] = useState(editChore?.points.toString() || '10')
  const [frequency, setFrequency] = useState<ChoreFrequency>(editChore?.frequency || 'daily')
  const [timeOfDay, setTimeOfDay] = useState<ChoreTimeOfDay>(editChore?.timeOfDay || 'anytime')
  const [completionType, setCompletionType] = useState<ChoreCompletionType>(editChore?.completionType || 'individual')
  const [startDate, setStartDate] = useState(
    editChore?.startDate ? new Date(editChore.startDate).toISOString().split('T')[0] : ''
  )
  const [endDate, setEndDate] = useState(
    editChore?.endDate ? new Date(editChore.endDate).toISOString().split('T')[0] : ''
  )
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(editChore?.daysOfWeek || [])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const weekDays: { value: DayOfWeek; label: string }[] = [
    { value: 'monday', label: 'Mon' },
    { value: 'tuesday', label: 'Tue' },
    { value: 'wednesday', label: 'Wed' },
    { value: 'thursday', label: 'Thu' },
    { value: 'friday', label: 'Fri' },
    { value: 'saturday', label: 'Sat' },
    { value: 'sunday', label: 'Sun' },
  ]

  useEffect(() => {
    if (editChore) {
      setName(editChore.name)
      setDescription(editChore.description)
      setPoints(editChore.points.toString())
      setFrequency(editChore.frequency)
      setTimeOfDay(editChore.timeOfDay)
      setCompletionType(editChore.completionType)
      setStartDate(editChore.startDate ? new Date(editChore.startDate).toISOString().split('T')[0] : '')
      setEndDate(editChore.endDate ? new Date(editChore.endDate).toISOString().split('T')[0] : '')
      setDaysOfWeek(editChore.daysOfWeek || [])
    }
  }, [editChore])

  const filteredTemplates = getTemplatesByCategory(selectedCategory).filter((template) =>
    searchQuery === '' ||
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleTemplateSelect = (template: ChoreTemplate) => {
    setName(template.name)
    setDescription(template.description)
    setPoints(template.points.toString())
    setFrequency(template.frequency)
    setTimeOfDay(template.timeOfDay || 'anytime')
    setDaysOfWeek([])
  }

  const toggleDayOfWeek = (day: DayOfWeek) => {
    setDaysOfWeek((current) => {
      if (current.includes(day)) {
        return current.filter((d) => d !== day)
      } else {
        return [...current, day]
      }
    })
  }

  const handleSave = () => {
    if (!name.trim()) return

    const choreData: Omit<Chore, 'id' | 'createdAt'> = {
      name: name.trim(),
      description: description.trim(),
      points: parseInt(points) || 10,
      frequency,
      timeOfDay,
      completionType,
    }

    if (daysOfWeek.length > 0) {
      choreData.daysOfWeek = daysOfWeek
    }

    if (startDate) {
      const startDateTime = new Date(startDate)
      startDateTime.setHours(0, 0, 0, 0)
      choreData.startDate = startDateTime.getTime()
    }

    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      choreData.endDate = endDateTime.getTime()
    }

    onSave(choreData)

    if (!editChore) {
      setName('')
      setDescription('')
      setPoints('10')
      setFrequency('daily')
      setTimeOfDay('anytime')
      setCompletionType('individual')
      setStartDate('')
      setEndDate('')
      setDaysOfWeek([])
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editChore ? 'Edit Chore' : 'Add New Chore'}</DialogTitle>
          <DialogDescription>
            {editChore ? 'Update the chore details' : 'Choose from templates or create a custom chore'}
          </DialogDescription>
        </DialogHeader>

        {!editChore && (
          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">
                <Sparkle className="h-4 w-4 mr-2" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="custom">Custom Chore</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="search">Search Templates</Label>
                  <Input
                    id="search"
                    placeholder="Search chores..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {choreCategories.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid gap-2">
                    {filteredTemplates.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No templates found. Try a different search or category.
                      </div>
                    ) : (
                      filteredTemplates.map((template, index) => (
                        <Card
                          key={index}
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-2xl">{template.icon}</span>
                                  <h4 className="font-fredoka font-semibold">{template.name}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {template.description}
                                </p>
                                <div className="flex gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {template.frequency}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {template.points} pts
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {(name || description || points !== '10') && (
                  <div className="border-t pt-4">
                    <h4 className="font-fredoka font-semibold mb-2">Selected Template</h4>
                    <Card>
                      <CardContent className="p-4">
                        <div className="grid gap-2">
                          <div className="flex justify-between">
                            <span className="font-medium">{name}</span>
                            <span className="text-sm text-muted-foreground">{points} points</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{description}</p>
                          <Badge variant="secondary" className="w-fit">
                            {frequency}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Chore Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Make your bed"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Straighten sheets, fluff pillows"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    min="1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as ChoreFrequency)}>
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Days of Week (optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {weekDays.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={daysOfWeek.includes(day.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleDayOfWeek(day.value)}
                        className="font-fredoka"
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {daysOfWeek.length === 0 
                      ? 'Leave empty to show every day' 
                      : `Chore will only show on: ${daysOfWeek.map(d => weekDays.find(wd => wd.value === d)?.label).join(', ')}`
                    }
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time-of-day">Time of Day</Label>
                  <Select value={timeOfDay} onValueChange={(v) => setTimeOfDay(v as ChoreTimeOfDay)}>
                    <SelectTrigger id="time-of-day">
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
                <div className="grid gap-2">
                  <Label htmlFor="completion-type">Completion Type</Label>
                  <Select value={completionType} onValueChange={(v) => setCompletionType(v as ChoreCompletionType)}>
                    <SelectTrigger id="completion-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="shareable">Shareable</SelectItem>
                      <SelectItem value="once-per-day">Once Per Day</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {completionType === 'individual' && 'Each child completes independently for full points'}
                    {completionType === 'shareable' && 'Children can work together and share points equally'}
                    {completionType === 'once-per-day' && 'Only the first child to complete gets the points'}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="start-date">Start Date (optional)</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  {startDate && (
                    <p className="text-xs text-muted-foreground">
                      Chore will become available on this date
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end-date">End Date (optional)</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                  />
                  {endDate && (
                    <p className="text-xs text-muted-foreground">
                      Chore will no longer be available after this date
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {editChore && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Chore Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Make your bed"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Straighten sheets, fluff pillows"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                min="1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as ChoreFrequency)}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Days of Week (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {weekDays.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={daysOfWeek.includes(day.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDayOfWeek(day.value)}
                    className="font-fredoka"
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {daysOfWeek.length === 0 
                  ? 'Leave empty to show every day' 
                  : `Chore will only show on: ${daysOfWeek.map(d => weekDays.find(wd => wd.value === d)?.label).join(', ')}`
                }
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time-of-day">Time of Day</Label>
              <Select value={timeOfDay} onValueChange={(v) => setTimeOfDay(v as ChoreTimeOfDay)}>
                <SelectTrigger id="time-of-day">
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
            <div className="grid gap-2">
              <Label htmlFor="completion-type-edit">Completion Type</Label>
              <Select value={completionType} onValueChange={(v) => setCompletionType(v as ChoreCompletionType)}>
                <SelectTrigger id="completion-type-edit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="shareable">Shareable</SelectItem>
                  <SelectItem value="once-per-day">Once Per Day</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {completionType === 'individual' && 'Each child completes independently for full points'}
                {completionType === 'shareable' && 'Children can work together and share points equally'}
                {completionType === 'once-per-day' && 'Only the first child to complete gets the points'}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="start-date">Start Date (optional)</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {startDate && (
                <p className="text-xs text-muted-foreground">
                  Chore will become available on this date
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-date">End Date (optional)</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
              {endDate && (
                <p className="text-xs text-muted-foreground">
                  Chore will no longer be available after this date
                </p>
              )}
            </div>
          </div>
        )}

        {editChore && childrenList.length > 0 && onAssignChild && onUnassignChild && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-fredoka font-semibold">Assign to Children</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Select which children should see this chore
              </p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {childrenList.map((child) => {
                  const assignment = assignments.find(
                    (a) => a.childId === child.id && a.choreId === editChore.id
                  )
                  const isAssigned = !!assignment

                  return (
                    <Card
                      key={child.id}
                      className="p-3 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => {
                        if (isAssigned && assignment) {
                          onUnassignChild(assignment.id)
                        } else {
                          onAssignChild(child.id, editChore.id)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isAssigned} />
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-fredoka font-bold"
                          style={{ backgroundColor: child.avatarColor }}
                        >
                          {child.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{child.name}</span>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {editChore ? 'Save Changes' : 'Add Chore'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
