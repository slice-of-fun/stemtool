#!/usr/bin/env bash
# StemTool Premiere Pro Extension - 1-Click macOS/Linux Installer
# Deploys plugin to Adobe CEP extensions directory and configures PlayerDebugMode

set -euo pipefail

echo "=============================================="
echo "  StemTool Audio Splitter - Premiere Pro Plugin"
echo "=============================================="

PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ "$OSTYPE" == "darwin"* ]]; then
    CEP_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
else
    CEP_DIR="$HOME/.local/share/Adobe/CEP/extensions"
fi

TARGET_DIR="$CEP_DIR/com.stemtool.premiere"

mkdir -p "$CEP_DIR"

if [ -d "$TARGET_DIR" ]; then
    echo "> Updating existing installation at: $TARGET_DIR"
    rm -rf "$TARGET_DIR"
else
    echo "> Installing plugin to: $TARGET_DIR"
fi

mkdir -p "$TARGET_DIR"

cp -R "$PLUGIN_DIR/CSXS" "$TARGET_DIR/"
cp -R "$PLUGIN_DIR/css" "$TARGET_DIR/"
cp -R "$PLUGIN_DIR/js" "$TARGET_DIR/"
cp -R "$PLUGIN_DIR/jsx" "$TARGET_DIR/"
cp "$PLUGIN_DIR/index.html" "$TARGET_DIR/"
if [ -f "$PLUGIN_DIR/README.md" ]; then
    cp "$PLUGIN_DIR/README.md" "$TARGET_DIR/"
fi

# Enable PlayerDebugMode on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "> Enabling Adobe CEP PlayerDebugMode..."
    for v in {9..16}; do
        defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1 2>/dev/null || true
    done
fi

echo ""
echo "SUCCESS! StemTool Premiere Pro Plugin is installed."
echo ""
echo "How to use:"
echo "1. Restart Adobe Premiere Pro."
echo "2. Open any sequence with an audio track."
echo "3. Go to top menu: Window > Extensions > StemTool Audio Splitter"
echo "4. Select an audio clip on your timeline and click 'Split Selected Audio'!"
echo "=============================================="

