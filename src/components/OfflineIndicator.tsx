import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { WifiSlash, WifiHigh, ArrowsClockwise, Warning } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useServerStatus } from '@/hooks/use-server-status'
import { Button } from '@/components/ui/button'

export function OfflineIndicator() {
  const [isNetworkOnline, setIsNetworkOnline] = useState(true)
  const [wasNetworkOffline, setWasNetworkOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)
  const [displayedOfflineDuration, setDisplayedOfflineDuration] = useState(0)
  const [wasServerOffline, setWasServerOffline] = useState(false)
  const [showServerReconnected, setShowServerReconnected] = useState(false)
  
  const { isServerOnline, offlineDuration, manualRefresh } = useServerStatus()

  // Update displayed offline duration every second for smooth countdown
  useEffect(() => {
    if (!isServerOnline && offlineDuration > 0) {
      setDisplayedOfflineDuration(offlineDuration)
      setWasServerOffline(true)
      
      const interval = setInterval(() => {
        setDisplayedOfflineDuration(prev => prev + 1000)
      }, 1000)
      
      return () => clearInterval(interval)
    } else {
      setDisplayedOfflineDuration(0)
      
      // Server came back online
      if (wasServerOffline && isServerOnline) {
        setShowServerReconnected(true)
        setTimeout(() => {
          setShowServerReconnected(false)
          setWasServerOffline(false)
        }, 5000) // Show for 5 seconds
      }
    }
  }, [isServerOnline, offlineDuration]) // Removed wasServerOffline to prevent dependency loop

  useEffect(() => {
    const handleOnline = () => {
      setIsNetworkOnline(true)
      if (wasNetworkOffline) {
        setShowReconnected(true)
        setTimeout(() => {
          setShowReconnected(false)
          setWasNetworkOffline(false)
        }, 3000)
      }
    }

    const handleOffline = () => {
      setIsNetworkOnline(false)
      setWasNetworkOffline(true)
      setShowReconnected(false)
    }

    setIsNetworkOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasNetworkOffline])

  // Determine what to show
  const showNetworkReconnected = isNetworkOnline && showReconnected
  const showNetworkOffline = !isNetworkOnline
  const showServerOffline = isNetworkOnline && !isServerOnline

  // Don't show anything if everything is online and no reconnection message
  if (isNetworkOnline && isServerOnline && !showReconnected && !showServerReconnected) {
    return null
  }

  // Format offline duration for display
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2"
      style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
    >
      <Card
        className={cn(
          'border-2 shadow-lg',
          showNetworkReconnected || showServerReconnected
            ? 'border-primary/50 bg-primary/10'
            : 'border-destructive/50 bg-destructive/10'
        )}
      >
        <CardContent className="p-3 px-4 flex items-center gap-3">
          {showNetworkReconnected ? (
            <>
              <WifiHigh className="h-5 w-5 text-primary animate-pulse" />
              <div className="text-sm">
                <div className="font-semibold text-primary">Back Online</div>
                <div className="text-xs text-primary/80">
                  Connection restored
                </div>
              </div>
            </>
          ) : showServerReconnected ? (
            <>
              <WifiHigh className="h-5 w-5 text-primary animate-pulse" />
              <div className="text-sm flex-1">
                <div className="font-semibold text-primary">Server Back Online</div>
                <div className="text-xs text-primary/80">
                  Refresh when you are ready to load the latest updates
                </div>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={manualRefresh}
                className="ml-2 bg-primary"
              >
                <ArrowsClockwise className="h-4 w-4 mr-1" />
                Refresh Now
              </Button>
            </>
          ) : showNetworkOffline ? (
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
          ) : showServerOffline ? (
            <>
              <Warning className="h-5 w-5 text-yellow-600 animate-pulse" />
              <div className="text-sm flex-1">
                <div className="font-semibold text-yellow-700">
                  Server Temporarily Unavailable
                </div>
                <div className="text-xs text-yellow-600/90">
                  {displayedOfflineDuration > 0 && `Offline for ${formatDuration(displayedOfflineDuration)} • `}
                  Changes will not be saved until reconnected
                </div>
                <div className="text-xs text-yellow-600/80 mt-1">
                  Refresh when ready after the server is back online
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={manualRefresh}
                className="ml-2"
              >
                <ArrowsClockwise className="h-4 w-4 mr-1" />
                Refresh Now
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
