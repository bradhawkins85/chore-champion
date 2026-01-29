import { Child, Chore, ChoreAssignment, ChoreCompletion } from './types'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: Date
  points?: number
  categoryColors?: string[]
  type: 'completion' | 'milestone'
}

export function getEventsForDate(
  date: Date,
  childId: string,
  completions: ChoreCompletion[],
  chores: Chore[],
  assignments: ChoreAssignment[]
): CalendarEvent[] {
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  const nextDay = new Date(targetDate)
  nextDay.setDate(nextDay.getDate() + 1)

  const choresMap = new Map(chores.map(c => [c.id, c]))
  const events: CalendarEvent[] = []

  const childCompletions = completions.filter(c => {
    if (c.childId !== childId) return false
    const completionDate = new Date(c.completedAt)
    completionDate.setHours(0, 0, 0, 0)
    return completionDate.getTime() === targetDate.getTime()
  })

  childCompletions.forEach(completion => {
    const chore = choresMap.get(completion.choreId)
    if (!chore) return

    const assignment = assignments.find(a => a.id === completion.choreId && a.childId === childId)
    
    let points = chore.points
    if (assignment?.pointOverrides) {
      const override = assignment.pointOverrides.find(o => o.childId === childId)
      if (override) points = override.points
    }

    const categoryColors = chore.categoryIds?.map(catId => {
      return catId
    }) || []

    events.push({
      id: completion.id,
      title: chore.name,
      description: chore.description,
      date: new Date(completion.completedAt),
      points,
      categoryColors,
      type: 'completion'
    })
  })

  return events
}

export function generateICSFeed(
  child: Child,
  completions: ChoreCompletion[],
  chores: Chore[],
  assignments: ChoreAssignment[]
): string {
  const now = new Date()
  const choresMap = new Map(chores.map(c => [c.id, c]))
  
  const childCompletions = completions.filter(c => c.childId === child.id)
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChoreQuest//Chore Completions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${child.name}'s Chores`,
    'X-WR-TIMEZONE:UTC',
    'X-WR-CALDESC:Chore completion history for ChoreQuest'
  ]

  childCompletions.forEach(completion => {
    const chore = choresMap.get(completion.choreId)
    if (!chore) return

    const assignment = assignments.find(a => a.choreId === completion.choreId && a.childId === child.id)
    
    let points = chore.points
    if (assignment?.pointOverrides) {
      const override = assignment.pointOverrides.find(o => o.childId === child.id)
      if (override) points = override.points
    }

    const completedDate = new Date(completion.completedAt)
    const dtstart = formatICSDate(completedDate)
    const dtend = formatICSDate(new Date(completedDate.getTime() + 60000))
    const dtstamp = formatICSDate(now)
    const uid = `${completion.id}@chorequest.app`

    const description = chore.description 
      ? `${chore.description}\\n\\nPoints earned: ${points}`
      : `Points earned: ${points}`

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:✓ ${chore.name}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    )
  })

  icsContent.push('END:VCALENDAR')
  
  return icsContent.join('\r\n')
}

function formatICSDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

export function downloadICSFile(child: Child, icsContent: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${child.name.replace(/\s+/g, '_')}_chores.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function getHistoricalDates(completions: ChoreCompletion[], childId: string): Date[] {
  const dates = new Set<string>()
  
  completions
    .filter(c => c.childId === childId)
    .forEach(c => {
      const date = new Date(c.completedAt)
      date.setHours(0, 0, 0, 0)
      dates.add(date.toISOString())
    })
  
  return Array.from(dates)
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime())
}
