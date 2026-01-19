// src/app/perf-debug.tsx - Performance Debug Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { perfLogger } from '../utils/performanceLogger';

export default function PerformanceDebugScreen() {
  const [stats, setStats] = useState<any>(null);
  const [transitions, setTransitions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    const sessionStats = perfLogger.getSessionStats();
    const transitionHistory = perfLogger.getTransitions();
    setStats(sessionStats);
    setTransitions(transitionHistory.slice(-10).reverse()); // Last 10 transitions
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleReset = () => {
    perfLogger.resetStats();
    loadData();
  };

  const handleGenerateReport = () => {
    perfLogger.logReport();
    alert('Check console/logcat for detailed report');
  };

  const getTransitionColor = (duration?: number) => {
    if (!duration) return colors.gray[400];
    if (duration < 500) return colors.success;
    if (duration < 1000) return colors.warning;
    return colors.error;
  };

  const getTransitionStatus = (duration?: number) => {
    if (!duration) return 'N/A';
    if (duration < 500) return '✅ Smooth';
    if (duration < 1000) return '⚠️ Acceptable';
    return '🔴 Needs Fix';
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Performance Monitor',
          headerShown: true,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={handleGenerateReport} style={styles.headerButton}>
                <Ionicons name="document-text" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleReset} style={styles.headerButton}>
                <Ionicons name="refresh" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Session Stats Card */}
        {stats && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="stats-chart" size={24} color={colors.primary} />
              <Text style={styles.cardTitle}>Session Statistics</Text>
            </View>

            <View style={styles.statGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalOperations}</Text>
                <Text style={styles.statLabel}>Total Operations</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.avgOperationTime}ms</Text>
                <Text style={styles.statLabel}>Avg Time</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {stats.slowOperations}
                </Text>
                <Text style={styles.statLabel}>Slow (100-500ms)</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.error }]}>
                  {stats.criticalOperations}
                </Text>
                <Text style={styles.statLabel}>Critical (&gt;500ms)</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalRenders}</Text>
                <Text style={styles.statLabel}>Total Renders</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {((stats.slowOperations + stats.criticalOperations) / Math.max(stats.totalOperations, 1) * 100).toFixed(0)}%
                </Text>
                <Text style={styles.statLabel}>Issues Rate</Text>
              </View>
            </View>
          </View>
        )}

        {/* Last Transitions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="swap-horizontal" size={24} color={colors.primary} />
            <Text style={styles.cardTitle}>Recent Transitions</Text>
            <Text style={styles.badge}>{transitions.length}</Text>
          </View>

          {transitions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={colors.gray[300]} />
              <Text style={styles.emptyText}>
                No transitions recorded yet.{'\n'}
                Navigate between screens to see data.
              </Text>
            </View>
          ) : (
            transitions.map((transition, index) => (
              <View key={index} style={styles.transitionCard}>
                <View style={styles.transitionHeader}>
                  <View style={styles.transitionRoute}>
                    <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
                    <Text style={styles.transitionText}>
                      {transition.from} → {transition.to}
                    </Text>
                  </View>
                  <View style={[
                    styles.transitionDuration,
                    { backgroundColor: getTransitionColor(transition.duration) + '20' }
                  ]}>
                    <Text style={[
                      styles.transitionDurationText,
                      { color: getTransitionColor(transition.duration) }
                    ]}>
                      {transition.duration}ms
                    </Text>
                  </View>
                </View>

                {/* Status Badge */}
                <View style={styles.statusBadge}>
                  <Text style={[
                    styles.statusText,
                    { color: getTransitionColor(transition.duration) }
                  ]}>
                    {getTransitionStatus(transition.duration)}
                  </Text>
                </View>

                {/* Phases */}
                {transition.phases && Object.keys(transition.phases).length > 0 && (
                  <View style={styles.phasesContainer}>
                    <Text style={styles.phasesTitle}>Breakdown:</Text>
                    <View style={styles.phasesList}>
                      {Object.entries(transition.phases).map(([phase, time]) => (
                        <View key={phase} style={styles.phaseItem}>
                          <View style={styles.phaseDot} />
                          <Text style={styles.phaseName}>{phase}</Text>
                          <Text style={styles.phaseTime}>{time}ms</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Performance Targets */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flag" size={24} color={colors.primary} />
            <Text style={styles.cardTitle}>Performance Targets</Text>
          </View>

          <View style={styles.targetsList}>
            <View style={styles.targetItem}>
              <View style={[styles.targetDot, { backgroundColor: colors.success }]} />
              <View style={styles.targetContent}>
                <Text style={styles.targetLabel}>Smooth Transition</Text>
                <Text style={styles.targetValue}>&lt; 500ms</Text>
              </View>
            </View>

            <View style={styles.targetItem}>
              <View style={[styles.targetDot, { backgroundColor: colors.warning }]} />
              <View style={styles.targetContent}>
                <Text style={styles.targetLabel}>Acceptable Transition</Text>
                <Text style={styles.targetValue}>500-1000ms</Text>
              </View>
            </View>

            <View style={styles.targetItem}>
              <View style={[styles.targetDot, { backgroundColor: colors.error }]} />
              <View style={styles.targetContent}>
                <Text style={styles.targetLabel}>Needs Optimization</Text>
                <Text style={styles.targetValue}>&gt; 1000ms</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bulb" size={24} color={colors.warning} />
            <Text style={styles.cardTitle}>Performance Tips</Text>
          </View>

          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipText}>
                Check Android Logcat for detailed operation timings
              </Text>
            </View>

            <View style={styles.tipItem}>
              <Text style={styles.tipIcon}>🎯</Text>
              <Text style={styles.tipText}>
                Look for "SLOW" or "CRITICAL" tags in console
              </Text>
            </View>

            <View style={styles.tipItem}>
              <Text style={styles.tipIcon}>🔄</Text>
              <Text style={styles.tipText}>
                Excessive renders (shown in logs) indicate optimization opportunities
              </Text>
            </View>

            <View style={styles.tipItem}>
              <Text style={styles.tipIcon}>📊</Text>
              <Text style={styles.tipText}>
                Tap the report button (top right) to generate a full report in console
              </Text>
            </View>
          </View>
        </View>

        {/* Platform Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Platform: {Platform.OS} • {Platform.Version}
          </Text>
          <Text style={styles.infoText}>
            Mode: {__DEV__ ? 'Development' : 'Production'}
          </Text>
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
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  card: {
    backgroundColor: colors.white,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.primary + '20',
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: 'bold',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statItem: {
    width: '31%',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  transitionCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  transitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  transitionRoute: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transitionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  transitionDuration: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  transitionDurationText: {
    fontSize: typography.fontSize.sm,
    fontWeight: 'bold',
  },
  statusBadge: {
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  phasesContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  phasesTitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  phasesList: {
    gap: spacing.xs,
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  phaseName: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.text,
  },
  phaseTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  targetsList: {
    gap: spacing.md,
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  targetDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  targetContent: {
    flex: 1,
  },
  targetLabel: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  targetValue: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  tipsList: {
    gap: spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipIcon: {
    fontSize: 20,
  },
  tipText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: colors.primary + '10',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    fontSize: typography.fontSize.xs,
    color: colors.text,
    marginBottom: spacing.xs,
  },
});