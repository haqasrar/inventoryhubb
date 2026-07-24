/**
 * A short confirmation for a scan, so the person at the counter knows it registered
 * without looking at the screen. Sound is generated live — no audio file to ship.
 */

let audioCtx

function tone(frequency, durationMs, type = 'sine') {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    // A gesture-less resume: some browsers suspend the context until first use.
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = type
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationMs / 1000)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + durationMs / 1000)
  } catch {
    // Audio is a nicety, never a reason to break scanning.
  }
}

function buzz(pattern) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* not supported */
  }
}

/** A found, matched product. */
export function beepSuccess() {
  tone(880, 120)
  buzz(40)
}

/** A scan that matched no product — deliberately lower and longer, easy to tell apart. */
export function beepError() {
  tone(220, 260, 'square')
  buzz([60, 50, 60])
}
