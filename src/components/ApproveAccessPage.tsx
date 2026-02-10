import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Clock } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface ApproveAccessPageProps {
  token: string
  onApprove: (token: string) => Promise<{ success: boolean; ip?: string; error?: string }>
  onComplete: () => void
}

export function ApproveAccessPage({ token, onApprove, onComplete }: ApproveAccessPageProps) {
  const [status, setStatus] = useState<'pending' | 'approving' | 'success' | 'error'>('pending')
  const [ipAddress, setIpAddress] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const handleApprove = async () => {
    setStatus('approving')
    try {
      const result = await onApprove(token)
      if (result.success) {
        setStatus('success')
        setIpAddress(result.ip || '')
        toast.success('Access approved successfully')
        // Redirect after 3 seconds
        setTimeout(() => {
          onComplete()
        }, 3000)
      } else {
        setStatus('error')
        setErrorMessage(result.error || 'Failed to approve access')
        toast.error(result.error || 'Failed to approve access')
      }
    } catch (error) {
      setStatus('error')
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setErrorMessage(errorMessage)
      toast.error('An unexpected error occurred', {
        description: errorMessage
      })
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-fredoka font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ChoreQuest
          </h1>
          <p className="text-lg text-muted-foreground">
            IP Access Approval
          </p>
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            {status === 'pending' && (
              <>
                <div className="flex justify-center mb-4">
                  <Clock className="h-16 w-16 text-primary" />
                </div>
                <CardTitle className="text-2xl">Approve IP Access?</CardTitle>
                <CardDescription>
                  Someone has requested access from a new IP address. Click the button below to approve and add this IP to the allowed list.
                </CardDescription>
              </>
            )}
            {status === 'approving' && (
              <>
                <div className="flex justify-center mb-4">
                  <Clock className="h-16 w-16 text-primary animate-pulse" />
                </div>
                <CardTitle className="text-2xl">Approving Access...</CardTitle>
                <CardDescription>
                  Please wait while we process your approval
                </CardDescription>
              </>
            )}
            {status === 'success' && (
              <>
                <div className="flex justify-center mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-2xl">Access Approved!</CardTitle>
                <CardDescription>
                  The IP address {ipAddress} has been added to the allowed list. You can now access the application from this device.
                </CardDescription>
              </>
            )}
            {status === 'error' && (
              <>
                <div className="flex justify-center mb-4">
                  <XCircle className="h-16 w-16 text-destructive" />
                </div>
                <CardTitle className="text-2xl">Approval Failed</CardTitle>
                <CardDescription>
                  {errorMessage}
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {status === 'pending' && (
              <div className="space-y-4">
                <Button
                  onClick={handleApprove}
                  className="w-full"
                  size="lg"
                >
                  Approve Access
                </Button>
                <Button
                  onClick={onComplete}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            )}
            {status === 'success' && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Redirecting you to the app...
                </p>
                <Button
                  onClick={onComplete}
                  className="w-full"
                >
                  Continue to App
                </Button>
              </div>
            )}
            {status === 'error' && (
              <Button
                onClick={onComplete}
                variant="outline"
                className="w-full"
              >
                Go Back
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
