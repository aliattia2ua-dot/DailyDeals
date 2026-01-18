// src/components/admin/InteractiveOfferGrid.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { CatalogueOffer } from '../../services/catalogueOfferService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Predefined grid layouts
const GRID_LAYOUTS = {
  '3x3': { rows: 3, cols: 3, label: '3×3 (9 عروض)' },
  '2x2': { rows: 2, cols: 2, label: '2×2 (4 عروض)' },
  '4x2': { rows: 4, cols: 2, label: '4×2 (8 عروض)' },
  '3x2': { rows: 3, cols: 2, label: '3×2 (6 عروض)' },
  '2x3': { rows: 2, cols: 3, label: '2×3 (6 عروض)' },
  '4x3': { rows: 4, cols: 3, label: '4×3 (12 عروض)' },
  '5x2': { rows: 5, cols: 2, label: '5×2 (10 عروض)' },
};

type GridLayoutKey = keyof typeof GRID_LAYOUTS;

interface GridCell {
  row: number;
  col: number;
  offerId?: string;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
}

interface InteractiveOfferGridProps {
  pageImageUrl: string;
  pageNumber: number;
  availableOffers: CatalogueOffer[];
  onSave: (gridData: { cells: GridCell[]; layout: GridLayoutKey }) => void;
  onClose: () => void;
  existingGrid?: { cells: GridCell[]; layout: GridLayoutKey };
}

