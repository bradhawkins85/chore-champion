import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ViewOnlyBannerProps {
  tenantId: string
  onExit: () => void
}

export function ViewOnlyBanner({ tenantId, onExit }: ViewOnlyBannerProps) {
  const navigate = useNavigate()

  const handleExit = () => {
    onExit()
    navigate('/admin')
  }

  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 py-2 grid-cols-1">
      <div className="flex items-center justify-between w-full gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Eye className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200 font-medium">
            Viewing tenant <span className="font-mono text-xs">{tenantId}</span> in read-only mode
          </AlertDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExit}
          className="h-7 gap-2 bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-700 flex-shrink-0"
        >
          <X className="h-4 w-4" />
          Exit View Mode
        </Button>
      </div>
    </Alert>
  )
}
