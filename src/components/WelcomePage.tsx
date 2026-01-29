import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Star, Trophy, Gift, Shield, TrendUp } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface WelcomePageProps {
  currentIP: string | null
  onPinSubmit: (pin: string) => void
}

export function WelcomePage({ currentIP, onPinSubmit }: WelcomePageProps) {
  const [pin, setPin] = useState('')
  const [showPinInput, setShowPinInput] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length < 4) {
      toast.error('PIN must be at least 4 characters')
      return
    }
    onPinSubmit(pin)
  }

  const features = [
    {
      icon: <Trophy className="h-8 w-8" />,
      title: 'Chore Tracking',
      description: 'Create and assign chores to each child with customizable points and schedules',
    },
    {
      icon: <Star className="h-8 w-8" />,
      title: 'Points System',
      description: 'Children earn points for completing chores and can track their progress',
    },
    {
      icon: <Gift className="h-8 w-8" />,
      title: 'Reward Shop',
      description: 'Set up rewards that children can purchase with their earned points',
    },
    {
      icon: <TrendUp className="h-8 w-8" />,
      title: 'Goal Tracking',
      description: 'Kids can set goals and watch their progress towards special rewards',
    },
    {
      icon: <CheckCircle className="h-8 w-8" />,
      title: 'Parent Approval',
      description: 'Optional approval system for chores that need verification',
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: 'Multi-Device Support',
      description: 'Configure different child profiles for each device in your home',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-fredoka font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ChoreQuest
          </h1>
          <p className="text-2xl text-muted-foreground">
            Make chores fun and rewarding for the whole family
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="text-primary">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="max-w-md mx-auto border-2 border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Access Required</CardTitle>
            <CardDescription>
              {currentIP ? (
                <>Your IP address ({currentIP}) is not authorized to access this application.</>
              ) : (
                <>Unable to detect your IP address. Access is restricted.</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showPinInput ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="access-pin">Access PIN</Label>
                  <Input
                    id="access-pin"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter access PIN"
                    autoFocus
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the access PIN to override IP restrictions
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowPinInput(false)
                      setPin('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Access App
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  If you have an access PIN, you can use it to override the IP restriction.
                </p>
                <Button
                  onClick={() => setShowPinInput(true)}
                  className="w-full"
                  size="lg"
                >
                  Enter Access PIN
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Contact the administrator to add your IP address to the allowed list.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
