import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SchoolHoliday, SchoolHolidayCountdownSettings } from '@/lib/types'
import { format } from 'date-fns'
import { getActiveSchoolHoliday, getNextSchoolHoliday, getCalendarDaysUntil, getSchoolDaysUntil, getRemainingHolidayDays } from '@/lib/helpers'
import { CalendarBlank } from '@phosphor-icons/react'

interface SchoolHolidayCountdownCardProps {
  holidays: SchoolHoliday[]
  settings: SchoolHolidayCountdownSettings
}

export function SchoolHolidayCountdownCard({ holidays, settings }: SchoolHolidayCountdownCardProps) {
  if (!settings.enabled) {
    return null
  }

  const today = new Date()
  const activeHoliday = getActiveSchoolHoliday(today, holidays)

  if (activeHoliday) {
    const remainingDays = getRemainingHolidayDays(today, activeHoliday)
    const activeEmoji = activeHoliday.emoji?.trim()
    return (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarBlank className="h-5 w-5 text-primary" />
            {activeEmoji && <span className="text-xl" aria-hidden="true">{activeEmoji}</span>}
            {activeHoliday.name} is on
          </CardTitle>
          <CardDescription>
            {format(new Date(activeHoliday.startDate), 'MMM d, yyyy')} -{' '}
            {format(new Date(activeHoliday.endDate), 'MMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings.showRemainingDays ? (
            <p className="text-2xl font-fredoka text-accent">
              {remainingDays} {remainingDays === 1 ? 'day' : 'days'} remaining
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Enjoy the break!</p>
          )}
        </CardContent>
      </Card>
    )
  }

  const nextHoliday = getNextSchoolHoliday(today, holidays)
  if (!nextHoliday) {
    return (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarBlank className="h-5 w-5 text-primary" />
            School Holidays
          </CardTitle>
          <CardDescription>No upcoming holidays yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Add holiday dates in settings.</p>
        </CardContent>
      </Card>
    )
  }

  const countdown = settings.countdownMode === 'school-days'
    ? getSchoolDaysUntil(today, new Date(nextHoliday.startDate))
    : getCalendarDaysUntil(today, new Date(nextHoliday.startDate))

  const countdownLabel = settings.countdownMode === 'school-days' ? 'School days' : 'Days'

  const nextEmoji = nextHoliday.emoji?.trim()
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarBlank className="h-5 w-5 text-primary" />
          {nextEmoji && <span className="text-xl" aria-hidden="true">{nextEmoji}</span>}
          {nextHoliday.name} is coming up
        </CardTitle>
        <CardDescription>
          {format(new Date(nextHoliday.startDate), 'MMM d, yyyy')} -{' '}
          {format(new Date(nextHoliday.endDate), 'MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-fredoka text-accent">
          {countdown} {countdownLabel} until break
        </p>
      </CardContent>
    </Card>
  )
}
