<p align="center">
  <img src="docs/stemtool-logo.svg" alt="StemTool Logo" width="128" height="128" />
</p>

<h1 align="center">StemTool</h1>

<p align="center">
  <strong>High-performance, 100% local audio stem separation for creators, producers, and video editors.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-black" alt="Platform" />
  <img src="https://img.shields.io/badge/privacy-100%25%20local-emerald" alt="100% Local" />
  <img src="https://img.shields.io/badge/premiere%20pro-plugin%20included-blue" alt="Premiere Pro Plugin" />
  <img src="https://img.shields.io/badge/license-MIT-purple" alt="License" />
</p>

---

## Overview

**StemTool** isolates and extracts vocals, drums, bass, guitar, piano, and other instruments directly on your machine. Powered by state-of-the-art neural separation models (**Mel-Band Roformer** and **HTDemucs**), it delivers studio-quality audio isolation without sending a single byte of your media to the cloud.

Available as both a **standalone desktop workstation** and a native **Adobe Premiere Pro timeline extension**.

---

## Key Features

### 🎛️ Desktop Audio Workstation
- **Search or Import**: Search YouTube directly or drag-and-drop local audio/video files.
- **Multi-Track Stem Player**: Play separated stems with dedicated volume faders, pan controls, solo/mute buttons, and interactive waveforms.
- **Instant Seeking & Sync**: Zero-latency scrub across video and separated audio channels.
- **One-Click Presets**: Fast switching between **All Stems**, **Karaoke** (no vocals), **Acapella** (vocals only), and **Rhythm Section** (drums + bass).
- **Export to WAV**: Export isolated stems individually or batch export all channels as uncompressed 24-bit/32-bit WAV files.

### 🎬 Premiere Pro Extension Plugin
- **Direct Timeline Splitting**: Select any audio clip on your active Premiere Pro sequence and split it into stems with a single click.
- **Automatic Track Placement**: Automatically maps separated stems (Vocals, Drums, Bass, Other) onto synchronized audio tracks (`A2`, `A3`, `A4`, `A5`) beneath your source.
- **Decoupled Architecture**: All heavy ML computation runs through the local StemTool background engine—keeping Premiere Pro responsive, fast, and crash-free.
- **Smart Safety Guard**: Detects whether StemTool is installed and prompts you with a clean download dialog if not.

### 🔒 100% Private & Fully Offline
- **Zero Cloud Uploads**: Your media, library, and audio processing never leave your computer.
- **Zero Telemetry**: No tracking, no analytics, no background heartbeats, and no third-party phone-home servers.
- **Hardware Accelerated**: Optimized for Apple Silicon (Metal/MPS), NVIDIA GPUs (CUDA), AMD (ROCm on Linux), and multi-threaded CPU fallback.

---

## Premiere Pro Plugin Setup

The Premiere Pro CEP plugin is located in the `premiere-plugin/` directory.

### Quick Install (Windows)
Run PowerShell as Administrator:
```powershell
.\premiere-plugin\install-plugin.ps1
```

### Quick Install (macOS)
```bash
chmod +x ./premiere-plugin/install-plugin.sh
./premiere-plugin/install-plugin.sh
```

### How to Use in Premiere Pro
1. Open Adobe Premiere Pro.
2. Go to **Window → Extensions → StemTool**.
3. Select an audio clip on your sequence timeline.
4. Click **Split Selected Clip**. The plugin communicates with your local StemTool installation to isolate stems and automatically insert them onto your sequence.

---

## Desktop App Installation

Download pre-built binaries from [Releases](https://github.com/slice-of-fun/stemtool/releases):

| OS | Format | Notes |
| :--- | :--- | :--- |
| **Windows** | `.exe` installer / `.zip` portable | Windows 10/11 (x64) |
| **macOS** | `.dmg` | Universal (Apple Silicon & Intel) |
| **Linux** | `.AppImage` / `.deb` | Ubuntu 22.04+ or equivalent |

*First launch automatically prepares a private Python runtime and fetches the separation weights (~2 GB).*

---

## Separation Architecture

```
Audio Source (YouTube / File / Timeline Clip)
         │
         ▼
   Bundled FFmpeg (44.1 kHz 16-bit Float PCM)
         │
         ├────────────────────────────────┐
         ▼                                ▼
Mel-Band Roformer (Vocals)        HTDemucs (Drums, Bass, Other)
         │                                │
         └────────────────┬───────────────┘
                          ▼
            Isolated WAV Stem Channels
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
StemTool Desktop DAW               Premiere Pro Sequence
(Waveforms, Faders, Pan)          (Tracks A2, A3, A4, A5)
```

---

## Development

### Prerequisites
- Node.js 24+
- npm or pnpm

### Quick Start
```bash
# Install dependencies
npm install

# Start development mode
npm run dev
```

### Building Installers
```bash
# Fetch bundled FFmpeg binaries (one-time setup)
powershell scripts/fetch-ffmpeg.ps1  # Windows
bash scripts/fetch-ffmpeg.sh        # macOS / Linux

# Build distributables
npm run dist:win    # Windows installer & portable zip
npm run dist        # macOS DMG
npm run dist:linux  # Linux AppImage & deb
```

### Running Tests
```bash
npm test
node tests/engine.test.mjs
node tests/pan-storage.test.mjs
```

---

## Repository Structure

```
├── build/                 # Vector icons and build metadata
├── docs/                  # Documentation assets
├── premiere-plugin/       # Adobe Premiere Pro CEP extension plugin
│   ├── CSXS/              # Extension manifest (v12.0)
│   ├── js/                # UI controller & local engine bridge
│   ├── jsx/               # ExtendScript sequence & audio track manipulator
│   └── install-plugin.ps1 # 1-click Windows installer
├── python/                # Neural separation scripts (Roformer & Demucs)
├── scripts/               # Build utilities and FFmpeg fetchers
├── src/
│   ├── main/              # Electron main process & separation pipeline
│   ├── preload/           # Secure context-isolated IPC bridge
│   └── renderer/          # React audio player, waveforms, and mixer UI
└── tests/                 # Audio engine, pan persistence, and path tests
```

---

## License

Released under the [MIT License](LICENSE). Built for music creators, audio engineers, and video editors by [slice-of-fun](https://github.com/slice-of-fun).
