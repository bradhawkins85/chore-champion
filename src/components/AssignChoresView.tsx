import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Star, CalendarBlank, CalendarCheck, PencilSimple, Repeat } from '@phosphor-icons/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Child, Chore, ChoreAssignment, DayOfWeek, RepeatPattern, Category, ChoreTimeOfDay, TimeWindow, ChorePointOverride, CategoryPointOverride } from '@/lib/types'
import { isChoreActive } from '@/lib/helpers'
import { EditAssignmentDialog } from '@/components/EditAssignmentDialog'

interface AssignChoresViewProps {
  child: Child
  allChores: Chore[]
  assignments: ChoreAssignment[]
  categories: Category[]
  onBack: () => void
  onAssign: (choreId: string) => void
  onUnassign: (assignmentId: string) => void
  onEditAssignment: (
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
}

export function AssignChoresView({
  child,
  allChores,
  assignments,
  categories,
  onBack,
  onAssign,
  onUnassign,
  onEditAssignment,
}: AssignChoresViewProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedChoreId, setSelectedChoreId] = useState<string>('')
  const [editingAssignment, setEditingAssignment] = useState<ChoreAssignment | null>(null)
  const [editingChoreName, setEditingChoreName] = useState('')

  const assignedChoreIds = new Set(
    assignments.filter((a) => a.childId === child.id).map((a) => a.choreId)
  )

  const assignedChores = allChores.filter((c) => assignedChoreIds.has(c.id))
  const availableChores = allChores.filter((c) => !assignedChoreIds.has(c.id))

  const handleAssign = () => {
    if (selectedChoreId) {
      onAssign(selectedChoreId)
      setSelectedChoreId('')
      setAssignDialogOpen(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDaysOfWeek = (days: DayOfWeek[] | undefined) => {
    if (!days || days.length === 0) return 'Every day'
    if (days.length === 7) return 'Every day'
    return days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')
  }

  const handleEditAssignment = (assignment: ChoreAssignment, choreName: string) => {
    setEditingAssignment(assignment)
    setEditingChoreName(choreName)
  }

  const getChoreCategories = (choreId: string) => {
    const chore = allChores.find(c => c.id === choreId)
    if (!chore || !chore.categoryPoints) return []
    
    return chore.categoryPoints.map(cp => {
      const category = categories.find(cat => cat.id === cp.categoryId)
      return category ? {
        id: category.id,
        name: category.name,
        color: category.color,
        points: cp.points,
      } : null
    }).filter(Boolean) as { id: string; name: string; color: string; points: number }[]
  }

  const editingChore = editingAssignment
    ? allChores.find((c) => c.id === editingAssignment.choreId)
    : undefined

  return (
    <div className="mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="outline" onClick={onBack} className="mb-4">
              ← Back to Children
            </Button>
            <h2 className="text-3xl font-fredoka font-bold">
              {child.name}'s Assigned Chores
            </h2>
            <p className="text-muted-foreground mt-1">
              {assignedChores.length} {assignedChores.length === 1 ? 'chore' : 'chores'} assigned · Only assigned chores will appear in child mode
            </p>
          </div>
          <Button onClick={() => setAssignDialogOpen(true)} size="lg">
            Assign Chore
          </Button>
        </div>

        {assignedChores.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-muted-foreground mb-2">
              No chores assigned to {child.name} yet
            </p>
            <p className="text-sm text-muted-foreground">
              Assign chores to make them visible in {child.name}'s child mode view. Only assigned chores will appear when {child.name} logs in.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead className="font-semibold">Chore</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Points</TableHead>
                  <TableHead className="font-semibold">Frequency</TableHead>
                  <TableHead className="font-semibold">Schedule</TableHead>
                  <TableHead className="font-semibold">Categories</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedChores.map((chore) => {
                  const assignment = assignments.find(
                    (a) => a.childId === child.id && a.choreId === chore.id
                  )
                  const active = assignment ? isChoreActive(assignment) : false
                  return (
                    <TableRow key={chore.id} className={!active ? 'opacity-60' : ''}>
                      <TableCell>
                        <Checkbox checked disabled />
                      </TableCell>
                      <TableCell>
                        <div className="font-fredoka font-semibold">{chore.name}</div>
                        {chore.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 max-w-xs line-clamp-2">
                            {chore.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {!active && (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        {active && (
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star weight="fill" className="h-3.5 w-3.5 text-accent" />
                          <span className="font-fredoka font-semibold">{chore.points}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm capitalize">{chore.frequency}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {assignment?.daysOfWeek && assignment.daysOfWeek.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDaysOfWeek(assignment.daysOfWeek)}</span>
                            </div>
                          )}
                          {assignment?.repeatPattern && (
                            <div className="flex items-center gap-1">
                              <Repeat className="h-3 w-3" />
                              <span>Every {assignment.repeatPattern.interval} week{assignment.repeatPattern.interval > 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {assignment?.startDate && (
                            <div className="flex items-center gap-1">
                              <CalendarBlank className="h-3 w-3" />
                              <span>{formatDate(assignment.startDate)}</span>
                            </div>
                          )}
                          {assignment?.endDate && (
                            <div className="flex items-center gap-1">
                              <CalendarCheck className="h-3 w-3" />
                              <span>{formatDate(assignment.endDate)}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {chore.categoryIds && chore.categoryIds.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {chore.categoryIds.map((categoryId) => {
                              const category = categories.find(c => c.id === categoryId)
                              if (!category) return null
                              return (
                                <Badge
                                  key={categoryId}
                                  variant="outline"
                                  className="text-xs px-1.5 py-0 border"
                                  style={{
                                    backgroundColor: `${category.color}20`,
                                    borderColor: category.color,
                                    color: category.color,
                                  }}
                                >
                                  {category.name}
                                </Badge>
                              )
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => assignment && handleEditAssignment(assignment, chore.name)}
                            aria-label={`Edit ${chore.name} assignment`}
                          >
                            <PencilSimple className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:text-destructive"
                            onClick={() => assignment && onUnassign(assignment.id)}
                            aria-label={`Remove ${chore.name}`}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Chore to {child.name}</DialogTitle>
            <DialogDescription>
              Select a chore from your available chores
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="chore-select">Available Chores</Label>
            <Select value={selectedChoreId} onValueChange={setSelectedChoreId}>
              <SelectTrigger id="chore-select" className="mt-2">
                <SelectValue placeholder="Select a chore" />
              </SelectTrigger>
              <SelectContent>
                {availableChores.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    All chores are assigned
                  </div>
                ) : (
                  availableChores.map((chore) => (
                    <SelectItem key={chore.id} value={chore.id}>
                      {chore.name} ({chore.points} pts - {chore.frequency})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedChoreId}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditAssignmentDialog
        assignment={editingAssignment}
        choreName={editingChoreName}
        open={!!editingAssignment}
        onClose={() => setEditingAssignment(null)}
        onSave={onEditAssignment}
        chore={editingChore}
        child={child}
        chorePoints={editingAssignment ? allChores.find(c => c.id === editingAssignment.choreId)?.points : 10}
        choreCategories={editingAssignment ? getChoreCategories(editingAssignment.choreId) : []}
        categories={categories}
      />
      </div>
    </div>
  )
}
