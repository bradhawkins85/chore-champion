import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LockKey, Check, Warning, ShieldWarning, Fingerprint } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { PinSecurity, BiometricSettings } from '@/lib/types'
import { isAccountLocked, calculateLockoutDuration, formatLockoutTime } from '@/lib/helpers'
import { authenticateWithBiometric, getBiometricDisplayName } from '@/lib/biometric'
import { toast } from 'sonner'

interface ParentPinDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  storedPin: string | null
  onSetPin: (pin: string) => void
  pinSecurity: PinSecurity
  onUpdatePinSecurity: (security: PinSecurity) => void
  biometricSettings?: BiometricSettings
  onUpdateBiometricSettings?: (settings: BiometricSettings) => void
}

export function ParentPinDialog({
  open,
  onClose,
  onSuccess,
  storedPin,
  onSetPin,
  pinSecurity,
  onUpdatePinSecurity,
  biometricSettings,
  onUpdateBiometricSettings,
}: ParentPinDialogProps) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [isSettingPin, setIsSettingPin] = useState(false)
  const [lockoutTime, setLockoutTime] = useState<number | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [showPinInput, setShowPinInput] = useState(false)

  useEffect(() => {
    if (open) {
      setPin('')
      setConfirmPin('')
      setError('')
      setIsSettingPin(!storedPin)
      setShowPinInput(false)
      
      const lockStatus = isAccountLocked(pinSecurity)
      if (lockStatus.isLocked && lockStatus.remainingTime) {
        setLockoutTime(lockStatus.remainingTime)
      } else {
        setLockoutTime(null)
      }
      
      if (
        !isSettingPin &&
        biometricSettings?.enabled &&
        biometricSettings.credentials.length > 0 &&
        !lockStatus.isLocked
      ) {
        handleBiometricAuth()
      }
    }
  }, [open, storedPin, pinSecurity, biometricSettings])

  useEffect(() => {
    if (!lockoutTime || lockoutTime <= 0) return

    const interval = setInterval(() => {
      setLockoutTime((prev) => {
        if (prev === null || prev <= 1000) {
          const updatedSecurity: PinSecurity = {
            ...pinSecurity,
            lockedUntil: null,
            failedAttempts: 0,
          }
          onUpdatePinSecurity(updatedSecurity)
          return null
        }
        return prev - 1000
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [lockoutTime])

  const handleBiometricAuth = async () => {
    if (!biometricSettings || !biometricSettings.enabled || biometricSettings.credentials.length === 0) {
      return
    }

    setIsAuthenticating(true)
    setError('')

    try {
      const credentialId = await authenticateWithBiometric(biometricSettings.credentials)
      
      const matchedCredential = biometricSettings.credentials.find(c => c.id === credentialId)
      if (matchedCredential && onUpdateBiometricSettings) {
        const updatedCredentials = biometricSettings.credentials.map(c =>
          c.id === credentialId ? { ...c, lastUsed: Date.now() } : c
        )
        onUpdateBiometricSettings({
          ...biometricSettings,
          credentials: updatedCredentials,
        })
      }

      const successSecurity: PinSecurity = {
        attempts: [
          ...pinSecurity.attempts,
          { timestamp: Date.now(), success: true },
        ],
        lockedUntil: null,
        failedAttempts: 0,
      }
      onUpdatePinSecurity(successSecurity)
      
      onSuccess()
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('cancelled')) {
          setShowPinInput(true)
        } else {
          setError(error.message)
          setShowPinInput(true)
        }
      } else {
        setError('Biometric authentication failed')
        setShowPinInput(true)
      }
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isSettingPin) {
      if (pin.length < 4) {
        setError('PIN must be at least 4 characters')
        return
      }
      if (pin !== confirmPin) {
        setError('PINs do not match')
        return
      }
      onSetPin(pin)
      
      const resetSecurity: PinSecurity = {
        attempts: [],
        lockedUntil: null,
        failedAttempts: 0,
      }
      onUpdatePinSecurity(resetSecurity)
      
      onSuccess()
    } else {
      const lockStatus = isAccountLocked(pinSecurity)
      if (lockStatus.isLocked && lockStatus.remainingTime) {
        setError(`Account locked. Try again in ${formatLockoutTime(lockStatus.remainingTime)}`)
        return
      }

      if (pin === storedPin) {
        const successSecurity: PinSecurity = {
          attempts: [
            ...pinSecurity.attempts,
            { timestamp: Date.now(), success: true },
          ],
          lockedUntil: null,
          failedAttempts: 0,
        }
        onUpdatePinSecurity(successSecurity)
        onSuccess()
      } else {
        const newFailedAttempts = pinSecurity.failedAttempts + 1
        const lockoutDuration = calculateLockoutDuration(newFailedAttempts)
        
        const failedSecurity: PinSecurity = {
          attempts: [
            ...pinSecurity.attempts,
            { timestamp: Date.now(), success: false },
          ],
          lockedUntil: lockoutDuration > 0 ? Date.now() + lockoutDuration : null,
          failedAttempts: newFailedAttempts,
        }
        onUpdatePinSecurity(failedSecurity)
        
        if (lockoutDuration > 0) {
          setLockoutTime(lockoutDuration)
          setError(`Too many failed attempts. Account locked for ${formatLockoutTime(lockoutDuration)}`)
        } else {
          const remainingAttempts = 5 - newFailedAttempts
          if (remainingAttempts > 0) {
            setError(`Incorrect PIN (${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining)`)
          } else {
            setError('Incorrect PIN')
          }
        }
        
        setPin('')
      }
    }
  }

  const handlePinChange = (value: string) => {
    setPin(value)
    setError('')
  }

  const handleConfirmPinChange = (value: string) => {
    setConfirmPin(value)
    setError('')
  }

  const isLocked = lockoutTime !== null && lockoutTime > 0
  const attemptsRemaining = Math.max(0, 5 - pinSecurity.failedAttempts)
  const showWarning = !isSettingPin && pinSecurity.failedAttempts >= 3 && !isLocked
  
  const hasBiometric = biometricSettings?.enabled && biometricSettings.credentials.length > 0
  const shouldShowBiometric = !isSettingPin && hasBiometric && !isLocked && !showPinInput
  const shouldShowPinFallback = !isSettingPin && hasBiometric && biometricSettings?.requirePinFallback && !isLocked

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-fredoka text-2xl">
            {isLocked ? (
              <>
                <ShieldWarning className="h-6 w-6 text-destructive" weight="fill" />
                Account Locked
              </>
            ) : (
              <>
                <LockKey className="h-6 w-6 text-primary" weight="fill" />
                {isSettingPin ? 'Set Parent PIN' : 'Enter Parent PIN'}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isLocked
              ? `Too many failed attempts. Please wait before trying again.`
              : isSettingPin
              ? 'Create a PIN to protect Parent Mode from unauthorized access.'
              : 'Enter your PIN to access Parent Mode.'}
          </DialogDescription>
        </DialogHeader>

        {isLocked ? (
          <div className="py-8 text-center space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex justify-center"
            >
              <ShieldWarning className="h-16 w-16 text-destructive" weight="fill" />
            </motion.div>
            <div className="space-y-2">
              <p className="text-lg font-fredoka font-semibold text-destructive">
                Account Temporarily Locked
              </p>
              <p className="text-2xl font-bold text-foreground">
                {formatLockoutTime(lockoutTime)}
              </p>
              <p className="text-sm text-muted-foreground">
                remaining until you can try again
              </p>
            </div>
          </div>
        ) : shouldShowBiometric ? (
          <div className="py-8 space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Fingerprint className={`h-12 w-12 text-primary ${isAuthenticating ? 'animate-pulse' : ''}`} weight="fill" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-fredoka font-semibold">
                  {isAuthenticating ? 'Authenticating...' : 'Use Biometric Authentication'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isAuthenticating 
                    ? `Complete authentication using ${getBiometricDisplayName()}`
                    : `Tap below to authenticate with ${getBiometricDisplayName()}`
                  }
                </p>
              </div>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-destructive text-sm text-center font-medium"
              >
                {error}
              </motion.div>
            )}

            <div className="flex flex-col gap-2">
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
              
              {(shouldShowPinFallback || error) && (
                <Button
                  variant="outline"
                  onClick={() => setShowPinInput(true)}
                  className="w-full font-fredoka"
                  disabled={isAuthenticating}
                >
                  <LockKey className="h-4 w-4 mr-2" />
                  Use PIN Instead
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={onClose}
                className="w-full font-fredoka"
                disabled={isAuthenticating}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {showWarning && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md"
              >
                <Warning className="h-5 w-5 text-destructive flex-shrink-0" weight="fill" />
                <p className="text-sm text-destructive font-medium">
                  {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before lockout
                </p>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pin" className="font-fredoka">
                {isSettingPin ? 'Create PIN' : 'PIN'}
              </Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                placeholder={isSettingPin ? 'Enter 4+ digit PIN' : 'Enter PIN'}
                className="text-2xl tracking-widest text-center"
                autoFocus
                autoComplete="off"
              />
            </div>

            {isSettingPin && (
              <div className="space-y-2">
                <Label htmlFor="confirm-pin" className="font-fredoka">
                  Confirm PIN
                </Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPin}
                  onChange={(e) => handleConfirmPinChange(e.target.value)}
                  placeholder="Re-enter PIN"
                  className="text-2xl tracking-widest text-center"
                  autoComplete="off"
                />
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-destructive text-sm text-center font-medium"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 font-fredoka"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 font-fredoka"
                disabled={!pin || (isSettingPin && !confirmPin)}
              >
                <Check className="h-4 w-4 mr-2" />
                {isSettingPin ? 'Set PIN' : 'Unlock'}
              </Button>
            </div>

            {!isSettingPin && shouldShowPinFallback && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBiometricAuth}
                className="w-full font-fredoka text-sm"
                size="sm"
              >
                <Fingerprint className="h-4 w-4 mr-2" />
                Use {getBiometricDisplayName()} Instead
              </Button>
            )}
          </form>
        )}

        {isSettingPin && !isLocked && (
          <p className="text-xs text-muted-foreground text-center">
            Remember this PIN! You'll need it to access Parent Mode.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
