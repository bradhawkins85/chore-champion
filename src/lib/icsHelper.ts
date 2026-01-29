import { Child, Chore, ChoreAssignment, ChoreCompletion } from './types'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: Date
  points?: number
  categoryColors?: string[]
  type: 'completion' | 'milestone' | 'calendar'
  location?: string
  endDate?: Date
}

export interface ICSEvent {
  uid: string
  summary: string
  description?: string
  dtstart: Date
  dtend?: Date
  location?: string
  rrule?: string
}

export async function fetchICSFeed(url: string): Promise<ICSEvent[]> {
  try {
    let response: Response
    
    try {
      response = await fetch(url, {
        mode: 'cors',
        headers: {
          'Accept': 'text/calendar, text/plain, */*',
        },
      })
    } catch (corsError) {
      console.warn('Direct fetch failed, trying CORS proxy:', corsError)
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`
      response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'text/calendar, text/plain, */*',
        },
      })
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ICS feed: ${response.status} ${response.statusText}`)
    }
    
    const icsText = await response.text()
    console.log('ICS feed raw text length:', icsText.length)
    
    if (!icsText || icsText.trim().length === 0) {
      console.warn('ICS feed is empty')
      return []
    }
    
    if (!icsText.includes('BEGIN:VCALENDAR')) {
      console.warn('Invalid ICS format: missing VCALENDAR')
      console.log('First 200 chars:', icsText.substring(0, 200))
      return []
    }
    
    const events = parseICS(icsText)
    console.log(`Parsed ${events.length} events from ICS feed`)
    return events
  } catch (error) {
    console.error('Error fetching ICS feed:', error)
    throw error
  }
}

export function parseICS(icsText: string): ICSEvent[] {
  const events: ICSEvent[] = []
  const lines = icsText.split(/\r?\n/)
  
  let inEvent = false
  let currentEvent: Partial<ICSEvent> = {}
  let currentField = ''
  let currentValue = ''
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()
    
    if (!line) continue
    
    if (line.startsWith(' ') || line.startsWith('\t')) {
      currentValue += line.substring(1)
      continue
    }
    
    if (currentField && currentValue) {
      processField(currentEvent, currentField, currentValue)
      currentField = ''
      currentValue = ''
    }
    
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {}
    } else if (line === 'END:VEVENT') {
      if (currentField && currentValue) {
        processField(currentEvent, currentField, currentValue)
        currentField = ''
        currentValue = ''
      }
      if (currentEvent.uid && currentEvent.summary && currentEvent.dtstart) {
        events.push(currentEvent as ICSEvent)
      } else {
        console.warn('Skipping incomplete event:', currentEvent)
      }
      inEvent = false
      currentEvent = {}
    } else if (inEvent && line.includes(':')) {
      const colonIndex = line.indexOf(':')
      currentField = line.substring(0, colonIndex)
      currentValue = line.substring(colonIndex + 1)
    }
  }
  
  console.log(`Parsed ${events.length} complete events from ICS data`)
  return events
}

function processField(event: Partial<ICSEvent>, field: string, value: string) {
  const fieldName = field.split(';')[0]
  
  switch (fieldName) {
    case 'UID':
      event.uid = value
      break
    case 'SUMMARY':
      event.summary = value
      break
    case 'DESCRIPTION':
      event.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';')
      break
    case 'DTSTART':
      event.dtstart = parseICSDate(value, field)
      break
    case 'DTEND':
      event.dtend = parseICSDate(value, field)
      break
    case 'LOCATION':
      event.location = value
      break
    case 'RRULE':
      event.rrule = value
      break
  }
}

function parseICSDate(value: string, field: string): Date {
  const isDate = field.includes('VALUE=DATE')
  
  if (value.length < 8) {
    return new Date()
  }
  
  if (isDate) {
    const year = parseInt(value.substring(0, 4))
    const month = parseInt(value.substring(4, 6)) - 1
    const day = parseInt(value.substring(6, 8))
    return new Date(year, month, day, 0, 0, 0, 0)
  }
  
  if (value.endsWith('Z')) {
    const year = parseInt(value.substring(0, 4))
    const month = parseInt(value.substring(4, 6)) - 1
    const day = parseInt(value.substring(6, 8))
    const hour = value.length > 9 ? parseInt(value.substring(9, 11)) : 0
    const minute = value.length > 11 ? parseInt(value.substring(11, 13)) : 0
    const second = value.length > 13 ? parseInt(value.substring(13, 15)) : 0
    return new Date(Date.UTC(year, month, day, hour, minute, second))
  }
  
  const year = parseInt(value.substring(0, 4))
  const month = parseInt(value.substring(4, 6)) - 1
  const day = parseInt(value.substring(6, 8))
  
  if (value.length <= 8) {
    return new Date(year, month, day, 0, 0, 0, 0)
  }
  
  const hour = value.length > 9 ? parseInt(value.substring(9, 11)) : 0
  const minute = value.length > 11 ? parseInt(value.substring(11, 13)) : 0
  const second = value.length > 13 ? parseInt(value.substring(13, 15)) : 0
  
  return new Date(year, month, day, hour, minute, second)
}

export function getICSEventsForToday(icsEvents: ICSEvent[]): CalendarEvent[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const calendarEvents: CalendarEvent[] = []
  
  icsEvents.forEach(event => {
    const eventDate = new Date(event.dtstart)
    eventDate.setHours(0, 0, 0, 0)
    
    if (eventDate.getTime() === today.getTime()) {
      calendarEvents.push({
        id: event.uid,
        title: event.summary,
        description: event.description,
        date: event.dtstart,
        endDate: event.dtend,
        location: event.location,
        type: 'calendar'
      })
    }
  })
  
  return calendarEvents
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
