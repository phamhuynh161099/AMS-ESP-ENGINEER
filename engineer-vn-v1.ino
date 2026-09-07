
// =========== ENGINEER ESP ============

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <SSD1306Wire.h>

// --- OTA ---
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#define ELEGANTOTA_USE_ASYNC_WEBSERVER 1
#include <ElegantOTA.h>

// --- Cấu hình Pin ---
#define BUZZER_PIN 14  // Mr.Cuong ESP
#define BUTTON_PIN 13
#define LED_PIN 12
#define MOTOR_PIN 16


int analogInPin  = A0;
int sensorValue;
float calibration = 0.36;
int bat_percentage;
const char* ssid = "HSVINA";
const char* password = "HSVINA@kor";
const String SERVER_BASE_URL = "http://10.101.1.193:8080/espRecieve";  // HTTPS

SSD1306Wire display(0x3c, 4, 5);

#define flipDisplay true
#define LABEL_X 0
#define VALUE_X 5
#define LINE_1_Y 22
#define LINE_2_Y 36
#define LINE_3_Y 50
const int MAX_WIDTH_ALLOW = 128 - VALUE_X;
const int SCROLL_SPEED = 50;

struct EngineerInfo {
  String id = "";
  String espId = "";
  String espMac = "";
  String name = "";
};

struct TicketInfo {
  String id = "";
  String machineCode = "";
  String machineName = "";
  String location = "";
  String description = "";
  String status = "";
};

// --- Global Variables ---
AsyncWebServer server(80);
WiFiClient wifiClient;
EngineerInfo currentEng;
TicketInfo currentTicket;
String macAddress = "";

// --- Config Button Type ---
unsigned long buttonPressStartTime = 0;      // Lưu thời điểm bắt đầu nhấn
bool isButtonHolding = false;                // Cờ xác nhận đang giữ nút
bool isLongPressHandled = false;             // Cờ xác nhận đã xử lý nhấn lâu chưa
const unsigned long LONG_PRESS_TIME = 5000;  // 5000ms = 5 giây

enum DeviceState {
  STATE_IDLE,
  STATE_REQUEST_RECEIVED,
  STATE_ACKNOWLEDGED
};
DeviceState currentState = STATE_IDLE;

// Timer
unsigned long lastCheckTime = 0;
const unsigned long CHECK_INTERVAL = 3000;
unsigned long displayRestoreTime = 0;

unsigned long lastFetchTimeInfo = 0;
const unsigned long FETCH_INTERVAL_INFO = 30 * 1000;  // 30s

unsigned long lastWiFiCheckTime = 0;
const unsigned long WIFI_CHECK_INTERVAL = 10 * 1000;  // Kiểm tra mỗi 10 giây nếu mất mạng

// --- Chuong bao lien tuc (khong chan vong lap) ---
bool isAlarmActive = false;
bool isAlarmToneOn = false;
unsigned long lastAlarmToggle = 0;
const unsigned long ALARM_BEEP_ON = 200;   // Thoi gian keu
const unsigned long ALARM_BEEP_OFF = 300;  // Thoi gian nghi

// OLED Scroll
String oledTitle, oledLine1, oledLine2, oledLine3;
int scrollX = 0;
unsigned long lastScrollTime = 0;
int waitTimer = 500;
char spaces[32];

// Buzzer non-blocking (3 beep ngan)
unsigned long buzzerNextToneTime = 0;
int buzzerCount = 0;

// Debounce nut bam
unsigned long buttonDebounceTime = 0;

