const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');

const app = express();
const PORT = process.env.PORT || 3000;

// Global progress emitter for SSE
const progressEmitter = new EventEmitter();

app.use(cors());
app.use(express.json());

// Serve splash page as default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/splash.html'));
});

app.use(express.static(path.join(__dirname, '../frontend')));

// Serve cached images
app.use('/cache', express.static(path.join(__dirname, '../cache')));

// Config file path
const CONFIG_PATH = path.join(__dirname, '../config.json');
const PROFILES_DIR = path.join(__dirname, '../profiles');

// Ensure directories exist
if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });
if (!fs.existsSync(path.join(__dirname, '../cache'))) fs.mkdirSync(path.join(__dirname, '../cache'), { recursive: true });

// Default configuration
const defaultConfig = {
  default_profile: "Space & Cosmos",
  grid_rows: 3,
  grid_columns: 3,
  rotation_interval: 10,
  background_color: "#1a1a1a",
  image_fit_mode: "fit",
  reddit_posts_per_sub: 50,
  cache_directory: "./cache",
  enable_videos: false,
  max_concurrent_downloads: 10,
  loading_animation_style: "glassmorphic"
};

// Load or create config
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
  return defaultConfig;
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Pre-made profiles
const defaultProfiles = [
  {
    id: 'space-cosmos',
    name: 'Space & Cosmos',
    subreddits: ['spaceporn', 'astrophotography', 'space'],
    sort: 'hot',
    topPeriod: 'week',
    roundRobin: false,
    postsPerSub: 50,
    nsfwFilter: 'block',
    minScore: 100
  },
  {
    id: 'nature',
    name: 'Nature',
    subreddits: ['earthporn', 'natureporn', 'landscapephotography'],
    sort: 'hot',
    topPeriod: 'week',
    roundRobin: false,
    postsPerSub: 50,
    nsfwFilter: 'block',
    minScore: 100
  },
  {
    id: 'art-design',
    name: 'Art & Design',
    subreddits: ['art', 'design', 'graphic_design'],
    sort: 'hot',
    topPeriod: 'week',
    roundRobin: false,
    postsPerSub: 50,
    nsfwFilter: 'block',
    minScore: 50
  },
  {
    id: 'animals',
    name: 'Animals',
    subreddits: ['aww', 'animalsbeingderps', 'rarepuppers'],
    sort: 'hot',
    topPeriod: 'week',
    roundRobin: false,
    postsPerSub: 50,
    nsfwFilter: 'block',
    minScore: 100
  },
  {
    id: 'urban-architecture',
    name: 'Urban & Architecture',
    subreddits: ['cityporn', 'architectureporn', 'abandoned'],
    sort: 'hot',
    topPeriod: 'week',
    roundRobin: false,
    postsPerSub: 50,
    nsfwFilter: 'block',
    minScore: 50
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    subreddits: ['minimalism', 'minimalwallpaper', 'simplewallpapers'],
    sort: 'hot',
    topPeriod: 'week',
    roundRobin: false,
    postsPerSub: 50,
    nsfwFilter: 'block',
    minScore: 20
  }
];

// Initialize default profiles if none exist
function initProfiles() {
  const files = fs.readdirSync(PROFILES_DIR);
  if (files.length === 0) {
    defaultProfiles.forEach(profile => {
      fs.writeFileSync(
        path.join(PROFILES_DIR, `${profile.id}.json`),
        JSON.stringify(profile, null, 2)
      );
    });
  }
}
initProfiles();

// ============ API ROUTES ============

// Config endpoints
app.get('/api/config', (req, res) => {
  res.json(loadConfig());
});

app.put('/api/config', (req, res) => {
  const config = { ...loadConfig(), ...req.body };
  saveConfig(config);
  res.json(config);
});

