#!/usr/bin/env bash
set -euo pipefail

echo "=== Packaging APK assets ==="

PROJECT_DIR="$(pwd)"
ASSETS_DIR="$PROJECT_DIR/android/app/src/main/assets"
TMP_DIR="$PROJECT_DIR/assets-tmp"
rm -rf "$ASSETS_DIR" "$TMP_DIR"
mkdir -p "$ASSETS_DIR" "$TMP_DIR/lib"

# ── 下载 Termux Node.js 和依赖库 ──
echo "Downloading Termux nodejs + libs..."
TERMUX_POOL="https://packages.termux.dev/apt/termux-main/pool/main"

download_deb() {
    local name=$1 url=$2
    local file="/tmp/pkg_${name}.deb"
    curl -fL -o "$file" "$url" 2>/dev/null || return 1
    dpkg-deb -x "$file" "/tmp/extract_${name}" 2>/dev/null || return 1
    # 复制 .so 文件到统一目录
    find "/tmp/extract_${name}" -name "*.so*" -exec cp -L {} "$TMP_DIR/lib/" \; 2>/dev/null || true
    rm -f "$file"
    echo "  ✅ $name"
}

# Node.js 本体
download_deb "nodejs" "$TERMUX_POOL/n/nodejs/nodejs_26.3.0_aarch64.deb" || {
    echo "ERROR: nodejs download failed"; exit 1
}
cp /tmp/extract_nodejs/data/data/com.termux/files/usr/bin/node "$TMP_DIR/node-arm64"
chmod +x "$TMP_DIR/node-arm64"

# 依赖库
download_deb "c-ares" "$TERMUX_POOL/c/c-ares/c-ares_1.34.6_aarch64.deb" || true
download_deb "openssl" "$TERMUX_POOL/o/openssl/openssl_1%3A3.6.2_aarch64.deb" || true
download_deb "zlib" "$TERMUX_POOL/z/zlib/zlib_1.3.2_aarch64.deb" || true
download_deb "sqlite" "$TERMUX_POOL/s/sqlite/sqlite_3.53.2_aarch64.deb" || true

# libc++ 和 icu-libs 可能在不同路径，尝试多种可能
download_deb "libcxx" "https://packages.termux.dev/apt/termux-main/pool/main/l/libc%2B%2B/libc%2B%2B_27c_aarch64.deb" 2>/dev/null || \
download_deb "libcxx" "https://packages.termux.dev/apt/termux-main/pool/main/libc%2B%2B/libc%2B%2B_27c_aarch64.deb" 2>/dev/null || \
echo "  ⚠️ libc++ not found from repo, will use system lib"

download_deb "icu" "https://packages.termux.dev/apt/termux-main/pool/main/i/icu/icu-libs_78.1_aarch64.deb" 2>/dev/null || \
download_deb "icu" "https://packages.termux.dev/apt/termux-main/pool/main/i/icu/icu-libs_78.1_arm64.deb" 2>/dev/null || \
echo "  ⚠️ icu-libs not found from repo"

# 清理临时提取目录
rm -rf /tmp/extract_*

echo ""
echo "=== Downloaded binaries ==="
ls -lh "$TMP_DIR/node-arm64"
echo "=== Downloaded libraries ==="
ls -lh "$TMP_DIR/lib/" 2>/dev/null || echo "(no libs)"

# ── 打包服务端代码 ──
echo ""
echo "Packaging server code..."
cd "$PROJECT_DIR"
python3 -c "
import zipfile, os
zf = zipfile.ZipFile('$ASSETS_DIR/server.zip', 'w', zipfile.ZIP_DEFLATED)
for d in ['server', 'dist']:
    if os.path.isdir(d):
        for root, dirs, files in os.walk(d):
            for f in files:
                fp = os.path.join(root, f)
                zf.write(fp, os.path.relpath(fp, '.'))
            for sd in dirs[:]:
                fp = os.path.join(root, sd)
                zf.write(fp, os.path.relpath(fp, '.') + '/')
zf.close()
print('server.zip created')
"

# ── 复制到 assets ──
cp "$TMP_DIR/node-arm64" "$ASSETS_DIR/node-arm64"
chmod +x "$ASSETS_DIR/node-arm64"
if [ -n "$(ls -A $TMP_DIR/lib/ 2>/dev/null)" ]; then
    cp -r "$TMP_DIR/lib" "$ASSETS_DIR/lib"
fi

echo ""
echo "=== APK Assets ==="
ls -lh "$ASSETS_DIR/"
echo ""
echo "=== Packaging complete! ==="
