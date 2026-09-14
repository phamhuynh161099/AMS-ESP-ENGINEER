import { useEngineer } from '@/context/EngineerContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SETTINGS_PASSWORD = 'ph1234//';

// Preset options for quick selection
const PRESET_OPTIONS = [
  { engineerId: '12', mac: 'AC:0B:FB:C2:9F:70', label: 'Kỹ sư 12 - MAC 9F:70' },
  { engineerId: '14', mac: 'AC:0B:FB:C2:C2:11', label: 'Kỹ sư 14 - MAC C2:11' },
];

export default function SettingsScreen() {
  const {
    config,
    updateConfig,
    connectionStatus,
    isBackgroundDutyEnabled,
    toggleBackgroundDuty,
    sendTestNotification,
    openBatterySettings,
    isBackgroundServiceRunning,
  } = useEngineer();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const [baseUrl, setBaseUrl] = useState(config.serverBaseUrl);
  const [engId, setEngId] = useState(config.engineerId || '12');
  const [mac, setMac] = useState(config.macAddress);
  const [isSaved, setIsSaved] = useState(false);

  const handlePasswordSubmit = () => {
    if (passwordInput === SETTINGS_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError(false);
      setPasswordInput('');
      Keyboard.dismiss();
    } else {
      setAuthError(true);
      setPasswordInput('');
    }
  };

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

  const handleTestAlarm = async () => {
    try {
      await sendTestNotification({
        machineName: 'Máy Dập Thủy Lực #01',
        location: 'Khu A - Gian máy 03',
      });
      Alert.alert('Thông báo đã gửi', 'Đã gửi thông báo khẩn qua Foreground Service.');
    } catch {
      Alert.alert('Lỗi', 'Không gửi được thông báo. Kiểm tra quyền POST_NOTIFICATIONS.');
    }
  };

  const handleOpenBatterySettings = async () => {
    Alert.alert(
      'Hướng Dẫn Tối Ưu Pin Android',
      'Để ứng dụng nhận thông báo sự cố liên tục khi khoá màn hình:\n\n' +
      '1. Chọn "Không hạn chế" (Unrestricted) trong mục Pin.\n' +
      '2. (Xiaomi / Oppo / Vivo): Bật thêm "Tự khởi chạy" (Autostart).\n' +
      '3. Khóa biểu tượng app trong màn hình Đa nhiệm (Recent Apps).\n\n' +
      'Bấm "Mở Cài Đặt Pin" để thiết lập ngay.',
      [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Mở Cài Đặt Pin',
          onPress: async () => {
            try {
              await openBatterySettings();
            } catch {
              Alert.alert(
                'Cài đặt pin',
                'Vui lòng vào Cài đặt máy > Ứng dụng > ESP Engineer > Pin\nvà chọn "Không giới hạn" để app chạy ổn định khi khoá màn hình.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Lock Screen Overlay */}
      {!isAuthenticated && (
        <Pressable style={lockStyles.overlay} onPress={Keyboard.dismiss}>
          <View style={lockStyles.lockBox}>
            <View style={lockStyles.iconCircle}>
              <Ionicons name="lock-closed" size={40} color="#38bdf8" />
            </View>
            <Text style={lockStyles.lockTitle}>YÊU CẦU MẬT KHẨU</Text>
            <Text style={lockStyles.lockSubtitle}>
              Tab Cài Đặt được bảo vệ.{'\n'}Vui lòng nhập mật khẩu để truy cập.
            </Text>

            <TextInput
              style={[lockStyles.lockInput, authError && lockStyles.lockInputError]}
              value={passwordInput}
              onChangeText={(text) => {
                setPasswordInput(text);
                if (authError) setAuthError(false);
              }}
              placeholder="••••••••"
              placeholderTextColor="#475569"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handlePasswordSubmit}
            />
            {authError && (
              <Text style={lockStyles.errorText}>Mật khẩu không đúng. Vui lòng thử lại.</Text>
            )}

            <TouchableOpacity
              style={lockStyles.unlockBtn}
              onPress={handlePasswordSubmit}
              activeOpacity={0.8}>
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <Text style={lockStyles.unlockBtnText}>MỞ KHÓA</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}

      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>HỆ THỐNG CÔNG NGHIỆP</Text>
          <Text style={styles.headerTitle}>Cài Đặt</Text>
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

          {/* Preset Quick Selection */}
          <View style={styles.presetSection}>
            <Text style={styles.inputLabel}>CHỌN NHANH (PRESETS)</Text>
            <View style={styles.presetRow}>
              {PRESET_OPTIONS.map((preset, index) => {
                const isSelected = engId === preset.engineerId && mac === preset.mac;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.presetBtn, isSelected && styles.presetBtnSelected]}
                    onPress={() => {
                      setEngId(preset.engineerId);
                      setMac(preset.mac);
                      Keyboard.dismiss();
                    }}
                    activeOpacity={0.7}>
                    <Text style={[styles.presetBtnText, isSelected && styles.presetBtnTextSelected]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

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
        </View>

        {/* Section 3: Background Duty Mode */}
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

          {/* Service Status */}
          <View style={styles.serviceStatusRow}>
            <View style={[styles.serviceIndicator, isBackgroundServiceRunning && styles.serviceIndicatorActive]} />
            <Text style={styles.serviceStatusText}>
              {isBackgroundServiceRunning ? 'Foreground Service: ĐANG CHẠY' : 'Foreground Service: DỪNG'}
            </Text>
          </View>

          {/* Test Notification Button */}
          <TouchableOpacity
            style={styles.testFgBtn}
            onPress={handleTestAlarm}
            activeOpacity={0.8}>
            <Ionicons name="notifications" size={16} color="#38bdf8" />
            <Text style={styles.testFgBtnText}>GỬI THÔNG BÁO TEST (Foreground)</Text>
          </TouchableOpacity>

          {/* Battery Optimization Settings */}
          <TouchableOpacity
            style={styles.batteryBtn}
            onPress={handleOpenBatterySettings}
            activeOpacity={0.8}>
            <Ionicons name="battery-charging" size={16} color="#10b981" />
            <Text style={styles.batteryBtnText}>Mở cài đặt tối ưu pin (Bỏ giới hạn nền)</Text>
          </TouchableOpacity>

          {/* Battery Guidance Tip Box */}
          <View style={styles.batteryTipBox}>
            <View style={styles.batteryTipHeader}>
              <Ionicons name="information-circle" size={15} color="#38bdf8" />
              <Text style={styles.batteryTipTitle}>LƯU Ý KHOÁ MÀN HÌNH (XIAOMI / SAMSUNG / OPPO)</Text>
            </View>
            <Text style={styles.batteryTipDesc}>
              • Pin: Chọn chế độ <Text style={styles.boldWhite}>&quot;Không hạn chế&quot;</Text> (Unrestricted).{'\n'}
              • Đa nhiệm: Nhấn giữ / vuốt icon app và chọn <Text style={styles.boldWhite}>Ổ khóa</Text> để app không bị tắt khi tắt màn hình lâu.
            </Text>
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
            <Text style={styles.infoLineLabel}>Trạng thái kết nối</Text>
            <Text style={styles.infoLineVal}>{connectionStatus}</Text>
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
    paddingBottom: 100,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
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
  presetSection: {
    marginTop: 14,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  presetBtnSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  presetBtnTextSelected: {
    color: '#38bdf8',
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
  batteryTipBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  batteryTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  batteryTipTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  batteryTipDesc: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 18,
  },
  boldWhite: {
    color: '#f8fafc',
    fontWeight: '700',
  },
});

const lockStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lockBox: {
    width: '86%',
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  lockTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 1,
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  lockInput: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: '#f8fafc',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 8,
  },
  lockInputError: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 12,
    fontWeight: '600',
  },
  unlockBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
  },
  unlockBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});
