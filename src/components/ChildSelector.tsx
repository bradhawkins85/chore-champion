import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Gear, Trophy } from '@phosphor-icons/react'
import { Child, GoalTracker, Reward, Category } from '@/lib/types'
import { getRewardCostForChild } from '@/lib/helpers'

interface ChildSelectorProps {
  childrenList: Child[]
  childPoints: Map<string, number>
  pendingPurchasesCount: number
  onSelect: (child: Child) => void
  onParentMode: () => void
  trackedGoals?: GoalTracker[]
  rewards?: Reward[]
  categoryPoints?: Map<string, Map<string, number>>
  categories?: Category[]
}

export function ChildSelector({ 
  childrenList, 
  childPoints, 
  pendingPurchasesCount, 
  onSelect, 
  onParentMode,
  trackedGoals = [],
  rewards = [],
  categoryPoints,
  categories = [],
}: ChildSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 p-8">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-fredoka font-bold text-center mb-12 text-foreground"
        >
          Who's ready for chores?
        </motion.h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {childrenList.map((child, index) => {
            const initials = child.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            const childGoal = trackedGoals.find(g => g.childId === child.id)
            const goalReward = childGoal ? rewards.find(r => r.id === childGoal.rewardId) : null
            const currentPoints = childPoints.get(child.id) || 0
            const targetPoints = goalReward ? getRewardCostForChild(goalReward, child.id) : 0
            const progress = goalReward ? Math.min((currentPoints / targetPoints) * 100, 100) : 0
            const childCategoryPoints = categoryPoints?.get(child.id)

            return (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="cursor-pointer hover:scale-105 transition-all hover:shadow-2xl"
                  onClick={() => onSelect(child)}
                >
                  <CardContent className="p-8 text-center">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Avatar
                        className="h-24 w-24 mx-auto mb-4"
                        style={{ backgroundColor: child.avatarColor }}
                      >
                        <AvatarFallback className="text-white font-fredoka text-3xl bg-transparent">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <h2 className="text-3xl font-fredoka font-bold mb-2">
                      {child.name}
                    </h2>
                    <p className="text-2xl font-fredoka text-accent mb-3">
                      {currentPoints} ⭐
                    </p>
                    
                    {childCategoryPoints && categories.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mb-3">
                        {categories.map((category) => {
                          const points = childCategoryPoints.get(category.id) || 0
                          return (
                            <Badge
                              key={category.id}
                              variant="outline"
                              className="font-fredoka text-sm"
                              style={{ borderColor: category.color, color: category.color }}
                            >
                              {category.name}: {points}
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                    
                    {goalReward && (
                      <div className="mt-4 pt-4 border-t space-y-2">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                          <Trophy className="h-4 w-4" weight="fill" />
                          <span>Goal: {goalReward.name}</span>
                        </div>
                        <div className="space-y-1">
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {currentPoints} / {targetPoints} points
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: childrenList.length * 0.1 }}
          >
            <Card
              className="cursor-pointer hover:scale-105 transition-all hover:shadow-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/5 to-accent/5"
              onClick={onParentMode}
            >
              <CardContent className="p-8 text-center relative">
                {pendingPurchasesCount > 0 && (
                  <div className="absolute top-3 right-3 bg-accent text-accent-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                    {pendingPurchasesCount}
                  </div>
                )}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="h-24 w-24 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
                    <Gear className="h-12 w-12 text-primary-foreground" weight="fill" />
                  </div>
                </motion.div>
                <h2 className="text-3xl font-fredoka font-bold mb-2">
                  Parent Mode
                </h2>
                <p className="text-lg font-fredoka text-muted-foreground">
                  Manage & Configure
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
