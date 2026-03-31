# NurseFlow Android APK Conversion Guide

## Overview
Convert your React web app to Android APK using Capacitor + Android Studio

---

## Phase 1: Setup Development Environment

### 1.1 Install Java Development Kit (JDK)
```powershell
choco install openjdk -y
```
Verify: `java -version`

### 1.2 Install Android Studio
```powershell
choco install androidstudio -y
```
- Run Android Studio and complete setup
- Install Android SDK (API 30+)
- Create an Android Virtual Device (AVD) for testing

### 1.3 Install Node.js (if not present)
```powershell
choco install nodejs -y
npm --version  # Verify installation
```

---

## Phase 2: Convert Web App to Capacitor Project

### 2.1 Build your web app first
```bash
npm install
npm run build
```

### 2.2 Initialize Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```
When prompted:
- **App name:** NurseFlow
- **Package ID:** com.nurseflow.app
- **Web dir:** dist

### 2.3 Add Android platform
```bash
npm install @capacitor/android
npx cap add android
```

### 2.4 Install required Capacitor plugins
```bash
# For QR scanning
npm install @capacitor-community/barcode-scanner

# For camera (if needed)
npm install @capacitor/camera

# For storage
npm install @capacitor/storage

# For authentication (Firebase)
npm install @capacitor/browser
```

---

## Phase 3: Update Your React App for Mobile

### 3.1 Create mobile-specific environment file
Create `src/mobile-config.ts`:
```typescript
export const isMobile = () => {
  return window.Capacitor !== undefined && window.Capacitor.isPluginAvailable('App');
};

export const initializeMobile = async () => {
  if (!isMobile()) return;
  
  // Mobile-specific initialization
  document.addEventListener('DOMContentLoaded', () => {
    // Handle viewport settings
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    }
  });
};
```

### 3.2 Update index.html
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#1f2937">
```

### 3.3 Handle Firebase for mobile
In `src/firebase.ts`, add mobile initialization:
```typescript
// After firebase config
import { initializeMobile } from './mobile-config';

// Initialize mobile environment
initializeMobile();
```

### 3.4 Update QR Scanner for mobile
Wrap html5-qrcode usage with platform detection:
```typescript
import { isMobile } from './mobile-config';

// Use different QR implementation for mobile vs web
if (isMobile()) {
  // Use @capacitor-community/barcode-scanner
} else {
  // Use html5-qrcode
}
```

---

## Phase 4: Build APK in Android Studio

### 4.1 Sync Capacitor files
```bash
npm run build
npx cap sync
```

### 4.2 Copy web assets to Android
```bash
npx cap copy
```

### 4.3 Open in Android Studio
```bash
npx cap open android
```

### 4.4 Build APK requirements
In Android Studio:
1. Go to **Build > Generate Signed Bundle/APK**
2. Select **APK**
3. Create a keystore (or use existing)
   - Keystore file location: `C:\Users\Admin\.android\my-app.jks`
   - Alias: `my-app-key`
4. Select **Release** build variant
5. Click Finish

### 4.5 Generate Debug APK (for testing)
```bash
cd android
./gradlew assembleDebug
# APK located at: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Phase 5: Testing on Device/Emulator

### 5.1 Using Android Virtual Device (AVD)
- Start emulator from Android Studio
- Capacitor will auto-detect and deploy

### 5.2 Using Physical Phone
- Enable USB Debugging in Developer Options
- Connect phone via USB
- Run: `adb devices` (verify connection)
- Deploy from Android Studio

### 5.3 Test commands
```bash
# Run on emulator/device
npx cap run android

# View logs
npx cap open android  # Then run from Android Studio
```

---

## Phase 6: Optimization for Mobile

### 6.1 Update capacitor.config.ts
```json
{
  "appId": "com.nurseflow.app",
  "appName": "NurseFlow",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 3000,
      "backgroundColor": "#1f2937"
    }
  }
}
```

### 6.2 Set app permissions (AndroidManifest.xml)
The app needs:
- `INTERNET` - Firebase connectivity
- `CAMERA` - QR scanning
- `WRITE_EXTERNAL_STORAGE` - File operations

Capacitor handles this automatically, but verify in `android/app/src/main/AndroidManifest.xml`

---

## Phase 7: Troubleshooting

### Issue: Blank screen on app launch
**Solution:** Check Android Studio console logs. Ensure web assets are in `www/` directory.

### Issue: Firebase not connecting
**Solution:** 
- Verify `GEMINI_API_KEY` is set in environment
- Check FirebaseAuth.js initialization
- Ensure `firebase-applet-config.json` is included in build

### Issue: Camera/QR scanner not working
**Solution:** 
- Grant permissions in Android settings
- Check plugin installation: `npm ls @capacitor-community/barcode-scanner`

---

## Quick Start Commands
```bash
# Full build process
npm install
npm run build
npx cap sync
npx cap run android

# Or open Android Studio for more control
npx cap open android
```

---

## References
- [Capacitor Docs](https://capacitorjs.com)
- [Android Studio Setup](https://developer.android.com/studio)
- [Firebase on Android](https://firebase.google.com/docs/android/setup)