// ==========================================
// HÀM HIỂN THỊ OLED
// ==========================================
void renderDisplay() {
  display.clear();

  display.setFont(ArialMT_Plain_16);
  display.setTextAlignment(TEXT_ALIGN_CENTER);
  display.drawString(64, 0, oledTitle);
  display.drawLine(0, 18, 127, 18);
  
  display.fillRect(16, 3, 3, 6);  // Đầu cực pin
  display.drawRect(0, 0, 17, 12); // viền cục pin


  int dungLuongHienTai = map(bat_percentage, 0, 100, 0, 17);
  display.fillRect(0, 0, dungLuongHienTai, 12);

  display.setFont(ArialMT_Plain_10);
  display.setTextAlignment(TEXT_ALIGN_LEFT);

  int w1 = display.getStringWidth(oledLine1);
  int w2 = display.getStringWidth(oledLine2);
  int w3 = display.getStringWidth(oledLine3);

  display.drawString(VALUE_X - (w1 > MAX_WIDTH_ALLOW ? scrollX : 0), LINE_1_Y, oledLine1);
  display.drawString(VALUE_X - (w2 > MAX_WIDTH_ALLOW ? scrollX : 0), LINE_2_Y, oledLine2);
  display.drawString(VALUE_X - (w3 > MAX_WIDTH_ALLOW ? scrollX : 0), LINE_3_Y, oledLine3);

  display.setColor(BLACK);
  display.fillRect(0, 19, VALUE_X - 1, 45);
  display.setColor(WHITE);

  display.drawString(LABEL_X, LINE_1_Y, "|");
  display.drawString(LABEL_X, LINE_2_Y, "|");
  display.drawString(LABEL_X, LINE_3_Y, "|");

  display.display();
}

void updateOLED(String title, String line1, String line2, String line3) {
  oledTitle = title;
  oledLine1 = line1;
  oledLine2 = line2;
  oledLine3 = line3;
  scrollX = 0;
  waitTimer = 1500;
  renderDisplay();
}

void handleScrolling() {
  if (displayRestoreTime > 0 && millis() > displayRestoreTime) {
    displayRestoreTime = 0;
    updateOLED("KI SU", "MAC - IP:" + macAddress + " - " + WiFi.localIP().toString() + spaces, "Ky su: " + currentEng.name + spaces, "");
  }

  display.setFont(ArialMT_Plain_10);
  int maxW = max({ display.getStringWidth(oledLine1), display.getStringWidth(oledLine2), display.getStringWidth(oledLine3) });

  if (maxW > MAX_WIDTH_ALLOW && millis() - lastScrollTime >= SCROLL_SPEED) {
    lastScrollTime = millis();
    if (waitTimer > 0) {
      waitTimer -= SCROLL_SPEED;
    } else {
      scrollX++;
      if (scrollX > maxW - MAX_WIDTH_ALLOW + 30) {
        scrollX = 0;
        waitTimer = 1500;
      }
      renderDisplay();
    }
  }
}

void ringBuzzer() {
  buzzerCount = 3;
  buzzerNextToneTime = millis();
}

void handleBuzzer() {
  if (buzzerCount > 0 && millis() >= buzzerNextToneTime) {
    tone(BUZZER_PIN, 3136, 200);
    buzzerNextToneTime = millis() + 500;
    buzzerCount--;
  }
}

void startAlarm() {
  isAlarmActive = true;
  isAlarmToneOn = false;
  lastAlarmToggle = 0;  // De handleAlarm() keu ngay lap tuc
}

void stopAlarm() {
  isAlarmActive = false;
  isAlarmToneOn = false;
  noTone(BUZZER_PIN);
}

void handleAlarm() {
  if (!isAlarmActive) return;

  unsigned long interval = isAlarmToneOn ? ALARM_BEEP_ON : ALARM_BEEP_OFF;
  if (millis() - lastAlarmToggle >= interval) {
    lastAlarmToggle = millis();
    isAlarmToneOn = !isAlarmToneOn;
    if (isAlarmToneOn) {
      tone(BUZZER_PIN, 3136);
    } else {
      noTone(BUZZER_PIN);
    }
  }
}
void updateLED() {
  switch (currentState) {
    case STATE_IDLE:
      digitalWrite(LED_PIN, HIGH);
      break;
    case STATE_REQUEST_RECEIVED:
      digitalWrite(LED_PIN, (millis() / 200) % 2 == 0 ? LOW : HIGH);
      break;
    case STATE_ACKNOWLEDGED:
      digitalWrite(LED_PIN, (millis() / 500) % 2 == 0 ? LOW : HIGH);
      break;
  }
}
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);

  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
  } else {
    updateOLED("ERROR", "Loi ket noi WiFi", "Kiem tra Router", "");
  }
}

