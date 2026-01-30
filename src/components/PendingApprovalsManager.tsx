import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, X, Clock, SunHorizon, MoonStars, PaperPlaneTilt } from '@phosphor-icons/react'
import { Child, Chore, ChoreCompletion, EmailAlertSettings } from '@/lib/types'

interface PendingApprovalsManagerProps {
  childrenList: Child[]
  chores: Chore[]
  completions: ChoreCompletion[]
  onApprove: (completionId: string) => void
  onReject: (completionId: string, reason?: string) => void
  emailAlertSettings: EmailAlertSettings
  pendingDigestItems: any[]
  onSendDigestNow: () => void
}

export function PendingApprovalsManager({
  childrenList,
  chores,
  completions,
  onApprove,
  onReject,
  emailAlertSettings,
  pendingDigestItems,
  onSendDigestNow,
}: PendingApprovalsManagerProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedCompletion, setSelectedCompletion] = useState<ChoreCompletion | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Ensure pendingDigestItems is always an array
  const digestItems = Array.isArray(pendingDigestItems) ? pendingDigestItems : []

  const pendingCompletions = completions
    .filter((c) => c.approvalStatus === 'pending')
    .sort((a, b) => a.completedAt - b.completedAt)

  const getDigestModeLabel = (mode: string): string => {
    switch (mode) {
      case 'immediate': return 'Immediate'
      case '15min': return 'Every 15 minutes'
      case '30min': return 'Every 30 minutes'
      case '1hour': return 'Every 1 hour'
      case '2hours': return 'Every 2 hours'
      case '4hours': return 'Every 4 hours'
      case 'daily': return 'Once daily'
      default: return 'Immediate'
    }
  }

  const handleRejectClick = (completion: ChoreCompletion) => {
    setSelectedCompletion(completion)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  const handleRejectConfirm = () => {
    if (selectedCompletion) {
      onReject(selectedCompletion.id, rejectReason)
      setRejectDialogOpen(false)
      setSelectedCompletion(null)
      setRejectReason('')
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (pendingCompletions.length === 0) {
    return (
      <>
        {emailAlertSettings.digestMode !== 'immediate' && digestItems.length > 0 && (
          <Card className="mb-4 border-primary/50 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {digestItems.length} approval{digestItems.length > 1 ? 's' : ''} queued for digest
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Digest mode: {getDigestModeLabel(emailAlertSettings.digestMode)}
                    </p>
                  </div>
                </div>
                <Button onClick={onSendDigestNow} size="sm">
                  <PaperPlaneTilt className="h-4 w-4 mr-2" />
                  Send Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="py-12 text-center">
            <Check className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg text-muted-foreground mb-2">
              All caught up!
            </p>
            <p className="text-sm text-muted-foreground">
              No chores are pending approval right now.
            </p>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      {emailAlertSettings.digestMode !== 'immediate' && digestItems.length > 0 && (
        <Card className="mb-4 border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">
                    {digestItems.length} approval{digestItems.length > 1 ? 's' : ''} queued for digest
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Digest mode: {getDigestModeLabel(emailAlertSettings.digestMode)}
                  </p>
                </div>
              </div>
              <Button onClick={onSendDigestNow} size="sm">
                <PaperPlaneTilt className="h-4 w-4 mr-2" />
                Send Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-3">
        {pendingCompletions.map((completion) => {
          const child = childrenList.find((c) => c.id === completion.childId)
          const chore = chores.find((c) => c.id === completion.choreId)

          if (!child || !chore) return null

          return (
            <Card key={completion.id} className="border-2 border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar
                      className="h-10 w-10 border-2"
                      style={{ borderColor: child.avatarColor }}
                    >
                      <AvatarFallback
                        className="text-white font-bold text-sm"
                        style={{ backgroundColor: child.avatarColor }}
                      >
                        {child.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg font-fredoka">
                          {chore.name}
                        </CardTitle>
                        {completion.timeOfDay === 'am' && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <SunHorizon className="h-3 w-3" />
                            AM
                          </Badge>
                        )}
                        {completion.timeOfDay === 'pm' && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <MoonStars className="h-3 w-3" />
                            PM
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">{child.name}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTimestamp(completion.completedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectClick(completion)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onApprove(completion.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {chore.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {chore.description}
                  </p>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Chore Completion</DialogTitle>
            <DialogDescription>
              Provide an optional reason for rejecting this chore completion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Optional: Explain why this chore wasn't completed correctly..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
            >
              Reject Completion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
