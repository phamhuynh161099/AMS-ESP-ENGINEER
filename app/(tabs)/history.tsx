import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEngineer } from '@/context/EngineerContext';
import { ActivityLog } from '@/types/engineer';

type FilterType = 'ALL' | 'REQUEST' | 'ACK' | 'SUCCESS' | 'NETWORK';

export default function HistoryScreen() {
  const { logs, clearLogs } = useEngineer();
  const [filter, setFilter] = useState<FilterType>('ALL');

  const filteredLogs = logs.filter((item) => {
    if (filter === 'ALL') return true;
    return item.type === filter;
  });

  const getLogMeta = (type: ActivityLog['type']) => {
    switch (type) {
      case 'REQUEST':
        return {
          icon: 'alert-decagram' as const,
          color: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.12)',
          label: 'SỰ CỐ',
        };
      case 'ACK':
        return {
          icon: 'check-circle-outline' as const,
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.12)',
          label: 'NHẬN VIỆC',
        };
      case 'SUCCESS':
        return {
          icon: 'checkbox-marked-circle' as const,
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.12)',
          label: 'HOÀN THÀNH',
        };
      case 'NETWORK':
        return {
          icon: 'wifi-sync' as const,
          color: '#38bdf8',
          bg: 'rgba(56, 189, 248, 0.12)',
          label: 'KẾT NỐI',
        };
      case 'ERROR':
        return {
          icon: 'alert-circle' as const,
          color: '#f43f5e',
          bg: 'rgba(244, 63, 94, 0.12)',
          label: 'LỖI',
        };
      case 'INFO':
      default:
        return {
          icon: 'information-outline' as const,
          color: '#94a3b8',
          bg: 'rgba(148, 163, 184, 0.12)',
          label: 'HỆ THỐNG',
        };
    }
  };

  const renderLogItem = ({ item }: { item: ActivityLog }) => {
    const meta = getLogMeta(item.type);
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return (
      <View style={styles.logCard}>
        <View style={[styles.logIconBox, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon} size={20} color={meta.color} />
        </View>

        <View style={styles.logContent}>
          <View style={styles.logHeader}>
            <View style={[styles.typeBadge, { borderColor: meta.color }]}>
              <Text style={[styles.typeBadgeText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>
            <Text style={styles.timestampText}>{timeStr}</Text>
          </View>

          <Text style={styles.logMessage}>{item.message}</Text>
          {item.details ? (
            <Text style={styles.logDetails}>{item.details}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>LỊCH SỬ HOẠT ĐỘNG</Text>
          <Text style={styles.headerTitle}>Nhật Ký Sự Cố</Text>
        </View>

        {logs.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={clearLogs}
            activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
            <Text style={styles.clearBtnText}>Xoá nhật ký</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(
          [
            { id: 'ALL', label: 'Tất cả' },
            { id: 'REQUEST', label: 'Sự cố' },
            { id: 'ACK', label: 'Đã nhận' },
            { id: 'SUCCESS', label: 'Xong' },
            { id: 'NETWORK', label: 'Mạng' },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.filterChip,
              filter === tab.id && styles.filterChipActive,
            ]}
            onPress={() => setFilter(tab.id)}>
            <Text
              style={[
                styles.filterChipText,
                filter === tab.id && styles.filterChipTextActive,
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Log List */}
      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderLogItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={54}
              color="#334155"
            />
            <Text style={styles.emptyTitle}>Chưa có nhật ký nào</Text>
            <Text style={styles.emptySubtitle}>
              Khi có sự cố được gửi đến hoặc nhận việc, nhật ký sẽ được lưu tự động tại đây.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#030712',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f87171',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  filterChipTextActive: {
    color: '#38bdf8',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  logCard: {
    flexDirection: 'row',
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  logIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  logContent: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timestampText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  logMessage: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 2,
  },
  logDetails: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },
});
