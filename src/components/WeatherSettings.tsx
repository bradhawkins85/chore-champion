import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WeatherSettings } from '@/lib/types'
import { geocodeLocation } from '@/lib/weatherHelper'
import { toast } from 'sonner'
import { MagnifyingGlass, MapPin } from '@phosphor-icons/react'

interface WeatherSettingsComponentProps {
  settings: WeatherSettings
  onUpdate: (settings: WeatherSettings) => void
}

export function WeatherSettingsComponent({ settings, onUpdate }: WeatherSettingsComponentProps) {
  const [locationInput, setLocationInput] = useState(settings.location || '')
  const [isSearching, setIsSearching] = useState(false)

  const handleLocationSearch = async () => {
    if (!locationInput.trim()) {
      toast.error('Please enter a location')
      return
    }

    setIsSearching(true)
    try {
      const result = await geocodeLocation(locationInput.trim())
      
      if (result) {
        onUpdate({
          ...settings,
          location: result.displayName,
          latitude: result.latitude,
          longitude: result.longitude,
        })
        setLocationInput(result.displayName)
        toast.success(`Location set to ${result.displayName}`)
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

  const handleToggle = (enabled: boolean) => {
    if (enabled && !settings.latitude && !settings.longitude) {
      toast.info('Please set a location first')
      return
    }
    onUpdate({ ...settings, enabled })
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
              onClick={handleLocationSearch}
              disabled={isSearching || !locationInput.trim()}
              variant="outline"
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
      </CardContent>
    </Card>
  )
}
