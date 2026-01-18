// src/components/admin/CatalogueOfferManager.tsx - WITH CATEGORY SELECTION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  I18nManager,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import {
  getCatalogueOffers,
  addCatalogueOffer,
  updateCatalogueOffer,
  deleteCatalogueOffer,
  CatalogueOffer
} from '../../services/catalogueOfferService';
import { getMainCategories, getDetailedSubcategories } from '../../data/categories'; // NEW

interface CatalogueOfferManagerProps {
  catalogueId: string;
  totalPages: number;
  onClose: () => void;
}

export const CatalogueOfferManager: React.FC<CatalogueOfferManagerProps> = ({
  catalogueId,
  totalPages,
  onClose,
}) => {
  const [offers, setOffers] = useState<CatalogueOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<CatalogueOffer | null>(null);

  // NEW - Category states
  const mainCategories = getMainCategories();
  const [selectedMainCategory, setSelectedMainCategory] = useState('');
  const [availableSubcategories, setAvailableSubcategories] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    offerPrice: '',
    originalPrice: '',
    unit: '',
    pageNumber: '1',
    categoryId: '', // This will be the subcategory ID
    imageUrl: '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOffers();
  }, [catalogueId]);

  // NEW - Update subcategories when main category changes
  useEffect(() => {
    if (selectedMainCategory) {
      const subs = getDetailedSubcategories(selectedMainCategory);
      setAvailableSubcategories(subs);

      // Reset subcategory if it doesn't belong to new main category
      const currentSub = subs.find(s => s.id === formData.categoryId);
      if (!currentSub) {
        setFormData(prev => ({ ...prev, categoryId: '' }));
      }
    } else {
      setAvailableSubcategories([]);
    }
  }, [selectedMainCategory]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const data = await getCatalogueOffers(catalogueId);
      setOffers(data.sort((a, b) => a.pageNumber - b.pageNumber));
    } catch (error: any) {
      showAlert('خطأ', 'فشل تحميل العروض: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('تنبيه', 'نحتاج إلى إذن للوصول إلى الصور');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const resetForm = () => {
    setFormData({
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      offerPrice: '',
      originalPrice: '',
      unit: '',
      pageNumber: '1',
      categoryId: '',
      imageUrl: '',
    });
    setSelectedImage(null);
    setEditingOffer(null);
    setSelectedMainCategory('');
    setAvailableSubcategories([]);
    setShowForm(false);
  };

  const handleEdit = (offer: CatalogueOffer) => {
    setEditingOffer(offer);
    setFormData({
      nameAr: offer.nameAr,
      nameEn: offer.nameEn,
      descriptionAr: offer.descriptionAr || '',
      descriptionEn: offer.descriptionEn || '',
      offerPrice: offer.offerPrice.toString(),
      originalPrice: offer.originalPrice?.toString() || '',
      unit: offer.unit || '',
      pageNumber: offer.pageNumber.toString(),
      categoryId: offer.categoryId,
      imageUrl: offer.imageUrl,
    });
    setSelectedImage(offer.imageUrl);

    // NEW - Set main category based on subcategory
    const allSubs = mainCategories.map(main =>
      getDetailedSubcategories(main.id)
    ).flat();
    const subcategory = allSubs.find(s => s.id === offer.categoryId);
    if (subcategory?.parentId) {
      setSelectedMainCategory(subcategory.parentId);
    }

    setShowForm(true);
  };

  const handleDelete = async (offer: CatalogueOffer) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`هل أنت متأكد من حذف العرض "${offer.nameAr}"؟`)
      : await new Promise(resolve => {
          Alert.alert(
            'تأكيد الحذف',
            `هل أنت متأكد من حذف العرض "${offer.nameAr}"؟`,
            [
              { text: 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
              { text: 'حذف', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      await deleteCatalogueOffer(catalogueId, offer.id, offer.imageUrl);
      showAlert('نجح', 'تم حذف العرض بنجاح');
      loadOffers();
    } catch (error: any) {
      showAlert('خطأ', 'فشل حذف العرض: ' + error.message);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.nameAr.trim() || !formData.nameEn.trim()) {
      showAlert('خطأ', 'الرجاء إدخال اسم العرض بالعربية والإنجليزية');
      return;
    }

    if (!formData.offerPrice || isNaN(Number(formData.offerPrice))) {
      showAlert('خطأ', 'الرجاء إدخال سعر العرض');
      return;
    }

    // NEW - Validate category
    if (!formData.categoryId) {
      showAlert('خطأ', 'الرجاء اختيار الفئة الفرعية');
      return;
    }

    if (!selectedImage && !editingOffer?.imageUrl) {
      showAlert('خطأ', 'الرجاء اختيار صورة للعرض');
      return;
    }

    try {
      setSubmitting(true);

      const offerData = {
        nameAr: formData.nameAr.trim(),
        nameEn: formData.nameEn.trim(),
        offerPrice: Number(formData.offerPrice),
        pageNumber: Number(formData.pageNumber),
        categoryId: formData.categoryId, // This is the subcategory ID
        imageUrl: selectedImage || formData.imageUrl,
      };

      // Only add optional fields if they have values
      if (formData.descriptionAr?.trim()) {
        offerData.descriptionAr = formData.descriptionAr.trim();
      }
      if (formData.descriptionEn?.trim()) {
        offerData.descriptionEn = formData.descriptionEn.trim();
      }
      if (formData.originalPrice && !isNaN(Number(formData.originalPrice))) {
        offerData.originalPrice = Number(formData.originalPrice);
      }
      if (formData.unit?.trim()) {
        offerData.unit = formData.unit.trim();
      }

      // Convert image to blob for BOTH file:// and blob: URLs
      let imageBlob: Blob | undefined;
      if (selectedImage) {
        // Check if it's a new image (not a Firebase Storage URL)
        if (selectedImage.startsWith('file://') || selectedImage.startsWith('blob:')) {
          try {
            const response = await fetch(selectedImage);
            imageBlob = await response.blob();
            console.log('✅ Image converted to blob for upload');
          } catch (error) {
            console.error('❌ Error converting image to blob:', error);
            showAlert('خطأ', 'فشل تحويل الصورة');
            return;
          }
        }
      }

      if (editingOffer) {
        await updateCatalogueOffer(catalogueId, editingOffer.id, offerData, imageBlob);
        showAlert('نجح', 'تم تحديث العرض بنجاح');
      } else {
        await addCatalogueOffer(catalogueId, offerData as any, imageBlob);
        showAlert('نجح', 'تم إضافة العرض بنجاح');
      }

      resetForm();
      loadOffers();
    } catch (error: any) {
      showAlert('خطأ', 'فشل حفظ العرض: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل العروض...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>إدارة عروض الكتالوج</Text>
          <Text style={styles.subtitle}>
            الكتالوج: {catalogueId} | {offers.length} عرض
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      {showForm ? (
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={styles.formTitle}>
            {editingOffer ? 'تعديل العرض' : 'إضافة عرض جديد'}
          </Text>

          {/* Image Picker */}
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} resizeMode="cover" />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Ionicons name="image-outline" size={48} color={colors.gray[400]} />
                <Text style={styles.imagePickerText}>اختر صورة العرض</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Arabic Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم العرض (عربي) *</Text>
            <TextInput
              style={styles.input}
              value={formData.nameAr}
              onChangeText={(text) => setFormData({ ...formData, nameAr: text })}
              placeholder="أدخل اسم العرض بالعربية"
            />
          </View>

          {/* English Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم العرض (إنجليزي) *</Text>
            <TextInput
              style={styles.input}
              value={formData.nameEn}
              onChangeText={(text) => setFormData({ ...formData, nameEn: text })}
              placeholder="Enter offer name in English"
            />
          </View>

          {/* NEW - Main Category Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>الفئة الرئيسية *</Text>
            {Platform.OS === 'web' ? (
              <select
                value={selectedMainCategory}
                onChange={(e) => setSelectedMainCategory(e.target.value)}
                style={{
                  backgroundColor: colors.gray[100],
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  fontSize: typography.fontSize.md,
                  color: colors.text,
                  border: `1px solid ${colors.gray[200]}`,
                  width: '100%',
                }}
              >
                <option value="">اختر الفئة الرئيسية</option>
                {mainCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.nameAr}
                  </option>
                ))}
              </select>
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedMainCategory}
                  onValueChange={(itemValue) => setSelectedMainCategory(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="اختر الفئة الرئيسية" value="" />
                  {mainCategories.map(category => (
                    <Picker.Item
                      key={category.id}
                      label={category.nameAr}
                      value={category.id}
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {/* NEW - Subcategory Dropdown (only shows when main category selected) */}
          {selectedMainCategory && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>الفئة الفرعية *</Text>
              {Platform.OS === 'web' ? (
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  style={{
                    backgroundColor: colors.gray[100],
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    fontSize: typography.fontSize.md,
                    color: colors.text,
                    border: `1px solid ${colors.gray[200]}`,
                    width: '100%',
                  }}
                >
                  <option value="">اختر الفئة الفرعية</option>
                  {availableSubcategories.map(subcategory => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.nameAr}
                    </option>
                  ))}
                </select>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.categoryId}
                    onValueChange={(itemValue) => setFormData({ ...formData, categoryId: itemValue })}
                    style={styles.picker}
                  >
                    <Picker.Item label="اختر الفئة الفرعية" value="" />
                    {availableSubcategories.map(subcategory => (
                      <Picker.Item
                        key={subcategory.id}
                        label={subcategory.nameAr}
                        value={subcategory.id}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </View>
          )}

          {/* Arabic Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>الوصف (عربي)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.descriptionAr}
              onChangeText={(text) => setFormData({ ...formData, descriptionAr: text })}
              placeholder="أدخل وصف العرض بالعربية"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* English Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>الوصف (إنجليزي)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.descriptionEn}
              onChangeText={(text) => setFormData({ ...formData, descriptionEn: text })}
              placeholder="Enter offer description in English"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Prices */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>سعر العرض *</Text>
              <TextInput
                style={styles.input}
                value={formData.offerPrice}
                onChangeText={(text) => setFormData({ ...formData, offerPrice: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>السعر الأصلي</Text>
              <TextInput
                style={styles.input}
                value={formData.originalPrice}
                onChangeText={(text) => setFormData({ ...formData, originalPrice: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Unit & Page Number */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>الوحدة</Text>
              <TextInput
                style={styles.input}
                value={formData.unit}
                onChangeText={(text) => setFormData({ ...formData, unit: text })}
                placeholder="كجم، لتر، قطعة..."
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>رقم الصفحة *</Text>
              <TextInput
                style={styles.input}
                value={formData.pageNumber}
                onChangeText={(text) => setFormData({ ...formData, pageNumber: text })}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={resetForm}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>إلغاء</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingOffer ? 'تحديث' : 'إضافة'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.white} />
            <Text style={styles.addButtonText}>إضافة عرض جديد</Text>
          </TouchableOpacity>

          <ScrollView style={styles.offersList} showsVerticalScrollIndicator={false}>
            {offers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="pricetag-outline" size={64} color={colors.gray[300]} />
                <Text style={styles.emptyText}>لا توجد عروض في هذا الكتالوج</Text>
              </View>
            ) : (
              offers.map(offer => (
                <View key={offer.id} style={styles.offerCard}>
                  <Image
                    source={{ uri: offer.imageUrl }}
                    style={styles.offerImage}
                    resizeMode="cover"
                  />

                  <View style={styles.offerContent}>
                    <Text style={styles.offerName}>{offer.nameAr}</Text>
                    <Text style={styles.offerNameEn}>{offer.nameEn}</Text>

                    <View style={styles.offerDetails}>
                      <Text style={styles.offerPrice}>
                        {offer.offerPrice} جنيه
                      </Text>
                      {offer.originalPrice && (
                        <Text style={styles.offerOriginalPrice}>
                          {offer.originalPrice} جنيه
                        </Text>
                      )}
                    </View>

                    <Text style={styles.offerPage}>
                      صفحة {offer.pageNumber}
                    </Text>

                    <View style={styles.offerActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(offer)}
                      >
                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                        <Text style={styles.actionButtonText}>تعديل</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(offer)}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                        <Text style={[styles.actionButtonText, styles.deleteButtonText]}>حذف</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
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
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  addButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  offersList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  offerCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  offerImage: {
    width: 120,
    height: 120,
    backgroundColor: colors.gray[100],
  },
  offerContent: {
    flex: 1,
    padding: spacing.md,
  },
  offerName: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  offerNameEn: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  offerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  offerPrice: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
  },
  offerOriginalPrice: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  offerPage: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  offerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  deleteButton: {
    borderColor: colors.error,
  },
  deleteButtonText: {
    color: colors.error,
  },
  form: {
    flex: 1,
    padding: spacing.lg,
  },
  formTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: colors.gray[300],
    borderStyle: 'dashed',
  },
  imagePickerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  button: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.gray[200],
  },
  cancelButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});