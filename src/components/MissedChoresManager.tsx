import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Warning, CheckCircle, XCircle, SunHorizon, MoonStars } from '@phosphor-icons/react'
import { Child, Chore, ChoreAssignment, ChoreCompletion, MissedChore } from '@/lib/types'
import { isChoreMissed, isChoreCompletedForTimeOfDay, isChoreActive, isChoreActiveToday, getCurrentTimeOfDay } from '@/lib/helpers'

interface MissedChoresManagerProps {
  childrenList: Child[]
  chores: Chore[]
  assignments: ChoreAssignment[]
  completions: ChoreCompletion[]
  dismissedMissedChores: MissedChore[]
  onOverrideComplete: (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => void
  onDismissMissed: (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => void
}

interface MissedChoreItem {
  child: Child
  chore: Chore
  timeOfDay?: 'am' | 'pm'
}

export function MissedChoresManager({
  childrenList,
  chores,
  assignments,
  completions,
  dismissedMissedChores,
  onOverrideComplete,
  onDismissMissed,
}: MissedChoresManagerProps) {
  const [confirmAction, setConfirmAction] = useState<{
    type: 'complete' | 'dismiss'
    item: MissedChoreItem
  } | null>(null)

  const missedChoresList = useMemo(() => {
    const missed: MissedChoreItem[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()
    const currentTimeOfDay = getCurrentTimeOfDay()

    childrenList.forEach((child) => {
      const childAssignments = assignments.filter((a) => a.childId === child.id)

      childAssignments.forEach((assignment) => {
        const chore = chores.find((c) => c.id === assignment.choreId)
        if (!chore || !isChoreActive(assignment) || !isChoreActiveToday(assignment)) {
          return
        }

        const isDismissed = (timeOfDay?: 'am' | 'pm') =>
          dismissedMissedChores.some(
            (d) =>
              d.childId === child.id &&
              d.choreId === chore.id &&
              d.timeOfDay === timeOfDay &&
              d.missedDate === todayTimestamp &&
              d.dismissed
          )

        if (chore.timeOfDay === 'both') {
          const amCompleted = isChoreCompletedForTimeOfDay(completions, chore.id, child.id, 'am')
          
          if (currentTimeOfDay === 'pm' && !amCompleted && !isDismissed('am')) {
            missed.push({ child, chore, timeOfDay: 'am' })
          }
        } else if (chore.timeOfDay === 'am' || chore.timeOfDay === 'pm') {
          const isMissedChore = isChoreMissed(chore.timeOfDay, completions, chore.id, child.id)
          
          if (isMissedChore && !isDismissed(chore.timeOfDay)) {
            missed.push({ child, chore, timeOfDay: chore.timeOfDay })
          }
        }
      })
    })

    return missed
  }, [childrenList, chores, assignments, completions, dismissedMissedChores])

  const handleCompleteClick = (item: MissedChoreItem) => {
    setConfirmAction({ type: 'complete', item })
  }

  const handleDismissClick = (item: MissedChoreItem) => {
    setConfirmAction({ type: 'dismiss', item })
  }

  const handleConfirm = () => {
    if (!confirmAction) return

    if (confirmAction.type === 'complete') {
      onOverrideComplete(
        confirmAction.item.child.id,
        confirmAction.item.chore.id,
        confirmAction.item.timeOfDay
      )
    } else {
      onDismissMissed(
        confirmAction.item.child.id,
        confirmAction.item.chore.id,
        confirmAction.item.timeOfDay
      )
    }
    setConfirmAction(null)
  }

  if (missedChoresList.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            No missed chores today! Everyone is on track.
          </p>
        </CardContent>
      </Card>
    )
  }

  const groupedByChild = missedChoresList.reduce((acc, item) => {
    if (!acc[item.child.id]) {
      acc[item.child.id] = { child: item.child, items: [] }
    }
    acc[item.child.id].items.push(item)
    return acc
  }, {} as Record<string, { child: Child; items: MissedChoreItem[] }>)

  return (
    <>
      <div className="space-y-6">
        {Object.values(groupedByChild).map(({ child, items }) => (
          <Card key={child.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white font-fredoka font-bold text-lg"
                  style={{ backgroundColor: child.avatarColor }}
                >
                  {child.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="font-fredoka">{child.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {items.length} missed {items.length === 1 ? 'chore' : 'chores'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={`${item.chore.id}-${item.timeOfDay || 'anytime'}-${index}`}
                    className="flex items-center justify-between p-4 rounded-lg border bg-destructive/5 border-destructive/20"
                  >
                    <div className="flex items-center gap-3">
                      <Warning className="h-6 w-6 text-destructive flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-fredoka font-semibold">
                            {item.chore.name}
                          </h4>
                          {item.timeOfDay && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              {item.timeOfDay === 'am' ? (
                                <>
                                  <SunHorizon className="h-3 w-3" />
                                  Morning
                                </>
                              ) : (
                                <>
                                  <MoonStars className="h-3 w-3" />
                                  Evening
                                </>
                              )}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.chore.points} points
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleCompleteClick(item)}
                        className="font-fredoka"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Award Points
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDismissClick(item)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'complete'
                ? 'Award Points for Missed Chore?'
                : 'Dismiss Missed Chore?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'complete' ? (
                <>
                  This will mark "{confirmAction.item.chore.name}" as complete and award{' '}
                  {confirmAction.item.chore.points} points to {confirmAction.item.child.name}.
                  This action will be recorded in the activity history.
                </>
              ) : (
                <>
                  This will remove "{confirmAction?.item.chore.name}" from the missed chores list
                  for {confirmAction?.item.child.name} today. No points will be awarded.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {confirmAction?.type === 'complete' ? 'Award Points' : 'Dismiss'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
