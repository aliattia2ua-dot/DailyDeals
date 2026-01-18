// src/app/profile.tsx - FIXED DATE DISPLAY
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
  Alert,
  Image,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';

import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import LocationSelector from '../components/common/LocationSelector';
import { setUser } from '../store/slices/authSlice';
import { updateUserProfile } from '../services/userDataService';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { user, isAuthenticated } = useAppSelector(state => state.auth);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/sign-in');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (user?.phoneNumber) {
      setPhoneNumber(user.phoneNumber);
    }
  }, [user]);

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone || phone.trim() === '') return true; // Optional

    const cleanPhone = phone.replace(/[\s-]/g, '');
    const egyptianPhoneRegex = /^(01[0-9]{9}|(\+20|0020)?01[0-9]{9})$/;

    return egyptianPhoneRegex.test(cleanPhone);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate phone if provided
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      setPhoneError('رقم الهاتف غير صحيح (مثال: 01012345678)');
      return;
    }

    setIsSaving(true);
    try {
      const cleanPhone = phoneNumber.trim() ? phoneNumber.replace(/[\s-]/g, '') : null;

      const updatedData = {
        displayName: displayName.trim() || user.displayName,
        phoneNumber: cleanPhone,
      };

      await updateUserProfile(user.uid, updatedData);

      // Update Redux state
      const updatedUser = {
        ...user,
        ...updatedData,
      };
      dispatch(setUser(updatedUser));

      setIsEditing(false);

      if (Platform.OS === 'web') {
        alert('تم حفظ التغييرات بنجاح\nProfile updated successfully');
      } else {
        Alert.alert(
          'تم الحفظ',
          'تم حفظ التغييرات بنجاح',
          [{ text: t('settings.ok') }]
        );
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (Platform.OS === 'web') {
        alert('فشل حفظ التغييرات\nFailed to save changes');
      } else {
        Alert.alert(
          t('common.error'),
          'فشل حفظ التغييرات',
          [{ text: t('settings.ok') }]
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(user?.displayName || '');
    setPhoneNumber(user?.phoneNumber || '');
    setPhoneError('');
    setIsEditing(false);
  };

  // ✅ FIX: Format Firestore Timestamp properly
  const formatCreatedDate = (timestamp: any): string => {
    if (!timestamp) return 'غير متاح';

    try {
      // Handle Firestore Timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();
        return date.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      // Handle JavaScript Date
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      // Handle timestamp number (milliseconds)
      if (typeof timestamp === 'number') {
        const date = new Date(timestamp);
        return date.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      // Handle string date
      if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      }

      return 'غير متاح';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'غير متاح';
    }
  };

  if (!user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('settings.profile'),
          headerBackTitle: 'عودة',
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={48} color={colors.textSecondary} />
              </View>
            )}
            {user.isAdmin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={16} color={colors.white} />
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user.displayName || 'المستخدم'}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>المعلومات الشخصية</Text>
            {!isEditing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
                <Text style={styles.editButtonText}>تعديل</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            {/* Display Name */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>الاسم</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="أدخل اسمك"
                  placeholderTextColor={colors.textSecondary}
                  textAlign={I18nManager.isRTL ? 'right' : 'left'}
                />
              ) : (
                <Text style={styles.infoValue}>
                  {user.displayName || 'غير محدد'}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            {/* Email (Read-only) */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>البريد الإلكتروني</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>

            <View style={styles.divider} />

            {/* Phone Number */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>رقم الهاتف (اختياري)</Text>
              {isEditing ? (
                <View style={styles.phoneInputWrapper}>
                  <View style={styles.phoneInputContainer}>
                    <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
                    <TextInput
                      style={styles.phoneInput}
                      value={phoneNumber}
                      onChangeText={(text) => {
                        setPhoneNumber(text);
                        setPhoneError('');
                      }}
                      placeholder="01012345678"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="phone-pad"
                      maxLength={14}
                      textAlign={I18nManager.isRTL ? 'right' : 'left'}
                    />
                  </View>
                  {phoneError ? (
                    <Text style={styles.phoneError}>{phoneError}</Text>
                  ) : (
                    <Text style={styles.phoneHint}>
                      سيساعدنا رقم هاتفك في إرسال تحديثات العروض
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.infoValue}>
                  {user.phoneNumber || 'غير محدد'}
                </Text>
              )}
            </View>

            {/* Save/Cancel Buttons */}
            {isEditing && (
              <>
                <View style={styles.divider} />
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleCancel}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelButtonText}>إلغاء</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color={colors.white} />
                        <Text style={styles.saveButtonText}>حفظ</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الموقع</Text>
          <View style={styles.card}>
            <View style={styles.locationContainer}>
              <LocationSelector showCitySelection={true} />
            </View>
            <View style={styles.locationHint}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.locationHintText}>
                {t('settings.locationHint')}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>إحصائيات الحساب</Text>
          <View style={styles.card}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="heart" size={24} color={colors.primary} />
                <Text style={styles.statValue}>
                  {useAppSelector(state => state.favorites.storeIds.length)}
                </Text>
                <Text style={styles.statLabel}>متاجر مفضلة</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="cart" size={24} color={colors.primary} />
                <Text style={styles.statValue}>
                  {useAppSelector(state => state.basket.items.length)}
                </Text>
                <Text style={styles.statLabel}>عروض محفوظة</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Created Date - FIXED */}
        {user.createdAt && (
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.accountInfo}>
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.accountInfoText}>
                  عضو منذ {formatCreatedDate(user.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarPlaceholder: {
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  userName: {
    fontSize: typography.fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.md,
  },
  userEmail: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  editButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  editButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.primary,
    fontWeight: '500',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  infoItem: {
    padding: spacing.md,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  infoValue: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  input: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    backgroundColor: colors.gray[50],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  phoneInputWrapper: {
    gap: spacing.xs,
  },
  phoneInputContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    gap: spacing.sm,
  },
  phoneInput: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text,
    paddingVertical: 0,
  },
  phoneError: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  phoneHint: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
  },
  buttonContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  cancelButton: {
    backgroundColor: colors.gray[100],
  },
  cancelButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: '600',
  },
  locationContainer: {
    padding: spacing.md,
  },
  locationHint: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.gray[50],
  },
  locationHintText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  statsGrid: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.primaryLight + '10',
    borderRadius: borderRadius.md,
  },
  statValue: {
    fontSize: typography.fontSize.xxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  accountInfo: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  accountInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
});