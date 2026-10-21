export const NTFY_NOTIFICATION_TYPES = [
  { key: 'choreCompleted', label: 'Chores marked complete', description: 'Includes chores waiting for parent approval.' },
  { key: 'choreUncompleted', label: 'Chore completions undone', description: 'When a completed chore is unmarked.' },
  { key: 'choreApproved', label: 'Chores approved', description: 'When a parent approves a chore completion.' },
  { key: 'choreRejected', label: 'Chores rejected', description: 'Includes the reason provided by the parent.' },
  { key: 'rewardRequested', label: 'Reward requests', description: 'When a child requests a reward from the shop.' },
  { key: 'rewardFulfilled', label: 'Rewards fulfilled', description: 'When a parent marks a reward as delivered.' },
  { key: 'rewardCancelled', label: 'Reward requests cancelled', description: 'When an outstanding reward request is removed.' },
] as const

export type NtfyEventType = typeof NTFY_NOTIFICATION_TYPES[number]['key']
export interface NtfySettings {
  enabled: boolean
  serverUrl: string
  topic: string
  authMode: 'none' | 'token' | 'basic'
  username: string
  hasCredential: boolean
  notificationTypes: Record<NtfyEventType, boolean>
  lastDeliveredAt: string | null
  lastError: string | null
}
export type NtfySettingsInput = Pick<NtfySettings, 'enabled' | 'serverUrl' | 'topic' | 'authMode' | 'username' | 'notificationTypes'> & { credential?: string }

const API_URL = import.meta.env.VITE_API_URL || '/api'
export async function ntfyRequest<T>(token: string, path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/ntfy/${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Ntfy request failed')
  return result as T
}
