export class FontRenderer {
  constructor(fontGrid) {
    this.fontGrid = fontGrid;
    this.letterSpacing = 1.0; // Space between letters
    this.lineSpacing = 2.0;   // Space between lines
    this.dotSpacing = 0.5;    // Space between individual dots
  }

  textToParticles(text) {
    if (!this.fontGrid.isLoaded) {
      console.warn('Font not loaded yet');
      return { positions: [], metadata: [] };
    }

    const positions = [];
    const metadata = [];
    const lines = text.split('\n');
    const [gridWidth, gridHeight] = this.fontGrid.getGridSize();

    let currentY = 0;
    let charIndex = 0;
    let wordIndex = 0;

    lines.forEach((line) => {
      let currentX = 0;
      const words = line.split(' ');
      let charInLineIndex = 0;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        // Track word boundaries
        if (char === ' ') {
          wordIndex++;
        }

        const charGrid = this.fontGrid.getCharacterGrid(char);

        if (!charGrid) {
          currentX += gridWidth + this.letterSpacing;
          charIndex++;
          charInLineIndex++;
          continue;
        }

        // Convert character grid to particle positions
        for (let row = 0; row < charGrid.length; row++) {
          for (let col = 0; col < charGrid[row].length; col++) {
            if (charGrid[row][col] === 1) {
              positions.push({
                x: (currentX + col) * this.dotSpacing,
                y: -(currentY + row) * this.dotSpacing, // Negative Y for top-to-bottom
                z: 0
              });

              // Store metadata for this particle
              metadata.push({
                charIndex: charIndex,        // Global character index
                wordIndex: wordIndex,         // Word index
                charInLine: charInLineIndex,  // Character position in line
                char: char,                   // The actual character
                particleInChar: (row * charGrid[row].length) + col  // Particle index within character
              });
            }
          }
        }

        // Move to next character position
        currentX += gridWidth + this.letterSpacing;
        charIndex++;
        charInLineIndex++;
      }

      // Move to next line
      currentY += gridHeight + this.lineSpacing;
      wordIndex++; // New line = new word boundary
    });

    // Center the text around origin
    const centeredPositions = this.centerPositions(positions);

    return {
      positions: centeredPositions,
      metadata: metadata,
      totalChars: charIndex,
      totalWords: wordIndex
    };
  }

  centerPositions(positions) {
    if (positions.length === 0) return positions;

    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    });

    // Calculate center offset
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Apply offset to center text
    return positions.map(pos => ({
      x: pos.x - centerX,
      y: pos.y - centerY,
      z: pos.z,
      centerOffsetX: centerX,
      centerOffsetY: centerY
    }));
  }

  setLetterSpacing(spacing) {
    this.letterSpacing = spacing;
  }

  setLineSpacing(spacing) {
    this.lineSpacing = spacing;
  }

  setDotSpacing(spacing) {
    this.dotSpacing = spacing;
  }
}
