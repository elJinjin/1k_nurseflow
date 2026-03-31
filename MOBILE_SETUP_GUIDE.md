# NurseFlow Mobile App - Setup Guide

## 📱 What's Been Created

Your NurseFlow mobile app has been successfully scaffolded! Here's what you now have:

### Project Structure
```
mobile/
├── app/                              # All screen components
│   ├── _layout.tsx                  # Navigation setup
│   ├── index.tsx                    # Splash screen
│   ├── dashboard.tsx                # Main dashboard
│   ├── scanner.tsx                  # QR code scanner
│   ├── search.tsx                   # Patient search
│   ├── vitals.tsx                   # Vitals entry form
│   ├── medications.tsx              # Medication management
│   └── patient/[id].tsx             # Patient details (dynamic)
├── src/
│   ├── components/UI.tsx            # Reusable UI components
│   ├── lib/firebase.ts              # Firebase config (needs credentials)
│   ├── lib/store.ts                 # Zustand state management
│   └── types/index.ts               # TypeScript types
├── package.json                     # Dependencies
├── app.json                         # Expo configuration
├── eas.json                         # Production build config
└── README.md                        # Full documentation
```

### Key Features Included

✅ **Navigation**: Expo Router with typed navigation  
✅ **State Management**: Zustand for global app state  
✅ **Database**: Firebase Firestore integration  
✅ **QR Scanning**: Built-in QR code scanner for patient lookup  
✅ **Responsive UI**: Mobile-optimized components  
✅ **TypeScript**: Full TypeScript support for type safety  
✅ **iOS & Android**: Cross-platform support  

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd mobile
npm install
```

### 2. Configure Firebase
**Important**: Update `src/lib/firebase.ts` with your Firebase credentials:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Get these from: Firebase Console → Project Settings → General tab

### 3. Start Development
```bash
npm start
```

Then:
- Press `i` to run on iOS Simulator
- Press `a` to run on Android Emulator
- Press `w` to run in web browser
- Scan QR code with Expo Go app on your phone

## 📋 Firestore Rules Setup

Add these rules to your Firestore to allow the app to read patient data:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /patients/{patientId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      match /medicationLogs/{logId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
      }
      match /scheduledMedications/{medId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
      }
    }
  }
}
```

## 🔧 Important Configuration Steps

### Update Firebase Config
Edit `src/lib/firebase.ts` and add your real Firebase credentials.

### Enable Camera Permissions (iOS)
The app automatically requests camera permissions for QR scanning.

### Create Sample Data
Make sure you have patient documents in Firestore with this structure:

```json
{
  "fullName": "John Doe",
  "dateOfBirth": "1980-01-15",
  "gender": "Male",
  "bloodType": "O+",
  "allergies": ["Penicillin"],
  "chronicConditions": ["Diabetes"],
  "currentMedications": ["Metformin"],
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "phone": "+1-555-0100"
  },
  "lastVitals": {
    "bloodPressure": "120/80",
    "heartRate": 72,
    "temperature": 36.5,
    "spo2": 98,
    "recordedAt": "timestamp"
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## 📱 Testing the App

### On Your Phone
1. Download Expo Go from App Store or Play Store
2. Run `npm start` on your computer
3. Scan the QR code with Expo Go
4. App loads on your phone in seconds!

### QR Code Testing
For testing QR scanning, generate a QR code containing just the patient ID (e.g., "patient123").

## 🏗️ Building for Production

### iOS Production Build
```bash
npm run build:ios
```

### Android Production Build
```bash
npm run build:android
```

This uses Expo Application Services (EAS). You'll need:
- EAS account (free tier available)
- Apple Developer account (for iOS)
- Google Play account (for Android)

## 🐛 Troubleshooting

### "Cannot find module firebase/auth"
- Run `npm install` in the mobile directory
- Delete node_modules and `package-lock.json`, then run `npm install` again

### Camera not working
- Ensure permissions are granted in device settings
- For iOS Simulator: Simulator → Features → Camera (set to External)
- For Android Emulator: Ensure webcam access is allowed

### QR Scanner not scanning
- Make sure QR code is well-lit and clearly visible
- Try the sample code in the scanner screen first
- Check console for any error messages with `npm start` logs

### Firebase errors
- Verify Firebase credentials in `src/lib/firebase.ts`
- Check Firestore database is created in your Firebase project
- Ensure firestore.rules are correctly configured

## 📚 Next Steps

1. **Add Authentication**: Implement Firebase Auth if needed
2. **Add More Features**: Medication administration tracking, vital alerts
3. **Customize Styling**: Adjust colors and layouts in component files
4. **Add Plugins**: Install additional Expo plugins as needed
5. **Testing**: Write unit and integration tests

## 🔗 Useful Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Expo Router Guide](https://expo.github.io/router/)
- [Firebase for React Native](https://rnfirebase.io)
- [TypeScript React Native](https://reactnative.dev/docs/typescript)

## 📞 Support

For detailed information, see `README.md` in the mobile directory.

---

Happy coding! 🎉
