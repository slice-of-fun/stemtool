/**
 * StemTool Premiere Pro Plugin - Main Panel UI Controller
 */

(function () {
    const csInterface = new CSInterface();
    let bridge = null;
    if (typeof StemToolEngineBridge !== 'undefined') {
        bridge = new StemToolEngineBridge();
    } else if (typeof require !== 'undefined') {
        const { StemToolEngineBridge } = require('./engine-bridge.js');
        bridge = new StemToolEngineBridge();
    }

    // UI Elements
    const statusBadge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    const btnRefresh = document.getElementById('btn-refresh');
    const clipEmpty = document.getElementById('clip-empty');
    const clipInfo = document.getElementById('clip-info');
    const clipName = document.getElementById('clip-name');
    const clipTrack = document.getElementById('clip-track');
    const clipDuration = document.getElementById('clip-duration');
    const clipTimecode = document.getElementById('clip-timecode');
    const btnSplit = document.getElementById('btn-split');
    const progressSection = document.getElementById('progress-section');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressStatus = document.getElementById('progress-status');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const chkAutoMute = document.getElementById('chk-auto-mute');

    // Modal Dialog Elements
    const modalRequired = document.getElementById('modal-stemtool-required');
    const btnModalDownload = document.getElementById('btn-modal-download');
    const btnModalCheck = document.getElementById('btn-modal-check');

    let currentSelectedClip = null;
    let selectedModel = 'htdemucs';
    let selectedStems = ['vocals', 'drums', 'bass', 'other'];

    /**
     * Initializes the panel and verifies StemTool system installation.
     */
    function init() {
        checkStemToolInstalled();
        setupEventListeners();
        refreshSelectedClips();
        // Poll every 3 seconds for timeline clip selection updates
        setInterval(refreshSelectedClips, 3000);
    }

    /**
     * Verifies that the standalone StemTool system is installed.
     * If not found, immediately displays the modal dialog to the editor.
     */
    function checkStemToolInstalled() {
        if (!bridge) return;

        const info = bridge.detectInstallation();
        if (!info || !info.installed) {
            statusBadge.classList.add('error');
            statusText.textContent = 'StemTool Not Found';
            modalRequired.classList.remove('hidden');
            btnSplit.disabled = true;
        } else {
            statusBadge.classList.remove('error');
            statusText.textContent = 'Engine Ready';
            modalRequired.classList.add('hidden');
            updateSplitButtonState();
        }
    }

    /**
     * Sets up UI event handlers.
     */
    function setupEventListeners() {
        // Modal buttons
        btnModalDownload.addEventListener('click', () => {
            csInterface.openURLInDefaultBrowser('https://github.com/slice-of-fun/stemtool/releases');
        });

        btnModalCheck.addEventListener('click', () => {
            checkStemToolInstalled();
        });

        // Refresh selected clip button
        btnRefresh.addEventListener('click', () => {
            refreshSelectedClips(true);
        });

        // Preset stem mode buttons
        presetButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                presetButtons.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                selectedModel = btn.getAttribute('data-model') || 'htdemucs';
                const stemsAttr = btn.getAttribute('data-stems');
                selectedStems = stemsAttr ? stemsAttr.split(',') : [];
            });
        });

        // Action button: Split Selected Audio
        btnSplit.addEventListener('click', handleSplitClicked);
    }

    /**
     * Queries Premiere Pro ExtendScript for currently selected sequence audio clips.
     */
    function refreshSelectedClips(manualClick = false) {
        csInterface.evalScript("$._stemtool.getSelectedAudioClips()", (res) => {
            try {
                const data = JSON.parse(res);
                if (data.error) {
                    currentSelectedClip = null;
                    clipEmpty.textContent = data.error;
                    clipEmpty.style.display = 'block';
                    clipInfo.style.display = 'none';
                    updateSplitButtonState();
                    return;
                }

                if (!data.clips || data.clips.length === 0) {
                    currentSelectedClip = null;
                    clipEmpty.textContent = "Select an audio clip in your Premiere Pro sequence timeline.";
                    clipEmpty.style.display = 'block';
                    clipInfo.style.display = 'none';
                    updateSplitButtonState();
                    return;
                }

                // Use the first selected audio clip
                const clip = data.clips[0];
                currentSelectedClip = clip;

                clipEmpty.style.display = 'none';
                clipInfo.style.display = 'block';
                clipName.textContent = clip.name || 'Unnamed Audio Clip';
                clipTrack.textContent = `Track: ${clip.trackName || 'Audio ' + (clip.trackIndex + 1)}`;
                clipDuration.textContent = `${(clip.durationSeconds || 0).toFixed(1)}s`;

                const inSec = (clip.inPointSeconds || 0).toFixed(1);
                const outSec = (clip.outPointSeconds || 0).toFixed(1);
                clipTimecode.textContent = `Clip Range: ${inSec}s - ${outSec}s`;

                updateSplitButtonState();
            } catch (err) {
                if (manualClick) {
                    console.error("Failed to parse selected clips:", err);
                }
            }
        });
    }

    function updateSplitButtonState() {
        const isReady = bridge && bridge.stemToolInfo && bridge.stemToolInfo.installed;
        btnSplit.disabled = !isReady || !currentSelectedClip;
    }

    /**
     * Executes the audio separation workflow.
     */
    async function handleSplitClicked() {
        if (!currentSelectedClip || !bridge) return;

        btnSplit.disabled = true;
        progressSection.classList.add('visible');
        progressBarFill.style.width = '0%';
        progressStatus.textContent = "Preparing audio extraction...";

        try {
            // Step 1 & 2: Slices audio and runs separation via external StemTool engine
            const producedStems = await bridge.splitClip(
                currentSelectedClip,
                { model: selectedModel, stems: selectedStems },
                (pct, msg) => {
                    progressBarFill.style.width = `${pct}%`;
                    progressStatus.textContent = msg;
                }
            );

            // Step 3: Tell Premiere Pro ExtendScript to import stems and place them onto the timeline
            progressStatus.textContent = "Placing stems into sequence timeline...";
            const payloadJson = JSON.stringify(producedStems);
            const ticks = currentSelectedClip.startTimeTicks;
            const trackIndex = currentSelectedClip.trackIndex;
            const autoMute = chkAutoMute.checked ? 1 : 0;
            const nodeId = currentSelectedClip.nodeId || '';

            const jsxScript = `$._stemtool.importAndPlaceStems(${JSON.stringify(payloadJson)}, "${ticks}", ${trackIndex}, ${autoMute}, "${nodeId}")`;

            csInterface.evalScript(jsxScript, (placeRes) => {
                try {
                    const res = JSON.parse(placeRes);
                    if (res.error) {
                        progressStatus.textContent = `Import notice: ${res.error}`;
                    } else {
                        progressStatus.textContent = `Success! ${res.placedCount || producedStems.length} stems added to timeline.`;
                        progressBarFill.style.width = '100%';
                    }
                } catch (e) {
                    progressStatus.textContent = "Stems imported into project.";
                }

                setTimeout(() => {
                    progressSection.classList.remove('visible');
                    updateSplitButtonState();
                }, 4000);
            });
        } catch (err) {
            progressStatus.textContent = `Error: ${err.message || String(err)}`;
            progressBarFill.style.background = '#d73a49';
            setTimeout(() => {
                progressSection.classList.remove('visible');
                progressBarFill.style.background = 'linear-gradient(90deg, #3b82f6, #8b5cf6)';
                updateSplitButtonState();
            }, 6000);
        }
    }

    // Launch on load
    window.addEventListener('DOMContentLoaded', init);
})();