void addSpaces(char* buffer, int n) {
  for (int i = 0; i < n && i < 255; i++) {
    buffer[i] = ' ';
  }
  buffer[n] = '\0';
}
String sendHttpRequest(String url, String method, String payload, int& httpCode) {
  HTTPClient http;
  http.begin(wifiClient, url);

  // GET la polling 3s/lan, hong thi vong sau tu thu lai -> timeout ngan.
  // POST do nguoi dung bam nut, khong co retry -> cho rong hon.
  http.setTimeout(method == "POST" ? 15000 : 5000);

  // 2. Gắn header và gọi API
  if (method == "POST") {
    http.addHeader("Content-Type", "application/json");
    httpCode = http.POST(payload);
  } else {
    httpCode = http.GET();
  }

  // 3. Đọc dữ liệu trả về
  String response = "";
  if (httpCode > 0) {
    response = http.getString();
  } else {
    Serial.println("HTTP Helper Error Code: " + String(httpCode) + " - URL: " + url);
  }

  http.end();
  return response;
}
void fetchEngineerInfo(bool isBackground = false) {
  if (WiFi.status() != WL_CONNECTED) return;

  macAddress = WiFi.macAddress();
  if (!isBackground) {
    updateOLED("LOADING...", "MAC: " + macAddress, "Dang tai du lieu", "Vui long cho...");
  }

  int httpCode;
  String url = SERVER_BASE_URL + "/get-engineer-info-by?mac=" + macAddress;
  String response = sendHttpRequest(url, "GET", "", httpCode);

  if (httpCode == 200) {
    StaticJsonDocument<1024> doc;
    if (!deserializeJson(doc, response) && doc["etc"].containsKey("lineInfo") && !doc["etc"]["lineInfo"].isNull()) {
      JsonObject info = doc["etc"]["lineInfo"];

      currentEng.id = info["eng_id"].as<String>();
      currentEng.espId = info["engineer_esp_id"].as<String>();
      currentEng.espMac = info["engineer_esp_mac"].as<String>();
      currentEng.name = info["eng_name"].as<String>();


      // Chỉ cập nhật OLED nếu mạch đang rảnh rỗi
      if (currentState == STATE_IDLE) {
        String infoId = info["id"].as<String>();

        String line1 = "MAC - IP:" + macAddress + " - " + WiFi.localIP().toString() + spaces;
        String line2 = "Ky su: " + currentEng.name + spaces;

        String line3 = "";
        if (info["id"].isNull() || infoId == "null" || infoId == "") {
          line3 = "Ky su nay chua phu trach chuyen nao." + String(spaces);
        }
        updateOLED("KI SU", line1, line2, line3);
      }
    } else {
      if (currentState == STATE_IDLE) {
        updateOLED("UNREGISTERED", "Khong tim thay MAC!", "MAC - IP:" + macAddress + " - " + WiFi.localIP().toString() + spaces, "Lien he Admin");
      }
    }
  } else {
    if (currentState == STATE_IDLE) {
      updateOLED("SERVER ERR", "Ma loi HTTP: " + String(httpCode), "Kiem tra Server API", "");
    }
  }
}

