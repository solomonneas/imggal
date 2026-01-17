// Settings Controller - Handles the settings panel
class SettingsController {
  constructor(app) {
    this.app = app;
    this.overlay = document.getElementById('settings-overlay');
    this.currentTab = 'display';
    this.editingProfile = null;
    this.currentSubreddits = [];

    this.setupEventListeners();
    this.initializeValues();
  }

  setupEventListeners() {
    // Close button
    document.getElementById('close-settings').addEventListener('click', () => this.hideSettings());

    // Click outside to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hideSettings();
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Display settings
    this.setupDisplaySettings();

    // Source settings
    this.setupSourceSettings();

    // Profile settings
    this.setupProfileSettings();
  }

  setupDisplaySettings() {
    // Grid rows
    const rowsInput = document.getElementById('grid-rows');
    const rowsValue = document.getElementById('grid-rows-value');
    rowsInput.addEventListener('input', () => {
      rowsValue.textContent = rowsInput.value;
      this.app.updateConfig('grid_rows', parseInt(rowsInput.value));
    });

    // Grid columns
    const colsInput = document.getElementById('grid-cols');
    const colsValue = document.getElementById('grid-cols-value');
    colsInput.addEventListener('input', () => {
      colsValue.textContent = colsInput.value;
      this.app.updateConfig('grid_columns', parseInt(colsInput.value));
    });

    // Rotation interval
    const intervalInput = document.getElementById('rotation-interval');
    intervalInput.addEventListener('change', () => {
      this.app.updateConfig('rotation_interval', parseInt(intervalInput.value));
    });

    // Background color
    const colorPicker = document.getElementById('bg-color');
    const colorHex = document.getElementById('bg-color-hex');

    colorPicker.addEventListener('input', () => {
      colorHex.value = colorPicker.value;
      this.app.updateConfig('background_color', colorPicker.value);
    });

    colorHex.addEventListener('change', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(colorHex.value)) {
        colorPicker.value = colorHex.value;
        this.app.updateConfig('background_color', colorHex.value);
      }
    });

    // Fit mode
    document.querySelectorAll('input[name="fit-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.app.updateConfig('image_fit_mode', radio.value);
      });
    });

    // Reset button
    document.getElementById('btn-reset-display').addEventListener('click', () => {
      this.resetDisplayDefaults();
    });
  }

  setupSourceSettings() {
    // Source selector buttons
    document.querySelectorAll('.source-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const source = btn.dataset.source;
        this.app.sourceMode = source;

        document.querySelectorAll('.source-options').forEach(opt => {
          opt.classList.toggle('hidden', opt.dataset.source !== source);
        });
      });
    });

    // Active profile dropdown
    document.getElementById('active-profile').addEventListener('change', (e) => {
      this.selectProfile(e.target.value);
    });

    // Load Reddit button
    document.getElementById('btn-load-reddit').addEventListener('click', () => {
      const profileId = document.getElementById('active-profile').value;
      const profile = this.app.profiles.find(p => p.id === profileId);
      if (profile) {
        this.hideSettings();
        this.app.loadFromReddit(profile);
      }
    });

    // Local folder path
    const folderPath = document.getElementById('folder-path');
    folderPath.addEventListener('change', () => {
      this.scanFolder();
    });

    // Browse folder button - trigger the hidden file input
    const folderPicker = document.getElementById('folder-picker');
    document.getElementById('btn-browse-folder').addEventListener('click', () => {
      folderPicker.click();
    });

    // Handle folder selection from file input
    folderPicker.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        // Get the path from the first file's webkitRelativePath
        const firstFile = e.target.files[0];
        const relativePath = firstFile.webkitRelativePath;
        const folderName = relativePath.split('/')[0];

        // For display, we'll show the folder name
        // The actual files are available in e.target.files
        document.getElementById('folder-path').value = folderName + ' (browser selected)';

        // Store the files for later use
        this.selectedFiles = Array.from(e.target.files).filter(file => {
          const ext = '.' + file.name.split('.').pop().toLowerCase();
          const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
          const videoExts = ['.mp4', '.webm', '.mov'];
          const includeVideos = document.getElementById('include-videos').checked;
          return imageExts.includes(ext) || (includeVideos && videoExts.includes(ext));
        });

        // Update stats
        const stats = document.querySelector('.folder-stats');
        document.getElementById('folder-count').textContent = `${this.selectedFiles.length} files found`;
        stats.classList.remove('hidden');
      }
    });

    // Load local button
    document.getElementById('btn-load-local').addEventListener('click', () => {
      // Check if we have browser-selected files first
      if (this.selectedFiles && this.selectedFiles.length > 0) {
        this.hideSettings();
        this.app.loadFromBrowserFiles(this.selectedFiles);
        return;
      }

      // Otherwise try the path input
      const path = document.getElementById('folder-path').value;
      const recursive = document.getElementById('recursive-scan').checked;
      const includeVideos = document.getElementById('include-videos').checked;

      if (path && !path.includes('(browser selected)')) {
        this.hideSettings();
        this.app.loadFromLocal(path, recursive, includeVideos);
      } else if (!this.selectedFiles || this.selectedFiles.length === 0) {
        alert('Please select a folder using the browse button or enter a folder path');
      }
    });
  }

  setupProfileSettings() {
    // Sort dropdown - show/hide top period
    const sortSelect = document.getElementById('profile-sort');
    sortSelect.addEventListener('change', () => {
      const topPeriodGroup = document.querySelector('.top-period-group');
      topPeriodGroup.classList.toggle('hidden', sortSelect.value !== 'top');
    });

    // Subreddit input
    const subInput = document.getElementById('subreddit-input');
    const addBtn = document.getElementById('btn-add-subreddit');
    let debounceTimer;

    subInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => this.searchSubreddits(subInput.value), 300);
    });

    subInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addSubreddit(subInput.value);
      }
    });

    addBtn.addEventListener('click', () => {
      this.addSubreddit(subInput.value);
    });

    // Posts per sub slider
    const postsInput = document.getElementById('posts-per-sub');
    const postsValue = document.getElementById('posts-per-sub-value');
    postsInput.addEventListener('input', () => {
      postsValue.textContent = postsInput.value;
    });

    // Profile action buttons
    document.getElementById('btn-new-profile').addEventListener('click', () => {
      this.newProfile();
    });

    document.getElementById('btn-save-profile').addEventListener('click', () => {
      this.saveProfile();
    });

    document.getElementById('btn-delete-profile').addEventListener('click', () => {
      this.deleteProfile();
    });
  }

  initializeValues() {
    // Apply current config values to inputs
    document.getElementById('grid-rows').value = this.app.config.grid_rows;
    document.getElementById('grid-rows-value').textContent = this.app.config.grid_rows;
    document.getElementById('grid-cols').value = this.app.config.grid_columns;
    document.getElementById('grid-cols-value').textContent = this.app.config.grid_columns;
    document.getElementById('rotation-interval').value = this.app.config.rotation_interval;
    document.getElementById('bg-color').value = this.app.config.background_color;
    document.getElementById('bg-color-hex').value = this.app.config.background_color;

    // Fit mode
    const fitMode = this.app.config.image_fit_mode;
    const radioToCheck = document.querySelector(`input[name="fit-mode"][value="${fitMode}"]`);
    if (radioToCheck) radioToCheck.checked = true;
  }

  resetDisplayDefaults() {
    document.getElementById('grid-rows').value = 3;
    document.getElementById('grid-rows-value').textContent = 3;
    document.getElementById('grid-cols').value = 3;
    document.getElementById('grid-cols-value').textContent = 3;
    document.getElementById('rotation-interval').value = 60;
    document.getElementById('bg-color').value = '#1a1a1a';
    document.getElementById('bg-color-hex').value = '#1a1a1a';
    document.querySelector('input[name="fit-mode"][value="fit"]').checked = true;

    this.app.updateConfig('grid_rows', 3);
    this.app.updateConfig('grid_columns', 3);
    this.app.updateConfig('rotation_interval', 10);
    this.app.updateConfig('background_color', '#1a1a1a');
    this.app.updateConfig('image_fit_mode', 'fit');
  }

  switchTab(tab) {
    this.currentTab = tab;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tab);
    });
  }

  showSettings() {
    this.overlay.classList.remove('hidden');
  }

  hideSettings() {
    this.overlay.classList.add('hidden');
  }

  toggleSettings() {
    this.overlay.classList.toggle('hidden');
  }

  // Profile management
  populateProfiles(profiles) {
    const select = document.getElementById('active-profile');
    select.innerHTML = '';

    profiles.forEach(profile => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.name;
      select.appendChild(option);
    });

    // Populate templates
    this.populateTemplates(profiles);

    // Select first profile by default
    if (profiles.length > 0) {
      this.selectProfile(profiles[0].id);
    }
  }

  selectProfile(profileId) {
    const profile = this.app.profiles.find(p => p.id === profileId);
    if (!profile) return;

    this.editingProfile = profile;
    this.currentSubreddits = [...profile.subreddits];

    // Update preview
    const preview = document.querySelector('.profile-subreddits');
    preview.innerHTML = profile.subreddits
      .map(s => `<span class="tag">r/${s}</span>`)
      .join('');

    // Update profile editor
    document.getElementById('profile-name').value = profile.name;
    document.getElementById('profile-sort').value = profile.sort || 'hot';
    document.getElementById('profile-top-period').value = profile.topPeriod || 'week';
    document.getElementById('posts-per-sub').value = profile.postsPerSub || 50;
    document.getElementById('posts-per-sub-value').textContent = profile.postsPerSub || 50;
    document.getElementById('min-score').value = profile.minScore || 0;
    document.getElementById('nsfw-filter').value = profile.nsfwFilter || 'block';
    document.getElementById('round-robin').checked = profile.roundRobin || false;

    // Show/hide top period
    document.querySelector('.top-period-group').classList.toggle('hidden', profile.sort !== 'top');

    // Update subreddit tags
    this.renderSubredditTags();
  }

  renderSubredditTags() {
    const container = document.getElementById('subreddit-tags');
    container.innerHTML = this.currentSubreddits
      .map(sub => `
        <span class="tag">
          r/${sub}
          <button class="remove-tag" data-sub="${sub}">&times;</button>
        </span>
      `)
      .join('');

    // Add remove listeners
    container.querySelectorAll('.remove-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        this.removeSubreddit(btn.dataset.sub);
      });
    });
  }

  async searchSubreddits(query) {
    if (!query || query.length < 2) {
      document.querySelector('.subreddit-suggestions').classList.add('hidden');
      return;
    }

    try {
      const response = await fetch(`/api/subreddits/search?q=${encodeURIComponent(query)}`);
      const results = await response.json();

      const container = document.querySelector('.subreddit-suggestions');
      if (results.length === 0) {
        container.classList.add('hidden');
        return;
      }

      container.innerHTML = results
        .map(sub => `
          <div class="suggestion-item" data-name="${sub.name}">
            <span class="suggestion-name">r/${sub.name}</span>
            <span class="suggestion-meta">${this.formatNumber(sub.subscribers)} members</span>
          </div>
        `)
        .join('');

      container.classList.remove('hidden');

      // Add click listeners
      container.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          this.addSubreddit(item.dataset.name);
          container.classList.add('hidden');
        });
      });

    } catch (error) {
      console.error('Failed to search subreddits:', error);
    }
  }

  addSubreddit(name) {
    // Clean the name
    name = name.replace(/^r\//, '').trim().toLowerCase();
    if (!name) return;

    // Check for duplicates
    if (this.currentSubreddits.includes(name)) {
      return;
    }

    this.currentSubreddits.push(name);
    this.renderSubredditTags();

    // Clear input
    document.getElementById('subreddit-input').value = '';
    document.querySelector('.subreddit-suggestions').classList.add('hidden');
  }

  removeSubreddit(name) {
    this.currentSubreddits = this.currentSubreddits.filter(s => s !== name);
    this.renderSubredditTags();
  }

  newProfile() {
    this.editingProfile = null;
    this.currentSubreddits = [];

    document.getElementById('profile-name').value = '';
    document.getElementById('profile-sort').value = 'hot';
    document.getElementById('profile-top-period').value = 'week';
    document.getElementById('posts-per-sub').value = 50;
    document.getElementById('posts-per-sub-value').textContent = 50;
    document.getElementById('min-score').value = 100;
    document.getElementById('nsfw-filter').value = 'block';
    document.getElementById('round-robin').checked = false;

    document.querySelector('.top-period-group').classList.add('hidden');
    this.renderSubredditTags();
  }

  async saveProfile() {
    const name = document.getElementById('profile-name').value.trim();
    if (!name) {
      alert('Please enter a profile name');
      return;
    }

    if (this.currentSubreddits.length === 0) {
      alert('Please add at least one subreddit');
      return;
    }

    const profile = {
      id: this.editingProfile?.id || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name,
      subreddits: this.currentSubreddits,
      sort: document.getElementById('profile-sort').value,
      topPeriod: document.getElementById('profile-top-period').value,
      postsPerSub: parseInt(document.getElementById('posts-per-sub').value),
      minScore: parseInt(document.getElementById('min-score').value),
      nsfwFilter: document.getElementById('nsfw-filter').value,
      roundRobin: document.getElementById('round-robin').checked
    };

    try {
      const method = this.editingProfile ? 'PUT' : 'POST';
      const url = this.editingProfile
        ? `/api/profiles/${profile.id}`
        : '/api/profiles';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      // Reload profiles
      await this.app.loadProfiles();
      this.selectProfile(profile.id);

    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile');
    }
  }

  async deleteProfile() {
    if (!this.editingProfile) return;

    if (!confirm(`Delete profile "${this.editingProfile.name}"?`)) {
      return;
    }

    try {
      await fetch(`/api/profiles/${this.editingProfile.id}`, {
        method: 'DELETE'
      });

      // Reload profiles
      await this.app.loadProfiles();

    } catch (error) {
      console.error('Failed to delete profile:', error);
      alert('Failed to delete profile');
    }
  }

  populateTemplates(profiles) {
    const container = document.getElementById('template-grid');
    container.innerHTML = profiles
      .map(p => `
        <div class="template-card" data-id="${p.id}">
          <div class="template-name">${p.name}</div>
          <div class="template-subs">r/${p.subreddits.slice(0, 3).join(', r/')}</div>
        </div>
      `)
      .join('');

    // Add click listeners
    container.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectProfile(card.dataset.id);
        document.getElementById('active-profile').value = card.dataset.id;
      });
    });
  }

  async scanFolder() {
    const path = document.getElementById('folder-path').value;
    if (!path) return;

    try {
      const recursive = document.getElementById('recursive-scan').checked;
      const includeVideos = document.getElementById('include-videos').checked;

      const response = await fetch('/api/scan-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: path, recursive, includeVideos })
      });

      const data = await response.json();

      const stats = document.querySelector('.folder-stats');
      if (data.error) {
        stats.textContent = `Error: ${data.error}`;
        stats.classList.remove('hidden');
      } else {
        document.getElementById('folder-count').textContent = `${data.count} images found`;
        stats.classList.remove('hidden');
      }

    } catch (error) {
      console.error('Failed to scan folder:', error);
    }
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
