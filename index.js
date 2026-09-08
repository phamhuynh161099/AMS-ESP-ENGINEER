import 'react-native-reanimated';
import notifee, { EventType } from '@felipe-software/react-native-notify-kit';
import App from 'expo-router/entry';

// ---------------------------------------------------------------------------
// Background + killed-state event handler
// Must be registered BEFORE AppRegistry.registerComponent runs.
// ---------------------------------------------------------------------------
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    console.log('[NotifyKit-bg] Notification pressed:', detail.notification?.id);
  } else if (type === EventType.ACTION_PRESS) {
    console.log('[NotifyKit-bg] Action pressed:', detail.pressAction?.id);
    if (detail.pressAction?.id === 'stop_foreground') {
      await notifee.stopForegroundService();
    }
  }
});

export default App;
