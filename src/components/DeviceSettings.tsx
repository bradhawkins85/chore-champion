import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Shield } from '@phosphor-icons/react'

interface DeviceSettingsProps {
  blockParentModeOnLinkedDevices: boolean
  onBlockParentModeOnLinkedDevicesChange: (value: boolean) => void
}

export function DeviceSettings({
  blockParentModeOnLinkedDevices,
  onBlockParentModeOnLinkedDevicesChange,
}: DeviceSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Device Security
        </CardTitle>
        <CardDescription>
          Control parent mode access on linked devices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="block-parent-mode" className="text-base">
              Block Parent Mode on Linked Devices
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, only the primary device can access Parent Mode. All linked devices will be restricted to child view only, preventing unauthorized changes to settings and chores.
            </p>
          </div>
          <Switch
            id="block-parent-mode"
            checked={blockParentModeOnLinkedDevices}
            onCheckedChange={onBlockParentModeOnLinkedDevicesChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
