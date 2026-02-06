import type { CSSProperties } from 'react'
import type { WeatherData, WallpaperMode, WallpaperSettings } from '@/lib/types'

export type WeatherWallpaperType =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunder'

export interface WallpaperDefinition {
  id: string
  label: string
  category: 'weather' | 'non-weather'
  weatherType?: WeatherWallpaperType
  gradient: string
  pattern: string
  patternSize?: string
  accentPattern?: string
  accentSize?: string
}

export interface WallpaperSelection {
  id: string
  label: string
  category: 'weather' | 'non-weather'
  style: CSSProperties
}

const toDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

const createSunPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <circle cx="60" cy="60" r="16" fill="${color}" fill-opacity="0.35" />
      <circle cx="140" cy="140" r="12" fill="${accent}" fill-opacity="0.25" />
      <g stroke="${color}" stroke-opacity="0.35" stroke-width="4" stroke-linecap="round">
        <line x1="60" y1="25" x2="60" y2="10" />
        <line x1="60" y1="95" x2="60" y2="110" />
        <line x1="25" y1="60" x2="10" y2="60" />
        <line x1="95" y1="60" x2="110" y2="60" />
        <line x1="35" y1="35" x2="22" y2="22" />
        <line x1="85" y1="35" x2="98" y2="22" />
        <line x1="35" y1="85" x2="22" y2="98" />
        <line x1="85" y1="85" x2="98" y2="98" />
      </g>
    </svg>
  `)

const createCloudPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g fill="${color}" fill-opacity="0.28">
        <circle cx="60" cy="70" r="18" />
        <circle cx="80" cy="60" r="22" />
        <circle cx="100" cy="70" r="16" />
        <rect x="50" y="70" width="70" height="20" rx="10" />
      </g>
      <g fill="${accent}" fill-opacity="0.2">
        <circle cx="130" cy="130" r="18" />
        <circle cx="150" cy="120" r="22" />
        <circle cx="170" cy="130" r="16" />
        <rect x="120" y="130" width="70" height="20" rx="10" />
      </g>
    </svg>
  `)

const createFogPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g stroke="${color}" stroke-opacity="0.3" stroke-width="6" stroke-linecap="round">
        <line x1="20" y1="60" x2="180" y2="60" />
        <line x1="10" y1="100" x2="160" y2="100" />
        <line x1="30" y1="140" x2="190" y2="140" />
      </g>
      <g stroke="${accent}" stroke-opacity="0.2" stroke-width="4" stroke-linecap="round">
        <line x1="0" y1="80" x2="140" y2="80" />
        <line x1="50" y1="120" x2="200" y2="120" />
      </g>
    </svg>
  `)

const createDrizzlePattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g stroke="${color}" stroke-opacity="0.35" stroke-width="4" stroke-linecap="round">
        <line x1="40" y1="40" x2="30" y2="70" />
        <line x1="90" y1="30" x2="80" y2="60" />
        <line x1="140" y1="50" x2="130" y2="80" />
        <line x1="180" y1="30" x2="170" y2="60" />
      </g>
      <g stroke="${accent}" stroke-opacity="0.25" stroke-width="3" stroke-linecap="round">
        <line x1="20" y1="110" x2="10" y2="140" />
        <line x1="80" y1="120" x2="70" y2="150" />
        <line x1="150" y1="110" x2="140" y2="140" />
      </g>
    </svg>
  `)

const createRainPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g stroke="${color}" stroke-opacity="0.4" stroke-width="5" stroke-linecap="round">
        <line x1="30" y1="30" x2="15" y2="70" />
        <line x1="70" y1="20" x2="55" y2="60" />
        <line x1="110" y1="35" x2="95" y2="75" />
        <line x1="150" y1="25" x2="135" y2="65" />
        <line x1="185" y1="40" x2="170" y2="80" />
      </g>
      <g stroke="${accent}" stroke-opacity="0.3" stroke-width="4" stroke-linecap="round">
        <line x1="50" y1="110" x2="35" y2="150" />
        <line x1="95" y1="120" x2="80" y2="160" />
        <line x1="140" y1="110" x2="125" y2="150" />
        <line x1="180" y1="120" x2="165" y2="160" />
      </g>
    </svg>
  `)

const createSnowPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g fill="${color}" fill-opacity="0.35">
        <circle cx="30" cy="40" r="5" />
        <circle cx="80" cy="30" r="6" />
        <circle cx="130" cy="50" r="4" />
        <circle cx="170" cy="30" r="5" />
        <circle cx="50" cy="120" r="6" />
        <circle cx="110" cy="130" r="5" />
        <circle cx="160" cy="120" r="4" />
      </g>
      <g stroke="${accent}" stroke-opacity="0.25" stroke-width="3" stroke-linecap="round">
        <line x1="60" y1="70" x2="75" y2="85" />
        <line x1="75" y1="70" x2="60" y2="85" />
        <line x1="140" y1="90" x2="155" y2="105" />
        <line x1="155" y1="90" x2="140" y2="105" />
      </g>
    </svg>
  `)

const createThunderPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g fill="${color}" fill-opacity="0.3">
        <polygon points="60,20 90,20 70,70 100,70 50,160 70,90 40,90" />
      </g>
      <g fill="${accent}" fill-opacity="0.25">
        <polygon points="140,40 170,40 150,90 180,90 130,170 150,110 120,110" />
      </g>
    </svg>
  `)

const createConfettiPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g fill="${color}" fill-opacity="0.35">
        <rect x="20" y="30" width="12" height="12" rx="2" />
        <circle cx="70" cy="50" r="6" />
        <rect x="120" y="40" width="10" height="10" rx="2" />
        <circle cx="170" cy="30" r="5" />
        <rect x="40" y="120" width="12" height="12" rx="2" />
        <circle cx="90" cy="140" r="6" />
        <rect x="150" y="130" width="10" height="10" rx="2" />
      </g>
      <g fill="${accent}" fill-opacity="0.25">
        <circle cx="40" cy="70" r="5" />
        <rect x="90" y="90" width="10" height="10" rx="2" />
        <circle cx="140" cy="80" r="5" />
        <rect x="170" y="100" width="8" height="8" rx="2" />
      </g>
    </svg>
  `)

const createStarPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g fill="${color}" fill-opacity="0.35">
        <polygon points="50,20 56,38 75,38 60,50 66,68 50,57 34,68 40,50 25,38 44,38" />
        <polygon points="140,110 146,128 165,128 150,140 156,158 140,147 124,158 130,140 115,128 134,128" />
      </g>
      <g fill="${accent}" fill-opacity="0.25">
        <polygon points="120,30 124,42 136,42 126,50 130,62 120,55 110,62 114,50 104,42 116,42" />
        <circle cx="40" cy="140" r="6" />
      </g>
    </svg>
  `)

const createLeafPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <path d="M40 40 C60 20, 90 20, 110 40 C90 60, 60 70, 40 40Z" fill="${color}" fill-opacity="0.35" />
      <path d="M120 120 C140 100, 170 100, 190 120 C170 140, 140 150, 120 120Z" fill="${accent}" fill-opacity="0.25" />
      <path d="M70 130 C80 110, 110 110, 120 130 C110 150, 80 160, 70 130Z" fill="${color}" fill-opacity="0.3" />
    </svg>
  `)

const createBubblePattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g fill="none" stroke="${color}" stroke-opacity="0.35" stroke-width="4">
        <circle cx="50" cy="50" r="18" />
        <circle cx="140" cy="60" r="14" />
        <circle cx="80" cy="140" r="20" />
      </g>
      <g fill="none" stroke="${accent}" stroke-opacity="0.25" stroke-width="3">
        <circle cx="120" cy="120" r="12" />
        <circle cx="30" cy="130" r="10" />
      </g>
    </svg>
  `)

const createHeartPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <path d="M60 40 C60 20, 90 20, 90 45 C90 20, 120 20, 120 40 C120 70, 90 90, 90 90 C90 90, 60 70, 60 40Z" fill="${color}" fill-opacity="0.3" />
      <path d="M130 120 C130 105, 150 105, 150 120 C150 105, 170 105, 170 120 C170 140, 150 155, 150 155 C150 155, 130 140, 130 120Z" fill="${accent}" fill-opacity="0.25" />
    </svg>
  `)

const createCandyPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g fill="${color}" fill-opacity="0.35">
        <rect x="30" y="30" width="30" height="12" rx="6" />
        <rect x="90" y="50" width="30" height="12" rx="6" />
        <rect x="140" y="30" width="30" height="12" rx="6" />
      </g>
      <g fill="${accent}" fill-opacity="0.25">
        <circle cx="60" cy="120" r="10" />
        <circle cx="120" cy="140" r="8" />
        <circle cx="170" cy="120" r="9" />
      </g>
    </svg>
  `)

const createOceanPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g stroke="${color}" stroke-opacity="0.35" stroke-width="5" fill="none" stroke-linecap="round">
        <path d="M10 50 Q30 40, 50 50 T90 50 T130 50 T170 50" />
        <path d="M20 90 Q40 80, 60 90 T100 90 T140 90 T180 90" />
        <path d="M0 130 Q20 120, 40 130 T80 130 T120 130 T160 130" />
      </g>
      <g fill="${accent}" fill-opacity="0.28">
        <path d="M40 70 C55 60, 70 60, 85 70 C70 80, 55 80, 40 70Z" />
        <circle cx="140" cy="120" r="10" />
        <path d="M150 140 L165 150 L150 160 Z" />
      </g>
      <g fill="${color}" fill-opacity="0.3">
        <path d="M120 40 C135 30, 150 30, 165 40 C150 50, 135 50, 120 40Z" />
        <circle cx="65" cy="140" r="8" />
      </g>
    </svg>
  `)

const createBeachPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g fill="${color}" fill-opacity="0.35">
        <path d="M40 50 L80 50 L60 20 Z" />
        <rect x="58" y="50" width="4" height="20" rx="2" />
        <path d="M130 120 C140 110, 160 110, 170 120 C160 130, 140 130, 130 120Z" />
      </g>
      <g stroke="${accent}" stroke-opacity="0.3" stroke-width="4" fill="none" stroke-linecap="round">
        <path d="M10 160 Q30 150, 50 160 T90 160 T130 160 T170 160" />
      </g>
      <g fill="${accent}" fill-opacity="0.25">
        <circle cx="120" cy="40" r="8" />
        <path d="M90 110 C96 100, 110 100, 116 110 C110 120, 96 120, 90 110Z" />
      </g>
    </svg>
  `)

const createForestPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g fill="${color}" fill-opacity="0.35">
        <polygon points="40,70 60,30 80,70" />
        <rect x="58" y="70" width="4" height="14" rx="2" />
        <polygon points="120,90 140,50 160,90" />
        <rect x="138" y="90" width="4" height="16" rx="2" />
        <path d="M60 140 C70 125, 90 125, 100 140 C90 155, 70 155, 60 140Z" />
      </g>
      <g fill="${accent}" fill-opacity="0.28">
        <circle cx="110" cy="120" r="7" />
        <path d="M130 140 C138 130, 150 130, 158 140 C150 150, 138 150, 130 140Z" />
      </g>
    </svg>
  `)

const createMeadowCrittersPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g fill="${color}" fill-opacity="0.35">
        <circle cx="50" cy="60" r="10" />
        <circle cx="65" cy="55" r="6" />
        <circle cx="35" cy="55" r="6" />
        <circle cx="140" cy="120" r="12" />
        <circle cx="155" cy="115" r="7" />
        <circle cx="125" cy="115" r="7" />
      </g>
      <g fill="${accent}" fill-opacity="0.28">
        <path d="M80 140 C90 125, 110 125, 120 140 C110 155, 90 155, 80 140Z" />
        <circle cx="100" cy="40" r="6" />
      </g>
      <g stroke="${accent}" stroke-opacity="0.3" stroke-width="3" fill="none" stroke-linecap="round">
        <path d="M30 90 Q40 80, 50 90 T70 90" />
        <path d="M120 70 Q130 60, 140 70 T160 70" />
      </g>
    </svg>
  `)

const createSkyFriendsPattern = (color: string, accent: string) =>
  toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g fill="${color}" fill-opacity="0.32">
        <path d="M40 40 C50 30, 70 30, 80 40 C70 50, 50 50, 40 40Z" />
        <path d="M120 60 C130 50, 150 50, 160 60 C150 70, 130 70, 120 60Z" />
        <path d="M70 120 L90 140 L70 160 Z" />
      </g>
      <g fill="${accent}" fill-opacity="0.28">
        <circle cx="50" cy="110" r="8" />
        <path d="M130 140 L150 160 L130 180 Z" />
      </g>
      <g stroke="${accent}" stroke-opacity="0.3" stroke-width="3" fill="none" stroke-linecap="round">
        <path d="M20 90 Q35 80, 50 90 T80 90" />
      </g>
    </svg>
  `)

