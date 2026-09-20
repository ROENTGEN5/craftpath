import { animate, stagger } from 'animejs'

/**
 * Staggered fade and slide up animation for grids, cards, and list elements.
 */
export function animateFadeSlideUp(
  targets: Parameters<typeof animate>[0],
  options?: {
    delay?: number
    stagger?: number
    duration?: number
    translateY?: number
    easing?: string
  }
) {
  if (!targets) return
  const staggerDelay = options?.stagger ?? 50
  const initialDelay = options?.delay ?? 0

  return animate(targets, {
    translateY: [options?.translateY ?? 20, 0],
    opacity: [0, 1],
    duration: options?.duration ?? 600,
    ease: options?.easing ?? 'outCubic',
    delay: typeof initialDelay === 'number'
      ? stagger(staggerDelay, { start: initialDelay })
      : initialDelay,
  })
}

/**
 * Smooth spring-backed scale and fade entrance for modals and dialog cards.
 */
export function animateModalIn(
  target: HTMLElement | null,
  options?: { duration?: number }
) {
  if (!target) return
  try {
    return animate(target, {
      scale: [0.94, 1],
      opacity: [0, 1],
      duration: options?.duration ?? 350,
      ease: 'outBack',
    })
  } catch (err) {
    console.error('animateModalIn error:', err)
  }
}

/**
 * Animated number counter (counts up from 0 to target value).
 */
export function animateCounter(
  element: HTMLElement | null,
  endValue: number,
  options?: {
    duration?: number
    suffix?: string
    decimals?: number
  }
) {
  if (!element) return
  try {
    const targetObj = { val: 0 }
    const suffix = options?.suffix ?? ''
    const decimals = options?.decimals ?? 0

    return animate(targetObj, {
      val: endValue,
      duration: options?.duration ?? 900,
      ease: 'outExpo',
      onUpdate: () => {
        element.textContent = `${decimals > 0 ? targetObj.val.toFixed(decimals) : Math.round(targetObj.val)}${suffix}`
      },
    })
  } catch (err) {
    console.error('animateCounter error:', err)
  }
}

/**
 * Micro-bounce effect when checking or clicking a checkpoint/badge.
 */
export function animateBounce(target: HTMLElement | null) {
  if (!target) return
  try {
    return animate(target, {
      scale: [1, 1.25, 0.95, 1],
      duration: 350,
      ease: 'inOutQuad',
    })
  } catch (err) {
    console.error('animateBounce error:', err)
  }
}

/**
 * Juicy jelly squash & stretch for buttons, checkboxes, and badges.
 */
export function animateJelly(target: HTMLElement | null) {
  if (!target) return
  try {
    return animate(target, {
      scaleX: [1, 1.28, 0.88, 1.12, 0.96, 1],
      scaleY: [1, 0.74, 1.22, 0.92, 1.04, 1],
      duration: 500,
      ease: 'outBack',
    })
  } catch (err) {
    console.error('animateJelly error:', err)
  }
}

/**
 * Smooth width transition for progress bars.
 */
export function animateProgressBar(
  target: HTMLElement | null,
  percent: number,
  options?: { duration?: number }
) {
  if (!target) return
  try {
    return animate(target, {
      width: `${Math.min(100, Math.max(0, percent))}%`,
      duration: options?.duration ?? 700,
      ease: 'outCubic',
    })
  } catch (err) {
    console.error('animateProgressBar error:', err)
  }
}

/**
 * Helper to ensure a persistent container exists for particles
 */
function getParticleContainer(): HTMLElement {
  let container = document.getElementById('craftpath-particles')
  if (!container) {
    container = document.createElement('div')
    container.id = 'craftpath-particles'
    container.style.position = 'fixed'
    container.style.inset = '0'
    container.style.pointerEvents = 'none'
    container.style.zIndex = '99999'
    container.style.overflow = 'hidden'
    document.body.appendChild(container)
  }
  return container
}

/**
 * Spawns a tactile, colorful particle burst at the given screen coordinates.
 */
