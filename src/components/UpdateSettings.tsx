import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowsClockwise, CheckCircle, WarningCircle, CloudArrowDown } from '@phosphor-icons/react'
import { toast } from 'sonner'

const CURRENT_VERSION = '1.0.0'
const GITHUB_REPO = 'bradhawkins85/chore-champion'

interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  html_url: string
  body: string
}

export function UpdateSettings() {
  const [isChecking, setIsChecking] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)

  const checkForUpdates = async () => {
    setIsChecking(true)
    setCheckError(null)
    
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      
      if (!response.ok) {
        throw new Error('Failed to check for updates')
      }
      
      const release: GitHubRelease = await response.json()
      setLatestRelease(release)
      
      const latestVersion = release.tag_name.replace(/^v/, '')
      const currentVersion = CURRENT_VERSION.replace(/^v/, '')
      
      if (latestVersion !== currentVersion) {
        toast.success(`New version available: ${release.tag_name}`)
      } else {
        toast.info('You are running the latest version')
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
      setCheckError(error instanceof Error ? error.message : 'Failed to check for updates')
      toast.error('Failed to check for updates')
    } finally {
      setIsChecking(false)
    }
  }

  const triggerUpdate = async () => {
    setIsUpdating(true)
    
    try {
      // Check if we're running in Docker
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to trigger update')
      }
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Update started! The application will restart shortly.')
        
        // Reload the page after a delay to get the new version
        setTimeout(() => {
          window.location.reload()
        }, 10000)
      } else {
        throw new Error(result.message || 'Update failed')
      }
    } catch (error) {
      console.error('Error triggering update:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to trigger update')
      setIsUpdating(false)
    }
  }

  const hasNewVersion = () => {
    if (!latestRelease) return false
    const latestVersion = latestRelease.tag_name.replace(/^v/, '')
    const currentVersion = CURRENT_VERSION.replace(/^v/, '')
    return latestVersion !== currentVersion
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CloudArrowDown className="h-5 w-5" />
                Software Updates
              </CardTitle>
              <CardDescription>
                Check for and install the latest version of ChoreQuest
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              v{CURRENT_VERSION}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <h4 className="text-sm font-medium">Current Version</h4>
                <p className="text-sm text-muted-foreground">
                  {CURRENT_VERSION}
                </p>
              </div>
              
              {latestRelease && (
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-medium">Latest Version</h4>
                  <p className="text-sm text-muted-foreground">
                    {latestRelease.tag_name}
                  </p>
                </div>
              )}
            </div>

            {checkError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <WarningCircle className="h-4 w-4" />
                <span>{checkError}</span>
              </div>
            )}

            {latestRelease && hasNewVersion() && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>New version available!</span>
              </div>
            )}

            {latestRelease && !hasNewVersion() && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                <span>You're running the latest version</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={checkForUpdates}
              disabled={isChecking || isUpdating}
              variant="outline"
            >
              <ArrowsClockwise className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Check for Updates'}
            </Button>

            {latestRelease && hasNewVersion() && (
              <Button
                onClick={() => setShowUpdateDialog(true)}
                disabled={isUpdating}
              >
                <CloudArrowDown className="h-4 w-4 mr-2" />
                {isUpdating ? 'Updating...' : 'Update Now'}
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t">
            <p>
              Updates are installed by pulling the latest Docker image and restarting the application.
              A backup will be created automatically before updating.
            </p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update ChoreQuest?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update ChoreQuest to version {latestRelease?.tag_name}. 
              The application will restart and may be unavailable for a few moments.
              A backup will be created automatically before the update.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUpdateDialog(false)
                triggerUpdate()
              }}
              disabled={isUpdating}
            >
              Update Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
