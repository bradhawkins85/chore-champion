import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Star, Trophy, Gift, Shield, TrendUp, EnvelopeSimple, Sparkle, Calendar, ChartBar, ChartLine, Users, Medal } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useApiKV } from '@/hooks/use-api-kv'
import { defaultHomepageContent, normalizeHomepageContent, type HomepageSectionId } from '@/lib/homepageContent'

// Define feature cards with IDs outside component to prevent recreation on every render
const featureDefinitions: Record<string, { icon: React.ReactNode; title: string; description: string }> = {
  'chore-tracking': {
    icon: <Trophy className="h-8 w-8" />,
    title: 'Chore Tracking',
    description: 'Create and assign chores to each child with customizable points and schedules',
  },
  'points-system': {
    icon: <Star className="h-8 w-8" />,
    title: 'Points System',
    description: 'Children earn points for completing chores and can track their progress',
  },
  'reward-shop': {
    icon: <Gift className="h-8 w-8" />,
    title: 'Reward Shop',
    description: 'Set up rewards that children can purchase with their earned points',
  },
  'goal-tracking': {
    icon: <TrendUp className="h-8 w-8" />,
    title: 'Goal Tracking',
    description: 'Kids can set goals and watch their progress towards special rewards',
  },
  'parent-approval': {
    icon: <CheckCircle className="h-8 w-8" />,
    title: 'Parent Approval',
    description: 'Optional approval system for chores that need verification',
  },
  'multi-device': {
    icon: <Shield className="h-8 w-8" />,
    title: 'Multi-Device Support',
    description: 'Configure different child profiles for each device in your home',
  },
  'weekly-completions': {
    icon: <Users className="h-8 w-8" />,
    title: 'Weekly Completions',
    description: 'Total chores completed this week',
  },
  'points-earned': {
    icon: <Sparkle className="h-8 w-8" />,
    title: 'Points Earned',
    description: 'Total points earned this week',
  },
  'top-performer': {
    icon: <Medal className="h-8 w-8" />,
    title: 'Top Performer',
    description: 'This week\'s highest achiever',
  },
  'points-comparison': {
    icon: <ChartLine className="h-8 w-8" />,
    title: 'Points Comparison',
    description: 'This week vs last week',
  },
  'daily-activity': {
    icon: <ChartBar className="h-8 w-8" />,
    title: 'Daily Activity',
    description: 'Chores completed each day this week',
  },
  'weekly-report': {
    icon: <Calendar className="h-8 w-8" />,
    title: 'Child\'s Weekly Report',
    description: 'Detailed weekly summary and statistics',
  },
}


const homepageSectionRenderOrder: HomepageSectionId[] = ['hero', 'features', 'access']

interface WelcomePageProps {
  currentIP: string | null
  onPinSubmit: (pin: string) => void
  onRequestAccess?: (parentPin: string) => Promise<void>
}

export function WelcomePage({ currentIP, onPinSubmit, onRequestAccess }: WelcomePageProps) {
  const [pin, setPin] = useState('')
  const [parentPin, setParentPin] = useState('')
  const [showPinInput, setShowPinInput] = useState(false)
  const [showRequestAccess, setShowRequestAccess] = useState(false)
  const [isRequestingAccess, setIsRequestingAccess] = useState(false)

  const [homepageContent] = useApiKV('homepageContent', defaultHomepageContent)
  const normalizedHomepageContent = useMemo(() => normalizeHomepageContent(homepageContent), [homepageContent])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length < 4) {
      toast.error('PIN must be at least 4 characters')
      return
    }
    onPinSubmit(pin)
  }

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parentPin || parentPin.length < 4) {
      toast.error('Parent PIN must be at least 4 characters')
      return
    }
    
    if (!onRequestAccess) {
      toast.error('Request access feature is not available')
      return
    }

    setIsRequestingAccess(true)
    try {
      await onRequestAccess(parentPin)
      setParentPin('')
      setShowRequestAccess(false)
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsRequestingAccess(false)
    }
  }

  const features = useMemo(() => {
    return normalizedHomepageContent.cards
      .filter((card) => featureDefinitions[card.id])
      .map((card) => ({
      id: card.id,
      ...featureDefinitions[card.id],
      title: card.title,
      description: card.description,
      imageUrl: card.imageUrl,
    }))
  }, [normalizedHomepageContent.cards])

  const sectionOrder = normalizedHomepageContent.sectionOrder.filter((section, index, array) =>
    homepageSectionRenderOrder.includes(section) && array.indexOf(section) === index,
  )

  const orderedSections = [
    ...sectionOrder,
    ...homepageSectionRenderOrder.filter((section) => !sectionOrder.includes(section)),
  ]

  const renderSection = (section: HomepageSectionId) => {
    if (section === 'hero') {
      return (
        <div key="hero" className="text-center mb-12">
          <h1 className="text-6xl font-fredoka font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {normalizedHomepageContent.heading}
          </h1>
          <p className="text-2xl text-muted-foreground">
            {normalizedHomepageContent.subheading}
          </p>
        </div>
      )
    }

    if (section === 'features') {
      return (
        <div key="features" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => (
            <Card key={feature.id} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="text-primary">
                    {feature.imageUrl ? (
                      <img src={feature.imageUrl} alt={feature.title} className="h-10 w-10 rounded-md object-cover" />
                    ) : feature.icon}
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
      )
    }

    return (
      <Card key="access" className="max-w-md mx-auto border-2 border-primary/20 mb-12">
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
          ) : showRequestAccess ? (
            <form onSubmit={handleRequestAccess} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parent-pin">Parent PIN</Label>
                <Input
                  id="parent-pin"
                  type="password"
                  value={parentPin}
                  onChange={(e) => setParentPin(e.target.value)}
                  placeholder="Enter parent PIN"
                  autoFocus
                  disabled={isRequestingAccess}
                />
                <p className="text-sm text-muted-foreground">
                  Enter your parent PIN to request access approval. An email will be sent to the primary parent with a link to approve this IP address.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowRequestAccess(false)
                    setParentPin('')
                  }}
                  disabled={isRequestingAccess}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isRequestingAccess}>
                  {isRequestingAccess ? 'Requesting...' : 'Request Access'}
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

              {onRequestAccess && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowRequestAccess(true)}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <EnvelopeSimple className="mr-2 h-4 w-4" />
                    Request Access Approval
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {orderedSections.map((section) => renderSection(section))}
      </div>
    </div>
  )
}
