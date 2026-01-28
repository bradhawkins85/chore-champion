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
import { Plus, Star, LockKey, Timer } from '@phosphor-icons/react'
import { Reward, Child, Chore, RewardCostOverride, RewardRequirement, PurchaseLimit, PurchaseLimitInterval, PurchaseLimitScope, Category } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface RewardDialogProps {
  reward?: Reward
  onSave: (rewardData: Omit<Reward, 'id' | 'createdAt'>) => void
  trigger?: React.ReactNode
  childrenList?: Child[]
  chores?: Chore[]
  categories: Category[]
}

export function RewardDialog({ reward, onSave, trigger, childrenList = [], chores = [], categories }: RewardDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(reward?.name || '')
  const [description, setDescription] = useState(reward?.description || '')
  const [cost, setCost] = useState(reward?.cost?.toString() || '')
  const [imageEmoji, setImageEmoji] = useState(reward?.imageEmoji || '🎁')
  const [categoryIds, setCategoryIds] = useState<string[]>(reward?.categoryIds || [])
  const [costOverrides, setCostOverrides] = useState<RewardCostOverride[]>(reward?.costOverrides || [])
  const [requirements, setRequirements] = useState<RewardRequirement[]>(reward?.requirements || [])
  const [hasLimit, setHasLimit] = useState(!!reward?.purchaseLimit)
  const [limitMax, setLimitMax] = useState(reward?.purchaseLimit?.maxPurchases?.toString() || '1')
  const [limitInterval, setLimitInterval] = useState<PurchaseLimitInterval>(reward?.purchaseLimit?.interval || 'day')
  const [limitScope, setLimitScope] = useState<PurchaseLimitScope>(reward?.purchaseLimit?.scope || 'per-child')

  useEffect(() => {
    if (reward) {
      setName(reward.name)
      setDescription(reward.description)
      setCost(reward.cost.toString())
      setImageEmoji(reward.imageEmoji)
      setCategoryIds(reward.categoryIds || [])
      setCostOverrides(reward.costOverrides || [])
      setRequirements(reward.requirements || [])
      setHasLimit(!!reward.purchaseLimit)
      setLimitMax(reward.purchaseLimit?.maxPurchases?.toString() || '1')
      setLimitInterval(reward.purchaseLimit?.interval || 'day')
      setLimitScope(reward.purchaseLimit?.scope || 'per-child')
    }
  }, [reward])

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
    if (!name.trim() || !cost) return

    const purchaseLimit: PurchaseLimit | undefined = hasLimit
      ? {
          maxPurchases: parseInt(limitMax, 10) || 1,
          interval: limitInterval,
          scope: limitScope,
        }
      : undefined

    onSave({
      name: name.trim(),
      description: description.trim(),
      cost: parseInt(cost, 10),
      imageEmoji,
      categoryIds,
      costOverrides: costOverrides.length > 0 ? costOverrides : undefined,
      requirements: requirements.length > 0 ? requirements : undefined,
      purchaseLimit,
    })

    if (!reward) {
      setName('')
      setDescription('')
      setCost('')
      setImageEmoji('🎁')
      setCategoryIds([])
      setCostOverrides([])
      setRequirements([])
      setHasLimit(false)
      setLimitMax('1')
      setLimitInterval('day')
      setLimitScope('per-child')
    }
    setOpen(false)
  }

  const toggleChoreRequirement = (childId: string, choreId: string) => {
    setRequirements(current => {
      const childReq = current.find(r => r.childId === childId)
      if (!childReq) {
        return [...current, { childId, requiredChoreIds: [choreId] }]
      }
      
      if (childReq.requiredChoreIds.includes(choreId)) {
        const updated = childReq.requiredChoreIds.filter(id => id !== choreId)
        if (updated.length === 0) {
          return current.filter(r => r.childId !== childId)
        }
        return current.map(r => 
          r.childId === childId ? { ...r, requiredChoreIds: updated } : r
        )
      } else {
        return current.map(r => 
          r.childId === childId 
            ? { ...r, requiredChoreIds: [...r.requiredChoreIds, choreId] } 
            : r
        )
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="font-fredoka">
            <Plus className="mr-2" />
            Add Reward
          </Button>
        )}
      </DialogTrigger>
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

          {childrenList.length > 0 && (
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
                                    return filtered
                                  }
                                  return [...filtered, { childId: child.id, cost: parseInt(value) || 0 }]
                                })
                              }}
                              className="w-20"
                              min="0"
                            />
                            <span className="text-sm text-muted-foreground">pts</span>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
              
              {chores.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <LockKey className="h-5 w-5 text-muted-foreground" />
                      <Label className="text-base font-fredoka font-semibold">Chore Requirements Per Child</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Require specific children to complete certain chores before they can purchase this reward (optional)
                    </p>
                    <ScrollArea className="max-h-[300px]">
                      <div className="space-y-4">
                        {childrenList.map((child) => {
                          const childReq = requirements.find(r => r.childId === child.id)
                          const hasRequirements = childReq && childReq.requiredChoreIds.length > 0

                          return (
                            <Card key={child.id} className="p-3">
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-fredoka font-bold flex-shrink-0"
                                    style={{ backgroundColor: child.avatarColor }}
                                  >
                                    {child.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-medium">{child.name}</span>
                                    {hasRequirements && (
                                      <p className="text-xs text-muted-foreground">
                                        {childReq.requiredChoreIds.length} chore(s) required
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {chores.length > 0 && (
                                  <div className="pl-11 space-y-1">
                                    {chores.slice(0, 5).map((chore) => (
                                      <div
                                        key={chore.id}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-accent p-1 rounded"
                                        onClick={() => toggleChoreRequirement(child.id, chore.id)}
                                      >
                                        <Checkbox 
                                          checked={childReq?.requiredChoreIds.includes(chore.id) || false}
                                          className="pointer-events-none"
                                        />
                                        <span className="text-sm">{chore.name}</span>
                                      </div>
                                    ))}
                                    {chores.length > 5 && (
                                      <p className="text-xs text-muted-foreground pl-6">
                                        +{chores.length - 5} more chores available
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}
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
