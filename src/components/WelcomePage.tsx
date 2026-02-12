import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EnvelopeSimple } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useApiKV } from '@/hooks/use-api-kv'
import { defaultHomepageContent, normalizeHomepageContent } from '@/lib/homepageContent'

interface WelcomePageProps {
  currentIP: string | null
  onPinSubmit: (pin: string) => void
  onRequestAccess?: (parentPin: string) => Promise<void>
}

export function WelcomePage({ currentIP, onPinSubmit, onRequestAccess }: WelcomePageProps) {
  const [pin, setPin] = useState('')
  const [parentPin, setParentPin] = useState('')
  const [showPinInput, setShowPinInput] = useState(false)
  const [showRequestAccess, setShowRequestAccess] = useState(false)
  const [isRequestingAccess, setIsRequestingAccess] = useState(false)

  const [homepageContent] = useApiKV('homepageContent', defaultHomepageContent)
  const normalizedHomepageContent = normalizeHomepageContent(homepageContent)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length < 4) {
      toast.error('PIN must be at least 4 characters')
      return
    }
    onPinSubmit(pin)
  }

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parentPin || parentPin.length < 4) {
      toast.error('Parent PIN must be at least 4 characters')
      return
    }
    
    if (!onRequestAccess) {
      toast.error('Request access feature is not available')
      return
    }

    setIsRequestingAccess(true)
    try {
      await onRequestAccess(parentPin)
      setParentPin('')
      setShowRequestAccess(false)
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsRequestingAccess(false)
    }
  }



  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl space-y-12">
        <div
          className="prose prose-lg max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: normalizedHomepageContent.htmlContent }}
        />

        <Card className="max-w-md mx-auto border-2 border-primary/20 mb-12">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Access Required</CardTitle>
            <CardDescription>
              {currentIP ? (
                <>Your IP address ({currentIP}) is not authorized to access this application.</>
              ) : (
                <>Unable to detect your IP address. Access is restricted.</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showPinInput ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="access-pin">Access PIN</Label>
                  <Input
                    id="access-pin"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter access PIN"
                    autoFocus
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the access PIN to override IP restrictions
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowPinInput(false)
                      setPin('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Access App
                  </Button>
                </div>
              </form>
            ) : showRequestAccess ? (
              <form onSubmit={handleRequestAccess} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="parent-pin">Parent PIN</Label>
                  <Input
                    id="parent-pin"
                    type="password"
                    value={parentPin}
                    onChange={(e) => setParentPin(e.target.value)}
                    placeholder="Enter parent PIN"
                    autoFocus
                    disabled={isRequestingAccess}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter your parent PIN to request access approval. An email will be sent to the primary parent with a link to approve this IP address.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowRequestAccess(false)
                      setParentPin('')
                    }}
                    disabled={isRequestingAccess}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isRequestingAccess}>
                    {isRequestingAccess ? 'Requesting...' : 'Request Access'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  If you have an access PIN, you can use it to override the IP restriction.
                </p>
                <Button
                  onClick={() => setShowPinInput(true)}
                  className="w-full"
                  size="lg"
                >
                  Enter Access PIN
                </Button>

                {onRequestAccess && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowRequestAccess(true)}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      <EnvelopeSimple className="mr-2 h-4 w-4" />
                      Request Access Approval
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
