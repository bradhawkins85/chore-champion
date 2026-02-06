import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Monitor, ImageSquare } from '@phosphor-icons/react'
import { useAuth } from '@/contexts/AuthContext'
import { getLinkedDevices, getDeviceGuid, DeviceInfo } from '@/lib/deviceHelper'
import type { DeviceWallpaperSettingsMap, WallpaperMode, WallpaperSettings, WallpaperAsset } from '@/lib/types'
import { nonWeatherWallpaperCount, weatherWallpaperCountByType } from '@/lib/wallpaperLibrary'
import { toast } from 'sonner'

interface DeviceSummary {
  id: string
  deviceGuid: string
  deviceName: string | null
  deviceInfo: DeviceInfo
}

interface WallpaperSettingsPanelProps {
  wallpaperSettings: WallpaperSettings
  deviceWallpaperSettings: DeviceWallpaperSettingsMap
  onUpdateWallpaperSettings: (settings: WallpaperSettings) => void
  onUpdateDeviceWallpaperSettings: (settings: DeviceWallpaperSettingsMap) => void
}

const getDeviceLabel = (device: DeviceSummary) => {
  if (device.deviceName) return device.deviceName
  const userAgent = device.deviceInfo?.userAgent || 'Unknown Device'
  let browser = 'Browser'
  let os = device.deviceInfo?.platform || 'OS'

  if (userAgent.includes('Chrome')) browser = 'Chrome'
  else if (userAgent.includes('Firefox')) browser = 'Firefox'
  else if (userAgent.includes('Safari')) browser = 'Safari'
  else if (userAgent.includes('Edge')) browser = 'Edge'

  if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Mac')) os = 'macOS'
  else if (userAgent.includes('Linux')) os = 'Linux'
  else if (userAgent.includes('Android')) os = 'Android'
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS'

  return `${browser} on ${os}`
}

