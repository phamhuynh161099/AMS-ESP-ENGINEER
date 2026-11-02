import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEngineer } from '@/context/EngineerContext';
import { FaultItem, RepairRouter, SelectedFault } from '@/types/engineer';
import { CameraScanModal } from '@/components/engineer/CameraScanModal';

/**
 * Khối "Hoàn thành sửa chữa" hiển thị khi ticket ở trạng thái ACKNOWLEDGED.
 *
 * Flow:
 *  1. Kỹ sư chọn Route A (hư hỏng máy) hoặc Route B (tiện ích).
 *  2. Route A: nhập/quét mã máy (PDA hardware scan hoặc mở camera scan QR/Barcode)
 *     rồi chọn nhiều lỗi ở menu 2 cấp (fault_group → fault_l1).
 *     Route B: không có bước scan, chọn nhiều lỗi ở menu 1 cấp (fault_l1).
 *  3. Bấm HOÀN THÀNH SỬA → gửi machine_code + router + arrIssue,
 *     xong clear form (giá trị chỉ giữ trong phiên ticket này).
 */

interface FaultGroup {
  key: string;
  name: string;
  code: string | null;
  items: FaultItem[];
}

/** Gom FaultItem thành menu 2 cấp theo fault_group (Route A). */
function groupFaults(items: FaultItem[]): FaultGroup[] {
  const map = new Map<string, FaultGroup>();
  for (const it of items) {
    const code = it.fault_group_code ?? null;
    // Route B: fault_group rỗng → 1 nhóm "flat" (menu 1 cấp)
    const key = code ? `code:${code}` : it.fault_group ? `name:${it.fault_group}` : 'flat';
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        name: it.fault_group || 'Lỗi tiện ích',
        code,
        items: [],
      };
      map.set(key, group);
    }
    group.items.push(it);
  }
  return Array.from(map.values());
}

const toSelected = (it: FaultItem): SelectedFault => ({
  fault_group: it.fault_group || '',
  fault_group_code: it.fault_group_code ?? null,
  fault_l1: it.fault_l1,
  fault_l1_code: it.fault_l1_code,
});

