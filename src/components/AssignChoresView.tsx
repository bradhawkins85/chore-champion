import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Star } from '@phosphor-icons/react'
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
import { Child, Chore, ChoreAssignment } from '@/lib/types'

interface AssignChoresViewProps {
  child: Child
  allChores: Chore[]
  assignments: ChoreAssignment[]
  onBack: () => void
  onAssign: (choreId: string) => void
  onUnassign: (assignmentId: string) => void
}

export function AssignChoresView({
  child,
  allChores,
  assignments,
  onBack,
  onAssign,
  onUnassign,
}: AssignChoresViewProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedChoreId, setSelectedChoreId] = useState<string>('')

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" onClick={onBack}>
            ← Back to Children
          </Button>
          <h2 className="text-2xl font-fredoka font-bold mt-4">
            {child.name}'s Chores
          </h2>
        </div>
        <Button onClick={() => setAssignDialogOpen(true)}>
          Assign Chore
        </Button>
      </div>

      {assignedChores.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No chores assigned yet. Click "Assign Chore" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignedChores.map((chore) => {
            const assignment = assignments.find(
              (a) => a.childId === child.id && a.choreId === chore.id
            )
            return (
              <Card key={chore.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox checked disabled />
                      <div>
                        <CardTitle className="text-lg font-fredoka">
                          {chore.name}
                        </CardTitle>
                        {chore.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {chore.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => assignment && onUnassign(assignment.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
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
    </div>
  )
}
