export class FontEditor {
  constructor(fontGrid, onFontUpdate) {
    this.fontGrid = fontGrid;
    this.onFontUpdate = onFontUpdate;
    this.isVisible = false;
    this.currentChar = 'A';
    this.gridData = [];
    this.gridSize = [5, 7];

    this.createUI();
  }

  createUI() {
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'font-editor';
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid #00ff00;
      padding: 20px;
      z-index: 1000;
      display: none;
      font-family: 'Courier New', monospace;
      color: #00ff00;
      min-width: 400px;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;';
    header.innerHTML = `
      <h2 style="margin: 0; font-size: 20px;">Font Editor</h2>
      <button id="close-editor" style="
        background: transparent;
        border: 1px solid #00ff00;
        color: #00ff00;
        padding: 5px 10px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
      ">Close</button>
    `;
    this.container.appendChild(header);

    // Character selector
    const charSelector = document.createElement('div');
    charSelector.style.cssText = 'margin-bottom: 15px;';
    charSelector.innerHTML = `
      <label style="margin-right: 10px;">Edit Character:</label>
      <select id="char-select" style="
        background: #000;
        border: 1px solid #00ff00;
        color: #00ff00;
        padding: 5px;
        font-family: 'Courier New', monospace;
      ">
        ${this.createCharOptions()}
      </select>
    `;
    this.container.appendChild(charSelector);

    // Grid container
    this.gridContainer = document.createElement('div');
    this.gridContainer.id = 'editor-grid';
    this.gridContainer.style.cssText = `
      display: inline-block;
      background: #000;
      padding: 10px;
      border: 1px solid #00ff00;
      margin-bottom: 15px;
    `;
    this.container.appendChild(this.gridContainer);

    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 10px; flex-wrap: wrap;';
    actions.innerHTML = `
      <button id="clear-char" style="
        background: transparent;
        border: 1px solid #00ff00;
        color: #00ff00;
        padding: 8px 15px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
      ">Clear</button>
      <button id="fill-char" style="
        background: transparent;
        border: 1px solid #00ff00;
        color: #00ff00;
        padding: 8px 15px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
      ">Fill</button>
      <button id="export-font" style="
        background: transparent;
        border: 1px solid #00ff00;
        color: #00ff00;
        padding: 8px 15px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
      ">Export Font</button>
      <button id="import-font" style="
        background: transparent;
        border: 1px solid #00ff00;
        color: #00ff00;
        padding: 8px 15px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
      ">Import Font</button>
    `;
    this.container.appendChild(actions);

    // Hidden file input for import
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'font-file-input';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    this.container.appendChild(fileInput);

    // Info
    const info = document.createElement('div');
    info.style.cssText = 'margin-top: 15px; font-size: 11px; opacity: 0.7; line-height: 1.5;';
    info.innerHTML = `
      <p style="margin: 5px 0;">→ Click grid cells to toggle dots</p>
      <p style="margin: 5px 0;">→ Changes update in real-time</p>
      <p style="margin: 5px 0;">→ Export saves your custom font</p>
    `;
    this.container.appendChild(info);

    document.body.appendChild(this.container);

    this.setupEventListeners();
  }

