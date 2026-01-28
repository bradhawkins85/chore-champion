import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Clock } from '@phosphor-icons/react'
import { RewardPurchase, Reward, Child, Category } from '@/lib/types'

interface PurchaseHistoryCardProps {
  purchase: RewardPurchase
  reward: Reward | undefined
  child: Child | undefined
  onFulfill: (purchaseId: string) => void
  onUnfulfill: (purchaseId: string) => void
  categories?: Category[]
}

export function PurchaseHistoryCard({
  purchase,
  reward,
  child,
  onFulfill,
  onUnfulfill,
  categories = [],
}: PurchaseHistoryCardProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (!reward || !child) {
    return null
  }

  return (
    <Card className={purchase.fulfilled ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-4xl">{reward.imageEmoji}</div>
            <div className="flex-1">
              <CardTitle className="font-fredoka text-lg">{reward.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {child.name} • {formatDate(purchase.purchasedAt)}
              </p>
              {Array.isArray(reward.categoryIds) && reward.categoryIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {reward.categoryIds.map((catId) => {
                    const category = categories.find(c => c.id === catId)
                    if (!category) return null
                    return (
                      <Badge
                        key={catId}
                        variant="outline"
                        className="font-fredoka font-semibold px-2.5 py-0.5 border-2"
                        style={{
                          backgroundColor: `${category.color}20`,
                          borderColor: category.color,
                          color: category.color,
                        }}
                      >
                        {category.name}
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <Badge variant={purchase.fulfilled ? 'secondary' : 'default'} className="shrink-0">
            {purchase.fulfilled ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Fulfilled
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-semibold text-primary">{reward.cost}</span>
              <span className="text-muted-foreground"> points spent</span>
            </div>
          </div>
          {purchase.fulfilled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUnfulfill(purchase.id)}
            >
              <X className="h-4 w-4 mr-2" />
              Mark Unfulfilled
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onFulfill(purchase.id)}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark as Fulfilled
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
