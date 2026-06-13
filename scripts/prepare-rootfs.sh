#!/usr/bin/env bash
set -euo pipefail

echo "=== Preparing Alpine ARM64 rootfs with Node.js ==="

ROOTFS_DIR="rootfs"
APK_CACHE="/tmp/apk-cache"
mkdir -p "$APK_CACHE"

# Download static apk-tools for ARM64
# Fetch latest apk-tools-static version dynamically
APK_URL=$(curl -s "https://dl-cdn.alpinelinux.org/alpine/latest-stable/main/aarch64/" | grep -o 'apk-tools-static-[^"]*\.apk' | tail -1)
APK_URL="https://dl-cdn.alpinelinux.org/alpine/latest-stable/main/aarch64/${APK_URL}"
echo "Using apk-tools-static: $APK_URL"
APK_FILE="/tmp/apk-tools-static.apk"

if [ ! -f "$APK_FILE" ]; then
    echo "Downloading apk-tools-static..."
    curl -fL -o "$APK_FILE" "$APK_URL" || { echo "Download failed"; exit 1; }
fi

# Extract apk.static
echo "Extracting apk-tools..."
mkdir -p /tmp/apk-extract
tar -xzf "$APK_FILE" -C /tmp/apk-extract

APK_STATIC=$(find /tmp/apk-extract -name "apk.static" -type f | head -1)
if [ -z "$APK_STATIC" ]; then
    echo "apk binary not found!"
    ls -la /tmp/apk-extract/
    exit 1
fi
echo "Found apk: $APK_STATIC"
$APK_STATIC --version

# Create rootfs
rm -rf "$ROOTFS_DIR"
mkdir -p "$ROOTFS_DIR"

echo "Installing Alpine base + Node.js..."
$APK_STATIC --arch aarch64 \
    -X "https://dl-cdn.alpinelinux.org/alpine/latest-stable/main" \
    -U --allow-untrusted --root "$ROOTFS_DIR" --initdb \
    add alpine-base nodejs npm

# Verify
echo "Node.js: $(ls -lh $ROOTFS_DIR/usr/bin/node 2>/dev/null || echo 'NOT FOUND')"
echo "npm: $(ls -lh $ROOTFS_DIR/usr/bin/npm 2>/dev/null || echo 'NOT FOUND')"

# Create directories for webchat4
mkdir -p "$ROOTFS_DIR/home/webchat4"

# Basic config
echo "127.0.0.1 localhost" > "$ROOTFS_DIR/etc/hosts"

# Clean up
rm -rf "$ROOTFS_DIR/var/cache/apk/*"
rm -rf "$ROOTFS_DIR/var/log/*"

echo "Rootfs size: $(du -sh $ROOTFS_DIR | cut -f1)"
echo "=== Rootfs ready ==="
