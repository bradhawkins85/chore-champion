import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LinkSimple, DeviceMobile } from '@phosphor-icons/react';
import { linkDevice } from '@/lib/deviceHelper';

interface DeviceLinkingScreenProps {
  onLinked: (tenantId: string) => void;
  onCancel: () => void;
}

export function DeviceLinkingScreen({ onLinked, onCancel }: DeviceLinkingScreenProps) {
  const [linkingCode, setLinkingCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!linkingCode || linkingCode.length !== 6) {
      toast.error('Please enter a valid 6-character code');
      return;
    }

    setLoading(true);
    try {
      const result = await linkDevice(linkingCode, deviceName.trim() || undefined);
      toast.success('Device linked successfully!');
      onLinked(result.tenantId);
    } catch (error) {
      console.error('Error linking device:', error);
      const message = error instanceof Error ? error.message : 'Failed to link device. Please check the code and try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setLinkingCode(value);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <LinkSimple className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Link This Device</h1>
          <p className="text-muted-foreground">
            Enter the 6-character code from your parent dashboard to link this device
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="device-name">Device Name (Optional)</Label>
            <Input
              id="device-name"
              type="text"
              placeholder="e.g., Living Room iPad, Kitchen Tablet"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              maxLength={255}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Give this device a friendly name for easier identification
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linking-code">Linking Code</Label>
            <Input
              id="linking-code"
              type="text"
              placeholder="ABC123"
              value={linkingCode}
              onChange={handleCodeChange}
              className="text-center text-2xl font-mono tracking-widest"
              maxLength={6}
              autoComplete="off"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              The code is case-insensitive and expires after 10 minutes
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || linkingCode.length !== 6}
            >
              {loading ? 'Linking...' : 'Link Device'}
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold text-sm mb-2">How to get a linking code:</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Log in to your ChoreQuest account on another device</li>
            <li>Go to Parent Mode → Settings → Device Management</li>
            <li>Click "Link New Device" to generate a code</li>
            <li>Enter the code here within 10 minutes</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
