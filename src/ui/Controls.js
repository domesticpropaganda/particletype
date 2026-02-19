import GUI from 'lil-gui';

export class Controls {
  constructor(particleSystem, fontRenderer, recorder = null) {
    this.particleSystem = particleSystem;
    this.fontRenderer = fontRenderer;
    this.recorder = recorder;
    this.gui = new GUI();
    this.gui.title('3DType Controls');

    this.params = {
      // Appearance
      particleSize: 0.3,
      particleColor: '#FFFFFF',
      opacity: 1.0,
      meshRotation: 0,

      // Animation (unified)
      animationSpeed: 1.0,
      stagger: 0.0,
      spread: 0.0,
      bounceAmount: 0.0,
      bounceSpeed: 1.0,
      rotationAmount: 0.0,
      rotationSpeed: 1.0,
      scaleAmount: 0.0,
      scaleSpeed: 1.0,
      waveAmount: 0.0,
      waveSpeed: 1.0,
      noiseAmount: 0.0,
      noiseSpeed: 0.5,

      // Transitions
      transitionType: 'fade',
      transitionMode: 'per-letter',
      transitionDuration: 3.0,
      transitionStagger: 0.1,
      transitionSlideDir: 'bottom',
      transitionIn: () => this.triggerTransitionIn(),
      transitionOut: () => this.triggerTransitionOut(),

      // Typography
      letterSpacing: 1.0,
      dotSpacing: 0.5,

      // Export
      exportFormat: 'webm',
      exportFPS: 60,
      exportQuality: 0.95,

      // Presets
      preset: 'Default',

      // Actions
      reset: () => this.reset(),
      screenshot: () => this.takeScreenshot(),
      recordVideo: () => this.recordVideo(),
      recordFrames: () => this.recordFrames()
    };

    this.setupGUI();
  }

