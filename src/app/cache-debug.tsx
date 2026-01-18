// src/app/cache-debug.tsx - Add to your app for monitoring
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { cacheService } from '../services/cacheService';

export default function CacheDebugScreen() {
  const [cacheInfo, setCacheInfo] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCacheInfo();
  }, []);

  const loadCacheInfo = async () => {
    setRefreshing(true);
    const info = await cacheService.getCacheInfo();
    const statistics = cacheService.getStats();
    setCacheInfo(info);
    setStats(statistics);
    setRefreshing(false);
  };

  const handleClearAll = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('هل أنت متأكد من حذف جميع البيانات المخزنة مؤقتاً؟')
      : await new Promise(resolve => {
          Alert.alert(
            'تأكيد الحذف',
            'هل أنت متأكد من حذف جميع البيانات المخزنة مؤقتاً؟',
            [
              { text: 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
              { text: 'حذف', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (confirmed) {
      await cacheService.clearAll();
      await loadCacheInfo();
      
      if (Platform.OS === 'web') {
        alert('تم حذف جميع البيانات المخزنة');
      } else {
        Alert.alert('نجح', 'تم حذف جميع البيانات المخزنة');
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const getCacheHealth = (ttl: number): { color: string; status: string } => {
    if (ttl < 0) return { color: colors.error, status: 'Expired' };
    if (ttl < 60) return { color: colors.warning, status: 'Expiring Soon' };
    return { color: colors.success, status: 'Healthy' };
  };

  const totalSize = cacheInfo.reduce((sum, item) => sum + item.size, 0);
  const hitRate = stats?.totalReads > 0 
    ? ((stats.hits / stats.totalReads) * 100).toFixed(1)
    : '0.0';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Cache Monitor',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity onPress={handleClearAll} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        {/* Statistics Card */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.cardTitle}>📊 Cache Statistics</Text>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Hit Rate:</Text>
              <Text style={[
                styles.statValue,
                { color: parseFloat(hitRate) > 70 ? colors.success : colors.warning }
              ]}>
                {hitRate}%
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Reads:</Text>
              <Text style={styles.statValue}>{stats.totalReads}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Cache Hits:</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {stats.hits}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Cache Misses:</Text>
              <Text style={[styles.statValue, { color: colors.error }]}>
                {stats.misses}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Invalidations:</Text>
              <Text style={styles.statValue}>{stats.invalidations}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Cache Size:</Text>
              <Text style={styles.statValue}>{formatBytes(totalSize)}</Text>
            </View>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                cacheService.resetStats();
                loadCacheInfo();
              }}
            >
              <Text style={styles.resetButtonText}>Reset Statistics</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cache Entries */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💾 Cache Entries</Text>
            <TouchableOpacity onPress={loadCacheInfo}>
              <Ionicons name="refresh" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {cacheInfo.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="archive-outline" size={48} color={colors.gray[300]} />
              <Text style={styles.emptyText}>No cache entries</Text>
            </View>
          ) : (
            cacheInfo.map((item, index) => {
              const health = getCacheHealth(item.ttl);
              
              return (
                <View key={index} style={styles.cacheItem}>
                  <View style={styles.cacheItemHeader}>
                    <View style={[styles.healthDot, { backgroundColor: health.color }]} />
                    <Text style={styles.cacheKey}>{item.key}</Text>
                  </View>

                  <View style={styles.cacheItemDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="resize-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{formatBytes(item.size)}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailText}>Age: {formatTime(item.age)}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="hourglass-outline" size={14} color={health.color} />
                      <Text style={[styles.detailText, { color: health.color }]}>
                        TTL: {item.ttl > 0 ? formatTime(item.ttl) : 'Expired'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="analytics-outline" size={14} color={colors.primary} />
                      <Text style={styles.detailText}>Hits: {item.hits}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Firebase Usage Estimation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Firebase Usage Estimate</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              • With current hit rate ({hitRate}%), you're saving approximately{' '}
              <Text style={styles.highlight}>
                {Math.round((parseFloat(hitRate) / 100) * stats?.totalReads || 0)}
              </Text>{' '}
              Firebase reads
            </Text>
            <Text style={styles.infoText}>
              • Total cache entries: {cacheInfo.length}
            </Text>
            <Text style={styles.infoText}>
              • Cache storage: {formatBytes(totalSize)}
            </Text>
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Recommendations</Text>
          <View style={styles.infoBox}>
            {parseFloat(hitRate) < 50 && (
              <Text style={[styles.infoText, { color: colors.warning }]}>
                ⚠️ Low hit rate detected. Consider increasing cache durations.
              </Text>
            )}
            {parseFloat(hitRate) >= 70 && (
              <Text style={[styles.infoText, { color: colors.success }]}>
                ✅ Excellent hit rate! Caching is working efficiently.
              </Text>
            )}
            <Text style={styles.infoText}>
              • Pull to refresh on any screen to force cache invalidation
            </Text>
            <Text style={styles.infoText}>
              • Caches auto-expire to ensure data freshness
            </Text>
            <Text style={styles.infoText}>
              • Monitor this screen weekly to track Firebase usage
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  headerButton: {
    padding: spacing.sm,
  },
  statsCard: {
    backgroundColor: colors.white,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  statLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  resetButton: {
    backgroundColor: colors.gray[200],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    margin: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  cacheItem: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cacheItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  cacheKey: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  cacheItemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  infoBox: {
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  highlight: {
    fontWeight: 'bold',
    color: colors.primary,
  },
});