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
import { Chore, ChoreFrequency } from '@/lib/types'

interface ChoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (chore: Omit<Chore, 'id' | 'createdAt'>) => void
  editChore?: Chore
}

export function ChoreDialog({ open, onOpenChange, onSave, editChore }: ChoreDialogProps) {
  const [name, setName] = useState(editChore?.name || '')
  const [description, setDescription] = useState(editChore?.description || '')
  const [points, setPoints] = useState(editChore?.points.toString() || '10')
  const [frequency, setFrequency] = useState<ChoreFrequency>(editChore?.frequency || 'daily')

  const handleSave = () => {
    if (!name.trim()) return

    onSave({
      name: name.trim(),
      description: description.trim(),
      points: parseInt(points) || 10,
      frequency,
    })

    if (!editChore) {
      setName('')
      setDescription('')
      setPoints('10')
      setFrequency('daily')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editChore ? 'Edit Chore' : 'Add New Chore'}</DialogTitle>
          <DialogDescription>
            Create a chore that can be assigned to your children
          </DialogDescription>
        </DialogHeader>
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
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{editChore ? 'Save Changes' : 'Add Chore'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