  setupGUI() {
    // Appearance folder
    const appearance = this.gui.addFolder('Appearance');
    appearance.add(this.params, 'particleSize', 0.1, 2.0, 0.1)
      .name('Particle Size')
      .onChange((value) => {
        this.particleSystem.updateParams({ size: value });
      });

    appearance.addColor(this.params, 'particleColor')
      .name('Color')
      .onChange((value) => {
        const color = parseInt(value.replace('#', ''), 16);
        this.particleSystem.updateParams({ color });
      });

    appearance.add(this.params, 'opacity', 0, 1, 0.05)
      .name('Opacity')
      .onChange((value) => {
        this.particleSystem.updateParams({ opacity: value });
      });

    appearance.add(this.params, 'meshRotation', 0, 360, 1)
      .name('Rotation')
      .onChange((value) => {
        this.particleSystem.meshRotation = value;
      });

    appearance.open();

    // Animation folder (unified)
    const animation = this.gui.addFolder('Animation');

    animation.add(this.params, 'animationSpeed', 0, 3, 0.1)
      .name('Speed')
      .onChange((value) => {
        this.particleSystem.animationSpeed = value;
      });

    animation.add(this.params, 'stagger', 0, 0.5, 0.01)
      .name('Stagger')
      .onChange((value) => {
        this.particleSystem.setTarget('stagger', value);
      });

    animation.add(this.params, 'spread', 0, 1, 0.05)
      .name('Spread')
      .onChange((value) => {
        this.particleSystem.setTarget('spread', value);
      });

    animation.add(this.params, 'bounceAmount', 0, 3, 0.1)
      .name('Bounce Amount')
      .onChange((value) => {
        this.particleSystem.setTarget('bounceAmount', value);
      });

    animation.add(this.params, 'bounceSpeed', 0, 3, 0.1)
      .name('Bounce Speed')
      .onChange((value) => {
        this.particleSystem.bounceSpeed = value;
      });

    animation.add(this.params, 'rotationAmount', 0, 1, 0.05)
      .name('Rotation Amount')
      .onChange((value) => {
        this.particleSystem.setTarget('rotationAmount', value);
      });

    animation.add(this.params, 'rotationSpeed', 0, 3, 0.1)
      .name('Rotation Speed')
      .onChange((value) => {
        this.particleSystem.rotationSpeed = value;
      });

    animation.add(this.params, 'scaleAmount', 0, 0.5, 0.05)
      .name('Scale Amount')
      .onChange((value) => {
        this.particleSystem.setTarget('scaleAmount', value);
      });

    animation.add(this.params, 'scaleSpeed', 0, 3, 0.1)
      .name('Scale Speed')
      .onChange((value) => {
        this.particleSystem.scaleSpeed = value;
      });

    animation.add(this.params, 'waveAmount', 0, 5, 0.1)
      .name('Wave Amount')
      .onChange((value) => {
        this.particleSystem.setTarget('waveAmount', value);
      });

    animation.add(this.params, 'waveSpeed', 0, 3, 0.1)
      .name('Wave Speed')
      .onChange((value) => {
        this.particleSystem.waveSpeed = value;
      });

    animation.add(this.params, 'noiseAmount', 0, 3, 0.1)
      .name('Noise Amount')
      .onChange((value) => {
        this.particleSystem.setTarget('noiseAmount', value);
      });

    animation.add(this.params, 'noiseSpeed', 0, 2, 0.1)
      .name('Noise Speed')
      .onChange((value) => {
        this.particleSystem.noiseSpeed = value;
      });

    animation.open();

    // Transitions folder
    const transitions = this.gui.addFolder('Transitions');

    transitions.add(this.params, 'transitionType', [
      'fade',
      'slide',
      'explode',
      'implode',
      'spiral'
    ])
      .name('Type')
      .onChange((value) => {
        this.particleSystem.transitionManager.setType(value);
      });

    transitions.add(this.params, 'transitionMode', ['per-letter', 'per-word'])
      .name('Mode')
      .onChange((value) => {
        this.particleSystem.transitionManager.setMode(value);
      });

    transitions.add(this.params, 'transitionDuration', 0.1, 3.0, 0.1)
      .name('Duration')
      .onChange((value) => {
        this.particleSystem.transitionManager.setDuration(value);
      });

    transitions.add(this.params, 'transitionStagger', 0, 0.5, 0.01)
      .name('Stagger Delay')
      .onChange((value) => {
        this.particleSystem.transitionManager.setStaggerDelay(value);
      });

    transitions.add(this.params, 'transitionSlideDir', ['top', 'bottom', 'left', 'right'])
      .name('Slide Direction')
      .onChange((value) => {
        this.particleSystem.transitionManager.setSlideDirection(value);
      });

    transitions.add(this.params, 'transitionIn')
      .name('⬇️ Transition In');

    transitions.add(this.params, 'transitionOut')
      .name('⬆️ Transition Out');

    transitions.open();

    // Typography folder
    const typography = this.gui.addFolder('Typography');

    typography.add(this.params, 'letterSpacing', 0, 5, 0.5)
      .name('Letter Spacing')
      .onChange((value) => {
        this.fontRenderer.setLetterSpacing(value);
        // Trigger text update in App
        this.onTypographyChange?.();
      });

    typography.add(this.params, 'dotSpacing', 0.5, 2, 0.1)
      .name('Dot Spacing')
      .onChange((value) => {
        this.fontRenderer.setDotSpacing(value);
        this.onTypographyChange?.();
      });

    // Export folder
    if (this.recorder) {
      const exportFolder = this.gui.addFolder('Export');

      exportFolder.add(this.params, 'exportFormat', ['webm', 'frames'])
        .name('Format');

      exportFolder.add(this.params, 'exportFPS', 30, 60, 1)
        .name('FPS');

      exportFolder.add(this.params, 'exportQuality', 0.5, 1, 0.05)
        .name('Quality');

      exportFolder.add(this.params, 'screenshot')
        .name('📸 Screenshot');

      exportFolder.add(this.params, 'recordVideo')
        .name('🎥 Record Video');

      exportFolder.add(this.params, 'recordFrames')
        .name('🖼️ Record Frames');
    }

    // Presets
    this.gui.add(this.params, 'preset', [
      'Default',
      'Matrix Rain',
      'Pulse',
      'Wave',
      'Chaos',
      'Subtle',
      'Typewriter',
      'Dancing Letters',
      'Breathing Text'
    ]).name('Preset').onChange((preset) => this.loadPreset(preset));

    // Actions
    this.gui.add(this.params, 'reset').name('Reset All');

    // Position GUI
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '20px';
    this.gui.domElement.style.right = '20px';

    // Hidden by default
    this.gui.domElement.style.display = 'none';
  }

