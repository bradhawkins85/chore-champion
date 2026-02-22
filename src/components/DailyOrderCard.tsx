import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListNumbers } from '@phosphor-icons/react'
import { Child } from '@/lib/types'

interface DailyOrderCardProps {
  children: Child[]
}

function getTodayDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash | 0 // Keep as 32-bit integer
  }
  return hash >>> 0
}

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
  const sortedIds = activeChildren.map(c => c.id).sort()
  const seed = hashString(`${today}:${sortedIds.join(',')}`)
  const orderedIds = shuffleWithSeed(sortedIds, seed)
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
