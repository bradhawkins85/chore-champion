import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Child } from '@/lib/types'

interface ChildSelectorProps {
  children: Child[]
  childPoints: Map<string, number>
  onSelect: (child: Child) => void
}

export function ChildSelector({ children, childPoints, onSelect }: ChildSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 p-8">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-fredoka font-bold text-center mb-12 text-foreground"
        >
          Who's ready for chores?
        </motion.h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child, index) => {
            const initials = child.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            return (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="cursor-pointer hover:scale-105 transition-all hover:shadow-2xl"
                  onClick={() => onSelect(child)}
                >
                  <CardContent className="p-8 text-center">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Avatar
                        className="h-24 w-24 mx-auto mb-4"
                        style={{ backgroundColor: child.avatarColor }}
                      >
                        <AvatarFallback className="text-white font-fredoka text-3xl bg-transparent">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <h2 className="text-3xl font-fredoka font-bold mb-2">
                      {child.name}
                    </h2>
                    <p className="text-2xl font-fredoka text-accent">
                      {childPoints.get(child.id) || 0} ⭐
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
