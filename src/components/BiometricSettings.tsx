import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Fingerprint, Trash, Plus, DeviceMobile, Shield } from '@phosphor-icons/react'
import { BiometricSettings as BiometricSettingsType, BiometricCredential } from '@/lib/types'
import {
  checkBiometricSupport,
  registerBiometric,
  getBiometricDisplayName,
  BiometricSupport,
} from '@/lib/biometric'
import { toast } from 'sonner'

interface BiometricSettingsProps {
  settings: BiometricSettingsType
  onChange: (settings: BiometricSettingsType) => void
}

export function BiometricSettings({ settings, onChange }: BiometricSettingsProps) {
  const [support, setSupport] = useState<BiometricSupport | null>(null)
  const [isAddingCredential, setIsAddingCredential] = useState(false)
  const [credentialName, setCredentialName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)

  useEffect(() => {
    checkBiometricSupport().then(setSupport)
  }, [])

  const handleToggleBiometric = async (enabled: boolean) => {
    if (enabled && !support?.available) {
      toast.error('Biometric authentication is not available on this device')
      return
    }

    if (enabled && settings.credentials.length === 0) {
      setIsAddingCredential(true)
      return
    }

    onChange({
      ...settings,
      enabled,
    })

    if (enabled) {
      toast.success('Biometric authentication enabled')
    } else {
      toast.info('Biometric authentication disabled')
    }
  }

  const handleAddCredential = async () => {
    if (!credentialName.trim()) {
      toast.error('Please enter a name for this credential')
      return
    }

    setIsRegistering(true)
    try {
      const credential = await registerBiometric(credentialName.trim())
      
      onChange({
        ...settings,
        enabled: true,
        credentials: [...settings.credentials, credential],
      })

      toast.success('Biometric credential registered successfully!')
      setIsAddingCredential(false)
      setCredentialName('')
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to register biometric credential')
      }
    } finally {
      setIsRegistering(false)
    }
  }

  const handleRemoveCredential = (credentialId: string) => {
    const updatedCredentials = settings.credentials.filter((c) => c.id !== credentialId)
    
    onChange({
      ...settings,
      credentials: updatedCredentials,
      enabled: updatedCredentials.length > 0 ? settings.enabled : false,
    })

    toast.info('Biometric credential removed')
  }

  const handleTogglePinFallback = (requirePinFallback: boolean) => {
    onChange({
      ...settings,
      requirePinFallback,
    })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (support === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
            Checking device capabilities...
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
            {support.available
              ? `Use ${getBiometricDisplayName()} to access Parent Mode`
              : 'Biometric authentication is not available on this device'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="biometric-enabled" className="text-base">
                Enable Biometric Login
              </Label>
              <p className="text-sm text-muted-foreground">
                {support.available
                  ? 'Use biometric authentication instead of PIN'
                  : 'Your device does not support biometric authentication'}
              </p>
            </div>
            <Switch
              id="biometric-enabled"
              checked={settings.enabled && support.available}
              onCheckedChange={handleToggleBiometric}
              disabled={!support.available}
            />
          </div>

          {settings.enabled && settings.credentials.length > 0 && (
            <>
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="pin-fallback" className="text-base">
                    Require PIN as Fallback
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Always show PIN option alongside biometric
                  </p>
                </div>
                <Switch
                  id="pin-fallback"
                  checked={settings.requirePinFallback}
                  onCheckedChange={handleTogglePinFallback}
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Registered Credentials</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingCredential(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New
                  </Button>
                </div>

                <div className="space-y-2">
                  {settings.credentials.map((credential) => (
                    <div
                      key={credential.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <DeviceMobile className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{credential.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Added {formatDate(credential.createdAt)}
                            {credential.lastUsed > credential.createdAt &&
                              ` • Last used ${formatDate(credential.lastUsed)}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveCredential(credential.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {settings.enabled && settings.credentials.length === 0 && (
            <div className="p-4 border border-dashed rounded-lg text-center space-y-2">
              <Shield className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No biometric credentials registered
              </p>
              <Button size="sm" onClick={() => setIsAddingCredential(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Register Your Device
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddingCredential} onOpenChange={setIsAddingCredential}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Biometric Credential</DialogTitle>
            <DialogDescription>
              Give this device a name and then authenticate using {getBiometricDisplayName()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="credential-name">Device Name</Label>
              <Input
                id="credential-name"
                placeholder="e.g., My iPhone, Mom's Laptop"
                value={credentialName}
                onChange={(e) => setCredentialName(e.target.value)}
                disabled={isRegistering}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingCredential(false)
                setCredentialName('')
              }}
              disabled={isRegistering}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCredential} disabled={isRegistering || !credentialName.trim()}>
              {isRegistering ? (
                <>
                  <Fingerprint className="h-4 w-4 mr-2 animate-pulse" />
                  Waiting for Authentication...
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Register
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
