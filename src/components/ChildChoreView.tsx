import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CheckCircle, Circle, Calendar, Star } from '@phosphor-icons/react'
import { Child, Chore, ChoreAssignment, ChoreCompletion } from '@/lib/types'
import { isChoreCompleted } from '@/lib/helpers'
import { ChoreCompletionCelebration } from './Celebration'

interface ChildChoreViewProps {
  child: Child
  chores: Chore[]
  assignments: ChoreAssignment[]
  completions: ChoreCompletion[]
  totalPoints: number
  onComplete: (choreId: string) => void
  onBack: () => void
}

export function ChildChoreView({
  child,
  chores,
  assignments,
  completions,
  totalPoints,
  onComplete,
  onBack,
}: ChildChoreViewProps) {
  const [celebrating, setCelebrating] = useState<number | null>(null)

  const assignedChoreIds = new Set(
    assignments.filter((a) => a.childId === child.id).map((a) => a.choreId)
  )
  const childChores = chores.filter((c) => assignedChoreIds.has(c.id))

  const pendingChores = childChores.filter(
    (c) => !isChoreCompleted(completions, c.id, child.id, c.frequency)
  )
  const completedChores = childChores.filter((c) =>
    isChoreCompleted(completions, c.id, child.id, c.frequency)
  )

  const initials = child.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleComplete = (chore: Chore) => {
    setCelebrating(chore.points)
    onComplete(chore.id)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16" style={{ backgroundColor: child.avatarColor }}>
              <AvatarFallback className="text-white font-fredoka text-2xl bg-transparent">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-4xl font-fredoka font-bold">{child.name}'s Chores</h1>
              <div className="flex items-center gap-2 mt-1">
                <Star weight="fill" className="h-6 w-6 text-accent" />
                <span className="text-3xl font-fredoka text-accent">{totalPoints}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={onBack} className="text-lg px-6 py-6">
            Back
          </Button>
        </div>

        {childChores.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-2xl font-fredoka text-muted-foreground">
                No chores assigned yet!
              </p>
              <p className="text-lg text-muted-foreground mt-2">
                Ask a parent to assign some chores.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {pendingChores.length > 0 && (
              <div>
                <h2 className="text-2xl font-fredoka font-bold mb-4">To Do</h2>
                <div className="grid gap-4">
                  {pendingChores.map((chore, index) => (
                    <motion.div
                      key={chore.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="cursor-pointer hover:scale-102 transition-all hover:shadow-xl"
                        onClick={() => handleComplete(chore)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <motion.div whileTap={{ scale: 0.9 }}>
                              <Circle className="h-12 w-12 text-muted-foreground flex-shrink-0" />
                            </motion.div>
                            <div className="flex-1">
                              <h3 className="text-2xl font-fredoka font-bold">
                                {chore.name}
                              </h3>
                              {chore.description && (
                                <p className="text-lg text-muted-foreground mt-1">
                                  {chore.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-3">
                                <Badge
                                  variant="secondary"
                                  className="font-fredoka text-lg px-3 py-1"
                                >
                                  <Star weight="fill" className="h-4 w-4 mr-1" />
                                  {chore.points} pts
                                </Badge>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="h-5 w-5" />
                                  <span className="capitalize text-base">{chore.frequency}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {completedChores.length > 0 && (
              <div>
                <h2 className="text-2xl font-fredoka font-bold mb-4 text-muted-foreground">
                  Completed ✓
                </h2>
                <div className="grid gap-4">
                  {completedChores.map((chore) => (
                    <Card key={chore.id} className="opacity-60">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <CheckCircle
                            weight="fill"
                            className="h-12 w-12 text-primary flex-shrink-0"
                          />
                          <div className="flex-1">
                            <h3 className="text-2xl font-fredoka font-bold line-through">
                              {chore.name}
                            </h3>
                            <Badge
                              variant="secondary"
                              className="font-fredoka text-lg px-3 py-1 mt-2"
                            >
                              <Star weight="fill" className="h-4 w-4 mr-1" />
                              {chore.points} pts
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {pendingChores.length === 0 && completedChores.length > 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8"
              >
                <p className="text-4xl font-fredoka font-bold text-primary">
                  All done! Great job! 🎉
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {celebrating !== null && (
          <ChoreCompletionCelebration
            points={celebrating}
            onComplete={() => setCelebrating(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
