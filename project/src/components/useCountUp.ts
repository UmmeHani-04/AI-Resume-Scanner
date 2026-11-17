import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../lib/motion'

/** Eased count-up from the previous value to `target`. Bulletproof against NaN/null. */
export function useCountUp(target: number, duration = 900, delay = 0) {
  const safeTarget = Number.isFinite(target) ? Math.round(target) : 0
  const [value, setValue] = useState(prefersReducedMotion() ? safeTarget : 0)
  const from = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(safeTarget)
      return
    }
    const startValue = from.current
    let frame = 0
    let t0 = 0
    const timer = setTimeout(() => {
      t0 = performance.now()
      const tick = (now: number) => {
        const p = Math.min((now - t0) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        const v = Math.round(startValue + (safeTarget - startValue) * eased)
        from.current = v
        setValue(v)
        if (p < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, delay)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [safeTarget, duration, delay])

  return value
}
