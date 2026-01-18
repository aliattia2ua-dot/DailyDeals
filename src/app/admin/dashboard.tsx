// src/app/admin/dashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  I18nManager,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { getAllCatalogues, deleteCatalogue } from '../../services/adminService';
import { refreshCatalogues } from '../../data/catalogueRegistry';
import {
  fixExistingCatalogues,
  deleteAllOffers,
  deleteOrphanedOffers,
  getDatabaseStats,
  migrateBTechCatalogue,
  validateCatalogueStructure
} from '../../utils/cleanupCatalogues';
import { Catalogue } from '../../types';
import { CatalogueUploadForm } from '../../components/admin/CatalogueUploadForm';
import { CatalogueListItem } from '../../components/admin/CatalogueListItem';
import { AdminConfigManager } from '../../components/admin/AdminConfigManager';
import { useAppSelector } from '../../store/hooks';

type TabType = 'catalogues' | 'config';

export default function AdminDashboard() {
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [runningCleanup, setRunningCleanup] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('catalogues');

  // Get admin status
  const { isAdmin } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (activeTab === 'catalogues') {
      loadCatalogues();
    }
  }, [activeTab]);

  const handleRunCleanup = async () => {
    const options = [
      '1. تنظيف الكتالوجات (إضافة حقل ID)',
      '2. حذف العروض اليتيمة',
      '3. حذف جميع العروض (خطير!)',
      '4. عرض إحصائيات قاعدة البيانات',
      '5. 🚀 ترحيل عروض B.TECH (تحديث المعرف)',
      '6. ✅ التحقق من صحة البيانات',
    ];

    const choice = Platform.OS === 'web'
      ? window.prompt(
          'اختر عملية التنظيف:\n\n' +
          options.join('\n') +
          '\n\nأدخل الرقم (1-6):'
        )
      : await new Promise<string | null>(resolve => {
          Alert.alert(
            'أداة التنظيف',
            'اختر عملية:',
            [
              { text: 'إلغاء', style: 'cancel', onPress: () => resolve(null) },
              { text: '1. تنظيف الكتالوجات', onPress: () => resolve('1') },
              { text: '2. حذف العروض ', onPress: () => resolve('2') },
              { text: '3. حذف جميع العروض', style: 'destructive', onPress: () => resolve('3') },
              { text: '4. عرض الإحصائيات', onPress: () => resolve('4') },
              { text: '5. ترحيل B.TECH', onPress: () => resolve('5') },
              { text: '6. التحقق', onPress: () => resolve('6') },
            ]
          );
        });

    if (!choice) return;

    try {
      setRunningCleanup(true);

      switch (choice) {
        case '1':
          await fixExistingCatalogues();
          showAlert('✅ نجح', 'تم تنظيف الكتالوجات بنجاح!');
          await loadCatalogues();
          break;

        case '2':
          await deleteOrphanedOffers();
          showAlert('✅ نجح', 'تم حذف العروض اليتيمة بنجاح!');
          break;

        case '3':
          const confirmNuclear = Platform.OS === 'web'
            ? window.confirm(
                '⚠️ تحذير خطير!\n\n' +
                'هذا سيحذف جميع العروض من:\n' +
                '• المجموعة المسطحة (offers)\n' +
                '• جميع المجموعات الفرعية\n\n' +
                'هل أنت متأكد تماماً؟'
              )
            : await new Promise(resolve => {
                Alert.alert(
                  '⚠️ تحذير خطير!',
                  'هذا سيحذف جميع العروض!\n\nهل أنت متأكد؟',
                  [
                    { text: 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
                    { text: 'حذف الكل', style: 'destructive', onPress: () => resolve(true) },
                  ]
                );
              });

          if (confirmNuclear) {
            await deleteAllOffers();
            showAlert('✅ تم', 'تم حذف جميع العروض!');
          }
          break;

        case '4':
          await getDatabaseStats();
          showAlert('📊 الإحصائيات', 'تحقق من Console للتفاصيل');
          break;

        case '5':
          const confirmMigration = Platform.OS === 'web'
            ? window.confirm(
                '🚀 ترحيل عروض B.TECH\n\n' +
                'سيتم تحديث العروض لتستخدم:\n' +
                'المعرف الجديد: btech-2026-01-01-0200\n\n' +
                'سيتم تحديث:\n' +
                '• العروض في المجموعة المسطحة (offers)\n' +
                '• العروض في المجموعات الفرعية\n\n' +
                'هل تريد المتابعة؟'
              )
            : await new Promise(resolve => {
                Alert.alert(
                  '🚀 ترحيل B.TECH',
                  'سيتم تحديث عروض الكتالوج\n\nهل تريد المتابعة؟',
                  [
                    { text: 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
                    { text: 'ترحيل', onPress: () => resolve(true) },
                  ]
                );
              });

          if (confirmMigration) {
            const result = await migrateBTechCatalogue();

            if (result.success) {
              showAlert(
                '✅ تم الترحيل',
                `تم ترحيل كتالوج B.TECH بنجاح!\n\n` +
                `المعرف الجديد: ${result.newId}\n` +
                `العروض المحدثة: ${result.flatOffersCount || 0} (مسطح) + ${result.subcollectionOffersCount || 0} (فرعي)`
              );
            } else {
              showAlert('ℹ️ معلومات', result.message);
            }

            await loadCatalogues();
          }
          break;

        case '6':
          await validateCatalogueStructure();
          showAlert('🔍 التحقق', 'تحقق من Console للتفاصيل');
          break;
      }

    } catch (error: any) {
      showAlert('❌ خطأ', error.message);
    } finally {
      setRunningCleanup(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const loadCatalogues = async () => {
    try {
      console.log('📄 [Admin] Loading catalogues...');
      setLoading(true);
      const data = await getAllCatalogues();

      const sorted = data.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setCatalogues(sorted);
      console.log(`✅ [Admin] Loaded ${sorted.length} catalogues`);
    } catch (error: any) {
      console.error('❌ [Admin] Error loading catalogues:', error);

      if (Platform.OS === 'web') {
        alert('خطأ: فشل تحميل الكتالوجات - ' + error.message);
      } else {
        Alert.alert('خطأ', 'فشل تحميل الكتالوجات: ' + error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCatalogues();
  };

  const handleDelete = async (catalogue: Catalogue) => {
    if (!__DEV__ && !isAdmin) {
      if (Platform.OS === 'web') {
        alert('خطأ: غير مصرح لك بحذف الكتالوجات');
      } else {
        Alert.alert('خطأ', 'غير مصرح لك بحذف الكتالوجات');
      }
      return;
    }

    const hasPages = catalogue.pages && catalogue.pages.length > 0;
    const hasPDF = !!catalogue.pdfUrl;
    const pageCount = catalogue.pages?.length || 0;

    const deletionInfo = [
      `📦 الكتالوج: ${catalogue.titleAr}`,
      `📁 نوع الرفع: ${hasPDF ? 'PDF (تم تحويله)' : 'صور فقط'}`,
      `📄 عدد الصفحات: ${pageCount}`,
      '',
      '⚠️ سيتم حذف:',
      '• بيانات Firestore',
      hasPDF ? '• ملف PDF الأصلي' : '',
      '• صورة الغلاف',
      `• ${pageCount} صورة صفحة`,
      '• جميع العروض المرتبطة',
      '',
      '⚫ هذا الإجراء لا يمكن التراجع عنه.'
    ].filter(Boolean).join('\n');

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(deletionInfo);
      if (!confirmed) {
        console.log('🔴 [Admin] User cancelled delete');
        return;
      }
      await performDelete(catalogue);
    } else {
      Alert.alert(
        'تأكيد الحذف',
        deletionInfo,
        [
          {
            text: 'إلغاء',
            style: 'cancel',
            onPress: () => console.log('🔴 [Admin] User cancelled delete'),
          },
          {
            text: 'حذف',
            style: 'destructive',
            onPress: () => performDelete(catalogue),
          },
        ]
      );
    }
  };

  const performDelete = async (catalogue: Catalogue) => {
    try {
      setDeletingId(catalogue.id);
      console.log(`🗑️ [Admin] Starting deletion: ${catalogue.id}`);

      if (Platform.OS === 'web') {
        console.log('⏳ جاري الحذف...');
      }

      await deleteCatalogue(catalogue.id, catalogue.pdfUrl);

      console.log('✅ [Admin] Catalogue deleted successfully');

      if (Platform.OS === 'web') {
        alert('✅ تم حذف الكتالوج بنجاح\n\nتم حذف جميع الملفات المرتبطة');
      } else {
        Alert.alert(
          '✅ نجح',
          'تم حذف الكتالوج بنجاح\n\nتم حذف جميع الملفات المرتبطة'
        );
      }

      await loadCatalogues();
      await refreshCatalogues();

    } catch (error: any) {
      console.error('❌ [Admin] Error deleting catalogue:', error);

      const errorMessage = error.message || 'حدث خطأ غير متوقع';

      if (Platform.OS === 'web') {
        alert('❌ خطأ: فشل حذف الكتالوج\n\n' + errorMessage);
      } else {
        Alert.alert(
          '❌ خطأ',
          'فشل حذف الكتالوج:\n\n' + errorMessage
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadSuccess = async () => {
    console.log('✅ [Admin] Upload successful, refreshing catalogues...');
    setShowUploadForm(false);
    await loadCatalogues();
    const freshCatalogues = await refreshCatalogues();
    console.log(`✅ [Admin] Catalogues refreshed: ${freshCatalogues.length} items`);
  };

  if (loading && activeTab === 'catalogues') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل الكتالوجات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'catalogues' && styles.activeTab]}
          onPress={() => setActiveTab('catalogues')}
        >
          <Ionicons
            name="book"
            size={20}
            color={activeTab === 'catalogues' ? colors.primary : colors.textSecondary}
          />
          <Text style={[
            styles.tabText,
            activeTab === 'catalogues' && styles.activeTabText
          ]}>
            الكتالوجات
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'config' && styles.activeTab]}
          onPress={() => setActiveTab('config')}
        >
          <Ionicons
            name="settings"
            size={20}
            color={activeTab === 'config' ? colors.primary : colors.textSecondary}
          />
          <Text style={[
            styles.tabText,
            activeTab === 'config' && styles.activeTabText
          ]}>
            إعدادات التطبيق
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      {activeTab === 'catalogues' ? (
        showUploadForm ? (
          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            <CatalogueUploadForm
              onSuccess={handleUploadSuccess}
              onCancel={() => setShowUploadForm(false)}
            />
          </ScrollView>
        ) : (
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>الكتالوجات</Text>
                <Text style={styles.headerSubtitle}>
                  {catalogues.length} {catalogues.length === 1 ? 'كتالوج' : 'كتالوجات'}
                </Text>
                {!__DEV__ && !isAdmin && (
                  <View style={styles.warningBadge}>
                    <Ionicons name="warning" size={14} color={colors.warning} />
                    <Text style={styles.warningText}>وضع القراءة فقط</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => setShowUploadForm(true)}
              >
                <Ionicons name="add" size={24} color={colors.white} />
                <Text style={styles.uploadButtonText}>إضافة كتالوج</Text>
              </TouchableOpacity>
            </View>

            {/* Admin Info Banner */}
            {__DEV__ && (
              <View style={styles.devBanner}>
                <Ionicons name="code-slash" size={20} color={colors.warning} />
                <Text style={styles.devBannerText}>
                  وضع المطور: يمكنك حذف الكتالوجات بدون قيود
                </Text>
                <TouchableOpacity
                  style={styles.cleanupButton}
                  onPress={handleRunCleanup}
                  disabled={runningCleanup}
                >
                  {runningCleanup ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="build" size={16} color={colors.white} />
                      <Text style={styles.cleanupButtonText}>تنظيف</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <View style={styles.infoBannerContent}>
                <Text style={styles.infoBannerText}>
                  • رفع PDF: يتم تحويله تلقائياً إلى صور{'\n'}
                  • رفع صور: تبقى كما هي بدون تحويل{'\n'}
                  • المعرف: storeId-YYYY-MM-DD-HHMM
                </Text>
              </View>
            </View>

            {/* Catalogues List */}
            <ScrollView
              style={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
            >
              {catalogues.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={80} color={colors.gray[300]} />
                  <Text style={styles.emptyText}>لا توجد كتالوجات حتى الآن</Text>
                  <Text style={styles.emptySubtext}>
                    اضغط على "إضافة كتالوج" لرفع كتالوج جديد
                  </Text>
                </View>
              ) : (
                catalogues.map((catalogue) => (
                  <View key={catalogue.id} style={styles.catalogueItemWrapper}>
                    <CatalogueListItem
                      catalogue={catalogue}
                      onDelete={() => handleDelete(catalogue)}
                      canDelete={(__DEV__ || isAdmin) && deletingId !== catalogue.id}
                      onProcessComplete={loadCatalogues}
                    />

                    {deletingId === catalogue.id && (
                      <View style={styles.deletingOverlay}>
                        <View style={styles.deletingBox}>
                          <ActivityIndicator size="large" color={colors.white} />
                          <Text style={styles.deletingText}>جاري الحذف...</Text>
                          <Text style={styles.deletingSubtext}>
                            حذف الملفات والبيانات
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ))
              )}
              <View style={styles.bottomPadding} />
            </ScrollView>
          </>
        )
      ) : (
        /* Config Tab */
        <AdminConfigManager />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  tabContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    paddingHorizontal: spacing.md,
  },
  tab: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  header: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  warningBadge: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    alignSelf: I18nManager.isRTL ? 'flex-end' : 'flex-start',
    gap: spacing.xs,
  },
  warningText: {
    fontSize: typography.fontSize.xs,
    color: colors.warning,
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  uploadButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  devBanner: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    gap: spacing.sm,
  },
  devBannerText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.warning,
    fontWeight: '600',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  cleanupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  cleanupButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    lineHeight: 20,
  },
  formContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    flex: 1,
    padding: spacing.md,
  },
  catalogueItemWrapper: {
    position: 'relative',
  },
  deletingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    zIndex: 10,
  },
  deletingBox: {
    backgroundColor: colors.error,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    minWidth: 200,
  },
  deletingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  deletingSubtext: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  bottomPadding: {
    height: spacing.xl,
  },
});