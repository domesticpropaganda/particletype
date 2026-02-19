// Default parameter values (initial state before any keyframe)
export const PARAM_DEFAULTS = {
  stagger: 0,
  spread: 0,
  bounceAmount: 0,
  rotationAmount: 0,
  scaleAmount: 0,
  waveAmount: 0,
  noiseAmount: 0,
  meshRotation: 0,
  particleSize: 0.3,
  opacity: 1
};

// Parameter ranges and steps (shared with Timeline editor)
export const PARAM_RANGES = {
  stagger:        { min: 0, max: 0.5, step: 0.01 },
  spread:         { min: 0, max: 1,   step: 0.05 },
  bounceAmount:   { min: 0, max: 3,   step: 0.1  },
  rotationAmount: { min: 0, max: 1,   step: 0.05 },
  scaleAmount:    { min: 0, max: 0.5, step: 0.05 },
  waveAmount:     { min: 0, max: 5,   step: 0.1  },
  noiseAmount:    { min: 0, max: 3,   step: 0.1  },
  meshRotation:   { min: -360, max: 360, step: 1    },
  particleSize:   { min: 0.1, max: 2, step: 0.1  },
  opacity:        { min: 0, max: 1,   step: 0.05 }
};

// Available easing functions
export const EASING_OPTIONS = ['linear', 'ease-in', 'ease-out', 'ease-in-out'];

const easingFunctions = {
  'linear':      (t) => t,
  'ease-in':     (t) => t * t * t,
  'ease-out':    (t) => 1 - (1 - t) ** 3,
  'ease-in-out': (t) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
};

export class AnimationEngine {
  constructor(particleSystem) {
    this.particleSystem = particleSystem;

    // Timeline state
    this.duration = 10; // seconds
    this.animationKeyframes = new Map(); // key = integer seconds, value = { params: {...} }
    this.transitionKeyframes = new Map(); // key = integer seconds, value = { direction, transitionType, mode }
    this.isPlaying = false;
    this.isLooping = false;
    this.currentTime = 0;
    this.lastFrameTime = null;

    // Transition tracking — which transition keyframe time was last triggered
    this.activeTransitionTime = null;

    // Callbacks
    this.onTimeUpdate = null;
    this.onPlaybackEnd = null;
    this.onTransitionTrigger = null;
  }

  // --- Interpolation ---

