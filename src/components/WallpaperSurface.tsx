import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { DeviceWallpaperSettingsMap, WallpaperSettings, WeatherData, WallpaperMode } from '@/lib/types'
import { getDeviceWallpaperMode, getWallpaperSelection } from '@/lib/wallpaperLibrary'

interface WallpaperSurfaceProps {
  children: ReactNode
  className?: string
  contentClassName?: string
  wallpaperSettings: WallpaperSettings
  deviceWallpaperSettings: DeviceWallpaperSettingsMap
  currentWeather: WeatherData | null
  currentDeviceId: string
  fallbackClassName?: string
}

export function WallpaperSurface({
  children,
  className,
  contentClassName,
  wallpaperSettings,
  deviceWallpaperSettings,
  currentWeather,
  currentDeviceId,
  fallbackClassName = 'bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10',
}: WallpaperSurfaceProps) {
  const deviceMode = getDeviceWallpaperMode({
    settings: wallpaperSettings,
    deviceMode: deviceWallpaperSettings[currentDeviceId]?.mode as WallpaperMode | undefined,
  })

  const wallpaperSelection = useMemo(
    () =>
      getWallpaperSelection({
        settings: wallpaperSettings,
        deviceMode,
        weather: currentWeather,
        seedKey: `${currentDeviceId}-${new Date().toISOString().slice(0, 10)}`,
      }),
    [wallpaperSettings, deviceMode, currentWeather, currentDeviceId]
  )

  const wrapperClassName = cn(
    'relative h-full overflow-y-auto',
    wallpaperSelection ? 'wallpaper-surface' : fallbackClassName,
    wallpaperSelection && wallpaperSettings.animationsEnabled ? 'wallpaper-animate' : '',
    className
  )

  return (
    <div className={wrapperClassName} style={wallpaperSelection?.style}>
      {wallpaperSelection && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 wallpaper-overlay',
            wallpaperSettings.animationsEnabled ? 'wallpaper-overlay-animate' : ''
          )}
          aria-hidden="true"
        />
      )}
      <div className={cn('relative z-10', contentClassName)}>{children}</div>
    </div>
  )
}
