// src/components/dev/PerformanceMonitor.tsx - ENHANCED WITH TRANSITIONS
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../store/hooks';
import { perfLogger } from '../../utils/performanceLogger';

const { width, height } = Dimensions.get('window');

export const PerformanceMonitor = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fps, setFps] = useState(60);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [lastTransition, setLastTransition] = useState<any>(null);
  const [sessionStats, setSessionStats] = useState<any>(null);

  // Get app state
  const catalogues = useAppSelector(state => state.offers.catalogues);
  const basketItems = useAppSelector(state => state.basket.items);

  // Draggable position
  const pan = useRef(new Animated.ValueXY({ x: width - 70, y: 100 })).current;

  // FPS counter
  useEffect(() => {
    let frameCount = 0;
    let lastTime = Date.now();

    const measureFPS = () => {
      frameCount++;
      const now = Date.now();
      const delta = now - lastTime;

      if (delta >= 1000) {
        const currentFPS = Math.round((frameCount * 1000) / delta);
        setFps(currentFPS);
        frameCount = 0;
        lastTime = now;
      }

      requestAnimationFrame(measureFPS);
    };

    const rafId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Memory usage
  useEffect(() => {
    if (Platform.OS === 'web' && (performance as any).memory) {
      const interval = setInterval(() => {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
        setMemoryUsage(usedMB);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, []);

  // Update session stats and last transition
  useEffect(() => {
    if (isExpanded) {
      const interval = setInterval(() => {
        const stats = perfLogger.getSessionStats();
        const transition = perfLogger.getLastTransition();
        setSessionStats(stats);
        setLastTransition(transition);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isExpanded]);

  // Pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isExpanded,
      onMoveShouldSetPanResponder: () => !isExpanded,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();

        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;

        const snapX = currentX < width / 2 ? 10 : width - 70;
        const clampedY = Math.max(60, Math.min(height - 120, currentY));

        Animated.spring(pan, {
          toValue: { x: snapX, y: clampedY },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const getFPSColor = () => {
    if (fps >= 55) return '#4caf50';
    if (fps >= 45) return '#ff9800';
    return '#f44336';
  };

  const getFPSEmoji = () => {
    if (fps >= 55) return '✅';
    if (fps >= 45) return '⚠️';
    return '🔴';
  };

  const getTransitionColor = (duration?: number) => {
    if (!duration) return '#aaa';
    if (duration < 500) return '#4caf50';
    if (duration < 1000) return '#ff9800';
    return '#f44336';
  };

  if (!isExpanded) {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[styles.compactButton, { borderColor: getFPSColor() }]}
          onPress={() => setIsExpanded(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.compactFPS}>{fps}</Text>
          <Text style={styles.compactLabel}>FPS</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <View style={styles.expandedContainer}>
      <View style={styles.expandedHeader}>
        <Text style={styles.expandedTitle}>⚡ Performance Monitor</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => {
              perfLogger.logReport();
            }}
            style={styles.headerButton}
          >
            <Ionicons name="document-text" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              perfLogger.resetStats();
              setSessionStats(null);
              setLastTransition(null);
            }}
            style={styles.headerButton}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsExpanded(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.expandedContent} showsVerticalScrollIndicator={false}>
        {/* Real-time Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Real-time</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>FPS {getFPSEmoji()}</Text>
            <Text style={[styles.metricValue, { color: getFPSColor() }]}>
              {fps}
            </Text>
          </View>

          {memoryUsage > 0 && (
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Memory 💾</Text>
              <Text style={styles.metricValue}>{memoryUsage} MB</Text>
            </View>
          )}

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Catalogues 📚</Text>
            <Text style={styles.metricValue}>{catalogues.length}</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Basket 🛒</Text>
            <Text style={styles.metricValue}>{basketItems.length}</Text>
          </View>
        </View>

        {/* Last Transition */}
        {lastTransition && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚀 Last Transition</Text>

            <View style={styles.transitionCard}>
              <View style={styles.transitionHeader}>
                <Text style={styles.transitionRoute}>
                  {lastTransition.from} → {lastTransition.to}
                </Text>
                <Text style={[
                  styles.transitionDuration,
                  { color: getTransitionColor(lastTransition.duration) }
                ]}>
                  {lastTransition.duration}ms
                </Text>
              </View>

              {lastTransition.phases && Object.keys(lastTransition.phases).length > 0 && (
                <View style={styles.phasesContainer}>
                  <Text style={styles.phasesTitle}>Phases:</Text>
                  {Object.entries(lastTransition.phases).map(([phase, time]) => (
                    <View key={phase} style={styles.phaseRow}>
                      <Text style={styles.phaseName}>{phase}:</Text>
                      <Text style={styles.phaseTime}>{time}ms</Text>
                    </View>
                  ))}
                </View>
              )}

              {lastTransition.duration && (
                <View style={styles.qualityBadge}>
                  <Text style={[
                    styles.qualityText,
                    { color: getTransitionColor(lastTransition.duration) }
                  ]}>
                    {lastTransition.duration < 500 ? '✅ SMOOTH' :
                     lastTransition.duration < 1000 ? '⚠️ ACCEPTABLE' :
                     '🔴 NEEDS FIX'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Session Stats */}
        {sessionStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Session Stats</Text>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Total Operations</Text>
              <Text style={styles.metricValue}>{sessionStats.totalOperations}</Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Avg Time</Text>
              <Text style={styles.metricValue}>{sessionStats.avgOperationTime}ms</Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Slow Ops ⚠️</Text>
              <Text style={[styles.metricValue, { color: '#ff9800' }]}>
                {sessionStats.slowOperations}
              </Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Critical Ops 🔴</Text>
              <Text style={[styles.metricValue, { color: '#f44336' }]}>
                {sessionStats.criticalOperations}
              </Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Total Renders</Text>
              <Text style={styles.metricValue}>{sessionStats.totalRenders}</Text>
            </View>
          </View>
        )}

        {/* Performance Guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 Performance Guide</Text>

          <View style={styles.guideCard}>
            <Text style={styles.guideTitle}>Transition Benchmarks:</Text>
            <View style={styles.guideRow}>
              <View style={[styles.guideDot, { backgroundColor: '#4caf50' }]} />
              <Text style={styles.guideText}>&lt;500ms: Smooth</Text>
            </View>
            <View style={styles.guideRow}>
              <View style={[styles.guideDot, { backgroundColor: '#ff9800' }]} />
              <Text style={styles.guideText}>500-1000ms: Acceptable</Text>
            </View>
            <View style={styles.guideRow}>
              <View style={[styles.guideDot, { backgroundColor: '#f44336' }]} />
              <Text style={styles.guideText}>&gt;1000ms: Needs Fix</Text>
            </View>
          </View>

          <View style={styles.guideCard}>
            <Text style={styles.guideTitle}>FPS Targets:</Text>
            <View style={styles.guideRow}>
              <View style={[styles.guideDot, { backgroundColor: '#4caf50' }]} />
              <Text style={styles.guideText}>55-60: Perfect</Text>
            </View>
            <View style={styles.guideRow}>
              <View style={[styles.guideDot, { backgroundColor: '#ff9800' }]} />
              <Text style={styles.guideText}>45-55: Acceptable</Text>
            </View>
            <View style={styles.guideRow}>
              <View style={[styles.guideDot, { backgroundColor: '#f44336' }]} />
              <Text style={styles.guideText}>&lt;45: Critical</Text>
            </View>
          </View>
        </View>

        {/* Logcat Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Check Logcat For:</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>• ✅ FAST operations (&lt;100ms)</Text>
            <Text style={styles.infoText}>• ⚠️ SLOW operations (100-500ms)</Text>
            <Text style={styles.infoText}>• 🔴 CRITICAL operations (&gt;500ms)</Text>
            <Text style={styles.infoText}>• 🔄 Excessive render warnings</Text>
            <Text style={styles.infoText}>• 🚀 Transition details with phases</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    position: 'absolute',
    zIndex: 9999,
  },
  compactButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  compactFPS: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  compactLabel: {
    color: '#aaa',
    fontSize: 9,
    marginTop: 2,
  },
  expandedContainer: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    maxHeight: height - 120,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 12,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  expandedTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  expandedContent: {
    padding: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  metricLabel: {
    color: '#aaa',
    fontSize: 13,
  },
  metricValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  transitionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
  },
  transitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transitionRoute: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  transitionDuration: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  phasesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  phasesTitle: {
    color: '#aaa',
    fontSize: 11,
    marginBottom: 4,
  },
  phaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  phaseName: {
    color: '#ccc',
    fontSize: 11,
  },
  phaseTime: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  qualityBadge: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  qualityText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  guideCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  guideTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  guideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  guideText: {
    color: '#aaa',
    fontSize: 11,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    borderRadius: 8,
  },
  infoText: {
    color: '#aaa',
    fontSize: 11,
    marginBottom: 2,
  },
});