const weatherWallpaperSets: Record<WeatherWallpaperType, WallpaperDefinition[]> = {
  clear: [
    {
      id: 'clear-sunrise',
      label: 'Sunny Sunrise',
      category: 'weather',
      weatherType: 'clear',
      gradient: 'linear-gradient(135deg, #fff3c7 0%, #ffd6b5 40%, #b7e3ff 100%)',
      pattern: createSunPattern('#ffb703', '#ffd166'),
    },
    {
      id: 'clear-noon',
      label: 'Bright Noon',
      category: 'weather',
      weatherType: 'clear',
      gradient: 'linear-gradient(135deg, #d7f5ff 0%, #a9e5ff 45%, #ffe29a 100%)',
      pattern: createSunPattern('#ffd166', '#90e0ef'),
    },
    {
      id: 'clear-lagoon',
      label: 'Lagoon Shine',
      category: 'weather',
      weatherType: 'clear',
      gradient: 'linear-gradient(135deg, #fef9c3 0%, #bef264 45%, #7dd3fc 100%)',
      pattern: createSunPattern('#facc15', '#38bdf8'),
    },
    {
      id: 'clear-golden',
      label: 'Golden Glow',
      category: 'weather',
      weatherType: 'clear',
      gradient: 'linear-gradient(135deg, #fde68a 0%, #fca5a5 45%, #bae6fd 100%)',
      pattern: createSunPattern('#f97316', '#fb7185'),
    },
    {
      id: 'clear-picnic',
      label: 'Picnic Sky',
      category: 'weather',
      weatherType: 'clear',
      gradient: 'linear-gradient(135deg, #c7f9cc 0%, #90dbf4 40%, #fbc4ab 100%)',
      pattern: createSunPattern('#f59e0b', '#22d3ee'),
    },
  ],
  'partly-cloudy': [
    {
      id: 'partly-soft',
      label: 'Soft Clouds',
      category: 'weather',
      weatherType: 'partly-cloudy',
      gradient: 'linear-gradient(135deg, #e2f3ff 0%, #d4e9ff 40%, #f7d6e0 100%)',
      pattern: createCloudPattern('#b3c7f9', '#fbcfe8'),
    },
    {
      id: 'partly-breeze',
      label: 'Breezy Day',
      category: 'weather',
      weatherType: 'partly-cloudy',
      gradient: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 45%, #fef3c7 100%)',
      pattern: createCloudPattern('#93c5fd', '#fcd34d'),
    },
    {
      id: 'partly-sweet',
      label: 'Cotton Candy',
      category: 'weather',
      weatherType: 'partly-cloudy',
      gradient: 'linear-gradient(135deg, #fce7f3 0%, #dbeafe 50%, #fde68a 100%)',
      pattern: createCloudPattern('#a5b4fc', '#f9a8d4'),
    },
    {
      id: 'partly-skyline',
      label: 'Skyline Breeze',
      category: 'weather',
      weatherType: 'partly-cloudy',
      gradient: 'linear-gradient(135deg, #dbeafe 0%, #c7d2fe 40%, #fed7aa 100%)',
      pattern: createCloudPattern('#93c5fd', '#fb7185'),
    },
    {
      id: 'partly-pastel',
      label: 'Pastel Puff',
      category: 'weather',
      weatherType: 'partly-cloudy',
      gradient: 'linear-gradient(135deg, #e9d5ff 0%, #bae6fd 50%, #fde68a 100%)',
      pattern: createCloudPattern('#c4b5fd', '#fcd34d'),
    },
  ],
  cloudy: [
    {
      id: 'cloudy-slate',
      label: 'Slate Clouds',
      category: 'weather',
      weatherType: 'cloudy',
      gradient: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5f5 45%, #f8fafc 100%)',
      pattern: createCloudPattern('#94a3b8', '#cbd5e1'),
    },
    {
      id: 'cloudy-lavender',
      label: 'Lavender Overcast',
      category: 'weather',
      weatherType: 'cloudy',
      gradient: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 40%, #e9d5ff 100%)',
      pattern: createCloudPattern('#94a3b8', '#c4b5fd'),
    },
    {
      id: 'cloudy-mint',
      label: 'Minty Overcast',
      category: 'weather',
      weatherType: 'cloudy',
      gradient: 'linear-gradient(135deg, #ecfeff 0%, #e2e8f0 45%, #f0f9ff 100%)',
      pattern: createCloudPattern('#94a3b8', '#7dd3fc'),
    },
    {
      id: 'cloudy-cocoa',
      label: 'Cocoa Clouds',
      category: 'weather',
      weatherType: 'cloudy',
      gradient: 'linear-gradient(135deg, #fef3c7 0%, #e2e8f0 45%, #fed7aa 100%)',
      pattern: createCloudPattern('#cbd5e1', '#f59e0b'),
    },
    {
      id: 'cloudy-bluebell',
      label: 'Bluebell Haze',
      category: 'weather',
      weatherType: 'cloudy',
      gradient: 'linear-gradient(135deg, #dbeafe 0%, #e2e8f0 45%, #f1f5f9 100%)',
      pattern: createCloudPattern('#94a3b8', '#60a5fa'),
    },
  ],
  fog: [
    {
      id: 'fog-soft',
      label: 'Soft Fog',
      category: 'weather',
      weatherType: 'fog',
      gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 45%, #e0f2fe 100%)',
      pattern: createFogPattern('#94a3b8', '#cbd5e1'),
    },
    {
      id: 'fog-mist',
      label: 'Morning Mist',
      category: 'weather',
      weatherType: 'fog',
      gradient: 'linear-gradient(135deg, #e0f2fe 0%, #e2e8f0 45%, #f1f5f9 100%)',
      pattern: createFogPattern('#94a3b8', '#bae6fd'),
    },
    {
      id: 'fog-quiet',
      label: 'Quiet Haze',
      category: 'weather',
      weatherType: 'fog',
      gradient: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #e9d5ff 100%)',
      pattern: createFogPattern('#a1a1aa', '#c4b5fd'),
    },
    {
      id: 'fog-seafoam',
      label: 'Seafoam Mist',
      category: 'weather',
      weatherType: 'fog',
      gradient: 'linear-gradient(135deg, #ecfeff 0%, #e2e8f0 45%, #fef3c7 100%)',
      pattern: createFogPattern('#94a3b8', '#67e8f9'),
    },
    {
      id: 'fog-peach',
      label: 'Peach Fog',
      category: 'weather',
      weatherType: 'fog',
      gradient: 'linear-gradient(135deg, #ffe4e6 0%, #e2e8f0 45%, #fef9c3 100%)',
      pattern: createFogPattern('#94a3b8', '#fda4af'),
    },
  ],
  drizzle: [
    {
      id: 'drizzle-sprinkle',
      label: 'Sprinkle Showers',
      category: 'weather',
      weatherType: 'drizzle',
      gradient: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 45%, #fef3c7 100%)',
      pattern: createDrizzlePattern('#60a5fa', '#38bdf8'),
    },
    {
      id: 'drizzle-garden',
      label: 'Garden Drizzle',
      category: 'weather',
      weatherType: 'drizzle',
      gradient: 'linear-gradient(135deg, #dcfce7 0%, #bae6fd 45%, #fef9c3 100%)',
      pattern: createDrizzlePattern('#34d399', '#60a5fa'),
    },
    {
      id: 'drizzle-dawn',
      label: 'Dawn Drizzle',
      category: 'weather',
      weatherType: 'drizzle',
      gradient: 'linear-gradient(135deg, #fce7f3 0%, #bae6fd 45%, #dbeafe 100%)',
      pattern: createDrizzlePattern('#f472b6', '#60a5fa'),
    },
    {
      id: 'drizzle-sky',
      label: 'Sky Drizzle',
      category: 'weather',
      weatherType: 'drizzle',
      gradient: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 40%, #e9d5ff 100%)',
      pattern: createDrizzlePattern('#60a5fa', '#a78bfa'),
    },
    {
      id: 'drizzle-puddle',
      label: 'Puddle Play',
      category: 'weather',
      weatherType: 'drizzle',
      gradient: 'linear-gradient(135deg, #cffafe 0%, #bae6fd 45%, #fee2e2 100%)',
      pattern: createDrizzlePattern('#38bdf8', '#fb7185'),
    },
  ],
  rain: [
    {
      id: 'rain-umbrella',
      label: 'Umbrella Parade',
      category: 'weather',
      weatherType: 'rain',
      gradient: 'linear-gradient(135deg, #bae6fd 0%, #93c5fd 45%, #f1f5f9 100%)',
      pattern: createRainPattern('#3b82f6', '#60a5fa'),
    },
    {
      id: 'rain-midnight',
      label: 'Midnight Rain',
      category: 'weather',
      weatherType: 'rain',
      gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #93c5fd 100%)',
      pattern: createRainPattern('#93c5fd', '#bfdbfe'),
    },
    {
      id: 'rain-slate',
      label: 'Slate Rain',
      category: 'weather',
      weatherType: 'rain',
      gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 45%, #e2e8f0 100%)',
      pattern: createRainPattern('#e2e8f0', '#94a3b8'),
    },
    {
      id: 'rain-berry',
      label: 'Berry Storm',
      category: 'weather',
      weatherType: 'rain',
      gradient: 'linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 40%, #fbcfe8 100%)',
      pattern: createRainPattern('#6366f1', '#f472b6'),
    },
    {
      id: 'rain-sea',
      label: 'Sea Rain',
      category: 'weather',
      weatherType: 'rain',
      gradient: 'linear-gradient(135deg, #bae6fd 0%, #7dd3fc 40%, #f0f9ff 100%)',
      pattern: createRainPattern('#0ea5e9', '#38bdf8'),
    },
  ],
  snow: [
    {
      id: 'snow-day',
      label: 'Snow Day',
      category: 'weather',
      weatherType: 'snow',
      gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 45%, #bfdbfe 100%)',
      pattern: createSnowPattern('#93c5fd', '#e2e8f0'),
    },
    {
      id: 'snowberry',
      label: 'Snowberry',
      category: 'weather',
      weatherType: 'snow',
      gradient: 'linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 45%, #dbeafe 100%)',
      pattern: createSnowPattern('#a5b4fc', '#c7d2fe'),
    },
    {
      id: 'snowy-mint',
      label: 'Snowy Mint',
      category: 'weather',
      weatherType: 'snow',
      gradient: 'linear-gradient(135deg, #ecfeff 0%, #e2e8f0 45%, #e0f2fe 100%)',
      pattern: createSnowPattern('#7dd3fc', '#bae6fd'),
    },
    {
      id: 'snow-lilac',
      label: 'Lilac Snow',
      category: 'weather',
      weatherType: 'snow',
      gradient: 'linear-gradient(135deg, #ede9fe 0%, #e2e8f0 45%, #fdf2f8 100%)',
      pattern: createSnowPattern('#c4b5fd', '#fbcfe8'),
    },
    {
      id: 'snow-hush',
      label: 'Hushed Snow',
      category: 'weather',
      weatherType: 'snow',
      gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 45%, #f1f5f9 100%)',
      pattern: createSnowPattern('#cbd5f5', '#e2e8f0'),
    },
  ],
  thunder: [
    {
      id: 'thunder-punch',
      label: 'Thunder Punch',
      category: 'weather',
      weatherType: 'thunder',
      gradient: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 45%, #9333ea 100%)',
      pattern: createThunderPattern('#fbbf24', '#facc15'),
    },
    {
      id: 'thunder-glow',
      label: 'Electric Glow',
      category: 'weather',
      weatherType: 'thunder',
      gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 45%, #0ea5e9 100%)',
      pattern: createThunderPattern('#f59e0b', '#38bdf8'),
    },
    {
      id: 'thunder-violet',
      label: 'Violet Storm',
      category: 'weather',
      weatherType: 'thunder',
      gradient: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 45%, #7c3aed 100%)',
      pattern: createThunderPattern('#fde047', '#fbbf24'),
    },
    {
      id: 'thunder-spark',
      label: 'Spark Storm',
      category: 'weather',
      weatherType: 'thunder',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1f2937 45%, #334155 100%)',
      pattern: createThunderPattern('#facc15', '#f97316'),
    },
    {
      id: 'thunder-neon',
      label: 'Neon Storm',
      category: 'weather',
      weatherType: 'thunder',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 45%, #2563eb 100%)',
      pattern: createThunderPattern('#fde047', '#22d3ee'),
    },
  ],
}