  loadPreset(presetName) {
    const presets = {
      'Default': {
        particleSize: 0.3,
        animationSpeed: 1.0,
        meshRotation: 0,
        stagger: 0.0,
        spread: 0.0,
        bounceAmount: 0.0,
        bounceSpeed: 1.0,
        rotationAmount: 0.0,
        rotationSpeed: 1.0,
        scaleAmount: 0.0,
        scaleSpeed: 1.0,
        waveAmount: 0.0,
        waveSpeed: 1.0,
        noiseAmount: 0.0,
        noiseSpeed: 0.5
      },
      'Matrix Rain': {
        particleSize: 0.2,
        animationSpeed: 1.5,
        meshRotation: 0,
        stagger: 0.0,
        spread: 0.0,
        bounceAmount: 0.0,
        bounceSpeed: 1.0,
        rotationAmount: 0.0,
        rotationSpeed: 1.0,
        scaleAmount: 0.3,
        scaleSpeed: 2.0,
        waveAmount: 2.0,
        waveSpeed: 1.5,
        noiseAmount: 0.0,
        noiseSpeed: 0.5
      },
      'Pulse': {
        particleSize: 0.4,
        animationSpeed: 1.2,
        meshRotation: 0,
        stagger: 0.0,
        spread: 0.0,
        bounceAmount: 0.0,
        bounceSpeed: 1.0,
        rotationAmount: 0.0,
        rotationSpeed: 1.0,
        scaleAmount: 0.5,
        scaleSpeed: 1.5,
        waveAmount: 0.0,
        waveSpeed: 1.0,
        noiseAmount: 0.0,
        noiseSpeed: 0.5
      },
      'Wave': {
        particleSize: 0.3,
        animationSpeed: 1.0,
        meshRotation: 0,
        stagger: 0.0,
        spread: 0.0,
        bounceAmount: 0.0,
        bounceSpeed: 1.0,
        rotationAmount: 0.0,
        rotationSpeed: 1.0,
        scaleAmount: 0.0,
        scaleSpeed: 1.0,
        waveAmount: 3.0,
        waveSpeed: 1.0,
        noiseAmount: 0.0,
        noiseSpeed: 0.5
      },
      'Chaos': {
        particleSize: 0.25,
        animationSpeed: 2.0,
        meshRotation: 0,
        stagger: 0.0,
        spread: 0.0,
        bounceAmount: 0.0,
        bounceSpeed: 1.0,
        rotationAmount: 0.0,
        rotationSpeed: 1.0,
        scaleAmount: 0.5,
        scaleSpeed: 2.5,
        waveAmount: 2.0,
        waveSpeed: 2.0,
        noiseAmount: 2.0,
        noiseSpeed: 1.5
      },
      'Subtle': {
        particleSize: 0.3,
        animationSpeed: 0.5,
        meshRotation: 0,
        stagger: 0.0,
        spread: 0.0,
        bounceAmount: 0.0,
        bounceSpeed: 1.0,
        rotationAmount: 0.0,
        rotationSpeed: 1.0,
        scaleAmount: 0.1,
        scaleSpeed: 0.5,
        waveAmount: 0.5,
        waveSpeed: 0.5,
        noiseAmount: 0.0,
        noiseSpeed: 0.5
      },
      'Typewriter': {
        particleSize: 0.3,
        animationSpeed: 1.0,
        meshRotation: 0,
        stagger: 0.2,
        spread: 0.3,
        bounceAmount: 1.0,
        bounceSpeed: 3.0,
        rotationAmount: 0.0,
        rotationSpeed: 1.0,
        scaleAmount: 0.2,
        scaleSpeed: 2.0,
        waveAmount: 0.0,
        waveSpeed: 1.0,
        noiseAmount: 0.0,
        noiseSpeed: 0.5
      },
      'Dancing Letters': {
        particleSize: 0.3,
        animationSpeed: 1.0,
        meshRotation: 0,
        stagger: 0.15,
        spread: 0.7,
        bounceAmount: 2.0,
        bounceSpeed: 1.5,
        rotationAmount: 0.3,
        rotationSpeed: 1.0,
        scaleAmount: 0.0,
        scaleSpeed: 1.0,
        waveAmount: 0.0,
        waveSpeed: 1.0,
        noiseAmount: 0.0,
        noiseSpeed: 0.5
      },
      'Breathing Text': {
        particleSize: 0.3,
        animationSpeed: 0.8,
        meshRotation: 0,
        stagger: 0.08,
        spread: 0.4,
        bounceAmount: 0.5,
        bounceSpeed: 0.8,
        rotationAmount: 0.0,
        rotationSpeed: 1.0,
        scaleAmount: 0.3,
        scaleSpeed: 1.0,
        waveAmount: 0.0,
        waveSpeed: 1.0,
        noiseAmount: 0.0,
        noiseSpeed: 0.5
      }
    };

    const preset = presets[presetName];
    if (preset) {
      Object.keys(preset).forEach(key => {
        this.params[key] = preset[key];
        if (key === 'particleSize') {
          this.particleSystem.updateParams({ size: preset[key] });
        } else {
          this.particleSystem.setTarget(key, preset[key]);
        }
      });
      this.gui.controllersRecursive().forEach(c => c.updateDisplay());
    }
  }

