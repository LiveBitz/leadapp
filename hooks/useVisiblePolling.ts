import { useEffect, useRef } from 'react'

/**
 * Runs `callback` on an interval, but only while the browser tab is actually
 * visible. A background tab left open would otherwise keep polling forever,
 * preventing the database from ever going idle (and driving compute cost)
 * for a screen nobody is looking at.
 */
export function useVisiblePolling(callback: () => void, intervalMs: number) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    function start() {
      if (interval) return
      interval = setInterval(() => callbackRef.current(), intervalMs)
    }
    function stop() {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) stop()
      else start()
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [intervalMs])
}
