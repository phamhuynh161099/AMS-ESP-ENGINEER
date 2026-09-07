import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  const {
    state,
    transitionState,
    triggerSimulatedTicket,
    simulateLineUserComplete,
    simulateTicketCancel,
    isAlarmActive,
  } = useEngineer();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* OLED Industrial Header */}
      <OledHeader />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* 4-second Transition Banner (E.SUCCESS or RESET) */}
        <TransitionBanner transitionState={transitionState} />

        {/* Main State Card (IDLE, REQUEST_RECEIVED, or ACKNOWLEDGED) */}
        <TicketCard />

        {/* Floating Quick Action / Simulator Bar for Testing on Device */}
        <View style={styles.quickBar}>
          <Text style={styles.quickBarTitle}>THAO TÁC NHANH & MÔ PHỎNG</Text>

          <View style={styles.quickButtonGrid}>
            {state === 'IDLE' && (
              <TouchableOpacity
                style={[styles.actionChip, styles.actionChipPrimary]}
                onPress={() => triggerSimulatedTicket()}
                activeOpacity={0.8}>
                <MaterialCommunityIcons name="alert-octagon" size={16} color="#ef4444" />
                <Text style={styles.actionChipTextPrimary}>Tạo Ticket Mới (Giả lập)</Text>
              </TouchableOpacity>
            )}

            {state === 'ACKNOWLEDGED' && (
              <TouchableOpacity
                style={[styles.actionChip, styles.actionChipSuccess]}
                onPress={simulateLineUserComplete}
                activeOpacity={0.8}>
                <MaterialCommunityIcons name="check-all" size={16} color="#10b981" />
                <Text style={styles.actionChipTextSuccess}>Chuyền xác nhận Xong việc</Text>
              </TouchableOpacity>
            )}

            {state !== 'IDLE' && (
              <TouchableOpacity
                style={[styles.actionChip, styles.actionChipWarning]}
                onPress={simulateTicketCancel}
                activeOpacity={0.8}>
                <MaterialCommunityIcons name="close-circle-outline" size={16} color="#f59e0b" />
                <Text style={styles.actionChipTextWarning}>Huỷ Ticket (Server Reset)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isAlarmActive && (
          <View style={styles.alarmActivePill}>
            <MaterialCommunityIcons name="bell-ring" size={16} color="#ef4444" />
            <Text style={styles.alarmActiveText}>
              Còi báo & Rung đang hoạt động (Chu kỳ 200ms kêu / 300ms nghỉ)
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Real-time Status Bar */}
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
    paddingBottom: 20,
  },
  quickBar: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  quickBarTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 10,
  },
  quickButtonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionChipPrimary: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  actionChipTextPrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f87171',
  },
  actionChipSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionChipTextSuccess: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34d399',
  },
  actionChipWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  actionChipTextWarning: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
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
