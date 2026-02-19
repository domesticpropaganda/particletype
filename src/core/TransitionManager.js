export class TransitionManager {
  constructor() {
    // Transition configuration
    this.transitionType = 'fade'; // 'fade', 'slide', 'explode', 'implode', 'spiral'
    this.transitionDirection = 'in'; // 'in' or 'out'
    this.transitionMode = 'per-letter'; // 'per-letter' or 'per-word'

    // Timing
    this.transitionDuration = 3.0; // seconds per letter/word
    this.staggerDelay = 0.1; // delay between each letter/word (0 = simultaneous)
    this.slideDirection = 'bottom'; // for slide transition: 'top', 'bottom', 'left', 'right'

    // State
    this.isActive = false;
    this.startTime = 0;
    this.totalUnits = 0; // total letters or words

    // Default state for new particles
    this.defaultVisible = true; // Start visible by default

    // Cache for particle states
    this.particleCache = new Map();
  }

  /**
   * Start a transition
   * @param {string} direction - 'in' or 'out'
   * @param {string} type - transition type
   * @param {string} mode - 'per-letter' or 'per-word'
   * @param {number} currentTime - current animation time
   * @param {number} totalUnits - total number of letters or words
   */
  start(direction, type, mode, currentTime, totalUnits = 0) {
    this.transitionDirection = direction;
    this.transitionType = type;
    this.transitionMode = mode;
    this.startTime = currentTime;
    this.totalUnits = totalUnits;
    this.isActive = true;
    this.particleCache.clear();
  }

  /**
   * Stop/complete transition
   */
  stop() {
    this.isActive = false;
    this.particleCache.clear();

    // Update default visibility based on last transition
    if (this.transitionDirection === 'in') {
      this.defaultVisible = true;
    } else {
      this.defaultVisible = false;
    }
  }

  /**
   * Get transition state for a particle
   * @param {number} particleIndex - index of the particle
   * @param {object} metadata - particle metadata with charIndex/wordIndex
   * @param {number} currentTime - current animation time
   * @returns {object} { offset: {x, y, z}, opacity: number }
   */
  getParticleTransition(particleIndex, metadata, currentTime) {
    // Default result (no transition)
    const defaultResult = {
      offset: { x: 0, y: 0, z: 0 },
      opacity: this.defaultVisible ? 1.0 : 0.0
    };

    if (!this.isActive) {
      return defaultResult;
    }

    // Determine which unit (letter or word) this particle belongs to
    const unitIndex = this.transitionMode === 'per-letter'
      ? metadata.charIndex
      : metadata.wordIndex;

    if (unitIndex === undefined) {
      return defaultResult;
    }

    // Calculate transition progress for this unit
    const unitStartTime = this.startTime + (unitIndex * this.staggerDelay);
    const elapsed = currentTime - unitStartTime;

    // Not started yet
    if (elapsed < 0) {
      return {
        offset: { x: 0, y: 0, z: 0 },
        opacity: this.transitionDirection === 'in' ? 0.0 : 1.0
      };
    }

    // Calculate progress (0 to 1)
    let progress = Math.min(elapsed / this.transitionDuration, 1.0);

    // Apply easing
    progress = this.easeInOutCubic(progress);

    // Invert progress for 'out' transitions
    if (this.transitionDirection === 'out') {
      progress = 1.0 - progress;
    }

    // Calculate offset and opacity based on transition type
    return this.calculateTransition(progress, metadata, unitIndex);
  }

  /**
   * Calculate transition offset and opacity based on type
   */
  calculateTransition(progress, metadata, unitIndex) {
    const offset = { x: 0, y: 0, z: 0 };
    let opacity = progress;

    switch (this.transitionType) {
      case 'fade':
        // Z-depth emergence: particles come from behind toward the viewer
        offset.z = (1.0 - progress) * -8;
        break;

      case 'slide':
        // Slide in from direction
        const slideDistance = (1.0 - progress) * 30;
        switch (this.slideDirection) {
          case 'top':
            offset.y = slideDistance;
            break;
          case 'bottom':
            offset.y = -slideDistance;
            break;
          case 'left':
            offset.x = -slideDistance;
            break;
          case 'right':
            offset.x = slideDistance;
            break;
        }
        break;

      case 'explode':
        // Particles scatter outward from center
        const explodeDistance = (1.0 - progress) * 20;
        const angle = (metadata.particleInChar || 0) * 0.5;
        offset.x = Math.cos(angle) * explodeDistance;
        offset.y = Math.sin(angle) * explodeDistance;
        offset.z = (1.0 - progress) * 10;
        break;

      case 'implode':
        // Particles converge inward toward center
        const implodeDistance = (1.0 - progress) * 20;
        const implodeAngle = (metadata.particleInChar || 0) * 0.5;
        offset.x = -Math.cos(implodeAngle) * implodeDistance;
        offset.y = -Math.sin(implodeAngle) * implodeDistance;
        offset.z = -(1.0 - progress) * 10;
        break;

      case 'spiral':
        // Spiral in/out
        const spiralRadius = (1.0 - progress) * 15;
        const spiralAngle = (1.0 - progress) * Math.PI * 4 + unitIndex * 0.3;
        offset.x = Math.cos(spiralAngle) * spiralRadius;
        offset.y = Math.sin(spiralAngle) * spiralRadius;
        offset.z = (1.0 - progress) * 8;
        break;
    }

    return { offset, opacity };
  }

  /**
   * Easing function for smooth transitions
   */
  easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Check if transition is complete
   */
  isComplete(currentTime) {
    if (!this.isActive) return true;

    const lastUnitStartTime = this.startTime + (this.totalUnits - 1) * this.staggerDelay;
    const endTime = lastUnitStartTime + this.transitionDuration;

    return currentTime >= endTime;
  }

  /**
   * Set transition parameters
   */
  setType(type) {
    this.transitionType = type;
  }

  setMode(mode) {
    this.transitionMode = mode;
  }

  setDuration(duration) {
    this.transitionDuration = duration;
  }

  setStaggerDelay(delay) {
    this.staggerDelay = delay;
  }

  setSlideDirection(direction) {
    this.slideDirection = direction;
  }
}
