# NurseFlow Android APK - Next Steps

## ✅ Capacitor Setup Complete!

Your project is now ready for Android development. Here's what was set up:

### Installed Components:
- ✅ Capacitor Core & CLI
- ✅ Android Platform
- ✅ Required Plugins:
  - @capacitor/app (for back button, app lifecycle)
  - @capacitor/browser (for OAuth authentication)
  - @capacitor/camera (for QR code scanning via device camera)
  - @capacitor/storage (for local data persistence)

### Project Structure:
```
1k_nurseflow/
├── android/              (← Android native project)
├── dist/                 (← Web app build)
├── src/
│   ├── mobile-config.ts  (← Mobile utilities)
│   ├── App.tsx
│   ├── firebase.ts
│   └── ...
├── capacitor.config.json (← Capacitor configuration)
└── package.json
```

---

## 📋 Required: Install Android Studio & Tools

### Step 1: Install Java JDK (if not done)
```powershell
choco install openjdk -y
java -version
```

### Step 2: Install Android Studio
```powershell
choco install androidstudio -y
```

After installation:
1. Open **Android Studio**
2. Go to **Tools > SDK Manager**
3. Install:
   - **Android SDK Platform 30+** (API level 30 or higher)
   - **Android SDK Build-Tools** (latest)
   - **Google Play Services**

### Step 3: Set Android SDK Path (Windows)
Add to system environment variables:
- Variable name: `ANDROID_SDK_ROOT`
- Value: `C:\Users\Admin\AppData\Local\Android\Sdk`

---

## 🔧 Open Project in Android Studio

### Option A: Use Capacitor CLI (Recommended)
```powershell
cd "c:\Users\Admin\Documents\Business\NurseFlow_1k\1k_nurseflow"
npx cap open android
```
This opens Android Studio with your project pre-configured.

### Option B: Manual
1. Open Android Studio
2. **File > Open**
3. Navigate to: `c:\Users\Admin\Documents\Business\NurseFlow_1k\1k_nurseflow\android`
4. Click **OK**

---

## 🚀 Build & Test Options

### Option 1: Debug APK (Testing)
```powershell
cd "c:\Users\Admin\Documents\Business\NurseFlow_1k\1k_nurseflow\android"
./gradlew assembleDebug
# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 2: Run on Android Emulator (Recommended for Testing)
1. In Android Studio, **Tools > Device Manager**
2. Create a new Virtual Device (or use existing)
3. Start the emulator
4. Back in terminal:
```powershell
cd "c:\Users\Admin\Documents\Business\NurseFlow_1k\1k_nurseflow"
npx cap run android
```

### Option 3: Run on Physical Phone
1. Enable **USB Debugging** on your phone (Settings > Developer Options)
2. Connect phone via USB
3. In terminal:
```powershell
adb devices  # Verify phone is connected
cd "c:\Users\Admin\Documents\Business\NurseFlow_1k\1k_nurseflow"
npx cap run android
```

### Option 4: Release APK (Play Store Submission)
In Android Studio:
1. **Build > Generate Signed Bundle/APK**
2. Select **APK**
3. Create or select keystore:
   - Keystore path: `C:\Users\Admin\.android\release-key.jks`
   - Key alias: `release`
   - Store password: (create secure password)
4. Select **Release** build variant
5. Click **Finish**

---

## 🔐 Firebase Configuration for Android

Your `firebase-applet-config.json` is already included. For production, ensure:

1. Add your app to Firebase Console:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - **Project Settings > Your Apps**
   - Add Android app with package ID: `com.nurseflow.app`
   - Download `google-services.json`

2. Place `google-services.json` in:
   ```
   android/app/google-services.json
   ```

3. Sync Capacitor:
   ```powershell
   npx cap sync
   ```

---

## 📱 App Permissions

Your app needs these permissions (auto-configured by Capacitor):
- `INTERNET` - For Firebase & API calls
- `CAMERA` - For QR code scanning
- `WRITE_EXTERNAL_STORAGE` - For file access (if needed)

These are in `android/app/src/main/AndroidManifest.xml`

---

## 🐛 Troubleshooting

### Problem: Blank white screen on app launch
**Solution:**
- Check Android Studio logcat for errors
- Verify web assets exist in `android/app/src/main/assets/public/`
- Run: `npx cap sync` again

### Problem: Firebase not connecting
**Solution:**
- Ensure `GEMINI_API_KEY` environment variable is set
- Add `google-services.json` to `android/app/`
- Check Firebase rules allow read/write

### Problem: Camera/QR scanner not working
**Solution:**
- Grant permission in Android settings
- Test with `npx cap run android --verbose`
- Check that @capacitor/camera is installed: `npm ls @capacitor/camera`

### Problem: Build fails in Android Studio
**Solution:**
- Clean build: **Build > Clean Project**
- Rebuild: **Build > Rebuild Project**
- Check build.gradle for gradle version compatibility
- Run: `cd android && ./gradlew clean`

---

## 📝 Quick Commands Reference

```powershell
# Build web app
npm run build

# Sync to Android
npx cap sync

# Run on emulator/phone
npx cap run android

# Open in Android Studio
npx cap open android

# Debug build
cd android && ./gradlew assembleDebug

# Release build
cd android && ./gradlew assembleRelease

# View logs
adb logcat | findstr "nurseflow"
```

---

## 🎯 Next Steps

1. ✅ Install Java & Android Studio (using choco commands above)
2. ✅ Set `ANDROID_SDK_ROOT` environment variable
3. ⏭️ Run: `npx cap open android`
4. ⏭️ Create Android Virtual Device (AVD) in Android Studio
5. ⏭️ Run: `npx cap run android` to test on emulator
6. ⏭️ Build debug APK: `cd android && ./gradlew assembleDebug`
7. ⏭️ Test on device or submit to Play Store

---

## 📚 Resources
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Android Studio Setup](https://developer.android.com/studio/install)
- [Firebase Android Setup](https://firebase.google.com/docs/android/setup)
- [Gradle Build System](https://developer.android.com/build)
