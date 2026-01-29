import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CloudSun, Plus } from '@phosphor-icons/react'
import { WeatherData, Chore, Category } from '@/lib/types'
import { getWeatherBasedSuggestions, getWeatherConditionLabel } from '@/lib/weatherChoreHelper'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface WeatherChoreSuggestionsProps {
  currentWeather: WeatherData | null
  existingChores: Chore[]
  categories: Category[]
  weatherEnabled: boolean
  onAddChore: (choreData: Omit<Chore, 'id' | 'createdAt'>) => void
}

export function WeatherChoreSuggestions({
  currentWeather,
  existingChores,
  categories,
  weatherEnabled,
  onAddChore,
}: WeatherChoreSuggestionsProps) {
  const suggestions = getWeatherBasedSuggestions(currentWeather, existingChores, categories)

  if (!weatherEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudSun className="h-5 w-5" />
            Weather-Based Chore Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Enable weather settings in the Settings tab to see weather-based chore suggestions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!currentWeather) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudSun className="h-5 w-5" />
            Weather-Based Chore Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Weather data unavailable. Check your weather settings configuration.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudSun className="h-5 w-5" />
            Weather-Based Chore Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              No new chore suggestions for current weather
            </p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="font-medium">{currentWeather.condition}</span>
              <span className="text-muted-foreground">•</span>
              <span>{currentWeather.temperature}°{currentWeather.unit === 'celsius' ? 'C' : 'F'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const firstCategoryId = categories.length > 0 ? categories[0].id : undefined

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CloudSun className="h-5 w-5" />
            Weather-Based Chore Suggestions
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{currentWeather.condition}</span>
            <span className="font-medium">{currentWeather.temperature}°{currentWeather.unit === 'celsius' ? 'C' : 'F'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => {
              const categoryMatch = categories.find(
                (c) => c.name.toLowerCase() === suggestion.categoryName?.toLowerCase()
              )

              return (
                <Card key={index} className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-fredoka font-semibold">{suggestion.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.points} pts
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {suggestion.description}
                        </p>
                        <div className="flex flex-wrap gap-2 items-center">
                          {suggestion.categoryName && (
                            <Badge variant="outline" className="text-xs">
                              {suggestion.categoryName}
                            </Badge>
                          )}
                          {suggestion.estimatedDuration && (
                            <Badge variant="outline" className="text-xs">
                              ~{suggestion.estimatedDuration} min
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {getWeatherConditionLabel(suggestion.weatherConditions.conditions)}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const categoryIds = categoryMatch 
                            ? [categoryMatch.id]
                            : firstCategoryId 
                            ? [firstCategoryId]
                            : []

                          const categoryPoints = categoryIds.map((catId) => ({
                            categoryId: catId,
                            points: suggestion.points,
                          }))

                          onAddChore({
                            name: suggestion.name,
                            description: suggestion.description,
                            points: suggestion.points,
                            frequency: 'daily',
                            completionType: 'individual',
                            timeOfDay: 'anytime',
                            categoryIds,
                            categoryPoints: categoryPoints.length > 0 ? categoryPoints : undefined,
                            weatherConditions: suggestion.weatherConditions,
                            estimatedDuration: suggestion.estimatedDuration,
                          })
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
