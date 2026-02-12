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
  ChartLine,
} from '@phosphor-icons/react';
import { DeviceLinkingScreen } from './DeviceLinkingScreen';
import { getDeviceGuid } from '@/lib/deviceHelper';

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

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-slate-700 bg-slate-900/95 text-slate-100 shadow-2xl">
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
      </div>
    </div>
  );
}
