# Dabels Passkey & Workspace Sync Guard - Safari iOS Web Extension

This Safari Web Extension brings hardware-bound WebAuthn passkey attestation and real-time Google Workspace sync conflict resolution to Safari on iOS (iPhone & iPad) and macOS.

## Folder Structure
- `manifest.json`: WebExtensions Manifest V3 specification tailored for Apple Safari on iOS 15+.
- `background.js`: Service worker handling background alarms, badge text, and sync monitoring.
- `content.js`: Content script that injects non-intrusive status pills into Google Workspace and Dabels Gateway tabs.
- `popup.html` & `popup.js`: Native iOS glassmorphic popup for real-time status and Gemini-powered conflict resolution.

## How to Convert and Run on iOS Safari

Apple provides the native `safari-web-extension-converter` command-line tool bundled inside Xcode:

### Step 1: Run the Apple Converter
Open Terminal on your Mac and navigate to this folder:
```bash
xcrun safari-web-extension-converter public/safari-extension \
  --app-name "DabelsPasskeyGuard" \
  --bundle-identifier "com.dabelstech.safari.syncguard" \
  --ios-only
```

### Step 2: Open in Xcode
Xcode will generate an iOS App project containing the Safari Extension target (`DabelsPasskeyGuard Extension`).
- Set your Development Team in Signing & Capabilities.
- Select your target iPhone / iPad (or iOS Simulator).
- Press **Cmd + R** to Build & Run.

### Step 3: Enable in iOS Safari Settings
On your iPhone / iPad:
1. Open **Settings** > **Apps** > **Safari** > **Extensions**.
2. Tap **Dabels Passkey & Workspace Sync Guard**.
3. Toggle the switch to **On**.
4. Set Permissions for Google Workspace domains (`drive.google.com`, `mail.google.com`, etc.) to **Always Allow**.
5. In Safari, tap the puzzle piece or extension icon in the address bar to open the popup!
