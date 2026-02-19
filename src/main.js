import { Scene } from './core/Scene.js';
import { ParticleSystem } from './core/ParticleSystem.js';
import { AnimationEngine } from './core/AnimationEngine.js';
import { FontGrid } from './typography/FontGrid.js';
import { FontRenderer } from './typography/FontRenderer.js';
import { FontEditor } from './typography/FontEditor.js';
import { Controls } from './ui/Controls.js';
import { Timeline } from './ui/Timeline.js';
import { Recorder } from './export/Recorder.js';

class App {
  constructor() {
    this.scene = new Scene('canvas-container');
    this.particleSystem = new ParticleSystem(this.scene);
    this.fontGrid = new FontGrid();
    this.fontRenderer = null;
    this.fontEditor = null;
    this.controls = null;
    this.animationEngine = null;
    this.timeline = null;
    this.recorder = null;
    this.currentText = 'HELLO';

    this.init();
  }

  async init() {
    // Load font
    await this.fontGrid.load('/fonts/default.json');
    this.fontRenderer = new FontRenderer(this.fontGrid);

    // Setup animation engine
    this.animationEngine = new AnimationEngine(this.particleSystem);

    // Wire transition callback
    this.animationEngine.onTransitionTrigger = (kf) => {
      const tm = this.particleSystem.transitionManager;
      tm.setDuration(kf.duration ?? 3.0);
      tm.setStaggerDelay(kf.stagger ?? 0.1);
      tm.setSlideDirection(kf.slideDirection || 'bottom');
      if (kf.direction === 'in') {
        this.particleSystem.transitionIn(kf.transitionType, kf.mode);
      } else {
        this.particleSystem.transitionOut(kf.transitionType, kf.mode);
      }
    };

    // Setup recorder
    this.recorder = new Recorder(this.scene, this.particleSystem, this.animationEngine);

    // Setup font editor
    this.fontEditor = new FontEditor(this.fontGrid, () => this.updateText(this.currentText));

    // Setup timeline (unified bottom bar with text input + controls)
    this.timeline = new Timeline(this.animationEngine, {
      onTextChange: (text) => this.updateText(text),
      onFontEditorToggle: () => this.fontEditor.toggle()
    });

    // Setup controls (pass recorder)
    this.controls = new Controls(this.particleSystem, this.fontRenderer, this.recorder);
    this.controls.onTypographyChange = () => this.updateText(this.currentText);

    // Render initial text
    this.updateText(this.currentText);

    // Start render loop
    this.animate();
  }

  updateText(text) {
    if (!this.fontRenderer) return;

    this.currentText = text;
    const result = this.fontRenderer.textToParticles(text);
    this.particleSystem.updateParticles(result.positions, result.metadata);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Tick timeline engine (advances time, applies interpolated values when playing)
    this.animationEngine.tick();

    // Update particle system
    this.particleSystem.update();

    // Render scene
    this.scene.render();
  }
}

// Initialize app when DOM is ready
new App();