void checkPendingRequests() {
  if (WiFi.status() != WL_CONNECTED || currentEng.id == "") return;

  int httpCode;
  String url = SERVER_BASE_URL + "/checkPendingRequest/" + currentEng.id;
  String response = sendHttpRequest(url, "GET", "", httpCode);

  if (httpCode == 200) {
    StaticJsonDocument<1024> doc;
    if (!deserializeJson(doc, response) && doc.containsKey("etc") && !doc["etc"].isNull()) {
      JsonObject etc = doc["etc"];

      boolean flagF5 = false;
      if (currentTicket.id != data["id"].as<String>() || currentTicket.status != data["status"].as<String>()) {
        flagF5 = true;
      }


      if (etc["hasRequest"].as<bool>() == true && etc.containsKey("data") && !etc["data"].isNull()) {
        JsonObject data = etc["data"];
        currentTicket.id = data["id"].as<String>();
        currentTicket.machineCode = data["line_id"].as<String>();
        currentTicket.machineName = data["line_esp_name"].as<String>();
        currentTicket.location = data["location"].as<String>();
        currentTicket.description = data["issueDescription"].as<String>();
        currentTicket.status = data["status"].as<String>();
        if (currentTicket.status == "NONE" && flagF5) {
          currentState = STATE_REQUEST_RECEIVED;
          updateOLED("E.NEW TASK", currentTicket.machineName, currentTicket.location, "Nhan nut de bat dau sua!");
          startAlarm();
        } else if (currentTicket.status == "ACKNOWLEDGED" && flagF5) {
          currentState = STATE_ACKNOWLEDGED;
          stopAlarm();
          updateOLED("E.ON THE WAY", "Den: " + currentTicket.location, "Dang sua: " + currentTicket.machineName, "Nho nguoi dung xac nhan khi xong");
        }
      } else {
        if (currentState == STATE_ACKNOWLEDGED) {
          currentState = STATE_IDLE;
          stopAlarm();
          currentTicket = TicketInfo();  // Xóa trắng dữ liệu ticket
          updateOLED("E.SUCCESS", "Nguoi dung da xac nhan", "Sau 4s se hien thong tin", "");
          displayRestoreTime = millis() + 4000;
        }

        if (etc["hasRequest"].as<bool>() == false && currentState != STATE_IDLE) {
          currentState = STATE_IDLE;
          stopAlarm();
          currentTicket = TicketInfo();  // Xóa trắng dữ liệu ticket
          updateOLED("----", "Reset", "Sau 4s se hien thong tin", "");
          displayRestoreTime = millis() + 4000;
        }

      }
    }
  }
}

bool sendPostRequest(String endpoint, DeviceState nextState) {
  if (WiFi.status() != WL_CONNECTED) return false;

  StaticJsonDocument<256> reqDoc;
  reqDoc["currentRequestId"] = currentTicket.id;
  reqDoc["macAddress"] = WiFi.macAddress();
  String payload;
  serializeJson(reqDoc, payload);

  int httpCode;
  String response = sendHttpRequest(SERVER_BASE_URL + endpoint, "POST", payload, httpCode);
  bool isSuccess = false;
  if (httpCode == 200) {
    StaticJsonDocument<512> resDoc;
    if (!deserializeJson(resDoc, response) && resDoc.containsKey("etc") && !resDoc["etc"].isNull()) {
      if (resDoc["etc"].containsKey("isSuccess")) {
        isSuccess = resDoc["etc"]["isSuccess"].as<bool>();
      }
    }
  }
  if (isSuccess) {
    currentState = nextState;
    updateOLED("E.ON THE WAY", "Den: " + currentTicket.location, "Dang sua: " + currentTicket.machineCode, "Nho nguoi dung xac nhan khi xong");
    ringBuzzer();
  } else {
    updateOLED("ERR: " + String(httpCode), "Thao tac that bai", "Vui long thu lai", "");
  }

  return isSuccess;
}

