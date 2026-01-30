import { useEffect, useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Fingerprint, X, LockKey } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { BiometricSettings, PinSecurity } from '@/lib/types'
import { authenticateWithBiometric, getBiometricDisplayName } from '@/lib/biometric'
import { isStandalone } from '@/lib/pwaHelper'
import { toast } from 'sonner'

interface QuickUnlockPromptProps {
  biometricSettings: BiometricSettings | null
  pinSecurity: PinSecurity
  onSuccess: () => void
  onUpdatePinSecurity: (security: PinSecurity) => void
  onUpdateBiometricSettings: (settings: BiometricSettings) => void
}

export function QuickUnlockPrompt({
  biometricSettings,
  pinSecurity,
  onSuccess,
  onUpdatePinSecurity,
  onUpdateBiometricSettings,
}: QuickUnlockPromptProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const hasAttemptedRef = useRef(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const shouldShow =
      isStandalone() &&
      biometricSettings?.enabled &&
      biometricSettings?.quickUnlockOnPWA &&
      biometricSettings?.credentials?.length > 0 &&
      !hasAttemptedRef.current

    if (shouldShow) {
      const timer = setTimeout(() => {
        setIsOpen(true)
        handleBiometricAuth()
      }, 800)

      return () => clearTimeout(timer)
    }
  }, [biometricSettings])

  const handleBiometricAuth = async () => {
    if (!biometricSettings?.credentials?.length) {
      return
    }

    hasAttemptedRef.current = true
    setIsAuthenticating(true)
    setErrorMessage(null)

    try {
      const credentialId = await authenticateWithBiometric(biometricSettings.credentials)

      const matchedCredential = biometricSettings.credentials.find((c) => c.id === credentialId)
      if (matchedCredential) {
        const updatedCredentials = biometricSettings.credentials.map((c) =>
          c.id === credentialId ? { ...c, lastUsed: Date.now() } : c
        )
        onUpdateBiometricSettings({
          ...biometricSettings,
          credentials: updatedCredentials,
        })
      }

      const successSecurity: PinSecurity = {
        attempts: [...(Array.isArray(pinSecurity.attempts) ? pinSecurity.attempts : []), { timestamp: Date.now(), success: true }],
        lockedUntil: null,
        failedAttempts: 0,
      }
      onUpdatePinSecurity(successSecurity)

      toast.success('Welcome back!', {
        description: 'Quick unlock successful',
      })

      setIsOpen(false)
      onSuccess()
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('cancelled')) {
          setIsOpen(false)
          setErrorMessage(null)
        } else {
          setErrorMessage(error.message)
          setIsAuthenticating(false)
        }
      } else {
        setErrorMessage('Authentication failed')
        setIsAuthenticating(false)
      }
    }
  }

  const handleDismiss = () => {
    setIsOpen(false)
    setErrorMessage(null)
  }

  const handleRetry = () => {
    setErrorMessage(null)
    handleBiometricAuth()
  }

  if (!isStandalone() || !biometricSettings?.enabled || !biometricSettings?.quickUnlockOnPWA) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-fredoka text-2xl">
            <Fingerprint className="h-6 w-6 text-primary" weight="fill" />
            Quick Unlock
          </DialogTitle>
          <DialogDescription>
            Authenticate to access Parent Mode features
          </DialogDescription>
        </DialogHeader>

        <div className="py-8 space-y-6">
          <AnimatePresence mode="wait">
            {errorMessage ? (
              <motion.div
                key="error"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <LockKey className="h-12 w-12 text-destructive" weight="fill" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-fredoka font-semibold text-destructive">
                    Authentication Failed
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {errorMessage}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="auth"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Fingerprint
                    className={`h-12 w-12 text-primary ${isAuthenticating ? 'animate-pulse' : ''}`}
                    weight="fill"
                  />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-fredoka font-semibold">
                    {isAuthenticating ? 'Authenticating...' : 'Use Quick Unlock'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isAuthenticating
                      ? `Complete authentication using ${getBiometricDisplayName()}`
                      : `Tap below to authenticate with ${getBiometricDisplayName()}`}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-2">
            {errorMessage ? (
              <>
                <Button
                  onClick={handleRetry}
                  className="w-full font-fredoka"
                  size="lg"
                >
                  <Fingerprint className="h-5 w-5 mr-2" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="w-full font-fredoka"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {!isAuthenticating && (
                  <Button
                    onClick={handleBiometricAuth}
                    className="w-full font-fredoka"
                    size="lg"
                  >
                    <Fingerprint className="h-5 w-5 mr-2" />
                    Authenticate with {getBiometricDisplayName()}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="w-full font-fredoka"
                  disabled={isAuthenticating}
                >
                  <X className="h-4 w-4 mr-2" />
                  Not Now
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
