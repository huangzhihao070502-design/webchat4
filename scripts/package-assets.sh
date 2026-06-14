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

# Repackage rootfs as ZIP (Java原生支持，无需外部命令)
echo "Creating rootfs.zip..."
cd "$PROJECT_DIR"
# First remove broken symlinks (they cause zipfile errors)
find rootfs/ -type l ! -exec test -e {} \; -delete 2>/dev/null || true
python3 -c "
import zipfile, os
zf = zipfile.ZipFile('$ASSETS_DIR/rootfs.zip', 'w', zipfile.ZIP_DEFLATED)
for root, dirs, files in os.walk('rootfs/'):
    for f in files:
        fp = os.path.join(root, f)
        arcname = os.path.relpath(fp, '.')
        zf.write(fp, arcname)
    for d in dirs[:]:
        fp = os.path.join(root, d)
        arcname = os.path.relpath(fp, '.') + '/'
        zf.write(fp, arcname)
zf.close()
print('rootfs.zip created')
"
echo "  rootfs.zip: $(du -sh $ASSETS_DIR/rootfs.zip | cut -f1)"

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
