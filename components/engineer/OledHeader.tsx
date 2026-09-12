import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useEngineer } from '@/context/EngineerContext';

export const OledHeader: React.FC = () => {
  const {
    engineerInfo,
    config,
    connectionStatus,
    manualRefresh,
    isAlarmActive,
    isBackgroundDutyEnabled,
  } = useEngineer();

  // Simulated battery level matching ESP8266 bat_percentage (85-98%)
  const [batteryLevel] = useState(94);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getConnectionConfig = () => {
    switch (connectionStatus) {
      case 'CONNECTED':
        return { color: '#10b981', label: 'ONLINE', icon: 'wifi' as const };
      case 'RECONNECTING':
        return { color: '#f59e0b', label: 'ĐANG KẾT NỐI', icon: 'wifi-refresh' as const };
      case 'UNREGISTERED':
        return { color: '#ef4444', label: 'CHƯA ĐĂNG KÝ', icon: 'alert-circle' as const };
      case 'SERVER_ERROR':
        return { color: '#f43f5e', label: 'LỖI SERVER', icon: 'server-off' as const };
      case 'DISCONNECTED':
      default:
        return { color: '#ef4444', label: 'MẤT KẾT NỐI', icon: 'wifi-off' as const };
    }
  };

  const conn = getConnectionConfig();

  return (
    <View style={styles.container}>
      {/* Top Bar: Battery, Time, Network status */}
      <View style={styles.topRow}>
        <View style={styles.batteryContainer}>
          <View style={styles.batteryBody}>
            <View style={[styles.batteryLevel, { width: `${batteryLevel}%` }]} />
          </View>
          <View style={styles.batteryTerminal} />
          <Text style={styles.batteryText}>{batteryLevel}%</Text>
        </View>

        <Text style={styles.timeText}>{currentTime}</Text>

        <TouchableOpacity
          style={[styles.statusBadge, { borderColor: conn.color }]}
          onPress={manualRefresh}
          activeOpacity={0.7}>
          <MaterialCommunityIcons name={conn.icon} size={14} color={conn.color} />
          <Text style={[styles.statusBadgeText, { color: conn.color }]}>{conn.label}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Oled Console Box */}
      <View style={[styles.oledPanel, isAlarmActive && styles.oledPanelAlarm]}>
        <View style={styles.oledRow}>
          <View style={styles.badgeLabelContainer}>
            <Text style={styles.oledTag}>KỸ SƯ TRỰC (ID: {config.engineerId || engineerInfo.id || '12'})</Text>
            <Text style={styles.engineerName} numberOfLines={1}>
              {engineerInfo.name && engineerInfo.name !== 'Kỹ sư chưa đặt tên'
                ? engineerInfo.name
                : `Kỹ sư #${config.engineerId || '12'}`}
            </Text>
          </View>

          <View style={styles.headerRightBadges}>
            <View
              style={[
                styles.dutyBadge,
                isBackgroundDutyEnabled ? styles.dutyBadgeActive : styles.dutyBadgeInactive,
              ]}>
              <View
                style={[
                  styles.dutyDot,
                  isBackgroundDutyEnabled && styles.dutyDotActive,
                ]}
              />
              <Text style={styles.dutyBadgeText}>
                {isBackgroundDutyEnabled ? 'TRỰC CA NGẦM' : 'TẮT TRỰC'}
              </Text>
            </View>
          </View>
        </View>

        {/* Device MAC & Assigned Line */}
        <View style={styles.infoMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={13} color="#38bdf8" />
            <Text style={styles.metaLabel}>ID:</Text>
            <Text style={[styles.metaValue, { color: '#38bdf8' }]} numberOfLines={1}>
              {config.engineerId || engineerInfo.id || '12'}
            </Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaItem}>
            <Ionicons name="hardware-chip-outline" size={13} color="#94a3b8" />
            <Text style={styles.metaLabel}>MAC:</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {config.macAddress}
            </Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaItem}>
            <Ionicons name="layers-outline" size={13} color="#94a3b8" />
            <Text style={styles.metaLabel}>Chuyền:</Text>
            <Text
              style={[
                styles.metaValue,
                !engineerInfo.isAssigned && styles.metaValueWarning,
              ]}
              numberOfLines={1}>
              {engineerInfo.isAssigned
                ? engineerInfo.lineName || engineerInfo.lineAssignmentId
                : 'Chưa gán'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryBody: {
    width: 22,
    height: 12,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    borderRadius: 2.5,
    padding: 1,
    justifyContent: 'center',
  },
  batteryLevel: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 1,
  },
  batteryTerminal: {
    width: 2,
    height: 6,
    backgroundColor: '#94a3b8',
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
  },
  batteryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 6,
    fontVariant: ['tabular-nums'],
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  oledPanel: {
    backgroundColor: '#090d16',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  oledPanelAlarm: {
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.5,
  },
  oledRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeLabelContainer: {
    flex: 1,
  },
  oledTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  engineerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.3,
  },
  demoPill: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  demoPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
  },
  infoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#334155',
    marginHorizontal: 8,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2e8f0',
    flexShrink: 1,
  },
  metaValueWarning: {
    color: '#f59e0b',
  },
  headerRightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  dutyBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10b981',
  },
  dutyBadgeInactive: {
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
    borderColor: '#475569',
  },
  dutyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748b',
  },
  dutyDotActive: {
    backgroundColor: '#10b981',
  },
  dutyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
});

