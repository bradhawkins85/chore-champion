import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface DisplayPreferencesSettingsProps {
  hideChildrenWithNoActivity: boolean
  onHideChildrenWithNoActivityChange: (value: boolean) => void
}

export function DisplayPreferencesSettings({
  hideChildrenWithNoActivity,
  onHideChildrenWithNoActivityChange,
}: DisplayPreferencesSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Display Preferences</CardTitle>
        <CardDescription>
          Configure how children are displayed on the front page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="hide-inactive-children" className="text-base">
              Hide Children with No Activity
            </Label>
            <p className="text-sm text-muted-foreground">
              Hide children from the front page if they have no chores assigned for today and no "On This Day" entries (historical completions or calendar events)
            </p>
          </div>
          <Switch
            id="hide-inactive-children"
            checked={hideChildrenWithNoActivity}
            onCheckedChange={onHideChildrenWithNoActivityChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
