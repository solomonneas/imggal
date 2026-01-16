// Grid Manager - Handles the grid layout and cells
class GridManager {
  constructor(config) {
    this.config = config;
    this.container = document.getElementById('grid-container');
    this.cells = [];
    this.rows = config.grid_rows || 3;
    this.cols = config.grid_columns || 3;
  }

  createGrid(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.cells = [];

    // Clear existing content
    this.container.innerHTML = '';

    // Set grid template
    this.container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    this.container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    // Create cells
    const totalCells = rows * cols;
    for (let i = 0; i < totalCells; i++) {
      const cell = this.createCell(i);
      this.container.appendChild(cell);
      this.cells.push({
        element: cell,
        index: i,
        currentImage: null,
        nextImage: null,
        isTransitioning: false
      });
    }

    return this.cells;
  }

  createCell(index) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.dataset.index = index;

    // Create two image containers for crossfade
    const imgContainer1 = document.createElement('div');
    imgContainer1.className = 'image-container';
    const img1 = document.createElement('img');
    img1.className = 'cell-image';
    imgContainer1.appendChild(img1);

    const imgContainer2 = document.createElement('div');
    imgContainer2.className = 'image-container';
    const img2 = document.createElement('img');
    img2.className = 'cell-image';
    imgContainer2.appendChild(img2);

    // Overlay for hover info
    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';
    overlay.innerHTML = `
      <div class="image-title"></div>
      <div class="image-meta"></div>
    `;

    cell.appendChild(imgContainer1);
    cell.appendChild(imgContainer2);
    cell.appendChild(overlay);

    // Add hover event for tooltip
    cell.addEventListener('mouseenter', (e) => this.showTooltip(e, cell));
    cell.addEventListener('mouseleave', () => this.hideTooltip());
    cell.addEventListener('mousemove', (e) => this.moveTooltip(e));

    return cell;
  }

  getCellCount() {
    return this.cells.length;
  }

  getCell(index) {
    return this.cells[index];
  }

  // Set image in a cell with crossfade transition
  async setImage(cellIndex, imageData, fitMode = 'fill') {
    const cell = this.cells[cellIndex];
    if (!cell) return;

    // Skip if currently transitioning, but don't block forever
    if (cell.isTransitioning) {
      // Force reset if stuck for too long
      if (cell.transitionStart && Date.now() - cell.transitionStart > 5000) {
        cell.isTransitioning = false;
      } else {
        return;
      }
    }

    cell.isTransitioning = true;
    cell.transitionStart = Date.now();

    try {
      const images = cell.element.querySelectorAll('.cell-image');
      const currentImg = images[0].classList.contains('visible') ? images[0] : images[1];
      const nextImg = currentImg === images[0] ? images[1] : images[0];

      // Preload next image with timeout
      try {
        await this.preloadImage(imageData.url);
      } catch (e) {
        console.warn('Failed to preload image:', imageData.url);
        cell.isTransitioning = false;
        return;
      }

      // Set the new image source
      nextImg.src = imageData.url;
      nextImg.className = `cell-image ${fitMode}`;

      // Check NSFW blur
      if (imageData.nsfw && this.config.nsfwFilter === 'blur') {
        nextImg.classList.add('blur');
      }

      // Update overlay
      const overlay = cell.element.querySelector('.image-overlay');
      overlay.querySelector('.image-title').textContent = imageData.title || '';
      overlay.querySelector('.image-meta').textContent = imageData.subreddit
        ? `r/${imageData.subreddit} | ${imageData.score} points`
        : (imageData.source === 'local' ? imageData.path : '');

      // Crossfade
      nextImg.classList.add('visible');
      currentImg.classList.remove('visible');

      // Wait for transition
      await this.delay(400);

      // Update cell state
      cell.currentImage = imageData;
    } catch (e) {
      console.error('Error setting image:', e);
    } finally {
      cell.isTransitioning = false;
    }
  }

  preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, 10000); // 10 second timeout

      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }

  showTooltip(e, cell) {
    const cellData = this.cells.find(c => c.element === cell);
    if (!cellData || !cellData.currentImage) return;

    const tooltip = document.getElementById('tooltip');
    const img = cellData.currentImage;

    let text = img.title || 'Unknown';
    if (img.subreddit) {
      text += ` | r/${img.subreddit}`;
    }

    tooltip.textContent = text;
    tooltip.classList.remove('hidden');
    this.moveTooltip(e);
  }

  hideTooltip() {
    document.getElementById('tooltip').classList.add('hidden');
  }

  moveTooltip(e) {
    const tooltip = document.getElementById('tooltip');
    const x = e.clientX + 10;
    const y = e.clientY + 10;

    // Keep tooltip on screen
    const rect = tooltip.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 10;
    const maxY = window.innerHeight - rect.height - 10;

    tooltip.style.left = `${Math.min(x, maxX)}px`;
    tooltip.style.top = `${Math.min(y, maxY)}px`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clear all cells
  clear() {
    this.cells.forEach(cell => {
      const images = cell.element.querySelectorAll('.cell-image');
      images.forEach(img => {
        img.src = '';
        img.classList.remove('visible');
      });
      cell.currentImage = null;
    });
  }
}
