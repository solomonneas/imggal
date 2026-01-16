// Image Rotator - Handles automatic image rotation in grid cells
class ImageRotator {
  constructor(gridManager, config) {
    this.gridManager = gridManager;
    this.config = config;
    this.images = [];
    this.imageQueue = [];
    this.cellTimers = [];
    this.interval = config.rotation_interval * 1000 || 60000;
    this.fitMode = config.image_fit_mode || 'fill';
    this.isRunning = false;
    this.isPaused = false;
  }

  setImages(images) {
    this.images = images;
    this.imageQueue = this.shuffle([...images]);
  }

  setInterval(ms) {
    this.interval = ms;
    if (this.isRunning && !this.isPaused) {
      this.restartTimers();
    }
  }

  setFitMode(mode) {
    this.fitMode = mode;
    // Update all currently displayed images
    document.querySelectorAll('.cell-image').forEach(img => {
      img.classList.remove('fill', 'fit', 'stretch');
      img.classList.add(mode);
    });
  }

  start() {
    if (this.images.length === 0) return;

    this.isRunning = true;
    this.isPaused = false;

    // Initial population of all cells
    this.populateAllCells();

    // Start rotation timers for each cell
    this.startTimers();
  }

  stop() {
    this.isRunning = false;
    this.clearTimers();
  }

  pause() {
    this.isPaused = true;
    this.clearTimers();
  }

  resume() {
    if (!this.isRunning) return;
    this.isPaused = false;
    this.startTimers();
  }

  populateAllCells() {
    const cellCount = this.gridManager.getCellCount();

    for (let i = 0; i < cellCount; i++) {
      const image = this.getNextImage();
      this.gridManager.setImage(i, image, this.fitMode);
    }
  }

  startTimers() {
    const cellCount = this.gridManager.getCellCount();

    for (let i = 0; i < cellCount; i++) {
      // Stagger the start times for each cell
      const stagger = Math.random() * this.interval * 0.3;

      const timer = setTimeout(() => {
        this.startCellTimer(i);
      }, stagger);

      this.cellTimers.push(timer);
    }
  }

  startCellTimer(cellIndex) {
    // Add randomness to interval (80% - 120% of base interval)
    const randomizedInterval = this.interval * (0.8 + Math.random() * 0.4);

    const timer = setInterval(() => {
      if (!this.isPaused) {
        this.rotateCell(cellIndex);
      }
    }, randomizedInterval);

    this.cellTimers.push(timer);

    // Update countdown display
    this.updateCountdown(cellIndex, randomizedInterval);
  }

  rotateCell(cellIndex) {
    const image = this.getNextImage();
    this.gridManager.setImage(cellIndex, image, this.fitMode);
  }

  getNextImage() {
    // Refill queue if empty
    if (this.imageQueue.length === 0) {
      this.imageQueue = this.shuffle([...this.images]);
    }

    return this.imageQueue.pop();
  }

  clearTimers() {
    this.cellTimers.forEach(timer => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    this.cellTimers = [];
  }

  restartTimers() {
    this.clearTimers();
    this.startTimers();
  }

  // Shuffle all cells immediately
  shuffleAll() {
    const cellCount = this.gridManager.getCellCount();

    // Shuffle the queue first
    this.imageQueue = this.shuffle([...this.images]);

    // Update all cells with staggered animations
    for (let i = 0; i < cellCount; i++) {
      setTimeout(() => {
        const image = this.getNextImage();
        this.gridManager.setImage(i, image, this.fitMode);
      }, i * 50); // Stagger by 50ms
    }
  }

  // Redistribute images when grid size changes
  redistributeImages() {
    if (!this.isRunning) return;

    this.clearTimers();
    this.populateAllCells();
    this.startTimers();
  }

  // Fisher-Yates shuffle
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  updateCountdown(cellIndex, interval) {
    // Update status bar with next rotation time
    const nextTime = Math.round(interval / 1000);
    const statusNext = document.getElementById('status-next');
    if (statusNext) {
      statusNext.textContent = `Next: ${nextTime}s`;
    }
  }
}
