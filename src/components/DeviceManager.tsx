import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import { DeviceConfig, Child } from '@/lib/types'
import { Devices, Pencil, Trash, Clock, Shield, Users } from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'

interface DeviceManagerProps {
  devices: DeviceConfig[]
  childrenList: Child[]
  currentDeviceId: string
  onUpdateDevice: (deviceId: string, updates: Partial<DeviceConfig>) => void
  onDeleteDevice: (deviceId: string) => void
}

export function DeviceManager({
  devices,
  childrenList,
  currentDeviceId,
  onUpdateDevice,
  onDeleteDevice,
}: DeviceManagerProps) {
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)
  const [deleteDeviceId, setDeleteDeviceId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAllowedChildren, setEditAllowedChildren] = useState<string[]>([])
  const [editParentMode, setEditParentMode] = useState(false)

  const handleStartEdit = (device: DeviceConfig) => {
    setEditingDeviceId(device.id)
    setEditName(device.name)
    setEditAllowedChildren(device.allowedChildIds)
    setEditParentMode(device.parentModeEnabled)
  }

  const handleSaveEdit = () => {
    if (!editingDeviceId) return
    
    onUpdateDevice(editingDeviceId, {
      name: editName,
      allowedChildIds: editAllowedChildren,
      parentModeEnabled: editParentMode,
    })
    
    setEditingDeviceId(null)
  }

  const handleCancelEdit = () => {
    setEditingDeviceId(null)
  }

  const handleToggleChild = (childId: string) => {
    setEditAllowedChildren((current) =>
      current.includes(childId)
        ? current.filter((id) => id !== childId)
        : [...current, childId]
    )
  }

  const handleDeleteDevice = () => {
    if (deleteDeviceId) {
      onDeleteDevice(deleteDeviceId)
      setDeleteDeviceId(null)
    }
  }

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) {
      return 'Just now'
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    } else {
      const days = Math.floor(diff / 86400000)
      return `${days} day${days !== 1 ? 's' : ''} ago`
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-fredoka font-bold mb-2">Device Management</h2>
        <p className="text-muted-foreground">
          Control which children profiles and features are available on each device
        </p>
      </div>

      {devices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Devices className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No devices registered yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {devices.map((device) => (
            <Card key={device.id} className={device.id === currentDeviceId ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    {editingDeviceId === device.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Device name"
                        className="max-w-xs"
                      />
                    ) : (
                      <CardTitle className="flex items-center gap-2">
                        {device.name}
                        {device.id === currentDeviceId && (
                          <Badge variant="secondary">This Device</Badge>
                        )}
                      </CardTitle>
                    )}
                    <CardDescription className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatLastSeen(device.lastSeen)}
                      </span>
                      <span className="text-xs">
                        Added {formatDate(device.createdAt)}
                      </span>
                    </CardDescription>
                  </div>
                  
                  {editingDeviceId === device.id ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartEdit(device)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteDeviceId(device.id)}
                        disabled={device.id === currentDeviceId}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {editingDeviceId === device.id ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`parent-mode-${device.id}`} className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Allow Parent Mode
                        </Label>
                        <Switch
                          id={`parent-mode-${device.id}`}
                          checked={editParentMode}
                          onCheckedChange={setEditParentMode}
                        />
                      </div>
                      
                      <div className="pt-2">
                        <Label className="flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4" />
                          Allowed Children
                        </Label>
                        {childrenList.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No children created yet</p>
                        ) : (
                          <div className="space-y-2">
                            {childrenList.map((child) => (
                              <div key={child.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`child-${device.id}-${child.id}`}
                                  checked={editAllowedChildren.includes(child.id)}
                                  onCheckedChange={() => handleToggleChild(child.id)}
                                />
                                <Label
                                  htmlFor={`child-${device.id}-${child.id}`}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <div
                                    className="w-6 h-6 rounded-full"
                                    style={{ backgroundColor: child.avatarColor }}
                                  />
                                  {child.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Shield className={`h-4 w-4 ${device.parentModeEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-sm">
                        Parent Mode: {device.parentModeEnabled ? (
                          <span className="text-primary font-medium">Enabled</span>
                        ) : (
                          <span className="text-muted-foreground">Disabled</span>
                        )}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Allowed Children ({device.allowedChildIds.length})
                        </span>
                      </div>
                      {device.allowedChildIds.length === 0 ? (
                        <p className="text-sm text-muted-foreground ml-6">No children allowed</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 ml-6">
                          {device.allowedChildIds.map((childId) => {
                            const child = childrenList.find((c) => c.id === childId)
                            if (!child) return null
                            return (
                              <Badge key={childId} variant="secondary" className="gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: child.avatarColor }}
                                />
                                {child.name}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDeviceId !== null} onOpenChange={() => setDeleteDeviceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This device will lose access to ChoreQuest. You can always add it back later by accessing the app from that device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDevice}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
