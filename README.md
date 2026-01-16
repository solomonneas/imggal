# Image Gallery Slideshow

A beautiful grid-based image slideshow application with Reddit integration and local folder support.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Grid Display** - Configurable rows and columns with smooth crossfade transitions
- **Reddit Integration** - Fetch images from your favorite subreddits
- **Local Folders** - Load images from your local filesystem
- **Profile System** - Save and manage subreddit collections with pre-made templates
- **Beautiful UI** - Modern glassmorphic design with animated splash page
- **Keyboard Shortcuts** - Quick controls for power users
- **Volume Control** - Built-in volume slider for video content

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/solomonneas/imggal.git
   cd imggal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open http://localhost:3000 in your browser

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` or `Space` | Toggle settings panel |
| `Escape` | Close settings |
| `P` | Pause/Resume rotation |
| `R` | Shuffle all images |
| `M` | Toggle mute |
| `F` | Toggle fullscreen |

## Configuration

Edit `config.json` to customize default settings:

```json
{
  "grid_rows": 3,
  "grid_columns": 3,
  "rotation_interval": 10,
  "background_color": "#1a1a1a",
  "image_fit_mode": "fit"
}
```

## Pre-made Profiles

- Space & Cosmos
- Nature
- Art & Design
- Animals
- Urban & Architecture
- Minimalist

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS
- **Backend**: Node.js + Express
- **Reddit API**: Public JSON endpoints

## License

MIT License - see [LICENSE](LICENSE) for details.
