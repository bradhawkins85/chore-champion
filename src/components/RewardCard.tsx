import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash, Star } from '@phosphor-icons/react'
import { Reward, Child, Chore } from '@/lib/types'
import { RewardDialog } from './RewardDialog'

interface RewardCardProps {
  reward: Reward
  onEdit: (id: string, rewardData: Omit<Reward, 'id' | 'createdAt'>) => void
  onDelete: (id: string) => void
  purchaseCount?: number
  childrenList?: Child[]
  chores?: Chore[]
}

export function RewardCard({ reward, onEdit, onDelete, purchaseCount = 0, childrenList = [], chores = [] }: RewardCardProps) {
  const hasCustomizations = (reward.costOverrides && reward.costOverrides.length > 0) || 
                             (reward.requirements && reward.requirements.length > 0)

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex gap-4">
        <div className="text-6xl flex-shrink-0">{reward.imageEmoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h3 className="font-fredoka font-semibold text-lg">{reward.name}</h3>
              {reward.description && (
                <p className="text-sm text-muted-foreground">{reward.description}</p>
              )}
              {hasCustomizations && (
                <div className="flex gap-1 mt-1">
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
                </div>
              )}
            </div>
            <Badge variant="secondary" className="flex items-center gap-1 font-fredoka">
              <Star weight="fill" className="h-3 w-3" />
              {reward.cost}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <RewardDialog
              reward={reward}
              onSave={(data) => onEdit(reward.id, data)}
              childrenList={childrenList}
              chores={chores}
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
