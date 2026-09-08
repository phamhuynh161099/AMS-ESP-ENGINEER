import { NativeModules, Platform } from 'react-native';

const { DutyPreference } = NativeModules;

/**
 * Persist background-duty preference to SharedPreferences (readable by BootReceiver
 * without needing the React Native bridge).
 */
export async function setBackgroundDutyEnabled(enabled: boolean): Promise<void> {
  if (Platform.OS !== 'android' || !DutyPreference) return;
  try {
    await DutyPreference.setBackgroundDutyEnabled(enabled);
  } catch {
    // Silently fail — not critical
  }
}

export async function isBackgroundDutyEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android' || !DutyPreference) return false;
  try {
    return await DutyPreference.isBackgroundDutyEnabled();
  } catch {
    return false;
  }
}
