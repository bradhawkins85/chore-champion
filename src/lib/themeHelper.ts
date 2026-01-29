import { WeatherData } from './types'

export interface SeasonalTheme {
  name: string
  colors: {
    background: string
    foreground: string
    card: string
    cardForeground: string
    popover: string
    popoverForeground: string
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    accent: string
    accentForeground: string
    destructive: string
    destructiveForeground: string
    muted: string
    mutedForeground: string
    border: string
    input: string
    ring: string
  }
}

export function getSeasonalTheme(weatherData: WeatherData | null): SeasonalTheme {
  if (!weatherData) {
    return getDefaultTheme()
  }

  const { conditionCode, temperature, unit } = weatherData
  const tempF = unit === 'celsius' ? (temperature * 9/5) + 32 : temperature

  if (conditionCode >= 71 && conditionCode <= 86) {
    return getSnowTheme()
  }

  if (conditionCode >= 95 && conditionCode <= 99) {
    return getStormyTheme()
  }

  if (conditionCode >= 61 && conditionCode <= 67) {
    return getRainyTheme()
  }

  if (conditionCode >= 51 && conditionCode <= 57) {
    return getDrizzleTheme()
  }

  if (conditionCode >= 45 && conditionCode <= 48) {
    return getFoggyTheme()
  }

  if (conditionCode === 3) {
    return getCloudyTheme()
  }

  if (conditionCode === 2) {
    return getPartlyCloudyTheme()
  }

  if (tempF >= 95) {
    return getExtraHotTheme()
  }

  if (tempF >= 85) {
    return getHotTheme()
  }

  if (tempF >= 75) {
    return getWarmTheme()
  }

  if (tempF >= 60) {
    return getNiceTheme()
  }

  if (tempF <= 32) {
    return getFreezingTheme()
  }

  if (tempF <= 45) {
    return getColdTheme()
  }

  return getCoolTheme()
}

function getDefaultTheme(): SeasonalTheme {
  return {
    name: 'Default',
    colors: {
      background: 'oklch(0.98 0.01 180)',
      foreground: 'oklch(0.15 0.02 240)',
      card: 'oklch(0.99 0.005 180)',
      cardForeground: 'oklch(0.15 0.02 240)',
      popover: 'oklch(1.00 0 0)',
      popoverForeground: 'oklch(0.15 0.02 240)',
      primary: 'oklch(0.65 0.20 160)',
      primaryForeground: 'oklch(0.98 0.01 180)',
      secondary: 'oklch(0.92 0.08 200)',
      secondaryForeground: 'oklch(0.20 0.05 240)',
      accent: 'oklch(0.75 0.15 280)',
      accentForeground: 'oklch(0.15 0.02 240)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.01 180)',
      muted: 'oklch(0.94 0.02 180)',
      mutedForeground: 'oklch(0.45 0.02 240)',
      border: 'oklch(0.88 0.02 180)',
      input: 'oklch(0.88 0.02 180)',
      ring: 'oklch(0.65 0.20 160)',
    },
  }
}

function getSnowTheme(): SeasonalTheme {
  return {
    name: 'Snowy',
    colors: {
      background: 'oklch(0.98 0.01 240)',
      foreground: 'oklch(0.20 0.05 240)',
      card: 'oklch(0.99 0.01 240)',
      cardForeground: 'oklch(0.20 0.05 240)',
      popover: 'oklch(1.00 0 0)',
      popoverForeground: 'oklch(0.20 0.05 240)',
      primary: 'oklch(0.55 0.18 250)',
      primaryForeground: 'oklch(0.98 0.01 240)',
      secondary: 'oklch(0.90 0.05 240)',
      secondaryForeground: 'oklch(0.25 0.05 240)',
      accent: 'oklch(0.70 0.12 220)',
      accentForeground: 'oklch(0.98 0.01 240)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.01 240)',
      muted: 'oklch(0.93 0.03 240)',
      mutedForeground: 'oklch(0.50 0.05 240)',
      border: 'oklch(0.87 0.03 240)',
      input: 'oklch(0.87 0.03 240)',
      ring: 'oklch(0.55 0.18 250)',
    },
  }
}

function getStormyTheme(): SeasonalTheme {
  return {
    name: 'Stormy',
    colors: {
      background: 'oklch(0.25 0.03 260)',
      foreground: 'oklch(0.95 0.02 200)',
      card: 'oklch(0.30 0.04 260)',
      cardForeground: 'oklch(0.95 0.02 200)',
      popover: 'oklch(0.28 0.03 260)',
      popoverForeground: 'oklch(0.95 0.02 200)',
      primary: 'oklch(0.65 0.15 280)',
      primaryForeground: 'oklch(0.98 0.01 180)',
      secondary: 'oklch(0.35 0.05 260)',
      secondaryForeground: 'oklch(0.95 0.02 200)',
      accent: 'oklch(0.75 0.20 60)',
      accentForeground: 'oklch(0.20 0.02 260)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.01 180)',
      muted: 'oklch(0.35 0.04 260)',
      mutedForeground: 'oklch(0.70 0.03 200)',
      border: 'oklch(0.40 0.05 260)',
      input: 'oklch(0.40 0.05 260)',
      ring: 'oklch(0.65 0.15 280)',
    },
  }
}

