import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListNumbers } from '@phosphor-icons/react'
import { Child } from '@/lib/types'

interface DailyOrderCardProps {
  children: Child[]
}

function getDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getTodayDateString(): string {
  return getDateString(new Date())
}

function getYesterdayDateString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return getDateString(yesterday)
}

function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash | 0 // Keep as 32-bit integer
  }
  return hash >>> 0
}

// Knuth's multiplicative hash constant for 32-bit integers.
// Used to spread attempt numbers far apart across the seed space so that
// consecutive attempts produce very different shuffle outputs.
const KNUTH_HASH_CONSTANT = 2654435761

// Linear Congruential Generator using Numerical Recipes parameters
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = Math.imul(1664525, s) + 1013904223 | 0
    return (s >>> 0) / 4294967296
  }
}

function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const shuffled = [...array]
  const rand = seededRandom(seed)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function DailyOrderCard({ children }: DailyOrderCardProps) {
  const activeChildren = children.filter(c => c.isActive !== false)

  if (activeChildren.length < 2) return null

  const today = getTodayDateString()
  const yesterday = getYesterdayDateString()
  const sortedIds = activeChildren.map(c => c.id).sort()

  // Compute yesterday's order so we can guarantee today's differs
  const yesterdaySeed = hashString(`${yesterday}:${sortedIds.join(',')}`)
  const yesterdayOrderedIds = shuffleWithSeed(sortedIds, yesterdaySeed)

  // Keep retrying with increasingly diverse seeds until today's order differs from yesterday's.
  // Simple incrementing suffixes produce near-consecutive hash values that the LCG maps to the
  // same ordering, so we XOR with a Knuth multiplicative hash constant to spread attempts far apart.
  // This ensures the displayed order always changes each day, even for small families where
  // a collision is statistically likely (50% chance with 2 children, ~17% with 3 children).
  // The retry limit of sortedIds.length * 10 is far more than needed: for n children there are
  // n! possible orderings, and each XOR'd seed covers a distinct region of the 32-bit space, so
  // in practice the correct ordering is found within the first 2-3 attempts.
  const baseSeed = hashString(`${today}:${sortedIds.join(',')}`)
  let attempt = 0
  let orderedIds: string[]
  do {
    const seed = attempt === 0
      ? baseSeed
      : (baseSeed ^ ((Math.imul(attempt, KNUTH_HASH_CONSTANT)) >>> 0)) >>> 0
    orderedIds = shuffleWithSeed(sortedIds, seed)
    attempt++
  } while (
    attempt <= sortedIds.length * 10 &&
    orderedIds.join(',') === yesterdayOrderedIds.join(',')
  )

  const childMap = new Map(activeChildren.map(c => [c.id, c]))
  const orderedChildren = orderedIds.map(id => childMap.get(id)!)

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListNumbers className="h-5 w-5 text-primary" />
          Today's Order
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-1">
          {orderedChildren.map((child, index) => (
            <li key={child.id} className="flex items-center gap-2">
              <span className="font-fredoka font-bold text-lg text-primary">{index + 1}.</span>
              <span className="font-inter text-foreground">{child.name}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