export function WallpaperSettingsPanel({
  wallpaperSettings,
  deviceWallpaperSettings,
  onUpdateWallpaperSettings,
  onUpdateDeviceWallpaperSettings,
}: WallpaperSettingsPanelProps) {
  const { token } = useAuth()
  const [devices, setDevices] = useState<DeviceSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [galleryWallpapers, setGalleryWallpapers] = useState<WallpaperAsset[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const currentDeviceGuid = getDeviceGuid()

  useEffect(() => {
    if (!token) {
      setDevices([])
      return
    }

    const loadDevices = async () => {
      setLoading(true)
      try {
        const linkedDevices = await getLinkedDevices(token)
        setDevices(
          linkedDevices.map((device) => ({
            id: device.id,
            deviceGuid: device.deviceGuid,
            deviceName: device.deviceName,
            deviceInfo: device.deviceInfo,
          }))
        )
      } catch (error) {
        console.error('Error loading linked devices:', error)
        toast.error('Failed to load linked devices')
      } finally {
        setLoading(false)
      }
    }

    loadDevices()
  }, [token])

  useEffect(() => {
    if (!token) {
      setGalleryWallpapers([])
      return
    }

    const loadGallery = async () => {
      setGalleryLoading(true)
      try {
        const response = await fetch('/api/wallpapers', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) throw new Error('Failed to load wallpaper gallery')
        const data = await response.json()
        setGalleryWallpapers(data.wallpapers || [])
      } catch (error) {
        console.error('Error loading wallpaper gallery:', error)
        toast.error('Failed to load wallpaper gallery')
      } finally {
        setGalleryLoading(false)
      }
    }

    loadGallery()
  }, [token])

  const allDevices = useMemo(() => {
    const currentDevice: DeviceSummary = {
      id: currentDeviceGuid,
      deviceGuid: currentDeviceGuid,
      deviceName: 'This device',
      deviceInfo: { userAgent: navigator.userAgent, platform: navigator.platform, mobile: false, timestamp: '' },
    }

    const filtered = devices.filter((device) => device.deviceGuid !== currentDeviceGuid)
    return [currentDevice, ...filtered]
  }, [devices, currentDeviceGuid])

  const handleModeChange = (deviceId: string, mode: WallpaperMode) => {
    onUpdateDeviceWallpaperSettings({
      ...deviceWallpaperSettings,
      [deviceId]: { mode },
    })
  }

  const galleryEnabled = wallpaperSettings.galleryWallpapersEnabled ?? false
  const selectedGalleryId = wallpaperSettings.galleryWallpaperId
  const selectedGalleryWallpaper = galleryWallpapers.find((wallpaper) => wallpaper.id === selectedGalleryId)

  useEffect(() => {
    if (galleryEnabled && !selectedGalleryId && galleryWallpapers.length > 0) {
      onUpdateWallpaperSettings({
        ...wallpaperSettings,
        galleryWallpaperId: galleryWallpapers[0].id,
      })
    }
  }, [galleryEnabled, galleryWallpapers, selectedGalleryId, onUpdateWallpaperSettings, wallpaperSettings])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageSquare className="h-5 w-5" />
          Wallpapers
        </CardTitle>
        <CardDescription>
          Manage child-friendly backgrounds for the main child views.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base">Enable Wallpapers</Label>
            <p className="text-sm text-muted-foreground">
              Turn on playful wallpapers for the child dashboard and chore pages.
            </p>
          </div>
          <Switch
            checked={wallpaperSettings.enabled}
            onCheckedChange={(enabled) => onUpdateWallpaperSettings({ ...wallpaperSettings, enabled })}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Weather Themes</Label>
              <p className="text-sm text-muted-foreground">
                Use {Object.values(weatherWallpaperCountByType).reduce((sum, count) => sum + count, 0)} weather-inspired wallpapers.
              </p>
            </div>
            <Switch
              checked={wallpaperSettings.weatherWallpapersEnabled}
              onCheckedChange={(enabled) =>
                onUpdateWallpaperSettings({
                  ...wallpaperSettings,
                  weatherWallpapersEnabled: enabled,
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Non-Weather Themes</Label>
              <p className="text-sm text-muted-foreground">
                Use {nonWeatherWallpaperCount} playful wallpapers even without weather data.
              </p>
            </div>
            <Switch
              checked={wallpaperSettings.nonWeatherWallpapersEnabled}
              onCheckedChange={(enabled) =>
                onUpdateWallpaperSettings({
                  ...wallpaperSettings,
                  nonWeatherWallpapersEnabled: enabled,
                })
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base">Gallery Wallpapers</Label>
            <p className="text-sm text-muted-foreground">
              Allow parents to use admin-uploaded wallpapers from the shared gallery.
            </p>
          </div>
          <Switch
            checked={galleryEnabled}
            onCheckedChange={(enabled) =>
              onUpdateWallpaperSettings({
                ...wallpaperSettings,
                galleryWallpapersEnabled: enabled,
                galleryWallpaperId: enabled
                  ? selectedGalleryId || galleryWallpapers[0]?.id || null
                  : null,
              })
            }
          />
        </div>

        {galleryEnabled && (
          <div className="space-y-3 rounded-lg border border-border/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Gallery Wallpaper</Label>
                <p className="text-sm text-muted-foreground">
                  Choose the gallery wallpaper that appears when the gallery mode is selected.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {galleryWallpapers.length} available
              </span>
            </div>
            {galleryWallpapers.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px] md:items-center">
                <Select
                  value={selectedGalleryId ?? ''}
                  onValueChange={(value) =>
                    onUpdateWallpaperSettings({
                      ...wallpaperSettings,
                      galleryWallpaperId: value,
                    })
                  }
                  disabled={galleryLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a gallery wallpaper" />
                  </SelectTrigger>
                  <SelectContent>
                    {galleryWallpapers.map((wallpaper) => (
                      <SelectItem key={wallpaper.id} value={wallpaper.id}>
                        {wallpaper.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedGalleryWallpaper && (
                  <div className="relative h-32 w-full overflow-hidden rounded-lg border border-border/70 bg-muted">
                    {selectedGalleryWallpaper.fileType === 'image' ? (
                      <img
                        src={selectedGalleryWallpaper.url}
                        alt={selectedGalleryWallpaper.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <video
                        className="h-full w-full object-cover"
                        src={selectedGalleryWallpaper.url}
                        muted
                        playsInline
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No gallery wallpapers yet. Ask an admin to upload one.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base">Background Animations</Label>
            <p className="text-sm text-muted-foreground">
              Add gentle movement to wallpaper patterns.
            </p>
          </div>
          <Switch
            checked={wallpaperSettings.animationsEnabled}
            onCheckedChange={(enabled) =>
              onUpdateWallpaperSettings({
                ...wallpaperSettings,
                animationsEnabled: enabled,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base">Default Theme Mode</Label>
          <Select
            value={wallpaperSettings.defaultMode}
            onValueChange={(value) =>
              onUpdateWallpaperSettings({
                ...wallpaperSettings,
                defaultMode: value as WallpaperMode,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select wallpaper mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weather">Weather themed</SelectItem>
              <SelectItem value="non-weather">Non-weather themed</SelectItem>
              <SelectItem value="gallery" disabled={!galleryEnabled || galleryWallpapers.length === 0}>
                Gallery wallpapers
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <Label className="text-base">Per-Device Wallpaper Mode</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose weather or non-weather wallpapers for each linked device. All wallpapers are enabled by default.
          </p>
          <div className="space-y-3">
            {allDevices.map((device) => {
              const deviceMode = deviceWallpaperSettings[device.deviceGuid]?.mode || wallpaperSettings.defaultMode
              return (
                <div
                  key={device.deviceGuid}
                  className="flex flex-col gap-2 rounded-lg border border-border/70 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{getDeviceLabel(device)}</p>
                    <p className="text-xs text-muted-foreground">{device.deviceGuid}</p>
                  </div>
                  <Select
                    value={deviceMode}
                    onValueChange={(value) => handleModeChange(device.deviceGuid, value as WallpaperMode)}
                    disabled={loading}
                  >
                  <SelectTrigger className="w-full md:w-56">
                    <SelectValue placeholder="Choose mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weather">Weather themed</SelectItem>
                    <SelectItem value="non-weather">Non-weather themed</SelectItem>
                    <SelectItem value="gallery" disabled={!galleryEnabled || galleryWallpapers.length === 0}>
                      Gallery wallpapers
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )
            })}
            {allDevices.length === 0 && (
              <p className="text-sm text-muted-foreground">No linked devices found.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
