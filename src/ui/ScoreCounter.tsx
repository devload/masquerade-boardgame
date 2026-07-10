/**
 * ScoreCounter — smooth rolling numeric ticker.
 *
 * Uses framer-motion's `useMotionValue` + `animate` to tween from the current
 * displayed number to a target `value`. Renders the (rounded) integer, so the
 * digit visually rolls when the target changes.
 *
 * Used by the ReckoningScene score header (per-player totale) and by the
 * final tally card.
 */

import { useEffect, useRef, useState } from 'react'
import { animate, useMotionValue } from 'framer-motion'

export type ScoreCounterProps = {
  value: number
  /** Duration of the tween, in seconds. Defaults to 0.8. */
  duration?: number
  className?: string
  /** Optional prefix (e.g. "+"). */
  prefix?: string
}

export function ScoreCounter({
  value,
  duration = 0.8,
  className,
  prefix = '',
}: ScoreCounterProps) {
  const mv = useMotionValue(value)
  const [display, setDisplay] = useState<number>(value)
  const prevRef = useRef<number>(value)

  useEffect(() => {
    // On mount we don't animate; only on subsequent changes.
    if (prevRef.current === value) return
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 1, 0.36, 1], // easeOutQuint-ish
      onUpdate: (latest) => setDisplay(Math.round(latest)),
      onComplete: () => setDisplay(value),
    })
    prevRef.current = value
    return () => controls.stop()
  }, [value, duration, mv])

  return (
    <span className={className}>
      {prefix}
      {display}
    </span>
  )
}
