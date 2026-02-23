import { useState } from 'react'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => window.location.reload(), 300)
  }

  return (
    <div
      className="fixed z-40"
      style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', right: 'calc(1.5rem + env(safe-area-inset-right, 0px))' }}
    >
      <Button
        size="icon"
        variant="secondary"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="h-12 w-12 rounded-full shadow-lg"
        aria-label="Refresh page"
      >
        <ArrowsClockwise className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  )
}
