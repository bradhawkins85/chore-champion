import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WeatherSettings, TemperatureUnit } from '@/lib/types'
import { geocodeLocation, detectTemperatureUnit, getCurrentLocation } from '@/lib/weatherHelper'
import { toast } from 'sonner'
import { MagnifyingGlass, MapPin, ThermometerSimple, Palette, MapPinLine } from '@phosphor-icons/react'

interface WeatherSettingsComponentProps {
  settings: WeatherSettings
  onUpdate: (settings: WeatherSettings) => void
}

export function WeatherSettingsComponent({ settings, onUpdate }: WeatherSettingsComponentProps) {
  const [locationInput, setLocationInput] = useState(settings.location || '')
  const [isSearching, setIsSearching] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const handleLocationSearch = async () => {
    if (!locationInput.trim()) {
      toast.error('Please enter a location')
      return
    }

    setIsSearching(true)
    try {
      const result = await geocodeLocation(locationInput.trim())
      
      if (result) {
        const detectedUnit = detectTemperatureUnit(result.country)
        
        onUpdate({
          ...settings,
          location: result.displayName,
          latitude: result.latitude,
          longitude: result.longitude,
          autoDetectedUnit: detectedUnit,
        })
        setLocationInput(result.displayName)
        
        const unitLabel = detectedUnit === 'celsius' ? 'Celsius (°C)' : 'Fahrenheit (°F)'
        toast.success(`Location set to ${result.displayName}`, {
          description: `Auto-detected temperature unit: ${unitLabel}`,
        })
      } else {
        toast.error('Location not found', {
          description: 'Please try a different search term',
        })
      }
    } catch (error) {
      toast.error('Failed to search location')
    } finally {
      setIsSearching(false)
    }
  }

  const handleCurrentLocation = async () => {
    setIsGettingLocation(true)
    try {
      const result = await getCurrentLocation()
      
      if (result) {
        const detectedUnit = detectTemperatureUnit(result.country)
        
        onUpdate({
          ...settings,
          location: result.displayName,
          latitude: result.latitude,
          longitude: result.longitude,
          autoDetectedUnit: detectedUnit,
        })
        setLocationInput(result.displayName)
        
        const unitLabel = detectedUnit === 'celsius' ? 'Celsius (°C)' : 'Fahrenheit (°F)'
        toast.success(`Location set to ${result.displayName}`, {
          description: `Auto-detected temperature unit: ${unitLabel}`,
        })
      } else {
        toast.error('Could not get current location', {
          description: 'Please check your browser permissions or enter a location manually',
        })
      }
    } catch (error) {
      toast.error('Failed to get current location')
    } finally {
      setIsGettingLocation(false)
    }
  }

  const handleToggle = (enabled: boolean) => {
    if (enabled && !settings.latitude && !settings.longitude) {
      toast.info('Please set a location first')
      return
    }
    onUpdate({ ...settings, enabled })
  }

  const handleUnitChange = (unit: TemperatureUnit) => {
    onUpdate({ ...settings, temperatureUnit: unit })
    
    if (unit === 'auto' && settings.autoDetectedUnit) {
      const unitLabel = settings.autoDetectedUnit === 'celsius' ? 'Celsius (°C)' : 'Fahrenheit (°F)'
      toast.info(`Using auto-detected unit: ${unitLabel}`)
    } else if (unit !== 'auto') {
      const unitLabel = unit === 'celsius' ? 'Celsius (°C)' : 'Fahrenheit (°F)'
      toast.success(`Temperature unit set to ${unitLabel}`)
    }
  }

  const getEffectiveUnit = () => {
    if (settings.temperatureUnit === 'auto') {
      return settings.autoDetectedUnit || 'fahrenheit'
    }
    return settings.temperatureUnit
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Weather Display
        </CardTitle>
        <CardDescription>
          Show current weather and temperature on the main screen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Weather Display</Label>
            <p className="text-sm text-muted-foreground">
              Show weather information to children
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-input">Location</Label>
          <div className="flex gap-2">
            <Input
              id="location-input"
              placeholder="Enter city, zip code, or address"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLocationSearch()
                }
              }}
            />
            <Button
              onClick={handleCurrentLocation}
              disabled={isGettingLocation || isSearching}
              variant="outline"
              title="Use current location"
            >
              <MapPinLine className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleLocationSearch}
              disabled={isSearching || !locationInput.trim() || isGettingLocation}
              variant="outline"
              title="Search location"
            >
              <MagnifyingGlass className="h-4 w-4" />
            </Button>
          </div>
          {settings.location && settings.latitude && settings.longitude && (
            <p className="text-sm text-muted-foreground">
              Current location: {settings.location}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="temp-unit" className="flex items-center gap-2">
            <ThermometerSimple className="h-4 w-4" />
            Temperature Unit
          </Label>
          <Select
            value={settings.temperatureUnit}
            onValueChange={(value) => handleUnitChange(value as TemperatureUnit)}
          >
            <SelectTrigger id="temp-unit">
              <SelectValue placeholder="Select temperature unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                Auto (based on location)
                {settings.temperatureUnit === 'auto' && settings.autoDetectedUnit && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    - Currently: {getEffectiveUnit() === 'celsius' ? '°C' : '°F'}
                  </span>
                )}
              </SelectItem>
              <SelectItem value="celsius">Celsius (°C)</SelectItem>
              <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
            </SelectContent>
          </Select>
          {settings.temperatureUnit === 'auto' && settings.autoDetectedUnit && (
            <p className="text-sm text-muted-foreground">
              Auto-detected: {getEffectiveUnit() === 'celsius' ? 'Celsius' : 'Fahrenheit'} based on {settings.location}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Seasonal Themes
            </Label>
            <p className="text-sm text-muted-foreground">
              Change app colors based on weather conditions
            </p>
          </div>
          <Switch
            checked={settings.seasonalThemesEnabled ?? false}
            onCheckedChange={(enabled) => onUpdate({ ...settings, seasonalThemesEnabled: enabled })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
