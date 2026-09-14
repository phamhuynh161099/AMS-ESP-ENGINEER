import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
} from '@felipe-software/react-native-notify-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { checkPendingRequests } from './api';
import { setBackgroundDutyEnabled } from './dutyPreference';

// ---------------------------------------------------------------------------
// Channel IDs
// ---------------------------------------------------------------------------
export const CHANNEL_REALTIME = 'realtime-alert';
export const CHANNEL_DUTY = 'duty-status';

const SOUND_ALERT = 'alert_sound'; // falls back to default if file missing

interface PollingParams {
  baseUrl: string;
  engineerId: string;
  pollIntervalMs: number;
}

const STORAGE_KEY_CONFIG = '@esp_engineer_config_v2';
const DEFAULT_BASE_URL = 'http://10.101.1.193:8080/espRecieve';
const DEFAULT_ENGINEER_ID = '12';

let currentParams: PollingParams | null = null;
let isRunning = false;
let stopTaskCallback: (() => void) | null = null;

// ---------------------------------------------------------------------------
// Setup notification channels — call once on app start.
// ---------------------------------------------------------------------------
export async function setupBackgroundChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await notifee.requestPermission();

  // Emergency / real-time alerts: HIGH importance + sound + vibration + bypass DND
  await notifee.createChannel({
    id: CHANNEL_REALTIME,
    name: 'Thông báo Sự cố (Engineer Call)',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: SOUND_ALERT,
    vibration: true,
    bypassDnd: true,
    lightColor: '#ef4444',
  });

  // Duty / ongoing status: LOW, silent, no badge
  await notifee.createChannel({
    id: CHANNEL_DUTY,
    name: 'Trạng Thái Trực Ca',
    importance: AndroidImportance.LOW,
    sound: undefined,
    vibration: false,
    visibility: AndroidVisibility.PUBLIC,
  });
}

// ---------------------------------------------------------------------------
// Track last seen ticket so we only alert on NEW requests
// ---------------------------------------------------------------------------
let lastSeenTicketId: string | null = null;

function hasNewTicket(ticketId: string | undefined): boolean {
  if (!ticketId) return false;
  if (ticketId === lastSeenTicketId) return false;
  lastSeenTicketId = ticketId;
  return true;
}

// ---------------------------------------------------------------------------
// Helper to restore config if JS instance restarted in background
// ---------------------------------------------------------------------------
async function getOrRestoreParams(): Promise<PollingParams | null> {
  if (currentParams) return currentParams;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const cfg = JSON.parse(raw);
      currentParams = {
        baseUrl: cfg.serverBaseUrl || DEFAULT_BASE_URL,
        engineerId: cfg.engineerId || DEFAULT_ENGINEER_ID,
        pollIntervalMs: 15_000,
      };
      return currentParams;
    }
  } catch (e) {
    console.warn('[BG-Poll] Lỗi khi khôi phục cấu hình từ AsyncStorage:', e);
  }

  currentParams = {
    baseUrl: DEFAULT_BASE_URL,
    engineerId: DEFAULT_ENGINEER_ID,
    pollIntervalMs: 15_000,
  };
  return currentParams;
}

// ---------------------------------------------------------------------------
// Core polling logic used by the foreground service
// ---------------------------------------------------------------------------
async function pollAndAlert(
  baseUrl: string,
  engineerId: string,
): Promise<void> {
  try {
    const res = await checkPendingRequests(baseUrl, engineerId);
    if (!res.success || !res.data) return;

    const { hasRequest, ticket } = res.data;
    if (hasRequest && ticket && hasNewTicket(ticket.id)) {
      // Status must be something other than ACKNOWLEDGED to trigger an alert
      if (ticket.status !== 'ACKNOWLEDGED') {
        await notifee.displayNotification({
          title: `🚨 SỰ CỐ KHẨN CẤP: ${ticket.machineName}`,
          body: `Vị trí: ${ticket.location}. Chạm để xác nhận nhận việc!`,
          data: {
            type: 'EMERGENCY_CALL',
            ticketId: ticket.id,
            machineName: ticket.machineName,
            location: ticket.location,
            description: ticket.description,
          },
          android: {
            channelId: CHANNEL_REALTIME,
            importance: AndroidImportance.HIGH,
            sound: SOUND_ALERT,
            pressAction: { id: 'default' },
            fullScreenAction: { id: 'default' },
            category: AndroidCategory.CALL,
            vibrationPattern: [0, 500, 200, 500, 200, 500, 200, 500],
            autoCancel: false, // keep until user taps
          },
        });
      }
    }
  } catch (e) {
    // Silent — don't let polling crash the service
    console.warn('[BG-Poll] pollAndAlert error:', e);
  }
}

