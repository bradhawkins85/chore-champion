import { Chore, WeatherData, WeatherConditionRequirement, Category } from './types'

export interface WeatherChoreSuggestion {
  name: string
  description: string
  points: number
  weatherConditions: WeatherConditionRequirement
  categoryName?: string
  estimatedDuration?: number
}

export const WEATHER_CHORE_SUGGESTIONS: WeatherChoreSuggestion[] = [
  {
    name: 'Water Plants',
    description: 'Water the outdoor plants and garden',
    points: 15,
    weatherConditions: {
      conditions: ['clear', 'cloudy'],
    },
    categoryName: 'Outdoor',
    estimatedDuration: 20,
  },
  {
    name: 'Mow the Lawn',
    description: 'Mow the lawn and edge the grass',
    points: 30,
    weatherConditions: {
      conditions: ['clear', 'cloudy'],
    },
    categoryName: 'Outdoor',
    estimatedDuration: 45,
  },
  {
    name: 'Wash the Car',
    description: 'Wash and dry the family car',
    points: 25,
    weatherConditions: {
      conditions: ['clear'],
      minTemp: 50,
      unit: 'fahrenheit',
    },
    categoryName: 'Outdoor',
    estimatedDuration: 40,
  },
  {
    name: 'Sweep Patio/Deck',
    description: 'Sweep the patio or deck area',
    points: 10,
    weatherConditions: {
      conditions: ['clear', 'cloudy'],
    },
    categoryName: 'Outdoor',
    estimatedDuration: 15,
  },
  {
    name: 'Take Out Trash',
    description: 'Take trash and recycling bins to the curb',
    points: 10,
    weatherConditions: {
      conditions: ['any'],
    },
    categoryName: 'Household',
    estimatedDuration: 10,
  },
  {
    name: 'Shovel Snow',
    description: 'Shovel snow from driveway and walkway',
    points: 40,
    weatherConditions: {
      conditions: ['snowy'],
    },
    categoryName: 'Outdoor',
    estimatedDuration: 60,
  },
  {
    name: 'Salt Driveway',
    description: 'Spread salt or ice melt on driveway and walkway',
    points: 15,
    weatherConditions: {
      conditions: ['snowy', 'cold'],
      maxTemp: 32,
      unit: 'fahrenheit',
    },
    categoryName: 'Outdoor',
    estimatedDuration: 15,
  },
  {
    name: 'Clean Rain Gutters',
    description: 'Clean leaves and debris from rain gutters',
    points: 35,
    weatherConditions: {
      conditions: ['clear', 'cloudy'],
    },
    categoryName: 'Outdoor',
    estimatedDuration: 50,
  },
  {
    name: 'Bring in Outdoor Furniture',
    description: 'Bring outdoor furniture inside or cover it',
    points: 20,
    weatherConditions: {
      conditions: ['rainy', 'snowy'],
    },
    categoryName: 'Outdoor',
    estimatedDuration: 25,
  },
  {
    name: 'Weed the Garden',
    description: 'Pull weeds from garden beds and flower areas',
    points: 20,
    weatherConditions: {
      conditions: ['clear', 'cloudy'],
    },
    categoryName: 'Outdoor',
    estimatedDuration: 30,
  },
  {
    name: 'Set Up Sprinkler',
    description: 'Set up and run the lawn sprinkler',
    points: 10,
    weatherConditions: {
      conditions: ['clear'],
      minTemp: 60,
      unit: 'fahrenheit',
    },
    categoryName: 'Outdoor',
    estimatedDuration: 15,
  },
  {
    name: 'Rake Leaves',
    description: 'Rake fallen leaves from yard',
    points: 25,
    weatherConditions: {
      conditions: ['clear', 'cloudy'],
    },
    categoryName: 'Outdoor',
    estimatedDuration: 35,
  },
  {
    name: 'Clean Outdoor Windows',
    description: 'Wash the outside of windows',
    points: 20,
    weatherConditions: {
      conditions: ['clear', 'cloudy'],
      minTemp: 50,
      unit: 'fahrenheit',
    },
    categoryName: 'Outdoor',
    estimatedDuration: 30,
  },
  {
    name: 'Fill Bird Feeders',
    description: 'Refill outdoor bird feeders',
    points: 10,
    weatherConditions: {
      conditions: ['any'],
    },
    categoryName: 'Outdoor',
    estimatedDuration: 10,
  },
  {
    name: 'Walk the Dog',
    description: 'Take the dog for a walk',
    points: 15,
    weatherConditions: {
      conditions: ['clear', 'cloudy', 'mild'],
      minTemp: 40,
      maxTemp: 85,
      unit: 'fahrenheit',
    },
    categoryName: 'Pets',
    estimatedDuration: 20,
  },
  {
    name: 'Play Outside',
    description: 'Spend time playing outdoors',
    points: 10,
    weatherConditions: {
      conditions: ['clear', 'mild'],
      minTemp: 50,
      maxTemp: 85,
      unit: 'fahrenheit',
    },
    categoryName: 'Personal',
    estimatedDuration: 30,
  },
  {
    name: 'Check Mailbox',
    description: 'Check and bring in the mail',
    points: 5,
    weatherConditions: {
      conditions: ['any'],
    },
    categoryName: 'Household',
    estimatedDuration: 5,
  },
  {
    name: 'Put Away Winter Gear',
    description: 'Organize and put away coats, boots, and winter items',
    points: 15,
    weatherConditions: {
      conditions: ['hot', 'mild'],
      minTemp: 60,
      unit: 'fahrenheit',
    },
    categoryName: 'Household',
    estimatedDuration: 20,
  },
  {
    name: 'Organize Cold Weather Clothes',
    description: 'Sort and organize winter clothing',
    points: 15,
    weatherConditions: {
      conditions: ['cold', 'snowy'],
      maxTemp: 40,
      unit: 'fahrenheit',
    },
    categoryName: 'Household',
    estimatedDuration: 20,
  },
]