export const InteractiveOfferGrid: React.FC<InteractiveOfferGridProps> = ({
  pageImageUrl,
  pageNumber,
  availableOffers,
  onSave,
  onClose,
  existingGrid,
}) => {
  const [selectedLayout, setSelectedLayout] = useState<GridLayoutKey>(
    existingGrid?.layout || '3x3'
  );
  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [showOfferPicker, setShowOfferPicker] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Initialize grid when layout changes
  useEffect(() => {
    if (existingGrid && existingGrid.layout === selectedLayout) {
      setGridCells(existingGrid.cells);
    } else {
      generateGrid(selectedLayout);
    }
  }, [selectedLayout]);

  const generateGrid = (layout: GridLayoutKey) => {
    const { rows, cols } = GRID_LAYOUTS[layout];
    const cells: GridCell[] = [];
    const cellWidth = 100 / cols;
    const cellHeight = 100 / rows;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cells.push({
          row,
          col,
          x: col * cellWidth,
          y: row * cellHeight,
          width: cellWidth,
          height: cellHeight,
        });
      }
    }

    setGridCells(cells);
  };

  const handleCellPress = (cell: GridCell) => {
    setSelectedCell(cell);
    setShowOfferPicker(true);
  };

  const handleOfferSelect = (offerId: string) => {
    if (!selectedCell) return;

    setGridCells(prevCells =>
      prevCells.map(cell =>
        cell.row === selectedCell.row && cell.col === selectedCell.col
          ? { ...cell, offerId }
          : cell
      )
    );

    setShowOfferPicker(false);
    setSelectedCell(null);
  };

  const handleRemoveOffer = (cell: GridCell) => {
    setGridCells(prevCells =>
      prevCells.map(c =>
        c.row === cell.row && c.col === cell.col
          ? { ...c, offerId: undefined }
          : c
      )
    );
  };

  const handleSave = () => {
    const assignedCells = gridCells.filter(cell => cell.offerId);
    
    if (assignedCells.length === 0) {
      Alert.alert('تنبيه', 'الرجاء تعيين عرض واحد على الأقل');
      return;
    }

    onSave({ cells: gridCells, layout: selectedLayout });
  };

  const getOfferById = (offerId: string) => {
    return availableOffers.find(offer => offer.id === offerId);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>تحديد مواقع العروض - صفحة {pageNumber}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Grid Layout Selector */}
      <View style={styles.layoutSelector}>
        <Text style={styles.sectionTitle}>اختر تخطيط الشبكة:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(Object.keys(GRID_LAYOUTS) as GridLayoutKey[]).map(key => (
            <TouchableOpacity
              key={key}
              style={[
                styles.layoutButton,
                selectedLayout === key && styles.layoutButtonActive,
              ]}
              onPress={() => setSelectedLayout(key)}
            >
              <Text
                style={[
                  styles.layoutButtonText,
                  selectedLayout === key && styles.layoutButtonTextActive,
                ]}
              >
                {GRID_LAYOUTS[key].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Image with Grid Overlay */}
      <ScrollView style={styles.imageContainer}>
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: pageImageUrl }}
            style={styles.pageImage}
            resizeMode="contain"
            onLoad={() => setImageLoaded(true)}
          />

          {imageLoaded && (
            <View style={styles.gridOverlay}>
              {gridCells.map((cell, index) => {
                const offer = cell.offerId ? getOfferById(cell.offerId) : null;

                return (
                  <TouchableOpacity
                    key={`${cell.row}-${cell.col}`}
                    style={[
                      styles.gridCell,
                      {
                        left: `${cell.x}%`,
                        top: `${cell.y}%`,
                        width: `${cell.width}%`,
                        height: `${cell.height}%`,
                      },
                      offer && styles.gridCellAssigned,
                    ]}
                    onPress={() => handleCellPress(cell)}
                    activeOpacity={0.7}
                  >
                    {offer ? (
                      <View style={styles.cellContent}>
                        <Image
                          source={{ uri: offer.imageUrl }}
                          style={styles.cellImage}
                          resizeMode="cover"
                        />
                        <View style={styles.cellOverlay}>
                          <Text style={styles.cellPrice} numberOfLines={1}>
                            {offer.offerPrice} ج
                          </Text>
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoveOffer(cell)}
                          >
                            <Ionicons name="close-circle" size={20} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.cellPlaceholder}>
                        <Ionicons name="add" size={24} color={colors.gray[400]} />
                        <Text style={styles.cellPlaceholderText}>
                          {index + 1}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Ionicons name="grid-outline" size={20} color={colors.primary} />
          <Text style={styles.statText}>
            {gridCells.length} خلية
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
          <Text style={styles.statText}>
            {gridCells.filter(c => c.offerId).length} معين
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="pricetags-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.statText}>
            {availableOffers.length} عرض متاح
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>إلغاء</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark" size={20} color={colors.white} />
          <Text style={styles.saveButtonText}>حفظ التخطيط</Text>
        </TouchableOpacity>
      </View>

      {/* Offer Picker Modal */}
      <Modal
        visible={showOfferPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOfferPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر عرض</Text>
              <TouchableOpacity onPress={() => setShowOfferPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.offerList}>
              {availableOffers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="pricetag-outline" size={48} color={colors.gray[300]} />
                  <Text style={styles.emptyText}>لا توجد عروض متاحة لهذه الصفحة</Text>
                </View>
              ) : (
                availableOffers.map(offer => {
                  const isAssigned = gridCells.some(cell => cell.offerId === offer.id);

                  return (
                    <TouchableOpacity
                      key={offer.id}
                      style={[
                        styles.offerItem,
                        isAssigned && styles.offerItemAssigned,
                      ]}
                      onPress={() => handleOfferSelect(offer.id)}
                      disabled={isAssigned}
                    >
                      <Image
                        source={{ uri: offer.imageUrl }}
                        style={styles.offerImage}
                        resizeMode="cover"
                      />
                      <View style={styles.offerInfo}>
                        <Text style={styles.offerName} numberOfLines={2}>
                          {offer.nameAr}
                        </Text>
                        <Text style={styles.offerPrice}>
                          {offer.offerPrice} جنيه
                        </Text>
                      </View>
                      {isAssigned && (
                        <View style={styles.assignedBadge}>
                          <Ionicons name="checkmark" size={16} color={colors.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: spacing.sm,
  },
  layoutSelector: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  layoutButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  layoutButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  layoutButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  layoutButtonTextActive: {
    color: colors.primary,
  },
  imageContainer: {
    flex: 1,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    minHeight: 600,
  },
  pageImage: {
    width: '100%',
    height: 600,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridCell: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.primary + '80',
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
    borderStyle: 'dashed',
  },
  gridCellAssigned: {
    borderColor: colors.success,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
  },
  cellContent: {
    flex: 1,
    position: 'relative',
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
  cellOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cellPrice: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    padding: 2,
  },
  cellPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellPlaceholderText: {
    fontSize: 12,
    color: colors.gray[400],
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[200],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  saveButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: screenHeight * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  offerList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  offerItem: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    alignItems: 'center',
  },
  offerItemAssigned: {
    backgroundColor: colors.gray[100],
    opacity: 0.6,
  },
  offerImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
  },
  offerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  offerName: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  offerPrice: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: 'bold',
  },
  assignedBadge: {
    backgroundColor: colors.success,
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});