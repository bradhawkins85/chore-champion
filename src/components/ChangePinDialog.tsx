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

interface ChangePinDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (newPin: string) => void
  currentPin: string | null
}

export function ChangePinDialog({
  open,
  onClose,
  onSuccess,
  currentPin,
}: ChangePinDialogProps) {
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setOldPin('')
      setNewPin('')
      setConfirmPin('')
      setError('')
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (currentPin && oldPin !== currentPin) {
      setError('Current PIN is incorrect')
      return
    }

    if (newPin.length < 4) {
      setError('New PIN must be at least 4 characters')
      return
    }

    if (newPin !== confirmPin) {
      setError('New PINs do not match')
      return
    }

    onSuccess(newPin)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-fredoka text-2xl">
            <LockKey className="h-6 w-6 text-primary" weight="fill" />
            Change Parent PIN
          </DialogTitle>
          <DialogDescription>
            Enter your current PIN and choose a new one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {currentPin && (
            <div className="space-y-2">
              <Label htmlFor="old-pin" className="font-fredoka">
                Current PIN
              </Label>
              <Input
                id="old-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={oldPin}
                onChange={(e) => {
                  setOldPin(e.target.value)
                  setError('')
                }}
                placeholder="Enter current PIN"
                className="text-2xl tracking-widest text-center"
                autoFocus
                autoComplete="off"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-pin" className="font-fredoka">
              New PIN
            </Label>
            <Input
              id="new-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newPin}
              onChange={(e) => {
                setNewPin(e.target.value)
                setError('')
              }}
              placeholder="Enter new PIN (4+ digits)"
              className="text-2xl tracking-widest text-center"
              autoFocus={!currentPin}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-pin" className="font-fredoka">
              Confirm New PIN
            </Label>
            <Input
              id="confirm-new-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value)
                setError('')
              }}
              placeholder="Re-enter new PIN"
              className="text-2xl tracking-widest text-center"
              autoComplete="off"
            />
          </div>

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
              disabled={
                (currentPin && !oldPin) ||
                !newPin ||
                !confirmPin
              }
            >
              <Check className="h-4 w-4 mr-2" />
              Change PIN
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
