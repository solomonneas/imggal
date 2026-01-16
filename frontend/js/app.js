// Main Application Controller
class App {
  constructor() {
    this.config = null;
    this.profiles = [];
    this.currentProfile = null;
    this.images = [];
    this.sourceMode = 'reddit'; // 'reddit' or 'local'
    this.isPaused = false;
    this.isLoading = false;
    this.volume = 50; // 0-100
    this.volumeSliderVisible = false;

    this.gridManager = null;
    this.imageRotator = null;
    this.settingsController = null;
    this.progressDisplay = null;

    this.init();
  }

  async init() {
    try {
      // Load configuration
      await this.loadConfig();

      // Initialize components
      this.gridManager = new GridManager(this.config);
      this.imageRotator = new ImageRotator(this.gridManager, this.config);
      this.settingsController = new SettingsController(this);
      this.progressDisplay = new ProgressDisplay();

      // Load profiles
      await this.loadProfiles();

      // Setup event listeners
      this.setupEventListeners();

      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();

      // Update status bar time
      this.updateStatusTime();
      setInterval(() => this.updateStatusTime(), 1000);

      // Apply background color
      document.getElementById('grid-container').style.backgroundColor = this.config.background_color;

      // Check if we should show settings on load
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('showSettings') === 'true') {
        // Small delay to ensure everything is loaded
        setTimeout(() => {
          this.settingsController.showSettings();
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 300);
      }

      console.log('Image Gallery Slideshow initialized');
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }

  async loadConfig() {
    try {
      const response = await fetch('/api/config');
      this.config = await response.json();
    } catch (error) {
      console.error('Failed to load config:', error);
      // Use defaults
      this.config = {
        grid_rows: 3,
        grid_columns: 3,
        rotation_interval: 60,
        background_color: '#1a1a1a',
        image_fit_mode: 'fill',
        reddit_posts_per_sub: 50,
        max_concurrent_downloads: 10
      };
    }
  }

  async saveConfig() {
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config)
      });
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  async loadProfiles() {
    try {
      const response = await fetch('/api/profiles');
      this.profiles = await response.json();
      this.settingsController.populateProfiles(this.profiles);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  }

  setupEventListeners() {
    // Grid container click - toggle pause
    document.getElementById('grid-container').addEventListener('click', (e) => {
      // Don't toggle pause if clicking on FAB buttons
      if (e.target.closest('#fab-container')) return;
      if (this.images.length > 0) {
        this.togglePause();
      }
    });

    // FAB buttons
    document.getElementById('fab-settings').addEventListener('click', (e) => {
      e.stopPropagation();
      this.settingsController.toggleSettings();
    });

    document.getElementById('fab-home').addEventListener('click', (e) => {
      e.stopPropagation();
      this.goHome();
    });

    document.getElementById('fab-refresh').addEventListener('click', (e) => {
      e.stopPropagation();
      this.refreshGallery();
    });

    document.getElementById('fab-volume').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleVolumeSlider();
    });

    // Volume slider
    const volumeSlider = document.getElementById('volume-slider');
    volumeSlider.addEventListener('input', (e) => {
      this.setVolume(parseInt(e.target.value));
    });

    // Close volume slider when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.fab-volume-wrapper') && this.volumeSliderVisible) {
        this.hideVolumeSlider();
      }
    });

    // Initialize volume
    this.updateVolumeUI();
  }

  toggleVolumeSlider() {
    this.volumeSliderVisible = !this.volumeSliderVisible;
    const container = document.getElementById('volume-slider-container');
    container.classList.toggle('visible', this.volumeSliderVisible);
  }

  hideVolumeSlider() {
    this.volumeSliderVisible = false;
    document.getElementById('volume-slider-container').classList.remove('visible');
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(100, value));
    this.updateVolumeUI();
    this.applyVolumeToVideos();
  }

  updateVolumeUI() {
    const btn = document.getElementById('fab-volume');
    const slider = document.getElementById('volume-slider');
    const valueDisplay = document.getElementById('volume-value');

    // Update slider value
    slider.value = this.volume;
    valueDisplay.textContent = this.volume;

    // Update slider track fill
    slider.style.setProperty('--volume-percent', `${this.volume}%`);

    // Update icon based on volume level
    btn.classList.remove('muted', 'low');
    if (this.volume === 0) {
      btn.classList.add('muted');
    } else if (this.volume < 50) {
      btn.classList.add('low');
    }
  }

  applyVolumeToVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.volume = this.volume / 100;
      video.muted = this.volume === 0;
    });
  }

  goHome() {
    // Stop current rotation
    if (this.imageRotator) {
      this.imageRotator.stop();
    }

    // Clear images
    this.images = [];
    this.currentProfile = null;

    // Clear grid
    if (this.gridManager) {
      this.gridManager.clear();
    }

    // Hide status bar
    document.getElementById('status-bar').classList.add('hidden');

    // Show settings
    this.settingsController.showSettings();
  }

  refreshGallery() {
    if (this.sourceMode === 'reddit' && this.currentProfile) {
      this.loadFromReddit(this.currentProfile);
    } else if (this.sourceMode === 'local') {
      const path = document.getElementById('folder-path').value;
      const recursive = document.getElementById('recursive-scan').checked;
      const includeVideos = document.getElementById('include-videos').checked;
      if (path) {
        this.loadFromLocal(path, recursive, includeVideos);
      }
    } else {
      // No active source, show settings
      this.settingsController.showSettings();
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 's':
        case ' ':
          e.preventDefault();
          this.settingsController.toggleSettings();
          break;
        case 'escape':
          this.settingsController.hideSettings();
          break;
        case 'f':
        case 'f11':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'p':
          if (this.images.length > 0) {
            this.togglePause();
          }
          break;
        case 'r':
          if (this.images.length > 0) {
            this.shuffleImages();
          }
          break;
        case 'm':
          // Toggle mute
          if (this.volume > 0) {
            this._previousVolume = this.volume;
            this.setVolume(0);
          } else {
            this.setVolume(this._previousVolume || 50);
          }
          break;
      }
    });
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const statusPaused = document.getElementById('status-paused');

    if (this.isPaused) {
      this.imageRotator.pause();
      statusPaused.classList.remove('hidden');
    } else {
      this.imageRotator.resume();
      statusPaused.classList.add('hidden');
    }
  }

  shuffleImages() {
    this.imageRotator.shuffleAll();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  updateStatusTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('status-time').textContent = timeStr;
  }

  // Load images from Reddit
  async loadFromReddit(profile) {
    if (this.isLoading) return;
    this.isLoading = true;
    this.currentProfile = profile;

    this.progressDisplay.show();
    this.progressDisplay.setStage('init');
    this.progressDisplay.setMessage('Initializing...');

    try {
      // Setup SSE for progress updates
      const eventSource = new EventSource('/api/progress');
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.progressDisplay.updateProgress(data);
      };

      this.progressDisplay.setStage('fetch');
      this.progressDisplay.setMessage(`Fetching from ${profile.subreddits.length} subreddits...`);

      // Fetch images
      const response = await fetch('/api/reddit/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subreddits: profile.subreddits,
          sort: profile.sort,
          topPeriod: profile.topPeriod,
          postsPerSub: profile.postsPerSub,
          nsfwFilter: profile.nsfwFilter,
          minScore: profile.minScore
        })
      });

      const data = await response.json();
      eventSource.close();

      if (data.images.length === 0) {
        this.progressDisplay.setMessage('No images found. Try different settings.');
        await this.delay(2000);
        this.progressDisplay.hide();
        this.isLoading = false;
        return;
      }

      this.images = data.images;

      // Show errors if any
      if (data.errors.length > 0) {
        this.progressDisplay.showErrors(data.errors);
      }

      this.progressDisplay.setStage('download');
      this.progressDisplay.setMessage(`Loading ${this.images.length} images...`);

      // Start displaying images
      await this.startGallery();

    } catch (error) {
      console.error('Failed to load from Reddit:', error);
      this.progressDisplay.setMessage(`Error: ${error.message}`);
      await this.delay(2000);
    }

    this.progressDisplay.hide();
    this.isLoading = false;
  }

  // Load images from local folder
  async loadFromLocal(folderPath, recursive = true, includeVideos = false) {
    if (this.isLoading) return;
    this.isLoading = true;

    this.progressDisplay.show();
    this.progressDisplay.setStage('init');
    this.progressDisplay.setMessage('Scanning folder...');

    try {
      const response = await fetch('/api/scan-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath, recursive, includeVideos })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.images.length === 0) {
        this.progressDisplay.setMessage('No images found in folder.');
        await this.delay(2000);
        this.progressDisplay.hide();
        this.isLoading = false;
        return;
      }

      // Convert local paths to URLs
      this.images = data.images.map(img => ({
        url: `/api/local-image?path=${encodeURIComponent(img.path)}`,
        title: img.name,
        source: 'local',
        path: img.path
      }));

      this.progressDisplay.setMessage(`Found ${this.images.length} images`);

      await this.startGallery();

    } catch (error) {
      console.error('Failed to load from local folder:', error);
      this.progressDisplay.setMessage(`Error: ${error.message}`);
      await this.delay(2000);
    }

    this.progressDisplay.hide();
    this.isLoading = false;
  }

  async startGallery() {
    this.progressDisplay.setStage('ready');
    this.progressDisplay.setProgress(100);
    this.progressDisplay.setMessage('Starting gallery...');

    // Initialize grid with current config
    this.gridManager.createGrid(this.config.grid_rows, this.config.grid_columns);

    // Start image rotation
    this.imageRotator.setImages(this.images);
    this.imageRotator.setInterval(this.config.rotation_interval * 1000);
    this.imageRotator.setFitMode(this.config.image_fit_mode);
    this.imageRotator.start();

    // Update status bar
    this.updateStatusBar();

    // Show status bar
    document.getElementById('status-bar').classList.remove('hidden');

    await this.delay(500);
  }

  updateStatusBar() {
    const source = this.sourceMode === 'reddit'
      ? (this.currentProfile ? this.currentProfile.name : 'Reddit')
      : 'Local Folder';

    document.getElementById('status-source').textContent = source;
    document.getElementById('status-count').textContent = `${this.images.length} images`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Update config and apply changes
  updateConfig(key, value) {
    this.config[key] = value;
    this.saveConfig();

    // Apply immediate changes
    switch (key) {
      case 'grid_rows':
      case 'grid_columns':
        if (this.images.length > 0) {
          this.gridManager.createGrid(this.config.grid_rows, this.config.grid_columns);
          this.imageRotator.redistributeImages();
        }
        break;
      case 'rotation_interval':
        this.imageRotator.setInterval(value * 1000);
        break;
      case 'background_color':
        document.getElementById('grid-container').style.backgroundColor = value;
        break;
      case 'image_fit_mode':
        this.imageRotator.setFitMode(value);
        break;
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
