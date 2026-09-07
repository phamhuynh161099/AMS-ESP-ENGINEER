import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityLog,
  ConnectionStatus,
  DeviceState,
  EngineerInfo,
  ServerConfig,
  TicketInfo,
  TransitionScreenState,
} from '@/types/engineer';
import { alarmService } from '@/services/alarm';
import {
  acknowledgeTicket,
  checkPendingRequests,
  getEngineerInfoByMac,
} from '@/services/api';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotificationsAsync,
  scheduleTestEmergencyNotification,
  sendEmergencyNotification,
  dismissEmergencyNotification,
  setDutyNotification,
} from '@/services/notifications';

const STORAGE_KEY_CONFIG = '@esp_engineer_config_v2';
const STORAGE_KEY_LOGS = '@esp_engineer_logs_v1';

const DEFAULT_CONFIG: ServerConfig = {
  serverBaseUrl: 'http://10.101.1.193:8080/espRecieve',
  engineerId: '12',
  macAddress: 'AC:0B:FB:C2:9F:70',
  soundEnabled: true,
  vibrationEnabled: true,
  pollIntervalRequests: 3000,
  pollIntervalInfo: 30000,
  simulationMode: false,
};

const INITIAL_ENGINEER: EngineerInfo = {
  id: '12',
  espId: '12',
  espMac: 'AC:0B:FB:C2:9F:70',
  name: 'Kỹ sư ID: 12',
  lineAssignmentId: null,
  lineName: null,
  isAssigned: false,
  isRegistered: false,
};

const INITIAL_TICKET: TicketInfo = {
  id: '',
  machineCode: '',
  machineName: '',
  location: '',
  description: '',
  status: '',
};

interface EngineerContextValue {
  // State
  state: DeviceState;
  engineerInfo: EngineerInfo;
  currentTicket: TicketInfo;
  config: ServerConfig;
  connectionStatus: ConnectionStatus;
  connectionMessage: string;
  isAcknowledging: boolean;
  acknowledgeError: string | null;
  transitionState: TransitionScreenState;
  logs: ActivityLog[];
  isAlarmActive: boolean;
  pushToken: string | null;
  isBackgroundDutyEnabled: boolean;

  // Actions
  updateConfig: (newConfig: Partial<ServerConfig>) => Promise<void>;
  acknowledgeCurrentTicket: () => Promise<boolean>;
  manualRefresh: () => Promise<void>;
  clearLogs: () => Promise<void>;
  scheduleBackgroundTest: (delaySeconds?: number) => Promise<void>;
  toggleBackgroundDuty: () => void;

  // Simulation / Testing tools
  triggerSimulatedTicket: (customTicket?: Partial<TicketInfo>) => void;
  simulateAcknowledge: () => Promise<boolean>;
  simulateLineUserComplete: () => void;
  simulateTicketCancel: () => void;
  simulateToggleNetwork: () => void;
}

const EngineerContext = createContext<EngineerContextValue | null>(null);