export const RepairFormCard: React.FC = () => {
  const {
    repairForm,
    selectRepairRouter,
    clearRepairRouter,
    setRepairMachineCode,
    toggleSelectedFault,
    loadFaultList,
    submitCompleteRepair,
    isRepairSubmitting,
    completeRepairError,
    faultLists,
  } = useEngineer();

  const [cameraVisible, setCameraVisible] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);

  const router = repairForm.router;
  const items = faultLists[router ?? 'A'];

  // Tự load danh sách lỗi khi mới chọn route mà chưa có dữ liệu
  useEffect(() => {
    if (!router) return;
    if (faultLists[router].length > 0) return;
    let active = true;
    setListLoading(true);
    setListError(null);
    loadFaultList(router)
      .catch(() => {
        if (active) setListError('Không thể tải danh sách lỗi từ máy chủ.');
      })
      .finally(() => {
        if (active) setListLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const groups = useMemo(() => groupFaults(items), [items]);
  const isFlat = router === 'B'; // menu 1 cấp

  const isSelected = (code: string) =>
    repairForm.selectedFaults.some((f) => f.fault_l1_code === code);

  const handleScanDone = (data: string) => {
    setRepairMachineCode(data);
  };

  const onToggleRoute = (r: RepairRouter) => {
    if (router === r) {
      clearRepairRouter(); // bấm lần 2 để huỷ chọn
    } else {
      selectRepairRouter(r);
    }
  };

  const toggleExpandedGroup = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <View style={styles.container}>
      {/* Route picker */}
      <Text style={styles.sectionLabel}>CHỌN LỐI ĐI XỬ LÝ</Text>
      <View style={styles.routeRow}>
        <RouteButton
          label="ROUTE A"
          sub="Hư hỏng máy"
          active={router === 'A'}
          onPress={() => onToggleRoute('A')}
        />
        <RouteButton
          label="ROUTE B"
          sub="Tiện ích"
          active={router === 'B'}
          onPress={() => onToggleRoute('B')}
        />
      </View>

      {/* Route A: scan máy */}
      {router === 'A' && (
        <View style={styles.scanBox}>
          <View style={styles.scanLabelRow}>
            <Ionicons name="barcode" size={18} color="#38bdf8" />
            <Text style={styles.scanLabel}>MÃ MÁY (QUÉT / NHẬP)</Text>
          </View>
          <TextInput
            style={styles.scanInput}
            value={repairForm.machineCode}
            onChangeText={setRepairMachineCode}
            placeholder="Đợi PDA tự gõ khi quét, hoặc bấm camera bên dưới"
            placeholderTextColor="#475569"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
          />
          <Pressable
            style={styles.cameraBtn}
            onPress={() => setCameraVisible(true)}
            android_ripple={{ color: 'rgba(0,0,0,0.25)' }}>
            <MaterialCommunityIcons name="camera" size={20} color="#fbbf24" />
            <Text style={styles.cameraBtnText}>MỞ CAMERA QUÉT MÃ</Text>
          </Pressable>
        </View>
      )}

      {/* Fault menu (2 cấp cho A, 1 cấp cho B) */}
      {router && (
        <View style={styles.faultSection}>
          <Text style={styles.sectionLabel}>
            CHỌN LỖI ĐÃ SỬA {router === 'A' ? '(CHỌN NHIỀU)' : '(CHỌN NHIỀU)'}
          </Text>

          {listLoading && (
            <View style={styles.listLoading}>
              <ActivityIndicator color="#38bdf8" />
              <Text style={styles.listLoadingText}>Đang tải danh sách lỗi...</Text>
            </View>
          )}

          {listError && (
            <View style={styles.listErrorBox}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.listErrorText}>{listError}</Text>
            </View>
          )}

          {!listLoading && !listError && items.length === 0 && (
            <Text style={styles.listEmpty}>Chưa có dữ liệu lỗi cho Route {router}.</Text>
          )}

          {!listLoading && items.length > 0 && (
            <View style={styles.faultList}>
              {groups.map((group) => (
                <View key={group.key} style={styles.groupBlock}>
                  {/* Cấp 1: fault_group — Route B bỏ qua (menu 1 cấp) */}
                  {!isFlat && (
                    <Pressable
                      style={styles.groupHeader}
                      onPress={() => toggleExpandedGroup(group.key)}
                      android_ripple={{ color: 'rgba(255,255,255,0.06)' }}>
                      <MaterialCommunityIcons
                        name={expanded[group.key] ? 'chevron-down' : 'chevron-right'}
                        size={20}
                        color="#fbbf24"
                      />
                      <Text style={styles.groupName} numberOfLines={1}>
                        {group.name}
                      </Text>
                      {group.code && <Text style={styles.groupCode}>{group.code}</Text>}
                    </Pressable>
                  )}

                  {(isFlat || expanded[group.key]) && (
                    <View style={isFlat ? styles.l1List : styles.l1ListIndented}>
                      {group.items.map((it) => {
                        const selected = isSelected(it.fault_l1_code);
                        return (
                          <Pressable
                            key={`${it.id}_${it.fault_l1_code}`}
                            style={[styles.faultRow, selected && styles.faultRowSelected]}
                            onPress={() => toggleSelectedFault(toSelected(it))}
                            android_ripple={{ color: 'rgba(255,255,255,0.08)' }}>
                            <View
                              style={[styles.checkbox, selected && styles.checkboxChecked]}>
                              {selected && (
                                <MaterialCommunityIcons name="check" size={14} color="#0c1322" />
                              )}
                            </View>
                            <Text
                              style={[styles.faultL1Name, selected && styles.faultL1NameOn]}
                              numberOfLines={1}>
                              {it.fault_l1}
                            </Text>
                            <Text style={styles.faultL1Code}>{it.fault_l1_code}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Submit */}
      <Pressable
        style={[styles.submitBtn, !router && styles.submitBtnDisabled]}
        onPress={() => submitCompleteRepair()}
        disabled={!router || isRepairSubmitting}
        android_ripple={{ color: 'rgba(0,0,0,0.3)' }}>
        {isRepairSubmitting ? (
          <View style={styles.submitContent}>
            <ActivityIndicator color="#0c1322" />
            <Text style={styles.submitText}>ĐANG GỬI HOÀN THÀNH...</Text>
          </View>
        ) : (
          <View style={styles.submitContent}>
            <MaterialCommunityIcons name="check-all" size={22} color="#0c1322" />
            <Text style={styles.submitText}>HOÀN THÀNH SỬA</Text>
          </View>
        )}
      </Pressable>

      {completeRepairError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" />
          <Text style={styles.errorBannerText}>{completeRepairError}</Text>
        </View>
      )}

      <Text style={styles.hint}>
        Giá trị chỉ được giữ trong phiên ticket này — ticket mới sẽ tự động reset.
      </Text>

      <CameraScanModal
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onScanned={handleScanDone}
      />
    </View>
  );
};

interface RouteButtonProps {
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}

const RouteButton: React.FC<RouteButtonProps> = ({ label, sub, active, onPress }) => (
  <Pressable
    style={[styles.routeBtn, active && styles.routeBtnActive]}
    onPress={onPress}
    android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
    <Text style={[styles.routeLabel, active && styles.routeLabelActive]}>{label}</Text>
    <Text style={[styles.routeSub, active && styles.routeSubActive]}>{sub}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  routeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  routeBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 2,
  },
  routeBtnActive: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  routeLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#cbd5e1',
    letterSpacing: 0.5,
  },
  routeLabelActive: {
    color: '#fbbf24',
  },
  routeSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  routeSubActive: {
    color: '#f59e0b',
  },

  // Scan box (Route A)
  scanBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    marginBottom: 14,
  },
  scanLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  scanLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.8,
  },
  scanInput: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    backgroundColor: '#090d16',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    letterSpacing: 1,
    marginBottom: 8,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 10,
    paddingVertical: 10,
  },
  cameraBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fbbf24',
  },

  // Fault menu
  faultSection: {
    marginBottom: 14,
  },
  listLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  listLoadingText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  listErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
    padding: 10,
  },
  listErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#fca5a5',
    fontWeight: '600',
  },
  listEmpty: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  faultList: {
    gap: 10,
  },
  groupBlock: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  groupName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#f1f5f9',
  },
  groupCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  l1List: {
    gap: 2,
  },
  l1ListIndented: {
    gap: 2,
    paddingBottom: 8,
  },
  faultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 2,
    marginLeft: 6,
    marginRight: 6,
    borderRadius: 8,
  },
  faultRowSelected: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  faultL1Name: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  faultL1NameOn: {
    color: '#fbbf24',
    fontWeight: '700',
  },
  faultL1Code: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    fontFamily: 'monospace',
  },

  // Submit
  submitBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 10,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0c1322',
    letterSpacing: 0.8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 10,
    marginBottom: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#fca5a5',
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 6,
  },
});
