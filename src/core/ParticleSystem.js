import * as THREE from 'three';
import { noise } from '../utils/math.js';
import { TransitionManager } from './TransitionManager.js';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = null;
    this.particleCount = 0;

    // Store original positions for animation
    this.originalPositions = [];
    this.particleMetadata = [];

    // Transition system
    this.transitionManager = new TransitionManager();

    // Create circular particle texture
    this.particleTexture = this.createCircleTexture();

    // Particle parameters
    this.params = {
      size: 0.3,
      color: 0xFFFFFF,
      opacity: 1.0
    };

    // Master timing
    this.time = 0;
    this.animationSpeed = 1.0;

    // Lerp rate: how fast current values approach targets (0-1, higher = faster)
    this.lerpRate = 0.08;

    // Active values (used by updateParticlePositions, lerped each frame)
    this.stagger = 0.0;
    this.spread = 0.0;
    this.meshRotation = 0; // degrees (0-360)
    this.bounceAmount = 0.0;
    this.bounceSpeed = 1.0;
    this.rotationAmount = 0.0;
    this.rotationSpeed = 1.0;
    this.scaleAmount = 0.0;
    this.scaleSpeed = 1.0;
    this.waveAmount = 0.0;
    this.waveSpeed = 1.0;
    this.noiseAmount = 0.0;
    this.noiseSpeed = 0.5;

    // Target values (set by GUI sliders)
    this._targets = {
      stagger: 0.0,
      spread: 0.0,
      bounceAmount: 0.0,
      rotationAmount: 0.0,
      scaleAmount: 0.0,
      waveAmount: 0.0,
      noiseAmount: 0.0
    };
    this._isLerping = false;

    // Precomputed character centers for rotation/scale pivots
    this.charCenters = {};
  }

  updateParticles(positions, metadata = []) {
    // Remove old particle system if exists
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      this.particles.material.dispose();
    }

    this.particleCount = positions.length;

    if (this.particleCount === 0) {
      return;
    }

    // Store original positions and metadata
    this.originalPositions = positions.map(p => ({ ...p }));
    this.particleMetadata = metadata;

    // Precompute character centers for rotation/scale pivots
    this.charCenters = {};
    const charAccum = {};
    for (let i = 0; i < this.particleCount; i++) {
      const meta = this.particleMetadata[i];
      if (meta && meta.charIndex !== undefined) {
        if (!charAccum[meta.charIndex]) {
          charAccum[meta.charIndex] = { sumX: 0, sumY: 0, count: 0 };
        }
        charAccum[meta.charIndex].sumX += this.originalPositions[i].x;
        charAccum[meta.charIndex].sumY += this.originalPositions[i].y;
        charAccum[meta.charIndex].count++;
      }
    }
    for (const idx in charAccum) {
      const acc = charAccum[idx];
      this.charCenters[idx] = { x: acc.sumX / acc.count, y: acc.sumY / acc.count };
    }

    // Create buffer geometry
    const geometry = new THREE.BufferGeometry();

    // Setup position attributes (will be updated in animation)
    const positionsArray = new Float32Array(this.particleCount * 3);

    positions.forEach((pos, i) => {
      positionsArray[i * 3] = pos.x;
      positionsArray[i * 3 + 1] = pos.y;
      positionsArray[i * 3 + 2] = pos.z;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));
    geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);

    // Create particle material
    const material = new THREE.PointsMaterial({
      size: this.params.size,
      color: this.params.color,
      transparent: true,
      opacity: this.params.opacity,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.particleTexture
    });

    // Create particle system
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  update() {
    if (!this.particles) return;

    this.time += 0.016 * this.animationSpeed; // ~60fps

    // Lerp active values toward targets
    this._isLerping = false;
    for (const key in this._targets) {
      const diff = this._targets[key] - this[key];
      if (Math.abs(diff) > 0.001) {
        this[key] += diff * this.lerpRate;
        this._isLerping = true;
      } else if (diff !== 0) {
        this[key] = this._targets[key];
      }
    }

    // Check if transition is complete (once per frame, not per particle)
    if (this.transitionManager.isActive && this.transitionManager.isComplete(this.time)) {
      this.transitionManager.stop();
    }

    // Global mesh rotation (static angle)
    this.particles.rotation.y = this.meshRotation * (Math.PI / 180);

    // Per-particle animation (update when effects active, lerping, or transitions)
    const needsUpdate = this.bounceAmount > 0 ||
                        this.rotationAmount > 0 ||
                        this.scaleAmount > 0 ||
                        this.waveAmount > 0 ||
                        this.noiseAmount > 0 ||
                        this._isLerping ||
                        this.transitionManager.isActive ||
                        (!this.transitionManager.defaultVisible && this.particleMetadata.length > 0);

    if (needsUpdate) {
      this.updateParticlePositions();
    }
  }

  updateParticlePositions() {
    const positions = this.particles.geometry.attributes.position.array;
    const staggerBlend = Math.min(this.stagger * 10, 1); // 0=global, 1=per-char

    for (let i = 0; i < this.particleCount; i++) {
      const orig = this.originalPositions[i];
      const meta = this.particleMetadata[i] || {};

      let x = orig.x;
      let y = orig.y;
      let z = orig.z;

      // Get transition data
      const transition = this.transitionManager.getParticleTransition(i, meta, this.time);

      // Compute shared timing
      const charIndex = meta.charIndex !== undefined ? meta.charIndex : 0;
      const particleInChar = meta.particleInChar !== undefined ? meta.particleInChar : 0;
      const charDelay = charIndex * this.stagger;
      const particlePhaseOffset = this.spread * particleInChar * 0.15;
      const effectTime = this.time - charDelay + particlePhaseOffset;

      // Character center for pivot (rotation/scale)
      const charCenter = this.charCenters[charIndex] || { x: 0, y: 0 };
      const pivotX = staggerBlend * charCenter.x;
      const pivotY = staggerBlend * charCenter.y;

      // --- Bounce (vertical displacement) ---
      if (this.bounceAmount > 0) {
        y += Math.sin(effectTime * this.bounceSpeed) * this.bounceAmount;
      }

      // --- Rotation (2D around pivot) ---
      if (this.rotationAmount > 0) {
        const rotAngle = Math.sin(effectTime * this.rotationSpeed * 2) * this.rotationAmount;
        const relX = x - pivotX;
        const relY = y - pivotY;
        const cosA = Math.cos(rotAngle);
        const sinA = Math.sin(rotAngle);
        x = pivotX + relX * cosA - relY * sinA;
        y = pivotY + relX * sinA + relY * cosA;
      }

      // --- Scale (from pivot, with z-depth at low stagger) ---
      if (this.scaleAmount > 0) {
        const scalePhase = effectTime * this.scaleSpeed * 2;
        const scale = 1 + Math.sin(scalePhase) * this.scaleAmount;
        x = pivotX + (x - pivotX) * scale;
        y = pivotY + (y - pivotY) * scale;
        // Z-depth component (fades out as stagger increases)
        z += Math.sin(scalePhase + i * 0.1) * this.scaleAmount * 2 * (1 - staggerBlend);
      }

      // --- Wave (z-axis displacement, blend spatial/index) ---
      if (this.waveAmount > 0) {
        // Spatial phase (position-based)
        const spatialPhase = this.time * this.waveSpeed;
        const spatialWave =
          Math.sin(orig.x * 0.5 + spatialPhase) * this.waveAmount +
          Math.cos(orig.y * 0.5 + spatialPhase * 0.7) * this.waveAmount * 0.5;

        // Index phase (character/particle-based)
        const indexPhase = effectTime * this.waveSpeed;
        const indexWave =
          Math.sin(indexPhase) * this.waveAmount +
          Math.cos(indexPhase * 0.7) * this.waveAmount * 0.5;

        z += spatialWave * (1 - staggerBlend) + indexWave * staggerBlend;
      }

      // --- Noise (xyz displacement, blend spatial/character-grouped) ---
      if (this.noiseAmount > 0) {
        const noiseTime = this.time * this.noiseSpeed;

        // Spatial noise
        const sNX = noise.noise(orig.x * 0.1, orig.y * 0.1, noiseTime);
        const sNY = noise.noise(orig.x * 0.1 + 100, orig.y * 0.1, noiseTime);
        const sNZ = noise.noise(orig.x * 0.1, orig.y * 0.1 + 100, noiseTime);

        // Character-grouped noise
        const charNoiseTime = noiseTime - charDelay + particlePhaseOffset;
        const cNX = noise.noise(charIndex * 1.7, 0, charNoiseTime);
        const cNY = noise.noise(charIndex * 1.7 + 100, 0, charNoiseTime);
        const cNZ = noise.noise(charIndex * 1.7, 100, charNoiseTime);

        x += (sNX * (1 - staggerBlend) + cNX * staggerBlend) * this.noiseAmount;
        y += (sNY * (1 - staggerBlend) + cNY * staggerBlend) * this.noiseAmount;
        z += (sNZ * (1 - staggerBlend) + cNZ * staggerBlend) * this.noiseAmount;
      }

      // Apply transition offset
      x += transition.offset.x;
      y += transition.offset.y;
      z += transition.offset.z;

      // Handle opacity — push well beyond camera far plane (1000)
      if (transition.opacity < 0.01) {
        x = 0;
        y = 0;
        z = -9999;
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  updateParams(params) {
    this.params = { ...this.params, ...params };

    if (this.particles && this.particles.material) {
      if (params.size !== undefined) {
        this.particles.material.size = params.size;
      }
      if (params.color !== undefined) {
        this.particles.material.color.setHex(params.color);
      }
      if (params.opacity !== undefined) {
        this.particles.material.opacity = params.opacity;
      }
    }
  }

  getParticleCount() {
    return this.particleCount;
  }

  /**
   * Transition control methods
   */
  transitionIn(type = 'fade', mode = 'per-letter') {
    const totalUnits = mode === 'per-letter'
      ? this.getTotalChars()
      : this.getTotalWords();

    this.transitionManager.start('in', type, mode, this.time, totalUnits);
  }

  transitionOut(type = 'fade', mode = 'per-letter') {
    const totalUnits = mode === 'per-letter'
      ? this.getTotalChars()
      : this.getTotalWords();

    this.transitionManager.start('out', type, mode, this.time, totalUnits);
  }

  stopTransition() {
    this.transitionManager.stop();
  }

  isTransitioning() {
    return this.transitionManager.isActive;
  }

  getTotalChars() {
    if (this.particleMetadata.length === 0) return 0;
    return Math.max(...this.particleMetadata.map(m => m.charIndex)) + 1;
  }

  /**
   * Set a lerped parameter target (for smooth GUI control)
   */
  setTarget(key, value) {
    if (key in this._targets) {
      this._targets[key] = value;
    } else {
      // Non-lerped params apply directly
      this[key] = value;
    }
  }

  getTotalWords() {
    if (this.particleMetadata.length === 0) return 0;
    return Math.max(...this.particleMetadata.map(m => m.wordIndex)) + 1;
  }

  /**
   * Apply a full parameter snapshot directly (bypasses lerp).
   * Used by AnimationEngine during timeline playback.
   */
  applySnapshot(values) {
    const lerped = ['stagger', 'spread', 'bounceAmount', 'rotationAmount', 'scaleAmount', 'waveAmount', 'noiseAmount'];
    for (const key of lerped) {
      if (key in values) {
        this[key] = values[key];
        this._targets[key] = values[key];
      }
    }
    if ('meshRotation' in values) this.meshRotation = values.meshRotation;
    if ('particleSize' in values) this.updateParams({ size: values.particleSize });
    if ('opacity' in values) this.updateParams({ opacity: values.opacity });
  }

  /**
   * Create a circular texture for particles
   */
  createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2;

    // Create radial gradient for smooth edges
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
  }
}
