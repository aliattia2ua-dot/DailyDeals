// src/app/auth/sign-in.tsx - COMPLETE FILE WITH FIXES
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  I18nManager,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Constants from 'expo-constants';

import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import LocationSelector from '../../components/common/LocationSelector';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signInWithGoogle, setUser } from '../../store/slices/authSlice';
import { hydrateLocation, syncLocation } from '../../store/slices/settingsSlice';
import { getOrCreateUserProfile, getUserProfile } from '../../services/authService';
import { syncLocationToFirestore } from '../../services/userDataService';

const getGoogleClientIds = () => {
  return {
    webClientId: Constants. expoConfig?.extra?. EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: Constants. expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env. EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  };
};

export default function SignInScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [signInMethod, setSignInMethod] = useState<'google' | 'email'>('google');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Track the saved location locally to avoid refetch issues
  const [pendingLocation, setPendingLocation] = useState<{
    governorate:  string;
    city: string | null;
    phoneNumber?:  string | null;
  } | null>(null);

  const clientIds = getGoogleClientIds();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      configureGoogleSignIn();
    } else {
      setIsConfigured(true);
    }
  }, []);

  const configureGoogleSignIn = async () => {
    try {
      console.log('🔧 Configuring Google Sign-In for native.. .');
      GoogleSignin.configure({
        webClientId: clientIds.webClientId,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
      setIsConfigured(true);
      console.log('✅ Google Sign-In configured successfully');
    } catch (error) {
      console.error('❌ Error configuring Google Sign-In:', error);
    }
  };

  // IMPROVED:  Redirect logic that handles pending location
  useEffect(() => {
    // Don't redirect while modal is showing or during account creation
    if (showLocationModal || creatingAccount) {
      console.log('⏸️ Location modal active, skipping redirect');
      return;
    }

    // Don't redirect while loading or signing in
    if (loading || isSigningIn) {
      console.log('⏸️ Still loading/signing in, skipping redirect');
      return;
    }

    // Only redirect if authenticated and ready
    if (isAuthenticated && (! isFirstTimeUser || locationSaved)) {
      console.log('✅ User authenticated and ready, redirecting.. .');

      // If we have a pending location, dispatch it before redirecting
      if (pendingLocation) {
        console. log('📍 Dispatching pending location before redirect:', pendingLocation);
        dispatch(hydrateLocation({
          governorate:  pendingLocation.governorate,
          city: pendingLocation. city
        }));
        setPendingLocation(null);
      }

      router.replace('/(tabs)');
    }
  }, [isAuthenticated, loading, isSigningIn, creatingAccount, showLocationModal, isFirstTimeUser, locationSaved, pendingLocation, router, dispatch]);

  const showLocationSetup = () => {
    setShowLocationModal(true);
  };

  // FIXED: Handle location setup completion with Firestore sync
  const handleLocationSetupComplete = async (savedLocation: { governorate: string; city: string | null; phoneNumber?:  string | null }) => {
    console.log('✅ Location setup completed with:', savedLocation);

    const currentUser = auth().currentUser;

    // CRITICAL FIX: Sync to Firestore FIRST
    if (currentUser) {
      try {
        console.log('💾 [SignIn] Saving location to Firestore...');
        await syncLocationToFirestore(
          currentUser. uid,
          savedLocation.governorate,
          savedLocation. city,
          savedLocation.phoneNumber || null
        );
        console.log('✅ [SignIn] Location saved to Firestore successfully');
      } catch (error) {
        console.error('❌ [SignIn] Failed to save location to Firestore:', error);
        // Continue anyway - location is at least in Redux
      }
    }

    // Store the location locally to ensure it's available
    setPendingLocation(savedLocation);

    // Update Redux immediately
    dispatch(hydrateLocation({
      governorate:  savedLocation.governorate,
      city:  savedLocation.city
    }));

    // Update the user profile in Redux with the new location
    if (currentUser && user) {
      const updatedUser = {
        ...user,
        location:  {
          governorate: savedLocation. governorate,
          city: savedLocation. city
        },
        phoneNumber: savedLocation. phoneNumber || null
      };
      dispatch(setUser(updatedUser));
      console.log('✅ User profile updated in Redux with location');
    }

    setLocationSaved(true);
    setShowLocationModal(false);

    setTimeout(() => {
      setCreatingAccount(false);
      setIsFirstTimeUser(false);
    }, 300);
  };

  const handleSkipLocationSetup = async () => {
    console.log('⏭ Location setup skipped');

    // Even when skipping, we should mark that we've completed the setup
    const currentUser = auth().currentUser;

    // Optionally set a default or null location in Firestore
    if (currentUser) {
      try {
        await syncLocationToFirestore(currentUser.uid, null, null, null);
        console.log('✅ [SignIn] Skipped location saved to Firestore');
      } catch (error) {
        console.error('⚠️ [SignIn] Failed to save skipped location:', error);
      }
    }

    setLocationSaved(true);
    setShowLocationModal(false);

    setTimeout(() => {
      setCreatingAccount(false);
      setIsFirstTimeUser(false);
    }, 300);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleEmailSignIn = async () => {
    setEmailError('');
    setPasswordError('');

    if (!email. trim()) {
      setEmailError(t('auth.email') + ' ' + t('common.error'));
      return;
    }

    if (!validateEmail(email)) {
      setEmailError(t('auth.email') + ' ' + t('common.error'));
      return;
    }

    if (! password) {
      setPasswordError(t('auth.password') + ' ' + t('common.error'));
      return;
    }

    if (!validatePassword(password)) {
      setPasswordError(t('auth. password') + ' ' + t('common. error'));
      return;
    }

    try {
      setIsSigningIn(true);

      console.log('🔧 Attempting email sign-in.. .');

      try {
        // Try to sign in
        const userCredential = await auth().signInWithEmailAndPassword(email. trim(), password);
        console.log('✅ Sign-in successful:', userCredential.user. email);

        // Wait for user profile to be created/retrieved
        const userProfile = await getOrCreateUserProfile(userCredential.user);

        // FIXED:  Restore location from Firestore for existing user
        if (userProfile.location && userProfile.location.governorate) {
          console.log('📍 [SignIn] Restoring location for existing user:', userProfile.location);
          dispatch(hydrateLocation({
            governorate: userProfile.location.governorate,
            city: userProfile.location.city || null
          }));
        }

        if (Platform.OS === 'web') {
          alert(t('settings.welcomeBack') + ' ' + t('settings.signInSuccess'));
        } else {
          Alert.alert(
            t('settings. welcomeBack'),
            t('settings.signInSuccess'),
            [{ text: t('settings.ok') }]
          );
        }

        setIsSigningIn(false);
        // Redirect will happen via useEffect

      } catch (signInError:  any) {
        console.log('Sign-in error code:', signInError. code);

        if (signInError.code === 'auth/user-not-found' || signInError. code === 'auth/invalid-credential') {
          console.log('👤 User not found, creating new account...');

          // Set flag to prevent auth state listener from interfering
          setCreatingAccount(true);

          // Create new account
          const newUserCredential = await auth().createUserWithEmailAndPassword(email. trim(), password);
          console.log('✅ Account created:', newUserCredential.user.email);

          // Update display name
          await newUserCredential.user.updateProfile({
            displayName:  email.split('@')[0],
          });

          // CRITICAL:  Prevent auth listener from interfering
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Create user profile
          console.log('⏳ Creating user profile in Firestore...');
          const userProfile = await getOrCreateUserProfile(newUserCredential.user);
          console.log('✅ User profile created');

          // Dispatch BEFORE showing modal
          dispatch(setUser(userProfile));

          // Additional delay to ensure Redux update completes
          await new Promise(resolve => setTimeout(resolve, 500));

          if (Platform.OS === 'web') {
            alert(t('settings.welcome') + ' ' + t('settings.accountCreated'));
          } else {
            Alert.alert(
              t('settings. welcome'),
              t('settings.accountCreated'),
              [{ text: t('settings.ok') }]
            );
          }

          setIsFirstTimeUser(true);
          setLocationSaved(false);
          setIsSigningIn(false);
          showLocationSetup();
          return;

        } else if (signInError.code === 'auth/wrong-password') {
          setPasswordError(t('common.error'));
          setIsSigningIn(false);
          return;
        } else if (signInError.code === 'auth/invalid-email') {
          setEmailError(t('common.error'));
          setIsSigningIn(false);
          return;
        } else if (signInError.code === 'auth/email-already-in-use') {
          setEmailError(t('common.error'));
          setIsSigningIn(false);
          return;
        } else {
          throw signInError;
        }
      }

      console.log('✅ Authentication complete');

    } catch (error:  any) {
      console.error('❌ Error in email authentication:', error);
      setIsSigningIn(false);

      let errorMessage = t('common.error');

      if (error. message?. includes('network') || error.code === 'auth/network-request-failed') {
        errorMessage = t('errors.network');
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = t('common.error');
      }

      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert(
          t('common.error'),
          errorMessage,
          [{ text: t('settings.ok') }]
        );
      }
    }
  };

  const handleWebGoogleSignIn = async () => {
    // Note: signInWithPopup is web-only and not available in React Native Firebase
    // For web platform, you would need to handle this differently or use a web-specific Firebase setup
    console.error('❌ Web Google Sign-In is not supported with React Native Firebase');
    Alert.alert(
      t('common.error'),
      'Web Google Sign-In is not supported with React Native Firebase',
      [{ text: t('settings.ok') }]
    );
  };

  const handleNativeGoogleSignIn = async () => {
    if (!isConfigured) {
      Alert.alert(
        t('common.error'),
        t('common.loading')
      );
      return;
    }

    try {
      setIsSigningIn(true);
      console.log('📱 Starting Native Google Sign-In.. .');

      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();

      // FIX: Check if user document exists in Firestore
      // Get the current user after sign-in
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for auth state
      const currentUser = auth().currentUser;

      let isNewUser = false;
      if (currentUser) {
        const userRef = firestore().collection('users').doc(currentUser.uid);
        const userSnap = await userRef.get();
        isNewUser = !userSnap.exists;
        console.log('🔍 User status:', isNewUser ?  'NEW USER' : 'EXISTING USER');
      }

      // Set flag to prevent redirect during account creation
      if (isNewUser) {
        setCreatingAccount(true);
      }

      await dispatch(signInWithGoogle({
        idToken: tokens.idToken || null,
        accessToken: tokens.accessToken || null,
      })).unwrap();

      console.log('✅ Sign-in successful');
      setIsSigningIn(false);

      if (isNewUser) {
        console. log('🆕 New user detected - showing location setup');

        // Show success message for new user
        Alert.alert(
          'تم التسجيل بنجاح',
          'Registration Successful',
          [{ text: t('settings.ok') }]
        );

        setIsFirstTimeUser(true);
        setLocationSaved(false);
        showLocationSetup();
      } else {
        console.log('👤 Existing user - no location setup needed');

        // Show welcome back message for existing user
        Alert.alert(
          'مرحباً بعودتك',
          'Welcome Back',
          [{ text: t('settings.ok') }]
        );
      }
    } catch (error:  any) {
      console.error('❌ Error in native Google sign-in:', error);
      setIsSigningIn(false);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      Alert.alert(
        t('common.error'),
        t('common.error'),
        [{ text: t('settings.ok') }]
      );
    }
  };

  const handleGoogleSignIn = async () => {
    if (Platform.OS === 'web') {
      await handleWebGoogleSignIn();
    } else {
      await handleNativeGoogleSignIn();
    }
  };

  const handleSkipPress = () => {
    router.replace('/(tabs)');
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo/Icon */}
            <View style={styles. iconContainer}>
              <Ionicons name="pricetags" size={80} color={colors. primary} />
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {t('auth.welcome')}
            </Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              {t('auth. welcomeMessage')}
            </Text>

            {/* Sign-In Method Toggle */}
            <View style={styles. toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  signInMethod === 'google' && styles. toggleButtonActive,
                ]}
                onPress={() => setSignInMethod('google')}
              >
                <Ionicons
                  name="logo-google"
                  size={20}
                  color={signInMethod === 'google' ? colors. white : colors.textSecondary}
                />
                <Text
                  style={[
                    styles. toggleText,
                    signInMethod === 'google' && styles. toggleTextActive,
                  ]}
                >
                  Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles. toggleButton,
                  signInMethod === 'email' && styles.toggleButtonActive,
                ]}
                onPress={() => setSignInMethod('email')}
              >
                <Ionicons
                  name="mail"
                  size={20}
                  color={signInMethod === 'email' ? colors.white : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.toggleText,
                    signInMethod === 'email' && styles.toggleTextActive,
                  ]}
                >
                  {t('auth.email')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Google Sign-In Button */}
            {signInMethod === 'google' && (
              <TouchableOpacity
                style={[styles.googleButton, (isSigningIn || loading || ! isConfigured) && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={isSigningIn || loading || !isConfigured}
              >
                {isSigningIn || loading ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={24} color={colors.text} />
                    <Text style={styles.googleButtonText}>
                      {t('auth.signInWithGoogle')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Email/Password Form */}
            {signInMethod === 'email' && (
              <View style={styles.formContainer}>
                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={colors. textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth. email')}
                    placeholderTextColor={colors.textSecondary}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textAlign={I18nManager.isRTL ? 'right' : 'left'}
                  />
                </View>
                {emailError ?  <Text style={styles. errorText}>{emailError}</Text> : null}

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors. textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth. password')}
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setPasswordError('');
                    }}
                    secureTextEntry={! showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textAlign={I18nManager.isRTL ? 'right' : 'left'}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

                {/* Info Text */}
                <Text style={styles. infoText}>
                  {t('auth.noAccountCreated')}
                </Text>

                {/* Email Sign-In Button */}
                <TouchableOpacity
                  style={[styles. signInButton, (isSigningIn || loading) && styles.buttonDisabled]}
                  onPress={handleEmailSignIn}
                  disabled={isSigningIn || loading}
                >
                  {isSigningIn || loading ? (
                    <ActivityIndicator size="small" color={colors. white} />
                  ) : (
                    <Text style={styles.signInButtonText}>
                      {t('auth.signIn')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Skip Button */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipPress}
              disabled={isSigningIn || loading}
            >
              <Text style={styles.skipButtonText}>
                {t('auth.skipForNow')}
              </Text>
            </TouchableOpacity>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={colors. error} />
                <Text style={styles.errorMessageText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles. footer}>
            <Text style={styles. footerText}>
              {t('auth.agreeToTerms')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Location Setup Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={handleSkipLocationSetup}
      >
        <View style={styles.modalOverlay}>
          <View style={styles. modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="location" size={40} color={colors. primary} />
              <Text style={styles.modalTitle}>
                {t('settings.chooseLocation')}
              </Text>
              <Text style={styles.modalSubtitle}>
                {t('settings.locationHint')}
              </Text>
            </View>

            <View style={styles.modalBody}>
              <LocationSelector
                showCitySelection={true}
                onLocationSaved={handleLocationSetupComplete}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles. modalSkipButton}
                onPress={handleSkipLocationSetup}
              >
                <Text style={styles.modalSkipText}>
                  {t('settings.skip')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.xl,
    width: '100%',
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.white,
  },
  formContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  infoText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  signInButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  signInButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  googleButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    width: '100%',
    ...shadows.md,
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  skipButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  skipButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  errorMessageText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.error,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  footer: {
    padding: spacing.xl,
  },
  footerText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
  },
  modalHeader: {
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  modalBody: {
    padding: spacing.xl,
  },
  modalFooter: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  modalSkipButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[300],
    alignItems: 'center',
  },
  modalSkipText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});