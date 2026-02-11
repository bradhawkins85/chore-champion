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
import { Sparkle, User, Info, Check, CloudSun, SpeakerHigh, Plus, PencilSimple } from '@phosphor-icons/react'
import { Chore, ChoreFrequency, ChoreTimeOfDay, ChoreCompletionType, ChoreResetPeriod, Child, ChoreAssignment, Category, CategoryPoints, ApprovalConfig, WeatherConditionFilter, WeatherConditionRequirement, RotationMode, RotationOrder, DayOfWeek, RepeatPattern, TimeWindow, ChorePointOverride, CategoryPointOverride } from '@/lib/types'
import { choreTemplates, choreCategories, getTemplatesByCategory, ChoreTemplate } from '@/lib/choreTemplates'
import { getWeatherConditionLabel } from '@/lib/weatherChoreHelper'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EditAssignmentDialog } from './EditAssignmentDialog'

// Helper function to handle chore name property that might be stored as 'name' or 'title'
// Backend stores it as 'title', but frontend type uses 'name'
function getChoreName(chore: Chore | undefined): string {
  if (!chore) return ''
  // Try 'name' first (frontend property), then 'title' (backend property)
  return chore.name || (chore as any).title || ''
}

interface ChoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (chore: Omit<Chore, 'id' | 'createdAt'>) => void
  editChore?: Chore
  childrenList?: Child[]
  assignments?: ChoreAssignment[]
  onAssignChild?: (childId: string, choreId: string) => void
  onUnassignChild?: (assignmentId: string) => void
  onEditAssignment?: (
    assignmentId: string,
    updates: {
      startDate?: number
      endDate?: number
      daysOfWeek?: DayOfWeek[]
      repeatPattern?: RepeatPattern
      timeOfDay?: ChoreTimeOfDay
      timeWindow?: TimeWindow
      pointOverrides?: ChorePointOverride[]
      categoryPointOverrides?: CategoryPointOverride[]
    }
  ) => void
  categories: Category[]
  canAddChore?: boolean
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
  onEditAssignment,
  categories,
  canAddChore = true,
}: ChoreDialogProps) {
  const [name, setName] = useState(getChoreName(editChore))
  const [description, setDescription] = useState(editChore?.description || '')
  const [points, setPoints] = useState((editChore?.points ?? 10).toString())
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
  const [defaultStartDate, setDefaultStartDate] = useState<Date | undefined>(editChore?.defaultStartDate ? new Date(editChore.defaultStartDate) : undefined)
  const [defaultEndDate, setDefaultEndDate] = useState<Date | undefined>(editChore?.defaultEndDate ? new Date(editChore.defaultEndDate) : undefined)
  const [defaultDays, setDefaultDays] = useState<DayOfWeek[]>(editChore?.defaultDaysOfWeek || [])
  const [approvalConfigs, setApprovalConfigs] = useState<ApprovalConfig[]>(editChore?.approvalConfigs || [])
  const [maxCompletions, setMaxCompletions] = useState(editChore?.maxCompletions?.toString() || '')
  const [resetPeriod, setResetPeriod] = useState<'daily' | 'weekly' | 'bi-weekly' | 'monthly'>(editChore?.resetPeriod || 'daily')
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
  const [speakDescription, setSpeakDescription] = useState(editChore?.speakDescription ?? true)
  const [inactiveOnSchoolHolidays, setInactiveOnSchoolHolidays] = useState(editChore?.inactiveOnSchoolHolidays ?? false)
  const [onlyOnSchoolHolidays, setOnlyOnSchoolHolidays] = useState(editChore?.onlyOnSchoolHolidays ?? false)
  const [rotationMode, setRotationMode] = useState<RotationMode>(editChore?.rotationConfig?.mode || 'one-child-per-interval')
  const [rotationOrder, setRotationOrder] = useState<RotationOrder>(editChore?.rotationConfig?.order || 'specific')
  const [rotationChildOrder, setRotationChildOrder] = useState<string[]>(editChore?.rotationConfig?.childOrder || [])
  const [emoji, setEmoji] = useState(editChore?.emoji || '')
  const [editingChildAssignment, setEditingChildAssignment] = useState<ChoreAssignment | null>(null)
  const [editingAssignmentChild, setEditingAssignmentChild] = useState<Child | null>(null)

  useEffect(() => {
    if (editChore) {
      setName(getChoreName(editChore))
      setDescription(editChore.description || '')
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
      setDefaultStartDate(editChore.defaultStartDate ? new Date(editChore.defaultStartDate) : undefined)
      setDefaultEndDate(editChore.defaultEndDate ? new Date(editChore.defaultEndDate) : undefined)
      setDefaultDays(editChore.defaultDaysOfWeek || [])
      setApprovalConfigs(editChore.approvalConfigs || [])
      setMaxCompletions(editChore.maxCompletions?.toString() || '')
      setResetPeriod(editChore.resetPeriod || 'daily')
      setWeatherEnabled(!!editChore.weatherConditions)
      setWeatherConditions(editChore.weatherConditions?.conditions || [])
      setWeatherMinTemp(editChore.weatherConditions?.minTemp?.toString() || '')
      setWeatherMaxTemp(editChore.weatherConditions?.maxTemp?.toString() || '')
      setWeatherTempUnit(editChore.weatherConditions?.unit || 'fahrenheit')
      setSpeakDescription(editChore.speakDescription ?? true)
      setInactiveOnSchoolHolidays(editChore.inactiveOnSchoolHolidays ?? false)
      setOnlyOnSchoolHolidays(editChore.onlyOnSchoolHolidays ?? false)
      setRotationMode(editChore.rotationConfig?.mode || 'one-child-per-interval')
      setRotationOrder(editChore.rotationConfig?.order || 'specific')
      setRotationChildOrder(editChore.rotationConfig?.childOrder || [])
      setEmoji(editChore.emoji || '')
    } else {
      // Reset to default values when editChore is undefined (adding new chore)
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
      setDefaultStartDate(undefined)
      setDefaultEndDate(undefined)
      setDefaultDays([])
      setApprovalConfigs([])
      setMaxCompletions('')
      setResetPeriod('daily')
      setWeatherEnabled(false)
      setWeatherConditions([])
      setWeatherMinTemp('')
      setWeatherMaxTemp('')
      setWeatherTempUnit('fahrenheit')
      setSpeakDescription(true)
      setInactiveOnSchoolHolidays(false)
      setOnlyOnSchoolHolidays(false)
      setRotationMode('one-child-per-interval')
      setRotationOrder('specific')
      setRotationChildOrder([])
      setEmoji('')
    }
  }, [editChore])


  const defaultDaysOfWeek: { value: DayOfWeek; label: string }[] = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
  ]

  const toggleDefaultDay = (day: DayOfWeek) => {
    setDefaultDays((current) => current.includes(day) ? current.filter((d) => d !== day) : [...current, day])
  }

  const getChoreCategories = (choreToUse: Chore) => {
    if (!choreToUse.categoryPoints) return []

    return choreToUse.categoryPoints
      .map((cp) => {
        const category = categories.find((cat) => cat.id === cp.categoryId)
        return category
          ? {
              id: category.id,
              name: category.name,
              color: category.color,
              points: cp.points,
            }
          : null
      })
      .filter(Boolean) as { id: string; name: string; color: string; points: number }[]
  }

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
    setEmoji(template.icon || '')
    if (template.estimatedDuration) {
      setEstimatedDuration(template.estimatedDuration.toString())
    }
    // Copy weather conditions from template
    if (template.weatherConditions) {
      setWeatherEnabled(true)
      setWeatherConditions(template.weatherConditions.conditions || [])
      if (template.weatherConditions.minTemp !== undefined) {
        setWeatherMinTemp(template.weatherConditions.minTemp.toString())
      }
      if (template.weatherConditions.maxTemp !== undefined) {
        setWeatherMaxTemp(template.weatherConditions.maxTemp.toString())
      }
      setWeatherTempUnit(template.weatherConditions.unit || 'fahrenheit')
    } else {
      setWeatherEnabled(false)
      setWeatherConditions([])
      setWeatherMinTemp('')
      setWeatherMaxTemp('')
    }
  }

  const handleQuickAddTemplate = (template: ChoreTemplate) => {
    const choreData: Omit<Chore, 'id' | 'createdAt'> = {
      name: template.name,
      description: template.description,
      points: template.points,
      frequency: template.frequency,
      timeOfDay: template.timeOfDay || 'anytime',
      completionType: 'individual',
      categoryIds: [],
      categoryPoints: undefined,
      emoji: template.icon || undefined,
    }

    if (template.estimatedDuration) {
      choreData.estimatedDuration = template.estimatedDuration
    }

    if (template.weatherConditions) {
      choreData.weatherConditions = template.weatherConditions
    }

    choreData.speakDescription = true
    choreData.inactiveOnSchoolHolidays = false
    choreData.onlyOnSchoolHolidays = false

    onSave(choreData)
    // Keep modal open by not calling onOpenChange(false)
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
    if (!name || !name.trim()) return

    const choreData: Omit<Chore, 'id' | 'createdAt'> = {
      name: name.trim(),
      description: (description || '').trim(),
      points: parseInt(points) || 10,
      frequency,
      timeOfDay,
      completionType,
      categoryIds,
      categoryPoints: categoryPoints.length > 0 ? categoryPoints : undefined,
    }

    if (emoji) {
      choreData.emoji = emoji
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

    choreData.defaultStartDate = defaultStartDate ? defaultStartDate.getTime() : undefined
    choreData.defaultEndDate = defaultEndDate ? defaultEndDate.getTime() : undefined
    choreData.defaultDaysOfWeek = defaultDays.length > 0 ? defaultDays : undefined

    if (approvalConfigs && approvalConfigs.length > 0) {
      choreData.approvalConfigs = approvalConfigs
    }

    if (completionType === 'shareable' && maxCompletions && parseInt(maxCompletions) > 0) {
      choreData.maxCompletions = parseInt(maxCompletions)
      choreData.resetPeriod = resetPeriod
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

    choreData.speakDescription = speakDescription
    choreData.inactiveOnSchoolHolidays = inactiveOnSchoolHolidays
    choreData.onlyOnSchoolHolidays = onlyOnSchoolHolidays

    if (completionType === 'rotational') {
      choreData.rotationConfig = {
        mode: rotationMode,
        order: rotationOrder,
        childOrder: rotationOrder === 'specific' ? rotationChildOrder : undefined,
      }
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
      setDefaultStartDate(undefined)
      setDefaultEndDate(undefined)
      setDefaultDays([])
      setApprovalConfigs([])
      setMaxCompletions('')
      setResetPeriod('daily')
      setWeatherEnabled(false)
      setWeatherConditions([])
      setWeatherMinTemp('')
      setWeatherMaxTemp('')
      setWeatherTempUnit('fahrenheit')
      setSpeakDescription(true)
      setInactiveOnSchoolHolidays(false)
      setOnlyOnSchoolHolidays(false)
      setRotationMode('one-child-per-interval')
      setRotationOrder('specific')
      setRotationChildOrder([])
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
                          className="hover:bg-accent transition-colors"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-2xl">{template.icon}</span>
                                  <h4 className="font-fredoka font-semibold">{template.name}</h4>
                                  {template.weatherConditions && (
                                    <CloudSun className="h-4 w-4 text-blue-500" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {template.description}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {template.frequency}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {template.points} pts
                                  </Badge>
                                  {template.weatherConditions && (
                                    <Badge variant="outline" className="text-xs text-blue-600">
                                      {getWeatherConditionLabel(template.weatherConditions.conditions)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {!canAddChore ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        size="icon"
                                        variant="default"
                                        disabled={true}
                                        className="flex-shrink-0"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Upgrade to paid plan to add more chores</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Button
                                  size="icon"
                                  variant="default"
                                  onClick={() => handleQuickAddTemplate(template)}
                                  className="flex-shrink-0"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
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
                  <Label htmlFor="emoji">Emoji (optional)</Label>
                  <Input
                    id="emoji"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    placeholder="🛏️"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Add an emoji to represent this chore (e.g., 🧹 🍽️ 🧺)
                  </p>
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
                  <div className="space-y-1">
                    <Label className="text-base font-fredoka font-semibold">Default Assignment Schedule</Label>
                    <p className="text-xs text-muted-foreground">These defaults are used when assigning this chore to a child. You can still override them per child in Edit Chores.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="default-start-date">Default Start Date (optional)</Label>
                      <Input id="default-start-date" type="date" value={defaultStartDate ? new Date(defaultStartDate).toISOString().split('T')[0] : ''} onChange={(e) => setDefaultStartDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="default-end-date">Default End Date (optional)</Label>
                      <Input id="default-end-date" type="date" value={defaultEndDate ? new Date(defaultEndDate).toISOString().split('T')[0] : ''} onChange={(e) => setDefaultEndDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Active Days</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {defaultDaysOfWeek.map((day) => (
                        <div
                          key={day.value}
                          onClick={() => toggleDefaultDay(day.value)}
                          className={
                            `flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${defaultDays.includes(day.value) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`
                          }
                        >
                          <Checkbox
                            checked={defaultDays.includes(day.value)}
                            onCheckedChange={() => toggleDefaultDay(day.value)}
                          />
                          <span className="text-sm">{day.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{defaultDays.length === 0 ? 'No days selected - defaults to every day' : `Default active on ${defaultDays.length} day${defaultDays.length === 1 ? '' : 's'}`}</p>
                  </div>
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
                      <SelectItem value="rotational">Rotational</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {completionType === 'individual' && 'Each child completes independently for full points'}
                    {completionType === 'shareable' && 'Multiple children can complete, with optional limit on max completers'}
                    {completionType === 'once-per-day' && 'Only the first child to complete gets the points'}
                    {completionType === 'rotational' && 'Chore rotates between assigned children based on order and availability'}
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
                    
                    <Label htmlFor="reset-period" className="mt-2">Reset Period</Label>
                    <Select value={resetPeriod} onValueChange={(v) => setResetPeriod(v as 'daily' | 'weekly' | 'bi-weekly' | 'monthly')}>
                      <SelectTrigger id="reset-period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily (resets at midnight)</SelectItem>
                        <SelectItem value="weekly">Weekly (resets Monday)</SelectItem>
                        <SelectItem value="bi-weekly">Bi-weekly (resets every 2 weeks)</SelectItem>
                        <SelectItem value="monthly">Monthly (resets on 1st)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose when this shareable task resets. Children can complete it anytime during the period.
                    </p>
                  </div>
                )}
                {completionType === 'rotational' && (
                  <div className="grid gap-4 pl-4 border-l-2 border-primary">
                    <div className="grid gap-2">
                      <Label htmlFor="rotation-mode">Rotation Mode</Label>
                      <Select value={rotationMode} onValueChange={(v) => setRotationMode(v as RotationMode)}>
                        <SelectTrigger id="rotation-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one-child-per-interval">One Child Per Interval</SelectItem>
                          <SelectItem value="all-children">All Children</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {rotationMode === 'one-child-per-interval' && 'Only one child is assigned at a time. Rotates after completion.'}
                        {rotationMode === 'all-children' && 'All assigned children must complete it before rotation.'}
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="rotation-order">Rotation Order</Label>
                      <Select value={rotationOrder} onValueChange={(v) => setRotationOrder(v as RotationOrder)}>
                        <SelectTrigger id="rotation-order">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="specific">Specific Order</SelectItem>
                          <SelectItem value="random">Random Order</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {rotationOrder === 'specific' && 'Children rotate in a specific order you define below.'}
                        {rotationOrder === 'random' && 'Children are randomly selected, considering availability.'}
                      </p>
                    </div>

                    {rotationOrder === 'specific' && childrenList.length > 0 && (
                      <div className="grid gap-2">
                        <Label>Child Order (Drag to Reorder)</Label>
                        {!editChore ? (
                          <p className="text-sm text-muted-foreground">
                            Save the chore and assign children first, then edit it to define rotation order.
                          </p>
                        ) : (
                        <div className="space-y-2">
                          {(() => {
                            const chore = editChore as Chore
                            const currentChoreId = chore.id
                            return childrenList
                              .filter(child => {
                                return assignments.some(a => a.choreId === currentChoreId && a.childId === child.id)
                              })
                            .sort((a, b) => {
                              const aIndex = rotationChildOrder.indexOf(a.id)
                              const bIndex = rotationChildOrder.indexOf(b.id)
                              if (aIndex === -1 && bIndex === -1) return 0
                              if (aIndex === -1) return 1
                              if (bIndex === -1) return -1
                              return aIndex - bIndex
                            })
                            .map((child, index) => (
                              <div
                                key={child.id}
                                className="flex items-center gap-2 p-2 bg-muted rounded-md"
                              >
                                <span className="text-sm font-semibold w-6">{index + 1}.</span>
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold"
                                  style={{ backgroundColor: child.avatarColor }}
                                >
                                  {child.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm flex-1">{child.name}</span>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={index === 0}
                                    onClick={() => {
                                      const newOrder = [...rotationChildOrder]
                                      const currentIndex = newOrder.indexOf(child.id)
                                      if (currentIndex > 0) {
                                        [newOrder[currentIndex], newOrder[currentIndex - 1]] = 
                                        [newOrder[currentIndex - 1], newOrder[currentIndex]]
                                        setRotationChildOrder(newOrder)
                                      }
                                    }}
                                  >
                                    ↑
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={index === childrenList.filter(c => 
                                      assignments.some(a => a.choreId === currentChoreId && a.childId === c.id)
                                    ).length - 1}
                                    onClick={() => {
                                      const newOrder = [...rotationChildOrder]
                                      const currentIndex = newOrder.indexOf(child.id)
                                      const maxIndex = childrenList.filter(c => 
                                        assignments.some(a => a.choreId === currentChoreId && a.childId === c.id)
                                      ).length - 1
                                      if (currentIndex < maxIndex && currentIndex !== -1) {
                                        [newOrder[currentIndex], newOrder[currentIndex + 1]] = 
                                        [newOrder[currentIndex + 1], newOrder[currentIndex]]
                                        setRotationChildOrder(newOrder)
                                      }
                                    }}
                                  >
                                    ↓
                                  </Button>
                                </div>
                              </div>
                            ))
                          })()}
                          {(() => {
                            if (!editChore) return null
                            const chore = editChore as Chore
                            const currentChoreId = chore.id
                            return childrenList.filter(child => {
                              return assignments.some(a => a.choreId === currentChoreId && a.childId === child.id)
                            }).length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                Assign children to this chore first to define rotation order.
                              </p>
                            ) : null
                          })()}
                        </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Define the order in which children will take turns with this chore. The system will automatically consider child availability when rotating.
                        </p>
                      </div>
                    )}
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
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <SpeakerHigh className="h-5 w-5 text-muted-foreground" />
                      <Label htmlFor="speak-description" className="text-base font-fredoka font-semibold">
                        Speak Description
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Include description when chore is read aloud (requires speech enabled)
                    </p>
                  </div>
                  <Switch
                    id="speak-description"
                    checked={speakDescription}
                    onCheckedChange={setSpeakDescription}
                  />
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
              <Label htmlFor="emoji">Emoji (optional)</Label>
              <Input
                id="emoji"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="🛏️"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Add an emoji to represent this chore (e.g., 🧹 🍽️ 🧺)
              </p>
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
                  <SelectItem value="rotational">Rotational</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {completionType === 'individual' && 'Each child completes independently for full points'}
                {completionType === 'shareable' && 'Multiple children can complete, with optional limit on max completers'}
                {completionType === 'once-per-day' && 'Only the first child to complete gets the points'}
                {completionType === 'rotational' && 'Chore rotates between assigned children based on order and availability'}
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
                
                <Label htmlFor="reset-period-edit" className="mt-2">Reset Period</Label>
                <Select value={resetPeriod} onValueChange={(v) => setResetPeriod(v as 'daily' | 'weekly' | 'bi-weekly' | 'monthly')}>
                  <SelectTrigger id="reset-period-edit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily (resets at midnight)</SelectItem>
                    <SelectItem value="weekly">Weekly (resets Monday)</SelectItem>
                    <SelectItem value="bi-weekly">Bi-weekly (resets every 2 weeks)</SelectItem>
                    <SelectItem value="monthly">Monthly (resets on 1st)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose when this shareable task resets. Children can complete it anytime during the period.
                </p>
              </div>
            )}
            {completionType === 'rotational' && (
              <div className="grid gap-4 pl-4 border-l-2 border-primary">
                <div className="grid gap-2">
                  <Label htmlFor="rotation-mode-edit">Rotation Mode</Label>
                  <Select value={rotationMode} onValueChange={(v) => setRotationMode(v as RotationMode)}>
                    <SelectTrigger id="rotation-mode-edit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-child-per-interval">One Child Per Interval</SelectItem>
                      <SelectItem value="all-children">All Children</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {rotationMode === 'one-child-per-interval' && 'Only one child is assigned at a time. Rotates after completion.'}
                    {rotationMode === 'all-children' && 'All assigned children must complete it before rotation.'}
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="rotation-order-edit">Rotation Order</Label>
                  <Select value={rotationOrder} onValueChange={(v) => setRotationOrder(v as RotationOrder)}>
                    <SelectTrigger id="rotation-order-edit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="specific">Specific Order</SelectItem>
                      <SelectItem value="random">Random Order</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {rotationOrder === 'specific' && 'Children rotate in a specific order you define below.'}
                    {rotationOrder === 'random' && 'Children are randomly selected, considering availability.'}
                  </p>
                </div>

                {rotationOrder === 'specific' && childrenList.length > 0 && (
                  <div className="grid gap-2">
                    <Label>Child Order (Drag to Reorder)</Label>
                    {!editChore ? (
                      <p className="text-sm text-muted-foreground">
                        Save the chore and assign children first, then edit it to define rotation order.
                      </p>
                    ) : (
                    <div className="space-y-2">
                      {(() => {
                        const chore = editChore as Chore
                        const currentChoreId = chore.id
                        return childrenList
                          .filter(child => {
                            return assignments.some(a => a.choreId === currentChoreId && a.childId === child.id)
                          })
                        .sort((a, b) => {
                          const aIndex = rotationChildOrder.indexOf(a.id)
                          const bIndex = rotationChildOrder.indexOf(b.id)
                          if (aIndex === -1 && bIndex === -1) return 0
                          if (aIndex === -1) return 1
                          if (bIndex === -1) return -1
                          return aIndex - bIndex
                        })
                        .map((child, index) => (
                          <div
                            key={child.id}
                            className="flex items-center gap-2 p-2 bg-muted rounded-md"
                          >
                            <span className="text-sm font-semibold w-6">{index + 1}.</span>
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold"
                              style={{ backgroundColor: child.avatarColor }}
                            >
                              {child.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm flex-1">{child.name}</span>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={index === 0}
                                onClick={() => {
                                  const newOrder = [...rotationChildOrder]
                                  const currentIndex = newOrder.indexOf(child.id)
                                  if (currentIndex > 0) {
                                    [newOrder[currentIndex], newOrder[currentIndex - 1]] = 
                                    [newOrder[currentIndex - 1], newOrder[currentIndex]]
                                    setRotationChildOrder(newOrder)
                                  }
                                }}
                              >
                                ↑
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={index === childrenList.filter(c => 
                                  assignments.some(a => a.choreId === currentChoreId && a.childId === c.id)
                                ).length - 1}
                                onClick={() => {
                                  const newOrder = [...rotationChildOrder]
                                  const currentIndex = newOrder.indexOf(child.id)
                                  const maxIndex = childrenList.filter(c => 
                                    assignments.some(a => a.choreId === currentChoreId && a.childId === c.id)
                                  ).length - 1
                                  if (currentIndex < maxIndex && currentIndex !== -1) {
                                    [newOrder[currentIndex], newOrder[currentIndex + 1]] = 
                                    [newOrder[currentIndex + 1], newOrder[currentIndex]]
                                    setRotationChildOrder(newOrder)
                                  }
                                }}
                              >
                                ↓
                              </Button>
                            </div>
                          </div>
                        ))
                      })()}
                      {(() => {
                        if (!editChore) return null
                        const chore = editChore as Chore
                        const currentChoreId = chore.id
                        return childrenList.filter(child => {
                          return assignments.some(a => a.choreId === currentChoreId && a.childId === child.id)
                        }).length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Assign children to this chore first to define rotation order.
                          </p>
                        ) : null
                      })()}
                    </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Define the order in which children will take turns with this chore. The system will automatically consider child availability when rotating.
                    </p>
                  </div>
                )}
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
            
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-fredoka font-semibold">
                      School Holiday Settings
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Control when this chore appears based on school holidays
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inactive-on-holidays-edit"
                    checked={inactiveOnSchoolHolidays}
                    onCheckedChange={(checked) => {
                      setInactiveOnSchoolHolidays(checked as boolean)
                      if (checked) {
                        setOnlyOnSchoolHolidays(false)
                      }
                    }}
                  />
                  <Label
                    htmlFor="inactive-on-holidays-edit"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Inactive On School Holidays
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  This chore will not appear during school holidays
                </p>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="only-on-holidays-edit"
                    checked={onlyOnSchoolHolidays}
                    onCheckedChange={(checked) => {
                      setOnlyOnSchoolHolidays(checked as boolean)
                      if (checked) {
                        setInactiveOnSchoolHolidays(false)
                      }
                    }}
                  />
                  <Label
                    htmlFor="only-on-holidays-edit"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Only On School Holidays
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  This chore will only appear during school holidays
                </p>
                
                {(inactiveOnSchoolHolidays || onlyOnSchoolHolidays) && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      School holidays can be managed in the Parent Panel settings
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <SpeakerHigh className="h-5 w-5 text-muted-foreground" />
                  <Label htmlFor="speak-description-edit" className="text-base font-fredoka font-semibold">
                    Speak Description
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Include description when chore is read aloud (requires speech enabled)
                </p>
              </div>
              <Switch
                id="speak-description-edit"
                checked={speakDescription}
                onCheckedChange={setSpeakDescription}
              />
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
                        <span className="font-medium flex-1">{child.name}</span>
                        {isAssigned && assignment && onEditAssignment && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation()
                              setEditingChildAssignment(assignment)
                              setEditingAssignmentChild(child)
                            }}
                          >
                            <PencilSimple className="h-3.5 w-3.5 mr-1" />
                            Edit Schedule
                          </Button>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {editChore && onEditAssignment && (
          <EditAssignmentDialog
            assignment={editingChildAssignment}
            choreName={getChoreName(editChore)}
            open={!!editingChildAssignment}
            onClose={() => {
              setEditingChildAssignment(null)
              setEditingAssignmentChild(null)
            }}
            onSave={onEditAssignment}
            chore={editChore}
            child={editingAssignmentChild || undefined}
            chorePoints={editChore.points}
            choreCategories={getChoreCategories(editChore)}
            categories={categories}
          />
        )}

        {editChore && childrenList.length > 0 && (
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
          <Button onClick={handleSave} disabled={!name || !name.trim()}>
            {editChore ? 'Save Changes' : 'Add Chore'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
