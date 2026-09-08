import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEngineer } from '@/context/EngineerContext';
import { alarmService } from '@/services/alarm';

export default function SettingsScreen() {
  const {
    config,
    updateConfig,
    triggerSimulatedTicket,
    simulateToggleNetwork,
    connectionStatus,
    scheduleBackgroundTest,
    isBackgroundDutyEnabled,
    toggleBackgroundDuty,
    sendTestNotification,
    openBatterySettings,
    isBackgroundServiceRunning,
  } = useEngineer();

  const [isScheduled, setIsScheduled] = useState(false);

  const [baseUrl, setBaseUrl] = useState(config.serverBaseUrl);
  const [engId, setEngId] = useState(config.engineerId || '12');
  const [mac, setMac] = useState(config.macAddress);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveConfig = async () => {
    await updateConfig({
      serverBaseUrl: baseUrl.trim(),
      engineerId: engId.trim(),
      macAddress: mac.trim(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleResetDefaults = async () => {
    const defaultUrl = 'http://10.101.1.193:8080/espRecieve';
    const defaultEngId = '12';
    const defaultMac = 'AC:0B:FB:C2:9F:70';
    setBaseUrl(defaultUrl);
    setEngId(defaultEngId);
    setMac(defaultMac);
    await updateConfig({
      serverBaseUrl: defaultUrl,
      engineerId: defaultEngId,
      macAddress: defaultMac,
    });
    Alert.alert('Thành công', 'Đã khôi phục cài đặt mặc định!');
  };

  const handleTestBuzzer = () => {
    alarmService.playBeep(3136, 500);
  };

  const handleTest3Beeps = () => {
    alarmService.ringSuccessBeep({
      soundEnabled: config.soundEnabled,
      vibrationEnabled: config.vibrationEnabled,
    });
  };

  const handleTestNotification = async () => {
    await scheduleBackgroundTest(5);
    setIsScheduled(true);
    Alert.alert(
      'Đã hẹn giờ báo động (5 giây)',
      'Hãy bấm phím HOME để thoát app hoặc bấm nút nguồn để KHÓA MÀN HÌNH ngay bây giờ!\n\nSau 5 giây, điện thoại sẽ tự động đổ chuông và hiện thông báo khẩn cấp lên màn hình khóa.'
    );
    setTimeout(() => setIsScheduled(false), 6000);
  };

  const handleTestForegroundNotification = async () => {
    try {
      await sendTestNotification({
        machineName: 'Máy Dập Thủy Lực #01',
        location: 'Khu A - Gian máy 03',
      });
      Alert.alert('Thông báo đã gửi', 'Đã gửi thông báo khẩn qua Foreground Service. Thử khoá màn hình!');
    } catch (e) {
      Alert.alert('Lỗi', 'Không gửi được thông báo. Kiểm tra quyền POST_NOTIFICATIONS.');
    }
  };

  const handleOpenBatterySettings = async () => {
    try {
      await openBatterySettings();
    } catch {
      Alert.alert(
        'Cài đặt pin',
        'Vui lòng vào Cài đặt > Ứng dụng > ESP Engineer > Pin\nvà chọn "Không giới hạn" để app chạy ổn định khi khoá màn hình.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>HỆ THỐNG CÔNG NGHIỆP</Text>
          <Text style={styles.headerTitle}>Cài Đặt & Giả Lập</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Section 1: Server & Hardware MAC */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="server" size={18} color="#38bdf8" />
            <Text style={styles.sectionTitle}>MÁY CHỦ & ĐỊNH DANH THIẾT BỊ</Text>
          </View>

          <Text style={styles.inputLabel}>SERVER BASE URL</Text>
          <TextInput
            style={styles.textInput}
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="http://10.101.1.193:8080/espRecieve"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.inputHelp}>
            Địa chỉ API trung tâm điều phối ticket của nhà máy.
          </Text>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>
            ID KỸ SƯ (ENGINEER ID)
          </Text>
          <TextInput
            style={styles.textInput}
            value={engId}
            onChangeText={setEngId}
            placeholder="12"
            placeholderTextColor="#475569"
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.inputHelp}>
            Mã ID kỹ sư dùng để gọi API kiểm tra sự cố (/checkPendingRequest/{engId}).
          </Text>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>
            ĐỊA CHỈ MAC THIẾT BỊ (DEVICE MAC)
          </Text>
          <TextInput
            style={styles.textInput}
            value={mac}
            onChangeText={setMac}
            placeholder="E8:68:E7:C0:01:A2"
            placeholderTextColor="#475569"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Text style={styles.inputHelp}>
            Server ánh xạ địa chỉ MAC này với Kỹ sư và Chuyền phân công trong cơ sở dữ liệu.
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveConfig}
              activeOpacity={0.8}>
              <Ionicons
                name={isSaved ? 'checkmark-circle' : 'save-outline'}
                size={18}
                color="#ffffff"
              />
              <Text style={styles.saveBtnText}>
                {isSaved ? 'ĐÃ LƯU THÀNH CÔNG!' : 'LƯU CẤU HÌNH'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleResetDefaults}
              activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color="#94a3b8" />
              <Text style={styles.resetBtnText}>Mặc định</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Alarm & Vibration */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="bell-ring" size={18} color="#f59e0b" />
            <Text style={styles.sectionTitle}>CHUÔNG BÁO & RUNG (ALARM)</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>Âm thanh chuông báo (3136Hz)</Text>
              <Text style={styles.switchHelp}>
                Phát còi báo động lặp 200ms kêu / 300ms nghỉ khi có sự cố
              </Text>
            </View>
            <Switch
              value={config.soundEnabled}
              onValueChange={(val) => updateConfig({ soundEnabled: val })}
              trackColor={{ false: '#1e293b', true: '#0284c7' }}
              thumbColor={config.soundEnabled ? '#38bdf8' : '#64748b'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>Rung thiết bị (Vibration)</Text>
              <Text style={styles.switchHelp}>
                Rung nhịp 200ms theo nhịp còi trên thiết bị di động
              </Text>
            </View>
            <Switch
              value={config.vibrationEnabled}
              onValueChange={(val) => updateConfig({ vibrationEnabled: val })}
              trackColor={{ false: '#1e293b', true: '#0284c7' }}
              thumbColor={config.vibrationEnabled ? '#38bdf8' : '#64748b'}
            />
          </View>

          {/* Test Buttons */}
          <View style={styles.testAudioRow}>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestBuzzer}
              activeOpacity={0.8}>
              <Ionicons name="volume-high" size={16} color="#f59e0b" />
              <Text style={styles.testBtnText}>Thử tiếng còi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTest3Beeps}
              activeOpacity={0.8}>
              <MaterialCommunityIcons name="music-note" size={16} color="#10b981" />
              <Text style={styles.testBtnText}>Thử 3 bíp nhận việc</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2.5: Background Notifications & Phone Sleep Alarm */}
        <View style={[styles.sectionCard, { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.04)' }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#10b981" />
            <Text style={[styles.sectionTitle, { color: '#34d399' }]}>
              CHẾ ĐỘ TRỰC CA & KHOÁ MÀN HÌNH (BACKGROUND DUTY)
            </Text>
          </View>

          <View style={[styles.switchRow, { borderBottomWidth: 0, paddingBottom: 4 }]}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>Duy trì trực ca khi khoá màn hình</Text>
              <Text style={styles.switchHelp}>
                Giữ polling 3s/lần và giữ app sẵn sàng reo chuông khi bạn đút điện thoại vào túi hoặc tắt màn hình.
              </Text>
            </View>
            <Switch
              value={isBackgroundDutyEnabled}
              onValueChange={toggleBackgroundDuty}
              trackColor={{ false: '#1e293b', true: '#059669' }}
              thumbColor={isBackgroundDutyEnabled ? '#10b981' : '#64748b'}
            />
          </View>

          <View style={styles.bgRuleBox}>
            <View style={styles.bgRuleItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.bgRuleText}>
                <Text style={{ fontWeight: '800', color: '#fff' }}>1. Khi mở app (Foreground):</Text> Polling 3s/lần, còi 3136Hz và rung kích hoạt ngay khi Line ESP bấm nút.
              </Text>
            </View>

            <View style={styles.bgRuleItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.bgRuleText}>
                <Text style={{ fontWeight: '800', color: '#fff' }}>2. Khi khoá màn hình / Để trong túi (Screen Locked):</Text> App tiếp tục duy trì polling. Khi có sự cố, Android tự động bật sáng màn hình, chuông khẩn cấp reo to và hiện banner Heads-Up ngay trên màn hình khoá!
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.testBgBtn, isScheduled && styles.testBgBtnActive]}
            onPress={handleTestNotification}
            disabled={isScheduled}
            activeOpacity={0.85}>
            <MaterialCommunityIcons
              name={isScheduled ? 'timer-sand' : 'bell-ring'}
              size={20}
              color="#ffffff"
            />
            <Text style={styles.testBgBtnText}>
              {isScheduled
                ? 'ĐÃ HẸN GIỜ (5S) — HÃY KHOÁ MÀN HÌNH ĐIỆN THOẠI NGAY!'
                : 'THỬ NGHIỆM BÁO ĐỘNG KHI KHOÁ MÀN HÌNH (HẸN GIỜ 5S)'}
            </Text>
          </TouchableOpacity>

          {/* Service Status */}
          <View style={styles.serviceStatusRow}>
            <View style={[styles.serviceIndicator, isBackgroundServiceRunning && styles.serviceIndicatorActive]} />
            <Text style={styles.serviceStatusText}>
              {isBackgroundServiceRunning ? 'Foreground Service: ĐANG CHẠY' : 'Foreground Service: DỪNG'}
            </Text>
          </View>

          {/* Foreground Service Test Button */}
          <TouchableOpacity
            style={styles.testFgBtn}
            onPress={handleTestForegroundNotification}
            activeOpacity={0.8}>
            <Ionicons name="notifications" size={16} color="#38bdf8" />
            <Text style={styles.testFgBtnText}>GỬI THÔNG BÁO NGAY (Test Foreground)</Text>
          </TouchableOpacity>

          {/* Battery Optimization Settings */}
          <TouchableOpacity
            style={styles.batteryBtn}
            onPress={handleOpenBatterySettings}
            activeOpacity={0.8}>
            <Ionicons name="battery-charging" size={16} color="#10b981" />
            <Text style={styles.batteryBtnText}>Mở cài đặt tối ưu pin (Bỏ giới hạn nền)</Text>
          </TouchableOpacity>
        </View>

        {/* Section 3: Simulation & Testing Suite */}
        <View style={[styles.sectionCard, styles.sectionCardHighlight]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="flask-outline" size={20} color="#a855f7" />
            <Text style={[styles.sectionTitle, { color: '#c084fc' }]}>
              PHÒNG THÍ NGHIỆM GIẢ LẬP (TEST SUITE)
            </Text>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>Chế độ Giả Lập (Offline Simulation)</Text>
              <Text style={styles.switchHelp}>
                Cho phép kiểm thử trọn vẹn quy trình gọi kỹ sư mà không cần nối WiFi xưởng
              </Text>
            </View>
            <Switch
              value={config.simulationMode}
              onValueChange={(val) => updateConfig({ simulationMode: val })}
              trackColor={{ false: '#1e293b', true: '#9333ea' }}
              thumbColor={config.simulationMode ? '#c084fc' : '#64748b'}
            />
          </View>

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>
            MÔ PHỎNG TICKET MỚI (CHUYỀN GỌI)
          </Text>

          <View style={styles.simButtonsCol}>
            <TouchableOpacity
              style={styles.simCardBtn}
              onPress={() =>
                triggerSimulatedTicket({
                  machineCode: 'LINE-01',
                  machineName: 'Máy Ép Nhựa Chấn Thủy Lực #01',
                  location: 'Khu A - Gian máy 03',
                  description: 'Kẹt phôi xy-lanh đẩy, cảm biến áp suất báo lỗi E-204',
                })
              }
              activeOpacity={0.8}>
              <View style={styles.simBtnIcon}>
                <MaterialCommunityIcons name="cog" size={18} color="#ef4444" />
              </View>
              <View style={styles.simBtnTextCol}>
                <Text style={styles.simBtnTitle}>Sự cố: Máy Ép Nhựa #01</Text>
                <Text style={styles.simBtnDesc}>Kẹt phôi, áp suất tăng cao</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simCardBtn}
              onPress={() =>
                triggerSimulatedTicket({
                  machineCode: 'LINE-03',
                  machineName: 'Robot Hàn Tự Động Fanuc #03',
                  location: 'Khu B - Chuyền lắp ráp khung',
                  description: 'Trật khớp trục J4, servo quá tải cần cân chỉnh góc hàn',
                })
              }
              activeOpacity={0.8}>
              <View style={styles.simBtnIcon}>
                <MaterialCommunityIcons name="robot-industrial" size={18} color="#f59e0b" />
              </View>
              <View style={styles.simBtnTextCol}>
                <Text style={styles.simBtnTitle}>Sự cố: Robot Hàn Fanuc #03</Text>
                <Text style={styles.simBtnDesc}>Quá tải servo, lệch vị trí hàn</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simCardBtn}
              onPress={() =>
                triggerSimulatedTicket({
                  machineCode: 'LINE-07',
                  machineName: 'Lò Xử Lý Nhiệt Liên Tục #07',
                  location: 'Xưởng Nhiệt Luyện - Cột H8',
                  description: 'Nhiệt kế thermocouple buồng đốt 2 bị đứt, báo động quá nhiệt',
                })
              }
              activeOpacity={0.8}>
              <View style={styles.simBtnIcon}>
                <MaterialCommunityIcons name="fire" size={18} color="#f43f5e" />
              </View>
              <View style={styles.simBtnTextCol}>
                <Text style={styles.simBtnTitle}>Sự cố: Lò Nhiệt Luyện #07</Text>
                <Text style={styles.simBtnDesc}>Quá nhiệt buồng đốt</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.networkToggleBtn,
                connectionStatus === 'DISCONNECTED' && styles.networkToggleBtnActive,
              ]}
              onPress={simulateToggleNetwork}
              activeOpacity={0.8}>
              <MaterialCommunityIcons
                name={connectionStatus === 'DISCONNECTED' ? 'wifi-check' : 'wifi-alert'}
                size={18}
                color={connectionStatus === 'DISCONNECTED' ? '#10b981' : '#ef4444'}
              />
              <Text
                style={[
                  styles.networkToggleText,
                  connectionStatus === 'DISCONNECTED' && { color: '#34d399' },
                ]}>
                {connectionStatus === 'DISCONNECTED'
                  ? 'Khôi phục kết nối mạng'
                  : 'Mô phỏng Mất kết nối mạng'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: System Information */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={18} color="#94a3b8" />
            <Text style={styles.sectionTitle}>THÔNG TIN HỆ THỐNG</Text>
          </View>

          <View style={styles.infoLine}>
            <Text style={styles.infoLineLabel}>Phiên bản App</Text>
            <Text style={styles.infoLineVal}>v1.0.0 (Expo SDK 54)</Text>
          </View>
          <View style={styles.infoLine}>
            <Text style={styles.infoLineLabel}>Tần suất quét ticket</Text>
            <Text style={styles.infoLineVal}>3 giây / lần (checkPendingRequest)</Text>
          </View>
          <View style={styles.infoLine}>
            <Text style={styles.infoLineLabel}>Tần suất cập nhật Kỹ sư</Text>
            <Text style={styles.infoLineVal}>30 giây / lần khi IDLE</Text>
          </View>
          <View style={styles.infoLine}>
            <Text style={styles.infoLineLabel}>Chu kỳ còi báo động</Text>
            <Text style={styles.infoLineVal}>200ms kêu — 300ms nghỉ</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#030712',
  },
  header: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
  },
  sectionCardHighlight: {
    borderColor: 'rgba(168, 85, 247, 0.4)',
    backgroundColor: 'rgba(168, 85, 247, 0.04)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#f8fafc',
    fontFamily: 'monospace',
  },
  inputHelp: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 12,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchTextCol: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 2,
  },
  switchHelp: {
    fontSize: 11,
    color: '#64748b',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 12,
  },
  testAudioRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 10,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  simButtonsCol: {
    gap: 10,
    marginTop: 8,
  },
  simCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
  },
  simBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simBtnTextCol: {
    flex: 1,
  },
  simBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 2,
  },
  simBtnDesc: {
    fontSize: 11,
    color: '#94a3b8',
  },
  networkToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  networkToggleBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  networkToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fca5a5',
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 41, 59, 0.5)',
  },
  infoLineLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  infoLineVal: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '700',
  },
  bgNoticeDesc: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 12,
  },
  bgRuleBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  bgRuleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bgRuleText: {
    flex: 1,
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 17,
  },
  tokenBox: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  tokenLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 11,
    color: '#f8fafc',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  tokenHelp: {
    fontSize: 11,
    color: '#64748b',
  },
  testBgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  serviceIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#475569',
  },
  serviceIndicatorActive: {
    backgroundColor: '#10b981',
  },
  serviceStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  testFgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 8,
  },
  testFgBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
  },
  batteryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 8,
  },
  batteryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
  },
  testBgBtnActive: {
    backgroundColor: '#b91c1c',
  },
  testBgBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
