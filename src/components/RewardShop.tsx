import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, ShoppingCart, ArrowLeft } from '@phosphor-icons/react'
import { Child, Reward } from '@/lib/types'
import { motion } from 'framer-motion'

interface RewardShopProps {
  child: Child
  rewards: Reward[]
  availablePoints: number
  onPurchase: (rewardId: string) => void
  onBack: () => void
}

export function RewardShop({
  child,
  rewards,
  availablePoints,
  onPurchase,
  onBack,
}: RewardShopProps) {
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

        {rewards.length === 0 ? (
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
            {rewards.map((reward) => {
              const canAfford = availablePoints >= reward.cost
              return (
                <motion.div
                  key={reward.id}
                  whileHover={canAfford ? { scale: 1.02 } : {}}
                  whileTap={canAfford ? { scale: 0.98 } : {}}
                >
                  <Card
                    className={`p-6 h-full transition-all ${
                      canAfford
                        ? 'hover:shadow-xl cursor-pointer'
                        : 'opacity-60'
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <div className="text-center mb-4">
                        <div className="text-7xl mb-3">{reward.imageEmoji}</div>
                        <h3 className="text-2xl font-fredoka font-bold mb-2">
                          {reward.name}
                        </h3>
                        {reward.description && (
                          <p className="text-muted-foreground">
                            {reward.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-auto">
                        <div className="flex items-center justify-between mb-3">
                          <Badge
                            variant={canAfford ? 'default' : 'secondary'}
                            className="flex items-center gap-1 font-fredoka text-base px-4 py-1"
                          >
                            <Star weight="fill" />
                            {reward.cost} points
                          </Badge>
                        </div>
                        <Button
                          className="w-full font-fredoka text-lg h-14"
                          disabled={!canAfford}
                          onClick={() => onPurchase(reward.id)}
                        >
                          {canAfford ? (
                            <>
                              <ShoppingCart className="mr-2" />
                              Get This Reward!
                            </>
                          ) : (
                            `Need ${reward.cost - availablePoints} more points`
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
