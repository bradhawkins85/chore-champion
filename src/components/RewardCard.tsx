import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash, Star, Timer, EyeSlash, Eye } from '@phosphor-icons/react'
import { Reward, Child, Chore, Category } from '@/lib/types'
import { RewardDialog } from './RewardDialog'

interface RewardCardProps {
  reward: Reward
  onEdit: (id: string, rewardData: Omit<Reward, 'id' | 'createdAt'>) => void
  onDelete: (id: string) => void
  onToggleDisabled?: (id: string) => void
  purchaseCount?: number
  childrenList?: Child[]
  chores?: Chore[]
  categories: Category[]
}

export function RewardCard({ reward, onEdit, onDelete, onToggleDisabled, purchaseCount = 0, childrenList = [], chores = [], categories }: RewardCardProps) {
  const hasCustomizations = (reward.costOverrides && reward.costOverrides.length > 0) || 
                             (reward.requirements && reward.requirements.length > 0)
  
  const getLimitText = () => {
    if (!reward.purchaseLimit) return null
    const { maxPurchases, interval, scope } = reward.purchaseLimit
    const intervalText = interval === 'ever' ? 'total' : `per ${interval}`
    const scopeText = scope === 'per-child' ? 'per child' : 'total'
    return `${maxPurchases}× ${intervalText} (${scopeText})`
  }

  return (
    <Card className={`p-4 hover:shadow-lg transition-shadow ${reward.disabled ? 'opacity-60 bg-muted/50' : ''}`}>
      <div className="flex gap-4">
        <div className="text-6xl flex-shrink-0">{reward.imageEmoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-fredoka font-semibold text-lg">{reward.name}</h3>
                {reward.disabled && (
                  <Badge variant="secondary" className="text-xs">Disabled</Badge>
                )}
              </div>
              {reward.description && (
                <p className="text-sm text-muted-foreground">{reward.description}</p>
              )}
              {(hasCustomizations || reward.purchaseLimit) && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {reward.costOverrides && reward.costOverrides.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Custom cost for {reward.costOverrides.length} {reward.costOverrides.length === 1 ? 'child' : 'children'}
                    </Badge>
                  )}
                  {reward.requirements && reward.requirements.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Requirements for {reward.requirements.length} {reward.requirements.length === 1 ? 'child' : 'children'}
                    </Badge>
                  )}
                  {reward.purchaseLimit && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {getLimitText()}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <Badge variant="secondary" className="flex items-center gap-1 font-fredoka">
              <Star weight="fill" className="h-3 w-3" />
              {reward.cost}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {onToggleDisabled && (
              <Button 
                variant={reward.disabled ? "default" : "outline"} 
                size="sm" 
                onClick={() => onToggleDisabled(reward.id)}
                title={reward.disabled ? "Enable reward" : "Disable reward"}
              >
                {reward.disabled ? <Eye className="h-4 w-4" /> : <EyeSlash className="h-4 w-4" />}
              </Button>
            )}
            <RewardDialog
              reward={reward}
              onSave={(data) => onEdit(reward.id, data)}
              childrenList={childrenList}
              chores={chores}
              categories={categories}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <Button variant="outline" size="sm" onClick={() => onDelete(reward.id)}>
              <Trash className="h-4 w-4" />
            </Button>
            {purchaseCount > 0 && (
              <span className="text-sm text-muted-foreground ml-auto">
                Claimed {purchaseCount} {purchaseCount === 1 ? 'time' : 'times'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