  reset() {
    this.loadPreset('Default');
    this.params.letterSpacing = 1.5;
    this.params.dotSpacing = 1.0;
    this.fontRenderer.setLetterSpacing(1.5);
    this.fontRenderer.setDotSpacing(1.0);
    this.onTypographyChange?.();
    this.gui.controllersRecursive().forEach(c => c.updateDisplay());
  }

  takeScreenshot() {
    if (!this.recorder) {
      alert('Recorder not available');
      return;
    }
    this.recorder.captureScreenshot();
  }

  async recordVideo() {
    if (!this.recorder) {
      alert('Recorder not available');
      return;
    }

    if (this.recorder.getIsRecording()) {
      alert('Already recording');
      return;
    }

    const confirmed = confirm('Start recording video? This will play your animation timeline.');
    if (!confirmed) return;

    await this.recorder.startRecording({
      format: 'webm',
      fps: this.params.exportFPS,
      quality: this.params.exportQuality
    });
  }

  async recordFrames() {
    if (!this.recorder) {
      alert('Recorder not available');
      return;
    }

    if (this.recorder.getIsRecording()) {
      alert('Already recording');
      return;
    }

    const confirmed = confirm('Start recording frames? This may take a while depending on animation length.');
    if (!confirmed) return;

    // Show progress
    this.recorder.onProgress = (current, total) => {
      console.log(`Recording frame ${current}/${total}`);
    };

    await this.recorder.startRecording({
      format: 'frames',
      fps: this.params.exportFPS,
      quality: this.params.exportQuality
    });

    alert('Frame recording complete!');
  }

  triggerTransitionIn() {
    this.particleSystem.transitionIn(
      this.params.transitionType,
      this.params.transitionMode
    );
  }

  triggerTransitionOut() {
    this.particleSystem.transitionOut(
      this.params.transitionType,
      this.params.transitionMode
    );
  }

  destroy() {
    this.gui.destroy();
  }
}