const nonWeatherWallpapers: WallpaperDefinition[] = [
  {
    id: 'confetti-party',
    label: 'Confetti Party',
    category: 'non-weather',
    gradient: 'linear-gradient(135deg, #fde68a 0%, #fbcfe8 45%, #bae6fd 100%)',
    pattern: createConfettiPattern('#f97316', '#6366f1'),
  },
  {
    id: 'starry-night',
    label: 'Starry Night',
    category: 'non-weather',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)',
    pattern: createStarPattern('#facc15', '#60a5fa'),
  },
  {
    id: 'leafy-play',
    label: 'Leafy Play',
    category: 'non-weather',
    gradient: 'linear-gradient(135deg, #bbf7d0 0%, #86efac 45%, #fef08a 100%)',
    pattern: createLeafPattern('#22c55e', '#facc15'),
  },
  {
    id: 'bubble-breeze',
    label: 'Bubble Breeze',
    category: 'non-weather',
    gradient: 'linear-gradient(135deg, #cffafe 0%, #bae6fd 45%, #f0f9ff 100%)',
    pattern: createBubblePattern('#38bdf8', '#7dd3fc'),
  },
  {
    id: 'hearts-happy',
    label: 'Happy Hearts',
    category: 'non-weather',
    gradient: 'linear-gradient(135deg, #fbcfe8 0%, #fecdd3 45%, #fef3c7 100%)',
    pattern: createHeartPattern('#fb7185', '#fda4af'),
  },
  {
    id: 'candy-crush',
    label: 'Candy Clouds',
    category: 'non-weather',
    gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 45%, #fbcfe8 100%)',
    pattern: createCandyPattern('#f97316', '#f472b6'),
  },
  {
    id: 'dreamy-dusk',
    label: 'Dreamy Dusk',
    category: 'non-weather',
    gradient: 'linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 45%, #fbcfe8 100%)',
    pattern: createStarPattern('#a855f7', '#f472b6'),
  },
  {
    id: 'playful-mosaic',
    label: 'Playful Mosaic',
    category: 'non-weather',
    gradient: 'linear-gradient(135deg, #fde68a 0%, #a7f3d0 45%, #bfdbfe 100%)',
    pattern: createConfettiPattern('#10b981', '#3b82f6'),
  },
  {
    id: 'ocean-explorers',
    label: 'Ocean Explorers',
    category: 'non-weather',
    gradient: 'linear-gradient(135deg, #bae6fd 0%, #7dd3fc 45%, #bbf7d0 100%)',
    pattern: createOceanPattern('#0ea5e9', '#22c55e'),
  },
  {
    id: 'beach-day',
    label: 'Beach Day',
    category: 'non-weather',
    gradient: 'linear-gradient(135deg, #fde68a 0%, #fdba74 45%, #93c5fd 100%)',
    pattern: createBeachPattern('#f97316', '#38bdf8'),
  },
  {
    id: 'forest-friends',
    label: 'Forest Friends',
    category: 'non-weather',
    gradient: 'linear-gradient(135deg, #bbf7d0 0%, #86efac 45%, #fef3c7 100%)',
    pattern: createForestPattern('#22c55e', '#f59e0b'),
  },
  {
    id: 'meadow-critters',
    label: 'Meadow Critters',
    category: 'non-weather',
    gradient: 'linear-gradient(135deg, #fbcfe8 0%, #c7d2fe 45%, #bbf7d0 100%)',
    pattern: createMeadowCrittersPattern('#ec4899', '#8b5cf6'),
  },
  {
    id: 'sky-friends',
    label: 'Sky Friends',
    category: 'non-weather',
    gradient: 'linear-gradient(135deg, #dbeafe 0%, #bae6fd 45%, #fef3c7 100%)',
    pattern: createSkyFriendsPattern('#60a5fa', '#facc15'),
  },
]

