import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, createAudioPlayer, AudioPlayer } from 'expo-audio';

// Initialize audio mode for background playback on mobile
if (Platform.OS !== 'web') {
  try {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'mixWithOthers',
    }).catch((e) => console.log('[AudioMode Info]:', e?.message));
  } catch {}
}

// Generate a pure square/sine wave PCM WAV as base64 for 3136 Hz beep (matching ESP8266 tone)
function generateBeepWavBase64(frequency = 3136, durationMs = 200, sampleRate = 8000): string {
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = numSamples * 2; // 16-bit
  const fileSize = 44 + dataSize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, fileSize - 8, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  // Write PCM samples (Square wave smoothed for pleasant industrial buzzer)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sinVal = Math.sin(2 * Math.PI * frequency * t);
    // Slight overdrive for buzzer tone
    const sample = Math.max(-1, Math.min(1, sinVal * 2)) * 16000;
    view.setInt16(44 + i * 2, sample, true);
  }

  // Convert buffer to base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  if (typeof btoa !== 'undefined') {
    return 'data:audio/wav;base64,' + btoa(binary);
  }
  return '';
}

const BEEP_DATA_URI = generateBeepWavBase64(3136, 200);

class AlarmService {
  private isAlarmActive = false;
  private alarmIntervalId: ReturnType<typeof setInterval> | null = null;
  private webAudioCtx: any = null;
  private nativePlayer: AudioPlayer | null = null;

  private getWebAudioContext() {
    if (Platform.OS !== 'web') return null;
    try {
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!this.webAudioCtx && AudioContextClass) {
        this.webAudioCtx = new AudioContextClass();
      }
      if (this.webAudioCtx && this.webAudioCtx.state === 'suspended') {
        this.webAudioCtx.resume();
      }
      return this.webAudioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Play a single beep sound (3136Hz by default, 200ms)
   */
  public playBeep(frequency = 3136, durationMs = 200) {
    if (Platform.OS === 'web') {
      try {
        const ctx = this.getWebAudioContext();
        if (ctx) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = frequency;
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + durationMs / 1000);
          return;
        }
      } catch {
        // Fallback to HTML5 audio
      }

      try {
        if (typeof Audio !== 'undefined' && BEEP_DATA_URI) {
          const audio = new Audio(BEEP_DATA_URI);
          audio.volume = 0.6;
          audio.play().catch(() => {});
        }
      } catch {
        // Audio error ignored
      }
    } else {
      // Native (Android / iOS)
      try {
        if (!this.nativePlayer && BEEP_DATA_URI) {
          this.nativePlayer = createAudioPlayer(BEEP_DATA_URI, { keepAudioSessionActive: true });
        }
        if (this.nativePlayer) {
          this.nativePlayer.seekTo(0).then(() => {
            this.nativePlayer?.play();
          }).catch(() => {});
        }
      } catch {
        // Fallback to haptics on native
      }
    }
  }

  /**
   * Start continuous alarm (200ms beep, 300ms pause)
   */
  public startAlarm(options: { soundEnabled: boolean; vibrationEnabled: boolean }) {
    if (this.isAlarmActive) return;
    this.isAlarmActive = true;

    // 1. Continuous vibration pattern: 200ms vibrate, 300ms pause
    if (options.vibrationEnabled) {
      if (Platform.OS !== 'web') {
        // Repeat from index 0
        Vibration.vibrate([200, 300], true);
      }
    }

    // 2. Play initial sound immediately
    if (options.soundEnabled) {
      this.playBeep(3136, 200);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }
    }

    // 3. Repeating cycle: 500ms (200ms on + 300ms off)
    this.alarmIntervalId = setInterval(() => {
      if (!this.isAlarmActive) {
        this.stopAlarm();
        return;
      }
      if (options.soundEnabled) {
        this.playBeep(3136, 200);
      }
      if (options.vibrationEnabled && Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }
    }, 500);
  }

  /**
   * Stop continuous alarm immediately
   */
  public stopAlarm() {
    this.isAlarmActive = false;
    if (this.alarmIntervalId) {
      clearInterval(this.alarmIntervalId);
      this.alarmIntervalId = null;
    }
    Vibration.cancel();
  }

  /**
   * Play 3 short confirmation beeps (matches ESP8266 ringBuzzer)
   */
  public ringSuccessBeep(options: { soundEnabled: boolean; vibrationEnabled: boolean }) {
    this.stopAlarm();

    if (options.vibrationEnabled && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Vibration.vibrate([0, 150, 100, 150, 100, 150]);
    }

    if (!options.soundEnabled) return;

    let count = 0;
    const interval = setInterval(() => {
      this.playBeep(3136, 150);
      count++;
      if (count >= 3) {
        clearInterval(interval);
      }
    }, 250);
  }

  /**
   * Boot sound (matches ESP8266 setup tone 3322Hz 500ms)
   */
  public playBootTone(options: { soundEnabled: boolean }) {
    if (options.soundEnabled) {
      this.playBeep(3322, 400);
    }
  }

  public getIsAlarmActive(): boolean {
    return this.isAlarmActive;
  }
}

export const alarmService = new AlarmService();
