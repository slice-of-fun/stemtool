/**
 * StemTool Engine Bridge
 * Connects the Premiere Pro CEP panel to the standalone StemTool engine.
 * 
 * Crucial Design Principle:
 * All heavy PyTorch, Demucs, DSP and GPU compute is completely offloaded
 * to the external StemTool engine on the user's system to keep Premiere Pro
 * fast, responsive, and crash-free.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

class StemToolEngineBridge {
    constructor() {
        this.stemToolInfo = null;
        this.activeProcess = null;
    }

    /**
     * Checks whether the standalone StemTool application is installed on the user's system.
     */
    detectInstallation() {
        const isWin = process.platform === 'win32';
        const exe = isWin ? '.exe' : '';
        const venvBinDir = isWin ? 'Scripts' : 'bin';

        const candidateDirs = [];

        // 1. Custom user-specified path in plugin settings
        const customPath = localStorage.getItem('stemtool_path');
        if (customPath) {
            candidateDirs.push(customPath);
        }

        // 2. Relative project/workspace directory
        candidateDirs.push(path.resolve(__dirname, '../../..'));
        candidateDirs.push(path.resolve(__dirname, '../..'));

        // 3. Standard system application directories
        if (isWin) {
            const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
            const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
            candidateDirs.push(path.join(appData, 'StemTool'));
            candidateDirs.push(path.join(localAppData, 'Programs', 'stemtool'));
            candidateDirs.push(path.join(appData, 'stemtool'));
        } else if (process.platform === 'darwin') {
            candidateDirs.push(path.join(os.homedir(), 'Library', 'Application Support', 'StemTool'));
            candidateDirs.push('/Applications/StemTool.app/Contents/Resources');
        } else {
            candidateDirs.push(path.join(os.homedir(), '.config', 'StemTool'));
        }

        for (const dir of candidateDirs) {
            if (!dir || !fs.existsSync(dir)) continue;

            // Look for python venv or python script
            const pythonCandidates = [
                path.join(dir, 'venv', venvBinDir, 'python' + exe),
                path.join(dir, 'python-runtime', 'python', isWin ? 'python.exe' : 'bin/python3')
            ];

            let foundPython = null;
            for (const py of pythonCandidates) {
                if (fs.existsSync(py)) {
                    foundPython = py;
                    break;
                }
            }

            // Look for separate.py script
            const scriptCandidates = [
                path.join(dir, 'python', 'separate.py'),
                path.join(dir, 'resources', 'python', 'separate.py'),
                path.join(dir, 'separate.py')
            ];

            let foundScript = null;
            for (const sc of scriptCandidates) {
                if (fs.existsSync(sc)) {
                    foundScript = sc;
                    break;
                }
            }

            // Look for ffmpeg
            const ffmpegSubdir = isWin ? 'ffmpeg-win' : (process.platform === 'darwin' ? 'ffmpeg-mac' : 'ffmpeg-linux');
            const ffmpegCandidates = [
                path.join(dir, 'extras', ffmpegSubdir, 'ffmpeg' + exe),
                path.join(dir, 'resources', 'ffmpeg', 'ffmpeg' + exe),
                path.join(dir, 'ffmpeg' + exe)
            ];

            let foundFfmpeg = null;
            for (const ff of ffmpegCandidates) {
                if (fs.existsSync(ff)) {
                    foundFfmpeg = ff;
                    break;
                }
            }
            if (!foundFfmpeg) {
                foundFfmpeg = 'ffmpeg'; // system PATH fallback
            }

            if (foundScript) {
                this.stemToolInfo = {
                    installed: true,
                    rootDir: dir,
                    pythonBin: foundPython || (isWin ? 'python.exe' : 'python3'),
                    separateScript: foundScript,
                    ffmpegBin: foundFfmpeg
                };
                return this.stemToolInfo;
            }
        }

        this.stemToolInfo = {
            installed: false,
            message: "StemTool system was not detected on this machine. Please download and install StemTool first."
        };
        return this.stemToolInfo;
    }

    /**
     * Slices the selected sequence clip's source audio via FFmpeg and separates stems via StemTool.
     */
    async splitClip(clip, options, onProgress) {
        const info = this.detectInstallation();
        if (!info || !info.installed) {
            throw new Error("StemTool is not installed on this system. Please download and install StemTool first.");
        }

        if (!clip.mediaPath || !fs.existsSync(clip.mediaPath)) {
            throw new Error(`Media file not found on disk: "${clip.mediaPath || 'Unknown'}"`);
        }

        // Create temporary job working directory
        const jobId = `stemtool_ppro_${Date.now()}`;
        const tempDir = path.join(os.tmpdir(), jobId);
        const stemsOutDir = path.join(tempDir, 'stems');
        fs.mkdirSync(stemsOutDir, { recursive: true });

        const slicedWavPath = path.join(tempDir, 'slice.wav');

        // Step 1: Slice source media to 44.1kHz WAV matching inPoint and outPoint
        onProgress(5, "Extracting audio slice from sequence clip via FFmpeg...");

        const inSec = Math.max(0, clip.inPointSeconds || 0);
        const outSec = clip.outPointSeconds || 0;
        const durationSec = outSec > inSec ? (outSec - inSec) : (clip.durationSeconds || 0);

        const ffmpegArgs = [
            '-y',
            '-ss', inSec.toFixed(3)
        ];

        if (durationSec > 0) {
            ffmpegArgs.push('-t', durationSec.toFixed(3));
        }

        ffmpegArgs.push(
            '-i', clip.mediaPath,
            '-vn',
            '-ac', '2',
            '-ar', '44100',
            '-c:a', 'pcm_s16le',
            slicedWavPath
        );

        await new Promise((resolve, reject) => {
            const child = spawn(info.ffmpegBin, ffmpegArgs);
            this.activeProcess = child;
            child.on('close', (code) => {
                if (code === 0 && fs.existsSync(slicedWavPath)) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg audio extraction failed with exit code ${code}`));
                }
            });
            child.on('error', (err) => reject(new Error(`FFmpeg execution failed: ${err.message}`)));
        });

        // Step 2: Offload stem separation to StemTool's Python engine
        onProgress(20, "Offloading separation to standalone StemTool engine...");

        const pythonArgs = [
            info.separateScript,
            '--input', slicedWavPath,
            '--out', stemsOutDir,
            '--model', options.model || 'htdemucs'
        ];

        if (options.stems && options.stems.length > 0) {
            pythonArgs.push('--only', options.stems.join(','));
        }

        const producedStemFiles = [];

        await new Promise((resolve, reject) => {
            const child = spawn(info.pythonBin, pythonArgs, {
                env: { ...process.env, PYTHONUNBUFFERED: '1' }
            });
            this.activeProcess = child;

            let buffer = '';
            child.stdout.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    try {
                        const parsed = JSON.parse(trimmed);
                        if (parsed.type === 'progress') {
                            const pct = Math.min(95, 20 + Math.round((parsed.pct || 0) * 0.75));
                            onProgress(pct, parsed.message || "Separating audio stems...");
                        } else if (parsed.type === 'stem') {
                            onProgress(90, `Stem rendered: ${parsed.name}`);
                        } else if (parsed.type === 'error') {
                            reject(new Error(`StemTool separation error: ${parsed.message}`));
                        }
                    } catch (e) {
                        // Plain text line
                    }
                }
            });

            child.stderr.on('data', (c) => {
                console.error("[StemTool Engine Stderr]", c.toString());
            });

            child.on('close', (code) => {
                this.activeProcess = null;
                if (code === 0) {
                    // Collect generated stem WAV files
                    try {
                        const files = fs.readdirSync(stemsOutDir);
                        for (const f of files) {
                            if (f.toLowerCase().endsWith('.wav')) {
                                producedStemFiles.push(path.join(stemsOutDir, f));
                            }
                        }
                    } catch (readErr) {}

                    if (producedStemFiles.length > 0) {
                        resolve();
                    } else {
                        reject(new Error("StemTool finished but no stem WAV files were found."));
                    }
                } else {
                    reject(new Error(`StemTool separation exited with code ${code}`));
                }
            });

            child.on('error', (err) => {
                this.activeProcess = null;
                reject(new Error(`Could not spawn StemTool engine: ${err.message}`));
            });
        });

        onProgress(100, "Stems generated successfully!");
        return producedStemFiles;
    }

    cancel() {
        if (this.activeProcess) {
            try {
                this.activeProcess.kill();
            } catch (e) {}
            this.activeProcess = null;
        }
    }
}

if (typeof module !== 'undefined') {
    module.exports = { StemToolEngineBridge };
}

