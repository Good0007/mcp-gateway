#!/bin/bash
set -e

# Ensure build directory exists
mkdir -p build
mkdir -p build/icon.iconset

SVG_PATH="../web/public/logo.svg"

echo "Generating icons from $SVG_PATH..."

# Generate master PNG
rsvg-convert -w 1024 -h 1024 -o build/icon.png "$SVG_PATH"

# Generate iconset for macOS
rsvg-convert -w 16 -h 16 -o build/icon.iconset/icon_16x16.png "$SVG_PATH"
rsvg-convert -w 32 -h 32 -o build/icon.iconset/icon_16x16@2x.png "$SVG_PATH"
rsvg-convert -w 32 -h 32 -o build/icon.iconset/icon_32x32.png "$SVG_PATH"
rsvg-convert -w 64 -h 64 -o build/icon.iconset/icon_32x32@2x.png "$SVG_PATH"
rsvg-convert -w 128 -h 128 -o build/icon.iconset/icon_128x128.png "$SVG_PATH"
rsvg-convert -w 256 -h 256 -o build/icon.iconset/icon_128x128@2x.png "$SVG_PATH"
rsvg-convert -w 256 -h 256 -o build/icon.iconset/icon_256x256.png "$SVG_PATH"
rsvg-convert -w 512 -h 512 -o build/icon.iconset/icon_256x256@2x.png "$SVG_PATH"
rsvg-convert -w 512 -h 512 -o build/icon.iconset/icon_512x512.png "$SVG_PATH"
rsvg-convert -w 1024 -h 1024 -o build/icon.iconset/icon_512x512@2x.png "$SVG_PATH"

# Create .icns
if command -v iconutil >/dev/null; then
    iconutil -c icns build/icon.iconset -o build/icon.icns
    echo "Generated build/icon.icns"
else
    echo "iconutil not found, skipping .icns generation"
fi

# Create .ico for Windows (requires ImageMagick)
if command -v convert >/dev/null; then
    convert build/icon.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
    echo "Generated build/icon.ico"
else
    echo "convert (ImageMagick) not found, skipping .ico generation"
fi

# Cleanup
rm -rf build/icon.iconset
rm -f scripts/generate-icons.js # Clean up the failed JS script

echo "Done!"
