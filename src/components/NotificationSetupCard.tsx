import { Card } from '@/components/ui/card'
import { X, Warning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface NotificationSetupCardProps {
  onSetup: () => void
  onDismiss: () => void
}

export function NotificationSetupCard({ onSetup, onDismiss }: NotificationSetupCardProps) {
  return (
    <Card className="w-full h-full p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
            onClick={onSetup}
            aria-label="Enable notifications"
          >
            <Warning className="h-6 w-6" weight="bold" />
          </Button>
          <div className="flex-1">
            <div className="text-sm font-medium text-amber-900">
              Enable Push Notifications
            </div>
            <div className="text-xs text-amber-700">
              Get alerts for chores and rewards
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
          onClick={onDismiss}
          aria-label="Dismiss notification setup"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </Card>
  )
}
