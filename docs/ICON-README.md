# App Icon Instructions

To complete the app icon setup, you'll need to create icon files in the following formats:

## Required Icon Files

### For macOS (.icns)
1. Create a folder called `build` in the project root
2. Create an icon file called `icon.icns` with these resolutions:
   - 16x16
   - 32x32
   - 64x64
   - 128x128
   - 256x256
   - 512x512
   - 1024x1024

### For Windows (.ico)
1. In the same `build` folder
2. Create an icon file called `icon.ico` with these resolutions:
   - 16x16
   - 32x32
   - 48x48
   - 256x256

## Icon Design Recommendations

For an Audio Transcription app icon, consider:
- **Simple waveform symbol** - Clean, modern audio visualization
- **Microphone silhouette** - Classic but recognizable
- **Quote/text bubble with audio waves** - Combines transcription + audio
- **Color scheme**: Use #007AFF (Apple blue) as primary color with white/gray accents

## Tools to Create Icons

**macOS:**
- Use Icon Composer (part of Xcode)
- Or use `iconutil` command-line tool
- Or online tools like https://icon converter.com

**Windows:**
- GIMP (free) with ICO plugin
- Online converters

## Quick Setup with existing PNG

If you have a 1024x1024 PNG icon:

```bash
# Install electron-icon-builder
npm install --save-dev electron-icon-builder

# Generate icons
npx electron-icon-builder --input=./icon.png --output=./build --flatten
```

Then the icons will automatically be used when building the app with `npm run build:mac` or `npm run build:win`.
