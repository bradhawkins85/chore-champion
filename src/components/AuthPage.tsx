import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkle,
  LinkSimple,
  CheckCircle,
  Trophy,
  Users,
  DeviceMobile,
  Calendar,
  Bell,
  ShieldCheck,
  Rocket,
  ChartLine,
} from '@phosphor-icons/react';
import { DeviceLinkingScreen } from './DeviceLinkingScreen';
import { getDeviceGuid } from '@/lib/deviceHelper';

const featureCards = [
  {
    icon: Trophy,
    title: 'Motivation Through Rewards',
    description: 'Turn chores into achievements with points, custom rewards, and celebration animations children look forward to.',
  },
  {
    icon: Users,
    title: 'Built for Family Teams',
    description: 'Assign chores by child, share access with another parent, and keep everyone aligned from one dashboard.',
  },
  {
    icon: Calendar,
    title: 'Smart Planning Tools',
    description: 'Use recurring chore schedules, calendar views, school holiday planning, and weekly progress snapshots.',
  },
  {
    icon: Bell,
    title: 'Proactive Notifications',
    description: 'Stay ahead with reminders, approval alerts, and optional weekly reports delivered to your inbox.',
  },
  {
    icon: DeviceMobile,
    title: 'Device-Friendly Experience',
    description: 'Link trusted devices for quick entry and use ChoreQuest as a smooth, app-like PWA on phones or tablets.',
  },
  {
    icon: ShieldCheck,
    title: 'Parent Controls & Safety',
    description: 'Protect parent actions with PIN and optional biometric unlock while keeping child views focused and simple.',
  },
];

const appHighlights = [
  'Gamified chore completion for kids',
  'Custom chores, categories, and points',
  'Reward store with purchase tracking',
  'Calendar and history across all children',
  'Notifications and weekly reporting',
  'Secure parent controls and device linking',
];

const quickStats = [
  { label: 'Family setup', value: '5 min' },
  { label: 'Weekly planning', value: '1 dashboard' },
  { label: 'Kid engagement', value: 'High-fives included' },
];

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showDeviceLinking, setShowDeviceLinking] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, loginWithDevice } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceLinked = async () => {
    try {
      await loginWithDevice(getDeviceGuid());
    } catch (err) {
      console.error('Device linked, but automatic device login failed:', err);
      window.location.reload();
    }
  };

  if (showDeviceLinking) {
    return (
      <DeviceLinkingScreen
        onLinked={handleDeviceLinked}
        onCancel={() => setShowDeviceLinking(false)}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute -left-40 top-12 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-36 top-40 h-96 w-96 rounded-full bg-violet-500/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-12 lg:px-8 lg:py-12">
        <section className="space-y-8">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur sm:p-8">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/15 px-3 py-1 text-sm text-blue-100">
              <Sparkle className="h-4 w-4" weight="fill" />
              ChoreQuest for families
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Make chores feel like a game your family can actually win.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-200">
              ChoreQuest transforms everyday tasks into momentum with points, rewards, progress tracking,
              and family-friendly accountability tools that keep parents and kids in sync.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {quickStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-800/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {appHighlights.map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-lg border border-slate-700/70 bg-slate-900/70 p-3">
                <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-300" weight="fill" />
                <span className="text-sm text-slate-100">{item}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">See ChoreQuest in action</h2>
              <div className="hidden items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-100 sm:flex">
                <Rocket className="h-4 w-4" weight="duotone" />
                Mobile + tablet ready
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <figure className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
                <img src="/screenshots/home-tablet.png" alt="Family overview and management screen on tablet" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 to-transparent px-4 py-3 text-sm text-slate-100">
                  Family dashboard with chore and progress management
                </figcaption>
              </figure>

              <div className="grid gap-4">
                <figure className="group overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
                  <img src="/screenshots/home-mobile.png" alt="Parent dashboard and chore list on mobile" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                  <figcaption className="border-t border-slate-700 px-3 py-2 text-xs text-slate-300">Parent dashboard on mobile</figcaption>
                </figure>
                <figure className="group overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
                  <img src="/screenshots/child-view-mobile.png" alt="Child mode with points and rewards" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                  <figcaption className="border-t border-slate-700 px-3 py-2 text-xs text-slate-300">Child mode with rewards and progress</figcaption>
                </figure>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {featureCards.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 transition hover:-translate-y-0.5 hover:border-blue-400/40">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-200">
                  <Icon className="h-5 w-5" weight="duotone" />
                </div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-300">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="flex items-start justify-center lg:justify-end">
          <Card className="w-full max-w-md border-slate-700 bg-slate-900/95 text-slate-100 shadow-2xl lg:sticky lg:top-8">
            <CardHeader className="space-y-1">
              <div className="mb-3 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                  <Sparkle className="h-8 w-8 text-white" weight="fill" />
                </div>
              </div>
              <div className="mx-auto mb-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                <ChartLine className="h-3.5 w-3.5" weight="duotone" />
                Track progress every day
              </div>
              <CardTitle className="text-center text-2xl text-white">
                {isLogin ? 'Welcome Back' : 'Get Started'}
              </CardTitle>
              <CardDescription className="text-center text-slate-300">
                {isLogin
                  ? 'Sign in to your ChoreQuest account'
                  : 'Create a new ChoreQuest account'}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="parent@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={8}
                  />
                  {!isLogin && (
                    <p className="text-xs text-slate-400">
                      Must be at least 8 characters
                    </p>
                  )}
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                </Button>
              </CardContent>
            </form>
            <CardFooter className="flex flex-col space-y-2">
              <div className="text-center text-sm text-slate-300">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                <Button
                  variant="link"
                  className="px-2 text-blue-300"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={loading}
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Button>
              </div>

              <div className="w-full border-t border-slate-700 pt-3">
                <Button
                  variant="outline"
                  className="w-full border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
                  onClick={() => setShowDeviceLinking(true)}
                  disabled={loading}
                >
                  <LinkSimple className="mr-2 h-4 w-4" />
                  Link This Device
                </Button>
                <p className="mt-2 text-center text-xs text-slate-400">
                  Link this device to skip login in the future
                </p>
              </div>

              {!isLogin && (
                <div className="border-t border-slate-700 pt-2 text-center text-xs text-slate-400">
                  You can share your account with one other parent after signing up
                </div>
              )}
            </CardFooter>
          </Card>
        </aside>
      </div>
    </div>
  );
}
