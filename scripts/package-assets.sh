#!/usr/bin/env bash
set -euo pipefail

echo "=== Packaging APK assets ==="

PROJECT_DIR="$(pwd)"
ASSETS_DIR="$PROJECT_DIR/android/app/src/main/assets"

# Clean and recreate assets directory
rm -rf "$ASSETS_DIR"
mkdir -p "$ASSETS_DIR"

# 1. Package rootfs with webchat4 code
echo "Adding webchat4 code to rootfs..."
WEBCHAT4_DEST="$PROJECT_DIR/rootfs/home/webchat4"

if [ ! -d "$PROJECT_DIR/rootfs" ]; then
    echo "ERROR: rootfs directory not found! Run prepare-rootfs.sh first."
    exit 1
fi

mkdir -p "$WEBCHAT4_DEST"

# Copy server code
if [ -d "$PROJECT_DIR/server" ]; then
    cp -r "$PROJECT_DIR/server" "$WEBCHAT4_DEST/server"
    echo "  Copied server/ ($(du -sh $PROJECT_DIR/server | cut -f1))"
fi

# Copy dist (built frontend)
if [ -d "$PROJECT_DIR/dist" ]; then
    cp -r "$PROJECT_DIR/dist" "$WEBCHAT4_DEST/dist"
    echo "  Copied dist/"
fi

# Copy static assets
if [ -d "$PROJECT_DIR/assets" ]; then
    cp -r "$PROJECT_DIR/assets" "$WEBCHAT4_DEST/assets"
    echo "  Copied assets/"
fi

# Copy root package.json for reference
if [ -f "$PROJECT_DIR/package.json" ]; then
    cp "$PROJECT_DIR/package.json" "$WEBCHAT4_DEST/"
fi

# Repackage rootfs
echo "Creating rootfs.tar.gz..."
cd "$PROJECT_DIR"
tar -czf "$ASSETS_DIR/rootfs.tar.gz" \
    --owner=0 --group=0 \
    rootfs/

# 2. Copy proot binary
echo "Packaging proot..."
if [ -f "$PROJECT_DIR/assets-tmp/proot-arm64" ]; then
    cp "$PROJECT_DIR/assets-tmp/proot-arm64" "$ASSETS_DIR/proot-arm64"
    chmod +x "$ASSETS_DIR/proot-arm64"
    echo "  proot-arm64: $(du -sh $ASSETS_DIR/proot-arm64 | cut -f1)"
else
    echo "ERROR: proot-arm64 not found! Download it first."
    exit 1
fi

echo ""
echo "=== Final Assets ==="
ls -lh "$ASSETS_DIR/"
echo ""
echo "=== Packaging complete! ==="
