import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ntfyRequest, type NtfySettings, type NtfySettingsInput } from '@/lib/ntfy'

export function useNtfySettings() {
  const { token, viewOnlyMode } = useAuth()
  const [settings, setSettings] = useState<NtfySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let active = true
    setSettings(null)
    setError(null)
    if (!token || viewOnlyMode) {
      setLoading(false)
      return
    }
    setLoading(true)
    ntfyRequest<NtfySettings>(token, 'settings')
      .then(value => { if (active) setSettings(value) })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load ntfy settings') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, viewOnlyMode, reloadCount])

  const save = useCallback(async (input: NtfySettingsInput) => {
    if (!token || viewOnlyMode) throw new Error('Sign in to manage family notifications')
    const saved = await ntfyRequest<NtfySettings>(token, 'settings', { method: 'PUT', body: JSON.stringify(input) })
    setSettings(saved)
  }, [token, viewOnlyMode])

  const test = useCallback(async () => {
    if (!token || viewOnlyMode) throw new Error('Sign in to test notifications')
    await ntfyRequest(token, 'test', { method: 'POST' })
    setSettings(current => current ? { ...current, lastError: null, lastDeliveredAt: new Date().toISOString() } : current)
  }, [token, viewOnlyMode])

  return { settings, loading, error, save, test, reload: () => setReloadCount(count => count + 1), viewOnlyMode }
}
