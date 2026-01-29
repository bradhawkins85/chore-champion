import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { CheckCircle, ArrowCounterClockwise, Warning, MagnifyingGlass, Funnel } from '@phosphor-icons/react'
import { Child, Chore, ChoreCompletion } from '@/lib/types'
import { format, isToday, isYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

interface ChoreCompletionHistoryProps {
  completions: ChoreCompletion[]
  childrenList: Child[]
  chores: Chore[]
  onUndoCompletion: (completionId: string) => void
}

export function ChoreCompletionHistory({
  completions,
  childrenList,
  chores,
  onUndoCompletion,
}: ChoreCompletionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [selectedChore, setSelectedChore] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [undoConfirmId, setUndoConfirmId] = useState<string | null>(null)

  const filteredCompletions = useMemo(() => {
    let filtered = [...completions]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((completion) => {
        const child = childrenList.find((c) => c.id === completion.childId)
        const chore = chores.find((c) => c.id === completion.choreId)
        return (
          child?.name.toLowerCase().includes(query) ||
          chore?.name.toLowerCase().includes(query)
        )
      })
    }

    if (selectedChild !== 'all') {
      filtered = filtered.filter((c) => c.childId === selectedChild)
    }

    if (selectedChore !== 'all') {
      filtered = filtered.filter((c) => c.choreId === selectedChore)
    }

    if (dateFilter !== 'all') {
      const now = Date.now()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTimestamp = today.getTime()

      filtered = filtered.filter((completion) => {
        switch (dateFilter) {
          case 'today':
            return completion.completedAt >= todayTimestamp
          case 'week':
            return completion.completedAt >= startOfWeek(today).getTime()
          case 'month':
            return completion.completedAt >= startOfMonth(today).getTime()
          default:
            return true
        }
      })
    }

    return filtered.sort((a, b) => b.completedAt - a.completedAt)
  }, [completions, searchQuery, selectedChild, selectedChore, dateFilter, childrenList, chores])

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

  const handleUndoClick = (completionId: string) => {
    setUndoConfirmId(completionId)
  }

  const handleConfirmUndo = () => {
    if (undoConfirmId) {
      onUndoCompletion(undoConfirmId)
      setUndoConfirmId(null)
    }
  }

  const getApprovalStatusBadge = (completion: ChoreCompletion) => {
    if (!completion.approvalStatus || completion.approvalStatus === 'approved') {
      return null
    }

    if (completion.approvalStatus === 'pending') {
      return (
        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
          Pending Approval
        </Badge>
      )
    }

    if (completion.approvalStatus === 'rejected') {
      return (
        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
          Rejected
        </Badge>
      )
    }

    return null
  }

  const totalCompletions = filteredCompletions.length
  const approvedCount = filteredCompletions.filter(
    (c) => !c.approvalStatus || c.approvalStatus === 'approved'
  ).length
  const pendingCount = filteredCompletions.filter(
    (c) => c.approvalStatus === 'pending'
  ).length
  const rejectedCount = filteredCompletions.filter(
    (c) => c.approvalStatus === 'rejected'
  ).length

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-fredoka">Chore Completion History</CardTitle>
          <p className="text-sm text-muted-foreground">
            View and manage all chore completions
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="text-sm">
              {totalCompletions} Total
            </Badge>
            <Badge variant="default" className="text-sm bg-green-600">
              {approvedCount} Approved
            </Badge>
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-sm bg-yellow-50 text-yellow-700 border-yellow-200">
                {pendingCount} Pending
              </Badge>
            )}
            {rejectedCount > 0 && (
              <Badge variant="outline" className="text-sm bg-red-50 text-red-700 border-red-200">
                {rejectedCount} Rejected
              </Badge>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger>
                <SelectValue placeholder="All Children" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Children</SelectItem>
                {childrenList.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedChore} onValueChange={setSelectedChore}>
              <SelectTrigger>
                <SelectValue placeholder="All Chores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chores</SelectItem>
                {chores.map((chore) => (
                  <SelectItem key={chore.id} value={chore.id}>
                    {chore.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredCompletions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg text-muted-foreground">
                {completions.length === 0
                  ? 'No completions yet. Chores will appear here as they are completed.'
                  : 'No completions match your filters.'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {filteredCompletions.map((completion) => {
                  const child = childrenList.find((c) => c.id === completion.childId)
                  const chore = chores.find((c) => c.id === completion.choreId)

                  return (
                    <div
                      key={completion.id}
                      className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="mt-0.5">
                        {completion.overridden ? (
                          <Warning className="h-5 w-5 text-primary" weight="fill" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium">{getChildName(completion.childId)}</span>
                          <span className="text-muted-foreground">completed</span>
                          <span className="font-medium">{getChoreName(completion.choreId)}</span>
                          {completion.timeOfDay && (
                            <Badge variant="secondary" className="text-xs">
                              {completion.timeOfDay.toUpperCase()}
                            </Badge>
                          )}
                          {completion.overridden && (
                            <Badge variant="outline" className="text-xs">
                              Parent Override
                            </Badge>
                          )}
                          {getApprovalStatusBadge(completion)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(completion.completedAt)}
                        </div>
                        {completion.rejectedReason && (
                          <div className="text-sm text-red-600 mt-1">
                            Reason: {completion.rejectedReason}
                          </div>
                        )}
                        {completion.approvalStatus === 'approved' && completion.approvedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Approved {formatDate(completion.approvedAt)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {child && (
                          <div
                            className="w-8 h-8 rounded-full flex-shrink-0"
                            style={{ backgroundColor: child.avatarColor }}
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUndoClick(completion.id)}
                          className="flex-shrink-0"
                        >
                          <ArrowCounterClockwise className="h-4 w-4 mr-2" />
                          Undo
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={undoConfirmId !== null} onOpenChange={() => setUndoConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo Chore Completion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to undo this chore completion? This will remove the points awarded for this chore and mark it as incomplete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUndo}>
              Undo Completion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
