/**
 * StemTool Audio Splitter - Premiere Pro ExtendScript Engine
 * Interacts with Premiere Pro DOM (Sequence, Audio Tracks, Project Items)
 */

if (typeof $ === 'undefined') {
    $ = {};
}

$._stemtool = {
    /**
     * Checks if a sequence is open and returns the active sequence name.
     */
    getActiveSequenceInfo: function () {
        var seq = app.project.activeSequence;
        if (!seq) {
            return JSON.stringify({ error: "No active sequence found. Open a sequence in Premiere Pro." });
        }
        return JSON.stringify({
            name: seq.name,
            id: seq.sequenceID,
            audioTrackCount: seq.audioTracks.numTracks
        });
    },

    /**
     * Finds and returns metadata for currently selected audio clip(s) in the active sequence.
     */
    getSelectedAudioClips: function () {
        var seq = app.project.activeSequence;
        if (!seq) {
            return JSON.stringify({ error: "No active sequence found. Open a sequence in Premiere Pro." });
        }

        var clips = [];
        var numTracks = seq.audioTracks.numTracks;

        for (var t = 0; t < numTracks; t++) {
            var track = seq.audioTracks[t];
            var numClips = track.clips.numItems;

            for (var c = 0; c < numClips; c++) {
                var clip = track.clips[c];
                if (clip.isSelected()) {
                    var projectItem = clip.projectItem;
                    var mediaPath = "";
                    if (projectItem && projectItem.canGetMediaPath()) {
                        mediaPath = projectItem.getMediaPath();
                    }

                    clips.push({
                        name: clip.name,
                        trackIndex: t,
                        trackName: track.name,
                        mediaPath: mediaPath,
                        inPointSeconds: clip.inPoint ? clip.inPoint.seconds : 0,
                        outPointSeconds: clip.outPoint ? clip.outPoint.seconds : 0,
                        durationSeconds: clip.duration ? clip.duration.seconds : 0,
                        startTimeSeconds: clip.start ? clip.start.seconds : 0,
                        startTimeTicks: clip.start ? clip.start.ticks : "0",
                        endTimeSeconds: clip.end ? clip.end.seconds : 0,
                        nodeId: clip.nodeId
                    });
                }
            }
        }

        return JSON.stringify({
            sequenceName: seq.name,
            clips: clips
        });
    },

    /**
     * Imports separated stem WAV files into Premiere Pro project and places
     * them onto synchronized tracks in the active sequence.
     */
    importAndPlaceStems: function (stemFilesJson, startTimeTicks, baseTrackIndex, muteOriginal, originalNodeId) {
        var seq = app.project.activeSequence;
        if (!seq) {
            return JSON.stringify({ error: "No active sequence found." });
        }

        var filePaths;
        try {
            filePaths = JSON.parse(stemFilesJson);
        } catch (e) {
            return JSON.stringify({ error: "Invalid stem files payload: " + e.toString() });
        }

        if (!filePaths || filePaths.length === 0) {
            return JSON.stringify({ error: "No stem files provided to import." });
        }

        // 1. Locate or create "StemTool Stems" Bin in the project
        var root = app.project.rootItem;
        var stemBin = null;
        for (var b = 0; b < root.children.numItems; b++) {
            if (root.children[b].name === "StemTool Stems" && root.children[b].type === ProjectItemType.BIN) {
                stemBin = root.children[b];
                break;
            }
        }
        if (!stemBin) {
            stemBin = root.createBin("StemTool Stems");
        }

        // 2. Import stem files into the bin
        var beforeCount = stemBin.children.numItems;
        var importSuccess = app.project.importFiles(filePaths, 1, stemBin, 0);

        // 3. Find imported items
        var importedItems = [];
        for (var i = beforeCount; i < stemBin.children.numItems; i++) {
            importedItems.push(stemBin.children[i]);
        }

        // 4. Place stems on synchronized sequence tracks
        var time = new Time();
        time.ticks = startTimeTicks;

        var placedCount = 0;
        var numTracks = seq.audioTracks.numTracks;

        for (var s = 0; s < importedItems.length; s++) {
            var targetTrackIndex = baseTrackIndex + 1 + s;

            // Use track if within existing bounds
            if (targetTrackIndex < numTracks) {
                var targetTrack = seq.audioTracks[targetTrackIndex];
                try {
                    targetTrack.overwriteClip(importedItems[s], time);
                    placedCount++;
                } catch (err) {
                    // Overwrite on available track
                }
            }
        }

        // 5. Optional auto-mute original clip/track
        if (muteOriginal && baseTrackIndex < numTracks) {
            try {
                // If supported on track
                var origTrack = seq.audioTracks[baseTrackIndex];
                if (origTrack && typeof origTrack.setMute === 'function') {
                    origTrack.setMute(1);
                }
            } catch (muteErr) {}
        }

        return JSON.stringify({
            success: true,
            importedCount: importedItems.length,
            placedCount: placedCount
        });
    }
};