function getRainyTheme(): SeasonalTheme {
  return {
    name: 'Rainy',
    colors: {
      background: 'oklch(0.92 0.02 220)',
      foreground: 'oklch(0.25 0.05 240)',
      card: 'oklch(0.95 0.02 220)',
      cardForeground: 'oklch(0.25 0.05 240)',
      popover: 'oklch(0.97 0.01 220)',
      popoverForeground: 'oklch(0.25 0.05 240)',
      primary: 'oklch(0.50 0.18 230)',
      primaryForeground: 'oklch(0.98 0.01 220)',
      secondary: 'oklch(0.85 0.06 220)',
      secondaryForeground: 'oklch(0.30 0.05 240)',
      accent: 'oklch(0.65 0.15 200)',
      accentForeground: 'oklch(0.98 0.01 220)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.01 220)',
      muted: 'oklch(0.88 0.03 220)',
      mutedForeground: 'oklch(0.50 0.05 240)',
      border: 'oklch(0.82 0.04 220)',
      input: 'oklch(0.82 0.04 220)',
      ring: 'oklch(0.50 0.18 230)',
    },
  }
}

function getDrizzleTheme(): SeasonalTheme {
  return {
    name: 'Drizzle',
    colors: {
      background: 'oklch(0.94 0.02 210)',
      foreground: 'oklch(0.22 0.04 230)',
      card: 'oklch(0.96 0.01 210)',
      cardForeground: 'oklch(0.22 0.04 230)',
      popover: 'oklch(0.98 0.01 210)',
      popoverForeground: 'oklch(0.22 0.04 230)',
      primary: 'oklch(0.55 0.16 220)',
      primaryForeground: 'oklch(0.98 0.01 210)',
      secondary: 'oklch(0.88 0.05 210)',
      secondaryForeground: 'oklch(0.28 0.04 230)',
      accent: 'oklch(0.68 0.14 200)',
      accentForeground: 'oklch(0.98 0.01 210)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.01 210)',
      muted: 'oklch(0.90 0.03 210)',
      mutedForeground: 'oklch(0.48 0.04 230)',
      border: 'oklch(0.85 0.03 210)',
      input: 'oklch(0.85 0.03 210)',
      ring: 'oklch(0.55 0.16 220)',
    },
  }
}

function getFoggyTheme(): SeasonalTheme {
  return {
    name: 'Foggy',
    colors: {
      background: 'oklch(0.90 0.01 200)',
      foreground: 'oklch(0.30 0.03 220)',
      card: 'oklch(0.93 0.01 200)',
      cardForeground: 'oklch(0.30 0.03 220)',
      popover: 'oklch(0.95 0.01 200)',
      popoverForeground: 'oklch(0.30 0.03 220)',
      primary: 'oklch(0.50 0.10 210)',
      primaryForeground: 'oklch(0.98 0.01 200)',
      secondary: 'oklch(0.82 0.03 200)',
      secondaryForeground: 'oklch(0.35 0.03 220)',
      accent: 'oklch(0.65 0.08 200)',
      accentForeground: 'oklch(0.98 0.01 200)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.01 200)',
      muted: 'oklch(0.86 0.02 200)',
      mutedForeground: 'oklch(0.48 0.03 220)',
      border: 'oklch(0.80 0.02 200)',
      input: 'oklch(0.80 0.02 200)',
      ring: 'oklch(0.50 0.10 210)',
    },
  }
}

function getCloudyTheme(): SeasonalTheme {
  return {
    name: 'Cloudy',
    colors: {
      background: 'oklch(0.93 0.02 200)',
      foreground: 'oklch(0.25 0.04 230)',
      card: 'oklch(0.95 0.01 200)',
      cardForeground: 'oklch(0.25 0.04 230)',
      popover: 'oklch(0.97 0.01 200)',
      popoverForeground: 'oklch(0.25 0.04 230)',
      primary: 'oklch(0.55 0.14 210)',
      primaryForeground: 'oklch(0.98 0.01 200)',
      secondary: 'oklch(0.86 0.04 200)',
      secondaryForeground: 'oklch(0.30 0.04 230)',
      accent: 'oklch(0.68 0.12 190)',
      accentForeground: 'oklch(0.98 0.01 200)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.01 200)',
      muted: 'oklch(0.89 0.02 200)',
      mutedForeground: 'oklch(0.48 0.04 230)',
      border: 'oklch(0.83 0.03 200)',
      input: 'oklch(0.83 0.03 200)',
      ring: 'oklch(0.55 0.14 210)',
    },
  }
}

