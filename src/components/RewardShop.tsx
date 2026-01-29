import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, ShoppingCart, ArrowLeft, LockKey, Timer } from '@phosphor-icons/react'
import { Child, Reward, Chore, ChoreCompletion, RewardPurchase, GoalTracker, Category } from '@/lib/types'
import { motion } from 'framer-motion'
import { getRewardCostForChild, isRewardAvailableForChild, canPurchaseReward, getChildPointsByCategory, getChildAvailablePointsByCategory } from '@/lib/helpers'
import { useMemo } from 'react'

interface RewardShopProps {
  child: Child
  rewards: Reward[]
  availablePoints: number
  onPurchase: (rewardId: string) => void
  onBack: () => void
  chores?: Chore[]
  completions?: ChoreCompletion[]
  purchases?: RewardPurchase[]
  trackedGoal?: GoalTracker | null
  onToggleGoalTracking?: (rewardId: string) => void
  categories?: Category[]
  assignments?: any[]
}

export function RewardShop({
  child,
  rewards,
  availablePoints,
  onPurchase,
  onBack,
  chores = [],
  completions = [],
  purchases = [],
  trackedGoal,
  onToggleGoalTracking,
  categories = [],
  assignments = [],
}: RewardShopProps) {
  const choresMap = useMemo(() => {
    return new Map(chores.map(c => [c.id, c]))
  }, [chores])

  const rewardsMap = useMemo(() => {
    return new Map(rewards.map(r => [r.id, r]))
  }, [rewards])

  const categoriesMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c]))
  }, [categories])

  const categoryPoints = useMemo(() => {
    const points = new Map<string, number>()
    categories.forEach(category => {
      const totalPoints = getChildPointsByCategory(
        completions,
        choresMap,
        child.id,
        category.id,
        assignments
      )
      const availablePoints = getChildAvailablePointsByCategory(
        totalPoints,
        purchases
          .filter(p => p.childId === child.id)
          .map(p => {
            const reward = rewardsMap.get(p.rewardId)
            const override = reward?.costOverrides?.find(o => o.childId === child.id)
            return { 
              rewardId: p.rewardId, 
              cost: override ? override.cost : (reward?.cost || 0) 
            }
          }),
        rewardsMap,
        category.id
      )
      points.set(category.id, availablePoints)
    })
    return points
  }, [categories, completions, choresMap, child.id, assignments, purchases, rewardsMap])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="lg"
            onClick={onBack}
            className="font-fredoka"
          >
            <ArrowLeft className="mr-2" />
            Back
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-fredoka font-bold mb-2">
              Rewards Shop
            </h1>
            <p className="text-xl text-muted-foreground">
              Choose your rewards, {child.name}!
            </p>
          </div>
          <div className="bg-primary text-primary-foreground rounded-2xl px-8 py-4 text-center">
            <div className="text-sm font-medium opacity-90">Your Points</div>
            <div className="text-4xl font-fredoka font-bold flex items-center justify-center gap-2">
              <Star weight="fill" />
              {availablePoints}
            </div>
          </div>
        </div>

        {rewards.filter(r => !r.disabled).length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-fredoka font-semibold mb-2">
              No Rewards Yet
            </h2>
            <p className="text-muted-foreground">
              Ask your parents to add some rewards!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rewards.filter(r => !r.disabled).map((reward) => {
              const customCost = getRewardCostForChild(reward, child.id)
              const requirementsMet = isRewardAvailableForChild(reward, child.id, completions, choresMap)
              const purchaseLimitCheck = canPurchaseReward(reward, child.id, purchases)
              const canAfford = availablePoints >= customCost
              const canPurchase = canAfford && requirementsMet && purchaseLimitCheck.canPurchase
              const requirement = reward.requirements?.find(r => r.childId === child.id)
              const isTracked = trackedGoal?.rewardId === reward.id
              
              return (
                <motion.div
                  key={reward.id}
                  whileHover={canPurchase ? { scale: 1.02 } : {}}
                  whileTap={canPurchase ? { scale: 0.98 } : {}}
                >
                  <Card
                    className={`p-6 h-full transition-all ${
                      canPurchase
                        ? 'hover:shadow-xl cursor-pointer'
                        : 'opacity-60'
                    } ${isTracked ? 'ring-2 ring-accent' : ''}`}
                  >
                    <div className="flex flex-col h-full">
                      <div className="text-center mb-4 relative">
                        {onToggleGoalTracking && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleGoalTracking(reward.id)
                            }}
                            className="absolute top-0 right-0 p-2 hover:scale-110 transition-transform"
                            aria-label={isTracked ? "Remove from goals" : "Track as goal"}
                          >
                            <Star 
                              weight={isTracked ? "fill" : "regular"} 
                              className={`h-8 w-8 ${isTracked ? 'text-accent' : 'text-muted-foreground'}`}
                            />
                          </button>
                        )}
                        <div className="text-7xl mb-3">{reward.imageEmoji}</div>
                        <h3 className="text-2xl font-fredoka font-bold mb-2">
                          {reward.name}
                        </h3>
                        {reward.description && (
                          <p className="text-muted-foreground">
                            {reward.description}
                          </p>
                        )}
                        {Array.isArray(reward.categoryIds) && reward.categoryIds.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 justify-center">
                            {reward.categoryIds.map((catId) => {
                              const category = categoriesMap.get(catId)
                              if (!category) return null
                              return (
                                <Badge
                                  key={catId}
                                  variant="outline"
                                  className="font-fredoka font-semibold px-3 py-1.5 text-sm border-2"
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
                        <div className="mt-3 space-y-2">
                          {requirement && requirement.requiredChoreIds.length > 0 && (
                            <Badge variant={requirementsMet ? "default" : "destructive"} className="flex items-center gap-1 w-fit mx-auto">
                              <LockKey className="h-3 w-3" />
                              {requirementsMet ? "Requirements met" : `Complete ${requirement.requiredChoreIds.length} chore(s) first`}
                            </Badge>
                          )}
                          {reward.purchaseLimit && (
                            <Badge 
                              variant={purchaseLimitCheck.canPurchase ? "secondary" : "destructive"} 
                              className="flex items-center gap-1 w-fit mx-auto"
                            >
                              <Timer className="h-3 w-3" />
                              {purchaseLimitCheck.canPurchase 
                                ? `${purchaseLimitCheck.currentCount || 0}/${purchaseLimitCheck.maxCount} ${reward.purchaseLimit.interval === 'ever' ? 'total' : `this ${reward.purchaseLimit.interval}`}`
                                : purchaseLimitCheck.reason
                              }
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-auto">
                        <div className="flex items-center justify-between mb-3">
                          <Badge
                            variant={canPurchase ? 'default' : 'secondary'}
                            className="flex items-center gap-1 font-fredoka text-base px-4 py-1"
                          >
                            <Star weight="fill" />
                            {customCost} points
                          </Badge>
                        </div>
                        <Button
                          className="w-full font-fredoka text-lg h-14"
                          disabled={!canPurchase}
                          onClick={() => onPurchase(reward.id)}
                        >
                          {!requirementsMet ? (
                            <>
                              <LockKey className="mr-2" />
                              Complete Chores First
                            </>
                          ) : !purchaseLimitCheck.canPurchase ? (
                            <>
                              <Timer className="mr-2" />
                              Limit Reached
                            </>
                          ) : canAfford ? (
                            <>
                              <ShoppingCart className="mr-2" />
                              Get This Reward!
                            </>
                          ) : (
                            `Need ${customCost - availablePoints} more points`
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
