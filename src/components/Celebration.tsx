import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { CelebrationAnimation } from '@/lib/types'

function Confetti() {
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

function Fireworks() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const colors = [
      'oklch(0.6 0.22 290)',
      'oklch(0.72 0.18 45)',
      'oklch(0.85 0.15 95)',
      'oklch(0.65 0.12 240)',
      'oklch(0.8 0.2 160)',
    ]

    const container = containerRef.current
    const burstCount = 3

    for (let b = 0; b < burstCount; b++) {
      setTimeout(() => {
        const centerX = 20 + Math.random() * 60
        const centerY = 20 + Math.random() * 40
        const particleCount = 30

        for (let i = 0; i < particleCount; i++) {
          const particle = document.createElement('div')
          const angle = (Math.PI * 2 * i) / particleCount
          const velocity = 100 + Math.random() * 100
          
          particle.style.position = 'fixed'
          particle.style.width = '6px'
          particle.style.height = '6px'
          particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
          particle.style.left = `${centerX}%`
          particle.style.top = `${centerY}%`
          particle.style.borderRadius = '50%'
          particle.style.pointerEvents = 'none'
          particle.style.zIndex = '9999'
          
          const endX = centerX + Math.cos(angle) * velocity / 10
          const endY = centerY + Math.sin(angle) * velocity / 10
          
          particle.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          container.appendChild(particle)
          
          requestAnimationFrame(() => {
            particle.style.left = `${endX}%`
            particle.style.top = `${endY}%`
            particle.style.opacity = '0'
          })
          
          setTimeout(() => particle.remove(), 800)
        }
      }, b * 400)
    }
  }, [])

  return <div ref={containerRef} />
}

function Sparkles() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const colors = [
      'oklch(0.95 0.15 85)',
      'oklch(0.9 0.2 45)',
      'oklch(0.85 0.2 290)',
    ]

    const container = containerRef.current
    const sparkleCount = 40

    for (let i = 0; i < sparkleCount; i++) {
      setTimeout(() => {
        const sparkle = document.createElement('div')
        sparkle.textContent = '✨'
        sparkle.style.position = 'fixed'
        sparkle.style.fontSize = `${12 + Math.random() * 20}px`
        sparkle.style.left = `${Math.random() * 100}%`
        sparkle.style.top = `${Math.random() * 100}%`
        sparkle.style.pointerEvents = 'none'
        sparkle.style.zIndex = '9999'
        sparkle.style.animation = 'sparkle-fade 1s ease-out forwards'
        
        container.appendChild(sparkle)
        
        setTimeout(() => sparkle.remove(), 1000)
      }, i * 50)
    }
  }, [])

  return <div ref={containerRef} />
}

function Stars() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const starCount = 20

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div')
      star.textContent = '⭐'
      star.style.position = 'fixed'
      star.style.fontSize = `${20 + Math.random() * 30}px`
      star.style.left = `${Math.random() * 100}%`
      star.style.top = `${-20 + Math.random() * 40}%`
      star.style.pointerEvents = 'none'
      star.style.zIndex = '9999'
      star.style.animation = `star-fall ${1.5 + Math.random()}s ease-in forwards`
      star.style.animationDelay = `${Math.random() * 0.5}s`
      
      container.appendChild(star)
      
      setTimeout(() => star.remove(), 2500)
    }
  }, [])

  return <div ref={containerRef} />
}

function Bubbles() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const colors = [
      'oklch(0.7 0.15 290 / 0.5)',
      'oklch(0.75 0.12 240 / 0.5)',
      'oklch(0.8 0.18 180 / 0.5)',
      'oklch(0.85 0.15 200 / 0.5)',
    ]

    const container = containerRef.current
    const bubbleCount = 30

    for (let i = 0; i < bubbleCount; i++) {
      setTimeout(() => {
        const bubble = document.createElement('div')
        const size = 15 + Math.random() * 40
        
        bubble.style.position = 'fixed'
        bubble.style.width = `${size}px`
        bubble.style.height = `${size}px`
        bubble.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
        bubble.style.left = `${Math.random() * 100}%`
        bubble.style.bottom = '-60px'
        bubble.style.borderRadius = '50%'
        bubble.style.pointerEvents = 'none'
        bubble.style.zIndex = '9999'
        bubble.style.border = '2px solid oklch(1 0 0 / 0.3)'
        bubble.style.animation = `bubble-rise ${2 + Math.random() * 2}s ease-out forwards`
        
        container.appendChild(bubble)
        
        setTimeout(() => bubble.remove(), 4000)
      }, i * 60)
    }
  }, [])

  return <div ref={containerRef} />
}

function Hearts() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const heartCount = 25

    for (let i = 0; i < heartCount; i++) {
      setTimeout(() => {
        const heart = document.createElement('div')
        heart.textContent = '💖'
        heart.style.position = 'fixed'
        heart.style.fontSize = `${20 + Math.random() * 30}px`
        heart.style.left = `${Math.random() * 100}%`
        heart.style.bottom = '-60px'
        heart.style.pointerEvents = 'none'
        heart.style.zIndex = '9999'
        heart.style.animation = `heart-float ${2 + Math.random()}s ease-out forwards`
        
        container.appendChild(heart)
        
        setTimeout(() => heart.remove(), 3000)
      }, i * 80)
    }
  }, [])

  return <div ref={containerRef} />
}

interface ChoreCompletionCelebrationProps {
  points: number
  animationType: CelebrationAnimation
  onComplete: () => void
}

export function ChoreCompletionCelebration({
  points,
  animationType,
  onComplete,
}: ChoreCompletionCelebrationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500)
    return () => clearTimeout(timer)
  }, [onComplete])

  const AnimationComponent = () => {
    switch (animationType) {
      case 'confetti':
        return <Confetti />
      case 'fireworks':
        return <Fireworks />
      case 'sparkles':
        return <Sparkles />
      case 'stars':
        return <Stars />
      case 'bubbles':
        return <Bubbles />
      case 'hearts':
        return <Hearts />
      default:
        return <Confetti />
    }
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed z-50 pointer-events-none flex items-center justify-center"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        right: 'env(safe-area-inset-right, 0px)',
        bottom: 'env(safe-area-inset-bottom, 0px)',
        left: 'env(safe-area-inset-left, 0px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.5 }}
        animate={{ scale: [0.5, 1.2, 1] }}
        transition={{ duration: 0.5 }}
        className="text-8xl font-fredoka font-bold text-accent drop-shadow-lg"
      >
        +{points} ⭐
      </motion.div>
      <AnimationComponent />
    </motion.div>
  )
}
