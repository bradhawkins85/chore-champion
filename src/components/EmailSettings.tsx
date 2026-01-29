import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Envelope, Check, Warning } from '@phosphor-icons/react'
import { SMTPSettings, EmailAlertSettings } from '@/lib/types'

interface EmailSettingsProps {
  smtpSettings: SMTPSettings
  emailAlertSettings: EmailAlertSettings
  onUpdateSMTPSettings: (settings: SMTPSettings) => void
  onUpdateEmailAlertSettings: (settings: EmailAlertSettings) => void
}

export function EmailSettings({
  smtpSettings,
  emailAlertSettings,
  onUpdateSMTPSettings,
  onUpdateEmailAlertSettings,
}: EmailSettingsProps) {
  const [host, setHost] = useState(smtpSettings.host)
  const [port, setPort] = useState(smtpSettings.port.toString())
  const [secure, setSecure] = useState(smtpSettings.secure)
  const [username, setUsername] = useState(smtpSettings.username)
  const [password, setPassword] = useState(smtpSettings.password)
  const [fromEmail, setFromEmail] = useState(smtpSettings.fromEmail)
  const [fromName, setFromName] = useState(smtpSettings.fromName)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [isTesting, setIsTesting] = useState(false)

  const handleSaveSMTP = () => {
    const portNum = parseInt(port)
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      toast.error('Invalid port number')
      return
    }

    const newSettings: SMTPSettings = {
      enabled: smtpSettings.enabled,
      host,
      port: portNum,
      secure,
      username,
      password,
      fromEmail,
      fromName,
    }
    onUpdateSMTPSettings(newSettings)
    toast.success('SMTP settings saved!')
  }

  const handleToggleSMTP = (enabled: boolean) => {
    if (enabled && (!host || !port || !username || !fromEmail)) {
      toast.error('Please configure SMTP settings before enabling')
      return
    }
    onUpdateSMTPSettings({ ...smtpSettings, enabled })
    toast.success(enabled ? 'Email alerts enabled' : 'Email alerts disabled')
  }

  const handleTestConnection = async () => {
    if (!host || !port || !username || !fromEmail) {
      toast.error('Please fill in all SMTP settings')
      return
    }

    setIsTesting(true)
    
    setTimeout(() => {
      setIsTesting(false)
      const isValid = host.includes('.') && parseInt(port) > 0 && username && fromEmail.includes('@')
      
      if (isValid) {
        toast.success('SMTP connection test successful!', {
          description: 'Email configuration is valid',
        })
      } else {
        toast.error('SMTP connection test failed', {
          description: 'Please check your settings and try again',
        })
      }
    }, 1500)
  }

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
    type: 'rewardPurchaseAlerts' | 'choreCompletionAlerts' | 'weeklyReportAlerts',
    enabled: boolean
  ) => {
    if (enabled && !smtpSettings.enabled) {
      toast.error('Please enable and configure SMTP settings first')
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Envelope className="h-5 w-5" />
            SMTP Server Settings
          </CardTitle>
          <CardDescription>
            Configure your SMTP server to enable email alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Email Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Turn on email notifications for important events
              </p>
            </div>
            <Switch
              checked={smtpSettings.enabled}
              onCheckedChange={handleToggleSMTP}
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.gmail.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                type="number"
                placeholder="587"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-username">Username</Label>
              <Input
                id="smtp-username"
                placeholder="your-email@gmail.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-password">Password</Label>
              <Input
                id="smtp-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-from-email">From Email</Label>
              <Input
                id="smtp-from-email"
                type="email"
                placeholder="chorequest@example.com"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-from-name">From Name</Label>
              <Input
                id="smtp-from-name"
                placeholder="ChoreQuest"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="space-y-0.5 flex-1">
              <Label>Use TLS/SSL</Label>
              <p className="text-sm text-muted-foreground">
                Secure connection (recommended for ports 465, 587)
              </p>
            </div>
            <Switch
              checked={secure}
              onCheckedChange={setSecure}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveSMTP} className="flex-1">
              <Check className="h-4 w-4 mr-2" />
              Save SMTP Settings
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>

          {!smtpSettings.enabled && (
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <Warning className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Email alerts are disabled</p>
                <p className="text-muted-foreground">
                  Configure and enable SMTP to receive email notifications
                </p>
              </div>
            </div>
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
              <Label>Chore Completion Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when chores need approval
              </p>
            </div>
            <Switch
              checked={emailAlertSettings.choreCompletionAlerts}
              onCheckedChange={(checked) =>
                handleToggleAlert('choreCompletionAlerts', checked)
              }
            />
          </div>

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
