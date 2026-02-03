import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  DeviceMobile, 
  DeviceTablet, 
  Desktop, 
  LinkSimple, 
  Trash, 
  Copy,
  QrCode,
} from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  generateLinkingCode, 
  getLinkedDevices, 
  unlinkDevice,
  getDeviceGuid,
} from '@/lib/deviceHelper';

interface DeviceInfo {
  id: string;
  deviceGuid: string;
  deviceInfo: {
    userAgent?: string;
    platform?: string;
    mobile?: boolean;
    ip?: string;
    timestamp?: string;
  };
  linkedAt: Date;
  lastSeen: Date;
  createdAt: Date;
}

export function DeviceManagement() {
  const { token } = useAuth();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<Date | null>(null);
  const [deviceToUnlink, setDeviceToUnlink] = useState<DeviceInfo | null>(null);
  const currentDeviceGuid = getDeviceGuid();

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const linkedDevices = await getLinkedDevices(token);
      setDevices(linkedDevices);
    } catch (error: any) {
      console.error('Error loading devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const { code, expiresAt } = await generateLinkingCode(token);
      setLinkingCode(code);
      setCodeExpiresAt(new Date(expiresAt));
      setShowLinkDialog(true);
    } catch (error: any) {
      console.error('Error generating code:', error);
      toast.error(error.message || 'Failed to generate linking code');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (linkingCode) {
      navigator.clipboard.writeText(linkingCode);
      toast.success('Code copied to clipboard');
    }
  };

  const handleUnlinkDevice = async (device: DeviceInfo) => {
    if (!token) return;

    setLoading(true);
    try {
      await unlinkDevice(token, device.id);
      toast.success('Device unlinked successfully');
      loadDevices();
      setDeviceToUnlink(null);
    } catch (error: any) {
      console.error('Error unlinking device:', error);
      toast.error(error.message || 'Failed to unlink device');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceInfo: DeviceInfo['deviceInfo']) => {
    const userAgent = deviceInfo.userAgent?.toLowerCase() || '';
    
    if (deviceInfo.mobile || userAgent.includes('mobile')) {
      return <DeviceMobile className="w-6 h-6" />;
    } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      return <DeviceTablet className="w-6 h-6" />;
    } else {
      return <Desktop className="w-6 h-6" />;
    }
  };

  const getDeviceName = (deviceInfo: DeviceInfo['deviceInfo']) => {
    const userAgent = deviceInfo.userAgent || 'Unknown Device';
    
    // Extract browser and OS info
    let browser = 'Unknown Browser';
    let os = deviceInfo.platform || 'Unknown OS';
    
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    return `${browser} on ${os}`;
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const lastSeen = new Date(date);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getRemainingTime = () => {
    if (!codeExpiresAt) return '';
    
    const now = new Date();
    const expiresAt = new Date(codeExpiresAt);
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins <= 0) return 'Expired';
    if (diffMins < 60) return `${diffMins} minutes`;
    
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHours}h ${remainingMins}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Device Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage devices that can access your ChoreQuest account
          </p>
        </div>
        <Button onClick={handleGenerateCode} disabled={loading}>
          <LinkSimple className="w-4 h-4 mr-2" />
          Link New Device
        </Button>
      </div>

      {loading && devices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading devices...
        </div>
      ) : devices.length === 0 ? (
        <Card className="p-8 text-center">
          <QrCode className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Devices Linked</h3>
          <p className="text-muted-foreground mb-4">
            Link a device to access ChoreQuest without logging in
          </p>
          <Button onClick={handleGenerateCode}>
            <LinkSimple className="w-4 h-4 mr-2" />
            Link Your First Device
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {devices.map((device) => (
            <Card key={device.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    {getDeviceIcon(device.deviceInfo)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {getDeviceName(device.deviceInfo)}
                      </h3>
                      {device.deviceGuid === currentDeviceGuid && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          This Device
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Last active: {formatLastSeen(device.lastSeen)}
                    </p>
                    {device.deviceInfo.ip && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        IP: {device.deviceInfo.ip}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Linked: {new Date(device.linkedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeviceToUnlink(device)}
                  disabled={loading}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Link Device Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link New Device</DialogTitle>
            <DialogDescription>
              Enter this code on the device you want to link to your account
            </DialogDescription>
          </DialogHeader>
          
          {linkingCode && (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-4xl font-mono font-bold tracking-widest mb-2">
                    {linkingCode}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Expires in {getRemainingTime()}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Instructions</Label>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Open ChoreQuest on the device you want to link</li>
                  <li>Go to the device linking screen</li>
                  <li>Enter the code above</li>
                  <li>The device will be instantly linked to your account</li>
                </ol>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopyCode}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </Button>
            <Button
              onClick={() => {
                setShowLinkDialog(false);
                setLinkingCode(null);
                setCodeExpiresAt(null);
                loadDevices();
              }}
              className="flex-1"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={!!deviceToUnlink} onOpenChange={() => setDeviceToUnlink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This device will no longer have access to your ChoreQuest account. 
              You can re-link it later using a new linking code.
              {deviceToUnlink?.deviceGuid === currentDeviceGuid && (
                <span className="block mt-2 font-semibold text-destructive">
                  Warning: You are about to unlink this device!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deviceToUnlink && handleUnlinkDevice(deviceToUnlink)}
            >
              Unlink Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
