import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SignOut, UserPlus, Users, Envelope, Bell, Clock, Calendar, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { EmailAlertSettingsMap, WeeklyReportSettingsMap, ParentEmailAlertSettings, ParentWeeklyReportSettings, DayOfWeek, DigestInterval } from '@/lib/types'

interface AccountSettingsProps {
  emailAlertSettingsMap?: EmailAlertSettingsMap
  weeklyReportSettingsMap?: WeeklyReportSettingsMap
  onUpdateEmailAlertSettingsMap?: (settings: EmailAlertSettingsMap) => void
  onUpdateWeeklyReportSettingsMap?: (settings: WeeklyReportSettingsMap) => void
  showOnlyNotifications?: boolean
}

export function AccountSettings({
  emailAlertSettingsMap,
  weeklyReportSettingsMap,
  onUpdateEmailAlertSettingsMap,
  onUpdateWeeklyReportSettingsMap,
  showOnlyNotifications = false,
}: AccountSettingsProps = {}) {
  const { user, logout, inviteParent, getPendingInvitations, getTenantUsers, revokeParent } = useAuth();
  const [tenantUsers, setTenantUsers] = useState<any[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showInviteParent, setShowInviteParent] = useState(false)
  const [newParentEmail, setNewParentEmail] = useState('')
  const [error, setError] = useState('')
  const [smtpConfigured, setSmtpConfigured] = useState(false)
  const [smtpEnabled, setSmtpEnabled] = useState(false)
  const [smtpLoading, setSmtpLoading] = useState(true)
  const [userToRevoke, setUserToRevoke] = useState<any | null>(null)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [revokeLoading, setRevokeLoading] = useState(false)

  const daysOfWeek: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  useEffect(() => {
    loadTenantData()
    // Fetch SMTP status from the server
    fetch('/api/config/smtp-status')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch SMTP status')
        }
        return res.json()
      })
      .then((data) => {
        setSmtpConfigured(data.configured)
        setSmtpEnabled(data.enabled)
        setSmtpLoading(false)
      })
      .catch((error) => {
        console.error('Failed to fetch SMTP status:', error)
        setSmtpEnabled(false)
        setSmtpConfigured(false)
        setSmtpLoading(false)
      })
  }, [])

  const loadTenantData = async () => {
    try {
      const [users, invitations] = await Promise.all([
        getTenantUsers(),
        getPendingInvitations()
      ])
      setTenantUsers(users)
      setPendingInvitations(invitations.filter((inv: any) => inv.status === 'pending'))
    } catch (err) {
      console.error('Error loading tenant data:', err)
    }
  }

  const handleInviteParent = async () => {
    setError('')

    if (!newParentEmail) {
      setError('Email is required')
      return
    }

    setLoading(true)

    try {
      await inviteParent(newParentEmail)
      toast.success('Invitation sent successfully')
      setShowInviteParent(false)
      setNewParentEmail('')
      loadTenantData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
  }

  const handleRevokeAccess = async () => {
    if (!userToRevoke) return

    setRevokeLoading(true)
    setError('')

    try {
      await revokeParent(userToRevoke.id)
      toast.success(`Access revoked for ${userToRevoke.email}`)
      setShowRevokeDialog(false)
      setUserToRevoke(null)
      loadTenantData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke access')
      toast.error(err instanceof Error ? err.message : 'Failed to revoke access')
    } finally {
      setRevokeLoading(false)
    }
  }

  const canInviteParent = tenantUsers.length < 2 && pendingInvitations.length === 0

  // Get or create settings for a specific user
  const getUserEmailSettings = (userId: string): ParentEmailAlertSettings => {
    return emailAlertSettingsMap?.[userId] || {
      rewardPurchaseAlerts: false,
      choreCompletionAlerts: false,
      weeklyReportAlerts: false,
      pendingApprovalAlerts: false,
      digestMode: 'immediate',
      lastDigestSent: null,
    }
  }

  const getUserWeeklyReportSettings = (userId: string): ParentWeeklyReportSettings => {
    return weeklyReportSettingsMap?.[userId] || {
      enabled: false,
      sendDay: 'sunday',
      sendTime: '18:00',
      lastSent: null,
    }
  }

  // Update email alert settings for a specific user
  const updateUserEmailSettings = (userId: string, updates: Partial<ParentEmailAlertSettings>) => {
    if (!onUpdateEmailAlertSettingsMap) return

    const currentSettings = getUserEmailSettings(userId)
    const newSettings = { ...currentSettings, ...updates }
    
    const newMap = { ...(emailAlertSettingsMap || {}) }
    newMap[userId] = newSettings
    
    onUpdateEmailAlertSettingsMap(newMap)
  }

  // Update weekly report settings for a specific user
  const updateUserWeeklyReportSettings = (userId: string, updates: Partial<ParentWeeklyReportSettings>) => {
    if (!onUpdateWeeklyReportSettingsMap) return

    const currentSettings = getUserWeeklyReportSettings(userId)
    const newSettings = { ...currentSettings, ...updates }
    
    const newMap = { ...(weeklyReportSettingsMap || {}) }
    newMap[userId] = newSettings
    
    onUpdateWeeklyReportSettingsMap(newMap)
  }

  const handleToggleAlert = (
    userId: string,
    type: keyof Pick<ParentEmailAlertSettings, 'rewardPurchaseAlerts' | 'choreCompletionAlerts' | 'weeklyReportAlerts' | 'pendingApprovalAlerts'>,
    enabled: boolean
  ) => {
    if (enabled && !smtpEnabled) {
      toast.error('SMTP is not configured. Please configure SMTP settings in your .env file')
      return
    }

    updateUserEmailSettings(userId, { [type]: enabled })
    toast.success(enabled ? 'Alert enabled' : 'Alert disabled')
  }

  const getDigestModeLabel = (mode: DigestInterval): string => {
    switch (mode) {
      case 'immediate': return 'Immediate'
      case '15min': return 'Every 15 minutes'
      case '30min': return 'Every 30 minutes'
      case '1hour': return 'Every 1 hour'
      case '2hours': return 'Every 2 hours'
      case '4hours': return 'Every 4 hours'
      case 'daily': return 'Once daily'
      default: return 'Immediate'
    }
  }

  return (
    <div className="space-y-6">
      {!showOnlyNotifications && (
        <>
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
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {showOnlyNotifications ? 'Email Notification Preferences' : 'Shared Access'}
          </CardTitle>
          <CardDescription>
            {showOnlyNotifications 
              ? 'Configure email notifications for registered parents'
              : 'Manage parent accounts and email notification preferences for registered parents'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showOnlyNotifications && (
            <>
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
                      <div className="flex items-center gap-2">
                        {u.email === user?.email && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                            You
                          </span>
                        )}
                        {u.email !== user?.email && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setUserToRevoke(u)
                              setShowRevokeDialog(true)
                            }}
                          >
                            <Trash className="w-4 h-4 mr-1" />
                            Remove Access
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Show pending invitations */}
              {pendingInvitations.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Pending Invitations</Label>
                  <div className="space-y-2">
                    {pendingInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">{inv.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Invited {new Date(inv.createdAt).toLocaleDateString()} • Expires {new Date(inv.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canInviteParent && (
                <>
                  {!smtpEnabled && (
                    <Alert>
                      <AlertDescription>
                        Email service is not configured. You need to configure SMTP settings to send invitations.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Dialog open={showInviteParent} onOpenChange={setShowInviteParent}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" disabled={!smtpEnabled}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite Second Parent
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Second Parent</DialogTitle>
                        <DialogDescription>
                          Send an email invitation to another parent to share access to this ChoreQuest account. They will receive an email with a link to set up their password.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        {error && (
                          <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="newParentEmail">Email Address</Label>
                          <Input
                            id="newParentEmail"
                            type="email"
                            placeholder="parent@example.com"
                            value={newParentEmail}
                            onChange={(e) => setNewParentEmail(e.target.value)}
                            disabled={loading}
                          />
                          <p className="text-xs text-muted-foreground">
                            An invitation link will be sent to this email address
                          </p>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowInviteParent(false)
                            setError('')
                            setNewParentEmail('')
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleInviteParent} disabled={loading}>
                          {loading ? 'Sending...' : 'Send Invitation'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {!canInviteParent && tenantUsers.length >= 2 && (
                <Alert>
                  <AlertDescription>
                    Maximum of 2 parents reached. You already have a second parent account.
                  </AlertDescription>
                </Alert>
              )}

              {!canInviteParent && pendingInvitations.length > 0 && tenantUsers.length < 2 && (
                <Alert>
                  <AlertDescription>
                    An invitation is pending. Please wait for it to be accepted or expire before sending another.
                  </AlertDescription>
                </Alert>
              )}

              {/* Revoke Access Confirmation Dialog */}
              <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Revoke Parent Access?</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to revoke access for {userToRevoke?.email || 'this user'}? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Alert>
                      <AlertDescription>
                        <strong>Note:</strong> The user will immediately lose access to this account and all its data. They can be re-invited later if needed.
                      </AlertDescription>
                    </Alert>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRevokeDialog(false)
                        setUserToRevoke(null)
                        setError('')
                      }}
                      disabled={revokeLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRevokeAccess}
                      disabled={revokeLoading}
                    >
                      {revokeLoading ? 'Revoking...' : 'Revoke Access'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Separator className="my-6" />
            </>
          )}

          {/* Per-parent email alert settings */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Email Alert Preferences
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure email notifications for each parent. Alerts will be sent to each parent's registered email address.
              </p>
            </div>

            {!smtpLoading && !smtpEnabled && (
              <Alert>
                <AlertDescription>
                  SMTP is not configured. Email alerts will not be sent. Configure SMTP settings in your .env file to enable notifications.
                </AlertDescription>
              </Alert>
            )}

            {tenantUsers.map((parentUser) => {
              const emailSettings = getUserEmailSettings(parentUser.id)
              return (
                <Card key={parentUser.id} className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Envelope className="w-4 h-4" />
                        {parentUser.email}
                      </span>
                      {parentUser.email === user?.email && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                          You
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Email notifications will be sent to this address
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Reward Purchase Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when a child claims a reward
                        </p>
                      </div>
                      <Switch
                        checked={emailSettings.rewardPurchaseAlerts}
                        onCheckedChange={(checked) =>
                          handleToggleAlert(parentUser.id, 'rewardPurchaseAlerts', checked)
                        }
                        disabled={!smtpEnabled}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Chore Completion Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when chores need approval
                        </p>
                      </div>
                      <Switch
                        checked={emailSettings.choreCompletionAlerts}
                        onCheckedChange={(checked) =>
                          handleToggleAlert(parentUser.id, 'choreCompletionAlerts', checked)
                        }
                        disabled={!smtpEnabled}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Pending Approval Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when chores are completed and require approval
                        </p>
                      </div>
                      <Switch
                        checked={emailSettings.pendingApprovalAlerts}
                        onCheckedChange={(checked) =>
                          handleToggleAlert(parentUser.id, 'pendingApprovalAlerts', checked)
                        }
                        disabled={!smtpEnabled}
                      />
                    </div>

                    {emailSettings.pendingApprovalAlerts && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Label>Digest Mode</Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Combine multiple pending approvals into a single email
                          </p>
                          <Select
                            value={emailSettings.digestMode}
                            onValueChange={(value) => {
                              updateUserEmailSettings(parentUser.id, { digestMode: value as DigestInterval })
                              toast.success('Digest mode updated')
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="immediate">Immediate (Send right away)</SelectItem>
                              <SelectItem value="15min">Every 15 minutes</SelectItem>
                              <SelectItem value="30min">Every 30 minutes</SelectItem>
                              <SelectItem value="1hour">Every 1 hour</SelectItem>
                              <SelectItem value="2hours">Every 2 hours</SelectItem>
                              <SelectItem value="4hours">Every 4 hours</SelectItem>
                              <SelectItem value="daily">Once daily</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Weekly Report Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive weekly activity reports via email
                        </p>
                      </div>
                      <Switch
                        checked={emailSettings.weeklyReportAlerts}
                        onCheckedChange={(checked) =>
                          handleToggleAlert(parentUser.id, 'weeklyReportAlerts', checked)
                        }
                        disabled={!smtpEnabled}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Separator className="my-6" />

          {/* Per-parent weekly report settings */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Weekly Report Settings
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure when each parent receives their weekly activity reports
              </p>
            </div>

            {tenantUsers.map((parentUser) => {
              const weeklySettings = getUserWeeklyReportSettings(parentUser.id)
              const emailSettings = getUserEmailSettings(parentUser.id)
              return (
                <Card key={parentUser.id} className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Envelope className="w-4 h-4" />
                        {parentUser.email}
                      </span>
                      {parentUser.email === user?.email && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                          You
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Weekly Reports</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically send activity summaries each week
                        </p>
                      </div>
                      <Switch
                        checked={weeklySettings.enabled && emailSettings.weeklyReportAlerts}
                        onCheckedChange={(checked) => {
                          updateUserWeeklyReportSettings(parentUser.id, { enabled: checked })
                          // Always sync the email alert setting with the weekly report enabled state.
                          // This ensures both settings stay in sync when toggled from this control.
                          // Note: Users can also toggle weeklyReportAlerts independently in the 
                          // Email Alert Preferences section, which preserves the schedule settings.
                          handleToggleAlert(parentUser.id, 'weeklyReportAlerts', checked)
                        }}
                        disabled={!smtpEnabled}
                      />
                    </div>

                    {weeklySettings.enabled && emailSettings.weeklyReportAlerts && (
                      <>
                        <Separator />
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Send Day</Label>
                            <Select
                              value={weeklySettings.sendDay}
                              onValueChange={(value) => {
                                updateUserWeeklyReportSettings(parentUser.id, { sendDay: value as DayOfWeek })
                                toast.success('Weekly report day updated')
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {daysOfWeek.map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {day.charAt(0).toUpperCase() + day.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Send Time</Label>
                            <Input
                              type="time"
                              value={weeklySettings.sendTime}
                              onChange={(e) => {
                                updateUserWeeklyReportSettings(parentUser.id, { sendTime: e.target.value })
                                toast.success('Weekly report time updated')
                              }}
                            />
                          </div>
                        </div>

                        {weeklySettings.lastSent && (
                          <div className="rounded-lg bg-muted p-3">
                            <p className="text-sm">
                              <Clock className="inline h-4 w-4 mr-2" />
                              Last sent: {new Date(weeklySettings.lastSent).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {!showOnlyNotifications && (
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
      )}
    </div>
  )
}
