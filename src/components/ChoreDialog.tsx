import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkle, User, Info, Check, CloudSun } from '@phosphor-icons/react'
import { Chore, ChoreFrequency, ChoreTimeOfDay, ChoreCompletionType, Child, ChoreAssignment, Category, CategoryPoints, ApprovalConfig, WeatherConditionFilter, WeatherConditionRequirement } from '@/lib/types'
import { choreTemplates, choreCategories, getTemplatesByCategory, ChoreTemplate } from '@/lib/choreTemplates'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ChoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (chore: Omit<Chore, 'id' | 'createdAt'>) => void
  editChore?: Chore
  childrenList?: Child[]
  assignments?: ChoreAssignment[]
  onAssignChild?: (childId: string, choreId: string) => void
  onUnassignChild?: (assignmentId: string) => void
  categories: Category[]
}

export function ChoreDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  editChore,
  childrenList = [],
  assignments = [],
  onAssignChild,
  onUnassignChild,
  categories,
}: ChoreDialogProps) {
  const [name, setName] = useState(editChore?.name || '')
  const [description, setDescription] = useState(editChore?.description || '')
  const [points, setPoints] = useState(editChore?.points.toString() || '10')
  const [frequency, setFrequency] = useState<ChoreFrequency>(editChore?.frequency || 'daily')
  const [completionType, setCompletionType] = useState<ChoreCompletionType>(editChore?.completionType || 'individual')
  const [categoryIds, setCategoryIds] = useState<string[]>(editChore?.categoryIds || [])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryPoints, setCategoryPoints] = useState<CategoryPoints[]>(editChore?.categoryPoints || [])
  const [desiredTime, setDesiredTime] = useState(editChore?.desiredTime || '')
  const [timeOfDay, setTimeOfDay] = useState<ChoreTimeOfDay>(editChore?.timeOfDay || 'anytime')
  const [useTimeWindow, setUseTimeWindow] = useState(!!editChore?.timeWindow)
  const [timeWindowStart, setTimeWindowStart] = useState(editChore?.timeWindow?.startTime || '')
  const [timeWindowEnd, setTimeWindowEnd] = useState(editChore?.timeWindow?.endTime || '')
  const [estimatedDuration, setEstimatedDuration] = useState(editChore?.estimatedDuration?.toString() || '')
  const [approvalConfigs, setApprovalConfigs] = useState<ApprovalConfig[]>(editChore?.approvalConfigs || [])
  const [maxCompletions, setMaxCompletions] = useState(editChore?.maxCompletions?.toString() || '')
  const [weatherEnabled, setWeatherEnabled] = useState(!!editChore?.weatherConditions)
  const [weatherConditions, setWeatherConditions] = useState<WeatherConditionFilter[]>(
    editChore?.weatherConditions?.conditions || []
  )
  const [weatherMinTemp, setWeatherMinTemp] = useState(
    editChore?.weatherConditions?.minTemp?.toString() || ''
  )
  const [weatherMaxTemp, setWeatherMaxTemp] = useState(
    editChore?.weatherConditions?.maxTemp?.toString() || ''
  )
  const [weatherTempUnit, setWeatherTempUnit] = useState<'celsius' | 'fahrenheit'>(
    editChore?.weatherConditions?.unit || 'fahrenheit'
  )

  useEffect(() => {
    if (editChore) {
      setName(editChore.name)
      setDescription(editChore.description)
      setPoints(editChore.points.toString())
      setFrequency(editChore.frequency)
      setTimeOfDay(editChore.timeOfDay || 'anytime')
      setCompletionType(editChore.completionType)
      setCategoryIds(editChore.categoryIds || [])
      setCategoryPoints(editChore.categoryPoints || [])
      setDesiredTime(editChore.desiredTime || '')
      setUseTimeWindow(!!editChore.timeWindow)
      setTimeWindowStart(editChore.timeWindow?.startTime || '')
      setTimeWindowEnd(editChore.timeWindow?.endTime || '')
      setEstimatedDuration(editChore.estimatedDuration?.toString() || '')
      setApprovalConfigs(editChore.approvalConfigs || [])
      setMaxCompletions(editChore.maxCompletions?.toString() || '')
      setWeatherEnabled(!!editChore.weatherConditions)
      setWeatherConditions(editChore.weatherConditions?.conditions || [])
      setWeatherMinTemp(editChore.weatherConditions?.minTemp?.toString() || '')
      setWeatherMaxTemp(editChore.weatherConditions?.maxTemp?.toString() || '')
      setWeatherTempUnit(editChore.weatherConditions?.unit || 'fahrenheit')
    }
  }, [editChore])

  const filteredTemplates = getTemplatesByCategory(selectedCategory).filter((template) =>
    searchQuery === '' ||
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleTemplateSelect = (template: ChoreTemplate) => {
    setName(template.name)
    setDescription(template.description)
    setPoints(template.points.toString())
    setFrequency(template.frequency)
    setTimeOfDay(template.timeOfDay || 'anytime')
    if (template.estimatedDuration) {
      setEstimatedDuration(template.estimatedDuration.toString())
    }
  }

  const toggleCategoryId = (id: string) => {
    setCategoryIds((current) => {
      if (current.includes(id)) {
        setCategoryPoints((currentPoints) => currentPoints.filter((cp) => cp.categoryId !== id))
        return current.filter((cid) => cid !== id)
      } else {
        setCategoryPoints((currentPoints) => [...currentPoints, { categoryId: id, points: 10 }])
        return [...current, id]
      }
    })
  }

  const toggleWeatherCondition = (condition: WeatherConditionFilter) => {
    setWeatherConditions((current) => {
      if (current.includes(condition)) {
        return current.filter((c) => c !== condition)
      } else {
        return [...current.filter(c => c !== 'any'), condition]
      }
    })
  }

  const handleSave = () => {
    if (!name.trim()) return

    const choreData: Omit<Chore, 'id' | 'createdAt'> = {
      name: name.trim(),
      description: description.trim(),
      points: parseInt(points) || 10,
      frequency,
      timeOfDay,
      completionType,
      categoryIds,
      categoryPoints: categoryPoints.length > 0 ? categoryPoints : undefined,
    }

    if (desiredTime) {
      choreData.desiredTime = desiredTime
    }

    if (useTimeWindow && timeWindowStart && timeWindowEnd) {
      choreData.timeWindow = {
        startTime: timeWindowStart,
        endTime: timeWindowEnd,
      }
    }

    if (estimatedDuration && parseInt(estimatedDuration) > 0) {
      choreData.estimatedDuration = parseInt(estimatedDuration)
    }

    if (approvalConfigs && approvalConfigs.length > 0) {
      choreData.approvalConfigs = approvalConfigs
    }

    if (completionType === 'shareable' && maxCompletions && parseInt(maxCompletions) > 0) {
      choreData.maxCompletions = parseInt(maxCompletions)
    }

    if (weatherEnabled && weatherConditions.length > 0) {
      const weatherReq: WeatherConditionRequirement = {
        conditions: weatherConditions,
      }
      
      if (weatherMinTemp && parseInt(weatherMinTemp)) {
        weatherReq.minTemp = parseInt(weatherMinTemp)
        weatherReq.unit = weatherTempUnit
      }
      
      if (weatherMaxTemp && parseInt(weatherMaxTemp)) {
        weatherReq.maxTemp = parseInt(weatherMaxTemp)
        weatherReq.unit = weatherTempUnit
      }
      
      choreData.weatherConditions = weatherReq
    }

    onSave(choreData)

    if (!editChore) {
      setName('')
      setDescription('')
      setPoints('10')
      setFrequency('daily')
      setTimeOfDay('anytime')
      setCompletionType('individual')
      setCategoryIds([])
      setCategoryPoints([])
      setDesiredTime('')
      setUseTimeWindow(false)
      setTimeWindowStart('')
      setTimeWindowEnd('')
      setEstimatedDuration('')
      setApprovalConfigs([])
      setMaxCompletions('')
      setWeatherEnabled(false)
      setWeatherConditions([])
      setWeatherMinTemp('')
      setWeatherMaxTemp('')
      setWeatherTempUnit('fahrenheit')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editChore ? 'Edit Chore' : 'Add New Chore'}</DialogTitle>
          <DialogDescription>
            {editChore ? 'Update the chore details' : 'Choose from templates or create a custom chore'}
          </DialogDescription>
        </DialogHeader>

        {!editChore && (
          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">
                <Sparkle className="h-4 w-4 mr-2" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="custom">Custom Chore</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="search">Search Templates</Label>
                  <Input
                    id="search"
                    placeholder="Search chores..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {choreCategories.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid gap-2">
                    {filteredTemplates.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No templates found. Try a different search or category.
                      </div>
                    ) : (
                      filteredTemplates.map((template, index) => (
                        <Card
                          key={index}
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-2xl">{template.icon}</span>
                                  <h4 className="font-fredoka font-semibold">{template.name}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {template.description}
                                </p>
                                <div className="flex gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {template.frequency}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {template.points} pts
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {(name || description || points !== '10') && (
                  <div className="border-t pt-4">
                    <h4 className="font-fredoka font-semibold mb-2">Selected Template</h4>
                    <Card>
                      <CardContent className="p-4">
                        <div className="grid gap-2">
                          <div className="flex justify-between">
                            <span className="font-medium">{name}</span>
                            <span className="text-sm text-muted-foreground">{points} points</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{description}</p>
                          <Badge variant="secondary" className="w-fit">
                            {frequency}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Chore Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Make your bed"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Straighten sheets, fluff pillows"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    min="1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="estimated-duration">Estimated Duration (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="estimated-duration"
                      type="number"
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(e.target.value)}
                      min="1"
                      placeholder="15"
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">minutes</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    How long does this chore typically take to complete?
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label>Categories & Points</Label>
                  <div className="space-y-3">
                    {categories.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No categories available. Create categories first.
                      </p>
                    ) : (
                      categories.map((category) => {
                        const isSelected = categoryIds.includes(category.id)
                        const categoryPointValue = categoryPoints.find(cp => cp.categoryId === category.id)?.points || 10
                        
                        return (
                          <div key={category.id} className="flex items-center gap-3 p-3 border rounded-lg">
                            <Badge
                              variant={isSelected ? 'default' : 'outline'}
                              className="cursor-pointer flex-shrink-0"
                              style={{
                                backgroundColor: isSelected ? category.color : 'transparent',
                                borderColor: category.color,
                                color: isSelected ? 'white' : category.color,
                              }}
                              onClick={() => toggleCategoryId(category.id)}
                            >
                              {category.name}
                            </Badge>
                            {isSelected && (
                              <div className="flex items-center gap-2 flex-1">
                                <Label htmlFor={`cat-points-${category.id}`} className="text-sm whitespace-nowrap">
                                  Points:
                                </Label>
                                <Input
                                  id={`cat-points-${category.id}`}
                                  type="number"
                                  value={categoryPointValue}
                                  onChange={(e) => {
                                    const newPoints = parseInt(e.target.value) || 0
                                    setCategoryPoints((current) => {
                                      const existing = current.find(cp => cp.categoryId === category.id)
                                      if (existing) {
                                        return current.map(cp => 
                                          cp.categoryId === category.id ? { ...cp, points: newPoints } : cp
                                        )
                                      }
                                      return [...current, { categoryId: category.id, points: newPoints }]
                                    })
                                  }}
                                  min="0"
                                  className="w-20"
                                />
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select categories and assign points for each. Completing this chore will award points in all selected categories.
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as ChoreFrequency)}>
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time-of-day">Time of Day</Label>
                  <Select value={timeOfDay} onValueChange={(v) => setTimeOfDay(v as ChoreTimeOfDay)}>
                    <SelectTrigger id="time-of-day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anytime">Anytime</SelectItem>
                      <SelectItem value="am">AM Only (before noon)</SelectItem>
                      <SelectItem value="pm">PM Only (after noon)</SelectItem>
                      <SelectItem value="both">Both AM & PM</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {timeOfDay === 'am' && 'Must be completed before noon or will be marked missed'}
                    {timeOfDay === 'pm' && 'Only shows after noon'}
                    {timeOfDay === 'both' && 'Requires completion in morning and evening'}
                    {timeOfDay === 'anytime' && 'Can be completed at any time of day'}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desired-time">Desired Completion Time (optional)</Label>
                  <Input
                    id="desired-time"
                    type="time"
                    value={desiredTime}
                    onChange={(e) => setDesiredTime(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for sorting chores by time - not displayed to children
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="use-time-window" className="text-base font-fredoka font-semibold">
                        Time Window Restriction
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Restrict when this chore can be completed (e.g., Brush Teeth 5-8pm)
                      </p>
                    </div>
                    <Switch
                      id="use-time-window"
                      checked={useTimeWindow}
                      onCheckedChange={(checked) => {
                        setUseTimeWindow(checked)
                        if (!checked) {
                          setTimeWindowStart('')
                          setTimeWindowEnd('')
                        }
                      }}
                    />
                  </div>
                  
                  {useTimeWindow && (
                    <div className="space-y-4 pl-4 border-l-2 border-primary">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Children will only be able to complete this chore during the specified time window
                        </AlertDescription>
                      </Alert>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="time-window-start">Start Time</Label>
                          <Input
                            id="time-window-start"
                            type="time"
                            value={timeWindowStart}
                            onChange={(e) => setTimeWindowStart(e.target.value)}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="time-window-end">End Time</Label>
                          <Input
                            id="time-window-end"
                            type="time"
                            value={timeWindowEnd}
                            onChange={(e) => setTimeWindowEnd(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      {timeWindowStart && timeWindowEnd && (
                        <p className="text-xs text-muted-foreground">
                          This chore can only be completed between {timeWindowStart} and {timeWindowEnd}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="completion-type">Completion Type</Label>
                  <Select value={completionType} onValueChange={(v) => setCompletionType(v as ChoreCompletionType)}>
                    <SelectTrigger id="completion-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="shareable">Shareable</SelectItem>
                      <SelectItem value="once-per-day">Once Per Day</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {completionType === 'individual' && 'Each child completes independently for full points'}
                    {completionType === 'shareable' && 'Multiple children can complete, with optional limit on max completers'}
                    {completionType === 'once-per-day' && 'Only the first child to complete gets the points'}
                  </p>
                </div>
                {completionType === 'shareable' && (
                  <div className="grid gap-2 pl-4 border-l-2 border-primary">
                    <Label htmlFor="max-completions">Maximum Children (optional)</Label>
                    <Input
                      id="max-completions"
                      type="number"
                      value={maxCompletions}
                      onChange={(e) => setMaxCompletions(e.target.value)}
                      min="1"
                      placeholder="No limit"
                    />
                    <p className="text-xs text-muted-foreground">
                      Limit how many children can complete this chore. The first to complete get points, then it's removed from others' views. Leave blank for no limit.
                    </p>
                  </div>
                )}
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <CloudSun className="h-5 w-5 text-muted-foreground" />
                        <Label htmlFor="weather-enabled" className="text-base font-fredoka font-semibold">
                          Weather-Based Visibility
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Only show this chore when weather conditions are met
                      </p>
                    </div>
                    <Switch
                      id="weather-enabled"
                      checked={weatherEnabled}
                      onCheckedChange={(checked) => {
                        setWeatherEnabled(checked)
                        if (!checked) {
                          setWeatherConditions([])
                          setWeatherMinTemp('')
                          setWeatherMaxTemp('')
                        }
                      }}
                    />
                  </div>
                  
                  {weatherEnabled && (
                    <div className="space-y-4 pl-4 border-l-2 border-primary">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          This chore will only appear when weather conditions match. Requires weather settings to be enabled.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="grid gap-2">
                        <Label>Weather Conditions</Label>
                        <div className="flex flex-wrap gap-2">
                          {(['clear', 'cloudy', 'rainy', 'snowy', 'hot', 'cold', 'mild', 'any'] as WeatherConditionFilter[]).map((condition) => (
                            <Badge
                              key={condition}
                              variant={weatherConditions.includes(condition) ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => toggleWeatherCondition(condition)}
                            >
                              {condition === 'clear' && '☀️ Clear'}
                              {condition === 'cloudy' && '☁️ Cloudy'}
                              {condition === 'rainy' && '🌧️ Rainy'}
                              {condition === 'snowy' && '❄️ Snowy'}
                              {condition === 'hot' && '🔥 Hot'}
                              {condition === 'cold' && '🥶 Cold'}
                              {condition === 'mild' && '😊 Mild'}
                              {condition === 'any' && '🌈 Any'}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Select weather conditions when this chore should be visible. Select "Any" for all weather.
                        </p>
                      </div>
                      
                      <div className="grid gap-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Temperature Range (optional)</Label>
                          <Select value={weatherTempUnit} onValueChange={(v) => setWeatherTempUnit(v as 'celsius' | 'fahrenheit')}>
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fahrenheit">°F</SelectItem>
                              <SelectItem value="celsius">°C</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="weather-min-temp">Min Temperature</Label>
                            <Input
                              id="weather-min-temp"
                              type="number"
                              value={weatherMinTemp}
                              onChange={(e) => setWeatherMinTemp(e.target.value)}
                              placeholder="e.g., 50"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="weather-max-temp">Max Temperature</Label>
                            <Input
                              id="weather-max-temp"
                              type="number"
                              value={weatherMaxTemp}
                              onChange={(e) => setWeatherMaxTemp(e.target.value)}
                              placeholder="e.g., 85"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Optionally restrict by temperature range (leave blank for no restriction)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {editChore && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Chore Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Make your bed"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Straighten sheets, fluff pillows"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                min="1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estimated-duration-edit">Estimated Duration (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="estimated-duration-edit"
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  min="1"
                  placeholder="15"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">minutes</span>
              </div>
              <p className="text-xs text-muted-foreground">
                How long does this chore typically take to complete?
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label>Categories & Points</Label>
              <div className="space-y-3">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No categories available. Create categories first.
                  </p>
                ) : (
                  categories.map((category) => {
                    const isSelected = categoryIds.includes(category.id)
                    const categoryPointValue = categoryPoints.find(cp => cp.categoryId === category.id)?.points || 10
                    
                    return (
                      <div key={category.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Badge
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer flex-shrink-0"
                          style={{
                            backgroundColor: isSelected ? category.color : 'transparent',
                            borderColor: category.color,
                            color: isSelected ? 'white' : category.color,
                          }}
                          onClick={() => toggleCategoryId(category.id)}
                        >
                          {category.name}
                        </Badge>
                        {isSelected && (
                          <div className="flex items-center gap-2 flex-1">
                            <Label htmlFor={`cat-points-edit-${category.id}`} className="text-sm whitespace-nowrap">
                              Points:
                            </Label>
                            <Input
                              id={`cat-points-edit-${category.id}`}
                              type="number"
                              value={categoryPointValue}
                              onChange={(e) => {
                                const newPoints = parseInt(e.target.value) || 0
                                setCategoryPoints((current) => {
                                  const existing = current.find(cp => cp.categoryId === category.id)
                                  if (existing) {
                                    return current.map(cp => 
                                      cp.categoryId === category.id ? { ...cp, points: newPoints } : cp
                                    )
                                  }
                                  return [...current, { categoryId: category.id, points: newPoints }]
                                })
                              }}
                              min="0"
                              className="w-20"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Select categories and assign points for each. Completing this chore will award points in all selected categories.
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as ChoreFrequency)}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time-of-day">Time of Day</Label>
              <Select value={timeOfDay} onValueChange={(v) => setTimeOfDay(v as ChoreTimeOfDay)}>
                <SelectTrigger id="time-of-day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anytime">Anytime</SelectItem>
                  <SelectItem value="am">AM Only (before noon)</SelectItem>
                  <SelectItem value="pm">PM Only (after noon)</SelectItem>
                  <SelectItem value="both">Both AM & PM</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {timeOfDay === 'am' && 'Must be completed before noon or will be marked missed'}
                {timeOfDay === 'pm' && 'Only shows after noon'}
                {timeOfDay === 'both' && 'Requires completion in morning and evening'}
                {timeOfDay === 'anytime' && 'Can be completed at any time of day'}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desired-time-edit">Desired Completion Time (optional)</Label>
              <Input
                id="desired-time-edit"
                type="time"
                value={desiredTime}
                onChange={(e) => setDesiredTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used for sorting chores by time - not displayed to children
              </p>
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="use-time-window-edit" className="text-base font-fredoka font-semibold">
                    Time Window Restriction
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Restrict when this chore can be completed (e.g., Brush Teeth 5-8pm)
                  </p>
                </div>
                <Switch
                  id="use-time-window-edit"
                  checked={useTimeWindow}
                  onCheckedChange={(checked) => {
                    setUseTimeWindow(checked)
                    if (!checked) {
                      setTimeWindowStart('')
                      setTimeWindowEnd('')
                    }
                  }}
                />
              </div>
              
              {useTimeWindow && (
                <div className="space-y-4 pl-4 border-l-2 border-primary">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Children will only be able to complete this chore during the specified time window
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="time-window-start-edit">Start Time</Label>
                      <Input
                        id="time-window-start-edit"
                        type="time"
                        value={timeWindowStart}
                        onChange={(e) => setTimeWindowStart(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="time-window-end-edit">End Time</Label>
                      <Input
                        id="time-window-end-edit"
                        type="time"
                        value={timeWindowEnd}
                        onChange={(e) => setTimeWindowEnd(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  {timeWindowStart && timeWindowEnd && (
                    <p className="text-xs text-muted-foreground">
                      This chore can only be completed between {timeWindowStart} and {timeWindowEnd}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="completion-type-edit">Completion Type</Label>
              <Select value={completionType} onValueChange={(v) => setCompletionType(v as ChoreCompletionType)}>
                <SelectTrigger id="completion-type-edit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="shareable">Shareable</SelectItem>
                  <SelectItem value="once-per-day">Once Per Day</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {completionType === 'individual' && 'Each child completes independently for full points'}
                {completionType === 'shareable' && 'Multiple children can complete, with optional limit on max completers'}
                {completionType === 'once-per-day' && 'Only the first child to complete gets the points'}
              </p>
            </div>
            {completionType === 'shareable' && (
              <div className="grid gap-2 pl-4 border-l-2 border-primary">
                <Label htmlFor="max-completions-edit">Maximum Children (optional)</Label>
                <Input
                  id="max-completions-edit"
                  type="number"
                  value={maxCompletions}
                  onChange={(e) => setMaxCompletions(e.target.value)}
                  min="1"
                  placeholder="No limit"
                />
                <p className="text-xs text-muted-foreground">
                  Limit how many children can complete this chore. The first to complete get points, then it's removed from others' views. Leave blank for no limit.
                </p>
              </div>
            )}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <CloudSun className="h-5 w-5 text-muted-foreground" />
                    <Label htmlFor="weather-enabled-edit" className="text-base font-fredoka font-semibold">
                      Weather-Based Visibility
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only show this chore when weather conditions are met
                  </p>
                </div>
                <Switch
                  id="weather-enabled-edit"
                  checked={weatherEnabled}
                  onCheckedChange={(checked) => {
                    setWeatherEnabled(checked)
                    if (!checked) {
                      setWeatherConditions([])
                      setWeatherMinTemp('')
                      setWeatherMaxTemp('')
                    }
                  }}
                />
              </div>
              
              {weatherEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-primary">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      This chore will only appear when weather conditions match. Requires weather settings to be enabled.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-2">
                    <Label>Weather Conditions</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['clear', 'cloudy', 'rainy', 'snowy', 'hot', 'cold', 'mild', 'any'] as WeatherConditionFilter[]).map((condition) => (
                        <Badge
                          key={condition}
                          variant={weatherConditions.includes(condition) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleWeatherCondition(condition)}
                        >
                          {condition === 'clear' && '☀️ Clear'}
                          {condition === 'cloudy' && '☁️ Cloudy'}
                          {condition === 'rainy' && '🌧️ Rainy'}
                          {condition === 'snowy' && '❄️ Snowy'}
                          {condition === 'hot' && '🔥 Hot'}
                          {condition === 'cold' && '🥶 Cold'}
                          {condition === 'mild' && '😊 Mild'}
                          {condition === 'any' && '🌈 Any'}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select weather conditions when this chore should be visible. Select "Any" for all weather.
                    </p>
                  </div>
                  
                  <div className="grid gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Temperature Range (optional)</Label>
                      <Select value={weatherTempUnit} onValueChange={(v) => setWeatherTempUnit(v as 'celsius' | 'fahrenheit')}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fahrenheit">°F</SelectItem>
                          <SelectItem value="celsius">°C</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="weather-min-temp-edit">Min Temperature</Label>
                        <Input
                          id="weather-min-temp-edit"
                          type="number"
                          value={weatherMinTemp}
                          onChange={(e) => setWeatherMinTemp(e.target.value)}
                          placeholder="e.g., 50"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="weather-max-temp-edit">Max Temperature</Label>
                        <Input
                          id="weather-max-temp-edit"
                          type="number"
                          value={weatherMaxTemp}
                          onChange={(e) => setWeatherMaxTemp(e.target.value)}
                          placeholder="e.g., 85"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Optionally restrict by temperature range (leave blank for no restriction)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {editChore && childrenList.length > 0 && onAssignChild && onUnassignChild && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-fredoka font-semibold">Assign to Children</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Select which children should see this chore
              </p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {childrenList.map((child) => {
                  const assignment = assignments.find(
                    (a) => a.childId === child.id && a.choreId === editChore.id
                  )
                  const isAssigned = !!assignment

                  return (
                    <Card
                      key={child.id}
                      className="p-3 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => {
                        if (isAssigned && assignment) {
                          onUnassignChild(assignment.id)
                        } else {
                          onAssignChild(child.id, editChore.id)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isAssigned} />
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-fredoka font-bold"
                          style={{ backgroundColor: child.avatarColor }}
                        >
                          {child.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{child.name}</span>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {childrenList.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-fredoka font-semibold">Approval Settings</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure which children require parent approval before points are awarded
              </p>
              <div className="space-y-2">
                {childrenList.map((child) => {
                  const config = approvalConfigs.find((c) => c.childId === child.id)
                  const requiresApproval = config?.requiresApproval || false

                  return (
                    <Card key={child.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-fredoka font-bold text-sm"
                            style={{ backgroundColor: child.avatarColor }}
                          >
                            {child.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium">{child.name}</span>
                            {requiresApproval && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Requires Approval
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={requiresApproval}
                          onCheckedChange={(checked) => {
                            setApprovalConfigs((current) => {
                              const existing = current.find((c) => c.childId === child.id)
                              if (existing) {
                                return current.map((c) =>
                                  c.childId === child.id
                                    ? { ...c, requiresApproval: checked }
                                    : c
                                )
                              }
                              return [...current, { childId: child.id, requiresApproval: checked }]
                            })
                          }}
                        />
                      </div>
                    </Card>
                  )
                })}
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  When approval is required, children can mark chores as complete but points won't be awarded until you approve them in the Parent Dashboard.
                </AlertDescription>
              </Alert>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {editChore ? 'Save Changes' : 'Add Chore'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
