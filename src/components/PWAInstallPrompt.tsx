import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, X, DeviceMobile, Globe } from '@phosphor-icons/react'
import { canInstallPWA, installPWA, getInstallInstructions, isStandalone } from '@/lib/pwaHelper'

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [installing, setInstalling] = useState(false)
  const { platform, instructions } = getInstallInstructions()

  useEffect(() => {
    const checkInstallability = () => {
      const installable = canInstallPWA()
      const standalone = isStandalone()
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      
      setCanInstall(installable)
      
      if (installable && !standalone && !dismissed) {
        setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    checkInstallability()
    
    const interval = setInterval(checkInstallability, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleInstall = async () => {
    setInstalling(true)
    const success = await installPWA()
    setInstalling(false)
    
    if (success) {
      setShowPrompt(false)
      localStorage.setItem('pwa-install-dismissed', 'true')
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (isStandalone() || !canInstall) {
    return null
  }

  if (!showPrompt) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowPrompt(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Download className="h-4 w-4 mr-2" />
        Install App
      </Button>
    )
  }

  return (
    <Dialog open={showPrompt} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DeviceMobile className="h-5 w-5 text-primary" />
            Install ChoreQuest
          </DialogTitle>
          <DialogDescription>
            Install ChoreQuest as an app for a better experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Benefits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Works offline - access chores anytime</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Faster loading - optimized performance</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Home screen icon - quick access</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Full screen experience</span>
              </div>
            </CardContent>
          </Card>

          {platform !== 'Desktop' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {platform} Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{instructions}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {installing ? 'Installing...' : 'Install Now'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function PWAStatusIndicator() {
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    setStandalone(isStandalone())
  }, [])

  if (!standalone) return null

  return (
    <div className="fixed top-4 left-4 z-50">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-2 px-3 flex items-center gap-2">
          <DeviceMobile className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">App Mode</span>
        </CardContent>
      </Card>
    </div>
  )
}
