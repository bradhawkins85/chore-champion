import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { ArrowCounterClockwise, CheckCircle, Warning, XCircle } from '@phosphor-icons/react'
import { Child, Chore, ChoreHistoryEvent } from '@/lib/types'
import { format, isToday, isYesterday } from 'date-fns'

interface UndoHistoryProps {
  history: ChoreHistoryEvent[]
  childrenList: Child[]
  chores: Chore[]
  onUndoDismissMissed: (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => void
}

export function UndoHistory({ history, childrenList, chores, onUndoDismissMissed }: UndoHistoryProps) {
  const [undoDismissConfirm, setUndoDismissConfirm] = useState<{ childId: string; choreId: string; timeOfDay?: 'am' | 'pm' } | null>(null)
  
  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => b.timestamp - a.timestamp)
  }, [history])

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`
    } else {
      return format(date, 'MMM d, yyyy \'at\' h:mm a')
    }
  }

  const getChildName = (childId: string) => {
    return childrenList.find((c) => c.id === childId)?.name || 'Unknown'
  }

  const getChoreName = (choreId: string) => {
    return chores.find((c) => c.id === choreId)?.name || 'Unknown Chore'
  }

  const handleUndoDismissClick = (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => {
    setUndoDismissConfirm({ childId, choreId, timeOfDay })
  }

  const handleConfirmUndoDismiss = () => {
    if (undoDismissConfirm) {
      onUndoDismissMissed(undoDismissConfirm.childId, undoDismissConfirm.choreId, undoDismissConfirm.timeOfDay)
      setUndoDismissConfirm(null)
    }
  }

  if (sortedHistory.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg text-muted-foreground">
            No history yet. Activity will appear here as chores are completed and undone.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="font-fredoka">Activity History</CardTitle>
        <p className="text-sm text-muted-foreground">
          Recent completions and undo actions
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {sortedHistory.map((event) => {
              const child = childrenList.find((c) => c.id === event.childId)
              const chore = chores.find((c) => c.id === event.choreId)

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-0.5">
                    {event.type === 'complete' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
                    ) : event.type === 'undo' ? (
                      <ArrowCounterClockwise className="h-5 w-5 text-orange-600" weight="fill" />
                    ) : event.type === 'override-complete' ? (
                      <Warning className="h-5 w-5 text-primary" weight="fill" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" weight="fill" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{getChildName(event.childId)}</span>
                      <span className="text-muted-foreground">
                        {event.type === 'complete' 
                          ? 'completed' 
                          : event.type === 'undo' 
                          ? 'undid' 
                          : event.type === 'override-complete'
                          ? 'was awarded points for'
                          : 'had dismissed'}
                      </span>
                      <span className="font-medium">{getChoreName(event.choreId)}</span>
                      {event.timeOfDay && (
                        <Badge variant="secondary" className="text-xs">
                          {event.timeOfDay.toUpperCase()}
                        </Badge>
                      )}
                      {(event.type === 'override-complete' || event.type === 'override-dismiss') && (
                        <Badge variant="outline" className="text-xs">
                          Parent Override
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatDate(event.timestamp)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {child && (
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: child.avatarColor }}
                      />
                    )}
                    {event.type === 'override-dismiss' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUndoDismissClick(event.childId, event.choreId, event.timeOfDay)}
                        className="flex-shrink-0"
                      >
                        <ArrowCounterClockwise className="h-4 w-4 mr-2" />
                        Undo
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>

    <AlertDialog open={undoDismissConfirm !== null} onOpenChange={() => setUndoDismissConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Undo Dismissed Missed Chore</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to undo this dismissal? The missed chore will reappear in the missed chores list for today.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmUndoDismiss}>
            Undo Dismissal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  )
}
