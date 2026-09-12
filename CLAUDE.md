# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ESP Engineer Call App** — Expo SDK 54 React Native app chạy trên máy PDA TC21, kết nối WiFi xưởng tới ESP8266 server để nhận thông báo sự cố kỹ thuật. App hiển thị notification trên lockscreen khi màn hình điện thoại bị khóa.

**Target device**: Zebra TC21 (Android, ARM)
**Backend**: ESP8266 server tại `http://10.101.1.193:8080/espRecieve`

---

## Commands

```bash
# Development
npx expo start                # Metro dev server (cổng 8081)
adb reverse tcp:8081 tcp:8081 # Forward Metro sang TC21 khi cắm USB

# Build Android
npx expo run:android           # Debug build
npx expo run:android --variant release  # Release APK

# Lint
npm run lint
```

**Quy trình build đầu tiên trên TC21**: Build release APK, cài sang TC21, sau đó chỉ cần `adb reverse` + `npx expo start` là test được mà không cần build lại.

---

## Architecture

### State Management — `EngineerContext`

Toàn bộ trạng thái app tập trung trong `EngineerContext` (`context/EngineerContext.tsx`):

- **DeviceState**: `IDLE` → `REQUEST_RECEIVED` → `ACKNOWLEDGED` → `IDLE`
- **Polling**: `checkRequests()` mỗi 3 giây + `fetchEngineer()` mỗi 30 giây khi IDLE
- **Refs pattern**: Dùng `useRef` để tránh stale closures trong setInterval

### Dual Notification Systems

Hai hệ thống notification chạy song song:

**1. expo-notifications** (`services/notifications.ts`)
- Triggers notification khi app đang mở (foreground)
- `setupNotificationChannels()` tạo 2 channels:
  - `emergency_calls`: MAX importance, lockscreen, bypass DND
  - `duty_status`: LOW importance, silent ongoing
- `sendEmergencyNotification()` — hiện notification ngay lập tức
- `scheduleTestEmergencyNotification()` — hẹn giờ notification (test lockscreen)

**2. react-native-notify-kit** (`services/backgroundPolling.ts`)
- Foreground Service giữ app alive khi lockscreen
- `startBackgroundPolling()` hiện persistent notification "Đang đồng bộ dữ liệu"
- `runForegroundPollingTask()` loop gọi API mỗi 15 giây khi screen off
- `setupBackgroundChannels()` tạo channels `realtime-alert` và `duty-status`
- Khi có sự cố mới → `notifee.displayNotification()` với `fullScreenAction`

### Alarm Service — `alarm.ts`

- **startAlarm()**: beep 3136Hz + vibration 200ms on/300ms off cycle
- **ringSuccessBeep()**: 3 bíp ngắn khi nhận việc thành công
- **playBootTone()**: 3322Hz 400ms tone khi khởi động
- PCM WAV 8000Hz sample rate được generate base64 trực tiếp trong code

### API Layer — `services/api.ts`

3 endpoint chính:
- `GET /get-engineer-info-by?mac={mac}` — lấy thông tin kỹ sư (polled 30s)
- `GET /checkPendingRequest/{eng_id}` — kiểm tra sự cố mới (polled 3s)
- `POST /acknowledge` — xác nhận nhận việc (currentRequestId + macAddress)

### Types — `types/engineer.ts`

```typescript
DeviceState = 'IDLE' | 'REQUEST_RECEIVED' | 'ACKNOWLEDGED'
ConnectionStatus = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'UNREGISTERED' | 'SERVER_ERROR'
EngineerInfo = { id, espId, espMac, name, lineAssignmentId, lineName, isAssigned, isRegistered }
TicketInfo = { id, machineCode, machineName, location, description, status }
```

---

## Folder Structure

```
app/                    # expo-router screens (file-based routing)
  (tabs)/               # Tab navigation
    index.tsx           # Trực Ban — main dashboard, hiển thị ticket
    history.tsx         # Nhật Ký — activity log với filter
    settings.tsx        # Cài Đặt & Lab — config, simulation, test buttons
  modal.tsx             # System info modal
  _layout.tsx           # Root layout: EngineerProvider + Stack

context/
  EngineerContext.tsx   # Global state, polling, context actions

services/
  api.ts                # REST API calls tới ESP server
  alarm.ts              # Audio/haptic alarm (single alarmService instance)
  notifications.ts      # expo-notifications: in-app notifications
  backgroundPolling.ts  # react-native-notify-kit: foreground service
  dutyPreference.ts     # SharedPreferences wrapper cho BootReceiver

components/
  engineer/
    TicketCard.tsx      # Main card hiển thị ticket info + nút nhận việc
    OledHeader.tsx      # Industrial-style header (line name, time, status)
    TransitionBanner.tsx # 4-second E.SUCCESS / RESET overlay
    LiveActivityBar.tsx # Bottom status bar (connection, service status)

types/
  engineer.ts           # Shared TypeScript types

constants/
  theme.ts              # Color tokens

app.json               # Expo config: permissions, plugins, android package
```

---

## Key Patterns

### Lockscreen Notification Flow

1. ESP8266 bấm nút → gửi request lên server
2. App polling `checkPendingRequest` mỗi 3s (foreground) hoặc 15s (background service)
3. Phát hiện `hasRequest: true, status: REQUESTED` → gọi `triggerAlarm()` + `sendEmergencyNotification()`
4. expo-notifications hoặc notifee hiện notification trên lockscreen với:
   - `AndroidImportance.MAX` + `bypassDnd: true`
   - `AndroidVisibility.PUBLIC` (hiện trên lockscreen)
   - `vibrationPattern: [0, 500, 200, 500, 200, 500, 200, 500]`
   - `fullScreenAction` để mở app khi tap

### Keep-Alive Strategy (Android OEM)

1. Foreground Service với persistent notification
2. `@felipe-software/react-native-notify-kit` plugin đăng ký service type `dataSync`
3. User phải: bỏ pin optimization, bật autostart (Xiaomi/Oppo), lock icon trong recent apps
4. `openBatterySettings()` mở system battery optimization dialog

---

## Expo SDK 54 Notes

- Dùng `expo-notifications` cho local notifications trong app
- `react-native-notify-kit` cho foreground service (background polling khi lockscreen)
- expo-router file-based routing với `(tabs)` convention cho tab group
- `expo-audio` cho background audio playback (keep audio session active)
- `expo-haptics` cho tactile feedback
