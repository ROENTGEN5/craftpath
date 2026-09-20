/**
 * Calming & Satisfying Web Audio Synthesizer
 * Zero external audio files required, zero latency, soothing acoustic frequencies.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

// Global sound preference
let isSoundMuted = false

export function setSoundMuted(muted: boolean) {
  isSoundMuted = muted
}

export function getSoundMuted(): boolean {
  return isSoundMuted
}

/**
 * Subtle, satisfying tactile button tap (wooden switch / soft droplet)
 */
export function playClickSound() {
  if (isSoundMuted) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(420, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.04)

    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.04)
  } catch (err) {
    console.debug('playClickSound error:', err)
  }
}

/**
 * Satisfying wooden pop / bubble sound for checking checkboxes
 */
export function playPopSound() {
  if (isSoundMuted) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(240, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.05)
    osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.09)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.09)
  } catch (err) {
    console.debug('playPopSound error:', err)
  }
}

/**
 * Calming, serene glass / kalimba chime for task completion
 */
export function playTaskCompleteSound() {
  if (isSoundMuted) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const notes = [523.25, 659.25] // C5, E5

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + index * 0.06)

      gain.gain.setValueAtTime(0.14, now + index * 0.06)
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + index * 0.06)
      osc.stop(now + index * 0.06 + 0.35)
    })
  } catch (err) {
    console.debug('playTaskCompleteSound error:', err)
  }
}

/**
 * Harmonious, warm chime celebration for streak extension
 */
export function playStreakCelebrationSound() {
  if (isSoundMuted) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    // Ascending warm chord: C5, E5, G5, C6
    const chord = [523.25, 659.25, 783.99, 1046.5]

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + idx * 0.08)

      gain.gain.setValueAtTime(0.12, now + idx * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.65)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + idx * 0.08)
      osc.stop(now + idx * 0.08 + 0.65)
    })
  } catch (err) {
    console.debug('playStreakCelebrationSound error:', err)
  }
}

/**
 * Gentle two-tone glide for rescheduling
 */
export function playRescheduleSound() {
  if (isSoundMuted) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(360, now)
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.12)

    gain.gain.setValueAtTime(0.09, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.12)
  } catch (err) {
    console.debug('playRescheduleSound error:', err)
  }
}

/**
 * Soft subtle whoosh for delete/dismiss
 */
export function playDeleteSound() {
  if (isSoundMuted) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.1)

    gain.gain.setValueAtTime(0.07, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.1)
  } catch (err) {
    console.debug('playDeleteSound error:', err)
  }
}