void handleButtonPress() {
  switch (currentState) {
    case STATE_IDLE:
      updateOLED("KI SU", "MAC - IP:" + macAddress + " - " + WiFi.localIP().toString() + spaces, "Ky su: " + currentEng.name + spaces, "");
      break;
    case STATE_REQUEST_RECEIVED:
      stopAlarm();
      if (!sendPostRequest("/acknowledge", STATE_ACKNOWLEDGED)) {
        startAlarm();
      }
      break;

    case STATE_ACKNOWLEDGED:
      break;
  }
}
void setup() {
  Serial.begin(115200);
  display.init();
  addSpaces(spaces, 10);
  if (flipDisplay) display.flipScreenVertically();
  display.clear();
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  updateOLED("SYSTEM", "Dang khoi dong...", "Dang thiet lap thiet bi...", "");
  connectWiFi();
  Serial.println(WiFi.macAddress());
  if (WiFi.status() == WL_CONNECTED) {
    tone(BUZZER_PIN, 3322, 500);
    fetchEngineerInfo();
  }
  server.on("/", HTTP_GET, [](AsyncWebServerRequest* request) {
    request->send(200, "text/plain", "Hi! I am Receiver ESP8266.");
  });

  server.on("/reset", HTTP_GET, [](AsyncWebServerRequest* request) {
    request->send(200, "text/html", "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Resetting...</title><meta http-equiv='refresh' content='3; url=/'></head><body><h1>🔄 Đang reset thiết bị...</h1><p>ESP8266 sẽ khởi động lại sau 2 giây.</p></body></html>");
    delay(2000);
    ESP.restart();
  });

  ElegantOTA.begin(&server);
  server.begin();
}

void loop() {
  ElegantOTA.loop();
  handleAlarm();

  // --- KIỂM TRA WIFI VÀO ĐÂY ---
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWiFiCheckTime >= WIFI_CHECK_INTERVAL) {
      lastWiFiCheckTime = millis();
      Serial.println("WiFi dropped. Reconnecting...");
      updateOLED("WIFI LOST", "Mat ket noi", "Dang ket noi lai...", "");
      WiFi.reconnect();
    }
    yield();
    return;
  }
  // --------------------------------------------

  sensorValue = analogRead(analogInPin);
  float voltage = (((sensorValue * 3.3) / 1024) * 2 + calibration);
 
  bat_percentage = mapfloat(voltage, 2.8, 4.2, 0, 100);
 
  if (bat_percentage >= 100)
  {
    bat_percentage = 100;
  }
  if (bat_percentage <= 0)
  {
    bat_percentage = 1;
  }
  // --------------------------------------------
  handleScrolling();
  handleBuzzer();
  updateLED();
  if (currentState == STATE_IDLE && (millis() - lastFetchTimeInfo >= FETCH_INTERVAL_INFO)) {
    lastFetchTimeInfo = millis();
    if (displayRestoreTime == 0) {
      fetchEngineerInfo(true);
    }
  }

  if (millis() - lastCheckTime >= CHECK_INTERVAL) {
    lastCheckTime = millis();
    checkPendingRequests();
  }

  int currentButtonState = digitalRead(BUTTON_PIN);
  if (currentButtonState == LOW && !isButtonHolding && buttonDebounceTime == 0) {
    buttonDebounceTime = millis();
  }
  if (buttonDebounceTime > 0 && millis() - buttonDebounceTime >= 50) {
    if (digitalRead(BUTTON_PIN) == LOW && !isButtonHolding) {
      isButtonHolding = true;
      isLongPressHandled = false;
      buttonPressStartTime = millis();
    }
    buttonDebounceTime = 0;
  }
  if (isButtonHolding && currentButtonState == LOW) {
    if (!isLongPressHandled && (millis() - buttonPressStartTime >= LONG_PRESS_TIME)) {
      isLongPressHandled = true;

      Serial.println("Long press detected! Resetting ESP...");
      updateOLED("SYSTEM", "Dang khoi dong lai...", "Vui long cho", "");
      tone(BUZZER_PIN, 3520, 500);
      delay(1000);
      ESP.restart();
    }
  }
  if (isButtonHolding && currentButtonState == HIGH) {
    isButtonHolding = false;
    if (!isLongPressHandled) {
      if (millis() - buttonPressStartTime > 50) {
        handleButtonPress();
      }
    }
  }
  yield();
}

float mapfloat(float x, float in_min, float in_max, float out_min, float out_max)
{
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