  /**
   * Evaluate interpolated parameter values at a given time.
   * For each parameter independently: find surrounding animation keyframes
   * that define it, and linearly interpolate.
   */
  evaluateParamsAtTime(time) {
    // Collect animation keyframes sorted by time
    const animKFs = [];
    for (const [t, kf] of this.animationKeyframes) {
      animKFs.push({ time: t, params: kf.params, easing: kf.easing || 'linear' });
    }
    animKFs.sort((a, b) => a.time - b.time);

    const result = { ...PARAM_DEFAULTS };

    for (const paramName of Object.keys(PARAM_DEFAULTS)) {
      // Find keyframes that define this specific parameter
      const relevant = [];
      for (const kf of animKFs) {
        if (paramName in kf.params) {
          relevant.push({ time: kf.time, value: kf.params[paramName], easing: kf.easing });
        }
      }

      if (relevant.length === 0) continue; // stay at default

      // Before first keyframe: hold at default
      if (time <= relevant[0].time) continue;

      // After last keyframe: hold at last value
      if (time >= relevant[relevant.length - 1].time) {
        result[paramName] = relevant[relevant.length - 1].value;
        continue;
      }

      // Between two keyframes: eased interpolation
      for (let i = 0; i < relevant.length - 1; i++) {
        if (time >= relevant[i].time && time < relevant[i + 1].time) {
          const t0 = relevant[i].time;
          const t1 = relevant[i + 1].time;
          const v0 = relevant[i].value;
          const v1 = relevant[i + 1].value;
          const linearAlpha = (time - t0) / (t1 - t0);
          const easeFn = easingFunctions[relevant[i].easing] || easingFunctions['linear'];
          const alpha = easeFn(linearAlpha);
          result[paramName] = v0 + (v1 - v0) * alpha;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Apply interpolated values directly to ParticleSystem (bypasses lerp)
   */
  applyValuesAtTime(time) {
    const values = this.evaluateParamsAtTime(time);
    this.particleSystem.applySnapshot(values);
  }

  // --- Playback ---

  /**
   * Called every frame from the render loop.
   * Advances time and applies interpolated values when playing.
   */
  tick() {
    if (!this.isPlaying) return;

    const now = performance.now() / 1000;
    if (this.lastFrameTime === null) {
      this.lastFrameTime = now;
      return;
    }

    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    const prevTime = this.currentTime;
    this.currentTime += delta;

    // Check for transition keyframes crossed during this frame
    this.checkTransitions(prevTime, this.currentTime);

    // Clamp or loop
    if (this.currentTime >= this.duration) {
      if (this.isLooping) {
        this.currentTime = this.currentTime % this.duration;
        this.activeTransitionTime = null;
        // Check transitions in the wrapped range (0 → new currentTime)
        this.checkTransitions(0, this.currentTime);
      } else {
        this.currentTime = this.duration;
        this.isPlaying = false;
        this.lastFrameTime = null;
        this.onPlaybackEnd?.();
      }
    }

    // Apply interpolated values
    this.applyValuesAtTime(this.currentTime);

    // Notify UI
    this.onTimeUpdate?.(this.currentTime);
  }

  /**
   * Detect transition keyframes crossed during this frame and fire them
   */
  checkTransitions(prevTime, currTime) {
    for (const [time, kf] of this.transitionKeyframes) {
      // Fire if we just crossed this time boundary
      if (prevTime <= time && currTime >= time && this.activeTransitionTime !== time) {
        this.activeTransitionTime = time;
        this.onTransitionTrigger?.(kf);
      }
    }
  }

  play() {
    this.isPlaying = true;
    this.lastFrameTime = null;
  }

  pause() {
    this.isPlaying = false;
    this.lastFrameTime = null;
  }

  stop() {
    this.isPlaying = false;
    this.lastFrameTime = null;
    this.currentTime = 0;
    this.activeTransitionTime = null;
    this.applyValuesAtTime(0);
    this.onTimeUpdate?.(0);
  }

  seek(time) {
    this.currentTime = Math.max(0, Math.min(time, this.duration));
    this.activeTransitionTime = null;
    this.applyValuesAtTime(this.currentTime);
    this.onTimeUpdate?.(this.currentTime);
  }

  // --- Keyframe CRUD ---

  addAnimationKeyframe(time, params = {}, easing = 'linear') {
    this.animationKeyframes.set(time, { params, easing });
  }

  addTransitionKeyframe(time, data) {
    this.transitionKeyframes.set(time, {
      direction: data.direction || 'in',
      transitionType: data.transitionType || 'fade',
      mode: data.mode || 'per-letter',
      duration: data.duration ?? 3.0,
      stagger: data.stagger ?? 0.1,
      slideDirection: data.slideDirection || 'bottom'
    });
  }

  removeAnimationKeyframe(time) {
    this.animationKeyframes.delete(time);
  }

  removeTransitionKeyframe(time) {
    this.transitionKeyframes.delete(time);
  }

  getAnimationKeyframe(time) {
    return this.animationKeyframes.get(time) || null;
  }

  getTransitionKeyframe(time) {
    return this.transitionKeyframes.get(time) || null;
  }

  hasAnimationKeyframe(time) {
    return this.animationKeyframes.has(time);
  }

  hasTransitionKeyframe(time) {
    return this.transitionKeyframes.has(time);
  }

  // --- Duration ---

  getDuration() {
    return this.duration;
  }

  setDuration(newDuration) {
    // Remove keyframes beyond new duration
    for (const [time] of this.animationKeyframes) {
      if (time >= newDuration) this.animationKeyframes.delete(time);
    }
    for (const [time] of this.transitionKeyframes) {
      if (time >= newDuration) this.transitionKeyframes.delete(time);
    }
    this.duration = newDuration;
    if (this.currentTime > this.duration) {
      this.currentTime = this.duration;
    }
  }

  addSecond() {
    this.duration += 1;
  }

  removeLastSecond() {
    if (this.duration <= 1) return false;
    const lastSecond = this.duration - 1;
    // Don't remove if there are keyframes on the last second
    if (this.animationKeyframes.has(lastSecond) || this.transitionKeyframes.has(lastSecond)) {
      return false;
    }
    this.duration -= 1;
    return true;
  }

  // --- Export / Import ---

  exportAnimation() {
    const animArray = [];
    for (const [time, kf] of this.animationKeyframes) {
      animArray.push({ time, ...kf });
    }
    const transArray = [];
    for (const [time, kf] of this.transitionKeyframes) {
      transArray.push({ time, ...kf });
    }
    return {
      duration: this.duration,
      animationKeyframes: animArray,
      transitionKeyframes: transArray
    };
  }

  importAnimation(data) {
    if (!data) return false;

    this.animationKeyframes.clear();
    this.transitionKeyframes.clear();
    this.duration = data.duration || 10;

    // Support new format (separate arrays)
    if (data.animationKeyframes) {
      for (const kf of data.animationKeyframes) {
        const { time, ...rest } = kf;
        this.animationKeyframes.set(time, rest);
      }
    }
    if (data.transitionKeyframes) {
      for (const kf of data.transitionKeyframes) {
        const { time, ...rest } = kf;
        this.transitionKeyframes.set(time, rest);
      }
    }

    // Support old format (single keyframes array) for backwards compatibility
    if (data.keyframes && !data.animationKeyframes && !data.transitionKeyframes) {
      for (const kf of data.keyframes) {
        const { time, type, ...rest } = kf;
        if (type === 'animation') {
          this.animationKeyframes.set(time, rest);
        } else if (type === 'transition') {
          this.transitionKeyframes.set(time, rest);
        }
      }
    }

    return true;
  }

  clear() {
    this.animationKeyframes.clear();
    this.transitionKeyframes.clear();
    this.isPlaying = false;
    this.lastFrameTime = null;
    this.currentTime = 0;
    this.activeTransitionTime = null;
  }

  getCurrentTime() {
    return this.currentTime;
  }
}
