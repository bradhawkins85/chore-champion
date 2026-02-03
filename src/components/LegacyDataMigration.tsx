import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Database, ArrowRight, CheckCircle, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token')
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

interface LegacyStatusResponse {
  success: boolean
  hasLegacyData: boolean
  legacyRecordCount: number
}

interface MigrationResponse {
  success: boolean
  message: string
  migratedCount: number
  skippedCount: number
  deletedCount: number
}

export function LegacyDataMigration() {
  const [hasLegacyData, setHasLegacyData] = useState(false)
  const [legacyRecordCount, setLegacyRecordCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [migrationComplete, setMigrationComplete] = useState(false)

  useEffect(() => {
    checkLegacyStatus()
  }, [])

  const checkLegacyStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/legacy-status`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data: LegacyStatusResponse = await response.json()
        setHasLegacyData(data.hasLegacyData)
        setLegacyRecordCount(data.legacyRecordCount)
      }
    } catch (error) {
      console.error('Error checking legacy status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMigrate = async () => {
    setMigrating(true)
    setShowConfirmDialog(false)

    try {
      const response = await fetch(`${API_URL}/migrate-legacy`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data: MigrationResponse = await response.json()
        setMigrationComplete(true)
        setHasLegacyData(false)
        
        toast.success('Migration completed successfully!', {
          description: `Migrated ${data.migratedCount} records. ${data.skippedCount > 0 ? `Skipped ${data.skippedCount} existing records.` : ''}`,
          duration: 5000,
        })
      } else {
        const errorData = await response.json()
        toast.error('Migration failed', {
          description: errorData.error || 'An error occurred during migration',
        })
      }
    } catch (error) {
      console.error('Error migrating legacy data:', error)
      toast.error('Migration failed', {
        description: 'An error occurred during migration',
      })
    } finally {
      setMigrating(false)
    }
  }

  // Don't render anything if there's no legacy data
  if (loading || !hasLegacyData || migrationComplete) {
    return null
  }

  return (
    <>
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Database className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1" />
            <div className="flex-1">
              <CardTitle className="text-lg">Legacy Data Available</CardTitle>
              <CardDescription className="mt-1">
                {legacyRecordCount} records from legacy data storage are available for migration to your account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <Warning className="inline h-4 w-4 mr-1 text-amber-600" />
              This will move all legacy data to your tenant and remove it from the legacy storage.
            </div>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={migrating}
              className="shrink-0"
            >
              {migrating ? (
                <>Migrating...</>
              ) : (
                <>
                  Migrate Data
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Legacy Data Migration</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will transfer {legacyRecordCount} records from legacy storage to your account.
              </p>
              <p className="font-semibold text-foreground">
                Important: The legacy data will be permanently removed after migration.
              </p>
              <p>
                If you already have data in your account, existing records will be preserved and only missing data will be migrated.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMigrate}>
              Proceed with Migration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
