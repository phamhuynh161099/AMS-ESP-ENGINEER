import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  EventType,
} from '@felipe-software/react-native-notify-kit';
import { checkPendingRequests } from './api';

// ---------------------------------------------------------------------------
// Channel IDs
// ---------------------------------------------------------------------------
export const CHANNEL_REALTIME = 'realtime-alert';
export const CHANNEL_DUTY     = 'duty-status';

const SOUND_ALERT = 'alert_sound'; // falls back to default if file missing

// ---------------------------------------------------------------------------
// Setup notification channels — call once on app start.
// ---------------------------------------------------------------------------
export async function setupBackgroundChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await notifee.requestPermission();

  // Emergency / real-time alerts: HIGH importance + sound + vibration + bypass DND
  await notifee.createChannel({
    id:          CHANNEL_REALTIME,
    name:        'Thông báo Sự cố (Engineer Call)',
    importance:   AndroidImportance.HIGH,
    visibility:  AndroidVisibility.PUBLIC,
    sound:       SOUND_ALERT,
    vibration:   true,
    bypassDnd:   true,
    lightColor:   '#ef4444',
  });

  // Duty / ongoing status: LOW, silent, no badge
  await notifee.createChannel({
    id:          CHANNEL_DUTY,
    name:        'Trạng Thái Trực Ca',
    importance:   AndroidImportance.LOW,
    sound:       undefined,
    vibration:   false,
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
          title:   `🚨 SỰ CỐ KHẨN CẤP: ${ticket.machineName}`,
          body:    `Vị trí: ${ticket.location}. Chạm để xác nhận nhận việc!`,
          data: {
            type:     'EMERGENCY_CALL',
            ticketId: ticket.id,
            machineName: ticket.machineName,
            location:    ticket.location,
            description:  ticket.description,
          },
          android: {
            channelId:          CHANNEL_REALTIME,
            importance:          AndroidImportance.HIGH,
            sound:               SOUND_ALERT,
            pressAction:         { id: 'default' },
            fullScreenAction:    { id: 'default' },
            category:            AndroidCategory.CALL,
            vibrationPattern:     [0, 500, 200, 500, 200, 500, 200, 500],
            autoCancel:           false, // keep until user taps
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
// Start the foreground service that polls in background
// ---------------------------------------------------------------------------
export async function startBackgroundPolling(
  baseUrl: string,
  engineerId: string,
  pollIntervalMs = 15_000,
): Promise<void> {
  // If already running, stop it first
  await stopBackgroundPolling();

  await setupBackgroundChannels();

  // Ongoing notification — user can't swipe away
  await notifee.displayNotification({
    title:   '🔄 Đang đồng bộ dữ liệu',
    body:    'Ứng dụng đang chạy nền • Sẵn sàng nhận sự cố',
    android: {
      channelId: CHANNEL_DUTY,
      asForegroundService: true,
      ongoing: true,
      pressAction: { id: 'stop_foreground' },
    },
  });

  // Register + launch the foreground service
  notifee.registerForegroundService(async (notification) => {
    let running = true;

    // Handle stop action
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'stop_foreground') {
        running = false;
        await notifee.stopForegroundService();
      }
    });

    while (running) {
      await pollAndAlert(baseUrl, engineerId);
      await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  });
}

// ---------------------------------------------------------------------------
// Stop foreground service
// ---------------------------------------------------------------------------
export async function stopBackgroundPolling(): Promise<void> {
  try {
    await notifee.stopForegroundService();
    lastSeenTicketId = null;
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
    title:   `🚨 SỰ CỐ MỚI: ${ticketInfo?.machineName ?? 'Chuyền us #11'}`,
    body:    `Vị trí: ${ticketInfo?.location ?? 'Location us #11'}. Bấm để xem chi tiết!`,
    android: {
      channelId:          CHANNEL_REALTIME,
      importance:          AndroidImportance.HIGH,
      sound:               SOUND_ALERT,
      pressAction:         { id: 'default' },
      fullScreenAction:    { id: 'default' },
      category:            AndroidCategory.CALL,
      vibrationPattern:     [0, 500, 200, 500, 200, 500, 200, 500],
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
