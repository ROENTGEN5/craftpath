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
  return animate(target, {
    scale: [0.94, 1],
    opacity: [0, 1],
    duration: options?.duration ?? 350,
    ease: 'outBack',
  })
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
}

/**
 * Micro-bounce effect when checking or clicking a checkpoint/badge.
 */
export function animateBounce(target: HTMLElement | null) {
  if (!target) return
  return animate(target, {
    scale: [1, 1.25, 0.95, 1],
    duration: 350,
    ease: 'inOutQuad',
  })
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
  return animate(target, {
    width: `${Math.min(100, Math.max(0, percent))}%`,
    duration: options?.duration ?? 700,
    ease: 'outCubic',
  })
}

export { animate, stagger }