// ---------------------------------------------------------------------------
// Foreground service task — registered in index.js at top-level
// Returns a Promise that keeps the service alive while isRunning is true
// ---------------------------------------------------------------------------
export function runForegroundPollingTask(): Promise<void> {
  return new Promise<void>(async (resolve) => {
    if (stopTaskCallback) {
      stopTaskCallback();
    }

    isRunning = true;
    stopTaskCallback = () => {
      isRunning = false;
      resolve();
    };

    console.log('[BG-Poll] Foreground service loop started');

    while (isRunning) {
      const params = await getOrRestoreParams();

      if (params && isRunning) {
        try {
          await pollAndAlert(params.baseUrl, params.engineerId);
        } catch (e) {
          console.warn('[BG-Poll] pollAndAlert cycle error:', e);
        }
      }

      if (!isRunning) break;

      const interval = params?.pollIntervalMs ?? 15_000;
      await new Promise<void>((r) => {
        const timer = setTimeout(r, interval);
        const prevStop = stopTaskCallback;
        stopTaskCallback = () => {
          clearTimeout(timer);
          r();
          if (prevStop) prevStop();
        };
      });
    }

    console.log('[BG-Poll] Foreground service loop finished');
    resolve();
  });
}

// ---------------------------------------------------------------------------
// Start foreground polling — displays persistent notification
// ---------------------------------------------------------------------------
export async function startBackgroundPolling(
  baseUrl: string,
  engineerId: string,
  pollIntervalMs = 15_000,
): Promise<void> {
  currentParams = { baseUrl, engineerId, pollIntervalMs };

  await setupBackgroundChannels();

  // Ongoing notification — user can tap to open app or tap action to stop
  await notifee.displayNotification({
    title: '🔄 Đang đồng bộ dữ liệu',
    body: 'Ứng dụng đang chạy nền • Sẵn sàng nhận sự cố',
    android: {
      channelId: CHANNEL_DUTY,
      asForegroundService: true,
      ongoing: true,
      pressAction: { id: 'default' },
      actions: [
        {
          title: 'Dừng trực ca',
          pressAction: { id: 'stop_foreground' },
        },
      ],
    },
  });
}

// ---------------------------------------------------------------------------
// Stop foreground service
// ---------------------------------------------------------------------------
export async function stopBackgroundPolling(): Promise<void> {
  isRunning = false;
  currentParams = null;
  lastSeenTicketId = null;

  if (stopTaskCallback) {
    stopTaskCallback();
    stopTaskCallback = null;
  }

  try {
    await setBackgroundDutyEnabled(false);
  } catch { }

  try {
    await notifee.stopForegroundService();
  } catch {
    // Ignore — service may not be running
  }
}

// ---------------------------------------------------------------------------
// Display a test emergency notification immediately (for settings screen)
// ---------------------------------------------------------------------------
export async function sendTestNotification(ticketInfo?: {
  machineName?: string;
  location?: string;
}): Promise<void> {
  await setupBackgroundChannels();
  await notifee.displayNotification({
    title: `🚨 SỰ CỐ MỚI: ${ticketInfo?.machineName ?? 'Chuyền us #11'}`,
    body: `Vị trí: ${ticketInfo?.location ?? 'Location us #11'}. Bấm để xem chi tiết!`,
    android: {
      channelId: CHANNEL_REALTIME,
      importance: AndroidImportance.HIGH,
      sound: SOUND_ALERT,
      pressAction: { id: 'default' },
      fullScreenAction: { id: 'default' },
      category: AndroidCategory.CALL,
      vibrationPattern: [0, 500, 200, 500, 200, 500, 200, 500],
    },
  });
}

// ---------------------------------------------------------------------------
// Open power-manager settings so user can whitelist the app (OEM battery opt)
// ---------------------------------------------------------------------------
export async function openBatterySettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await notifee.openBatteryOptimizationSettings();
  } catch {
    // Fallback: try power manager
    try {
      await notifee.openPowerManagerSettings();
    } catch {
      // Device may not support it
    }
  }
}
