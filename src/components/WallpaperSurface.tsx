import { useMemo, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { DeviceWallpaperSettingsMap, WallpaperSettings, WeatherData, WallpaperMode, WallpaperAsset } from '@/lib/types'
import { getDeviceWallpaperMode, getWallpaperSelection } from '@/lib/wallpaperLibrary'
import { useAuth } from '@/contexts/AuthContext'

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
  const { token } = useAuth()
  const [galleryWallpapers, setGalleryWallpapers] = useState<WallpaperAsset[]>([])

  const deviceMode = getDeviceWallpaperMode({
    settings: wallpaperSettings,
    deviceMode: deviceWallpaperSettings[currentDeviceId]?.mode as WallpaperMode | undefined,
  })

  useEffect(() => {
    if (!token || !wallpaperSettings.galleryWallpapersEnabled) {
      setGalleryWallpapers([])
      return
    }

    let active = true

    const loadGallery = async () => {
      try {
        const response = await fetch('/api/wallpapers', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) throw new Error('Failed to load wallpaper gallery')
        const data = await response.json()
        if (active) {
          setGalleryWallpapers(data.wallpapers || [])
        }
      } catch (error) {
        console.error('Error loading wallpaper gallery:', error)
        if (active) {
          setGalleryWallpapers([])
        }
      }
    }

    loadGallery()

    return () => {
      active = false
    }
  }, [token, wallpaperSettings.galleryWallpapersEnabled])

  const galleryWallpaper = useMemo(() => {
    if (!wallpaperSettings.enabled || !wallpaperSettings.galleryWallpapersEnabled) return null
    if (deviceMode !== 'gallery') return null
    if (galleryWallpapers.length === 0) return null
    const targetId = wallpaperSettings.galleryWallpaperId || galleryWallpapers[0]?.id
    return galleryWallpapers.find((wallpaper) => wallpaper.id === targetId) ?? galleryWallpapers[0]
  }, [
    wallpaperSettings.enabled,
    wallpaperSettings.galleryWallpapersEnabled,
    wallpaperSettings.galleryWallpaperId,
    deviceMode,
    galleryWallpapers,
  ])

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

  const galleryStyle = useMemo(() => {
    if (!galleryWallpaper || galleryWallpaper.fileType !== 'image') return undefined
    return {
      backgroundImage: `url("${galleryWallpaper.url}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  }, [galleryWallpaper])

  const hasWallpaper = Boolean(wallpaperSelection || galleryWallpaper)
  const shouldAnimate = Boolean(wallpaperSelection && wallpaperSettings.animationsEnabled)

  const wrapperClassName = cn(
    'relative h-full overflow-y-auto',
    hasWallpaper ? 'wallpaper-surface' : fallbackClassName,
    shouldAnimate ? 'wallpaper-animate' : '',
    className
  )

  return (
    <div className={wrapperClassName} style={galleryStyle || wallpaperSelection?.style}>
      {galleryWallpaper?.fileType === 'video' && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          src={galleryWallpaper.url}
        />
      )}
      {hasWallpaper && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 wallpaper-overlay',
            shouldAnimate ? 'wallpaper-overlay-animate' : ''
          )}
          aria-hidden="true"
        />
      )}
      <div className={cn('relative z-10', contentClassName)}>{children}</div>
    </div>
  )
}
