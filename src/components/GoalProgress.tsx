import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Star, Trophy } from '@phosphor-icons/react'
import { Reward } from '@/lib/types'
import { motion } from 'framer-motion'

interface GoalProgressProps {
  reward: Reward
  currentPoints: number
  targetPoints: number
}

export function GoalProgress({ reward, currentPoints, targetPoints }: GoalProgressProps) {
  const progress = Math.min((currentPoints / targetPoints) * 100, 100)
  const pointsNeeded = Math.max(targetPoints - currentPoints, 0)
  const isComplete = currentPoints >= targetPoints

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-br from-accent/20 to-primary/20 border-accent/40">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="text-5xl shrink-0">{reward.imageEmoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" weight="fill" />
                  <h3 className="text-xl font-fredoka font-bold">Current Goal</h3>
                </div>
                {isComplete && (
                  <Badge className="bg-accent text-accent-foreground">
                    Goal Reached! 🎉
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-fredoka font-semibold mb-3">{reward.name}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Progress</span>
                  <span className="font-fredoka text-base">
                    <Star weight="fill" className="inline h-4 w-4 text-accent" /> {currentPoints} / {targetPoints}
                  </span>
                </div>
                <Progress value={progress} className="h-3" />
                {!isComplete && (
                  <p className="text-sm text-muted-foreground">
                    {pointsNeeded} more {pointsNeeded === 1 ? 'point' : 'points'} needed!
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
