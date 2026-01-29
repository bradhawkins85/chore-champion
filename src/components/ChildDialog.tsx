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
import { Child } from '@/lib/types'
import { AVATAR_COLORS } from '@/lib/helpers'

interface ChildDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (child: Omit<Child, 'id' | 'createdAt' | 'totalPoints'>) => void
  editChild?: Child
}

export function ChildDialog({ open, onOpenChange, onSave, editChild }: ChildDialogProps) {
  const [name, setName] = useState(editChild?.name || '')
  const [avatarColor, setAvatarColor] = useState(
    editChild?.avatarColor || AVATAR_COLORS[0]
  )
  const [icsUrl, setIcsUrl] = useState(editChild?.icsUrl || '')

  useEffect(() => {
    if (open) {
      setName(editChild?.name || '')
      setAvatarColor(editChild?.avatarColor || AVATAR_COLORS[0])
      setIcsUrl(editChild?.icsUrl || '')
    }
  }, [open, editChild])

  const handleSave = () => {
    if (!name.trim()) return

    onSave({
      name: name.trim(),
      avatarColor,
      icsUrl: icsUrl.trim() || undefined,
    })

    if (!editChild) {
      setName('')
      setAvatarColor(AVATAR_COLORS[0])
      setIcsUrl('')
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
