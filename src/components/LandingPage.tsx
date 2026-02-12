import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Star,
  Gift,
  TrendUp,
  CheckCircle,
  Shield,
  Users,
  Calendar,
  ChartBar,
  Sparkle,
  Medal,
  Bell,
  Lock,
  DeviceMobile,
  ArrowRight,
  Check,
} from '@phosphor-icons/react'

interface LandingPageProps {
  onGetStarted: () => void
  onLogin: () => void
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const features = [
    {
      icon: <Trophy className="h-12 w-12" weight="duotone" />,
      title: 'Smart Chore Tracking',
      description: 'Create and assign chores with flexible scheduling. Set up daily, weekly, or custom patterns that work for your family.',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      icon: <Star className="h-12 w-12" weight="duotone" />,
      title: 'Engaging Points System',
      description: 'Kids earn points for completing chores. Multiple point categories let you customize rewards for different achievements.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <Gift className="h-12 w-12" weight="duotone" />,
      title: 'Reward Shop',
      description: 'Set up a virtual shop where kids can spend earned points on rewards they love. Track purchases and fulfillment easily.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: <Users className="h-12 w-12" weight="duotone" />,
      title: 'Rotational Chores',
      description: 'Automatically rotate chores between children to keep things fair and teach new skills to everyone.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: <ChartBar className="h-12 w-12" weight="duotone" />,
      title: 'Progress Analytics',
      description: 'Track completion rates, points earned, and family progress with beautiful charts and weekly reports.',
      color: 'from-indigo-500 to-violet-500',
    },
    {
      icon: <Shield className="h-12 w-12" weight="duotone" />,
      title: 'Multi-Parent Access',
      description: 'Invite another parent to co-manage the account. Secure authentication with optional biometric support.',
      color: 'from-red-500 to-rose-500',
    },
  ]

  const benefits = [
    { icon: <Check className="h-5 w-5" />, text: 'Child-friendly tablet-optimized interface' },
    { icon: <Check className="h-5 w-5" />, text: 'Parent dashboard with full control' },
    { icon: <Check className="h-5 w-5" />, text: 'Celebration animations on completion' },
    { icon: <Check className="h-5 w-5" />, text: 'Weather integration & seasonal themes' },
    { icon: <Check className="h-5 w-5" />, text: 'Calendar integration for events' },
    { icon: <Check className="h-5 w-5" />, text: 'Email alerts and notifications' },
    { icon: <Check className="h-5 w-5" />, text: 'Progressive Web App - install on any device' },
    { icon: <Check className="h-5 w-5" />, text: 'Secure PIN protection & IP restrictions' },
  ]

  const stats = [
    { value: '100%', label: 'Open Source' },
    { value: 'Free', label: 'Forever' },
    { value: 'PWA', label: 'Install Anywhere' },
    { value: '∞', label: 'Unlimited Kids' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />
        </div>

        <div className="container mx-auto px-4 py-20 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6"
            >
              <Sparkle className="h-5 w-5 text-primary" weight="fill" />
              <span className="text-sm font-medium">Make Chores Fun & Rewarding</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight">
              ChoreQuest
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The family chore management app that makes household tasks engaging and rewarding for everyone
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button
                size="lg"
                className="text-lg px-8 py-6 h-auto group"
                onClick={onGetStarted}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 h-auto"
                onClick={onLogin}
              >
                Sign In
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4" variant="secondary">
            Powerful Features
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need for Family Chores
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From simple task tracking to advanced analytics, ChoreQuest has all the tools to make chores work for your family
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
            >
              <Card className="h-full border-2 hover:border-primary/50 transition-all duration-300 overflow-hidden group">
                <div className={`h-1 w-full bg-gradient-to-r ${feature.color}`} />
                <CardHeader>
                  <motion.div
                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 text-white`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    {feature.icon}
                  </motion.div>
                  <CardTitle className="text-2xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Screenshots Section */}
      <div className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4" variant="secondary">
              See It In Action
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Beautiful & Intuitive Design
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A child-friendly interface that makes completing chores fun, and a powerful parent dashboard for complete control
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                title: 'Child View',
                description: 'Simple, colorful interface designed for kids',
                image: '/screenshots/child-view-mobile.png',
              },
              {
                title: 'Parent Dashboard',
                description: 'Powerful tools for managing the whole family',
                image: '/screenshots/home-tablet.png',
              },
              {
                title: 'Mobile Friendly',
                description: 'Works perfectly on phones, tablets, and desktops',
                image: '/screenshots/home-mobile.png',
              },
            ].map((screenshot, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="group"
              >
                <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all duration-300">
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center p-8">
                    <DeviceMobile className="h-32 w-32 text-primary/40" weight="duotone" />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl">{screenshot.title}</CardTitle>
                    <CardDescription>{screenshot.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">
              Why ChoreQuest?
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for Modern Families
            </h2>
            <p className="text-xl text-muted-foreground">
              Every feature designed with real families in mind
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {benefit.icon}
                </div>
                <span className="text-base">{benefit.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Chore Time?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join families who have made chores fun and rewarding. Get started in minutes, completely free.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 py-6 h-auto group"
                onClick={onGetStarted}
              >
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 h-auto border-2 border-primary-foreground/20 hover:bg-primary-foreground/10"
                onClick={onLogin}
              >
                I Already Have an Account
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Sparkle className="h-6 w-6 text-primary" weight="fill" />
              <span className="text-lg font-semibold">ChoreQuest</span>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              <p>Open source family chore management • Made with ❤️ for families</p>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" size="sm" onClick={onLogin}>
                Sign In
              </Button>
              <Button variant="ghost" size="sm" onClick={onGetStarted}>
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
