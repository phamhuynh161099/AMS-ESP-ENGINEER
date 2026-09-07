import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEngineer } from '@/context/EngineerContext';

export const LiveActivityBar: React.FC = () => {
  const { connectionStatus, connectionMessage, manualRefresh } = useEngineer();

  const isConnected = connectionStatus === 'CONNECTED';

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <View
          style={[
            styles.dot,
            isConnected ? styles.dotGreen : styles.dotAmber,
          ]}
        />
        <Text style={styles.messageText} numberOfLines={1}>
          {connectionMessage}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.refreshBtn}
        onPress={manualRefresh}
        activeOpacity={0.7}>
        <MaterialCommunityIcons name="refresh" size={16} color="#94a3b8" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#090d16',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotGreen: {
    backgroundColor: '#10b981',
  },
  dotAmber: {
    backgroundColor: '#f59e0b',
  },
  messageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    flex: 1,
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
  },
});
