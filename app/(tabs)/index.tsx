import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEngineer } from '@/context/EngineerContext';
import { OledHeader } from '@/components/engineer/OledHeader';
import { TransitionBanner } from '@/components/engineer/TransitionBanner';
import { TicketCard } from '@/components/engineer/TicketCard';
import { LiveActivityBar } from '@/components/engineer/LiveActivityBar';

export default function DashboardScreen() {
  const { transitionState, isAlarmActive } = useEngineer();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />

      <OledHeader />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <TransitionBanner transitionState={transitionState} />

        <TicketCard />

        {isAlarmActive && (
          <View style={styles.alarmActivePill}>
            <MaterialCommunityIcons name="bell-ring" size={16} color="#ef4444" />
            <Text style={styles.alarmActiveText}>
              Còi báo & Rung đang hoạt động (Chu kỳ 200ms kêu / 300ms nghỉ)
            </Text>
          </View>
        )}
      </ScrollView>

      <LiveActivityBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#030712',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  alarmActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  alarmActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fca5a5',
    flex: 1,
  },
});
