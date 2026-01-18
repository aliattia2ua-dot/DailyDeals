 // src/components/admin/AdminConfigManager.tsx - PART 1 OF 2
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAppSelector } from '../../store/hooks';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { Button } from '../common/Button';
import { AdBanner, InterstitialAd } from '../../types/appConfig';

// ✅ UPDATED: Added layout-level positions with categories
const AVAILABLE_POSITIONS = [
  // Layout-level positions (NEW)
  {
    id: 'tabs_persistent',
    label: '🌟 Top Layout Banner',
    description: 'Always visible at top of all tabs (persistent)',
    category: 'layout',
    icon: '⬆️'
  },
  {
    id: 'tabs_bottom',
    label: '🌟 Bottom Layout Banner',
    description: 'Always visible above tab bar (persistent)',
    category: 'layout',
    icon: '⬇️'
  },

  // Screen-level positions
  {
    id: 'home',
    label: 'Home Screen',
    description: 'Shows in home screen content',
    category: 'screens'
  },
  {
    id: 'flyers',
    label: 'Flyers Screen',
    description: 'Shows in flyers screen content',
    category: 'screens'
  },
  {
    id: 'search',
    label: 'Search Screen',
    description: 'Shows in search screen content',
    category: 'screens'
  },
  {
    id: 'store',
    label: 'Store Details',
    description: 'Shows in store details screen',
    category: 'screens'
  },
];

const ANNOUNCEMENT_TYPES = [
  { id: 'info', label: 'Info', color: colors.primary },
  { id: 'warning', label: 'Warning', color: colors.warning },
  { id: 'error', label: 'Error', color: colors.error },
  { id: 'success', label: 'Success', color: colors.success },
];

const PRIORITY_LEVELS = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

// ✅ NEW: Helper to group positions by category
const getPositionsByCategory = () => {
  const screens = AVAILABLE_POSITIONS.filter(p => p.category === 'screens');
  const layout = AVAILABLE_POSITIONS.filter(p => p.category === 'layout');
  return { screens, layout };
};

