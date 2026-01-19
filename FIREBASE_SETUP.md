# Firebase Setup Guide

This app uses React Native Firebase for full native Firebase support including Crashlytics.

## Prerequisites

You need Firebase configuration files for your platform(s):

### Android
- `android/app/google-services.json` (download from Firebase Console)

### iOS
- `ios/DailyDeals/GoogleService-Info.plist` (download from Firebase Console)

## Setup Instructions

### 1. Download Configuration Files

#### For Android:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **offercatalouge**
3. Go to **Project Settings** → **Your apps**
4. Find your Android app (App ID: `1:384711933806:android:519b13197c677ef8bccb7f`)
5. Click **Download google-services.json**
6. Place the file at: `android/app/google-services.json`

#### For iOS:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **offercatalouge**
3. Go to **Project Settings** → **Your apps**
4. Find your iOS app
5. Click **Download GoogleService-Info.plist**
6. Place the file at: `ios/DailyDeals/GoogleService-Info.plist`

### 2. Rebuild Native Projects

After adding the configuration files, rebuild the native projects:

```bash
# Clean and regenerate native projects
npx expo prebuild --clean

# For Android
npx expo run:android

# For iOS
npx expo run:ios
```

### 3. Verify Setup

#### Test Crashlytics

Add this code temporarily to verify Crashlytics is working:

```typescript
import crashlytics from '@react-native-firebase/crashlytics';

// Force a test crash
crashlytics().crash();
```

**Important:** Remove the test crash before releasing!

Check Firebase Console → Crashlytics after 5 minutes to see the test crash report.

#### Test Analytics

Analytics events are logged automatically. Check Firebase Console → Analytics to see events.

## Configuration Details

### Firebase Project Info
- **Project ID:** offercatalouge
- **Auth Domain:** offercatalouge.firebaseapp.com
- **Storage Bucket:** offercatalouge.firebasestorage.app
- **Messaging Sender ID:** 384711933806
- **App ID (Android):** 1:384711933806:android:519b13197c677ef8bccb7f
- **Measurement ID:** G-CZDM132WC3

### Google OAuth Client IDs
- **Android Client ID:** 384711933806-9acl1b63tju3sf6vn6c8n17g76tib5bj.apps.googleusercontent.com
- **Web Client ID:** 384711933806-mj5gddiaesno7p84i04aprl15uo0at8d.apps.googleusercontent.com

## Important Notes

⚠️ **DO NOT commit the actual Firebase configuration files to Git!**

The files `google-services.json` and `GoogleService-Info.plist` contain sensitive API keys and should be added locally only. They are listed in `.gitignore`.

## Troubleshooting

### "No Firebase App has been created"
- Make sure `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) is in the correct location
- Run `npx expo prebuild --clean` to regenerate native projects

### Crashlytics not reporting
- Wait 5-10 minutes after a crash for it to appear in Firebase Console
- Make sure you're running a release build, not debug
- Check that Crashlytics is enabled in Firebase Console

### Build fails with "google-services.json not found"
- Make sure you've downloaded and placed the file in `android/app/google-services.json`
- The placeholder file should be replaced with the real one

## Development vs Production

For production builds:
1. Use the production Firebase project configuration
2. Enable ProGuard/R8 (Android) for code obfuscation
3. Test Crashlytics thoroughly before release
4. Review Firebase Console regularly for crashes and analytics

## Support

For Firebase-specific issues, refer to:
- [React Native Firebase Documentation](https://rnfirebase.io/)
- [Firebase Console](https://console.firebase.google.com/)
