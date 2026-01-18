
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../../config/firebase';
import { pdfConverter } from '../../utils/pdfToImageConverter';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import type { Catalogue } from '../../types';

interface PDFProcessorProps {
  catalogue: Catalogue;
  onComplete?: () => void;
}

export const PDFProcessor: React.FC<PDFProcessorProps> = ({
  catalogue,
  onComplete,
}) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const [error, setError] = useState<string | null>(null);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n\n${message}`);
    }
  };

  const processAndUpload = async () => {
    if (!catalogue.pdfUrl) {
      showAlert('خطأ', 'لا يوجد رابط PDF لهذا الكتالوج');
      return;
    }

    setProcessing(true);
    setError(null);
    setProgress({ current: 0, total: 0, stage: 'جاري التحضير...' });

    try {
      console.log('🔄 Starting PDF processing...');

      // Step 1: Get PDF info
      setProgress({ current: 0, total: 0, stage: 'جاري قراءة معلومات PDF...' });
      const pdfInfo = await pdfConverter.getPDFInfo(catalogue.pdfUrl);
      console.log(`📄 PDF has ${pdfInfo.numPages} pages`);
      
      setProgress({ current: 0, total: pdfInfo.numPages, stage: 'جاري تحويل الصفحات...' });

      // Step 2: Convert pages to images
      console.log('🖼️ Converting pages to images...');
      const images = await pdfConverter.convertAllPages(
        catalogue.pdfUrl,
        2.0, // High quality
        (current, total) => {
          setProgress({ 
            current, 
            total, 
            stage: `تحويل الصفحة ${current} من ${total}...` 
          });
          console.log(`Converting page ${current}/${total}...`);
        }
      );

      console.log(`✅ Converted ${images.length} pages`);

      // Step 3: Upload images to Firebase Storage
      console.log('📤 Uploading images to Firebase...');
      setProgress({ current: 0, total: images.length, stage: 'جاري رفع الصور...' });
      
      const uploadedPages = [];

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const storageRef = ref(
          storage,
          `catalogue-pages/${catalogue.id}/page-${image.pageNumber}.jpg`
        );

        setProgress({ 
          current: i + 1, 
          total: images.length, 
          stage: `رفع الصفحة ${i + 1} من ${images.length}...` 
        });

        // Upload base64 image
        await uploadString(storageRef, image.imageDataUrl, 'data_url');

        // Get download URL
        const imageUrl = await getDownloadURL(storageRef);

        uploadedPages.push({
          pageNumber: image.pageNumber,
          imageUrl,
        });

        console.log(`Uploaded page ${i + 1}/${images.length}`);
      }

      // Step 4: Update Firestore
      console.log('💾 Updating Firestore...');
      setProgress({ 
        current: images.length, 
        total: images.length, 
        stage: 'جاري حفظ البيانات...' 
      });
      
      const catalogueRef = doc(db, 'catalogues', catalogue.id);
      await updateDoc(catalogueRef, {
        pages: uploadedPages,
        totalPages: images.length,
        pdfProcessed: true,
        processedAt: new Date().toISOString(),
      });

      console.log('🎉 Processing complete!');
      setProcessing(false);
      setProgress({ current: images.length, total: images.length, stage: 'تمت المعالجة!' });
      
      showAlert('✅ نجح', `تم معالجة ${images.length} صفحة بنجاح!`);
      
      if (onComplete) {
        setTimeout(onComplete, 1000);
      }
    } catch (err: any) {
      console.error('❌ Error processing PDF:', err);
      setError(err.message || 'فشل معالجة PDF');
      setProcessing(false);
      showAlert('خطأ', err.message || 'حدث خطأ أثناء المعالجة');
    }
  };

  // Check if already processed
  const isProcessed = catalogue.pages && catalogue.pages.length > 0;

  return (
    <View style={styles.container}>
      {!isProcessed && !processing && !error && (
        <TouchableOpacity style={styles.button} onPress={processAndUpload}>
          <Ionicons name="images-outline" size={20} color={colors.white} />
          <Text style={styles.buttonText}>تحويل PDF إلى صور</Text>
        </TouchableOpacity>
      )}

      {processing && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stageText}>{progress.stage}</Text>
          {progress.total > 0 && (
            <>
              <Text style={styles.progressText}>
                {progress.current} / {progress.total}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
            </>
          )}
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={processAndUpload}>
            <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      )}

      {isProcessed && !processing && (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.successText}>
            تمت المعالجة ({catalogue.pages?.length || 0} صفحة)
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
  },
  stageText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.text,
    textAlign: 'center',
  },
  progressText: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  successText: {
    color: colors.success,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
});