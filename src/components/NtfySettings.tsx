import { useEffect, useState, type FormEvent } from 'react'
import { Bell } from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NTFY_NOTIFICATION_TYPES, type NtfySettings } from '@/lib/ntfy'
import { useNtfySettings } from '@/hooks/use-ntfy-settings'
import { toast } from 'sonner'

export function NtfySettingsComponent({ ntfy }: { ntfy: ReturnType<typeof useNtfySettings> }) {
  const [draft, setDraft] = useState<NtfySettings | null>(ntfy.settings)
  const [credential, setCredential] = useState('')
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setDraft(ntfy.settings); setCredential('') }, [ntfy.settings])

  if (ntfy.viewOnlyMode) return <p className="text-sm text-muted-foreground">Family notification settings are unavailable in view-only mode.</p>
  if (ntfy.loading) return <p role="status" className="p-6 text-sm text-muted-foreground">Loading family notification settings…</p>
  if (!draft || !ntfy.settings) return (
    <Card><CardContent className="space-y-3 pt-6">
      <p role="alert">{ntfy.error || 'Unable to load ntfy settings.'}</p>
      <Button variant="outline" onClick={ntfy.reload}>Try again</Button>
    </CardContent></Card>
  )

  const saved = ntfy.settings
  const dirty = credential !== '' || ['enabled', 'serverUrl', 'topic', 'authMode', 'username'].some(key => draft[key] !== saved[key])
    || JSON.stringify(draft.notificationTypes) !== JSON.stringify(saved.notificationTypes)
  const sameAccount = draft.serverUrl.replace(/\/+$/, '') === saved.serverUrl && draft.authMode === saved.authMode
    && (draft.authMode !== 'basic' || draft.username === saved.username)
  const hasSavedCredential = saved.hasCredential && sameAccount
  const subscriptionUrl = `${saved.serverUrl}/${saved.topic}`
  const update = (changes: Partial<NtfySettings>) => setDraft({ ...draft, ...changes })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy('save'); setError(null)
    try {
      await ntfy.save({ enabled: draft.enabled, serverUrl: draft.serverUrl, topic: draft.topic, authMode: draft.authMode,
        username: draft.username, notificationTypes: draft.notificationTypes, ...(credential ? { credential } : {}) })
      toast.success('Family notification settings saved')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save settings') }
    finally { setBusy(null) }
  }
  const test = async () => {
    setBusy('test'); setError(null)
    try { await ntfy.test(); toast.success('Test notification sent to your family topic') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to send test notification') }
    finally { setBusy(null) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />ntfy notifications</CardTitle>
        <CardDescription>Send chore and reward updates to one topic shared by your family, even when ChoreQuest is closed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={submit} className="space-y-6">
          <fieldset disabled={busy !== null} className="min-w-0 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div><Label htmlFor="ntfy-enabled">Enable family notifications</Label><p className="text-sm text-muted-foreground">Applies to every device in this family.</p></div>
              <Switch id="ntfy-enabled" checked={draft.enabled} onCheckedChange={enabled => update({ enabled })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ntfy-server">Server URL</Label>
                <Input id="ntfy-server" type="url" required maxLength={2048} value={draft.serverUrl} onChange={event => update({ serverUrl: event.target.value })} aria-describedby="ntfy-server-help" />
                <p id="ntfy-server-help" className="text-xs text-muted-foreground">Defaults to https://ntfy.sh. You can use a self-hosted server.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ntfy-topic">Topic</Label>
                <Input id="ntfy-topic" required pattern="[A-Za-z0-9_-]{1,64}" maxLength={64} value={draft.topic} onChange={event => update({ topic: event.target.value })} aria-describedby="ntfy-topic-help" />
                <p id="ntfy-topic-help" className="text-xs text-muted-foreground">A random topic is created for each family. Keep it private.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ntfy-auth">Authentication</Label>
                <Select value={draft.authMode} onValueChange={authMode => { update({ authMode: authMode as NtfySettings['authMode'] }); setCredential('') }}>
                  <SelectTrigger id="ntfy-auth" className="w-full sm:w-72" disabled={busy !== null}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">No authentication</SelectItem><SelectItem value="token">Access token</SelectItem><SelectItem value="basic">Username and password</SelectItem></SelectContent>
                </Select>
              </div>
              {draft.authMode === 'basic' && <div className="space-y-2">
                <Label htmlFor="ntfy-username">Username</Label>
                <Input id="ntfy-username" autoComplete="off" required maxLength={255} value={draft.username} onChange={event => update({ username: event.target.value })} />
              </div>}
              {draft.authMode !== 'none' && <div className="space-y-2">
                <Label htmlFor="ntfy-credential">{draft.authMode === 'token' ? 'Access token' : 'Password'}</Label>
                <Input id="ntfy-credential" type="password" autoComplete="new-password" maxLength={4096} required={!hasSavedCredential} value={credential} onChange={event => setCredential(event.target.value)} placeholder={hasSavedCredential ? 'Saved — leave blank to keep' : ''} aria-describedby="ntfy-credential-help" />
                <p id="ntfy-credential-help" className="text-xs text-muted-foreground">Credentials are stored securely on the server. Enter new credentials when changing the server or account.</p>
              </div>}
            </div>
            <fieldset className="space-y-4 border-t pt-4">
              <legend className="px-1 text-sm font-medium">Notification types</legend>
              {NTFY_NOTIFICATION_TYPES.map(type => <div key={type.key} className="flex items-center justify-between gap-4">
                <div><Label htmlFor={`ntfy-${type.key}`}>{type.label}</Label><p className="text-xs text-muted-foreground">{type.description}</p></div>
                <Switch id={`ntfy-${type.key}`} checked={draft.notificationTypes[type.key]} onCheckedChange={enabled => update({ notificationTypes: { ...draft.notificationTypes, [type.key]: enabled } })} />
              </div>)}
            </fieldset>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={busy !== null || !dirty}>{busy === 'save' ? 'Saving…' : 'Save settings'}</Button>
              <Button type="button" variant="outline" disabled={busy !== null || dirty || !saved.enabled} onClick={test}>{busy === 'test' ? 'Sending…' : 'Send test notification'}</Button>
              {dirty && <span className="text-xs text-muted-foreground">Save changes before testing.</span>}
            </div>
          </fieldset>
        </form>
        <div className="space-y-2 border-t pt-4 text-sm">
          <p className="font-medium">Receive notifications</p>
          <p className="text-muted-foreground">In the ntfy app, subscribe to this server and topic on each parent’s device. For a private server, also sign in there.</p>
          <a href={subscriptionUrl} target="_blank" rel="noopener noreferrer" className="block break-all text-primary underline underline-offset-4">{subscriptionUrl}</a>
          <p className="text-xs text-muted-foreground">Topics on the public ntfy.sh server are accessible to anyone who knows the topic name. Use an authenticated server for access control.</p>
          {saved.lastDeliveredAt && <p className="text-xs text-muted-foreground">Last delivered: {new Date(saved.lastDeliveredAt).toLocaleString()}</p>}
          {saved.lastError && <p role="status" className="text-sm text-destructive">Last delivery failed: {saved.lastError} Queued updates will retry automatically.</p>}
        </div>
      </CardContent>
    </Card>
  )
}