export const AdminConfigManager: React.FC = () => {
  const currentConfig = useAppSelector((state) => state.appConfig.config);
  const [config, setConfig] = useState(currentConfig);
  const [saving, setSaving] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showInterstitialModal, setShowInterstitialModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AdBanner | null>(null);
  const [editingInterstitial, setEditingInterstitial] = useState<InterstitialAd | null>(null);

  useEffect(() => {
    setConfig(currentConfig);
  }, [currentConfig]);

  // Platform-specific alert for web compatibility
  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    if (Platform.OS === 'web') {
      if (onConfirm) {
        if (window.confirm(`${title}\n\n${message}`)) {
          onConfirm();
        }
      } else {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      if (onConfirm) {
        Alert.alert(title, message, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'OK', onPress: onConfirm },
        ]);
      } else {
        Alert.alert(title, message);
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const configRef = doc(db, 'config/app');
      await setDoc(configRef, config);
      showAlert('Success', 'Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      showAlert('Error', 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Toggle position for editing banner
  const toggleEditingBannerPosition = (position: string) => {
    if (!editingBanner) return;

    const currentPositions = editingBanner.positions || [];
    const newPositions = currentPositions.includes(position as any)
      ? currentPositions.filter(p => p !== position)
      : [...currentPositions, position as any];

    setEditingBanner({
      ...editingBanner,
      positions: newPositions,
    });
  };

  const handleAddBanner = () => {
    setEditingBanner({
      id: `banner_${Date.now()}`,
      imageUrl: '',
      targetUrl: '',
      titleAr: '',
      titleEn: '',
      priority: 1,
      positions: [],
      isActive: true,
      startDate: '',
      endDate: '',
    });
    setShowBannerModal(true);
  };

  const handleEditBanner = (banner: AdBanner) => {
    setEditingBanner({
      ...banner,
      imageUrl: banner.imageUrl || '',
      targetUrl: banner.targetUrl || '',
      titleAr: banner.titleAr || '',
      titleEn: banner.titleEn || '',
      positions: banner.positions || [],
      startDate: banner.startDate || '',
      endDate: banner.endDate || '',
    });
    setShowBannerModal(true);
  };

  const handleSaveBanner = () => {
    if (!editingBanner) return;

    if (!editingBanner.imageUrl || !editingBanner.targetUrl) {
      showAlert('Error', 'Image URL and Target URL are required');
      return;
    }

    if (!editingBanner.positions || editingBanner.positions.length === 0) {
      showAlert('Error', 'Please select at least one position for this ad');
      return;
    }

    let targetUrl = editingBanner.targetUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const cleanedBanner: any = {
      id: editingBanner.id,
      imageUrl: editingBanner.imageUrl,
      targetUrl,
      titleAr: editingBanner.titleAr || '',
      titleEn: editingBanner.titleEn || '',
      priority: editingBanner.priority,
      positions: editingBanner.positions,
      isActive: editingBanner.isActive,
    };

    if (editingBanner.startDate?.trim()) {
      cleanedBanner.startDate = editingBanner.startDate.trim();
    }
    if (editingBanner.endDate?.trim()) {
      cleanedBanner.endDate = editingBanner.endDate.trim();
    }

    const existingIndex = config.advertisements.bannerAds.ads.findIndex(
      ad => ad.id === editingBanner.id
    );

    let updatedAds;
    if (existingIndex >= 0) {
      updatedAds = [...config.advertisements.bannerAds.ads];
      updatedAds[existingIndex] = cleanedBanner;
    } else {
      updatedAds = [...config.advertisements.bannerAds.ads, cleanedBanner];
    }

    setConfig({
      ...config,
      advertisements: {
        ...config.advertisements,
        bannerAds: {
          ...config.advertisements.bannerAds,
          ads: updatedAds,
        },
      },
    });

    setShowBannerModal(false);
    setEditingBanner(null);
  };

  const handleDeleteBanner = (bannerId: string) => {
    showAlert(
      'Delete Banner',
      'Are you sure you want to delete this banner ad?',
      () => {
        const updatedAds = config.advertisements.bannerAds.ads.filter(
          ad => ad.id !== bannerId
        );
        setConfig({
          ...config,
          advertisements: {
            ...config.advertisements,
            bannerAds: {
              ...config.advertisements.bannerAds,
              ads: updatedAds,
            },
          },
        });
      }
    );
  };

  const handleAddInterstitial = () => {
    setEditingInterstitial({
      id: `interstitial_${Date.now()}`,
      imageUrl: '',
      targetUrl: '',
      titleAr: '',
      titleEn: '',
      dismissDelay: 3,
      isActive: true,
      startDate: '',
      endDate: '',
    });
    setShowInterstitialModal(true);
  };

  const handleEditInterstitial = (ad: InterstitialAd) => {
    setEditingInterstitial({
      ...ad,
      imageUrl: ad.imageUrl || '',
      targetUrl: ad.targetUrl || '',
      titleAr: ad.titleAr || '',
      titleEn: ad.titleEn || '',
      startDate: ad.startDate || '',
      endDate: ad.endDate || '',
    });
    setShowInterstitialModal(true);
  };

  const handleSaveInterstitial = () => {
    if (!editingInterstitial) return;

    if (!editingInterstitial.imageUrl || !editingInterstitial.targetUrl) {
      showAlert('Error', 'Image URL and Target URL are required');
      return;
    }

    let targetUrl = editingInterstitial.targetUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const cleanedInterstitial: any = {
      id: editingInterstitial.id,
      imageUrl: editingInterstitial.imageUrl,
      targetUrl,
      titleAr: editingInterstitial.titleAr || '',
      titleEn: editingInterstitial.titleEn || '',
      dismissDelay: editingInterstitial.dismissDelay,
      isActive: editingInterstitial.isActive,
    };

    if (editingInterstitial.startDate?.trim()) {
      cleanedInterstitial.startDate = editingInterstitial.startDate.trim();
    }
    if (editingInterstitial.endDate?.trim()) {
      cleanedInterstitial.endDate = editingInterstitial.endDate.trim();
    }

    const existingIndex = config.advertisements.interstitialAds.ads.findIndex(
      ad => ad.id === editingInterstitial.id
    );

    let updatedAds;
    if (existingIndex >= 0) {
      updatedAds = [...config.advertisements.interstitialAds.ads];
      updatedAds[existingIndex] = cleanedInterstitial;
    } else {
      updatedAds = [...config.advertisements.interstitialAds.ads, cleanedInterstitial];
    }

    setConfig({
      ...config,
      advertisements: {
        ...config.advertisements,
        interstitialAds: {
          ...config.advertisements.interstitialAds,
          ads: updatedAds,
        },
      },
    });

    setShowInterstitialModal(false);
    setEditingInterstitial(null);
  };

  const handleDeleteInterstitial = (adId: string) => {
    showAlert(
      'Delete Interstitial',
      'Are you sure you want to delete this interstitial ad?',
      () => {
        const updatedAds = config.advertisements.interstitialAds.ads.filter(
          ad => ad.id !== adId
        );
        setConfig({
          ...config,
          advertisements: {
            ...config.advertisements,
            interstitialAds: {
              ...config.advertisements.interstitialAds,
              ads: updatedAds,
            },
          },
        });
      }
    );
  };


return (
    <>
      <ScrollView style={styles.container}>
        {/* ANNOUNCEMENT BAR SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📢 Announcement Bar</Text>
          <Text style={styles.sectionDescription}>
            Display important messages at the top of all screens
          </Text>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Enable Announcement Bar</Text>
            <Switch
              value={config.announcementBar.enabled}
              onValueChange={(value) =>
                setConfig({
                  ...config,
                  announcementBar: { ...config.announcementBar, enabled: value },
                })
              }
            />
          </View>

          {config.announcementBar.enabled && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Message (Arabic)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={config.announcementBar.message.ar}
                  onChangeText={(text) =>
                    setConfig({
                      ...config,
                      announcementBar: {
                        ...config.announcementBar,
                        message: { ...config.announcementBar.message, ar: text },
                      },
                    })
                  }
                  placeholder="أدخل الرسالة بالعربية"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Message (English)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={config.announcementBar.message.en}
                  onChangeText={(text) =>
                    setConfig({
                      ...config,
                      announcementBar: {
                        ...config.announcementBar,
                        message: { ...config.announcementBar.message, en: text },
                      },
                    })
                  }
                  placeholder="Enter message in English"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.typeSelector}>
                  {ANNOUNCEMENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeButton,
                        config.announcementBar.type === type.id && styles.typeButtonActive,
                        { borderColor: type.color },
                      ]}
                      onPress={() =>
                        setConfig({
                          ...config,
                          announcementBar: {
                            ...config.announcementBar,
                            type: type.id as any,
                          },
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          config.announcementBar.type === type.id && {
                            color: type.color,
                            fontWeight: 'bold',
                          },
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.typeSelector}>
                  {PRIORITY_LEVELS.map((priority) => (
                    <TouchableOpacity
                      key={priority.id}
                      style={[
                        styles.typeButton,
                        config.announcementBar.priority === priority.id &&
                          styles.typeButtonActive,
                      ]}
                      onPress={() =>
                        setConfig({
                          ...config,
                          announcementBar: {
                            ...config.announcementBar,
                            priority: priority.id as any,
                          },
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          config.announcementBar.priority === priority.id && {
                            color: colors.primary,
                            fontWeight: 'bold',
                          },
                        ]}
                      >
                        {priority.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>User Can Dismiss</Text>
                <Switch
                  value={config.announcementBar.dismissible}
                  onValueChange={(value) =>
                    setConfig({
                      ...config,
                      announcementBar: {
                        ...config.announcementBar,
                        dismissible: value,
                      },
                    })
                  }
                />
              </View>

              {/* Action Button (Optional) */}
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Action Button (Optional)</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Button Label (Arabic)</Text>
                  <TextInput
                    style={styles.input}
                    value={config.announcementBar.action?.label.ar || ''}
                    onChangeText={(text) =>
                      setConfig({
                        ...config,
                        announcementBar: {
                          ...config.announcementBar,
                          action: {
                            ...config.announcementBar.action,
                            label: {
                              ar: text,
                              en: config.announcementBar.action?.label.en || '',
                            },
                          },
                        },
                      })
                    }
                    placeholder="مثال: اعرف المزيد"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Button Label (English)</Text>
                  <TextInput
                    style={styles.input}
                    value={config.announcementBar.action?.label.en || ''}
                    onChangeText={(text) =>
                      setConfig({
                        ...config,
                        announcementBar: {
                          ...config.announcementBar,
                          action: {
                            ...config.announcementBar.action,
                            label: {
                              ar: config.announcementBar.action?.label.ar || '',
                              en: text,
                            },
                          },
                        },
                      })
                    }
                    placeholder="e.g., Learn More"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Action URL (leave empty for no button)</Text>
                  <TextInput
                    style={styles.input}
                    value={config.announcementBar.action?.url || ''}
                    onChangeText={(text) =>
                      setConfig({
                        ...config,
                        announcementBar: {
                          ...config.announcementBar,
                          action: {
                            ...config.announcementBar.action,
                            url: text,
                            label: config.announcementBar.action?.label || { ar: '', en: '' },
                          },
                        },
                      })
                    }
                    placeholder="https://example.com"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Preview */}
              <View style={styles.previewSection}>
                <Text style={styles.label}>Preview:</Text>
                <View
                  style={[
                    styles.previewBar,
                    {
                      backgroundColor:
                        ANNOUNCEMENT_TYPES.find((t) => t.id === config.announcementBar.type)
                          ?.color || colors.primary,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      config.announcementBar.type === 'error'
                        ? 'alert-circle'
                        : config.announcementBar.type === 'warning'
                        ? 'warning'
                        : config.announcementBar.type === 'success'
                        ? 'checkmark-circle'
                        : 'information-circle'
                    }
                    size={18}
                    color={colors.white}
                  />
                  <Text style={styles.previewText}>
                    {config.announcementBar.message.en || 'Your message here...'}
                  </Text>
                  {config.announcementBar.dismissible && (
                    <Ionicons name="close" size={18} color={colors.white} />
                  )}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Advertisement Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Advertisements</Text>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Enable Ads (Master)</Text>
            <Switch
              value={config.features.enableAds}
              onValueChange={(value) =>
                setConfig({
                  ...config,
                  features: { ...config.features, enableAds: value },
                })
              }
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Enable Advertisements</Text>
            <Switch
              value={config.advertisements.enabled}
              onValueChange={(value) =>
                setConfig({
                  ...config,
                  advertisements: { ...config.advertisements, enabled: value },
                })
              }
            />
          </View>

          {/* Banner Ads Section */}
          <View style={styles.subsection}>
            <View style={styles.subsectionHeader}>
              <Text style={styles.subsectionTitle}>Banner Ads</Text>
              <Switch
                value={config.advertisements.bannerAds.enabled}
                onValueChange={(value) =>
                  setConfig({
                    ...config,
                    advertisements: {
                      ...config.advertisements,
                      bannerAds: {
                        ...config.advertisements.bannerAds,
                        enabled: value,
                      },
                    },
                  })
                }
              />
            </View>

            <View style={styles.adList}>
              {config.advertisements.bannerAds.ads.map((ad) => (
                <View key={ad.id} style={styles.adItem}>
                  <View style={styles.adItemContent}>
                    <Text style={styles.adItemTitle}>
                      {ad.titleAr || ad.titleEn || 'Untitled'}
                    </Text>
                    <Text style={styles.adItemSubtitle}>
                      Priority: {ad.priority} | Positions: {ad.positions?.join(', ') || 'None'}
                    </Text>
                    <Text style={styles.adItemSubtitle}>
                      {ad.isActive ? '✅ Active' : '❌ Inactive'}
                      {ad.startDate && ` | From: ${ad.startDate}`}
                      {ad.endDate && ` | Until: ${ad.endDate}`}
                    </Text>
                  </View>
                  <View style={styles.adItemActions}>
                    <TouchableOpacity
                      onPress={() => handleEditBanner(ad)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="pencil" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteBanner(ad.id)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="trash" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.addButton} onPress={handleAddBanner}>
              <Ionicons name="add-circle" size={20} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Banner Ad</Text>
            </TouchableOpacity>
          </View>

          {/* Interstitial Ads Section */}
          <View style={styles.subsection}>
            <View style={styles.subsectionHeader}>
              <Text style={styles.subsectionTitle}>Interstitial Ads</Text>
              <Switch
                value={config.advertisements.interstitialAds.enabled}
                onValueChange={(value) =>
                  setConfig({
                    ...config,
                    advertisements: {
                      ...config.advertisements,
                      interstitialAds: {
                        ...config.advertisements.interstitialAds,
                        enabled: value,
                      },
                    },
                  })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Frequency (screens)</Text>
              <TextInput
                style={styles.input}
                value={config.advertisements.interstitialAds.frequency.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 5;
                  setConfig({
                    ...config,
                    advertisements: {
                      ...config.advertisements,
                      interstitialAds: {
                        ...config.advertisements.interstitialAds,
                        frequency: num,
                      },
                    },
                  });
                }}
                keyboardType="numeric"
                placeholder="5"
              />
            </View>

            <View style={styles.adList}>
              {config.advertisements.interstitialAds.ads.map((ad) => (
                <View key={ad.id} style={styles.adItem}>
                  <View style={styles.adItemContent}>
                    <Text style={styles.adItemTitle}>
                      {ad.titleAr || ad.titleEn || 'Untitled'}
                    </Text>
                    <Text style={styles.adItemSubtitle}>
                      Delay: {ad.dismissDelay}s | {ad.isActive ? '✅ Active' : '❌ Inactive'}
                    </Text>
                    {(ad.startDate || ad.endDate) && (
                      <Text style={styles.adItemSubtitle}>
                        {ad.startDate && `From: ${ad.startDate}`}
                        {ad.startDate && ad.endDate && ' | '}
                        {ad.endDate && `Until: ${ad.endDate}`}
                      </Text>
                    )}
                  </View>
                  <View style={styles.adItemActions}>
                    <TouchableOpacity
                      onPress={() => handleEditInterstitial(ad)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="pencil" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteInterstitial(ad.id)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="trash" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.addButton} onPress={handleAddInterstitial}>
              <Ionicons name="add-circle" size={20} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Interstitial Ad</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Button
          title="Save Configuration"
          onPress={handleSave}
          loading={saving}
          style={styles.saveButton}
        />
      </ScrollView>

      {/* ✅ UPDATED: Banner Ad Modal with Layout Positions */}
      <Modal
        visible={showBannerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBannerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBanner?.id.includes('_') && editingBanner.id.split('_')[0] === 'banner'
                  ? 'Add Banner Ad'
                  : 'Edit Banner Ad'}
              </Text>
              <TouchableOpacity onPress={() => setShowBannerModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Image URL *</Text>
                <TextInput
                  style={styles.input}
                  value={editingBanner?.imageUrl || ''}
                  onChangeText={(text) =>
                    setEditingBanner(editingBanner ? { ...editingBanner, imageUrl: text } : null)
                  }
                  placeholder="https://example.com/image.jpg"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Target URL *</Text>
                <TextInput
                  style={styles.input}
                  value={editingBanner?.targetUrl || ''}
                  onChangeText={(text) =>
                    setEditingBanner(editingBanner ? { ...editingBanner, targetUrl: text } : null)
                  }
                  placeholder="https://example.com"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title (Arabic)</Text>
                <TextInput
                  style={styles.input}
                  value={editingBanner?.titleAr || ''}
                  onChangeText={(text) =>
                    setEditingBanner(editingBanner ? { ...editingBanner, titleAr: text } : null)
                  }
                  placeholder="العنوان بالعربية"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title (English)</Text>
                <TextInput
                  style={styles.input}
                  value={editingBanner?.titleEn || ''}
                  onChangeText={(text) =>
                    setEditingBanner(editingBanner ? { ...editingBanner, titleEn: text } : null)
                  }
                  placeholder="Title in English"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Priority</Text>
                <TextInput
                  style={styles.input}
                  value={editingBanner?.priority?.toString() || '1'}
                  onChangeText={(text) =>
                    setEditingBanner(
                      editingBanner
                        ? { ...editingBanner, priority: parseInt(text) || 1 }
                        : null
                    )
                  }
                  keyboardType="numeric"
                  placeholder="1"
                />
              </View>

              {/* ✅ UPDATED: Positions with Layout and Screen categories */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ad Positions *</Text>
                <Text style={styles.helperText}>
                  Select where this ad should appear. Layout positions are always visible across all screens.
                </Text>

                {/* Layout Positions - Special section */}
                <View style={styles.positionsGroup}>
                  <Text style={styles.positionsCategoryTitle}>
                    🌟 Layout-Level (Always Visible)
                  </Text>
                  {getPositionsByCategory().layout.map((pos) => (
                    <TouchableOpacity
                      key={pos.id}
                      style={styles.checkboxRow}
                      onPress={() => toggleEditingBannerPosition(pos.id)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          editingBanner?.positions?.includes(pos.id as any) && styles.checkboxChecked,
                        ]}
                      >
                        {editingBanner?.positions?.includes(pos.id as any) && (
                          <Ionicons name="checkmark" size={16} color={colors.white} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checkboxLabel}>
                          {pos.icon} {pos.label}
                        </Text>
                        <Text style={styles.positionDescription}>{pos.description}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Screen Positions - Regular section */}
                <View style={styles.positionsGroup}>
                  <Text style={styles.positionsCategoryTitle}>📱 Screen-Level</Text>
                  {getPositionsByCategory().screens.map((pos) => (
                    <TouchableOpacity
                      key={pos.id}
                      style={styles.checkboxRow}
                      onPress={() => toggleEditingBannerPosition(pos.id)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          editingBanner?.positions?.includes(pos.id as any) && styles.checkboxChecked,
                        ]}
                      >
                        {editingBanner?.positions?.includes(pos.id as any) && (
                          <Ionicons name="checkmark" size={16} color={colors.white} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checkboxLabel}>{pos.label}</Text>
                        <Text style={styles.positionDescription}>{pos.description}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Start Date (YYYY-MM-DD, optional)</Text>
                <TextInput
                  style={styles.input}
                  value={editingBanner?.startDate || ''}
                  onChangeText={(text) =>
                    setEditingBanner(editingBanner ? { ...editingBanner, startDate: text } : null)
                  }
                  placeholder="2024-01-01"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>End Date (YYYY-MM-DD, optional)</Text>
                <TextInput
                  style={styles.input}
                  value={editingBanner?.endDate || ''}
                  onChangeText={(text) =>
                    setEditingBanner(editingBanner ? { ...editingBanner, endDate: text } : null)
                  }
                  placeholder="2024-12-31"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Active</Text>
                <Switch
                  value={editingBanner?.isActive ?? true}
                  onValueChange={(value) =>
                    setEditingBanner(editingBanner ? { ...editingBanner, isActive: value } : null)
                  }
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowBannerModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveBanner}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Interstitial Ad Modal */}
      <Modal
        visible={showInterstitialModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInterstitialModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingInterstitial?.id.includes('_') && editingInterstitial.id.split('_')[0] === 'interstitial'
                  ? 'Add Interstitial Ad'
                  : 'Edit Interstitial Ad'}
              </Text>
              <TouchableOpacity onPress={() => setShowInterstitialModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Image URL *</Text>
                <TextInput
                  style={styles.input}
                  value={editingInterstitial?.imageUrl || ''}
                  onChangeText={(text) =>
                    setEditingInterstitial(
                      editingInterstitial ? { ...editingInterstitial, imageUrl: text } : null
                    )
                  }
                  placeholder="https://example.com/image.jpg"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Target URL *</Text>
                <TextInput
                  style={styles.input}
                  value={editingInterstitial?.targetUrl || ''}
                  onChangeText={(text) =>
                    setEditingInterstitial(
                      editingInterstitial ? { ...editingInterstitial, targetUrl: text } : null
                    )
                  }
                  placeholder="https://example.com"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title (Arabic)</Text>
                <TextInput
                  style={styles.input}
                  value={editingInterstitial?.titleAr || ''}
                  onChangeText={(text) =>
                    setEditingInterstitial(
                      editingInterstitial ? { ...editingInterstitial, titleAr: text } : null
                    )
                  }
                  placeholder="العنوان بالعربية"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title (English)</Text>
                <TextInput
                  style={styles.input}
                  value={editingInterstitial?.titleEn || ''}
                  onChangeText={(text) =>
                    setEditingInterstitial(
                      editingInterstitial ? { ...editingInterstitial, titleEn: text } : null
                    )
                  }
                  placeholder="Title in English"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Dismiss Delay (seconds)</Text>
                <TextInput
                  style={styles.input}
                  value={editingInterstitial?.dismissDelay?.toString() || '3'}
                  onChangeText={(text) =>
                    setEditingInterstitial(
                      editingInterstitial
                        ? { ...editingInterstitial, dismissDelay: parseInt(text) || 3 }
                        : null
                    )
                  }
                  keyboardType="numeric"
                  placeholder="3"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Start Date (YYYY-MM-DD, optional)</Text>
                <TextInput
                  style={styles.input}
                  value={editingInterstitial?.startDate || ''}
                  onChangeText={(text) =>
                    setEditingInterstitial(
                      editingInterstitial ? { ...editingInterstitial, startDate: text } : null
                    )
                  }
                  placeholder="2024-01-01"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>End Date (YYYY-MM-DD, optional)</Text>
                <TextInput
                  style={styles.input}
                  value={editingInterstitial?.endDate || ''}
                  onChangeText={(text) =>
                    setEditingInterstitial(
                      editingInterstitial ? { ...editingInterstitial, endDate: text } : null
                    )
                  }
                  placeholder="2024-12-31"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Active</Text>
                <Switch
                  value={editingInterstitial?.isActive ?? true}
                  onValueChange={(value) =>
                    setEditingInterstitial(
                      editingInterstitial ? { ...editingInterstitial, isActive: value } : null
                    )
                  }
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowInterstitialModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveInterstitial}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  subsection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  subsectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  positionsGroup: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: typography.fontSize.md,
    color: colors.text,
  },
  adList: {
    marginBottom: spacing.md,
  },
  adItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  adItemContent: {
    flex: 1,
  },
  adItemTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  adItemSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  adItemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
  saveButton: {
    margin: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    maxHeight: '90%',
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
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  modalButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.gray[200],
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  modalButtonTextSave: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
    sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  typeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },
   checkboxChecked: {
    backgroundColor: colors.primary,
  },
  helperText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  positionsCategoryTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  positionDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  typeButtonActive: {
    backgroundColor: colors.gray[50],
  },
  typeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  previewSection: {
    marginTop: spacing.lg,
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  previewText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: '500',
  },
});

