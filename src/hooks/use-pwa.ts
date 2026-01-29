import { useEffect, useState } from 'react'
import { isStandalone, canInstallPWA, installPWA, getInstallInstructions } from '@/lib/pwaHelper'

export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsInstalled(isStandalone())
    setIsOnline(navigator.onLine)

    const checkInstallability = () => {
      setCanInstall(canInstallPWA())
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    checkInstallability()
    const interval = setInterval(checkInstallability, 1000)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const install = async () => {
    return await installPWA()
  }

  const instructions = getInstallInstructions()

  return {
    isInstalled,
    canInstall,
    isOnline,
    install,
    instructions,
  }
}
