import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash, Star, ListChecks, CalendarBlank } from '@phosphor-icons/react'
import { Child, Category } from '@/lib/types'

interface ChildCardProps {
  child: Child
  totalPoints: number
  onEdit: (child: Child) => void
  onDelete: (childId: string) => void
  onClick: (child: Child) => void
  onDownloadICS?: (child: Child) => void
  categoryPoints?: Map<string, number>
  categories?: Category[]
}

export function ChildCard({ child, totalPoints, onEdit, onDelete, onClick, onDownloadICS, categoryPoints, categories = [] }: ChildCardProps) {
  const initials = child.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-12 w-12" style={{ backgroundColor: child.avatarColor }}>
              <AvatarFallback className="text-white font-fredoka text-lg bg-transparent">
                {initials}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl font-fredoka">{child.name}</CardTitle>
          </div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {onDownloadICS && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onDownloadICS(child)}
                title="Download ICS Calendar Feed"
              >
                <CalendarBlank className="h-4 w-4" />
              </Button>
            )}
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
      <CardContent className="pb-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Star weight="fill" className="h-5 w-5 text-accent" />
            <Badge variant="secondary" className="font-fredoka text-base">
              {totalPoints} total points
            </Badge>
          </div>
          {categoryPoints && categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const points = categoryPoints.get(category.id) || 0
                return (
                  <Badge
                    key={category.id}
                    variant="outline"
                    className="font-fredoka text-sm"
                    style={{ borderColor: category.color, color: category.color }}
                  >
                    {category.name}: {points}
                  </Badge>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          variant="outline" 
          className="w-full font-fredoka"
          onClick={() => onClick(child)}
        >
          <ListChecks className="h-4 w-4 mr-2" />
          Manage Chores
        </Button>
      </CardFooter>
    </Card>
  )
}