function getPartlyCloudyTheme(): SeasonalTheme {
  return {
    name: 'Partly Cloudy',
    colors: {
      background: 'oklch(0.96 0.02 190)',
      foreground: 'oklch(0.20 0.04 230)',
      card: 'oklch(0.97 0.01 190)',
      cardForeground: 'oklch(0.20 0.04 230)',
      popover: 'oklch(0.99 0.01 190)',
      popoverForeground: 'oklch(0.20 0.04 230)',
      primary: 'oklch(0.60 0.16 200)',
      primaryForeground: 'oklch(0.98 0.01 190)',
      secondary: 'oklch(0.90 0.06 190)',
      secondaryForeground: 'oklch(0.25 0.04 230)',
      accent: 'oklch(0.72 0.14 180)',
      accentForeground: 'oklch(0.98 0.01 190)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.01 190)',
      muted: 'oklch(0.92 0.03 190)',
      mutedForeground: 'oklch(0.46 0.04 230)',
      border: 'oklch(0.86 0.03 190)',
      input: 'oklch(0.86 0.03 190)',
      ring: 'oklch(0.60 0.16 200)',
    },
  }
}

function getExtraHotTheme(): SeasonalTheme {
  return {
    name: 'Extra Hot',
    colors: {
      background: 'oklch(0.98 0.03 40)',
      foreground: 'oklch(0.20 0.05 10)',
      card: 'oklch(0.99 0.02 40)',
      cardForeground: 'oklch(0.20 0.05 10)',
      popover: 'oklch(1.00 0.01 40)',
      popoverForeground: 'oklch(0.20 0.05 10)',
      primary: 'oklch(0.60 0.24 30)',
      primaryForeground: 'oklch(0.98 0.02 40)',
      secondary: 'oklch(0.92 0.10 35)',
      secondaryForeground: 'oklch(0.25 0.05 10)',
      accent: 'oklch(0.70 0.22 45)',
      accentForeground: 'oklch(0.98 0.02 40)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.02 40)',
      muted: 'oklch(0.94 0.04 40)',
      mutedForeground: 'oklch(0.48 0.05 10)',
      border: 'oklch(0.88 0.05 40)',
      input: 'oklch(0.88 0.05 40)',
      ring: 'oklch(0.60 0.24 30)',
    },
  }
}

function getHotTheme(): SeasonalTheme {
  return {
    name: 'Hot',
    colors: {
      background: 'oklch(0.98 0.02 50)',
      foreground: 'oklch(0.18 0.04 20)',
      card: 'oklch(0.99 0.02 50)',
      cardForeground: 'oklch(0.18 0.04 20)',
      popover: 'oklch(1.00 0.01 50)',
      popoverForeground: 'oklch(0.18 0.04 20)',
      primary: 'oklch(0.62 0.22 40)',
      primaryForeground: 'oklch(0.98 0.02 50)',
      secondary: 'oklch(0.92 0.08 45)',
      secondaryForeground: 'oklch(0.23 0.04 20)',
      accent: 'oklch(0.72 0.20 55)',
      accentForeground: 'oklch(0.98 0.02 50)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.02 50)',
      muted: 'oklch(0.94 0.03 50)',
      mutedForeground: 'oklch(0.46 0.04 20)',
      border: 'oklch(0.88 0.04 50)',
      input: 'oklch(0.88 0.04 50)',
      ring: 'oklch(0.62 0.22 40)',
    },
  }
}

function getWarmTheme(): SeasonalTheme {
  return {
    name: 'Warm',
    colors: {
      background: 'oklch(0.98 0.02 70)',
      foreground: 'oklch(0.18 0.04 30)',
      card: 'oklch(0.99 0.01 70)',
      cardForeground: 'oklch(0.18 0.04 30)',
      popover: 'oklch(1.00 0.01 70)',
      popoverForeground: 'oklch(0.18 0.04 30)',
      primary: 'oklch(0.65 0.20 60)',
      primaryForeground: 'oklch(0.98 0.02 70)',
      secondary: 'oklch(0.92 0.08 65)',
      secondaryForeground: 'oklch(0.22 0.04 30)',
      accent: 'oklch(0.74 0.18 75)',
      accentForeground: 'oklch(0.98 0.02 70)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.02 70)',
      muted: 'oklch(0.94 0.03 70)',
      mutedForeground: 'oklch(0.45 0.04 30)',
      border: 'oklch(0.88 0.03 70)',
      input: 'oklch(0.88 0.03 70)',
      ring: 'oklch(0.65 0.20 60)',
    },
  }
}

