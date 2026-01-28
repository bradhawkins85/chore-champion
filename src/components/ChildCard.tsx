import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash, Star } from '@phosphor-icons/react'
import { Child } from '@/lib/types'

interface ChildCardProps {
  child: Child
  totalPoints: number
  onEdit: (child: Child) => void
  onDelete: (childId: string) => void
  onClick: (child: Child) => void
}

export function ChildCard({ child, totalPoints, onEdit, onDelete, onClick }: ChildCardProps) {
  const initials = child.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onClick(child)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1" onClick={(e) => e.stopPropagation()}>
            <Avatar className="h-12 w-12" style={{ backgroundColor: child.avatarColor }}>
              <AvatarFallback className="text-white font-fredoka text-lg bg-transparent">
                {initials}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl font-fredoka">{child.name}</CardTitle>
          </div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(child)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onDelete(child.id)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Star weight="fill" className="h-5 w-5 text-accent" />
          <Badge variant="secondary" className="font-fredoka text-base">
            {totalPoints} points
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
