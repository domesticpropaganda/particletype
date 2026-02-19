import { PARAM_DEFAULTS, PARAM_RANGES, EASING_OPTIONS } from '../core/AnimationEngine.js';

// Human-readable labels for parameters
const PARAM_LABELS = {
  stagger: 'Stagger',
  spread: 'Spread',
  bounceAmount: 'Bounce',
  rotationAmount: 'Rotation',
  scaleAmount: 'Scale',
  waveAmount: 'Wave',
  noiseAmount: 'Noise',
  meshRotation: 'Mesh Rot',
  particleSize: 'Size',
  opacity: 'Opacity'
};

export class Timeline {
  constructor(animationEngine, options = {}) {
    this.engine = animationEngine;
    this.onTextChange = options.onTextChange || null;
    this.onFontEditorToggle = options.onFontEditorToggle || null;
    this.isGridVisible = false;
    this.selectedRow = null;
    this.selectedTime = null;

    this.createUI();
    this.bindEngineCallbacks();
    this.startUpdateLoop();
  }

  // --- UI Creation ---

  createUI() {
    // Main container (always visible bottom bar)
    this.container = document.createElement('div');
    this.container.className = 'timeline-container';

    // Controls row (always visible)
    this.container.appendChild(this.createControlsRow());

    // Collapsible grid section
    this.gridSection = document.createElement('div');
    this.gridSection.className = 'timeline-grid-section';
    this.gridSection.style.display = 'none';

    this.gridSection.appendChild(this.createGridArea());

    this.editorPanel = document.createElement('div');
    this.editorPanel.className = 'keyframe-editor';
    this.editorPanel.style.display = 'none';
    this.gridSection.appendChild(this.editorPanel);

    this.container.appendChild(this.gridSection);
    document.body.appendChild(this.container);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeEditor();
    });
  }

  createControlsRow() {
    const row = document.createElement('div');
    row.className = 'timeline-controls';

    const makeBtn = (text, onClick) => {
      const btn = document.createElement('button');
      btn.className = 'timeline-btn';
      btn.textContent = text;
      btn.addEventListener('click', onClick);
      return btn;
    };

    const makeSep = () => {
      const sep = document.createElement('div');
      sep.className = 'timeline-sep';
      return sep;
    };

    // Global typing (no visible text field)
    this.currentText = 'HELLO';
    this.bindGlobalTyping();

    // Edit Font button
    row.appendChild(makeBtn('Edit Font', () => this.onFontEditorToggle?.()));

    row.appendChild(makeSep());

    // Timeline expand/collapse toggle
    this.toggleBtn = makeBtn('Timeline \u25BC', () => this.toggleGrid());
    row.appendChild(this.toggleBtn);

    row.appendChild(makeSep());

    // Transport controls
    this.playPauseBtn = makeBtn('\u25B6', () => this.togglePlayPause());
    this.rewindBtn = makeBtn('\u23EE', () => {
      this.engine.stop();
      this.updatePlayPauseIcon();
    });
    this.loopBtn = makeBtn('\u21BB', () => {
      this.engine.isLooping = !this.engine.isLooping;
      this.loopBtn.classList.toggle('active', this.engine.isLooping);
    });

    row.appendChild(this.playPauseBtn);
    row.appendChild(this.rewindBtn);
    row.appendChild(this.loopBtn);

    // Time display
    this.timeDisplay = document.createElement('span');
    this.timeDisplay.className = 'timeline-time';
    this.timeDisplay.textContent = '0.00s / 10.00s';
    row.appendChild(this.timeDisplay);

    // Spacer
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    row.appendChild(spacer);

    // Export / Import
    row.appendChild(makeBtn('Export', () => this.exportAnimation()));
    row.appendChild(makeBtn('Import', () => this.importAnimation()));

    // Hidden file input for import
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.json';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', (e) => this.handleImport(e.target.files[0]));
    row.appendChild(this.fileInput);

    return row;
  }

  createGridArea() {
    const wrapper = document.createElement('div');
    wrapper.className = 'timeline-grid-wrapper';

    const scrollArea = document.createElement('div');
    scrollArea.className = 'timeline-scroll-area';

    // Animation row
    const animRow = document.createElement('div');
    animRow.className = 'timeline-row';

    const animLabel = document.createElement('div');
    animLabel.className = 'timeline-row-label';
    animLabel.textContent = 'Animation';
    animLabel.title = 'Animation keyframes';
    animRow.appendChild(animLabel);

    this.animSquaresContainer = document.createElement('div');
    this.animSquaresContainer.className = 'timeline-squares';
    animRow.appendChild(this.animSquaresContainer);

    // Transition row
    const transRow = document.createElement('div');
    transRow.className = 'timeline-row';

    const transLabel = document.createElement('div');
    transLabel.className = 'timeline-row-label';
    transLabel.textContent = 'Transition';
    transLabel.title = 'Transition keyframes';
    transRow.appendChild(transLabel);

    this.transSquaresContainer = document.createElement('div');
    this.transSquaresContainer.className = 'timeline-squares';
    transRow.appendChild(this.transSquaresContainer);

    // Time labels row
    const timeRow = document.createElement('div');
    timeRow.className = 'timeline-row timeline-row--time';

    const timeSpacer = document.createElement('div');
    timeSpacer.className = 'timeline-row-label';
    timeRow.appendChild(timeSpacer);

    this.timeLabelsContainer = document.createElement('div');
    this.timeLabelsContainer.className = 'timeline-squares timeline-time-labels';
    timeRow.appendChild(this.timeLabelsContainer);

    // Rows + duration buttons in a horizontal flex layout
    const rowsAndButtons = document.createElement('div');
    rowsAndButtons.className = 'timeline-rows-wrapper';

    const rowsColumn = document.createElement('div');
    rowsColumn.appendChild(animRow);
    rowsColumn.appendChild(transRow);
    rowsColumn.appendChild(timeRow);

    // Duration buttons (span both rows)
    this.durationBtnsContainer = document.createElement('div');
    this.durationBtnsContainer.className = 'timeline-duration-btns';

    rowsAndButtons.appendChild(rowsColumn);
    rowsAndButtons.appendChild(this.durationBtnsContainer);

    scrollArea.appendChild(rowsAndButtons);

    // Playhead overlay
    this.playhead = document.createElement('div');
    this.playhead.className = 'timeline-playhead';

    wrapper.appendChild(scrollArea);
    wrapper.appendChild(this.playhead);

    this.renderSquares();
    return wrapper;
  }

  // --- Squares ---

  renderSquares() {
    this.animSquaresContainer.innerHTML = '';
    this.transSquaresContainer.innerHTML = '';
    this.timeLabelsContainer.innerHTML = '';

    for (let t = 0; t < this.engine.duration; t++) {
      this.animSquaresContainer.appendChild(this.createSquare(t, 'animation'));
      this.transSquaresContainer.appendChild(this.createSquare(t, 'transition'));

      const timeLabel = document.createElement('div');
      timeLabel.className = 'timeline-time-label';
      timeLabel.textContent = `${t}s`;
      this.timeLabelsContainer.appendChild(timeLabel);
    }

    // - / + duration buttons
    this.durationBtnsContainer.innerHTML = '';

    const removeBtn = document.createElement('div');
    removeBtn.className = 'timeline-duration-btn';
    removeBtn.textContent = '\u2212';
    removeBtn.addEventListener('click', () => {
      if (this.engine.removeLastSecond()) {
        this.renderSquares();
      }
    });
    this.durationBtnsContainer.appendChild(removeBtn);

    const addBtn = document.createElement('div');
    addBtn.className = 'timeline-duration-btn';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => {
      this.engine.addSecond();
      this.renderSquares();
    });
    this.durationBtnsContainer.appendChild(addBtn);
  }

  createSquare(time, rowType) {
    const square = document.createElement('div');
    square.className = 'timeline-square';

    const hasKF = rowType === 'animation'
      ? this.engine.hasAnimationKeyframe(time)
      : this.engine.hasTransitionKeyframe(time);

    if (hasKF) {
      square.classList.add(
        rowType === 'animation'
          ? 'timeline-square--animation'
          : 'timeline-square--transition'
      );

      const dot = document.createElement('span');
      dot.className = 'timeline-square-dot';
      square.appendChild(dot);
    }

    if (this.selectedRow === rowType && this.selectedTime === time) {
      square.classList.add('timeline-square--selected');
    }

    square.addEventListener('click', () => this.onSquareClick(time, rowType));
    return square;
  }

  onSquareClick(time, rowType) {
    if (rowType === 'animation') {
      const kf = this.engine.getAnimationKeyframe(time);
      if (kf) {
        this.selectedRow = 'animation';
        this.selectedTime = time;
        this.openEditor(time, 'animation', kf);
      } else {
        this.engine.addAnimationKeyframe(time, {});
        this.selectedRow = 'animation';
        this.selectedTime = time;
        this.renderSquares();
        this.openEditor(time, 'animation', this.engine.getAnimationKeyframe(time));
      }
    } else {
      const kf = this.engine.getTransitionKeyframe(time);
      if (kf) {
        this.selectedRow = 'transition';
        this.selectedTime = time;
        this.openEditor(time, 'transition', kf);
      } else {
        this.engine.addTransitionKeyframe(time, {
          direction: 'in',
          transitionType: 'fade',
          mode: 'per-letter',
          duration: 3.0,
          stagger: 0.1,
          slideDirection: 'bottom'
        });
        this.selectedRow = 'transition';
        this.selectedTime = time;
        this.renderSquares();
        this.openEditor(time, 'transition', this.engine.getTransitionKeyframe(time));
      }
    }
    this.renderSquares();
  }

  // --- Keyframe Editor ---

  openEditor(time, rowType, kf) {
    this.editorPanel.innerHTML = '';
    this.editorPanel.style.display = 'block';

    // Header
    const header = document.createElement('div');
    header.className = 'keyframe-editor-header';

    const title = document.createElement('span');
    title.textContent = `${rowType === 'animation' ? 'Animation' : 'Transition'} @ ${time}s`;
    header.appendChild(title);

    // Easing selector inline in header (animation only)
    if (rowType === 'animation') {
      const easingSelect = document.createElement('select');
      easingSelect.className = 'keyframe-editor-select';
      for (const opt of EASING_OPTIONS) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === (kf.easing || 'linear')) option.selected = true;
        easingSelect.appendChild(option);
      }
      easingSelect.addEventListener('change', () => { kf.easing = easingSelect.value; });
      header.appendChild(easingSelect);
    }

    // Spacer to push close/delete to the right
    const headerSpacer = document.createElement('div');
    headerSpacer.style.flex = '1';
    header.appendChild(headerSpacer);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'timeline-btn';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', () => this.closeEditor());
    header.appendChild(closeBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'timeline-btn timeline-btn--danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      if (rowType === 'animation') {
        this.engine.removeAnimationKeyframe(time);
      } else {
        this.engine.removeTransitionKeyframe(time);
      }
      this.closeEditor();
      this.renderSquares();
    });
    header.appendChild(deleteBtn);

    this.editorPanel.appendChild(header);

    // Body
    if (rowType === 'animation') {
      this.buildAnimationEditor(time, kf);
    } else {
      this.buildTransitionEditor(time, kf);
    }
  }

  closeEditor() {
    this.editorPanel.style.display = 'none';
    this.selectedRow = null;
    this.selectedTime = null;
    this.renderSquares();
  }

  buildAnimationEditor(time, kf) {
    const body = document.createElement('div');
    body.className = 'keyframe-editor-body';

    // 2-column grid for parameters
    const grid = document.createElement('div');
    grid.className = 'keyframe-editor-grid';

    for (const paramName of Object.keys(PARAM_DEFAULTS)) {
      const range = PARAM_RANGES[paramName];
      const isActive = paramName in kf.params;
      const value = isActive ? kf.params[paramName] : PARAM_DEFAULTS[paramName];

      const cell = document.createElement('div');
      cell.className = 'keyframe-editor-param';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isActive;
      checkbox.className = 'keyframe-editor-checkbox';

      const label = document.createElement('span');
      label.className = 'keyframe-editor-label';
      label.textContent = PARAM_LABELS[paramName] || paramName;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'keyframe-editor-slider';
      slider.min = range.min;
      slider.max = range.max;
      slider.step = range.step;
      slider.value = value;
      slider.disabled = !isActive;

      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'keyframe-editor-value';
      valueDisplay.textContent = this.formatValue(value, paramName);

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          kf.params[paramName] = parseFloat(slider.value);
          slider.disabled = false;
        } else {
          delete kf.params[paramName];
          slider.disabled = true;
        }
        this.engine.seek(time);
      });

      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        kf.params[paramName] = v;
        valueDisplay.textContent = this.formatValue(v, paramName);
        this.engine.seek(time);
      });

      cell.appendChild(checkbox);
      cell.appendChild(label);
      cell.appendChild(slider);
      cell.appendChild(valueDisplay);
      grid.appendChild(cell);
    }

    body.appendChild(grid);
    this.editorPanel.appendChild(body);
  }

  buildTransitionEditor(time, kf) {
    const body = document.createElement('div');
    body.className = 'keyframe-editor-body';

    // Row 1: inline dropdowns
    const selectRow = document.createElement('div');
    selectRow.className = 'keyframe-editor-inline-row';

    selectRow.appendChild(this.createInlineSelect(
      'Direction', ['in', 'out'], kf.direction,
      (v) => { kf.direction = v; }
    ));

    selectRow.appendChild(this.createInlineSelect(
      'Type', ['fade', 'slide', 'explode', 'implode', 'spiral'], kf.transitionType,
      (v) => {
        kf.transitionType = v;
        slideDirGroup.style.display = v === 'slide' ? 'flex' : 'none';
      }
    ));

    selectRow.appendChild(this.createInlineSelect(
      'Mode', ['per-letter', 'per-word'], kf.mode,
      (v) => { kf.mode = v; }
    ));

    // Slide direction (conditional)
    const slideDirGroup = this.createInlineSelect(
      'Slide Dir', ['bottom', 'top', 'left', 'right'], kf.slideDirection || 'bottom',
      (v) => { kf.slideDirection = v; }
    );
    slideDirGroup.style.display = kf.transitionType === 'slide' ? 'flex' : 'none';
    selectRow.appendChild(slideDirGroup);

    body.appendChild(selectRow);

    // Row 2: sliders for duration and stagger
    const sliderRow = document.createElement('div');
    sliderRow.className = 'keyframe-editor-inline-row';

    sliderRow.appendChild(this.createInlineSlider(
      'Duration', 0.1, 5.0, 0.1, kf.duration ?? 3.0,
      (v) => { kf.duration = v; }
    ));

    sliderRow.appendChild(this.createInlineSlider(
      'Stagger', 0, 0.5, 0.01, kf.stagger ?? 0.1,
      (v) => { kf.stagger = v; }
    ));

    body.appendChild(sliderRow);

    this.editorPanel.appendChild(body);
  }

  createInlineSelect(label, options, current, onChange) {
    const group = document.createElement('div');
    group.className = 'keyframe-editor-inline-group';

    const labelEl = document.createElement('span');
    labelEl.className = 'keyframe-editor-inline-label';
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const select = document.createElement('select');
    select.className = 'keyframe-editor-select';
    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === current) option.selected = true;
      select.appendChild(option);
    }
    select.addEventListener('change', () => onChange(select.value));
    group.appendChild(select);

    return group;
  }

  createInlineSlider(label, min, max, step, value, onChange) {
    const group = document.createElement('div');
    group.className = 'keyframe-editor-inline-group keyframe-editor-inline-slider';

    const labelEl = document.createElement('span');
    labelEl.className = 'keyframe-editor-inline-label';
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'keyframe-editor-slider';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'keyframe-editor-value';
    valueDisplay.textContent = value.toFixed(2);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueDisplay.textContent = v.toFixed(2);
      onChange(v);
    });

    group.appendChild(slider);
    group.appendChild(valueDisplay);

    return group;
  }

  createSelect(label, options, current, onChange) {
    const row = document.createElement('div');
    row.className = 'keyframe-editor-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'keyframe-editor-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const select = document.createElement('select');
    select.className = 'keyframe-editor-select';
    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === current) option.selected = true;
      select.appendChild(option);
    }
    select.addEventListener('change', () => onChange(select.value));
    row.appendChild(select);

    return row;
  }

  formatValue(value, paramName) {
    if (paramName === 'meshRotation') return `${Math.round(value)}`;
    return value.toFixed(2);
  }

  // --- Grid Toggle ---

  toggleGrid() {
    this.isGridVisible = !this.isGridVisible;
    this.gridSection.style.display = this.isGridVisible ? 'block' : 'none';
    this.toggleBtn.textContent = this.isGridVisible ? 'Timeline \u25B2' : 'Timeline \u25BC';
    if (this.isGridVisible) {
      this.renderSquares();
      this.updatePlayhead();
      this.updateTimeDisplay();
    } else {
      this.closeEditor();
    }
  }

  // --- Playhead & Time ---

  togglePlayPause() {
    if (this.engine.isPlaying) {
      this.engine.pause();
    } else {
      this.engine.play();
    }
    this.updatePlayPauseIcon();
  }

  updatePlayPauseIcon() {
    this.playPauseBtn.textContent = this.engine.isPlaying ? '\u23F8' : '\u25B6';
  }

  bindGlobalTyping() {
    document.addEventListener('keydown', (e) => {
      // Skip if user is focused on an input, select, or textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (this.currentText.length > 0) {
          this.currentText = this.currentText.slice(0, -1);
          this.onTextChange?.(this.currentText);
        }
        return;
      }

      // Accept letters, digits, space, and common punctuation
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (this.currentText.length >= 50) return;
        this.currentText += e.key.toUpperCase();
        this.onTextChange?.(this.currentText);
      }
    });
  }

  bindEngineCallbacks() {
    this.engine.onTimeUpdate = (time) => {
      this.updatePlayhead();
      this.updateTimeDisplay();
    };

    this.engine.onPlaybackEnd = () => {
      this.updatePlayPauseIcon();
    };
  }

  updatePlayhead() {
    if (!this.isGridVisible) return;
    const fraction = this.engine.currentTime / this.engine.duration;
    const squareWidth = 34; // 30px + 4px gap
    const labelWidth = 74; // row label width (70px) + margin (4px)
    const totalWidth = this.engine.duration * squareWidth;
    this.playhead.style.left = `${labelWidth + fraction * totalWidth}px`;
  }

  updateTimeDisplay() {
    const curr = this.engine.currentTime.toFixed(2);
    const dur = this.engine.duration.toFixed(2);
    this.timeDisplay.textContent = `${curr}s / ${dur}s`;
  }

  startUpdateLoop() {
    const update = () => {
      if (this.isGridVisible && this.engine.isPlaying) {
        this.updatePlayhead();
        this.updateTimeDisplay();
      }
      requestAnimationFrame(update);
    };
    update();
  }

  // --- Export / Import ---

  exportAnimation() {
    const data = this.engine.exportAnimation();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'animation.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  importAnimation() {
    this.fileInput.click();
  }

  async handleImport(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (this.engine.importAnimation(data)) {
        this.renderSquares();
        this.closeEditor();
      }
    } catch (err) {
      console.error('Error importing animation:', err);
    }
    this.fileInput.value = '';
  }

  // --- Show / Hide ---

  show() {
    if (!this.isGridVisible) this.toggleGrid();
  }

  hide() {
    if (this.isGridVisible) this.toggleGrid();
  }

  toggle() {
    this.toggleGrid();
  }
}
