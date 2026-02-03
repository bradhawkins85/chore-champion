import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { SignOut, UserPlus, Users } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { EmailAlertSettings, WeeklyReportSettings, Child, Chore, ChoreCompletion, ChoreAssignment, RewardPurchase, Reward, Category, CategoryBonusCompletion } from '@/lib/types'
import { EmailSettings } from './EmailSettings'
import { WeeklyReportSettingsComponent } from './WeeklyReportSettings'

interface AccountSettingsProps {
  emailAlertSettings?: EmailAlertSettings
  weeklyReportSettings?: WeeklyReportSettings
  childrenList?: Child[]
  chores?: Chore[]
  completions?: ChoreCompletion[]
  assignments?: ChoreAssignment[]
  purchases?: RewardPurchase[]
  rewards?: Reward[]
  categories?: Category[]
  bonusCompletions?: CategoryBonusCompletion[]
  onUpdateEmailAlertSettings?: (settings: EmailAlertSettings) => void
  onUpdateWeeklyReportSettings?: (settings: WeeklyReportSettings) => void
}

export function AccountSettings({
  emailAlertSettings,
  weeklyReportSettings,
  childrenList,
  chores,
  completions,
  assignments,
  purchases,
  rewards,
  categories,
  bonusCompletions,
  onUpdateEmailAlertSettings,
  onUpdateWeeklyReportSettings,
}: AccountSettingsProps = {}) {
  const { user, logout, addParent, getTenantUsers } = useAuth()
  const [tenantUsers, setTenantUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddParent, setShowAddParent] = useState(false)
  const [newParentEmail, setNewParentEmail] = useState('')
  const [newParentPassword, setNewParentPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadTenantUsers()
  }, [])

  const loadTenantUsers = async () => {
    try {
      const users = await getTenantUsers()
      setTenantUsers(users)
    } catch (err) {
      console.error('Error loading tenant users:', err)
    }
  }

  const handleAddParent = async () => {
    setError('')

    if (newParentPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newParentPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)

    try {
      await addParent(newParentEmail, newParentPassword)
      toast.success('Second parent added successfully')
      setShowAddParent(false)
      setNewParentEmail('')
      setNewParentPassword('')
      setConfirmPassword('')
      loadTenantUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add parent')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
  }

  const canAddParent = tenantUsers.length < 2

  // Check if all required props for weekly report settings are available
  const hasWeeklyReportProps = !!(
    weeklyReportSettings &&
    onUpdateWeeklyReportSettings &&
    childrenList &&
    chores &&
    completions &&
    assignments &&
    purchases &&
    rewards &&
    categories &&
    bonusCompletions
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Email</Label>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Tenant ID</Label>
            <p className="text-sm text-muted-foreground font-mono text-xs">{user?.tenantId}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Shared Access
          </CardTitle>
          <CardDescription>
            Manage parent accounts and email notification preferences for registered parents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Users ({tenantUsers.length}/2)</Label>
            <div className="space-y-2">
              {tenantUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">{u.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {u.email === user?.email && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                      You
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {canAddParent && (
            <Dialog open={showAddParent} onOpenChange={setShowAddParent}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Second Parent
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Second Parent</DialogTitle>
                  <DialogDescription>
                    Create an account for the second parent to share access to this ChoreQuest
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="newParentEmail">Email</Label>
                    <Input
                      id="newParentEmail"
                      type="email"
                      placeholder="parent@example.com"
                      value={newParentEmail}
                      onChange={(e) => setNewParentEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newParentPassword">Password</Label>
                    <Input
                      id="newParentPassword"
                      type="password"
                      placeholder="••••••••"
                      value={newParentPassword}
                      onChange={(e) => setNewParentPassword(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddParent(false)
                      setError('')
                      setNewParentEmail('')
                      setNewParentPassword('')
                      setConfirmPassword('')
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddParent} disabled={loading}>
                    {loading ? 'Adding...' : 'Add Parent'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {!canAddParent && (
            <Alert>
              <AlertDescription>
                Maximum of 2 parents reached. You already have a second parent account.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {emailAlertSettings && onUpdateEmailAlertSettings && (
        <EmailSettings
          emailAlertSettings={emailAlertSettings}
          onUpdateEmailAlertSettings={onUpdateEmailAlertSettings}
        />
      )}

      {hasWeeklyReportProps && (
        <WeeklyReportSettingsComponent
          settings={weeklyReportSettings!}
          childrenList={childrenList!}
          chores={chores!}
          completions={completions!}
          assignments={assignments!}
          purchases={purchases!}
          rewards={rewards!}
          categories={categories!}
          bonusCompletions={bonusCompletions!}
          onUpdateSettings={onUpdateWeeklyReportSettings!}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sign Out</CardTitle>
          <CardDescription>Sign out of your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            <SignOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
