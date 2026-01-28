import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Category } from '@/lib/types'

interface CategoryDialogProps {
  open: boolean
  onClose: () => void
  onSave: (category: Omit<Category, 'id' | 'createdAt'>) => void
  category?: Category
}

const PRESET_COLORS = [
  'oklch(0.6 0.22 290)',
  'oklch(0.72 0.18 45)',
  'oklch(0.65 0.12 240)',
  'oklch(0.7 0.18 150)',
  'oklch(0.68 0.2 340)',
  'oklch(0.75 0.15 80)',
  'oklch(0.62 0.18 20)',
  'oklch(0.64 0.16 200)',
]

export function CategoryDialog({
  open,
  onClose,
  onSave,
  category,
}: CategoryDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])

  useEffect(() => {
    if (category) {
      setName(category.name)
      setDescription(category.description || '')
      setColor(category.color)
    } else {
      setName('')
      setDescription('')
      setColor(PRESET_COLORS[0])
    }
  }, [category, open])

  const handleSave = () => {
    if (!name.trim()) return

    onSave({
      name: name.trim(),
      description: description.trim(),
      color,
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          <DialogDescription>
            {category
              ? 'Update the category details below.'
              : 'Create a new category to organize chores and rewards.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Regular, Extra"
            />
          </div>

          <div>
            <Label htmlFor="category-description">
              Description (Optional)
            </Label>
            <Textarea
              id="category-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this category"
              rows={2}
            />
          </div>

          <div>
            <Label>Color</Label>
            <div className="grid grid-cols-8 gap-2 mt-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className="w-10 h-10 rounded-lg border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: presetColor,
                    borderColor:
                      color === presetColor
                        ? 'oklch(0.2 0 0)'
                        : 'oklch(0.9 0 0)',
                  }}
                  onClick={() => setColor(presetColor)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {category ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
