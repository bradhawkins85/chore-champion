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
import { Category, ExchangeRate } from '@/lib/types'
import { Plus, Trash, ArrowsLeftRight } from '@phosphor-icons/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CategoryDialogProps {
  open: boolean
  onClose: () => void
  onSave: (category: Omit<Category, 'id' | 'createdAt'>) => void
  category?: Category
  allCategories?: Category[]
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
  allCategories = [],
}: CategoryDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])

  useEffect(() => {
    if (category) {
      setName(category.name)
      setDescription(category.description || '')
      setColor(category.color)
      setExchangeRates(category.exchangeRates || [])
    } else {
      setName('')
      setDescription('')
      setColor(PRESET_COLORS[0])
      setExchangeRates([])
    }
  }, [category, open])

  const handleSave = () => {
    if (!name.trim()) return

    onSave({
      name: name.trim(),
      description: description.trim(),
      color,
      exchangeRates,
    })
    onClose()
  }

  const handleAddExchangeRate = () => {
    const targetCategory = allCategories.find((c) => c.id !== category?.id)
    if (!targetCategory) return

    setExchangeRates([
      ...exchangeRates,
      {
        fromCategoryId: category?.id || '',
        toCategoryId: targetCategory.id,
        fromAmount: 100,
        toAmount: 10,
      },
    ])
  }

  const handleRemoveExchangeRate = (index: number) => {
    setExchangeRates(exchangeRates.filter((_, i) => i !== index))
  }

  const handleUpdateExchangeRate = (
    index: number,
    field: 'toCategoryId' | 'fromAmount' | 'toAmount',
    value: string | number
  ) => {
    setExchangeRates(
      exchangeRates.map((rate, i) =>
        i === index ? { ...rate, [field]: value } : rate
      )
    )
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Point Exchange Rates</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddExchangeRate}
                disabled={allCategories.length <= 1}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Rate
              </Button>
            </div>
            <div className="space-y-3">
              {exchangeRates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No exchange rates configured. Add rates to allow swapping points.
                </p>
              ) : (
                exchangeRates.map((rate, index) => {
                  const targetCategory = allCategories.find(
                    (c) => c.id === rate.toCategoryId
                  )
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30"
                    >
                      <Input
                        type="number"
                        value={rate.fromAmount}
                        onChange={(e) =>
                          handleUpdateExchangeRate(
                            index,
                            'fromAmount',
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-20"
                        min="1"
                      />
                      <span className="text-sm font-medium">{name || 'This'}</span>
                      <ArrowsLeftRight className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={rate.toAmount}
                        onChange={(e) =>
                          handleUpdateExchangeRate(
                            index,
                            'toAmount',
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-20"
                        min="1"
                      />
                      <Select
                        value={rate.toCategoryId}
                        onValueChange={(value) =>
                          handleUpdateExchangeRate(index, 'toCategoryId', value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allCategories
                            .filter((c) => c.id !== category?.id)
                            .map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveExchangeRate(index)}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )
                })
              )}
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
