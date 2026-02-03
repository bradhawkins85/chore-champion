import { v4 as uuidv4 } from 'uuid';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Device information captured from the browser
 */
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  mobile: boolean;
  ip?: string;
  timestamp: string;
}

/**
 * Get or create a unique device GUID for this device.
 * The GUID is stored in localStorage and persists across sessions.
 * Returns a proper UUID v4.
 */
export const getDeviceGuid = (): string => {
  let storedGuid = localStorage.getItem('chorequest-device-guid');
  if (!storedGuid) {
    storedGuid = uuidv4();
    localStorage.setItem('chorequest-device-guid', storedGuid);
  }
  return storedGuid;
};

/**
 * Legacy function for backwards compatibility.
 * @deprecated Use getDeviceGuid instead
 */
export const getDeviceId = (): string => {
  return getDeviceGuid();
};

/**
 * Register device with the backend and check if it's linked to a tenant.
 * Returns device registration info including linking status.
 */
export const registerDevice = async (): Promise<{
  deviceId: string;
  deviceGuid: string;
  isLinked: boolean;
  tenantId: string | null;
}> => {
  const deviceGuid = getDeviceGuid();
  
  try {
    const response = await fetch(`${API_URL}/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceGuid }),
    });

    if (!response.ok) {
      throw new Error('Failed to register device');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error registering device:', error);
    // Return offline mode data
    return {
      deviceId: deviceGuid,
      deviceGuid,
      isLinked: false,
      tenantId: null,
    };
  }
};

/**
 * Link this device to a tenant using a linking code.
 */
export const linkDevice = async (linkingCode: string, deviceName?: string): Promise<{
  success: boolean;
  tenantId: string;
  deviceId: string;
}> => {
  const deviceGuid = getDeviceGuid();
  
  const response = await fetch(`${API_URL}/devices/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deviceGuid, linkingCode, deviceName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to link device');
  }

  return await response.json();
};

/**
 * Generate a linking code for the current tenant (requires authentication).
 */
export const generateLinkingCode = async (token: string): Promise<{
  code: string;
  expiresAt: Date;
}> => {
  const response = await fetch(`${API_URL}/devices/generate-link-code`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate linking code');
  }

  return await response.json();
};

/**
 * Get all devices linked to the current tenant.
 */
export const getLinkedDevices = async (token: string): Promise<Array<{
  id: string;
  deviceGuid: string;
  deviceName: string | null;
  deviceInfo: DeviceInfo;
  allowedChildrenIds: string[];
  linkedAt: Date | string | null;
  lastSeen: Date | string | null;
  createdAt: Date | string | null;
}>> => {
  const response = await fetch(`${API_URL}/devices`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get devices');
  }

  const data = await response.json();
  const rawDevices = Array.isArray(data.devices)
    ? data.devices
    : Array.isArray(data.linkedDevices)
      ? data.linkedDevices
      : Array.isArray(data)
        ? data
        : [];

  return rawDevices.map((device: any) => {
    const deviceInfo = device.deviceInfo ?? device.device_info ?? {};
    const allowedChildrenIds = device.allowedChildrenIds ?? device.allowed_children_ids ?? [];

    const parsedDeviceInfo = (() => {
      if (typeof deviceInfo === 'string') {
        try {
          return JSON.parse(deviceInfo);
        } catch {
          return {};
        }
      }
      return deviceInfo;
    })();
    const parsedAllowedChildrenIds = typeof allowedChildrenIds === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(allowedChildrenIds);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : Array.isArray(allowedChildrenIds)
        ? allowedChildrenIds
        : [];

    return {
      id: device.id ?? device.deviceId ?? device.device_id ?? device.deviceGuid ?? device.device_guid,
      deviceGuid: device.deviceGuid ?? device.device_guid ?? device.deviceId ?? device.device_id ?? '',
      deviceName: device.deviceName ?? device.device_name ?? null,
      deviceInfo: parsedDeviceInfo,
      allowedChildrenIds: parsedAllowedChildrenIds,
      linkedAt: device.linkedAt ?? device.linked_at ?? null,
      lastSeen: device.lastSeen ?? device.last_seen ?? null,
      createdAt: device.createdAt ?? device.created_at ?? null,
    };
  });
};

/**
 * Update device name.
 */
export const updateDeviceName = async (token: string, deviceId: string, deviceName: string): Promise<void> => {
  const response = await fetch(`${API_URL}/devices/${deviceId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deviceName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update device name');
  }
};

/**
 * Update device allowed children.
 */
export const updateDeviceAllowedChildren = async (token: string, deviceId: string, allowedChildrenIds: string[]): Promise<void> => {
  const response = await fetch(`${API_URL}/devices/${deviceId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ allowedChildrenIds }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update device allowed children');
  }
};

/**
 * Unlink a device from the current tenant.
 */
export const unlinkDevice = async (token: string, deviceId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/devices/${deviceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unlink device');
  }
};