export function spawnParticleBurst(
  x: number,
  y: number,
  options?: {
    count?: number
    colors?: string[]
    spread?: number
    maxSize?: number
  }
) {
  try {
    const container = getParticleContainer()
    const count = options?.count ?? 16
    const colors = options?.colors ?? ['#6E8B6B', '#CC8F3F', '#B26E53', '#E0A96D', '#4F7959', '#D5CEC4']
    const spread = options?.spread ?? 75
    const maxSize = options?.maxSize ?? 9

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div')
      const size = Math.random() * (maxSize - 4) + 4
      const isCircle = Math.random() > 0.4
      const isDiamond = !isCircle && Math.random() > 0.5
      const color = colors[Math.floor(Math.random() * colors.length)]

      particle.style.position = 'absolute'
      particle.style.left = `${x}px`
      particle.style.top = `${y}px`
      particle.style.width = `${size}px`
      particle.style.height = `${size}px`
      particle.style.backgroundColor = color
      particle.style.borderRadius = isCircle ? '50%' : isDiamond ? '2px' : '3px'
      particle.style.pointerEvents = 'none'
      particle.style.transform = isDiamond ? 'rotate(45deg)' : 'none'
      particle.style.boxShadow = `0 2px 6px ${color}40`

      container.appendChild(particle)

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6
      const distance = spread * (0.4 + Math.random() * 0.7)
      const destX = Math.cos(angle) * distance
      const destY = Math.sin(angle) * distance - Math.random() * 15 // slight upward bias

      animate(particle, {
        translateX: destX,
        translateY: destY,
        scale: [1, Math.random() * 0.4 + 0.3],
        rotate: (Math.random() - 0.5) * 360,
        opacity: [1, 0],
        duration: 650 + Math.random() * 300,
        ease: 'outExpo',
        onComplete: () => {
          particle.remove()
        },
      })
    }
  } catch (err) {
    console.error('spawnParticleBurst error:', err)
  }
}

/**
 * Multi-stage celebration fireworks explosion when completing a milestone or big goal!
 */
export function triggerCelebration(x?: number, y?: number, colors?: string[]) {
  const targetX = x ?? window.innerWidth / 2
  const targetY = y ?? window.innerHeight * 0.4
  const celebrationColors = colors ?? ['#6E8B6B', '#CC8F3F', '#B26E53', '#E0A96D', '#2D6A4F', '#FFD166']

  // Wave 1: Immediate primary blast
  spawnParticleBurst(targetX, targetY, {
    count: 24,
    colors: celebrationColors,
    spread: 110,
    maxSize: 11,
  })

  // Wave 2: Left offset burst
  setTimeout(() => {
    spawnParticleBurst(targetX - 70, targetY + 20, {
      count: 18,
      colors: celebrationColors,
      spread: 95,
      maxSize: 9,
    })
  }, 120)

  // Wave 3: Right offset burst
  setTimeout(() => {
    spawnParticleBurst(targetX + 70, targetY + 15, {
      count: 18,
      colors: celebrationColors,
      spread: 95,
      maxSize: 9,
    })
  }, 240)
}

/**
 * Interactive 3D Card Tilt on mouse move
 */
export function applyCardTilt(card: HTMLElement, e: React.MouseEvent<HTMLElement> | MouseEvent) {
  const rect = card.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width - 0.5
  const y = (e.clientY - rect.top) / rect.height - 0.5

  const rotateY = x * 10
  const rotateX = -y * 10

  card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`

  const sheen = card.querySelector('.tilt-card-sheen') as HTMLElement | null
  if (sheen) {
    sheen.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 60%)`
    sheen.style.opacity = '1'
  }
}

/**
 * Smoothly spring-reset 3D Card Tilt on mouse leave
 */
export function resetCardTilt(card: HTMLElement) {
  animate(card, {
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    duration: 500,
    ease: 'outBack',
    onComplete: () => {
      card.style.transform = ''
    },
  })

  const sheen = card.querySelector('.tilt-card-sheen') as HTMLElement | null
  if (sheen) {
    sheen.style.opacity = '0'
  }
}

export { animate, stagger }
