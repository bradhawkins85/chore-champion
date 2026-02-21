import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListNumbers } from '@phosphor-icons/react'
import { Child } from '@/lib/types'
import { useApiKV as useKV } from '@/hooks/use-api-kv'

const MAX_SHUFFLE_ATTEMPTS = 20

interface DailyOrderState {
  date: string
  order: string[]
  previousOrder: string[]
}

interface DailyOrderCardProps {
  children: Child[]
}

function getTodayDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function generateNewOrder(childIds: string[], previousOrder: string[]): string[] {
  if (childIds.length <= 1) return [...childIds]
  let newOrder = shuffleArray(childIds)
  let attempts = 0
  while (attempts < MAX_SHUFFLE_ATTEMPTS && newOrder.join(',') === previousOrder.join(',')) {
    newOrder = shuffleArray(childIds)
    attempts++
  }
  return newOrder
}

export function DailyOrderCard({ children }: DailyOrderCardProps) {
  const [dailyOrderState, setDailyOrderState] = useKV<DailyOrderState | null>('daily-order-state', null)

  const activeChildren = children.filter(c => c.isActive !== false)
  const activeChildIdKey = activeChildren.map(c => c.id).sort().join(',')

  useEffect(() => {
    if (activeChildren.length === 0) return

    const today = getTodayDateString()
    const childIds = activeChildIdKey.split(',').filter(Boolean)

    if (!dailyOrderState || dailyOrderState.date !== today) {
      const previousOrder = dailyOrderState?.order ?? []
      const newOrder = generateNewOrder(childIds, previousOrder)
      setDailyOrderState({
        date: today,
        order: newOrder,
        previousOrder,
      })
    }
  // activeChildIdKey tracks child additions, removals, and ID changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChildIdKey, dailyOrderState?.date, setDailyOrderState])

  if (activeChildren.length < 2) return null

  const today = getTodayDateString()
  let orderedChildren: Child[]

  if (dailyOrderState && dailyOrderState.date === today && dailyOrderState.order.length > 0) {
    const childMap = new Map(activeChildren.map(c => [c.id, c]))
    const validIds = dailyOrderState.order.filter(id => childMap.has(id))
    orderedChildren = validIds.map(id => childMap.get(id)!)
    const newChildren = activeChildren.filter(c => !dailyOrderState.order.includes(c.id))
    orderedChildren = [...orderedChildren, ...newChildren]
  } else {
    orderedChildren = activeChildren
  }

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
