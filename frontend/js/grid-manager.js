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

    // Create two media containers for crossfade (can hold img or video)
    const container1 = document.createElement('div');
    container1.className = 'image-container';
    container1.dataset.slot = '0';

    const container2 = document.createElement('div');
    container2.className = 'image-container';
    container2.dataset.slot = '1';

    // Overlay for hover info
    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';
    overlay.innerHTML = `
      <div class="image-title"></div>
      <div class="image-meta"></div>
    `;

    cell.appendChild(container1);
    cell.appendChild(container2);
    cell.appendChild(overlay);

    // Add hover event for tooltip
    cell.addEventListener('mouseenter', (e) => this.showTooltip(e, cell));
    cell.addEventListener('mouseleave', () => this.hideTooltip());
    cell.addEventListener('mousemove', (e) => this.moveTooltip(e));

    return cell;
  }

  createMediaElement(type, fitMode) {
    if (type === 'video') {
      const video = document.createElement('video');
      video.className = `cell-media ${fitMode}`;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      return video;
    } else {
      const img = document.createElement('img');
      img.className = `cell-media ${fitMode}`;
      return img;
    }
  }

  getCellCount() {
    return this.cells.length;
  }

  getCell(index) {
    return this.cells[index];
  }

  // Set media (image or video) in a cell with crossfade transition
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
      const containers = cell.element.querySelectorAll('.image-container');
      const isVideo = imageData.type === 'video';

      // Find current and next containers
      let currentContainer, nextContainer;
      const currentMedia = containers[0].querySelector('.cell-media.visible');
      if (currentMedia) {
        currentContainer = containers[0];
        nextContainer = containers[1];
      } else {
        currentContainer = containers[1];
        nextContainer = containers[0];
      }

      // Preload next media with timeout
      if (!isVideo) {
        try {
          await this.preloadImage(imageData.url);
        } catch (e) {
          console.warn('Failed to preload image:', imageData.url);
          cell.isTransitioning = false;
          return;
        }
      }

      // Clear the next container and create new media element
      nextContainer.innerHTML = '';
      const nextMedia = this.createMediaElement(imageData.type || 'image', fitMode);
      nextContainer.appendChild(nextMedia);

      // Set the source
      nextMedia.src = imageData.url;

      // Check NSFW blur
      if (imageData.nsfw && this.config.nsfwFilter === 'blur') {
        nextMedia.classList.add('blur');
      }

      // For videos, wait for it to be ready then play
      if (isVideo) {
        // Keep muted initially for autoplay to work (browser requirement)
        nextMedia.muted = true;

        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve(); // Continue anyway after timeout
          }, 5000);

          nextMedia.onloadedmetadata = () => {
            // Seek to a random position in the video (0-90% to avoid end)
            if (nextMedia.duration && nextMedia.duration > 1) {
              const randomTime = Math.random() * nextMedia.duration * 0.9;
              nextMedia.currentTime = randomTime;
            }
          };

          nextMedia.oncanplaythrough = () => {
            clearTimeout(timeout);
            // Explicitly play the video
            nextMedia.play().then(() => {
              // After playback starts, apply user's volume settings
              if (window.app) {
                const shouldMute = window.app.isMuted || window.app.volume === 0;
                nextMedia.muted = shouldMute;
                if (!shouldMute) {
                  nextMedia.volume = window.app.volume / 100;
                }
              }
            }).catch(err => {
              console.warn('Video autoplay blocked:', err);
              // Keep it muted if autoplay was blocked
            });
            resolve();
          };

          nextMedia.onerror = (e) => {
            clearTimeout(timeout);
            console.warn('Video load error:', imageData.url, e);
            resolve();
          };
        });
      }

      // Update overlay
      const overlay = cell.element.querySelector('.image-overlay');
      overlay.querySelector('.image-title').textContent = imageData.title || '';
      overlay.querySelector('.image-meta').textContent = imageData.subreddit
        ? `r/${imageData.subreddit} | ${imageData.score} points`
        : (imageData.source === 'local' ? imageData.path : '');

      // Crossfade
      nextMedia.classList.add('visible');
      const currentMedia2 = currentContainer.querySelector('.cell-media');
      if (currentMedia2) {
        currentMedia2.classList.remove('visible');
        // Stop video playback on old media
        if (currentMedia2.tagName === 'VIDEO') {
          currentMedia2.pause();
        }
      }

      // Wait for transition
      await this.delay(600);

      // Update cell state
      cell.currentImage = imageData;
    } catch (e) {
      console.error('Error setting media:', e);
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
      const containers = cell.element.querySelectorAll('.image-container');
      containers.forEach(container => {
        const media = container.querySelector('.cell-media');
        if (media) {
          if (media.tagName === 'VIDEO') {
            media.pause();
          }
          media.src = '';
          media.classList.remove('visible');
        }
        container.innerHTML = '';
      });
      cell.currentImage = null;
    });
  }
}
