export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

export const initializePWA = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New service worker available')
                  if (confirm('A new version of ChoreQuest is available. Reload to update?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' })
                    window.location.reload()
                  }
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    })
  }

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    console.log('Install prompt ready')
  })

  window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully')
    deferredPrompt = null
  })
}

export const canInstallPWA = (): boolean => {
  return deferredPrompt !== null
}

export const installPWA = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    return false
  }

  try {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    console.log(`Install prompt outcome: ${outcome}`)
    deferredPrompt = null
    
    return outcome === 'accepted'
  } catch (error) {
    console.error('Error showing install prompt:', error)
    return false
  }
}

export const isStandalone = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

export const getInstallInstructions = (): { platform: string; instructions: string } => {
  const userAgent = navigator.userAgent.toLowerCase()
  
  if (isStandalone()) {
    return {
      platform: 'installed',
      instructions: 'App is already installed!'
    }
  }
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return {
      platform: 'iOS',
      instructions: 'Tap the Share button in Safari, then tap "Add to Home Screen"'
    }
  }
  
  if (/android/.test(userAgent)) {
    return {
      platform: 'Android',
      instructions: 'Tap the menu button (⋮) and select "Install app" or "Add to Home screen"'
    }
  }
  
  return {
    platform: 'Desktop',
    instructions: 'Click the install icon in your browser\'s address bar'
  }
}
