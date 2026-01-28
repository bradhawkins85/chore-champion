import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowCounterClockwise, CheckCircle } from '@phosphor-icons/react'
import { Child, Chore, ChoreHistoryEvent } from '@/lib/types'
import { format, isToday, isYesterday } from 'date-fns'

interface UndoHistoryProps {
  history: ChoreHistoryEvent[]
  childrenList: Child[]
  chores: Chore[]
}

export function UndoHistory({ history, childrenList, chores }: UndoHistoryProps) {
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
                    ) : (
                      <ArrowCounterClockwise className="h-5 w-5 text-orange-600" weight="fill" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{getChildName(event.childId)}</span>
                      <span className="text-muted-foreground">
                        {event.type === 'complete' ? 'completed' : 'undid'}
                      </span>
                      <span className="font-medium">{getChoreName(event.choreId)}</span>
                      {event.timeOfDay && (
                        <Badge variant="secondary" className="text-xs">
                          {event.timeOfDay.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatDate(event.timestamp)}
                    </div>
                  </div>

                  {child && (
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: child.avatarColor }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