// Profile endpoints
app.get('/api/profiles', (req, res) => {
  try {
    const files = fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json'));
    const profiles = files.map(f => {
      const content = fs.readFileSync(path.join(PROFILES_DIR, f), 'utf8');
      return JSON.parse(content);
    });
    res.json(profiles);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/profiles/:id', (req, res) => {
  try {
    const filePath = path.join(PROFILES_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const profile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/profiles', (req, res) => {
  try {
    const profile = req.body;
    if (!profile.id) {
      profile.id = profile.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
    const filePath = path.join(PROFILES_DIR, `${profile.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/profiles/:id', (req, res) => {
  try {
    const filePath = path.join(PROFILES_DIR, `${req.params.id}.json`);
    const profile = { ...req.body, id: req.params.id };
    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/profiles/:id', (req, res) => {
  try {
    const filePath = path.join(PROFILES_DIR, `${req.params.id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Local folder scanning
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];

// Open folder browser dialog (Windows)
app.get('/api/browse-folder', async (req, res) => {
  const { exec } = require('child_process');

  // PowerShell command to open folder browser dialog - using encoded command for reliability
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
$f = New-Object System.Windows.Forms.FolderBrowserDialog
$f.Description = 'Select a folder containing images'
$f.ShowNewFolderButton = $false
$f.RootFolder = 'MyComputer'
$null = $f.ShowDialog()
$f.SelectedPath
`;

  // Encode the script to base64 to avoid quoting issues
  const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64');

  exec(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedCommand}`,
    { encoding: 'utf8', timeout: 60000 },
    (error, stdout, stderr) => {
      if (error) {
        console.error('Folder browser error:', error.message);
        return res.json({ error: error.message, path: null });
      }
      const selectedPath = stdout.trim();
      res.json({ path: selectedPath || null });
    }
  );
});

app.post('/api/scan-folder', async (req, res) => {
  const { folderPath, recursive = true, includeVideos = false } = req.body;

  if (!folderPath) {
    return res.status(400).json({ error: 'Folder path required' });
  }

  try {
    const images = [];
    const extensions = includeVideos
      ? [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]
      : IMAGE_EXTENSIONS;

    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && recursive) {
          scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            images.push({
              path: fullPath,
              name: entry.name,
              type: VIDEO_EXTENSIONS.includes(ext) ? 'video' : 'image'
            });
          }
        }
      }
    }

    scanDir(folderPath);
    res.json({ images, count: images.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve local images
app.get('/api/local-image', (req, res) => {
  const imagePath = req.query.path;
  if (!imagePath) {
    return res.status(400).json({ error: 'Path required' });
  }

  // Security check - ensure path exists and is a file
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(imagePath);
});

// Reddit integration
let redditClient = null;

app.post('/api/reddit/configure', (req, res) => {
  const { clientId, clientSecret, userAgent } = req.body;

  try {
    const Snoowrap = require('snoowrap');
    redditClient = new Snoowrap({
      userAgent: userAgent || 'ImageGallerySlideshow/1.0',
      clientId,
      clientSecret,
      username: '',
      password: ''
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SSE endpoint for progress updates
app.get('/api/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  progressEmitter.on('progress', sendProgress);

  req.on('close', () => {
    progressEmitter.off('progress', sendProgress);
  });
});

// Fetch Reddit images
app.post('/api/reddit/fetch', async (req, res) => {
  const { subreddits, sort = 'hot', topPeriod = 'week', postsPerSub = 50, nsfwFilter = 'block', minScore = 0 } = req.body;

  if (!subreddits || !subreddits.length) {
    return res.status(400).json({ error: 'Subreddits required' });
  }

  const images = [];
  const errors = [];

  // Emit initial progress
  progressEmitter.emit('progress', {
    stage: 'fetching',
    message: 'Starting to fetch posts...',
    subreddits: subreddits.map(s => ({ name: s, progress: 0, total: postsPerSub })),
    totalImages: 0
  });

  for (let i = 0; i < subreddits.length; i++) {
    const sub = subreddits[i];
    try {
      // Fetch from Reddit JSON API (no auth required for public subreddits)
      const sortPath = sort === 'top' ? `top.json?t=${topPeriod}&limit=${postsPerSub}` : `${sort}.json?limit=${postsPerSub}`;
      const url = `https://www.reddit.com/r/${sub}/${sortPath}`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'ImageGallerySlideshow/1.0' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const posts = data.data.children;

      let subImages = 0;
      for (const post of posts) {
        const p = post.data;

        // Filter NSFW
        if (p.over_18 && nsfwFilter === 'block') continue;

        // Filter by score
        if (p.score < minScore) continue;

        // Check if it's an image
        const imgUrl = p.url;
        if (imgUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(imgUrl)) {
          images.push({
            url: imgUrl,
            title: p.title,
            subreddit: sub,
            score: p.score,
            nsfw: p.over_18,
            author: p.author,
            permalink: `https://reddit.com${p.permalink}`
          });
          subImages++;
        }
        // Handle imgur links
        else if (imgUrl && imgUrl.includes('imgur.com') && !imgUrl.includes('/a/') && !imgUrl.includes('/gallery/')) {
          const imgurUrl = imgUrl.replace('imgur.com', 'i.imgur.com') + '.jpg';
          images.push({
            url: imgurUrl,
            title: p.title,
            subreddit: sub,
            score: p.score,
            nsfw: p.over_18,
            author: p.author,
            permalink: `https://reddit.com${p.permalink}`
          });
          subImages++;
        }
        // Handle reddit galleries
        else if (p.is_gallery && p.media_metadata) {
          for (const [id, media] of Object.entries(p.media_metadata)) {
            if (media.s && media.s.u) {
              images.push({
                url: media.s.u.replace(/&amp;/g, '&'),
                title: p.title,
                subreddit: sub,
                score: p.score,
                nsfw: p.over_18,
                author: p.author,
                permalink: `https://reddit.com${p.permalink}`
              });
              subImages++;
            }
          }
        }
      }

      progressEmitter.emit('progress', {
        stage: 'fetching',
        message: `Fetched ${sub}`,
        currentSub: sub,
        subProgress: 100,
        overallProgress: Math.round(((i + 1) / subreddits.length) * 100),
        totalImages: images.length
      });

    } catch (e) {
      errors.push({ subreddit: sub, error: e.message });
      progressEmitter.emit('progress', {
        stage: 'fetching',
        message: `Error fetching ${sub}: ${e.message}`,
        error: true
      });
    }
  }

  progressEmitter.emit('progress', {
    stage: 'complete',
    message: 'Fetch complete',
    totalImages: images.length
  });

  res.json({ images, errors, count: images.length });
});

// Validate subreddit
app.get('/api/subreddits/validate/:name', async (req, res) => {
  try {
    const response = await fetch(`https://www.reddit.com/r/${req.params.name}/about.json`, {
      headers: { 'User-Agent': 'ImageGallerySlideshow/1.0' }
    });

    if (!response.ok) {
      return res.json({ valid: false, error: 'Subreddit not found' });
    }

    const data = await response.json();
    res.json({
      valid: true,
      name: data.data.display_name,
      title: data.data.title,
      subscribers: data.data.subscribers,
      nsfw: data.data.over18,
      icon: data.data.icon_img || data.data.community_icon
    });
  } catch (e) {
    res.json({ valid: false, error: e.message });
  }
});

// Search subreddits for autocomplete
app.get('/api/subreddits/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.json([]);
  }

  try {
    const response = await fetch(`https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(query)}&limit=10`, {
      headers: { 'User-Agent': 'ImageGallerySlideshow/1.0' }
    });

    const data = await response.json();
    const results = data.data.children.map(c => ({
      name: c.data.display_name,
      title: c.data.title,
      subscribers: c.data.subscribers,
      nsfw: c.data.over18
    }));

    res.json(results);
  } catch (e) {
    res.json([]);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Image Gallery Slideshow server running at http://localhost:${PORT}`);
});
