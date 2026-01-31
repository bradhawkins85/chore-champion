import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Bell, BellSlash, Check, Warning, DeviceMobile } from '@phosphor-icons/react'
import { PushNotificationSettings, DevicePushSettings, DigestInterval } from '@/lib/types'
import { getDeviceId } from '@/lib/deviceHelper'

interface PushNotificationSettingsProps {
  pushSettings: PushNotificationSettings
  deviceId: string
  onUpdatePushSettings: (settings: PushNotificationSettings) => void
}

export function PushNotificationSettingsComponent({
  pushSettings,
  deviceId: propDeviceId,
  onUpdatePushSettings,
}: PushNotificationSettingsProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default')
  const [isSubscribing, setIsSubscribing] = useState(false)

  // Use provided device ID or generate one
  const currentDeviceId = propDeviceId || getDeviceId()

  const currentDeviceSettings = pushSettings.devices.find(d => d.deviceId === currentDeviceId)

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    setIsSupported(supported)

    if (supported) {
      setPermissionState(Notification.permission)
    }
  }, [])

  const requestNotificationPermission = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      setPermissionState(permission)

      if (permission === 'granted') {
        toast.success('Notification permission granted!')
        return true
      } else if (permission === 'denied') {
        toast.error('Notification permission denied. Please enable notifications in your browser settings.')
        return false
      } else {
        toast.info('Notification permission dismissed')
        return false
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      toast.error('Failed to request notification permission')
      return false
    }
  }

  const subscribeToPushNotifications = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported')
      return
    }

    if (permissionState !== 'granted') {
      const granted = await requestNotificationPermission()
      if (!granted) return
    }

    setIsSubscribing(true)

    try {
      const registration = await navigator.serviceWorker.ready
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription()
      
      if (!subscription) {
        // Subscribe to push notifications
        // Note: In a production environment, you would need a VAPID public key from your push service
        // For now, we'll use userVisibleOnly which is required by the spec
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          // applicationServerKey would go here in production
        })
      }

      if (subscription) {
        // Convert subscription to a format we can store
        const subscriptionJSON = subscription.toJSON()
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscriptionJSON.keys?.p256dh || '',
            auth: subscriptionJSON.keys?.auth || '',
          },
        }

        // Update or create device settings
        const updatedDevices = currentDeviceSettings
          ? pushSettings.devices.map(d =>
              d.deviceId === currentDeviceId
                ? { ...d, subscription: pushSubscription, enabled: true, updatedAt: Date.now() }
                : d
            )
          : [
              ...pushSettings.devices,
              {
                deviceId: currentDeviceId,
                subscription: pushSubscription,
                enabled: true,
                rewardPurchaseAlerts: true,
                weeklyReportAlerts: true,
                pendingApprovalAlerts: true,
                digestMode: 'immediate' as DigestInterval,
                lastDigestSent: null,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            ]

        onUpdatePushSettings({
          ...pushSettings,
          enabled: true,
          devices: updatedDevices,
        })

        toast.success('Push notifications enabled for this device!')
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      toast.error('Failed to enable push notifications. Please try again.')
    } finally {
      setIsSubscribing(false)
    }
  }

  const unsubscribeFromPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      // Update device settings
      const updatedDevices = pushSettings.devices.map(d =>
        d.deviceId === currentDeviceId
          ? { ...d, subscription: null, enabled: false, updatedAt: Date.now() }
          : d
      )

      onUpdatePushSettings({
        ...pushSettings,
        devices: updatedDevices,
      })

      toast.success('Push notifications disabled for this device')
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      toast.error('Failed to disable push notifications')
    }
  }

  const handleToggleAlert = (
    type: 'rewardPurchaseAlerts' | 'weeklyReportAlerts' | 'pendingApprovalAlerts',
    enabled: boolean
  ) => {
    if (!currentDeviceSettings) {
      toast.error('Please enable push notifications first')
      return
    }

    const updatedDevices = pushSettings.devices.map(d =>
      d.deviceId === currentDeviceId
        ? { ...d, [type]: enabled, updatedAt: Date.now() }
        : d
    )

    onUpdatePushSettings({
      ...pushSettings,
      devices: updatedDevices,
    })

    toast.success(enabled ? 'Alert enabled' : 'Alert disabled')
  }

  const handleDigestModeChange = (mode: DigestInterval) => {
    if (!currentDeviceSettings) {
      toast.error('Please enable push notifications first')
      return
    }

    const updatedDevices = pushSettings.devices.map(d =>
      d.deviceId === currentDeviceId
        ? { ...d, digestMode: mode, updatedAt: Date.now() }
        : d
    )

    onUpdatePushSettings({
      ...pushSettings,
      devices: updatedDevices,
    })

    toast.success('Digest mode updated')
  }

  const handleTestNotification = async () => {
    if (!currentDeviceSettings?.enabled) {
      toast.error('Please enable push notifications first')
      return
    }

    if (permissionState !== 'granted') {
      toast.error('Notification permission not granted')
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification('ChoreQuest Test', {
        body: 'Push notifications are working correctly!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'test-notification',
      })
      toast.success('Test notification sent!')
    } catch (error) {
      console.error('Error sending test notification:', error)
      toast.error('Failed to send test notification')
    }
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

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellSlash className="h-5 w-5" />
            Push Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser does not support push notifications. Please use a modern browser like Chrome, Firefox, or Edge.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive instant notifications on this device when important events occur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get real-time alerts on this device
              </p>
            </div>
            {currentDeviceSettings?.enabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={unsubscribeFromPushNotifications}
              >
                Disable
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={subscribeToPushNotifications}
                disabled={isSubscribing}
              >
                {isSubscribing ? 'Enabling...' : 'Enable'}
              </Button>
            )}
          </div>

          {permissionState === 'denied' && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
              <Warning className="h-5 w-5 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Notification permission denied</p>
                <p className="text-muted-foreground">
                  Please enable notifications for this site in your browser settings
                </p>
              </div>
            </div>
          )}

          {currentDeviceSettings?.enabled && (
            <>
              <Separator />
              
              <div className="flex items-center gap-2">
                <DeviceMobile className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Notifications enabled for this device
                </span>
              </div>

              <Button
                variant="outline"
                onClick={handleTestNotification}
                className="w-full"
              >
                Send Test Notification
              </Button>
            </>
          )}

          {!currentDeviceSettings?.enabled && permissionState !== 'denied' && (
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <Warning className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Push notifications are disabled</p>
                <p className="text-muted-foreground">
                  Enable push notifications to receive real-time alerts on this device
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {currentDeviceSettings?.enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Alert Preferences</CardTitle>
            <CardDescription>
              Choose which events trigger push notifications on this device
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
                checked={currentDeviceSettings.rewardPurchaseAlerts}
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
                checked={currentDeviceSettings.pendingApprovalAlerts}
                onCheckedChange={(checked) =>
                  handleToggleAlert('pendingApprovalAlerts', checked)
                }
              />
            </div>

            {currentDeviceSettings.pendingApprovalAlerts && (
              <>
                <Separator />
                
                <div className="space-y-2">
                  <Label>Digest Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Combine multiple pending approvals into a single notification
                  </p>
                  <Select
                    value={currentDeviceSettings.digestMode}
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
                  {currentDeviceSettings.digestMode !== 'immediate' && (
                    <p className="text-xs text-muted-foreground">
                      Pending approvals will be grouped and sent {getDigestModeLabel(currentDeviceSettings.digestMode).toLowerCase()}
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
                  Receive weekly activity report notifications
                </p>
              </div>
              <Switch
                checked={currentDeviceSettings.weeklyReportAlerts}
                onCheckedChange={(checked) =>
                  handleToggleAlert('weeklyReportAlerts', checked)
                }
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
