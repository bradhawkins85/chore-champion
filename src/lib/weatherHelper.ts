import { WeatherData, TemperatureUnit } from './types'

export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  unit: 'celsius' | 'fahrenheit' = 'fahrenheit'
): Promise<WeatherData | null> {
  try {
    const response = await fetch(
      `/api/weather/forecast?latitude=${latitude}&longitude=${longitude}&unit=${unit}`
    )
    
    if (!response.ok) {
      console.error('Weather API error:', response.statusText)
      return null
    }
    
    const data = await response.json()
    
    const weatherCode = data.current.weather_code
    const condition = getWeatherCondition(weatherCode)
    
    return {
      temperature: Math.round(data.current.temperature_2m),
      condition,
      conditionCode: weatherCode,
      feels_like: Math.round(data.current.temperature_2m),
      humidity: data.current.relative_humidity_2m,
      description: condition,
      unit,
    }
  } catch (error) {
    console.error('Failed to fetch weather:', error)
    return null
  }
}

export async function geocodeLocation(locationName: string): Promise<{
  latitude: number
  longitude: number
  displayName: string
  country: string
} | null> {
  try {
    const response = await fetch(
      `/api/weather/geocode?name=${encodeURIComponent(locationName)}`
    )
    
    if (!response.ok) {
      console.error('Geocoding API error:', response.statusText)
      return null
    }
    
    const data = await response.json()
    
    if (!data.results || data.results.length === 0) {
      return null
    }
    
    const result = data.results[0]
    return {
      latitude: result.latitude,
      longitude: result.longitude,
      displayName: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`,
      country: result.country || '',
    }
  } catch (error) {
    console.error('Failed to geocode location:', error)
    return null
  }
}

export async function getCurrentLocation(): Promise<{
  latitude: number
  longitude: number
  displayName: string
  country: string
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser')
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        // Reverse geocode to get location name
        try {
          const response = await fetch(
            `/api/weather/reverse-geocode?latitude=${latitude}&longitude=${longitude}`
          )
          
          if (!response.ok) {
            console.error('Reverse geocoding API error:', response.statusText)
            resolve(null)
            return
          }
          
          const data = await response.json()
          
          if (!data.results || data.results.length === 0) {
            resolve(null)
            return
          }
          
          const result = data.results[0]
          resolve({
            latitude,
            longitude,
            displayName: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`,
            country: result.country || '',
          })
        } catch (error) {
          console.error('Failed to reverse geocode location:', error)
          resolve(null)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        resolve(null)
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    )
  })
}

export function detectTemperatureUnit(countryCode: string): 'celsius' | 'fahrenheit' {
  const fahrenheitCountries = ['US', 'USA', 'United States', 'LR', 'Liberia', 'MM', 'Myanmar', 'Burma']
  
  const normalized = countryCode.toUpperCase().trim()
  return fahrenheitCountries.some(code => normalized.includes(code.toUpperCase())) 
    ? 'fahrenheit' 
    : 'celsius'
}

function getWeatherCondition(code: number): string {
  if (code === 0) return 'Clear'
  if (code === 1) return 'Mostly Clear'
  if (code === 2) return 'Partly Cloudy'
  if (code === 3) return 'Cloudy'
  if (code === 45 || code === 48) return 'Foggy'
  if (code === 51 || code === 53 || code === 55) return 'Drizzle'
  if (code === 56 || code === 57) return 'Freezing Drizzle'
  if (code === 61 || code === 63 || code === 65) return 'Rain'
  if (code === 66 || code === 67) return 'Freezing Rain'
  if (code === 71 || code === 73 || code === 75) return 'Snow'
  if (code === 77) return 'Snow Grains'
  if (code === 80 || code === 81 || code === 82) return 'Rain Showers'
  if (code === 85 || code === 86) return 'Snow Showers'
  if (code === 95) return 'Thunderstorm'
  if (code === 96 || code === 99) return 'Thunderstorm with Hail'
  return 'Unknown'
}

export function getTemperatureFeeling(temp: number, unit: 'celsius' | 'fahrenheit'): {
  label: string
  emoji: string
  color: string
} {
  const tempF = unit === 'celsius' ? (temp * 9/5) + 32 : temp
  
  if (tempF <= 32) {
    return { label: 'Freezing', emoji: '🥶', color: 'text-blue-600' }
  } else if (tempF <= 45) {
    return { label: 'Cold', emoji: '❄️', color: 'text-blue-500' }
  } else if (tempF <= 60) {
    return { label: 'Cool', emoji: '😊', color: 'text-cyan-500' }
  } else if (tempF <= 75) {
    return { label: 'Nice', emoji: '☀️', color: 'text-green-500' }
  } else if (tempF <= 85) {
    return { label: 'Warm', emoji: '😎', color: 'text-yellow-500' }
  } else if (tempF <= 95) {
    return { label: 'Hot', emoji: '🔥', color: 'text-orange-500' }
  } else {
    return { label: 'Extra Hot', emoji: '🌶️', color: 'text-red-600' }
  }
}

export function getWeatherEmoji(conditionCode: number): string {
  if (conditionCode === 0) return '☀️'
  if (conditionCode === 1) return '🌤️'
  if (conditionCode === 2) return '⛅'
  if (conditionCode === 3) return '☁️'
  if (conditionCode === 45 || conditionCode === 48) return '🌫️'
  if (conditionCode === 51 || conditionCode === 53 || conditionCode === 55) return '🌦️'
  if (conditionCode === 56 || conditionCode === 57) return '🌧️'
  if (conditionCode === 61 || conditionCode === 63 || conditionCode === 65) return '🌧️'
  if (conditionCode === 66 || conditionCode === 67) return '🌧️'
  if (conditionCode === 71 || conditionCode === 73 || conditionCode === 75) return '❄️'
  if (conditionCode === 77) return '❄️'
  if (conditionCode === 80 || conditionCode === 81 || conditionCode === 82) return '🌧️'
  if (conditionCode === 85 || conditionCode === 86) return '🌨️'
  if (conditionCode === 95) return '⛈️'
  if (conditionCode === 96 || conditionCode === 99) return '⛈️'
  return '🌡️'
}
