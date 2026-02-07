import { useMemo, useEffect, useState, useRef } from 'react'
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

// Celebration-style animation component for wallpapers
function WallpaperAnimations() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const colors = [
      'oklch(0.6 0.22 290)',
      'oklch(0.72 0.18 45)',
      'oklch(0.85 0.15 95)',
      'oklch(0.65 0.12 240)',
      'oklch(0.8 0.2 160)',
    ]

    const bubbleColors = [
      'oklch(0.6 0.22 290 / 0.5)',
      'oklch(0.72 0.18 45 / 0.5)',
      'oklch(0.85 0.15 95 / 0.5)',
      'oklch(0.65 0.12 240 / 0.5)',
      'oklch(0.8 0.2 160 / 0.5)',
    ]

    const container = containerRef.current
    const particleTypes = ['confetti', 'sparkle', 'bubble', 'heart', 'star']
    const particleCount = 30 // Total number of particles
    
    // Create particles continuously
    const createParticle = () => {
      const type = particleTypes[Math.floor(Math.random() * particleTypes.length)]
      const particle = document.createElement('div')
      particle.className = `wallpaper-particle wallpaper-${type}`
      
      const startX = Math.random() * 100
      const duration = 8 + Math.random() * 8 // 8-16 seconds
      const delay = Math.random() * 5 // Stagger start times
      
      particle.style.left = `${startX}%`
      particle.style.animationDuration = `${duration}s`
      particle.style.animationDelay = `${delay}s`
      particle.style.setProperty('--random', String(Math.random()))
      
      switch (type) {
        case 'confetti':
          particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
          particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '0'
          break
        case 'sparkle':
          particle.textContent = '✨'
          break
        case 'bubble':
          const size = 20 + Math.random() * 30
          particle.style.width = `${size}px`
          particle.style.height = `${size}px`
          particle.style.backgroundColor = bubbleColors[Math.floor(Math.random() * bubbleColors.length)]
          break
        case 'heart':
          particle.textContent = '💖'
          break
        case 'star':
          particle.textContent = '⭐'
          break
      }
      
      container.appendChild(particle)
      
      // Remove particle after animation completes
      setTimeout(() => {
        if (particle.isConnected) {
          particle.remove()
        }
      }, (duration + delay) * 1000)
    }

    // Create initial batch of particles
    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => createParticle(), i * 200)
    }

    // Continuously create new particles
    const interval = setInterval(() => {
      createParticle()
    }, 2000) // New particle every 2 seconds

    return () => {
      clearInterval(interval)
      // Clean up any remaining particles
      while (container.firstChild) {
        container.removeChild(container.firstChild)
      }
    }
  }, [])

  return <div ref={containerRef} className="fixed inset-0 pointer-events-none z-1" aria-hidden="true" />
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
    'relative h-full overflow-hidden',
    hasWallpaper ? 'wallpaper-surface' : fallbackClassName,
    shouldAnimate ? 'wallpaper-animate' : '',
    className
  )

  return (
    <div className={wrapperClassName} style={galleryStyle || wallpaperSelection?.style}>
      {galleryWallpaper?.fileType === 'video' && (
        <video
          className="fixed inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          src={galleryWallpaper.url}
          aria-hidden="true"
        />
      )}
      {shouldAnimate && <WallpaperAnimations />}
      {hasWallpaper && (
        <div
          className={cn(
            'pointer-events-none fixed inset-0 wallpaper-overlay',
            shouldAnimate ? 'wallpaper-overlay-animate' : ''
          )}
          aria-hidden="true"
        />
      )}
      <div className={cn('relative z-10 h-full overflow-y-auto', contentClassName)}>{children}</div>
    </div>
  )
}
