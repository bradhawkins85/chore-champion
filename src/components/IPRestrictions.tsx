import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash, Shield, Info } from '@phosphor-icons/react'
import { IPRestrictionSettings, IPAccessAttempt } from '@/lib/types'
import { isValidIPAddress } from '@/lib/helpers'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface IPRestrictionsProps {
  settings: IPRestrictionSettings
  currentIP: string | null
  accessHistory: IPAccessAttempt[]
  onUpdateSettings: (settings: IPRestrictionSettings) => void
}

export function IPRestrictions({
  settings,
  currentIP,
  accessHistory,
  onUpdateSettings,
}: IPRestrictionsProps) {
  const [newIP, setNewIP] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [showRemovePinDialog, setShowRemovePinDialog] = useState(false)

  const handleAddIP = () => {
    if (!newIP.trim()) {
      toast.error('Please enter an IP address')
      return
    }

    if (!isValidIPAddress(newIP.trim())) {
      toast.error('Invalid IP address format')
      return
    }

    if (settings.allowedIPs.includes(newIP.trim())) {
      toast.error('This IP address is already in the list')
      return
    }

    onUpdateSettings({
      ...settings,
      allowedIPs: [...settings.allowedIPs, newIP.trim()],
    })
    setNewIP('')
    toast.success('IP address added')
  }

  const handleRemoveIP = (ip: string) => {
    onUpdateSettings({
      ...settings,
      allowedIPs: settings.allowedIPs.filter((i) => i !== ip),
    })
    toast.success('IP address removed')
  }

  const handleAddCurrentIP = () => {
    if (!currentIP) {
      toast.error('Unable to detect current IP address')
      return
    }

    if (settings.allowedIPs.includes(currentIP)) {
      toast.info('Current IP is already in the list')
      return
    }

    onUpdateSettings({
      ...settings,
      allowedIPs: [...settings.allowedIPs, currentIP],
    })
    toast.success('Current IP address added')
  }

  const handleSetPin = () => {
    if (newPin.length < 4) {
      toast.error('PIN must be at least 4 characters')
      return
    }

    if (newPin !== confirmPin) {
      toast.error('PINs do not match')
      return
    }

    onUpdateSettings({
      ...settings,
      overridePin: newPin,
      requirePinForUnapproved: true,
    })
    setNewPin('')
    setConfirmPin('')
    setShowPinDialog(false)
    toast.success('Access PIN set successfully')
  }

  const handleRemovePin = () => {
    onUpdateSettings({
      ...settings,
      overridePin: null,
      requirePinForUnapproved: false,
    })
    setShowRemovePinDialog(false)
    toast.success('Access PIN removed')
  }

  const recentAttempts = accessHistory
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>IP Address Restrictions</CardTitle>
          </div>
          <CardDescription>
            Control which IP addresses can access this application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable IP Restrictions</Label>
              <p className="text-sm text-muted-foreground">
                Only allow access from specified IP addresses
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) =>
                onUpdateSettings({ ...settings, enabled })
              }
            />
          </div>

          {settings.enabled && (
            <>
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <p>Use CIDR notation for IP ranges: 192.168.0.0/24</p>
                </div>

                <div className="space-y-2">
                  <Label>Current IP Address</Label>
                  <div className="flex gap-2">
                    <Input
                      value={currentIP || 'Detecting...'}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleAddCurrentIP}
                      disabled={!currentIP || settings.allowedIPs.includes(currentIP)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Current
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-ip">Add IP Address or Range</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-ip"
                      value={newIP}
                      onChange={(e) => setNewIP(e.target.value)}
                      placeholder="192.168.1.100 or 192.168.0.0/24"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddIP()
                        }
                      }}
                    />
                    <Button onClick={handleAddIP}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Allowed IP Addresses ({settings.allowedIPs.length})</Label>
                  {settings.allowedIPs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                      No IP addresses added. Add at least one to enable restrictions.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                      {settings.allowedIPs.map((ip) => (
                        <div
                          key={ip}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                        >
                          <code className="text-sm font-mono">{ip}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveIP(ip)}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Access PIN Override</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow unapproved IP addresses to access the app using a PIN
                  </p>
                  {settings.overridePin ? (
                    <div className="flex gap-2">
                      <div className="flex-1 p-3 rounded-md bg-muted/50 flex items-center justify-between">
                        <span className="text-sm">Access PIN is configured</span>
                        <Badge variant="outline">Active</Badge>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowPinDialog(true)}
                      >
                        Change PIN
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowRemovePinDialog(true)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => setShowPinDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Set Access PIN
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {settings.enabled && recentAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Access Attempts</CardTitle>
            <CardDescription>
              Last 10 access attempts from different IP addresses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentAttempts.map((attempt, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono">{attempt.ip}</code>
                    {attempt.usedPin && (
                      <Badge variant="outline">PIN Override</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(attempt.timestamp).toLocaleString()}
                    </span>
                    <Badge variant={attempt.granted ? 'default' : 'destructive'}>
                      {attempt.granted ? 'Granted' : 'Denied'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {settings.overridePin ? 'Change Access PIN' : 'Set Access PIN'}
            </DialogTitle>
            <DialogDescription>
              This PIN allows access from unapproved IP addresses. It is separate from the Parent Portal PIN.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-pin">New PIN</Label>
              <Input
                id="new-pin"
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Enter at least 4 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pin">Confirm PIN</Label>
              <Input
                id="confirm-pin"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Re-enter PIN"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPinDialog(false)
                setNewPin('')
                setConfirmPin('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSetPin}>
              {settings.overridePin ? 'Change PIN' : 'Set PIN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRemovePinDialog} onOpenChange={setShowRemovePinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Access PIN?</DialogTitle>
            <DialogDescription>
              Removing the access PIN will prevent unapproved IP addresses from accessing the app using a PIN override.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemovePinDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemovePin}>
              Remove PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
