import { useEffect, useState } from 'react'
import { WeatherData, WeatherSettings } from '@/lib/types'
import { fetchWeatherData, getTemperatureFeeling, getWeatherEmoji } from '@/lib/weatherHelper'
import { Card } from '@/components/ui/card'

interface WeatherDisplayProps {
  settings: WeatherSettings
}

export function WeatherDisplay({ settings }: WeatherDisplayProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!settings.enabled || !settings.latitude || !settings.longitude) {
      setLoading(false)
      return
    }

    const loadWeather = async () => {
      setLoading(true)
      
      const effectiveUnit = settings.temperatureUnit === 'auto' 
        ? (settings.autoDetectedUnit || 'fahrenheit')
        : settings.temperatureUnit
      
      const data = await fetchWeatherData(settings.latitude!, settings.longitude!, effectiveUnit)
      setWeather(data)
      setLoading(false)
    }

    loadWeather()
    const interval = setInterval(loadWeather, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [settings.enabled, settings.latitude, settings.longitude, settings.temperatureUnit, settings.autoDetectedUnit])

  if (!settings.enabled || !weather) {
    return null
  }

  if (loading) {
    return (
      <Card className="w-full h-full p-3 bg-gradient-to-br from-sky-50 to-blue-50">
        <div className="text-center text-sm text-muted-foreground">
          Loading weather...
        </div>
      </Card>
    )
  }

  const tempFeeling = getTemperatureFeeling(weather.temperature, weather.unit)
  const weatherEmoji = getWeatherEmoji(weather.conditionCode)
  const unitSymbol = weather.unit === 'celsius' ? 'C' : 'F'

  return (
    <Card className="w-full h-full p-4 bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{weatherEmoji}</div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              {weather.condition}
            </div>
            <div className="text-2xl font-bold">
              {weather.temperature}°{unitSymbol}
            </div>
          </div>
        </div>
        <div className="text-center">
          <div className={`text-3xl mb-1`}>
            {tempFeeling.emoji}
          </div>
          <div className={`text-sm font-bold ${tempFeeling.color}`}>
            {tempFeeling.label}
          </div>
        </div>
      </div>
    </Card>
  )
}