const flattenWeatherWallpapers = () => Object.values(weatherWallpaperSets).flat()

export const getWeatherWallpaperType = (conditionCode: number | undefined | null): WeatherWallpaperType | null => {
  if (conditionCode === null || conditionCode === undefined) return null
  if (conditionCode === 0) return 'clear'
  if (conditionCode === 1 || conditionCode === 2) return 'partly-cloudy'
  if (conditionCode === 3) return 'cloudy'
  if (conditionCode >= 45 && conditionCode <= 48) return 'fog'
  if (conditionCode >= 51 && conditionCode <= 57) return 'drizzle'
  if ((conditionCode >= 61 && conditionCode <= 67) || (conditionCode >= 80 && conditionCode <= 82)) return 'rain'
  if ((conditionCode >= 71 && conditionCode <= 77) || (conditionCode >= 85 && conditionCode <= 86)) return 'snow'
  if (conditionCode >= 95 && conditionCode <= 99) return 'thunder'
  return 'clear'
}

const pickBySeed = <T,>(items: T[], seed: number) => {
  if (items.length === 0) return null
  const index = Math.abs(seed) % items.length
  return items[index]
}

const hashSeed = (value: string) =>
  value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

const buildWallpaperStyle = (wallpaper: WallpaperDefinition, animationsEnabled: boolean): CSSProperties => {
  const accentLayer = wallpaper.accentPattern ? `, url("${wallpaper.accentPattern}")` : ''
  const accentSize = wallpaper.accentSize ? `, ${wallpaper.accentSize}` : ''
  const basePatternSize = wallpaper.patternSize || '260px 260px'

  const style: CSSProperties = {
    backgroundImage: `${wallpaper.gradient}, url("${wallpaper.pattern}")${accentLayer}`,
    backgroundSize: `cover, ${basePatternSize}${accentSize}`,
    backgroundRepeat: `no-repeat, repeat${accentLayer ? ', repeat' : ''}`,
  }

  // Only set backgroundPosition inline if animations are disabled
  // When animations are enabled, let the CSS animation control the position
  if (!animationsEnabled) {
    style.backgroundPosition = `center, 0 0${accentLayer ? ', 40px 20px' : ''}`
  }

  return style
}

