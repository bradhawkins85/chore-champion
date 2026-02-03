import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Envelope, Warning, Clock, Info } from '@phosphor-icons/react'
import { EmailAlertSettings, DigestInterval } from '@/lib/types'

interface EmailSettingsProps {
  emailAlertSettings: EmailAlertSettings
  onUpdateEmailAlertSettings: (settings: EmailAlertSettings) => void
}

export function EmailSettings({
  emailAlertSettings,
  onUpdateEmailAlertSettings,
}: EmailSettingsProps) {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [smtpConfigured, setSmtpConfigured] = useState(false)
  const [smtpEnabled, setSmtpEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
        setLoading(false)
      })
      .catch((error) => {
        console.error('Failed to fetch SMTP status:', error)
        setSmtpEnabled(false)
        setSmtpConfigured(false)
        setLoading(false)
      })
  }, [])

  const handleAddRecipient = () => {
    if (!recipientEmail) return
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      toast.error('Invalid email address')
      return
    }

    if (emailAlertSettings.recipientEmails.includes(recipientEmail)) {
      toast.error('Email already added')
      return
    }

    onUpdateEmailAlertSettings({
      ...emailAlertSettings,
      recipientEmails: [...emailAlertSettings.recipientEmails, recipientEmail],
    })
    setRecipientEmail('')
    toast.success('Recipient added')
  }

  const handleRemoveRecipient = (email: string) => {
    onUpdateEmailAlertSettings({
      ...emailAlertSettings,
      recipientEmails: emailAlertSettings.recipientEmails.filter((e) => e !== email),
    })
    toast.success('Recipient removed')
  }

  const handleToggleAlert = (
    type: 'rewardPurchaseAlerts' | 'weeklyReportAlerts' | 'pendingApprovalAlerts',
    enabled: boolean
  ) => {
    if (enabled && !smtpEnabled) {
      toast.error('SMTP is not configured. Please configure SMTP settings in your .env file')
      return
    }

    if (enabled && emailAlertSettings.recipientEmails.length === 0) {
      toast.error('Please add at least one recipient email')
      return
    }

    onUpdateEmailAlertSettings({
      ...emailAlertSettings,
      [type]: enabled,
    })
    toast.success(enabled ? 'Alert enabled' : 'Alert disabled')
  }

  const handleDigestModeChange = (mode: DigestInterval) => {
    onUpdateEmailAlertSettings({
      ...emailAlertSettings,
      digestMode: mode,
    })
    toast.success('Digest mode updated')
  }

  const getDigestModeLabel = (mode: DigestInterval): string => {
    switch (mode) {
      case 'immediate': return 'Immediate (Send right away)'
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Envelope className="h-5 w-5" />
            Email Configuration Status
          </CardTitle>
          <CardDescription>
            SMTP settings are configured via environment variables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading SMTP status...</p>
          ) : (
            <>
              {smtpEnabled && smtpConfigured ? (
                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <Info className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-900 dark:text-green-100">SMTP is configured and enabled</p>
                    <p className="text-green-700 dark:text-green-300">
                      Email notifications are ready to be sent
                    </p>
                  </div>
                </div>
              ) : !smtpConfigured ? (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <Warning className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900 dark:text-amber-100">SMTP is not configured</p>
                    <p className="text-amber-700 dark:text-amber-300">
                      Configure SMTP settings in your .env file to enable email notifications
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                  <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">SMTP is configured but disabled</p>
                    <p className="text-muted-foreground">
                      Set SMTP_ENABLED=true in your .env file to enable email notifications
                    </p>
                  </div>
                </div>
              )}
              
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  To configure SMTP settings, edit your .env file and set the following variables:
                </p>
                <ul className="text-xs text-muted-foreground mt-1 ml-4 list-disc space-y-1">
                  <li>SMTP_ENABLED</li>
                  <li>SMTP_HOST</li>
                  <li>SMTP_PORT</li>
                  <li>SMTP_USERNAME</li>
                  <li>SMTP_PASSWORD</li>
                  <li>SMTP_FROM_EMAIL</li>
                  <li>SMTP_FROM_NAME</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Recipients</CardTitle>
          <CardDescription>
            Add email addresses to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="parent@example.com"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddRecipient()
                }
              }}
            />
            <Button onClick={handleAddRecipient}>Add</Button>
          </div>

          {emailAlertSettings.recipientEmails.length > 0 ? (
            <div className="space-y-2">
              {emailAlertSettings.recipientEmails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <span className="text-sm">{email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRecipient(email)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recipients added yet
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Preferences</CardTitle>
          <CardDescription>
            Choose which events trigger email notifications
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
              checked={emailAlertSettings.rewardPurchaseAlerts}
              onCheckedChange={(checked) =>
                handleToggleAlert('rewardPurchaseAlerts', checked)
              }
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
              checked={emailAlertSettings.pendingApprovalAlerts}
              onCheckedChange={(checked) =>
                handleToggleAlert('pendingApprovalAlerts', checked)
              }
            />
          </div>

          {emailAlertSettings.pendingApprovalAlerts && (
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
                  value={emailAlertSettings.digestMode}
                  onValueChange={(value) => handleDigestModeChange(value as DigestInterval)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select digest mode" />
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
                {emailAlertSettings.digestMode !== 'immediate' && (
                  <p className="text-xs text-muted-foreground">
                    Pending approvals will be grouped and sent {getDigestModeLabel(emailAlertSettings.digestMode).toLowerCase()}
                  </p>
                )}
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
              checked={emailAlertSettings.weeklyReportAlerts}
              onCheckedChange={(checked) =>
                handleToggleAlert('weeklyReportAlerts', checked)
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
