// src/components/admin/CatalogueUploadForm.tsx - WITH CATEGORY AND LOCAL STORE NAME SELECTION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  I18nManager,
  Platform,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { storage, db } from '../../config/firebase';
import { pdfConverter } from '../../utils/pdfToImageConverter';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { useAppSelector } from '../../store/hooks';
import { getMainCategories, getCategoryById } from '../../data/categories';
import { getSuggestedCategoryForStore } from '../../utils/catalogueUtils';
import {
  getLocalStoreNamesByGovernorate,
  getLocalStoreNamesByCity,
  getLocalStoreNameById,
  getCitiesByGovernorate,
  getGovernorateName,
  getCityName,
  governorateNames,
  cityNames,
  type GovernorateId,
  type CityId,
} from '../../data/stores';
import { compressImage, getOptimalSettings } from '../../services/imageCompressionService';


interface CatalogueUploadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface UploadProgress {
  stage: string;
  current: number;
  total: number;
  percentage: number;
}

type UploadType = 'pdf' | 'images' | null;

export const CatalogueUploadForm: React.FC<CatalogueUploadFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const stores = useAppSelector(state => state.stores.stores);
  const mainCategories = getMainCategories();

  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Local store identification fields
  const [localStoreGovernorate, setLocalStoreGovernorate] = useState<GovernorateId | ''>('');
  const [localStoreCity, setLocalStoreCity] = useState<CityId | ''>('');
  const [selectedLocalStoreNameId, setSelectedLocalStoreNameId] = useState<string>('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType>(null);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    stage: '',
    current: 0,
    total: 0,
    percentage: 0,
  });

  // Auto-select category when store changes
  useEffect(() => {
    if (selectedStoreId && !selectedCategoryId) {
      const suggestedCategory = getSuggestedCategoryForStore(selectedStoreId);
      setSelectedCategoryId(suggestedCategory);
    }
  }, [selectedStoreId]);

  // Check if selected store is local
  const selectedStore = stores.find(s => s.id === selectedStoreId);
  const isLocalStore = selectedStore?.isLocal || false;

  // Reset local store fields when switching between national and local stores
  useEffect(() => {
    if (!isLocalStore) {
      setLocalStoreGovernorate('');
      setLocalStoreCity('');
      setSelectedLocalStoreNameId('');
    } else if (selectedStore?.governorate) {
      // Auto-set governorate for local store
      setLocalStoreGovernorate(selectedStore.governorate as GovernorateId);
    }
  }, [isLocalStore, selectedStore]);

  // Get available cities for selected governorate
  const availableCities = localStoreGovernorate
    ? getCitiesByGovernorate(localStoreGovernorate)
    : [];

  // Get available local store names based on location
  const availableLocalStoreNames = React.useMemo(() => {
    if (!localStoreGovernorate) return [];

    if (localStoreCity) {
      return getLocalStoreNamesByCity(localStoreGovernorate, localStoreCity);
    }

    return getLocalStoreNamesByGovernorate(localStoreGovernorate);
  }, [localStoreGovernorate, localStoreCity]);

  // Reset local store name when location changes
  useEffect(() => {
    if (selectedLocalStoreNameId) {
      const isStillAvailable = availableLocalStoreNames.some(
        store => store.id === selectedLocalStoreNameId
      );
      if (!isStillAvailable) {
        setSelectedLocalStoreNameId('');
      }
    }
  }, [availableLocalStoreNames]);

  const handlePickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
        setSelectedImages([]);
        setUploadType('pdf');
      }
    } catch (error) {
      console.error('Error picking PDF:', error);
      showAlert('خطأ', 'فشل اختيار الملف');
    }
  };

  const handlePickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('تنبيه', 'نحتاج إلى إذن للوصول إلى الصور');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.9,
        orderedSelection: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImages(result.assets);
        setSelectedFile(null);
        setUploadType('images');
      }
    } catch (error) {
      console.error('Error picking images:', error);
      showAlert('خطأ', 'فشل اختيار الصور');
    }
  };

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n\n${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'موافق', onPress: onOk }] : undefined);
    }
  };

  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setStartDate(dateStr);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setEndDate(dateStr);
    }
  };

  const validateForm = (): boolean => {
    if (!titleAr.trim()) {
      showAlert('خطأ', 'يرجى إدخال العنوان بالعربية');
      return false;
    }
    if (!titleEn.trim()) {
      showAlert('خطأ', 'يرجى إدخال العنوان بالإنجليزية');
      return false;
    }
    if (!selectedStoreId) {
      showAlert('خطأ', 'يرجى اختيار المتجر');
      return false;
    }
    if (!selectedCategoryId) {
      showAlert('خطأ', 'يرجى اختيار الفئة');
      return false;
    }

    // Validate local store fields if it's a local store
    if (isLocalStore) {
      if (!localStoreGovernorate) {
        showAlert('خطأ', 'يرجى اختيار المحافظة للمتجر المحلي');
        return false;
      }
      // Local store name is optional but city selection helps narrow it down
    }

    if (!startDate.trim()) {
      showAlert('خطأ', 'يرجى إدخال تاريخ البداية');
      return false;
    }
    if (!endDate.trim()) {
      showAlert('خطأ', 'يرجى إدخال تاريخ النهاية');
      return false;
    }
    if (!uploadType) {
      showAlert('خطأ', 'يرجى اختيار PDF أو صور');
      return false;
    }
    if (uploadType === 'pdf' && !selectedFile) {
      showAlert('خطأ', 'يرجى اختيار ملف PDF');
      return false;
    }
    if (uploadType === 'images' && selectedImages.length === 0) {
      showAlert('خطأ', 'يرجى اختيار صور على الأقل');
      return false;
    }
    return true;
  };

  const handleUpload = async () => {
    if (!validateForm()) {
      return;
    }

    const selectedStore = stores.find(s => s.id === selectedStoreId);
    if (!selectedStore) {
      showAlert('خطأ', 'المتجر المحدد غير موجود');
      return;
    }

    try {
      setUploading(true);

      console.log('🔤 Starting upload process...');
      console.log('Upload type:', uploadType);

      // Generate ID: storeId-YYYY-MM-DD-HHMM
      setProgress({
        stage: 'جاري إنشاء المعرف...',
        current: 0,
        total: 5,
        percentage: 5,
      });

      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const catalogueId = `${selectedStore.id}-${startDate}-${hours}${minutes}`;

      console.log('🆔 Generated catalogue ID:', catalogueId);

      // Check if catalogue ID already exists
      const catalogueRef = doc(db, 'catalogues', catalogueId);
      const existingDoc = await getDoc(catalogueRef);

      if (existingDoc.exists()) {
        showAlert('خطأ', 'يوجد كتالوج بنفس التاريخ والوقت. يرجى الانتظار دقيقة وإعادة المحاولة.');
        setUploading(false);
        return;
      }

      console.log('✅ Catalogue ID available:', catalogueId);

      if (uploadType === 'pdf') {
        await handlePDFUpload(catalogueId, selectedStore);
      } else if (uploadType === 'images') {
        await handleImagesUpload(catalogueId, selectedStore);
      }

    } catch (error: any) {
      console.error('❌ Upload error:', error);
      showAlert('❌ خطأ', 'فشل رفع الكتالوج: ' + (error.message || 'حدث خطأ غير متوقع'));
    } finally {
      setUploading(false);
      setProgress({
        stage: '',
        current: 0,
        total: 0,
        percentage: 0,
      });
    }
  };

  const handlePDFUpload = async (catalogueId: string, selectedStore: any) => {
    console.log('📄 Processing PDF upload...');

    setProgress({
      stage: 'جاري رفع ملف PDF...',
      current: 0,
      total: 4,
      percentage: 0,
    });

    const pdfBlob = await fetch(selectedFile!.uri).then(r => r.blob());
    const pdfRef = ref(storage, `catalogues/${catalogueId}.pdf`);
    await uploadBytes(pdfRef, pdfBlob);
    const pdfUrl = await getDownloadURL(pdfRef);

    console.log('✅ PDF uploaded:', pdfUrl);

    setProgress({
      stage: 'جاري قراءة معلومات PDF...',
      current: 1,
      total: 4,
      percentage: 25,
    });

    const pdfInfo = await pdfConverter.getPDFInfo(pdfUrl);
    console.log(`📄 PDF has ${pdfInfo.numPages} pages`);

    setProgress({
      stage: 'جاري تحويل الصفحات إلى صور...',
      current: 1,
      total: 4,
      percentage: 25,
    });

    const images = await pdfConverter.convertAllPages(
      pdfUrl,
      2.0,
      (current, total) => {
        const percentage = 25 + (current / total) * 25;
        setProgress({
          stage: `تحويل الصفحة ${current} من ${total}...`,
          current: 1,
          total: 4,
          percentage,
        });
      }
    );

    console.log(`✅ Converted ${images.length} pages to images`);

    setProgress({
      stage: 'جاري رفع صور الصفحات...',
      current: 2,
      total: 4,
      percentage: 50,
    });

    const uploadedPages = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const storageRef = ref(
        storage,
        `catalogue-pages/${catalogueId}/page-${image.pageNumber}.jpg`
      );

      const percentage = 50 + ((i + 1) / images.length) * 25;
      setProgress({
        stage: `رفع الصفحة ${i + 1} من ${images.length}...`,
        current: 2,
        total: 4,
        percentage,
      });

      await uploadString(storageRef, image.imageDataUrl, 'data_url');
      const imageUrl = await getDownloadURL(storageRef);

      uploadedPages.push({
        pageNumber: image.pageNumber,
        imageUrl,
      });

      console.log(`Uploaded page ${i + 1}/${images.length}`);
    }

    setProgress({
      stage: 'جاري إنشاء صورة الغلاف...',
      current: 3,
      total: 4,
      percentage: 75,
    });

    const coverRef = ref(storage, `catalogue-covers/${catalogueId}.jpg`);
    await uploadString(coverRef, images[0].imageDataUrl, 'data_url');
    const coverImageUrl = await getDownloadURL(coverRef);

    console.log('✅ Cover image created');

    await saveCatalogueToFirestore(
      catalogueId,
      selectedStore,
      uploadedPages,
      pdfUrl,
      coverImageUrl
    );
  };

  const handleImagesUpload = async (catalogueId: string, selectedStore: any) => {
  console.log('🖼️ Processing images upload with compression...');

  setProgress({
    stage: 'جاري ضغط وتحميل الصور...',
    current: 0,
    total: selectedImages.length + 1, // +1 for cover
    percentage: 0,
  });

  const uploadedPages = [];
  let coverImageUrl = '';

  // Step 1: Compress and upload all images
  for (let i = 0; i < selectedImages.length; i++) {
    const image = selectedImages[i];
    const pageNumber = i + 1;
    const isFirstImage = i === 0;

    const percentage = ((i + 1) / (selectedImages.length + 1)) * 90;
    setProgress({
      stage: `${isFirstImage ? 'إنشاء صورة الغلاف و' : ''}ضغط وتحميل الصورة ${pageNumber} من ${selectedImages.length}...`,
      current: i + 1,
      total: selectedImages.length + 1,
      percentage,
    });

    try {
      // Compress image based on type
      const compressionSettings = isFirstImage
        ? getOptimalSettings('cover')
        : getOptimalSettings('page');

      console.log(`📦 Compressing image ${pageNumber} with settings:`, compressionSettings);

      const compressedResult = await compressImage(image.uri, compressionSettings);

      // Log compression results
      if (compressedResult.originalSize && compressedResult.compressedSize) {
        console.log(`✅ Image ${pageNumber} compressed: ${(compressedResult.originalSize / 1024).toFixed(1)}KB → ${(compressedResult.compressedSize / 1024).toFixed(1)}KB (${compressedResult.compressionRatio?.toFixed(1)}% reduction)`);
      }

      // Upload compressed image
      const response = await fetch(compressedResult.uri);
      const blob = await response.blob();

      const storageRef = ref(
        storage,
        `catalogue-pages/${catalogueId}/page-${pageNumber}.jpg`
      );
      await uploadBytes(storageRef, blob);
      const imageUrl = await getDownloadURL(storageRef);

      uploadedPages.push({
        pageNumber,
        imageUrl,
      });

      // If this is the first image, also create the cover image
      if (isFirstImage) {
        console.log('📸 Creating cover image from first page...');

        setProgress({
          stage: 'إنشاء صورة الغلاف...',
          current: i + 1,
          total: selectedImages.length + 1,
          percentage: percentage + 2,
        });

        const coverRef = ref(storage, `catalogue-covers/${catalogueId}.jpg`);
        await uploadBytes(coverRef, blob);
        coverImageUrl = await getDownloadURL(coverRef);

        console.log('✅ Cover image created:', coverImageUrl);
      }

      console.log(`✅ Uploaded compressed image ${pageNumber}/${selectedImages.length}`);
    } catch (error) {
      console.error(`❌ Error processing image ${pageNumber}:`, error);
      throw new Error(`فشل معالجة الصورة ${pageNumber}`);
    }
  }

  setProgress({
    stage: 'جاري حفظ البيانات...',
    current: selectedImages.length + 1,
    total: selectedImages.length + 1,
    percentage: 95,
  });

  console.log('✅ All images compressed and uploaded successfully');

  await saveCatalogueToFirestore(
    catalogueId,
    selectedStore,
    uploadedPages,
    null,
    coverImageUrl
  );
};

  const saveCatalogueToFirestore = async (
  catalogueId: string,
  selectedStore: any,
  uploadedPages: any[],
  pdfUrl: string | null,
  coverImageUrl: string
) => {
  setProgress({
    stage: 'جاري حفظ البيانات...',
    current: 4,
    total: 4,
    percentage: 95,
  });

  const catalogueData: any = {
    id: catalogueId,
    storeId: selectedStore.id,
    storeName: selectedStore.nameAr,
    titleAr: titleAr.trim(),
    titleEn: titleEn.trim(),
    startDate: startDate.trim(),
    endDate: endDate.trim(),
    coverImage: coverImageUrl,
    pages: uploadedPages,
    totalPages: uploadedPages.length,
    pdfProcessed: true,
    categoryId: selectedCategoryId,
    uploadMode: uploadType,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // ✅ FIXED: Add local store identification if it's a local store
  if (isLocalStore) {
    console.log('🏪 Processing local store data...');
    console.log('   - isLocalStore:', isLocalStore);
    console.log('   - localStoreGovernorate:', localStoreGovernorate);
    console.log('   - localStoreCity:', localStoreCity);
    console.log('   - selectedLocalStoreNameId:', selectedLocalStoreNameId);

    catalogueData.isLocalStore = true;

    // REQUIRED: Governorate must be set for local stores
    if (localStoreGovernorate) {
      catalogueData.localStoreGovernorate = localStoreGovernorate;
      console.log('   ✅ Added localStoreGovernorate:', localStoreGovernorate);
    } else {
      console.error('   ❌ Missing localStoreGovernorate!');
      throw new Error('Local store must have a governorate');
    }

    // OPTIONAL: City (only if selected)
    if (localStoreCity) {
      catalogueData.localStoreCity = localStoreCity;
      console.log('   ✅ Added localStoreCity:', localStoreCity);
    }

    // ✅ CRITICAL FIX: ALWAYS add local store name fields
    // This was the bug - the else block wasn't always executing
    if (selectedLocalStoreNameId && selectedLocalStoreNameId !== 'unidentified') {
      // User selected a specific local store from the dropdown
      const localStoreName = getLocalStoreNameById(
        selectedLocalStoreNameId,
        localStoreGovernorate as GovernorateId
      );

      if (localStoreName) {
        catalogueData.localStoreNameId = selectedLocalStoreNameId;
        catalogueData.localStoreNameAr = localStoreName.nameAr;
        catalogueData.localStoreNameEn = localStoreName.nameEn;
        console.log('   ✅ Added identified local store:', localStoreName.nameAr);
      } else {
        // Store ID provided but not found in database - fallback to unidentified
        console.warn('   ⚠️ Local store ID not found, using unidentified');
        catalogueData.localStoreNameId = 'unidentified';
        catalogueData.localStoreNameAr = 'غير محدد';
        catalogueData.localStoreNameEn = 'Unidentified';
      }
    } else {
      // ✅ THIS IS THE FIX: Always set unidentified fields when no store selected
      // Or when user explicitly selected "unidentified"
      console.log('   ℹ️ No specific store selected, using unidentified');
      catalogueData.localStoreNameId = 'unidentified';
      catalogueData.localStoreNameAr = 'غير محدد';
      catalogueData.localStoreNameEn = 'Unidentified';
      console.log('   ✅ Added unidentified local store fields');
    }

    // ✅ VALIDATION: Ensure all required local store fields are present
    const requiredFields = ['localStoreGovernorate', 'localStoreNameId', 'localStoreNameAr', 'localStoreNameEn'];
    const missingFields = requiredFields.filter(field => !catalogueData[field]);

    if (missingFields.length > 0) {
      console.error('   ❌ Missing required local store fields:', missingFields);
      throw new Error(`Missing local store fields: ${missingFields.join(', ')}`);
    }

    console.log('   ✅ All local store fields validated');
    console.log('   📋 Final local store data:', {
      localStoreGovernorate: catalogueData.localStoreGovernorate,
      localStoreCity: catalogueData.localStoreCity || 'N/A',
      localStoreNameId: catalogueData.localStoreNameId,
      localStoreNameAr: catalogueData.localStoreNameAr,
      localStoreNameEn: catalogueData.localStoreNameEn,
    });
  }

  if (pdfUrl) {
    catalogueData.pdfUrl = pdfUrl;
  }

  // Save to Firestore
  const catalogueRef = doc(db, 'catalogues', catalogueId);
  await setDoc(catalogueRef, catalogueData);

  console.log('✅ Catalogue saved to Firestore with custom ID');
  console.log('📊 Complete catalogue data:', JSON.stringify(catalogueData, null, 2));

  setProgress({
    stage: 'تمت العملية بنجاح!',
    current: 4,
    total: 4,
    percentage: 100,
  });

  // Build success message
  const selectedCategory = getCategoryById(selectedCategoryId);
  let successMessage = `تم رفع الكتالوج بنجاح!\n${uploadedPages.length} صفحة تم رفعها\nمعرف الكتالوج: ${catalogueId}\nالفئة: ${selectedCategory?.nameAr || 'غير محدد'}`;

  if (isLocalStore) {
    const govName = getGovernorateName(localStoreGovernorate as GovernorateId);
    successMessage += `\nالمحافظة: ${govName}`;

    if (localStoreCity) {
      const cityName = getCityName(localStoreCity);
      successMessage += `\nالمدينة: ${cityName}`;
    }

    if (selectedLocalStoreNameId && selectedLocalStoreNameId !== 'unidentified') {
      const localStoreName = getLocalStoreNameById(
        selectedLocalStoreNameId,
        localStoreGovernorate as GovernorateId
      );
      if (localStoreName) {
        successMessage += `\nاسم المتجر المحلي: ${localStoreName.nameAr}`;
      }
    } else {
      successMessage += `\nاسم المتجر المحلي: غير محدد`;
    }
  }

  showAlert('✅ نجح', successMessage, onSuccess);
};

  const selectedCategory = getCategoryById(selectedCategoryId);
  const selectedLocalStoreName = selectedLocalStoreNameId && localStoreGovernorate
    ? getLocalStoreNameById(selectedLocalStoreNameId, localStoreGovernorate as GovernorateId)
    : null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>إضافة كتالوج جديد</Text>
        <TouchableOpacity onPress={onCancel} disabled={uploading}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.noticeBox}>
        <Ionicons name="information-circle" size={24} color={colors.primary} />
        <View style={styles.noticeTextContainer}>
          <Text style={styles.noticeTitle}>خيارات الرفع</Text>
          <Text style={styles.noticeText}>
            • رفع PDF: سيتم تحويله تلقائياً إلى صور{'\n'}
            • رفع صور: ستبقى كما هي بدون تحويل
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        {/* Title (Arabic) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>العنوان (عربي) *</Text>
          <TextInput
            style={styles.input}
            value={titleAr}
            onChangeText={setTitleAr}
            placeholder="كتالوج كازيون 23-29 ديسمبر"
            placeholderTextColor={colors.gray[400]}
            editable={!uploading}
          />
        </View>

        {/* Title (English) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>العنوان (إنجليزي) *</Text>
          <TextInput
            style={styles.input}
            value={titleEn}
            onChangeText={setTitleEn}
            placeholder="Kazyon Catalogue Dec 23-29"
            placeholderTextColor={colors.gray[400]}
            editable={!uploading}
          />
        </View>

        {/* Store Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>المتجر *</Text>
          {Platform.OS === 'web' ? (
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              style={{
                backgroundColor: colors.gray[100],
                borderRadius: borderRadius.md,
                padding: spacing.md,
                fontSize: typography.fontSize.md,
                color: colors.text,
                border: `1px solid ${colors.gray[200]}`,
                width: '100%',
              }}
              disabled={uploading}
            >
              <option value="">اختر المتجر</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.nameAr} ({store.nameEn}) {store.isLocal ? '- محلي' : ''}
                </option>
              ))}
            </select>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedStoreId}
                onValueChange={(itemValue) => setSelectedStoreId(itemValue)}
                enabled={!uploading}
                style={styles.picker}
              >
                <Picker.Item label="اختر المتجر" value="" />
                {stores.map(store => (
                  <Picker.Item
                    key={store.id}
                    label={`${store.nameAr} (${store.nameEn})${store.isLocal ? ' - محلي' : ''}`}
                    value={store.id}
                  />
                ))}
              </Picker>
            </View>
          )}
          {selectedStore && (
            <Text style={styles.helperText}>
              المتجر المحدد: {selectedStore.nameAr} {isLocalStore && '(متجر محلي)'}
            </Text>
          )}
        </View>

        {/* LOCAL STORE IDENTIFICATION SECTION */}
        {isLocalStore && (
          <View style={styles.localStoreSection}>
            <View style={styles.localStoreSectionHeader}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text style={styles.localStoreSectionTitle}>تحديد المتجر المحلي</Text>
            </View>

            {/* Governorate (auto-filled for local stores) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>المحافظة *</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={localStoreGovernorate ? governorateNames[localStoreGovernorate as GovernorateId]?.ar || '' : ''}
                editable={false}
              />
              <Text style={styles.helperText}>
                تم تحديد المحافظة تلقائياً من المتجر المحلي
              </Text>
            </View>

            {/* City Dropdown (optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>المدينة (اختياري)</Text>
              {Platform.OS === 'web' ? (
                <select
                  value={localStoreCity}
                  onChange={(e) => setLocalStoreCity(e.target.value as CityId)}
                  style={{
                    backgroundColor: colors.gray[100],
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    fontSize: typography.fontSize.md,
                    color: colors.text,
                    border: `1px solid ${colors.gray[200]}`,
                    width: '100%',
                  }}
                  disabled={uploading || !localStoreGovernorate}
                >
                  <option value="">اختر المدينة (اختياري)</option>
                  {availableCities.map(cityId => {
                    const cityInfo = cityNames[cityId];
                    return (
                      <option key={cityId} value={cityId}>
                        {cityInfo.ar}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={localStoreCity}
                    onValueChange={(itemValue) => setLocalStoreCity(itemValue as CityId)}
                    enabled={!uploading && !!localStoreGovernorate}
                    style={styles.picker}
                  >
                    <Picker.Item label="اختر المدينة (اختياري)" value="" />
                    {availableCities.map(cityId => {
                      const cityInfo = cityNames[cityId];
                      return (
                        <Picker.Item
                          key={cityId}
                          label={cityInfo.ar}
                          value={cityId}
                        />
                      );
                    })}
                  </Picker>
                </View>
              )}
              <Text style={styles.helperText}>
                اختر المدينة لتضييق خيارات المتاجر المحلية
              </Text>
            </View>

          {/* Local Store Name Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>اسم المتجر المحلي (اختياري)</Text>
              {Platform.OS === 'web' ? (
                <select
                  value={selectedLocalStoreNameId}
                  onChange={(e) => setSelectedLocalStoreNameId(e.target.value)}
                  style={{
                    backgroundColor: colors.gray[100],
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    fontSize: typography.fontSize.md,
                    color: colors.text,
                    border: `1px solid ${colors.gray[200]}`,
                    width: '100%',
                  }}
                  disabled={uploading || !localStoreGovernorate}
                >
                  <option value="">اختر اسم المتجر (اختياري)</option>
                  <option value="unidentified">غير محدد</option>
                  {availableLocalStoreNames.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.nameAr} - {store.nameEn}
                    </option>
                  ))}
                </select>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedLocalStoreNameId}
                    onValueChange={(itemValue) => setSelectedLocalStoreNameId(itemValue)}
                    enabled={!uploading && !!localStoreGovernorate}
                    style={styles.picker}
                  >
                    <Picker.Item label="اختر اسم المتجر (اختياري)" value="" />
                    <Picker.Item label="غير محدد" value="unidentified" />
                    {availableLocalStoreNames.map(store => (
                      <Picker.Item
                        key={store.id}
                        label={`${store.nameAr} - ${store.nameEn}`}
                        value={store.id}
                      />
                    ))}
                  </Picker>
                </View>
              )}
              {selectedLocalStoreName && (
                <View style={styles.categoryPreview}>
                  <Ionicons name="storefront" size={20} color={colors.primary} />
                  <Text style={styles.helperText}>
                    المتجر المحدد: {selectedLocalStoreName.nameAr}
                  </Text>
                </View>
              )}
              {selectedLocalStoreNameId === 'unidentified' && (
                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.warning} />
                  <Text style={styles.warningText}>
                    سيتم تعليم هذا الكتالوج كـ "غير محدد"
                  </Text>
                </View>
              )}
              <Text style={styles.helperText}>
                {availableLocalStoreNames.length > 0
                  ? `${availableLocalStoreNames.length} متجر متاح في الموقع المحدد`
                  : 'لا توجد متاجر محلية محددة في هذا الموقع'}
              </Text>
            </View>
          </View>
        )}

        {/* Category Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>الفئة الرئيسية *</Text>
          {Platform.OS === 'web' ? (
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              style={{
                backgroundColor: colors.gray[100],
                borderRadius: borderRadius.md,
                padding: spacing.md,
                fontSize: typography.fontSize.md,
                color: colors.text,
                border: `1px solid ${colors.gray[200]}`,
                width: '100%',
              }}
              disabled={uploading}
            >
              <option value="">اختر الفئة</option>
              {mainCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.nameAr} - {category.nameEn}
                </option>
              ))}
            </select>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCategoryId}
                onValueChange={(itemValue) => setSelectedCategoryId(itemValue)}
                enabled={!uploading}
                style={styles.picker}
              >
                <Picker.Item label="اختر الفئة" value="" />
                {mainCategories.map(category => (
                  <Picker.Item
                    key={category.id}
                    label={`${category.nameAr} - ${category.nameEn}`}
                    value={category.id}
                  />
                ))}
              </Picker>
            </View>
          )}
          {selectedCategory && (
            <View style={styles.categoryPreview}>
              <Ionicons
                name={selectedCategory.icon as any}
                size={20}
                color={selectedCategory.color || colors.primary}
              />
              <Text style={styles.helperText}>
                الفئة المحددة: {selectedCategory.nameAr}
              </Text>
            </View>
          )}
        </View>

        {/* Start Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>تاريخ البداية *</Text>
          {Platform.OS === 'web' ? (
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2026-01-05"
              placeholderTextColor={colors.gray[400]}
              editable={!uploading}
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
                disabled={uploading}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={styles.dateButtonText}>
                  {startDate ? formatDateForDisplay(startDate) : 'اختر تاريخ البداية'}
                </Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate ? new Date(startDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={handleStartDateChange}
                />
              )}
            </>
          )}
        </View>

        {/* End Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>تاريخ النهاية *</Text>
          {Platform.OS === 'web' ? (
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="2026-02-02"
              placeholderTextColor={colors.gray[400]}
              editable={!uploading}
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
                disabled={uploading}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={styles.dateButtonText}>
                  {endDate ? formatDateForDisplay(endDate) : 'اختر تاريخ النهاية'}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate ? new Date(endDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={handleEndDateChange}
                  minimumDate={startDate ? new Date(startDate) : undefined}
                />
              )}
            </>
          )}
        </View>

        {/* Upload Type Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>نوع الرفع *</Text>
          <View style={styles.uploadTypeButtons}>
            <TouchableOpacity
              style={[
                styles.uploadTypeButton,
                uploadType === 'pdf' && styles.uploadTypeButtonActive,
              ]}
              onPress={handlePickPDF}
              disabled={uploading}
            >
              <Ionicons
                name="document-text"
                size={24}
                color={uploadType === 'pdf' ? colors.white : colors.primary}
              />
              <Text
                style={[
                  styles.uploadTypeButtonText,
                  uploadType === 'pdf' && styles.uploadTypeButtonTextActive,
                ]}
              >
                رفع PDF
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.uploadTypeButton,
                uploadType === 'images' && styles.uploadTypeButtonActive,
              ]}
              onPress={handlePickImages}
              disabled={uploading}
            >
              <Ionicons
                name="images"
                size={24}
                color={uploadType === 'images' ? colors.white : colors.primary}
              />
              <Text
                style={[
                  styles.uploadTypeButtonText,
                  uploadType === 'images' && styles.uploadTypeButtonTextActive,
                ]}
              >
                رفع صور
              </Text>
            </TouchableOpacity>
          </View>

          {selectedFile && (
            <View style={styles.selectedFileInfo}>
              <Ionicons name="document-attach" size={20} color={colors.primary} />
              <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
              <Text style={styles.selectedFileSize}>
                {(selectedFile.size! / 1024 / 1024).toFixed(2)} MB
              </Text>
            </View>
          )}

          {selectedImages.length > 0 && (
            <View style={styles.selectedFileInfo}>
              <Ionicons name="images" size={20} color={colors.primary} />
              <Text style={styles.selectedFileName}>
                {selectedImages.length} صورة محددة
              </Text>
            </View>
          )}
        </View>

        {/* Upload Progress */}
        {uploading && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stageText}>{progress.stage}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress.percentage}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress.percentage)}%</Text>
            {progress.total > 0 && (
              <Text style={styles.progressStepText}>
                الخطوة {progress.current} من {progress.total}
              </Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={uploading}
          >
            <Text style={styles.cancelButtonText}>إلغاء</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.uploadButton, uploading && styles.buttonDisabled]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color={colors.white} />
                <Text style={styles.uploadButtonText}>رفع ومعالجة</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  noticeBox: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: colors.primaryLight + '20',
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  noticeTextContainer: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  noticeText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    lineHeight: 20,
  },
  form: {
    padding: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  input: {
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  inputDisabled: {
    opacity: 0.6,
  },
  pickerContainer: {
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  helperText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    marginTop: spacing.xs,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  categoryPreview: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  localStoreSection: {
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  localStoreSectionHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  localStoreSectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
  },
  warningBox: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning,
    flex: 1,
  },
  dateButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    gap: spacing.sm,
  },
  dateButtonText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  uploadTypeButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  uploadTypeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  uploadTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  uploadTypeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  uploadTypeButtonTextActive: {
    color: colors.white,
  },
  selectedFileInfo: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  selectedFileName: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text,
  },
  selectedFileSize: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  progressContainer: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  stageText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.md,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.lg,
    color: colors.primary,
    fontWeight: 'bold',
  },
  progressStepText: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cancelButton: {
    backgroundColor: colors.gray[200],
  },
  cancelButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  uploadButton: {
    backgroundColor: colors.primary,
  },
  uploadButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});