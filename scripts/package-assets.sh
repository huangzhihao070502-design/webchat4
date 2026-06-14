#!/usr/bin/env bash
set -euo pipefail

echo "=== Packaging APK assets ==="

PROJECT_DIR="$(pwd)"
ASSETS_DIR="$PROJECT_DIR/android/app/src/main/assets"

# Clean and recreate assets directory
rm -rf "$ASSETS_DIR"
mkdir -p "$ASSETS_DIR"

# 1. Copy Node.js binary
echo "Packaging Node.js..."
if [ -f "$PROJECT_DIR/assets-tmp/node-arm64" ]; then
    cp "$PROJECT_DIR/assets-tmp/node-arm64" "$ASSETS_DIR/node-arm64"
    chmod +x "$ASSETS_DIR/node-arm64"
    echo "  node-arm64: $(du -sh $ASSETS_DIR/node-arm64 | cut -f1)"
else
    echo "ERROR: node-arm64 not found in assets-tmp/!"
    exit 1
fi

# 2. Package server code (压缩为 ZIP，在手机上解压)
echo "Packaging server code..."
cd "$PROJECT_DIR"
python3 -c "
import zipfile, os
zf = zipfile.ZipFile('$ASSETS_DIR/server.zip', 'w', zipfile.ZIP_DEFLATED)

# server 目录
for root, dirs, files in os.walk('server/'):
    for f in files:
        fp = os.path.join(root, f)
        arcname = os.path.relpath(fp, '.')
        zf.write(fp, arcname)
    for d in dirs[:]:
        fp = os.path.join(root, d)
        arcname = os.path.relpath(fp, '.') + '/'
        zf.write(fp, arcname)

# dist 目录（前端构建产物）
if os.path.isdir('dist/'):
    for root, dirs, files in os.walk('dist/'):
        for f in files:
            fp = os.path.join(root, f)
            arcname = os.path.relpath(fp, '.')
            zf.write(fp, arcname)
        for d in dirs[:]:
            fp = os.path.join(root, d)
            arcname = os.path.relpath(fp, '.') + '/'
            zf.write(fp, arcname)
zf.close()
print('server.zip created')
"
echo "  server.zip: $(du -sh $ASSETS_DIR/server.zip | cut -f1)"

echo ""
echo "=== Final Assets ==="
ls -lh "$ASSETS_DIR/"
echo ""
echo "=== Packaging complete! ==="