  createCharOptions() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?.,:-+*/= ';
    return chars.split('').map(char =>
      `<option value="${char}">${char === ' ' ? 'SPACE' : char}</option>`
    ).join('');
  }

  setupEventListeners() {
    // Close button
    document.getElementById('close-editor').addEventListener('click', () => {
      this.hide();
    });

    // Character selector
    document.getElementById('char-select').addEventListener('change', (e) => {
      this.currentChar = e.target.value;
      this.loadCharacter();
    });

    // Clear button
    document.getElementById('clear-char').addEventListener('click', () => {
      this.clearGrid();
    });

    // Fill button
    document.getElementById('fill-char').addEventListener('click', () => {
      this.fillGrid();
    });

    // Export button
    document.getElementById('export-font').addEventListener('click', () => {
      this.exportFont();
    });

    // Import button
    document.getElementById('import-font').addEventListener('click', () => {
      document.getElementById('font-file-input').click();
    });

    // File input
    document.getElementById('font-file-input').addEventListener('change', (e) => {
      this.importFont(e.target.files[0]);
    });
  }

  createGrid() {
    this.gridContainer.innerHTML = '';
    const [width, height] = this.gridSize;

    const table = document.createElement('table');
    table.style.cssText = 'border-collapse: collapse;';

    for (let row = 0; row < height; row++) {
      const tr = document.createElement('tr');

      for (let col = 0; col < width; col++) {
        const td = document.createElement('td');
        td.style.cssText = `
          width: 25px;
          height: 25px;
          border: 1px solid rgba(0, 255, 0, 0.3);
          cursor: pointer;
          background: ${this.gridData[row][col] ? '#00ff00' : '#000'};
        `;
        td.dataset.row = row;
        td.dataset.col = col;

        td.addEventListener('click', () => {
          this.toggleCell(row, col);
        });

        tr.appendChild(td);
      }

      table.appendChild(tr);
    }

    this.gridContainer.appendChild(table);
  }

  toggleCell(row, col) {
    this.gridData[row][col] = this.gridData[row][col] ? 0 : 1;
    this.updateCell(row, col);
    this.saveCharacter();
  }

  updateCell(row, col) {
    const cell = this.gridContainer.querySelector(`td[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
      cell.style.background = this.gridData[row][col] ? '#00ff00' : '#000';
    }
  }

  loadCharacter() {
    const charGrid = this.fontGrid.getCharacterGrid(this.currentChar);
    if (charGrid) {
      this.gridData = charGrid.map(row => [...row]); // Deep copy
    } else {
      this.gridData = this.createEmptyGrid();
    }
    this.createGrid();
  }

  saveCharacter() {
    // Update the fontGrid's data
    if (!this.fontGrid.fontData.characters[this.currentChar]) {
      this.fontGrid.fontData.characters[this.currentChar] = [];
    }
    this.fontGrid.fontData.characters[this.currentChar] = this.gridData.map(row => [...row]);

    // Trigger update
    if (this.onFontUpdate) {
      this.onFontUpdate();
    }
  }

  clearGrid() {
    this.gridData = this.createEmptyGrid();
    this.createGrid();
    this.saveCharacter();
  }

  fillGrid() {
    const [width, height] = this.gridSize;
    this.gridData = Array(height).fill(null).map(() => Array(width).fill(1));
    this.createGrid();
    this.saveCharacter();
  }

  createEmptyGrid() {
    const [width, height] = this.gridSize;
    return Array(height).fill(null).map(() => Array(width).fill(0));
  }

  exportFont() {
    const fontData = {
      name: this.fontGrid.fontData.name + ' (Custom)',
      gridSize: this.fontGrid.fontData.gridSize,
      spacing: this.fontGrid.fontData.spacing,
      characters: { ...this.fontGrid.fontData.characters }
    };

    const dataStr = JSON.stringify(fontData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'custom-font.json';
    link.click();

    URL.revokeObjectURL(url);
  }

  async importFont(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const fontData = JSON.parse(text);

      // Validate font data
      if (!fontData.characters || !fontData.gridSize) {
        alert('Invalid font file format');
        return;
      }

      // Load into fontGrid
      this.fontGrid.fontData = fontData;
      this.fontGrid.isLoaded = true;
      this.gridSize = fontData.gridSize;

      // Reload current character
      this.loadCharacter();

      // Trigger update
      if (this.onFontUpdate) {
        this.onFontUpdate();
      }

      alert('Font imported successfully!');
    } catch (error) {
      console.error('Error importing font:', error);
      alert('Error importing font file');
    }
  }

  show() {
    this.isVisible = true;
    this.container.style.display = 'block';
    this.gridSize = this.fontGrid.getGridSize();
    this.loadCharacter();
  }

  hide() {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}
