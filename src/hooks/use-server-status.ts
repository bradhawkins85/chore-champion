import { useState, useEffect, useCallback, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const HEALTH_CHECK_INTERVAL = 10000 // Check every 10 seconds
const HEALTH_CHECK_TIMEOUT = 5000 // 5 second timeout for health checks
const OFFLINE_THRESHOLD = 2 // Consider offline after 2 consecutive failures

interface ServerStatus {
  isOnline: boolean
  isChecking: boolean
  lastOnlineTime: number | null
  offlineDuration: number // in milliseconds
  consecutiveFailures: number
}

/**
 * Hook to monitor backend server availability
 * This detects when the server goes offline (e.g., during software upgrades)
 * and triggers an automatic page refresh when it comes back online
 */
export function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>({
    isOnline: true,
    isChecking: false,
    lastOnlineTime: Date.now(),
    offlineDuration: 0,
    consecutiveFailures: 0,
  })

  const [shouldAutoRefresh, setShouldAutoRefresh] = useState(true)
  const wasOfflineRef = useRef(false)
  const refreshTimeoutRef = useRef<number | null>(null)

  const checkServerHealth = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT)

      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      clearTimeout(timeoutId)

      // Consider server online if we get any response (even 503 during startup)
      return response.ok || response.status === 503
    } catch (error) {
      // Network error, timeout, or server unreachable
      console.warn('Server health check failed:', error)
      return false
    }
  }, [])

  const handleServerReconnect = useCallback(async () => {
    try {
      // Only clear caches, don't unregister service workers to avoid disrupting other features
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }
    } catch (error) {
      console.warn('Failed to clear caches before refresh:', error)
    } finally {
      // Add a query parameter to force a hard refresh
      const url = new URL(window.location.href)
      url.searchParams.set('reconnected', Date.now().toString())
      window.location.replace(url.toString())
    }
  }, [])

  // Perform health check and update status
  const performHealthCheck = useCallback(async () => {
    const isServerOnline = await checkServerHealth()
    const now = Date.now()

    setStatus(prev => {
      const newConsecutiveFailures = isServerOnline ? 0 : prev.consecutiveFailures + 1
      const wasOffline = prev.consecutiveFailures >= OFFLINE_THRESHOLD
      const isNowOffline = newConsecutiveFailures >= OFFLINE_THRESHOLD
      const justCameBackOnline = wasOffline && !isNowOffline

      // Calculate offline duration
      let offlineDuration = prev.offlineDuration
      if (isNowOffline && prev.lastOnlineTime) {
        offlineDuration = now - prev.lastOnlineTime
      } else if (!isNowOffline) {
        offlineDuration = 0
      }

      // Check if anything actually changed to avoid unnecessary re-renders
      const isOnline = !isNowOffline
      const lastOnlineTime = isOnline ? now : prev.lastOnlineTime
      
      // Only update if status actually changed
      if (
        prev.isOnline === isOnline &&
        prev.consecutiveFailures === newConsecutiveFailures &&
        prev.offlineDuration === offlineDuration &&
        prev.lastOnlineTime === lastOnlineTime &&
        prev.isChecking === false
      ) {
        // Nothing changed, return previous state to prevent re-render
        return prev
      }

      // Update ref to track offline state
      wasOfflineRef.current = isNowOffline

      // Trigger auto-refresh if server just came back online
      if (justCameBackOnline && shouldAutoRefresh) {
        console.log('Server is back online. Triggering auto-refresh...')
        // Clear any existing refresh timeout to prevent multiple refreshes
        if (refreshTimeoutRef.current !== null) {
          clearTimeout(refreshTimeoutRef.current)
        }
        // Use a small delay to ensure the UI updates before refresh
        refreshTimeoutRef.current = window.setTimeout(() => {
          refreshTimeoutRef.current = null
          handleServerReconnect()
        }, 1000)
      }

      return {
        isOnline,
        isChecking: false,
        lastOnlineTime,
        offlineDuration,
        consecutiveFailures: newConsecutiveFailures,
      }
    })
  }, [checkServerHealth, shouldAutoRefresh, handleServerReconnect])

  // Start periodic health checks
  useEffect(() => {
    // Initial check
    performHealthCheck()

    // Set up periodic checks
    const intervalId = setInterval(performHealthCheck, HEALTH_CHECK_INTERVAL)

    return () => {
      clearInterval(intervalId)
      // Clean up any pending refresh timeout
      if (refreshTimeoutRef.current !== null) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
    }
  }, [performHealthCheck])

  return {
    isServerOnline: status.isOnline,
    isChecking: status.isChecking,
    offlineDuration: status.offlineDuration,
    shouldAutoRefresh,
    setShouldAutoRefresh,
    manualRefresh: handleServerReconnect,
  }
}
