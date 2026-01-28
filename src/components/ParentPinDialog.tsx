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
import { LockKey, Check } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

interface ParentPinDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  storedPin: string | null
  onSetPin: (pin: string) => void
}

export function ParentPinDialog({
  open,
  onClose,
  onSuccess,
  storedPin,
  onSetPin,
}: ParentPinDialogProps) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [isSettingPin, setIsSettingPin] = useState(false)

  useEffect(() => {
    if (open) {
      setPin('')
      setConfirmPin('')
      setError('')
      setIsSettingPin(!storedPin)
    }
  }, [open, storedPin])

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
      onSuccess()
    } else {
      if (pin === storedPin) {
        onSuccess()
      } else {
        setError('Incorrect PIN')
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-fredoka text-2xl">
            <LockKey className="h-6 w-6 text-primary" weight="fill" />
            {isSettingPin ? 'Set Parent PIN' : 'Enter Parent PIN'}
          </DialogTitle>
          <DialogDescription>
            {isSettingPin
              ? 'Create a PIN to protect Parent Mode from unauthorized access.'
              : 'Enter your PIN to access Parent Mode.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
        </form>

        {isSettingPin && (
          <p className="text-xs text-muted-foreground text-center">
            Remember this PIN! You'll need it to access Parent Mode.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