export const EngineerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = useState<ServerConfig>(DEFAULT_CONFIG);
  const [state, setState] = useState<DeviceState>('IDLE');
  const [engineerInfo, setEngineerInfo] = useState<EngineerInfo>(INITIAL_ENGINEER);
  const [currentTicket, setCurrentTicket] = useState<TicketInfo>(INITIAL_TICKET);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('RECONNECTING');
  const [connectionMessage, setConnectionMessage] = useState<string>('Đang khởi tạo kết nối...');
  const [isAcknowledging, setIsAcknowledging] = useState<boolean>(false);
  const [acknowledgeError, setAcknowledgeError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isBackgroundDutyEnabled, setIsBackgroundDutyEnabled] = useState<boolean>(true);
  const [transitionState, setTransitionState] = useState<TransitionScreenState>({
    isActive: false,
    title: '',
    line1: '',
    line2: '',
    expiresAt: 0,
  });

  // Keep references to latest state to avoid stale closures in polling loops
  const stateRef = useRef<DeviceState>(state);
  stateRef.current = state;

  const currentTicketRef = useRef<TicketInfo>(currentTicket);
  currentTicketRef.current = currentTicket;

  const engineerInfoRef = useRef<EngineerInfo>(engineerInfo);
  engineerInfoRef.current = engineerInfo;

  const configRef = useRef<ServerConfig>(config);
  configRef.current = config;

  // Append activity log
  const addLog = useCallback(
    (type: ActivityLog['type'], message: string, details?: string) => {
      const newLog: ActivityLog = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        type,
        message,
        details,
      };
      setLogs((prev) => {
        const updated = [newLog, ...prev.slice(0, 49)];
        AsyncStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    },
    []
  );

  // Load configuration and initialize notifications on mount
  useEffect(() => {
    (async () => {
      try {
        const savedConfig = await AsyncStorage.getItem(STORAGE_KEY_CONFIG);
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          setConfig((prev) => ({ ...prev, ...parsed }));
        }
        const savedLogs = await AsyncStorage.getItem(STORAGE_KEY_LOGS);
        if (savedLogs) {
          setLogs(JSON.parse(savedLogs));
        }
      } catch (err) {
        console.warn('Lỗi khi tải cấu hình:', err);
      }
    })();

    // Register push notification token
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setPushToken(token);
        addLog('INFO', 'Đã cấp quyền & lấy Push Token', token);
      }
    });

    // Listen for notification taps
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      addLog('REQUEST', 'Đã mở app từ thông báo sự cố', JSON.stringify(data));
    });

    return () => {
      sub.remove();
    };
  }, [addLog]);

  // Schedule background notification test
  const scheduleBackgroundTest = useCallback(
    async (delaySeconds = 5) => {
      await scheduleTestEmergencyNotification(delaySeconds, {
        machineName: currentTicketRef.current.machineName || 'Chuyền us #11',
        location: currentTicketRef.current.location || 'Location us #11',
      });
      addLog(
        'INFO',
        `Đã hẹn thông báo sau ${delaySeconds}s (hãy thử khoá màn hình hoặc thoát app)`
      );
    },
    [addLog]
  );

  // Save config helper
  const updateConfig = useCallback(async (newConfig: Partial<ServerConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      AsyncStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  // Clear logs helper
  const clearLogs = useCallback(async () => {
    setLogs([]);
    await AsyncStorage.removeItem(STORAGE_KEY_LOGS);
  }, []);

  // Start alarm helper
  const triggerAlarm = useCallback(() => {
    setIsAlarmActive(true);
    alarmService.startAlarm({
      soundEnabled: configRef.current.soundEnabled,
      vibrationEnabled: configRef.current.vibrationEnabled,
    });
  }, []);

  // Stop alarm helper
  const silenceAlarm = useCallback(() => {
    setIsAlarmActive(false);
    alarmService.stopAlarm();
  }, []);

  // Success chime
  const triggerSuccessBeeps = useCallback(() => {
    setIsAlarmActive(false);
    alarmService.ringSuccessBeep({
      soundEnabled: configRef.current.soundEnabled,
      vibrationEnabled: configRef.current.vibrationEnabled,
    });
  }, []);

  // Transition screen helper (e.g. 4 seconds E.SUCCESS or RESET)
  const setTransition = useCallback(
    (title: string, line1: string, line2: string, durationMs = 4000) => {
      const expiresAt = Date.now() + durationMs;
      setTransitionState({
        isActive: true,
        title,
        line1,
        line2,
        expiresAt,
      });

      setTimeout(() => {
        setTransitionState((prev) => {
          if (Date.now() >= prev.expiresAt) {
            return { ...prev, isActive: false };
          }
          return prev;
        });
      }, durationMs);
    },
    []
  );

  // Fetch engineer info
  const fetchEngineer = useCallback(async () => {
    if (configRef.current.simulationMode) {
      setConnectionStatus('CONNECTED');
      setConnectionMessage('Đang chạy ở chế độ giả lập (Simulation Mode)');
      return;
    }

    const { serverBaseUrl, macAddress } = configRef.current;
    const res = await getEngineerInfoByMac(serverBaseUrl, macAddress);

    if (res.success && res.data) {
      setEngineerInfo(res.data);
      setConnectionStatus('CONNECTED');
      setConnectionMessage(
        res.data.isAssigned
          ? `Đang phụ trách chuyền: ${res.data.lineName || res.data.lineAssignmentId}`
          : 'Kỹ sư này chưa phụ trách chuyền nào.'
      );
    } else {
      if (res.httpCode === 200 || res.error?.includes('Không tìm thấy')) {
        setConnectionStatus('UNREGISTERED');
        setConnectionMessage('Không tìm thấy MAC! Thiết bị chưa đăng ký. Vui lòng liên hệ Admin.');
      } else {
        setConnectionStatus('SERVER_ERROR');
        setConnectionMessage(res.error || 'Lỗi kết nối máy chủ');
      }
    }
  }, []);

  // Polling checkPendingRequests (matches ESP8266 checkPendingRequests)
  const checkRequests = useCallback(async () => {
    if (configRef.current.simulationMode) return;

    // Use configured engineerId or detected engineer ID (defaults to '12')
    const engId = configRef.current.engineerId || engineerInfoRef.current.id || '12';
    if (!engId) return;

    const { serverBaseUrl } = configRef.current;
    const res = await checkPendingRequests(serverBaseUrl, engId);

    if (!res.success) {
      setConnectionStatus('DISCONNECTED');
      setConnectionMessage(res.error || 'Mất kết nối máy chủ');
      return;
    }

    setConnectionStatus('CONNECTED');
    setConnectionMessage(`Đã kết nối máy chủ • Kỹ sư ID: ${engId}`);

    const { hasRequest, ticket } = res.data!;
    const prevTicket = currentTicketRef.current;
    const prevState = stateRef.current;

    // Flag compare (flagF5 in ESP: ticket.id != data.id || ticket.status != data.status)
    const flagF5 =
      !prevTicket.id ||
      !ticket ||
      prevTicket.id !== ticket.id ||
      prevTicket.status !== ticket.status;

    if (hasRequest && ticket) {
      // Any status that is not ACKNOWLEDGED is a new request waiting for confirmation!
      const isAcknowledged = ticket.status === 'ACKNOWLEDGED';

      if (!isAcknowledged && flagF5) {
        // STATE_REQUEST_RECEIVED (status is REQUESTED, NONE, etc.)
        setCurrentTicket(ticket);
        setState('REQUEST_RECEIVED');
        setAcknowledgeError(null);
        triggerAlarm();
        sendEmergencyNotification(ticket).catch((e) =>
          console.log('[Emergency Notif Error]:', e?.message)
        );
        addLog(
          'REQUEST',
          `SỰ CỐ MỚI: ${ticket.machineName} (${ticket.location})`,
          ticket.description
        );
      } else if (isAcknowledged && flagF5) {
        // STATE_ACKNOWLEDGED
        setCurrentTicket(ticket);
        setState('ACKNOWLEDGED');
        silenceAlarm();
        dismissEmergencyNotification().catch(() => {});
        addLog(
          'ACK',
          `Đã ghi nhận nhận việc: ${ticket.machineName}`,
          `Vị trí: ${ticket.location}`
        );
      }
    } else {
      // Server returned hasRequest == false
      dismissEmergencyNotification().catch(() => {});
      if (prevState === 'ACKNOWLEDGED') {
        // Line operator confirmed complete!
        silenceAlarm();
        setState('IDLE');
        setCurrentTicket(INITIAL_TICKET);
        setTransition('E.SUCCESS', 'Người dùng đã xác nhận xong việc', 'Sau 4s sẽ hiện thông tin');
        addLog('SUCCESS', 'Người dùng tại chuyền đã xác nhận xong việc', prevTicket.machineName);
      } else if (prevState === 'REQUEST_RECEIVED') {
        // Request cancelled / cleared
        silenceAlarm();
        setState('IDLE');
        setCurrentTicket(INITIAL_TICKET);
        setTransition('RESET', 'Yêu cầu sự cố đã bị huỷ trên server', 'Sau 4s sẽ hiện thông tin');
        addLog('INFO', 'Yêu cầu sự cố đã được xoá/huỷ trên hệ thống');
      }
    }
  }, [addLog, setTransition, silenceAlarm, triggerAlarm]);

  // Acknowledge action (matches ESP handleButtonPress in REQUEST_RECEIVED)
  const acknowledgeCurrentTicket = useCallback(async (): Promise<boolean> => {
    const ticket = currentTicketRef.current;
    if (!ticket.id) return false;

    setIsAcknowledging(true);
    setAcknowledgeError(null);
    silenceAlarm();
    dismissEmergencyNotification().catch(() => {});

    if (configRef.current.simulationMode) {
      // Simulated acknowledge
      await new Promise((r) => setTimeout(r, 600));
      setState('ACKNOWLEDGED');
      setCurrentTicket((prev) => ({
        ...prev,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: Date.now(),
      }));
      triggerSuccessBeeps();
      setIsAcknowledging(false);
      addLog('ACK', `[MÔ PHỎNG] ĐÃ NHẬN VIỆC: ${ticket.machineName}`, ticket.location);
      return true;
    }

    const { serverBaseUrl } = configRef.current;
    const res = await acknowledgeTicket(serverBaseUrl, ticket.id);

    setIsAcknowledging(false);

    if (res.success) {
      setState('ACKNOWLEDGED');
      setCurrentTicket((prev) => ({
        ...prev,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: Date.now(),
      }));
      triggerSuccessBeeps();
      dismissEmergencyNotification().catch(() => {});
      addLog('ACK', `ĐÃ NHẬN VIỆC: ${ticket.machineName}`, ticket.location);
      return true;
    } else {
      // API call failed: remain in REQUEST_RECEIVED, restart alarm
      triggerAlarm();
      const errMsg = res.error || 'Thao tác nhận việc thất bại, vui lòng thử lại';
      setAcknowledgeError(errMsg);
      addLog('ERROR', `Nhận việc thất bại: ${errMsg}`);
      return false;
    }
  }, [addLog, silenceAlarm, triggerAlarm, triggerSuccessBeeps]);

  // Manual refresh
  const manualRefresh = useCallback(async () => {
    await fetchEngineer();
    await checkRequests();
    addLog('INFO', 'Đã làm mới dữ liệu thủ công');
  }, [addLog, checkRequests, fetchEngineer]);

  // Main polling timers (3s pending check, 30s engineer info check)
  useEffect(() => {
    // Initial fetch
    fetchEngineer();
    checkRequests();

    // 1. Pending requests timer (every 3000ms by default)
    const requestIntervalId = setInterval(() => {
      checkRequests();
    }, config.pollIntervalRequests || 3000);

    // 2. Engineer info timer (every 30000ms by default, only when IDLE)
    const infoIntervalId = setInterval(() => {
      if (stateRef.current === 'IDLE') {
        fetchEngineer();
      }
    }, config.pollIntervalInfo || 30000);

    return () => {
      clearInterval(requestIntervalId);
      clearInterval(infoIntervalId);
      silenceAlarm();
    };
  }, [
    checkRequests,
    config.pollIntervalInfo,
    config.pollIntervalRequests,
    fetchEngineer,
    silenceAlarm,
  ]);

  // Toggle background duty mode
  const toggleBackgroundDuty = useCallback(() => {
    setIsBackgroundDutyEnabled((prev) => {
      const next = !prev;
      addLog(
        'INFO',
        next
          ? 'Đã BẬT Chế độ trực ca chạy ngầm (Sẵn sàng nhận việc khi khoá màn hình)'
          : 'Đã TẮT Chế độ trực ca chạy ngầm'
      );
      return next;
    });
  }, [addLog]);

  // Sync duty status notification with engineer assignment and duty toggle
  useEffect(() => {
    if (isBackgroundDutyEnabled) {
      setDutyNotification(true, {
        lineName: engineerInfo.lineName || 'assem #2',
        engineerName: engineerInfo.name || 'Kỹ sư ID: 12',
      }).catch(() => {});
    } else {
      setDutyNotification(false).catch(() => {});
    }
  }, [engineerInfo.lineName, engineerInfo.name, isBackgroundDutyEnabled]);

  // AppState listener: maintain polling & immediately refresh when opening app
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('[AppState Change]:', nextAppState);
      if (nextAppState === 'active') {
        // Immediately fetch data on unlock / focus
        checkRequests();
        if (stateRef.current === 'IDLE') {
          fetchEngineer();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        if (isBackgroundDutyEnabled) {
          setDutyNotification(true, {
            lineName: engineerInfoRef.current.lineName || 'assem #2',
            engineerName: engineerInfoRef.current.name || 'Kỹ sư ID: 12',
          }).catch(() => {});
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkRequests, fetchEngineer, isBackgroundDutyEnabled]);

  // SIMULATION METHODS
  const triggerSimulatedTicket = useCallback(
    (customTicket?: Partial<TicketInfo>) => {
      const demoTicket: TicketInfo = {
        id: `DEMO_${Date.now()}`,
        machineCode: customTicket?.machineCode || 'LINE_05',
        machineName: customTicket?.machineName || 'Máy Dập Khuôn Thủy Lực #05',
        location: customTicket?.location || 'Phân xưởng A - Khu Cột D12',
        description:
          customTicket?.description ||
          'Kẹt phôi cơ cấu đẩy, nhiệt độ dầu thủy lực vượt ngưỡng cho phép 85°C.',
        status: 'REQUESTED',
        receivedAt: Date.now(),
      };

      setCurrentTicket(demoTicket);
      setState('REQUEST_RECEIVED');
      setAcknowledgeError(null);
      triggerAlarm();
      sendEmergencyNotification(demoTicket).catch((e) =>
        console.log('[Emergency Notif Error]:', e?.message)
      );
      addLog(
        'REQUEST',
        `[MÔ PHỎNG] Báo động sự cố: ${demoTicket.machineName}`,
        demoTicket.description
      );
    },
    [addLog, triggerAlarm]
  );

  const simulateAcknowledge = useCallback(async (): Promise<boolean> => {
    return acknowledgeCurrentTicket();
  }, [acknowledgeCurrentTicket]);

  const simulateLineUserComplete = useCallback(() => {
    if (stateRef.current !== 'ACKNOWLEDGED') return;

    const finished = currentTicketRef.current;
    silenceAlarm();
    dismissEmergencyNotification().catch(() => {});
    setState('IDLE');
    setCurrentTicket(INITIAL_TICKET);
    setTransition(
      'E.SUCCESS',
      'Người dùng tại chuyền đã xác nhận xong việc',
      'Sau 4s sẽ hiện thông tin bình thường'
    );
    addLog('SUCCESS', `[MÔ PHỎNG] Chuyền xác nhận hoàn thành: ${finished.machineName}`);
  }, [addLog, setTransition, silenceAlarm]);

  const simulateTicketCancel = useCallback(() => {
    silenceAlarm();
    dismissEmergencyNotification().catch(() => {});
    setState('IDLE');
    setCurrentTicket(INITIAL_TICKET);
    setTransition('RESET', 'Yêu cầu sự cố đã bị huỷ', 'Sau 4s sẽ phục hồi');
    addLog('INFO', '[MÔ PHỎNG] Ticket đã được huỷ');
  }, [addLog, setTransition, silenceAlarm]);

  const simulateToggleNetwork = useCallback(() => {
    setConnectionStatus((prev) => {
      if (prev === 'CONNECTED') {
        silenceAlarm();
        addLog('NETWORK', '[MÔ PHỎNG] Mất kết nối mạng');
        setConnectionMessage('Mất kết nối với máy chủ xưởng');
        return 'DISCONNECTED';
      } else {
        addLog('NETWORK', '[MÔ PHỎNG] Đã khôi phục kết nối mạng');
        setConnectionMessage('Đã kết nối lại bình thường');
        return 'CONNECTED';
      }
    });
  }, [addLog, silenceAlarm]);

  return (
    <EngineerContext.Provider
      value={{
        state,
        engineerInfo,
        currentTicket,
        config,
        connectionStatus,
        connectionMessage,
        isAcknowledging,
        acknowledgeError,
        transitionState,
        logs,
        isAlarmActive,
        pushToken,
        isBackgroundDutyEnabled,
        updateConfig,
        acknowledgeCurrentTicket,
        manualRefresh,
        clearLogs,
        scheduleBackgroundTest,
        toggleBackgroundDuty,
        triggerSimulatedTicket,
        simulateAcknowledge,
        simulateLineUserComplete,
        simulateTicketCancel,
        simulateToggleNetwork,
      }}>
      {children}
    </EngineerContext.Provider>
  );
};

export const useEngineer = (): EngineerContextValue => {
  const context = useContext(EngineerContext);
  if (!context) {
    throw new Error('useEngineer must be used within an EngineerProvider');
  }
  return context;
};
