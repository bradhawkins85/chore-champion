import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Star, CalendarBlank, CalendarCheck, PencilSimple, Repeat } from '@phosphor-icons/react'
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
        <div className="grid gap-4">
          {assignedChores.map((chore) => {
            const assignment = assignments.find(
              (a) => a.childId === child.id && a.choreId === chore.id
            )
            const active = assignment ? isChoreActive(assignment) : false
            return (
              <Card key={chore.id} className={!active ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox checked disabled />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg font-fredoka">
                            {chore.name}
                          </CardTitle>
                          {!active && (
                            <Badge variant="outline" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {chore.categoryIds && chore.categoryIds.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {chore.categoryIds.map((categoryId) => {
                              const category = categories.find(c => c.id === categoryId)
                              if (!category) return null
                              return (
                                <Badge
                                  key={categoryId}
                                  variant="outline"
                                  className="font-fredoka font-semibold px-2.5 py-0.5 border-2"
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
                        {chore.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {chore.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => assignment && handleEditAssignment(assignment, chore.name)}
                      >
                        <PencilSimple className="h-4 w-4 mr-1" />
                        Manage Chore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => assignment && onUnassign(assignment.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star weight="fill" className="h-4 w-4 text-accent" />
                      <Badge variant="secondary" className="font-fredoka">
                        {chore.points} pts
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="capitalize">{chore.frequency}</span>
                    </div>
                    {assignment?.daysOfWeek && assignment.daysOfWeek.length > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDaysOfWeek(assignment.daysOfWeek)}</span>
                      </div>
                    )}
                    {assignment?.repeatPattern && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Repeat className="h-4 w-4" />
                        <span>Every {assignment.repeatPattern.interval} week{assignment.repeatPattern.interval > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {assignment?.startDate && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <CalendarBlank className="h-4 w-4" />
                        <span>Starts {formatDate(assignment.startDate)}</span>
                      </div>
                    )}
                    {assignment?.endDate && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <CalendarCheck className="h-4 w-4" />
                        <span>Ends {formatDate(assignment.endDate)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
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
        child={child}
        chorePoints={editingAssignment ? allChores.find(c => c.id === editingAssignment.choreId)?.points : 10}
        choreCategories={editingAssignment ? getChoreCategories(editingAssignment.choreId) : []}
        categories={categories}
      />
      </div>
    </div>
  )
}
