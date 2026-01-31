import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { WifiSlash, WifiHigh } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        setShowReconnected(true)
        setTimeout(() => {
          setShowReconnected(false)
          setWasOffline(false)
        }, 3000)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      setShowReconnected(false)
    }

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  if (isOnline && !showReconnected) {
    return null
  }

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2"
      style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
    >
      <Card
        className={cn(
          'border-2 shadow-lg',
          showReconnected
            ? 'border-primary/50 bg-primary/10'
            : 'border-destructive/50 bg-destructive/10'
        )}
      >
        <CardContent className="p-3 px-4 flex items-center gap-3">
          {showReconnected ? (
            <>
              <WifiHigh className="h-5 w-5 text-primary animate-pulse" />
              <div className="text-sm">
                <div className="font-semibold text-primary">Back Online</div>
                <div className="text-xs text-primary/80">
                  Connection restored
                </div>
              </div>
            </>
          ) : (
            <>
              <WifiSlash className="h-5 w-5 text-destructive animate-pulse" />
              <div className="text-sm">
                <div className="font-semibold text-destructive">
                  No Internet Connection
                </div>
                <div className="text-xs text-destructive/80">
                  Working in offline mode
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
