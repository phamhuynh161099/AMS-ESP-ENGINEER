import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TransitionScreenState } from '@/types/engineer';

interface Props {
  transitionState: TransitionScreenState;
}

export const TransitionBanner: React.FC<Props> = ({ transitionState }) => {
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (transitionState.isActive) {
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 4000,
        useNativeDriver: false,
      }).start();
    }
  }, [progressAnim, transitionState.isActive, transitionState.expiresAt]);

  if (!transitionState.isActive) return null;

  const isSuccess = transitionState.title.includes('SUCCESS');

  return (
    <View style={[styles.card, isSuccess ? styles.cardSuccess : styles.cardReset]}>
      <View style={styles.contentRow}>
        <View style={[styles.iconCircle, isSuccess ? styles.iconCircleSuccess : styles.iconCircleReset]}>
          <MaterialCommunityIcons
            name={isSuccess ? 'check-decagram' : 'refresh'}
            size={28}
            color={isSuccess ? '#10b981' : '#38bdf8'}
          />
        </View>

        <View style={styles.textColumn}>
          <Text style={[styles.title, isSuccess ? styles.titleSuccess : styles.titleReset]}>
            {transitionState.title}
          </Text>
          <Text style={styles.line1}>{transitionState.line1}</Text>
          <Text style={styles.line2}>{transitionState.line2}</Text>
        </View>
      </View>

      {/* 4s Progress Bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressBar,
            isSuccess ? styles.progressBarSuccess : styles.progressBarReset,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardSuccess: {
    backgroundColor: '#06261c',
    borderColor: '#10b981',
    shadowColor: '#10b981',
  },
  cardReset: {
    backgroundColor: '#0c1a2e',
    borderColor: '#0284c7',
    shadowColor: '#0284c7',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  iconCircleReset: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  titleSuccess: {
    color: '#34d399',
  },
  titleReset: {
    color: '#38bdf8',
  },
  line1: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  line2: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressBarSuccess: {
    backgroundColor: '#10b981',
  },
  progressBarReset: {
    backgroundColor: '#38bdf8',
  },
});
