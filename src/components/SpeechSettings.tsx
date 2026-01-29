import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SpeakerHigh } from '@phosphor-icons/react'
import { SpeechSettings as SpeechSettingsType } from '@/lib/types'

interface SpeechSettingsProps {
  settings: SpeechSettingsType
  onUpdate: (settings: SpeechSettingsType) => void
}

export function SpeechSettings({ settings, onUpdate }: SpeechSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <SpeakerHigh className="h-5 w-5 text-primary" weight="fill" />
          <CardTitle>Speech Settings</CardTitle>
        </div>
        <CardDescription>
          Enable text-to-speech for chores on the main page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="speech-enabled">Enable Speech</Label>
            <p className="text-sm text-muted-foreground">
              Allow children to hear chore names and descriptions
            </p>
          </div>
          <Switch
            id="speech-enabled"
            checked={settings.enabled}
            onCheckedChange={(enabled) =>
              onUpdate({ ...settings, enabled })
            }
          />
        </div>

        {settings.enabled && (
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">How it works:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>A speaker button appears next to upcoming chores</li>
              <li>Clicking the button reads the chore name aloud</li>
              <li>Descriptions are read if enabled per chore</li>
              <li>Control description reading in the chore settings</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
