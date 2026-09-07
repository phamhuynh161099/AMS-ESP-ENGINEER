import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';

// Filter out the Android Expo Go remote push notification deprecation error from terminal
if (typeof console !== 'undefined' && console.error) {
  const origError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('expo-notifications: Android Push notifications')
    ) {
      return;
    }
    origError(...args);
  };
}

import * as Notifications from 'expo-notifications';

// Configure how notifications are presented when the app is in foreground or background
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

/**
 * Configure Android Notification Channels:
 * 1. emergency_calls: Maximum Importance, loud sound, aggressive vibration, and lockscreen visibility.
 * 2. duty_status: Low Importance, silent ongoing notification to keep the background duty active.
 */
export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('emergency_calls', {
        name: 'Báo Động Khẩn Cấp (Engineer Call)',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500, 200, 500],
        lightColor: '#ef4444',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      await Notifications.setNotificationChannelAsync('duty_status', {
        name: 'Trạng Thái Trực Ca (Duty Status)',
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        enableVibrate: false,
        showBadge: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (e: any) {
      console.warn('[Notification Channel Error]:', e?.message);
    }
  }
}

/**
 * Request notification permissions and obtain Expo Push Token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notification] Quyền thông báo chưa được cấp.');
      return null;
    }

    await setupNotificationChannels();

    // In Expo Go on Android (SDK 53/54), remote FCM push tokens are disabled by Expo
    // Return a descriptive identifier so it doesn't fail
    if (isRunningInExpoGo() && Platform.OS === 'android') {
      console.log('[Notification] Expo Go Android: Đang dùng chế độ Báo động & Kênh thông báo cục bộ.');
      return 'EXPO_GO_LOCAL_MODE';
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    console.log('[Notification] Expo Push Token:', tokenData.data);
    return tokenData.data;
  } catch (err: any) {
    console.log('[Notification Info]: Chế độ thông báo cục bộ đã kích hoạt.', err?.message);
    return 'EXPO_GO_LOCAL_MODE';
  }
}

let activeEmergencyNotificationId: string | null = null;
let activeDutyNotificationId: string | null = null;

/**
 * Send an immediate, maximum-priority emergency notification that wakes
 * the device, pops up over the lockscreen, and sounds the alarm.
 */
export async function sendEmergencyNotification(ticketInfo: {
  machineName?: string;
  location?: string;
  id?: string | number;
  description?: string;
}): Promise<string> {
  await setupNotificationChannels();

  const title = `🚨 SỰ CỐ KHẨN CẤP: ${ticketInfo.machineName || 'Chuyền máy'}`;
  const body = `Vị trí: ${ticketInfo.location || 'Chưa rõ'}. Chạm để xác nhận nhận việc!`;

  // Dismiss any existing emergency notification before showing a new one
  if (activeEmergencyNotificationId) {
    await Notifications.dismissNotificationAsync(activeEmergencyNotificationId).catch(() => {});
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        type: 'EMERGENCY_CALL',
        ticketId: ticketInfo.id,
        machineName: ticketInfo.machineName || '',
        location: ticketInfo.location || '',
      },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      sticky: true,
      autoDismiss: false,
      vibrate: [0, 500, 200, 500, 200, 500, 200, 500],
    },
    trigger: null, // Deliver immediately!
  });

  activeEmergencyNotificationId = id;
  return id;
}

/**
 * Dismiss active emergency notification when ticket is acknowledged or cancelled
 */
export async function dismissEmergencyNotification(): Promise<void> {
  if (activeEmergencyNotificationId) {
    try {
      await Notifications.dismissNotificationAsync(activeEmergencyNotificationId);
    } catch {
      // Ignore if already dismissed
    }
    activeEmergencyNotificationId = null;
  }
}

/**
 * Display or clear an ongoing background duty notification
 */
export async function setDutyNotification(
  active: boolean,
  info?: { lineName?: string; engineerName?: string }
): Promise<void> {
  if (Platform.OS === 'web') return;
  await setupNotificationChannels();

  if (!active) {
    if (activeDutyNotificationId) {
      await Notifications.dismissNotificationAsync(activeDutyNotificationId).catch(() => {});
      activeDutyNotificationId = null;
    }
    return;
  }

  const title = `🟢 Ca trực đang kích hoạt: ${info?.engineerName || 'Kỹ sư'}`;
  const body = `Đang giám sát chuyền ${info?.lineName || 'assem #2'} • Sẵn sàng nhận sự cố khi khoá màn hình`;

  try {
    if (activeDutyNotificationId) {
      await Notifications.dismissNotificationAsync(activeDutyNotificationId).catch(() => {});
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'DUTY_STATUS' },
        priority: Notifications.AndroidNotificationPriority.LOW,
        sticky: true,
      },
      trigger: null,
    });
    activeDutyNotificationId = id;
  } catch (e: any) {
    console.warn('[Duty Notification Error]:', e?.message);
  }
}

/**
 * Schedule a local emergency notification after a delay (e.g. 5 seconds),
 * allowing the engineer to lock the phone / close the app and verify that
 * the phone rings loudly and shows the emergency alert on the lockscreen!
 */
export async function scheduleTestEmergencyNotification(
  delaySeconds = 5,
  ticketInfo?: { machineName?: string; location?: string }
): Promise<string> {
  await setupNotificationChannels();

  const title = `🚨 SỰ CỐ MỚI: ${ticketInfo?.machineName || 'Chuyền us #11'}`;
  const body = `Vị trí: ${ticketInfo?.location || 'Location us #11'}. Bấm để xem chi tiết và xác nhận nhận việc!`;

  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        type: 'EMERGENCY_CALL',
        machineName: ticketInfo?.machineName || 'Chuyền us #11',
        location: ticketInfo?.location || 'Location us #11',
      },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      sticky: true,
      vibrate: [0, 500, 200, 500, 200, 500, 200, 500],
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, delaySeconds),
      channelId: 'emergency_calls',
    },
  });
}
