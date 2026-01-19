# Expo Dev Client Migration Guide

This document provides instructions for completing the migration from Expo Go to Expo Dev Client.

## What Changed

### Configuration Files

1. **package.json** - Added:
   - `expo-dev-client` (~5.0.16)
   - `react-native-blob-util` (^0.19.11)
   - New scripts for dev client workflow

2. **eas.json** (NEW) - EAS Build configuration with profiles:
   - `development` - For dev builds (Android APK, iOS Simulator)
   - `development-device` - For iOS physical device dev builds
   - `preview` - For internal testing
   - `production` - For store releases

3. **metro.config.js** (NEW) - Metro bundler configuration:
   - PDF asset support
   - Proper source extensions

4. **app.json** - Updated:
   - Added `expo-dev-client` plugin
   - Added iOS photo library permissions
   - Added Android storage permissions

5. **.gitignore** - Updated:
   - Added `android/` and `ios/` directories

## Why This Migration?

`react-native-pdf` and `react-native-blob-util` are native modules that require native code linking. They cannot run in Expo Go, which only supports a limited set of pre-compiled native modules. Expo Dev Client creates a custom development build with all your native dependencies included.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install the new dependencies including `expo-dev-client` and `react-native-blob-util`.

### 2. Install EAS CLI (if not already installed)

```bash
npm install -g eas-cli
```

### 3. Login to Expo

```bash
eas login
```

### 4. Configure EAS Build (Optional)

If you need to customize build settings, edit `eas.json`. The default configuration is already set up for you.

### 5. Build Development Client

#### For Android:

```bash
npm run build:android
# or
eas build --platform android --profile development
```

This creates an APK that can be easily installed on Android devices or emulators.

#### For iOS Simulator:

```bash
npm run build:ios
# or
eas build --platform ios --profile development
```

#### For iOS Physical Device:

```bash
eas build --platform ios --profile development-device
```

**Note:** Builds happen in the cloud and take approximately 10-20 minutes.

### 6. Install the Development Build

#### Android:
1. Once the build completes, download the APK from the build URL
2. Install it on your Android device or emulator

#### iOS Simulator:
1. Once the build completes, the simulator build will be downloaded automatically
2. Install it using: `eas build:run -p ios`

#### iOS Device:
1. Once the build completes, you have two installation options:
   - **Internal Distribution**: Download from the build URL and install directly (requires device UDID registration in Apple Developer account)
   - **TestFlight**: Submit to TestFlight via App Store Connect (requires App Store Connect setup)
2. See [Expo's iOS Distribution Guide](https://docs.expo.dev/build/internal-distribution/) for detailed setup instructions

### 7. Start the Dev Server

```bash
npm start
# or
expo start --dev-client
```

### 8. Connect to Dev Server

1. Open the development build app on your device
2. Scan the QR code from the terminal
3. The app will load from your dev server

## Local Development Alternative (Optional)

If you have Android Studio or Xcode installed locally, you can build and run locally:

```bash
# Generate native projects
npm run prebuild

# Run on Android
npm run android

# Run on iOS
npm run ios
```

**Note:** This requires Android Studio (for Android) or Xcode (for iOS) to be installed on your machine.

## Scripts Reference

- `npm start` - Start dev server with dev client
- `npm run start:go` - Start dev server with Expo Go (for reference)
- `npm run android` - Run on Android locally (requires Android Studio)
- `npm run ios` - Run on iOS locally (requires Xcode)
- `npm run web` - Run web version
- `npm run build:android` - Build Android dev client (cloud)
- `npm run build:ios` - Build iOS dev client (cloud)
- `npm run prebuild` - Generate native projects
- `npm run prebuild:clean` - Clean and regenerate native projects

## Testing PDF Functionality

After setting up the dev client:

1. Navigate to the Flyers section
2. Select a catalogue
3. Verify PDF viewing works
4. Test page navigation
5. Test page saving functionality
6. Verify the thumbnail strip displays correctly

## Web Development

The web version continues to work as before without any changes needed:

```bash
npm run web
```

Web uses `pdfjs-dist` while mobile uses `react-native-pdf`.

## Troubleshooting

### Build Fails
- Check your `eas.json` configuration
- Ensure your Expo account has necessary permissions
- Check build logs on the Expo website

### Dev Client Won't Connect
- Ensure your device and computer are on the same network
- Try restarting the dev server
- Clear the cache: `expo start --dev-client --clear`

### PDF Not Loading on Mobile
- Ensure the dev client build includes `react-native-pdf`
- Check if the PDF URL is accessible
- Look for errors in the dev client console

### Module Not Found Errors
- Run `npm install` to ensure all dependencies are installed
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Metro cache: `npx expo start --clear`

## Important Notes

1. **First-Time Setup**: The first build will take longer as EAS sets up your project
2. **Cloud Builds**: Development builds happen on EAS servers, so you don't need Xcode/Android Studio
3. **Updates**: After installing the dev client, code updates are instant via the dev server
4. **Expo Go**: You can still use Expo Go for features that don't require native modules
5. **Production Builds**: Use the `production` profile in `eas.json` for app store releases

## Next Steps

1. Complete the setup instructions above
2. Test PDF functionality on the development build
3. Verify all features work as expected
4. When ready, create preview/production builds using appropriate EAS profiles

## Resources

- [Expo Dev Client Documentation](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [react-native-pdf Documentation](https://github.com/wonday/react-native-pdf)
