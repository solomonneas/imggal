// Progress Display - Handles loading animations and progress visualization
class ProgressDisplay {
  constructor() {
    this.overlay = document.getElementById('loading-overlay');
    this.currentStage = 'init';
    this.errors = [];
  }

  show() {
    this.overlay.classList.remove('hidden');
    this.resetStages();
    this.errors = [];
    this.hideErrors();
  }

  hide() {
    this.overlay.classList.add('hidden');
  }

  setStage(stage) {
    this.currentStage = stage;
    const stages = ['init', 'fetch', 'download', 'ready'];
    const currentIndex = stages.indexOf(stage);

    document.querySelectorAll('.stage').forEach((el, index) => {
      el.classList.remove('active', 'complete');

      if (index < currentIndex) {
        el.classList.add('complete');
      } else if (index === currentIndex) {
        el.classList.add('active');
      }
    });

    // Update stage lines
    document.querySelectorAll('.stage-line').forEach((el, index) => {
      el.classList.toggle('complete', index < currentIndex);
    });

    // Show/hide relevant sections
    this.updateSectionVisibility(stage);
  }

  updateSectionVisibility(stage) {
    const subProgress = document.querySelector('.subreddit-progress');
    const stats = document.querySelector('.progress-stats');
    const actions = document.querySelector('.loading-actions');

    // Hide all first
    subProgress.classList.add('hidden');
    stats.classList.add('hidden');
    actions.classList.add('hidden');

    switch (stage) {
      case 'fetch':
        subProgress.classList.remove('hidden');
        break;
      case 'download':
        stats.classList.remove('hidden');
        actions.classList.remove('hidden');
        break;
    }
  }

  resetStages() {
    document.querySelectorAll('.stage').forEach(el => {
      el.classList.remove('active', 'complete');
    });
    document.querySelector('.stage[data-stage="init"]').classList.add('active');
    document.querySelectorAll('.stage-line').forEach(el => {
      el.classList.remove('complete');
    });
  }

  setMessage(message) {
    document.querySelector('.progress-message').textContent = message;
  }

  setProgress(percent) {
    document.querySelector('.progress-fill').style.width = `${percent}%`;
    document.querySelector('.progress-text').textContent = `${Math.round(percent)}%`;
  }

  updateProgress(data) {
    if (data.message) {
      this.setMessage(data.message);
    }

    if (data.overallProgress !== undefined) {
      this.setProgress(data.overallProgress);
    }

    if (data.totalImages !== undefined) {
      document.getElementById('stat-images').textContent = data.totalImages;
    }

    if (data.subreddits) {
      this.updateSubredditProgress(data.subreddits);
    }

    if (data.error) {
      this.addError({
        subreddit: data.currentSub,
        error: data.message
      });
    }

    if (data.stage === 'complete') {
      this.setStage('download');
      this.setProgress(100);
    }
  }

  updateSubredditProgress(subreddits) {
    const container = document.querySelector('.subreddit-list');
    container.innerHTML = subreddits.map(sub => `
      <div class="subreddit-item ${sub.progress === 100 ? 'complete' : ''} ${sub.error ? 'error' : ''}">
        <span class="sub-name">r/${sub.name}</span>
        <div class="sub-progress-bar">
          <div class="sub-progress-fill" style="width: ${sub.progress}%"></div>
        </div>
        <span class="sub-count">${sub.progress}%</span>
      </div>
    `).join('');

    document.querySelector('.subreddit-progress').classList.remove('hidden');
  }

  addError(error) {
    this.errors.push(error);
    this.updateErrorDisplay();
  }

  showErrors(errors) {
    this.errors = errors;
    this.updateErrorDisplay();
  }

  updateErrorDisplay() {
    if (this.errors.length === 0) {
      this.hideErrors();
      return;
    }

    const container = document.querySelector('.error-display');
    container.classList.remove('hidden');

    document.querySelector('.error-count').textContent = `${this.errors.length} error${this.errors.length > 1 ? 's' : ''}`;

    const list = document.querySelector('.error-list');
    list.innerHTML = this.errors.map(e => `
      <div class="error-item">
        <strong>r/${e.subreddit}:</strong> ${e.error}
      </div>
    `).join('');

    // Toggle button
    const toggle = document.querySelector('.error-toggle');
    toggle.onclick = () => {
      list.classList.toggle('hidden');
      toggle.textContent = list.classList.contains('hidden') ? 'Show details' : 'Hide details';
    };
  }

  hideErrors() {
    document.querySelector('.error-display').classList.add('hidden');
    document.querySelector('.error-list').classList.add('hidden');
  }

  setStats(stats) {
    if (stats.images !== undefined) {
      document.getElementById('stat-images').textContent = stats.images;
    }
    if (stats.speed !== undefined) {
      document.getElementById('stat-speed').textContent = stats.speed;
    }
    if (stats.remaining !== undefined) {
      document.getElementById('stat-remaining').textContent = stats.remaining;
    }
  }
}
