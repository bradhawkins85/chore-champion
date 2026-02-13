import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Star, Timer, CalendarBlank, CalendarX, ArrowsLeftRight, CalendarDots } from '@phosphor-icons/react'
import { Reward, Child, Chore, RewardCostOverride, PurchaseLimit, PurchaseLimitInterval, PurchaseLimitScope, Category, DayOfWeek } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getAvailableExchangeRates } from '@/lib/helpers'

interface RewardDialogProps {
  reward?: Reward
  onSave: (rewardData: Omit<Reward, 'id' | 'createdAt'>) => void
  trigger?: React.ReactNode
  childrenList?: Child[]
  chores?: Chore[]
  categories: Category[]
  disabled?: boolean
  disabledTooltip?: string
}

export function RewardDialog({ reward, onSave, trigger, childrenList = [], chores = [], categories, disabled = false, disabledTooltip }: RewardDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPointSwap, setIsPointSwap] = useState(reward?.isPointSwap || false)
  const [name, setName] = useState(reward?.name || '')
  const [description, setDescription] = useState(reward?.description || '')
  const [cost, setCost] = useState(reward?.cost?.toString() || '')
  const [imageEmoji, setImageEmoji] = useState(reward?.imageEmoji || '🎁')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [costOverrides, setCostOverrides] = useState<RewardCostOverride[]>(reward?.costOverrides || [])
  const [expandedChildIds, setExpandedChildIds] = useState<Set<string>>(new Set())
  const [hasLimit, setHasLimit] = useState(!!reward?.purchaseLimit)
  const [limitMax, setLimitMax] = useState(reward?.purchaseLimit?.maxPurchases?.toString() || '1')
  const [limitInterval, setLimitInterval] = useState<PurchaseLimitInterval>(reward?.purchaseLimit?.interval || 'day')
  const [limitScope, setLimitScope] = useState<PurchaseLimitScope>(reward?.purchaseLimit?.scope || 'per-child')
  const [startDate, setStartDate] = useState(reward?.startDate ? new Date(reward.startDate).toISOString().split('T')[0] : '')
  const [expiryDate, setExpiryDate] = useState(reward?.expiryDate ? new Date(reward.expiryDate).toISOString().split('T')[0] : '')
  
  const [swapFromCategoryId, setSwapFromCategoryId] = useState(reward?.swapConfig?.fromCategoryId || '')
  const [swapToCategoryId, setSwapToCategoryId] = useState(reward?.swapConfig?.toCategoryId || '')
  const [swapFromAmount, setSwapFromAmount] = useState(reward?.swapConfig?.fromAmount?.toString() || '')
  const [swapToAmount, setSwapToAmount] = useState(reward?.swapConfig?.toAmount?.toString() || '')

  const daysOfWeek: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  useEffect(() => {
    if (open) {
      if (reward) {
        setIsPointSwap(reward.isPointSwap || false)
        setName(reward.name)
        setDescription(reward.description)
        setCost(reward.cost.toString())
        setImageEmoji(reward.imageEmoji)
        const rewardCategoryIds = reward.categoryIds || []
        setCategoryIds(Array.isArray(rewardCategoryIds) ? [...rewardCategoryIds] : [])
        setCostOverrides(reward.costOverrides || [])
        // Auto-expand children that have day-specific costs
        const childrenWithDayCosts = (reward.costOverrides || [])
          .filter(o => o.costByDay && Object.keys(o.costByDay).length > 0)
          .map(o => o.childId)
        setExpandedChildIds(new Set(childrenWithDayCosts))
        setHasLimit(!!reward.purchaseLimit)
        setLimitMax(reward.purchaseLimit?.maxPurchases?.toString() || '1')
        setLimitInterval(reward.purchaseLimit?.interval || 'day')
        setLimitScope(reward.purchaseLimit?.scope || 'per-child')
        setStartDate(reward.startDate ? new Date(reward.startDate).toISOString().split('T')[0] : '')
        setExpiryDate(reward.expiryDate ? new Date(reward.expiryDate).toISOString().split('T')[0] : '')
        setSwapFromCategoryId(reward.swapConfig?.fromCategoryId || '')
        setSwapToCategoryId(reward.swapConfig?.toCategoryId || '')
        setSwapFromAmount(reward.swapConfig?.fromAmount?.toString() || '')
        setSwapToAmount(reward.swapConfig?.toAmount?.toString() || '')
      } else {
        setIsPointSwap(false)
        setName('')
        setDescription('')
        setCost('')
        setImageEmoji('🎁')
        setCategoryIds([])
        setCostOverrides([])
        setExpandedChildIds(new Set())
        setHasLimit(false)
        setLimitMax('1')
        setLimitInterval('day')
        setLimitScope('per-child')
        setStartDate('')
        setExpiryDate('')
        setSwapFromCategoryId('')
        setSwapToCategoryId('')
        setSwapFromAmount('')
        setSwapToAmount('')
      }
    }
  }, [open, reward, reward?.categoryIds])

  const toggleCategoryId = (id: string) => {
    setCategoryIds((current) => {
      if (current.includes(id)) {
        return current.filter((cid) => cid !== id)
      } else {
        return [...current, id]
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    if (isPointSwap) {
      if (!swapFromCategoryId || !swapToCategoryId || !swapFromAmount || !swapToAmount) return
    } else {
      if (!cost) return
    }

    const purchaseLimit: PurchaseLimit | undefined = hasLimit
      ? {
          maxPurchases: parseInt(limitMax, 10) || 1,
          interval: limitInterval,
          scope: limitScope,
        }
      : undefined

    const categoryIdsToSave = Array.isArray(categoryIds) ? [...categoryIds] : []

    const rewardData: Omit<Reward, 'id' | 'createdAt'> = {
      name: name.trim(),
      description: description.trim(),
      cost: isPointSwap ? 0 : parseInt(cost, 10),
      imageEmoji,
      categoryIds: categoryIdsToSave,
      costOverrides: isPointSwap ? undefined : (costOverrides.length > 0 ? costOverrides : undefined),
      purchaseLimit,
      startDate: startDate ? new Date(startDate).getTime() : undefined,
      expiryDate: expiryDate ? new Date(expiryDate + 'T23:59:59').getTime() : undefined,
      isPointSwap,
      swapConfig: isPointSwap ? {
        fromCategoryId: swapFromCategoryId,
        toCategoryId: swapToCategoryId,
        fromAmount: parseInt(swapFromAmount, 10),
        toAmount: parseInt(swapToAmount, 10),
      } : undefined,
    }

    onSave(rewardData)

    if (!reward) {
      setIsPointSwap(false)
      setName('')
      setDescription('')
      setCost('')
      setImageEmoji('🎁')
      setCategoryIds([])
      setCostOverrides([])
      setExpandedChildIds(new Set())
      setHasLimit(false)
      setLimitMax('1')
      setLimitInterval('day')
      setLimitScope('per-child')
      setStartDate('')
      setExpiryDate('')
      setSwapFromCategoryId('')
      setSwapToCategoryId('')
      setSwapFromAmount('')
      setSwapToAmount('')
    }
    setOpen(false)
  }



  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!disabled) {
        setOpen(newOpen);
      }
    }}>
      {disabled && disabledTooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <DialogTrigger asChild>
                {trigger || (
                  <Button className="font-fredoka" disabled={disabled}>
                    <Plus className="mr-2" />
                    Add Reward
                  </Button>
                )}
              </DialogTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledTooltip}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="font-fredoka">
              <Plus className="mr-2" />
              Add Reward
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-fredoka text-2xl">
            {reward ? 'Edit Reward' : 'Add Reward'}
          </DialogTitle>
          <DialogDescription>
            {reward ? 'Update reward details and customize per child' : 'Create a new reward with optional per-child customization'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowsLeftRight className="h-5 w-5 text-primary" />
                <Label className="text-base font-fredoka font-semibold">Point Swap Reward</Label>
              </div>
              <Switch
                checked={isPointSwap}
                onCheckedChange={(checked) => {
                  setIsPointSwap(checked)
                  if (checked) {
                    setImageEmoji('🔄')
                    if (!name) setName('Point Swap')
                  } else {
                    setImageEmoji('🎁')
                  }
                }}
              />
            </div>
            {isPointSwap && (
              <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  Point swap rewards allow children to exchange points between categories. Configure the exchange rate below.
                </p>
              </div>
            )}
          </div>
          
          <Separator />
          
          {isPointSwap ? (
            <>
              <div>
                <Label htmlFor="reward-emoji">Emoji</Label>
                <Input
                  id="reward-emoji"
                  value={imageEmoji}
                  onChange={(e) => setImageEmoji(e.target.value)}
                  placeholder="🔄"
                  maxLength={4}
                  className="text-3xl text-center"
                />
              </div>
              <div>
                <Label htmlFor="reward-name">Swap Name</Label>
                <Input
                  id="reward-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Regular to Extra Swap"
                  required
                />
              </div>
              <div>
                <Label htmlFor="reward-description">Description</Label>
                <Textarea
                  id="reward-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what this swap does"
                  rows={2}
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-base">Exchange Rate</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="swap-from-category" className="text-sm">From Category</Label>
                    <Select value={swapFromCategoryId} onValueChange={setSwapFromCategoryId}>
                      <SelectTrigger id="swap-from-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="swap-from-amount" className="text-sm">Amount</Label>
                    <Input
                      id="swap-from-amount"
                      type="number"
                      min="1"
                      value={swapFromAmount}
                      onChange={(e) => setSwapFromAmount(e.target.value)}
                      placeholder="e.g., 100"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <ArrowsLeftRight className="h-6 w-6 text-primary" weight="bold" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="swap-to-category" className="text-sm">To Category</Label>
                    <Select value={swapToCategoryId} onValueChange={setSwapToCategoryId}>
                      <SelectTrigger id="swap-to-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="swap-to-amount" className="text-sm">Amount</Label>
                    <Input
                      id="swap-to-amount"
                      type="number"
                      min="1"
                      value={swapToAmount}
                      onChange={(e) => setSwapToAmount(e.target.value)}
                      placeholder="e.g., 10"
                      required
                    />
                  </div>
                </div>
                
                {swapFromCategoryId && swapToCategoryId && swapFromAmount && swapToAmount && (
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-sm">
                      <span className="font-semibold">Preview: </span>
                      Spend {swapFromAmount} {categories.find(c => c.id === swapFromCategoryId)?.name} points to get {swapToAmount} {categories.find(c => c.id === swapToCategoryId)?.name} points
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
          <div>
            <Label htmlFor="reward-emoji">Emoji</Label>
            <Input
              id="reward-emoji"
              value={imageEmoji}
              onChange={(e) => setImageEmoji(e.target.value)}
              placeholder="🎁"
              maxLength={4}
              className="text-3xl text-center"
            />
          </div>
          <div>
            <Label htmlFor="reward-name">Reward Name</Label>
            <Input
              id="reward-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ice Cream Trip"
              required
            />
          </div>
          <div>
            <Label htmlFor="reward-description">Description</Label>
            <Textarea
              id="reward-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this reward include?"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="reward-cost">Cost (Points)</Label>
            <Input
              id="reward-cost"
              type="number"
              min="1"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g., 50"
              required
            />
          </div>
          </>
          )}
          
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarBlank className="h-5 w-5 text-muted-foreground" />
              <Label className="text-base font-fredoka font-semibold">Availability Dates</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Set optional start and expiry dates for this {isPointSwap ? 'swap' : 'reward'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start-date" className="text-sm">Start Date (Optional)</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Reward unavailable before this date
                </p>
              </div>
              <div>
                <Label htmlFor="expiry-date" className="text-sm">Expiry Date (Optional)</Label>
                <Input
                  id="expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="mt-1"
                  min={startDate || undefined}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Reward automatically disabled after this date
                </p>
              </div>
            </div>
            {(startDate || expiryDate) && (
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm">
                  {startDate && expiryDate && (
                    <>Available from <span className="font-semibold">{new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span> until <span className="font-semibold">{new Date(expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></>
                  )}
                  {startDate && !expiryDate && (
                    <>Available starting <span className="font-semibold">{new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></>
                  )}
                  {!startDate && expiryDate && (
                    <>Available until <span className="font-semibold">{new Date(expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></>
                  )}
                </p>
              </div>
            )}
          </div>
          
          {!isPointSwap && (
            <>
          <div>
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No categories available. Create categories first.
                </p>
              ) : (
                categories.map((category) => (
                  <Badge
                    key={category.id}
                    variant={categoryIds.includes(category.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    style={{
                      backgroundColor: categoryIds.includes(category.id) ? category.color : 'transparent',
                      borderColor: category.color,
                      color: categoryIds.includes(category.id) ? 'white' : category.color,
                    }}
                    onClick={() => toggleCategoryId(category.id)}
                  >
                    {category.name}
                  </Badge>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Select one or more categories. Rewards can use points from multiple categories.
            </p>
          </div>
          </>
          )}

          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-fredoka font-semibold">Purchase Limits</Label>
              </div>
              <Switch
                checked={hasLimit}
                onCheckedChange={setHasLimit}
              />
            </div>
            {hasLimit && (
              <>
                <p className="text-sm text-muted-foreground">
                  Restrict how often this reward can be purchased
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="limit-max" className="text-sm">Max Purchases</Label>
                    <Input
                      id="limit-max"
                      type="number"
                      min="1"
                      value={limitMax}
                      onChange={(e) => setLimitMax(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="limit-interval" className="text-sm">Interval</Label>
                    <Select value={limitInterval} onValueChange={(v) => setLimitInterval(v as PurchaseLimitInterval)}>
                      <SelectTrigger id="limit-interval" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Per Day</SelectItem>
                        <SelectItem value="week">Per Week</SelectItem>
                        <SelectItem value="month">Per Month</SelectItem>
                        <SelectItem value="ever">Ever (Total)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="limit-scope" className="text-sm">Scope</Label>
                    <Select value={limitScope} onValueChange={(v) => setLimitScope(v as PurchaseLimitScope)}>
                      <SelectTrigger id="limit-scope" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per-child">Per Child</SelectItem>
                        <SelectItem value="total">Total</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm">
                    <span className="font-semibold">Example: </span>
                    {limitScope === 'per-child' ? 'Each child' : 'All children combined'} can purchase this reward{' '}
                    <span className="font-semibold">{limitMax} time{parseInt(limitMax) > 1 ? 's' : ''}</span>{' '}
                    {limitInterval === 'ever' ? 'total' : `per ${limitInterval}`}.
                  </p>
                </div>
              </>
            )}
          </div>

          {!isPointSwap && childrenList.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-muted-foreground" />
                  <Label className="text-base font-fredoka font-semibold">Custom Cost Per Child</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Override the default {cost || '0'} points cost for specific children (optional)
                </p>
                <div className="space-y-2">
                  {childrenList.map((child) => {
                    const override = costOverrides.find(o => o.childId === child.id)
                    const isExpanded = expandedChildIds.has(child.id)
                    const hasDayCosts = override?.costByDay && Object.keys(override.costByDay).length > 0

                    return (
                      <Card key={child.id} className="p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-fredoka font-bold flex-shrink-0"
                            style={{ backgroundColor: child.avatarColor }}
                          >
                            {child.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium flex-1">{child.name}</span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder={cost}
                              value={override?.cost ?? ''}
                              onChange={(e) => {
                                const value = e.target.value
                                setCostOverrides(current => {
                                  const filtered = current.filter(o => o.childId !== child.id)
                                  if (value === '') {
                                    // Keep costByDay if it exists
                                    const existing = current.find(o => o.childId === child.id)
                                    if (existing?.costByDay) {
                                      return [...filtered, { childId: child.id, costByDay: existing.costByDay }]
                                    }
                                    return filtered
                                  }
                                  const existing = current.find(o => o.childId === child.id)
                                  return [...filtered, { 
                                    childId: child.id, 
                                    cost: parseInt(value) || 0,
                                    costByDay: existing?.costByDay
                                  }]
                                })
                              }}
                              className="w-20"
                              min="0"
                            />
                            <span className="text-sm text-muted-foreground">pts</span>
                            <Button
                              type="button"
                              variant={hasDayCosts ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setExpandedChildIds(prev => {
                                  const newSet = new Set(prev)
                                  if (newSet.has(child.id)) {
                                    newSet.delete(child.id)
                                  } else {
                                    newSet.add(child.id)
                                  }
                                  return newSet
                                })
                              }}
                            >
                              <CalendarDots className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <Label className="text-sm font-semibold">Day-specific costs (optional)</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                              Set different costs for different days of the week. Leave blank to use the default cost above.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {daysOfWeek.map((day) => {
                                const dayCost = override?.costByDay?.[day]
                                return (
                                  <div key={day} className="flex items-center gap-2">
                                    <Label className="text-xs capitalize w-16">{day.slice(0, 3)}</Label>
                                    <Input
                                      type="number"
                                      placeholder={override?.cost?.toString() || cost}
                                      value={dayCost ?? ''}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        setCostOverrides(current => {
                                          const filtered = current.filter(o => o.childId !== child.id)
                                          const existing = current.find(o => o.childId === child.id)
                                          const existingCostByDay = existing?.costByDay || {}
                                          
                                          if (value === '') {
                                            // Remove this day's cost
                                            const { [day]: _, ...restDays } = existingCostByDay
                                            const newCostByDay = Object.keys(restDays).length > 0 ? restDays : undefined
                                            
                                            // If no cost and no costByDay, remove override entirely
                                            if (!existing?.cost && !newCostByDay) {
                                              return filtered
                                            }
                                            
                                            return [...filtered, {
                                              childId: child.id,
                                              cost: existing?.cost,
                                              costByDay: newCostByDay
                                            }]
                                          }
                                          
                                          return [...filtered, {
                                            childId: child.id,
                                            cost: existing?.cost,
                                            costByDay: {
                                              ...existingCostByDay,
                                              [day]: parseInt(value) || 0
                                            }
                                          }]
                                        })
                                      }}
                                      className="w-16 text-xs"
                                      min="0"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </div>
            </>
          )}
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="font-fredoka">
              {reward ? 'Update Reward' : 'Create Reward'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
