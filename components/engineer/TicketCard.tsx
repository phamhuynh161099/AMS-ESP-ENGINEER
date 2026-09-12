import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEngineer } from '@/context/EngineerContext';

export const TicketCard: React.FC = () => {
  const {
    state,
    currentTicket,
    engineerInfo,
    isAcknowledging,
    acknowledgeError,
    acknowledgeCurrentTicket,
    isAlarmActive,
  } = useEngineer();

  // Pulse animation for REQUEST_RECEIVED
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'REQUEST_RECEIVED') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.025,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [pulseAnim, state]);

  // Render IDLE state
  if (state === 'IDLE') {
    return (
      <View style={styles.idleCard}>
        <View style={styles.idleIconBox}>
          <MaterialCommunityIcons name="shield-check" size={44} color="#10b981" />
        </View>

        <Text style={styles.idleTitle}>HỆ THỐNG SẴN SÀNG</Text>
        <Text style={styles.idleSubtitle}>
          Hiện không có ticket sự cố nào đang chờ xử lý.
        </Text>

        <View style={styles.idleStatusPill}>
          <View style={styles.greenDot} />
          <Text style={styles.idleStatusText}>Đang quét sự cố mỗi 3 giây</Text>
        </View>

        <View style={styles.idleInfoBox}>
          <Text style={styles.idleInfoLabel}>KHU VỰC PHỤ TRÁCH</Text>
          <Text style={styles.idleInfoText}>
            {engineerInfo.isAssigned
              ? `${engineerInfo.lineName || 'Chuyền gán'} (${engineerInfo.lineAssignmentId})`
              : 'Chưa được phân công chuyền nào'}
          </Text>
        </View>
      </View>
    );
  }

  // Render REQUEST_RECEIVED state (New emergency call)
  if (state === 'REQUEST_RECEIVED') {
    return (
      <Animated.View
        style={[
          styles.alarmCard,
          { transform: [{ scale: pulseAnim }] },
        ]}>
        {/* Urgent Header */}
        <View style={styles.alarmHeader}>
          <View style={styles.alarmBadge}>
            <MaterialCommunityIcons
              name={isAlarmActive ? 'alarm-light' : 'alarm-light-outline'}
              size={20}
              color="#fff"
            />
            <Text style={styles.alarmBadgeText}>E.NEW TASK — SỰ CỐ MỚI</Text>
          </View>

          <View style={styles.soundIndicator}>
            <MaterialCommunityIcons name="volume-high" size={18} color="#ef4444" />
            <Text style={styles.soundIndicatorText}>BÁO ĐỘNG</Text>
          </View>
        </View>

        {/* Main Machine Name */}
        <View style={styles.machineSection}>
          <Text style={styles.sectionTag}>MÁY / CHUYỀN SỰ CỐ</Text>
          <Text style={styles.machineName}>{currentTicket.machineName}</Text>
          {currentTicket.machineCode && (
            <View style={styles.codeTag}>
              <Text style={styles.codeTagText}>{currentTicket.machineCode}</Text>
            </View>
          )}
        </View>

        {/* Workshop Location */}
        <View style={styles.detailRow}>
          <Ionicons name="location" size={20} color="#38bdf8" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>VỊ TRÍ HIỆN TRƯỜNG</Text>
            <Text style={styles.detailValue}>{currentTicket.location}</Text>
          </View>
        </View>

        {/* Operator Issue Description */}
        <View style={styles.descriptionBox}>
          <View style={styles.descHeader}>
            <MaterialCommunityIcons name="comment-alert-outline" size={16} color="#fbbf24" />
            <Text style={styles.descTitle}>MÔ TẢ SỰ CỐ TỪ VẬN HÀNH</Text>
          </View>
          <Text style={styles.descText}>{currentTicket.description}</Text>
        </View>

        {/* Acknowledge Error Alert (if API failed) */}
        {acknowledgeError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={styles.errorBannerText}>{acknowledgeError}</Text>
          </View>
        )}

        {/* Big Action Button: Acknowledge */}
        <TouchableOpacity
          style={[styles.ackButton, isAcknowledging && styles.ackButtonDisabled]}
          onPress={acknowledgeCurrentTicket}
          disabled={isAcknowledging}
          activeOpacity={0.85}>
          {isAcknowledging ? (
            <View style={styles.ackBtnContent}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.ackButtonText}>ĐANG GỬI XÁC NHẬN...</Text>
            </View>
          ) : (
            <View style={styles.ackBtnContent}>
              <MaterialCommunityIcons name="check-circle" size={26} color="#ffffff" />
              <Text style={styles.ackButtonText}>XÁC NHẬN NHẬN VIỆC</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.hintText}>
          Bấm nút trên để chuyển sang trạng thái đang sửa và tắt chuông báo động.
        </Text>
      </Animated.View>
    );
  }

  // Render ACKNOWLEDGED state (On the way / Repairing)
  return (
    <View style={styles.ackCard}>
      {/* Header */}
      <View style={styles.ackHeader}>
        <View style={styles.ackBadge}>
          <MaterialCommunityIcons name="account-wrench" size={18} color="#000" />
          <Text style={styles.ackBadgeText}>E.ON THE WAY</Text>
        </View>
        <Text style={styles.ackStatusTag}>ĐANG XỬ LÝ SỰ CỐ</Text>
      </View>

      {/* Target Machine */}
      <View style={styles.ackTargetBox}>
        <Text style={styles.ackTargetLabel}>ĐANG SỬA CHỮA TẠI</Text>
        <Text style={styles.ackMachineName}>{currentTicket.machineName}</Text>
        <View style={styles.ackLocationRow}>
          <Ionicons name="location-sharp" size={18} color="#f59e0b" />
          <Text style={styles.ackLocationText}>Đến: {currentTicket.location}</Text>
        </View>
      </View>

      {/* Description reminder */}
      <View style={styles.ackDescBox}>
        <Text style={styles.ackDescLabel}>Nội dung sự cố:</Text>
        <Text style={styles.ackDescText}>{currentTicket.description}</Text>
      </View>

      {/* Instruction for waiting operator completion */}
      <View style={styles.waitingNotice}>
        <MaterialCommunityIcons name="clock-outline" size={24} color="#f59e0b" />
        <View style={styles.waitingTextCol}>
          <Text style={styles.waitingTitle}>CHỜ PHÍA CHUYỀN XÁC NHẬN</Text>
          <Text style={styles.waitingDesc}>
            Sau khi hoàn tất sửa chữa, hãy nhờ người dùng/vận hành tại chuyền bấm xác nhận
            xong việc trên thiết bị chuyền để hoàn tất ticket.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // IDLE State
  idleCard: {
    backgroundColor: '#0c1322',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  idleIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  idleTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 1,
    marginBottom: 6,
  },
  idleSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  idleStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    marginBottom: 20,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  idleStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34d399',
  },
  idleInfoBox: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  idleInfoLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  idleInfoText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
  },
  quickDemoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  // REQUEST_RECEIVED State
  alarmCard: {
    backgroundColor: '#1a0d10',
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  alarmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  alarmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  alarmBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  soundIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  soundIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ef4444',
    letterSpacing: 0.5,
  },
  machineSection: {
    marginBottom: 14,
  },
  sectionTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f87171',
    letterSpacing: 1,
    marginBottom: 4,
  },
  machineName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
    lineHeight: 28,
  },
  codeTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  codeTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fca5a5',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#38bdf8',
  },
  descriptionBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
    marginBottom: 16,
  },
  descHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  descTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
    letterSpacing: 0.5,
  },
  descText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f1f5f9',
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#fca5a5',
  },
  ackButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 8,
  },
  ackButtonDisabled: {
    opacity: 0.6,
  },
  ackBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ackButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  hintText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },

  // ACKNOWLEDGED State
  ackCard: {
    backgroundColor: '#191506',
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  ackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  ackBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  ackStatusTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
    letterSpacing: 0.5,
  },
  ackTargetBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  ackTargetLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  ackMachineName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 8,
  },
  ackLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ackLocationText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fbbf24',
  },
  ackDescBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  ackDescLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 2,
  },
  ackDescText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  waitingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 14,
  },
  waitingTextCol: {
    flex: 1,
  },
  waitingTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fbbf24',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  waitingDesc: {
    fontSize: 12,
    color: '#e2e8f0',
    lineHeight: 18,
  },
});
