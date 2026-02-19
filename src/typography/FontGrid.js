export class FontGrid {
  constructor() {
    this.fontData = null;
    this.isLoaded = false;
  }

  async load(fontPath = '/fonts/default.json') {
    try {
      const response = await fetch(fontPath);
      this.fontData = await response.json();
      this.isLoaded = true;
      console.log(`Font loaded: ${this.fontData.name}`);
      return true;
    } catch (error) {
      console.error('Error loading font:', error);
      return false;
    }
  }

  getCharacterGrid(char) {
    if (!this.isLoaded || !this.fontData) {
      console.warn('Font not loaded');
      return null;
    }

    const upperChar = char.toUpperCase();

    // Return character grid if it exists, otherwise use a fallback
    if (this.fontData.characters[upperChar]) {
      return this.fontData.characters[upperChar];
    }

    // Fallback for unknown characters - use space
    return this.fontData.characters[' '] || null;
  }

  getGridSize() {
    return this.fontData?.gridSize || [5, 7];
  }

  getSpacing() {
    return this.fontData?.spacing || 1.0;
  }

  getFontName() {
    return this.fontData?.name || 'Unknown';
  }
}
