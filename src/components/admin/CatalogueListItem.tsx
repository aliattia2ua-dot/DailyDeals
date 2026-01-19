// src/components/admin/CatalogueListItem.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Catalogue } from '../../types';
import { CatalogueOfferManager } from './CatalogueOfferManager';

interface CatalogueListItemProps {
  catalogue: Catalogue;
  onDelete: () => void;
  canDelete?: boolean;
  onProcessComplete?: () => void;
}

export const CatalogueListItem: React.FC<CatalogueListItemProps> = ({
  catalogue,
  onDelete,
  canDelete = true,
  onProcessComplete,
}) => {
  const [showOfferManager, setShowOfferManager] = useState(false);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const hasPages = catalogue.pages && catalogue.pages.length > 0;
  const hasPDF = !!catalogue.pdfUrl;
  const isPending = catalogue.processingStatus === 'pending';

  // Determine upload type and status
  let uploadTypeInfo = {
    icon: 'images' as const,
    color: colors.success,
    text: 'صور فقط',
  };

  if (hasPDF) {
    if (isPending) {
      uploadTypeInfo = {
        icon: 'hourglass-outline' as const,
        color: colors.warning,
        text: 'PDF (بانتظار المعالجة)',
      };
    } else if (hasPages) {
      uploadTypeInfo = {
        icon: 'document-text' as const,
        color: colors.primary,
        text: 'PDF (تم تحويله)',
      };
    } else {
      uploadTypeInfo = {
        icon: 'document' as const,
        color: colors.info,
        text: 'PDF فقط',
      };
    }
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Header with title and delete button */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Ionicons
                name={uploadTypeInfo.icon}
                size={24}
                color={uploadTypeInfo.color}
              />
              <View style={styles.titleText}>
                <Text style={styles.title} numberOfLines={1}>
                  {catalogue.titleAr}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {catalogue.titleEn}
                </Text>
              </View>
            </View>
            {canDelete && (
              <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>

          {/* Upload Type Badge */}
          <View style={styles.uploadTypeBadge}>
            <Ionicons
              name={uploadTypeInfo.icon}
              size={14}
              color={uploadTypeInfo.color}
            />
            <Text style={[
              styles.uploadTypeText,
              { color: uploadTypeInfo.color }
            ]}>
              {uploadTypeInfo.text}
            </Text>
          </View>

          {/* Catalogue ID - Display only (no copy functionality) */}
          <View style={styles.idContainer}>
            <Ionicons name="key-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.idText} selectable>{catalogue.id}</Text>
          </View>

          {/* Info section */}
          <View style={styles.info}>
            <View style={styles.infoItem}>
              <Ionicons name="storefront-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{catalogue.storeId}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {formatDate(catalogue.startDate)} - {formatDate(catalogue.endDate)}
              </Text>
            </View>
          </View>

          {/* Badges section */}
          <View style={styles.badges}>
            {hasPDF && (
              <View style={[styles.badge, styles.badgePdf]}>
                <Ionicons name="document" size={14} color={colors.primary} />
                <Text style={[styles.badgeText, styles.badgeTextPdf]}>PDF متوفر</Text>
              </View>
            )}
            {hasPages && (
              <View style={[styles.badge, styles.badgeProcessed]}>
                <Ionicons name="images" size={14} color={colors.success} />
                <Text style={[styles.badgeText, styles.badgeTextProcessed]}>
                  {catalogue.pages?.length || 0} صورة
                </Text>
              </View>
            )}
            {isPending && (
              <View style={[styles.badge, styles.badgePending]}>
                <Ionicons name="time-outline" size={14} color={colors.warning} />
                <Text style={[styles.badgeText, styles.badgeTextPending]}>قيد المعالجة</Text>
              </View>
            )}
          </View>

          {/* Manage Offers Button */}
          <TouchableOpacity
            style={styles.manageOffersButton}
            onPress={() => setShowOfferManager(true)}
          >
            <Ionicons name="pricetag-outline" size={18} color={colors.white} />
            <Text style={styles.manageOffersText}>إدارة العروض</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offer Manager Modal */}
      {showOfferManager && (
        <Modal
          visible={showOfferManager}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowOfferManager(false)}
        >
          <CatalogueOfferManager
            catalogueId={catalogue.id}
            totalPages={catalogue.pages?.length || 0}
            onClose={() => setShowOfferManager(false)}
          />
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  titleText: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  deleteButton: {
    padding: spacing.xs,
  },
  uploadTypeBadge: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    alignSelf: I18nManager.isRTL ? 'flex-end' : 'flex-start',
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  uploadTypeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  idContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  idText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  info: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  infoItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  badges: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  badgePdf: {
    backgroundColor: colors.primary + '20',
  },
  badgeProcessed: {
    backgroundColor: colors.success + '20',
  },
  badgePending: {
    backgroundColor: colors.warning + '20',
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  badgeTextPdf: {
    color: colors.primary,
  },
  badgeTextProcessed: {
    color: colors.success,
  },
  badgeTextPending: {
    color: colors.warning,
  },
  manageOffersButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  manageOffersText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
});