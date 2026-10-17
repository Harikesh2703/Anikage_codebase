<p align=center>
<br>
<a href="http://makeapullrequest.com"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"></a>
<a href="#Linux"><img src="https://img.shields.io/badge/os-linux-brightgreen">
<a href="#MacOS"><img src="https://img.shields.io/badge/os-mac-brightgreen">
<a href="#Windows"><img src="https://img.shields.io/badge/os-windows-yellowgreen">
<br>
<h1 align="center">
<img src="/.assets/matrix-logo.svg" height=110>
<br>
<b>Anikage - Premium Anime Streaming Desktop Application</b>
</p>

<h3 align="center">
A desktop application to browse and stream anime with a beautiful UI and powerful features.
</h3>

<h1 align="center">
	Showcase
</h1>

## Table of Contents

- [Features](#features)
- [Install](#install)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Dependencies](#dependencies)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)

## Features

✨ **Cross-platform Desktop App**: Works natively on Windows, macOS, and Linux  
🎬 **Stream anime**: Browse and watch anime from multiple sources  
📥 **Download episodes**: Save episodes for offline viewing  
📜 **Watch history**: Continue where you left off  
🎨 **Beautiful UI**: Modern, responsive interface built with React  
🎯 **Quality selection**: Choose your preferred video quality  
🌐 **Multiple players**: Support for mpv, VLC, and system default players  
📊 **Analytics**: Track your viewing habits and progress  
🔔 **Notifications**: Get notified about new episodes  

## Install

### Prerequisites

- **Node.js** 14 or higher
- **npm** or **yarn** package manager
- **Video player**: mpv (recommended) or VLC
- **Optional**: aria2c, yt-dlp, ffmpeg (for downloading)

### Installation from Source

```bash
# Clone the repository
git clone https://github.com/Harikesh2703/Anikage_backup.git
cd Anikage_backup

# Install dependencies
npm install

# Install frontend dependencies
cd frontend/emerald-stream-main
npm install
cd ../..

# Start the development server
npm run desktop

# Or build for production
npm run dist
```

### Windows Installation

```powershell
# Install Node.js from https://nodejs.org/

# Install mpv or VLC
# mpv: https://mpv.io/installation/
# VLC: https://www.videolan.org/

# Clone and install
git clone https://github.com/Harikesh2703/Anikage_backup.git
cd Anikage_backup
npm install

# Start development
npm run desktop

# Or build
npm run dist
```

## Usage

### Development

```bash
# Start frontend dev server and Electron app
npm run desktop

# Start just the backend server
npm run server

# Start just the frontend
npm run frontend

# Build frontend for production
npm run build:frontend
```

### Production

```bash
# Build the Electron app
npm run dist

# Run the built application
# On Windows: dist_electron/Anikage_Setup.exe
# On Linux: dist_electron/Anikage-*.AppImage
# On macOS: dist_electron/Anikage-*.dmg
```

### Command Line Options

```
Options:
  -V, --version              Output the version number
  -c, --continue             Continue watching from history
  -d, --download             Download episode instead of playing
  -D, --delete               Delete history
  -e, --episode <range>      Specify episode number or range
  -q, --quality <quality>    Video quality (best, worst, 360, 480, 720, 1080)
  -v, --vlc                  Use VLC as the media player
  -S, --select-nth <index>   Select nth anime from search results
  --dub                      Play dubbed version
  --player <player>          Specify custom player
  --no-detach                Don't detach the player
  -h, --help                 Display help for command
```

### Environment Variables

```bash
# Set default mode (sub or dub)
export ANIKAGE_MODE=sub

# Set download directory
export ANIKAGE_DOWNLOAD_DIR=~/Downloads/Anime

# Set default quality
export ANIKAGE_QUALITY=1080

# Set default player
export ANIKAGE_PLAYER=mpv

# Disable episode logging
export ANIKAGE_LOG_EPISODE=0
```

## Project Structure

```
Anikage/
├── bin/
│   └── anikage.js          # CLI entry point
├── server/
│   ├── index.mjs           # Express server
│   └── db.mjs              # Database configuration
├── frontend/
│   └── emerald-stream-main/
│       ├── src/
│       │   ├── components/
│       │   │   ├── anime/  # Anime-related components
│       │   │   └── ui/     # UI components
│       │   └── App.tsx
│       └── package.json
├── src/
│   ├── index.js            # Main application
│   ├── api/                # API integration
│   ├── ui/                 # CLI UI
│   ├── player/             # Video player integration
│   ├── download/           # Download functionality
│   ├── history/            # History management
│   └── utils/              # Utility functions
├── electron-main.mjs       # Electron main process
├── package.json
└── README.md
```

## Dependencies

### Core
- **express**: Web server framework
- **sqlite3**: Database
- **electron**: Desktop application framework
- **electron-builder**: Build tool for Electron apps

### CLI
- **axios**: HTTP requests
- **chalk**: Terminal colors
- **commander**: CLI argument parsing
- **inquirer**: Interactive prompts
- **cli-progress**: Progress bars
- **ora**: Loading spinners

### Frontend
- **react**: UI library
- **typescript**: Type safety
- **tailwindcss**: Styling
- **shadcn/ui**: Component library

## Troubleshooting

### Windows Issues

**Player not found:**
```bash
# Add mpv to PATH or use full path
anikage --player "C:\Program Files\mpv\mpv.exe" "anime name"
```

**Download not working:**
```bash
# Install aria2c or yt-dlp
# aria2: https://github.com/aria2/aria2/releases
# yt-dlp: https://github.com/yt-dlp/yt-dlp/releases
```

### Linux/macOS Issues

**Permission denied:**
```bash
chmod +x bin/anikage.js
```

**Player not found:**
```bash
# Install mpv
# Ubuntu/Debian: sudo apt install mpv
# macOS: brew install mpv
# Arch: sudo pacman -S mpv
```

### Build Issues

**Node modules not found:**
```bash
npm install
cd frontend/emerald-stream-main
npm install
cd ../..
```

**Port already in use:**
```bash
# Change the port in server/index.mjs or kill the process using the port
```

## Contributing

Contributions are welcome!

### Pull Requests
- Appease the linter
- Bump the version
- Adjust the Readme according to your changes (if applicable)
- No extra dependencies unless absolutely necessary
- If you're fixing an issue, open an issue as well or link existing one

### Issues
- Use the issue templates
- Provide screenshot if applicable

### How else can I help?
- Take part in troubleshooting and testing
- Star the repo
- Follow the maintainers

## License

GNU General Public License v3.0

## Disclaimer

**This project: Anikage**

Anikage is a desktop application for browsing and streaming anime content. All content available through the project is hosted by external non-affiliated sources. Any content served through this project is publicly accessible. If your site is listed in this project, the code is pretty much public. Take necessary measures to counter the exploits used to extract content in your site.

This project is to be used at the user's own risk, based on their government and laws. This project has no control on the content it is serving, using copyrighted content from the providers is not going to be accounted for by the developer. It is the user's own risk.

**DMCA and Copyright Infringements**

A browser is a tool, and the maliciousness of the tool is directly based on the user. This project uses client-side content access mechanisms. Hence, the copyright infringements or DMCA in this project's regards are to be forwarded to the associated site by the associated notifier of any such claims. Do not harass the maintainer.

**Contacting the maintainer**
Begin by making a GitHub issue or sending an email to contact@anikage.com
