# StemTool Audio Splitter - Premiere Pro Plugin

An Adobe Premiere Pro CEP extension panel that allows video and audio editors to select audio clips directly from an active sequence timeline, split them into isolated stems (Vocals, Instrumental, Drums, Bass, etc.), and automatically import and align the resulting stems back onto synchronized sequence tracks.

---

## ⚡ Crucial System Requirement

> [!IMPORTANT]
> **StemTool Must Be Installed on Your System**  
> To use this Premiere Pro plugin, you must have **StemTool** installed on your computer.
>
> ### Why?
> Audio separation relies on large deep-learning models (Demucs v4, Mel-Band RoFormer) and PyTorch tensor operations that require substantial RAM and GPU memory.
>
> **All heavy computational load runs entirely under the standalone StemTool engine outside Premiere Pro.**  
> Premiere Pro is not burdened with Python runtimes or heavy model weights, keeping your timeline playback, video preview, and Mercury Playback Engine 100% responsive and crash-free.
>
> If StemTool is not installed on your system, the plugin panel will display a dialog box notifying you:  
> **"StemTool is required to use this plugin. Please download and install StemTool first."**

---

## 🚀 1-Click Installation

### Windows:
Open PowerShell and run:
```powershell
.\install-plugin.ps1
```

### macOS:
Open Terminal and run:
```bash
chmod +x install-plugin.sh
./install-plugin.sh
```

The installer copies the extension into your Adobe CEP extensions folder:
- **Windows:** `%APPDATA%\Adobe\CEP\extensions\com.stemtool.premiere`
- **macOS:** `~/Library/Application Support/Adobe/CEP/extensions/com.stemtool.premiere`

It also automatically enables Adobe `PlayerDebugMode` so the extension loads seamlessly without requiring code-signing certificates.

---

## 🎬 How to Use in Premiere Pro

1. Launch or restart **Adobe Premiere Pro** (v14.0 / 2020 through 2025+).
2. Open your project and open an active **Sequence** containing audio.
3. From the top menu, go to:  
   **Window > Extensions > StemTool Audio Splitter**
4. Select an audio clip on your sequence timeline.
5. In the StemTool panel:
   - Click **↻ Refresh** to view the clip name, track (`A1`), and timecode range.
   - Choose your stem preset:
     - **Vocals / Inst** (Fast 2-stem)
     - **Standard** (Vocals, Drums, Bass, Other)
     - **Studio** (Vocals, Drums, Bass, Guitar, Piano, Other)
   - Keep **"Auto-mute original sequence clip"** checked if you want to audition the isolated stems immediately.
6. Click **⚡ Split Selected Audio**.
7. Watch the live progress bar:
   - The sub-clip audio is extracted losslessly via FFmpeg.
   - The job is processed by the standalone StemTool engine.
   - The separated stem WAV files are imported into a dedicated `"StemTool Stems"` project bin.
   - The stems are automatically placed onto new audio tracks (`A2`, `A3`, `A4`, ...) exactly aligned with your original clip's start time!

---

## 📂 Architecture Overview

```
Premiere Pro Sequence (Timeline Clip Selection)
       │
       ▼
ExtendScript (Premiere.jsx) ─── Extracts mediaPath & in/out timecodes
       │
       ▼
CEP Bridge (engine-bridge.js) ─── Calls FFmpeg to slice sub-clip WAV
       │
       ▼
Standalone StemTool Engine ───── Deep learning inference (PyTorch / Demucs)
(Runs outside Premiere Pro)
       │
       ▼
ExtendScript (Premiere.jsx) ─── Imports stem WAVs & overwrites on timeline
       │
       ▼
Premiere Pro Timeline (Synchronized Stems Ready to Play!)
```

