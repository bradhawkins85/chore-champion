import { useState, useEffect, useMemo } from 'react'
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
import { Category, ExchangeRate, CategoryCompletionBonus, PointsExpiryInterval } from '@/lib/types'
import { Plus, Trash, ArrowsLeftRight, Trophy, HourglassHigh, Eye, Lock, Calendar as CalendarIcon } from '@phosphor-icons/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

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

const NONE_VALUE = '__none__'

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
  const [enableBonus, setEnableBonus] = useState(false)
  const [bonusPoints, setBonusPoints] = useState(10)
  const [bonusTargetCategoryId, setBonusTargetCategoryId] = useState('')
  const [enableExpiry, setEnableExpiry] = useState(false)
  const [expiryInterval, setExpiryInterval] = useState<PointsExpiryInterval>('daily')
  const [showInUpNext, setShowInUpNext] = useState(true)
  const [showInCalendar, setShowInCalendar] = useState(true)
  const [prerequisiteCategoryId, setPrerequisiteCategoryId] = useState('')

  useEffect(() => {
    if (category) {
      setName(category.name)
      setDescription(category.description || '')
      setColor(category.color)
      setExchangeRates(category.exchangeRates || [])
      setEnableBonus(!!category.completionBonus)
      setBonusPoints(category.completionBonus?.bonusPoints || 10)
      setBonusTargetCategoryId(category.completionBonus?.targetCategoryId || '')
      setEnableExpiry(category.pointsExpiry?.enabled || false)
      setExpiryInterval(category.pointsExpiry?.interval || 'daily')
      setShowInUpNext(category.showInUpNext !== false)
      setShowInCalendar(category.showInCalendar !== false)
      
      // Handle prerequisite: check if the category still exists, otherwise clear it
      const prerequisite = category.prerequisiteCategoryId || ''
      const prerequisiteExists = prerequisite && allCategories.some(c => c.id === prerequisite)
      if (prerequisite && !prerequisiteExists) {
        console.warn('CategoryDialog: Prerequisite category no longer exists, clearing it:', prerequisite)
        setPrerequisiteCategoryId('')
      } else {
        setPrerequisiteCategoryId(prerequisite)
        // Debug logging to trace prerequisite loading
        if (prerequisite) {
          console.log('CategoryDialog: Loading category with prerequisite:', prerequisite)
        }
      }
    } else {
      setName('')
      setDescription('')
      setColor(PRESET_COLORS[0])
      setExchangeRates([])
      setEnableBonus(false)
      setBonusPoints(10)
      setBonusTargetCategoryId('')
      setEnableExpiry(false)
      setExpiryInterval('daily')
      setShowInUpNext(true)
      setShowInCalendar(true)
      setPrerequisiteCategoryId('')
    }
  }, [category, open, allCategories])

  useEffect(() => {
    if (enableBonus && !bonusTargetCategoryId && allCategories.length > 0) {
      const firstOtherCategory = allCategories.find((c) => c.id !== category?.id)
      if (firstOtherCategory) {
        setBonusTargetCategoryId(firstOtherCategory.id)
      }
    }
  }, [enableBonus, bonusTargetCategoryId, allCategories, category])

  // Memoize prerequisite category name lookup
  const prerequisiteCategoryName = useMemo(() => {
    if (!prerequisiteCategoryId) return null
    return allCategories.find(c => c.id === prerequisiteCategoryId)?.name || 'prerequisite'
  }, [prerequisiteCategoryId, allCategories])

  // Helper to detect circular prerequisite dependencies
  const wouldCreateCircularDependency = (targetCategoryId: string): boolean => {
    if (!targetCategoryId || !category) return false
    
    // Check if the target category (or any of its prerequisites) points back to this category
    const visited = new Set<string>()
    let currentId: string | undefined = targetCategoryId
    
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId)
      
      // If we reach back to the current category, there's a circular dependency
      if (currentId === category.id) {
        return true
      }
      
      // Move to the next prerequisite in the chain
      const currentCategory = allCategories.find(c => c.id === currentId)
      currentId = currentCategory?.prerequisiteCategoryId
    }
    
    return false
  }

  const handleSave = () => {
    if (!name.trim()) return

    // Debug logging to trace prerequisite saving
    console.log('CategoryDialog handleSave: prerequisiteCategoryId state =', prerequisiteCategoryId)

    // Check for circular prerequisite dependency
    if (prerequisiteCategoryId && wouldCreateCircularDependency(prerequisiteCategoryId)) {
      const prerequisiteCategory = allCategories.find(c => c.id === prerequisiteCategoryId)
      toast.error('Cannot create circular dependency', {
        description: `Setting ${prerequisiteCategory?.name} as a prerequisite would create a circular dependency chain.`,
      })
      return
    }

    const completionBonus: CategoryCompletionBonus | undefined = enableBonus && bonusTargetCategoryId
      ? {
          targetCategoryId: bonusTargetCategoryId,
          bonusPoints,
        }
      : undefined

    // Only use prerequisiteCategoryId if it's a non-empty string
    // This ensures we don't save undefined or empty string values
    const hasPrerequisite = prerequisiteCategoryId && prerequisiteCategoryId.trim() !== ''
    const prerequisiteValue = hasPrerequisite ? prerequisiteCategoryId.trim() : undefined

    if (prerequisiteValue) {
      console.log('CategoryDialog: Saving category with prerequisite:', prerequisiteValue)
      // Validate that the prerequisite category exists
      const prerequisiteExists = allCategories.some(c => c.id === prerequisiteValue)
      if (!prerequisiteExists) {
        console.error('CategoryDialog: Prerequisite category does not exist:', prerequisiteValue)
        toast.error('Invalid prerequisite', {
          description: 'The selected prerequisite category does not exist. Please select a different one.',
        })
        return
      }
    } else {
      console.log('CategoryDialog: Saving category without prerequisite')
    }

    const categoryData: Omit<Category, 'id' | 'createdAt'> = {
      name: name.trim(),
      description: description.trim(),
      color,
      exchangeRates,
      completionBonus,
      pointsExpiry: {
        enabled: enableExpiry,
        interval: expiryInterval,
      },
      showInUpNext,
      showInCalendar,
    }

    // Only add prerequisiteCategoryId if it has a value
    // This prevents undefined from being spread into the saved object
    if (prerequisiteValue) {
      categoryData.prerequisiteCategoryId = prerequisiteValue
    }

    console.log('CategoryDialog: Final categoryData to save:', JSON.stringify(categoryData))

    onSave(categoryData)
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

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <Label>Category Completion Bonus</Label>
                  <p className="text-xs text-muted-foreground">
                    Award bonus points when all chores in this category are completed
                  </p>
                </div>
              </div>
              <Switch checked={enableBonus} onCheckedChange={setEnableBonus} />
            </div>

            {enableBonus && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label htmlFor="bonus-points">Bonus Points</Label>
                    <Input
                      id="bonus-points"
                      type="number"
                      value={bonusPoints}
                      onChange={(e) => setBonusPoints(parseInt(e.target.value) || 0)}
                      min="1"
                      placeholder="10"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="bonus-target">Award To Category</Label>
                    <Select
                      value={bonusTargetCategoryId}
                      onValueChange={setBonusTargetCategoryId}
                    >
                      <SelectTrigger id="bonus-target">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  When a child completes all {name || 'this category'} chores today, they'll earn {bonusPoints} bonus {allCategories.find(c => c.id === bonusTargetCategoryId)?.name || 'points'}
                </p>
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HourglassHigh className="h-5 w-5 text-primary" />
                <div>
                  <Label>Points Expiry</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically expire unused points after a set period
                  </p>
                </div>
              </div>
              <Switch checked={enableExpiry} onCheckedChange={setEnableExpiry} />
            </div>

            {enableExpiry && (
              <div className="space-y-3 pt-2">
                <div>
                  <Label htmlFor="expiry-interval">Expiry Interval</Label>
                  <Select
                    value={expiryInterval}
                    onValueChange={(value) => setExpiryInterval(value as PointsExpiryInterval)}
                  >
                    <SelectTrigger id="expiry-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  {expiryInterval === 'daily' && `Points earned before today will expire and won't count toward totals.`}
                  {expiryInterval === 'weekly' && `Points earned before this week will expire and won't count toward totals.`}
                  {expiryInterval === 'monthly' && `Points earned before this month will expire and won't count toward totals.`}
                  {expiryInterval === 'never' && `Points will never expire. This setting is effectively the same as disabling expiry.`}
                </p>
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <div>
                  <Label>Category Prerequisite</Label>
                  <p className="text-xs text-muted-foreground">
                    Require another category to be completed first
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <Label htmlFor="prerequisite-category">Required Category (Optional)</Label>
              <Select
                value={prerequisiteCategoryId || NONE_VALUE}
                onValueChange={(value) => {
                  const newValue = value === NONE_VALUE ? '' : value
                  setPrerequisiteCategoryId(newValue)
                  console.log('CategoryDialog: Prerequisite changed to:', newValue || '(none)')
                }}
              >
                <SelectTrigger id="prerequisite-category">
                  <SelectValue placeholder="None - No prerequisite required" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {allCategories
                    .filter((c) => c.id !== category?.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {prerequisiteCategoryId && !allCategories.find(c => c.id === prerequisiteCategoryId) && (
                <p className="text-xs text-destructive mt-2">
                  Warning: The previously selected prerequisite category no longer exists. Please select a new one or choose "None".
                </p>
              )}
              {prerequisiteCategoryId && allCategories.find(c => c.id === prerequisiteCategoryId) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Chores in {name || 'this category'} cannot be completed until all{' '}
                  {prerequisiteCategoryName} chores are complete.
                </p>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <div>
                  <Label>Show in Up Next</Label>
                  <p className="text-xs text-muted-foreground">
                    Display this category in the "Category Bonuses" section on child's main page
                  </p>
                </div>
              </div>
              <Switch checked={showInUpNext} onCheckedChange={setShowInUpNext} />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <div>
                  <Label>Show in Calendar</Label>
                  <p className="text-xs text-muted-foreground">
                    Display chores from this category in the child's calendar view
                  </p>
                </div>
              </div>
              <Switch checked={showInCalendar} onCheckedChange={setShowInCalendar} />
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