export function matchesWeatherCondition(
  requirement: WeatherConditionRequirement,
  currentWeather: WeatherData | null
): boolean {
  if (!currentWeather) {
    return requirement.conditions?.includes('any') || false
  }

  const conditions = requirement.conditions || ['any']
  
  if (conditions.includes('any')) {
    return checkTemperatureRange(requirement, currentWeather)
  }

  const weatherMatches = conditions.some(condition => {
    const normalizedCondition = currentWeather.condition.toLowerCase()
    
    switch (condition) {
      case 'clear':
        return normalizedCondition.includes('clear') || normalizedCondition.includes('sunny')
      
      case 'cloudy':
        return normalizedCondition.includes('cloud') || normalizedCondition.includes('overcast') || normalizedCondition.includes('partly')
      
      case 'rainy':
        return normalizedCondition.includes('rain') || normalizedCondition.includes('drizzle') || normalizedCondition.includes('shower')
      
      case 'snowy':
        return normalizedCondition.includes('snow') || normalizedCondition.includes('flurr') || normalizedCondition.includes('blizzard')
      
      case 'hot':
        return checkTemperature(currentWeather, 75, 999, 'fahrenheit')
      
      case 'cold':
        return checkTemperature(currentWeather, -999, 50, 'fahrenheit')
      
      case 'mild':
        return checkTemperature(currentWeather, 50, 75, 'fahrenheit')
      
      default:
        return false
    }
  })

  if (!weatherMatches) {
    return false
  }

  return checkTemperatureRange(requirement, currentWeather)
}

function checkTemperatureRange(
  requirement: WeatherConditionRequirement,
  currentWeather: WeatherData
): boolean {
  if (requirement.minTemp === undefined && requirement.maxTemp === undefined) {
    return true
  }

  const requirementUnit = requirement.unit || 'fahrenheit'
  const currentTemp = convertTemperature(
    currentWeather.temperature,
    currentWeather.unit,
    requirementUnit
  )

  if (requirement.minTemp !== undefined && currentTemp < requirement.minTemp) {
    return false
  }

  if (requirement.maxTemp !== undefined && currentTemp > requirement.maxTemp) {
    return false
  }

  return true
}

function checkTemperature(
  weather: WeatherData,
  minF: number,
  maxF: number,
  unit: 'celsius' | 'fahrenheit'
): boolean {
  const tempF = convertTemperature(weather.temperature, weather.unit, 'fahrenheit')
  return tempF >= minF && tempF <= maxF
}

function convertTemperature(
  temp: number,
  fromUnit: 'celsius' | 'fahrenheit',
  toUnit: 'celsius' | 'fahrenheit'
): number {
  if (fromUnit === toUnit) return temp
  
  if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
    return (temp * 9/5) + 32
  } else {
    return (temp - 32) * 5/9
  }
}

export function getWeatherBasedSuggestions(
  currentWeather: WeatherData | null,
  existingChores: Chore[],
  categories: Category[]
): WeatherChoreSuggestion[] {
  const existingChoreNames = new Set(
    existingChores.map(c => c.name.toLowerCase().trim())
  )

  return WEATHER_CHORE_SUGGESTIONS.filter(suggestion => {
    if (existingChoreNames.has(suggestion.name.toLowerCase().trim())) {
      return false
    }

    return matchesWeatherCondition(suggestion.weatherConditions, currentWeather)
  })
}

export function shouldShowChore(
  chore: Chore,
  currentWeather: WeatherData | null
): boolean {
  if (!chore.weatherConditions) {
    return true
  }

  return matchesWeatherCondition(chore.weatherConditions, currentWeather)
}

export function getWeatherConditionLabel(conditions?: string[]): string {
  if (!conditions || conditions.length === 0 || conditions.includes('any')) {
    return 'Any weather'
  }

  const labels = conditions.map(c => {
    switch (c) {
      case 'clear': return '☀️ Clear'
      case 'cloudy': return '☁️ Cloudy'
      case 'rainy': return '🌧️ Rainy'
      case 'snowy': return '❄️ Snowy'
      case 'hot': return '🔥 Hot'
      case 'cold': return '🥶 Cold'
      case 'mild': return '😊 Mild'
      default: return c
    }
  })

  return labels.join(', ')
}
