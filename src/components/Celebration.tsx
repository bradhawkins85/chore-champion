import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

export function Confetti() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const colors = [
      'oklch(0.6 0.22 290)',
      'oklch(0.72 0.18 45)',
      'oklch(0.85 0.15 95)',
      'oklch(0.65 0.12 240)',
    ]

    const confettiCount = 50
    const container = containerRef.current

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div')
      confetti.style.position = 'fixed'
      confetti.style.width = '10px'
      confetti.style.height = '10px'
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      confetti.style.left = `${Math.random() * 100}%`
      confetti.style.top = '-20px'
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0'
      confetti.style.opacity = '1'
      confetti.style.pointerEvents = 'none'
      confetti.style.zIndex = '9999'
      confetti.className = 'confetti'

      container.appendChild(confetti)

      setTimeout(() => {
        confetti.remove()
      }, 2000)
    }
  }, [])

  return <div ref={containerRef} />
}

interface ChoreCompletionCelebrationProps {
  points: number
  onComplete: () => void
}

export function ChoreCompletionCelebration({
  points,
  onComplete,
}: ChoreCompletionCelebrationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
    >
      <motion.div
        initial={{ scale: 0.5 }}
        animate={{ scale: [0.5, 1.2, 1] }}
        transition={{ duration: 0.5 }}
        className="text-8xl font-fredoka font-bold text-accent"
      >
        +{points} ⭐
      </motion.div>
      <Confetti />
    </motion.div>
  )
}
