#!/usr/bin/env bash
set -euo pipefail

echo "=== Packaging APK assets ==="

PROJECT_DIR="$(pwd)"
ASSETS_DIR="$PROJECT_DIR/android/app/src/main/assets"
rm -rf "$ASSETS_DIR"
mkdir -p "$ASSETS_DIR"

# 打包前端构建产物（Vite 构建的 dist/ 目录）
echo "Packaging frontend (www.zip)..."
cd "$PROJECT_DIR"
if [ ! -d "dist" ]; then
    echo "ERROR: dist/ not found! Run npm run build first."
    exit 1
fi

python3 -c "
import zipfile, os
zf = zipfile.ZipFile('$ASSETS_DIR/www.zip', 'w', zipfile.ZIP_DEFLATED)
for root, dirs, files in os.walk('dist/'):
    for f in files:
        fp = os.path.join(root, f)
        arcname = os.path.relpath(fp, 'dist/')
        zf.write(fp, arcname)
    for d in dirs[:]:
        fp = os.path.join(root, d)
        arcname = os.path.relpath(fp, 'dist/') + '/'
        zf.write(fp, arcname)
zf.close()
print('www.zip created')
"
echo "  www.zip: $(du -sh $ASSETS_DIR/www.zip | cut -f1)"

echo ""
echo "=== APK Assets ==="
ls -lh "$ASSETS_DIR/"
echo ""
echo "=== Packaging complete! ==="