function getNiceTheme(): SeasonalTheme {
  return {
    name: 'Nice',
    colors: {
      background: 'oklch(0.98 0.02 140)',
      foreground: 'oklch(0.16 0.03 180)',
      card: 'oklch(0.99 0.01 140)',
      cardForeground: 'oklch(0.16 0.03 180)',
      popover: 'oklch(1.00 0.01 140)',
      popoverForeground: 'oklch(0.16 0.03 180)',
      primary: 'oklch(0.65 0.20 150)',
      primaryForeground: 'oklch(0.98 0.02 140)',
      secondary: 'oklch(0.92 0.08 145)',
      secondaryForeground: 'oklch(0.20 0.03 180)',
      accent: 'oklch(0.75 0.18 135)',
      accentForeground: 'oklch(0.98 0.02 140)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.02 140)',
      muted: 'oklch(0.94 0.02 140)',
      mutedForeground: 'oklch(0.45 0.03 180)',
      border: 'oklch(0.88 0.03 140)',
      input: 'oklch(0.88 0.03 140)',
      ring: 'oklch(0.65 0.20 150)',
    },
  }
}

function getCoolTheme(): SeasonalTheme {
  return {
    name: 'Cool',
    colors: {
      background: 'oklch(0.97 0.02 190)',
      foreground: 'oklch(0.18 0.04 220)',
      card: 'oklch(0.98 0.01 190)',
      cardForeground: 'oklch(0.18 0.04 220)',
      popover: 'oklch(1.00 0.01 190)',
      popoverForeground: 'oklch(0.18 0.04 220)',
      primary: 'oklch(0.62 0.18 200)',
      primaryForeground: 'oklch(0.98 0.02 190)',
      secondary: 'oklch(0.90 0.07 195)',
      secondaryForeground: 'oklch(0.22 0.04 220)',
      accent: 'oklch(0.72 0.16 185)',
      accentForeground: 'oklch(0.98 0.02 190)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.02 190)',
      muted: 'oklch(0.93 0.03 190)',
      mutedForeground: 'oklch(0.46 0.04 220)',
      border: 'oklch(0.87 0.03 190)',
      input: 'oklch(0.87 0.03 190)',
      ring: 'oklch(0.62 0.18 200)',
    },
  }
}

function getColdTheme(): SeasonalTheme {
  return {
    name: 'Cold',
    colors: {
      background: 'oklch(0.96 0.02 230)',
      foreground: 'oklch(0.20 0.05 240)',
      card: 'oklch(0.97 0.01 230)',
      cardForeground: 'oklch(0.20 0.05 240)',
      popover: 'oklch(0.99 0.01 230)',
      popoverForeground: 'oklch(0.20 0.05 240)',
      primary: 'oklch(0.58 0.18 240)',
      primaryForeground: 'oklch(0.98 0.02 230)',
      secondary: 'oklch(0.88 0.06 235)',
      secondaryForeground: 'oklch(0.24 0.05 240)',
      accent: 'oklch(0.70 0.15 225)',
      accentForeground: 'oklch(0.98 0.02 230)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.02 230)',
      muted: 'oklch(0.92 0.03 230)',
      mutedForeground: 'oklch(0.48 0.05 240)',
      border: 'oklch(0.86 0.03 230)',
      input: 'oklch(0.86 0.03 230)',
      ring: 'oklch(0.58 0.18 240)',
    },
  }
}

function getFreezingTheme(): SeasonalTheme {
  return {
    name: 'Freezing',
    colors: {
      background: 'oklch(0.95 0.03 250)',
      foreground: 'oklch(0.22 0.06 250)',
      card: 'oklch(0.97 0.02 250)',
      cardForeground: 'oklch(0.22 0.06 250)',
      popover: 'oklch(0.98 0.01 250)',
      popoverForeground: 'oklch(0.22 0.06 250)',
      primary: 'oklch(0.54 0.20 255)',
      primaryForeground: 'oklch(0.98 0.02 250)',
      secondary: 'oklch(0.86 0.07 250)',
      secondaryForeground: 'oklch(0.26 0.06 250)',
      accent: 'oklch(0.68 0.16 240)',
      accentForeground: 'oklch(0.98 0.02 250)',
      destructive: 'oklch(0.65 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.02 250)',
      muted: 'oklch(0.91 0.04 250)',
      mutedForeground: 'oklch(0.50 0.06 250)',
      border: 'oklch(0.85 0.04 250)',
      input: 'oklch(0.85 0.04 250)',
      ring: 'oklch(0.54 0.20 255)',
    },
  }
}

export function applyThemeToDOM(theme: SeasonalTheme) {
  const root = document.documentElement
  
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVarName = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    root.style.setProperty(`--${cssVarName}`, value)
  })
}
