import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkle, EnvelopeOpen } from '@phosphor-icons/react';
import { toast } from 'sonner';

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { acceptInvitation, getInvitationDetails } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [invitationError, setInvitationError] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setInvitationError('Invalid invitation link');
      setLoading(false);
      return;
    }

    // Load invitation details
    const loadInvitation = async () => {
      try {
        const data = await getInvitationDetails(token);
        setInvitationEmail(data.email);
        setLoading(false);
      } catch (err) {
        setInvitationError(err instanceof Error ? err.message : 'Invalid or expired invitation');
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token, getInvitationDetails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!token) {
      setError('Invalid invitation token');
      return;
    }

    setSubmitting(true);

    try {
      await acceptInvitation(token, password);
      toast.success('Account created successfully! Welcome to ChoreQuest.');
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
                <EnvelopeOpen className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{invitationError}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Sparkle className="w-8 h-8 text-white" weight="fill" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            Accept Invitation
          </CardTitle>
          <CardDescription className="text-center">
            You've been invited to join ChoreQuest
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-1">Invitation for:</p>
              <p className="text-sm text-muted-foreground">{invitationEmail}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating Account...' : 'Accept Invitation & Create Account'}
            </Button>

            <div className="text-xs text-center text-muted-foreground pt-2 border-t">
              <p>This invitation is valid for 7 days from when it was sent.</p>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
