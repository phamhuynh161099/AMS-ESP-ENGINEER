import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface CameraScanModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (data: string) => void;
}

/**
 * Full-screen camera scanner (QR / Barcode: Code128, Code39, EAN, ...).
 * Dùng expo-camera built-in — không cần thêm native dependency riêng.
 * Khi quét thấy mã → gọi onScanned(data) rồi tự đóng.
 */
export const CameraScanModal: React.FC<CameraScanModalProps> = ({
  visible,
  onClose,
  onScanned,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  // Reset guard mỗi lần mở lại modal
  useEffect(() => {
    scannedRef.current = false;
  }, [visible]);

  const handleScanned = (data: string) => {
    if (scannedRef.current || !data) return;
    scannedRef.current = true;
    // Nhắm mắt 1 nhịp cho user thấy đã quét xong trước khi đóng
    setTimeout(() => {
      onScanned(data.trim());
      onClose();
    }, 500);
  };

  let cameraContent: React.ReactNode;

  if (permission?.granted) {
    cameraContent = (
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: [
            'qr',
            'code128',
            'code93',
            'code39',
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'itf14',
            'datamatrix',
            'pdf417',
          ],
        }}
        onBarcodeScanned={(result) => {
          if (result?.data) handleScanned(result.data);
        }}
      />
    );
  } else if (permission) {
    cameraContent = (
      <View style={styles.permissionBox}>
        <MaterialCommunityIcons name="camera-off" size={44} color="#f59e0b" />
        <Text style={styles.permissionTitle}>CẦN QUYỀN CAMERA</Text>
        <Text style={styles.permissionDesc}>
          App cần quyền truy cập camera để quét mã QR/Barcode trên thân máy.
        </Text>
        <Pressable
          style={styles.permissionBtn}
          onPress={() => requestPermission()}
          android_ripple={{ color: 'rgba(0,0,0,0.2)' }}>
          <MaterialCommunityIcons name="camera" size={18} color="#0c1322" />
          <Text style={styles.permissionBtnText}>CẤP QUYỀN CAMERA</Text>
        </Pressable>
      </View>
    );
  } else {
    cameraContent = (
      <View style={styles.permissionBox}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.permissionDesc}>Đang kiểm tra quyền camera...</Text>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.container}>
        {cameraContent}

        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarTitleBox}>
            <MaterialCommunityIcons name="qrcode-scan" size={18} color="#f59e0b" />
            <Text style={styles.topBarTitle}>QUÉT MÃ MÁY — CAMERA</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose} android_ripple={{ color: 'rgba(255,255,255,0.15)' }}>
            <MaterialCommunityIcons name="close" size={22} color="#f8fafc" />
          </Pressable>
        </View>

        {/* Bottom hint */}
        <View style={styles.bottomHint}>
          <Text style={styles.bottomHintText}>
            Đưa mã QR/Barcode vào giữa khung • Quét thấy sẽ tự điền vào ô mã máy
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(9, 13, 22, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topBarTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fbbf24',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  bottomHint: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 10,
  },
  bottomHintText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '600',
  },
  permissionBox: {
    flex: 1,
    backgroundColor: '#030712',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 1,
  },
  permissionDesc: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 8,
  },
  permissionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0c1322',
  },
});
