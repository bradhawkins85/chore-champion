import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CelebrationSettings, CelebrationAnimation } from '@/lib/types'
import { Sparkle } from '@phosphor-icons/react'

interface CelebrationSettingsProps {
  settings: CelebrationSettings
  onUpdate: (settings: CelebrationSettings) => void
}

const animationDetails: Record<CelebrationAnimation, { name: string; description: string; emoji: string }> = {
  confetti: {
    name: 'Confetti',
    description: 'Colorful confetti rains from the top',
    emoji: '🎊',
  },
  fireworks: {
    name: 'Fireworks',
    description: 'Bursting firework explosions',
    emoji: '🎆',
  },
  sparkles: {
    name: 'Sparkles',
    description: 'Twinkling sparkles appear everywhere',
    emoji: '✨',
  },
  stars: {
    name: 'Stars',
    description: 'Stars fall from the sky',
    emoji: '⭐',
  },
  bubbles: {
    name: 'Bubbles',
    description: 'Bubbles float up from the bottom',
    emoji: '🫧',
  },
  hearts: {
    name: 'Hearts',
    description: 'Hearts float upward',
    emoji: '💖',
  },
}

export function CelebrationSettingsComponent({ settings, onUpdate }: CelebrationSettingsProps) {
  const handleToggleEnabled = () => {
    onUpdate({
      ...settings,
      enabled: !settings.enabled,
    })
  }

  const handleToggleAnimation = (animation: CelebrationAnimation) => {
    onUpdate({
      ...settings,
      animations: {
        ...settings.animations,
        [animation]: !settings.animations[animation],
      },
    })
  }

  const enabledAnimationsCount = Object.values(settings.animations).filter(Boolean).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-fredoka">
          <Sparkle className="h-5 w-5 text-accent" />
          Celebration Effects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="celebration-enabled" className="text-base font-medium">
              Enable Celebrations
            </Label>
            <p className="text-sm text-muted-foreground">
              Show fun animations when children complete chores
            </p>
          </div>
          <Switch
            id="celebration-enabled"
            checked={settings.enabled}
            onCheckedChange={handleToggleEnabled}
          />
        </div>

        {settings.enabled && (
          <>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium">Animation Types</h4>
                <Badge variant="secondary">
                  {enabledAnimationsCount} enabled
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                When enabled, a random animation from the selected types will play
              </p>
              <div className="space-y-3">
                {(Object.keys(animationDetails) as CelebrationAnimation[]).map((animation) => {
                  const details = animationDetails[animation]
                  return (
                    <div
                      key={animation}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{details.emoji}</span>
                        <div>
                          <Label
                            htmlFor={`animation-${animation}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {details.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {details.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id={`animation-${animation}`}
                        checked={settings.animations[animation]}
                        onCheckedChange={() => handleToggleAnimation(animation)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