export const getWallpaperSelection = ({
  settings,
  deviceMode,
  weather,
  seedKey,
}: {
  settings: WallpaperSettings
  deviceMode: WallpaperMode
  weather: WeatherData | null
  seedKey: string
}): WallpaperSelection | null => {
  if (!settings.enabled) return null

  const weatherType = getWeatherWallpaperType(weather?.conditionCode ?? null)
  const weatherWallpapers = weatherType ? weatherWallpaperSets[weatherType] : []
  const weatherAllowed = settings.weatherWallpapersEnabled && weatherWallpapers.length > 0
  const nonWeatherAllowed = settings.nonWeatherWallpapersEnabled

  let candidates: WallpaperDefinition[] = []

  if (deviceMode === 'weather' && weatherAllowed) {
    candidates = weatherWallpapers
  } else if (deviceMode === 'non-weather' && nonWeatherAllowed) {
    candidates = nonWeatherWallpapers
  } else if (weatherAllowed) {
    candidates = weatherWallpapers
  } else if (nonWeatherAllowed) {
    candidates = nonWeatherWallpapers
  }

  if (candidates.length === 0) return null

  const seed = hashSeed(`${seedKey}-${deviceMode}-${weatherType ?? 'none'}`)
  const wallpaper = pickBySeed(candidates, seed)
  if (!wallpaper) return null

  return {
    id: wallpaper.id,
    label: wallpaper.label,
    category: wallpaper.category,
    style: buildWallpaperStyle(wallpaper, settings.animationsEnabled),
  }
}

export const getDefaultWallpaperMode = (settings: WallpaperSettings) => settings.defaultMode

export const getDeviceWallpaperMode = ({
  settings,
  deviceMode,
}: {
  settings: WallpaperSettings
  deviceMode?: WallpaperMode
}): WallpaperMode => deviceMode ?? settings.defaultMode

export const weatherWallpaperCountByType = Object.fromEntries(
  Object.entries(weatherWallpaperSets).map(([key, value]) => [key, value.length])
) as Record<WeatherWallpaperType, number>

export const nonWeatherWallpaperCount = nonWeatherWallpapers.length

export const allWeatherWallpapers = flattenWeatherWallpapers()

export const allNonWeatherWallpapers = nonWeatherWallpapers
