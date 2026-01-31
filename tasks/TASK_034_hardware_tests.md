# Task 034: Write Hardware Tests

## 📋 Task Information

| Field       | Value                        |
| ----------- | ---------------------------- |
| **Task ID** | T034                         |
| **Phase**   | Phase 3 - ESP32 Development  |
| **Priority**| Medium                       |
| **Estimate**| 4 hours                      |
| **Status**  | 🔲 Not Started               |

---

## 🎯 Objective

Create hardware test suite to verify all components work correctly before deployment.

---

## 📝 Requirements

### Test Categories

1. **WiFi Test** - Connection, signal strength
2. **Microphone Test** - Audio input, signal level
3. **Speaker Test** - Audio output, volume
4. **WebSocket Test** - Server connection
5. **Memory Test** - Free heap, PSRAM
6. **LED Test** - All patterns
7. **Button Test** - All buttons

### Test Modes

- **Quick Test** - Essential tests (~30 seconds)
- **Full Test** - All tests (~2 minutes)
- **Interactive Test** - Manual verification

---

## 📁 Files to Create

```
packages/esp32-firmware/
├── src/
│   └── test/
│       ├── hardware_test.h
│       └── hardware_test.cpp
└── test/
    └── test_main.cpp
```

---

## 🔧 Implementation Details

### hardware_test.h

```cpp
#ifndef HARDWARE_TEST_H
#define HARDWARE_TEST_H

#include <Arduino.h>
#include <functional>
#include <vector>

namespace UEBot {
namespace Test {

enum class TestResult {
    PENDING,
    RUNNING,
    PASSED,
    FAILED,
    SKIPPED
};

struct TestCase {
    String name;
    std::function<TestResult()> run;
    TestResult result = TestResult::PENDING;
    String message;
    uint32_t durationMs = 0;
};

using TestProgressCallback = std::function<void(const String& test, int current, int total)>;
using TestCompleteCallback = std::function<void(int passed, int failed, int skipped)>;

class HardwareTest {
public:
    static HardwareTest& getInstance();
    
    // Run tests
    void runAllTests();
    void runQuickTests();
    void runTest(const String& name);
    
    // Individual tests
    TestResult testWiFi();
    TestResult testMicrophone();
    TestResult testSpeaker();
    TestResult testWebSocket();
    TestResult testMemory();
    TestResult testLED();
    TestResult testButtons();
    TestResult testPSRAM();
    
    // Results
    std::vector<TestCase>& getResults() { return _tests; }
    void printResults();
    String getResultsJson();
    
    // Callbacks
    void onProgress(TestProgressCallback callback) { _progressCallback = callback; }
    void onComplete(TestCompleteCallback callback) { _completeCallback = callback; }

private:
    HardwareTest();
    ~HardwareTest() = default;
    
    void registerTests();
    void addTest(const String& name, std::function<TestResult()> test, bool quickTest = false);
    
    std::vector<TestCase> _tests;
    TestProgressCallback _progressCallback = nullptr;
    TestCompleteCallback _completeCallback = nullptr;
};

} // namespace Test
} // namespace UEBot

#endif // HARDWARE_TEST_H
```

### hardware_test.cpp

```cpp
#include "hardware_test.h"
#include "../wifi/wifi_manager.h"
#include "../audio/i2s_audio.h"
#include "../audio/audio_buffer.h"
#include "../network/websocket_client.h"
#include "../indicators/led_indicator.h"
#include "../input/button_handler.h"
#include <esp_heap_caps.h>
#include <ArduinoJson.h>

namespace UEBot {
namespace Test {

HardwareTest& HardwareTest::getInstance() {
    static HardwareTest instance;
    return instance;
}

HardwareTest::HardwareTest() {
    registerTests();
}

void HardwareTest::registerTests() {
    // Quick tests (essential)
    addTest("Memory", [this]() { return testMemory(); }, true);
    addTest("PSRAM", [this]() { return testPSRAM(); }, true);
    addTest("WiFi", [this]() { return testWiFi(); }, true);
    addTest("LED", [this]() { return testLED(); }, true);
    
    // Full tests
    addTest("Microphone", [this]() { return testMicrophone(); }, false);
    addTest("Speaker", [this]() { return testSpeaker(); }, false);
    addTest("WebSocket", [this]() { return testWebSocket(); }, false);
    addTest("Buttons", [this]() { return testButtons(); }, false);
}

void HardwareTest::addTest(const String& name, std::function<TestResult()> test, bool quickTest) {
    TestCase tc;
    tc.name = name;
    tc.run = test;
    tc.result = TestResult::PENDING;
    _tests.push_back(tc);
}

void HardwareTest::runAllTests() {
    int total = _tests.size();
    int current = 0;
    
    for (auto& test : _tests) {
        current++;
        
        if (_progressCallback) {
            _progressCallback(test.name, current, total);
        }
        
        Serial.printf("\n[TEST] Running: %s\n", test.name.c_str());
        
        uint32_t start = millis();
        test.result = test.run();
        test.durationMs = millis() - start;
        
        const char* resultStr = test.result == TestResult::PASSED ? "PASSED" : 
                                test.result == TestResult::FAILED ? "FAILED" : "SKIPPED";
        Serial.printf("[TEST] %s: %s (%d ms)\n", test.name.c_str(), resultStr, test.durationMs);
        
        if (!test.message.isEmpty()) {
            Serial.printf("       %s\n", test.message.c_str());
        }
    }
    
    // Count results
    int passed = 0, failed = 0, skipped = 0;
    for (const auto& test : _tests) {
        if (test.result == TestResult::PASSED) passed++;
        else if (test.result == TestResult::FAILED) failed++;
        else skipped++;
    }
    
    if (_completeCallback) {
        _completeCallback(passed, failed, skipped);
    }
    
    printResults();
}

void HardwareTest::runQuickTests() {
    // Run only tests marked as quick
    int total = 0;
    for (const auto& test : _tests) {
        if (test.name == "Memory" || test.name == "PSRAM" || 
            test.name == "WiFi" || test.name == "LED") {
            total++;
        }
    }
    
    int current = 0;
    for (auto& test : _tests) {
        if (test.name != "Memory" && test.name != "PSRAM" && 
            test.name != "WiFi" && test.name != "LED") {
            test.result = TestResult::SKIPPED;
            continue;
        }
        
        current++;
        
        if (_progressCallback) {
            _progressCallback(test.name, current, total);
        }
        
        uint32_t start = millis();
        test.result = test.run();
        test.durationMs = millis() - start;
    }
    
    printResults();
}

// === Individual Tests ===

TestResult HardwareTest::testMemory() {
    size_t freeHeap = ESP.getFreeHeap();
    size_t minFreeHeap = ESP.getMinFreeHeap();
    size_t totalHeap = ESP.getHeapSize();
    
    Serial.printf("  Free Heap: %d / %d bytes\n", freeHeap, totalHeap);
    Serial.printf("  Min Free Heap: %d bytes\n", minFreeHeap);
    
    // Require at least 50KB free
    if (freeHeap < 50000) {
        _tests.back().message = "Low memory: " + String(freeHeap) + " bytes";
        return TestResult::FAILED;
    }
    
    return TestResult::PASSED;
}

TestResult HardwareTest::testPSRAM() {
    if (!psramFound()) {
        _tests.back().message = "PSRAM not found";
        return TestResult::FAILED;
    }
    
    size_t psramSize = ESP.getPsramSize();
    size_t freePsram = ESP.getFreePsram();
    
    Serial.printf("  PSRAM Size: %d bytes\n", psramSize);
    Serial.printf("  Free PSRAM: %d bytes\n", freePsram);
    
    // Test allocation
    void* testPtr = heap_caps_malloc(1024 * 1024, MALLOC_CAP_SPIRAM);
    if (!testPtr) {
        _tests.back().message = "Failed to allocate 1MB from PSRAM";
        return TestResult::FAILED;
    }
    heap_caps_free(testPtr);
    
    return TestResult::PASSED;
}

TestResult HardwareTest::testWiFi() {
    if (WiFi.status() != WL_CONNECTED) {
        _tests.back().message = "WiFi not connected";
        return TestResult::FAILED;
    }
    
    String ssid = WiFi.SSID();
    int rssi = WiFi.RSSI();
    String ip = WiFi.localIP().toString();
    
    Serial.printf("  SSID: %s\n", ssid.c_str());
    Serial.printf("  IP: %s\n", ip.c_str());
    Serial.printf("  RSSI: %d dBm\n", rssi);
    
    if (rssi < -80) {
        _tests.back().message = "Weak signal: " + String(rssi) + " dBm";
        return TestResult::FAILED;
    }
    
    return TestResult::PASSED;
}

TestResult HardwareTest::testMicrophone() {
    using namespace UEBot::Audio;
    
    // Read some samples
    int16_t samples[512];
    size_t samplesRead = 0;
    
    // Assuming I2S is already initialized
    i2s_read(I2S_NUM_0, samples, sizeof(samples), &samplesRead, 1000 / portTICK_PERIOD_MS);
    
    if (samplesRead == 0) {
        _tests.back().message = "No audio data received";
        return TestResult::FAILED;
    }
    
    // Calculate signal level
    int64_t sum = 0;
    for (int i = 0; i < samplesRead / sizeof(int16_t); i++) {
        sum += abs(samples[i]);
    }
    int avgLevel = sum / (samplesRead / sizeof(int16_t));
    
    Serial.printf("  Samples read: %d\n", samplesRead);
    Serial.printf("  Average level: %d\n", avgLevel);
    
    // Check if there's any signal (noise floor should be > 0)
    if (avgLevel < 10) {
        _tests.back().message = "Microphone signal too low";
        return TestResult::FAILED;
    }
    
    return TestResult::PASSED;
}

TestResult HardwareTest::testSpeaker() {
    using namespace UEBot::Audio;
    
    // Generate test tone (1kHz)
    const int sampleRate = 16000;
    const int duration = 500;  // ms
    const int freq = 1000;     // Hz
    const int samples = sampleRate * duration / 1000;
    
    int16_t* tone = (int16_t*)malloc(samples * sizeof(int16_t));
    if (!tone) {
        _tests.back().message = "Failed to allocate tone buffer";
        return TestResult::FAILED;
    }
    
    // Generate sine wave
    for (int i = 0; i < samples; i++) {
        tone[i] = (int16_t)(sin(2 * PI * freq * i / sampleRate) * 16000);
    }
    
    // Play tone
    size_t bytesWritten = 0;
    i2s_write(I2S_NUM_1, tone, samples * sizeof(int16_t), &bytesWritten, 1000 / portTICK_PERIOD_MS);
    
    free(tone);
    
    Serial.printf("  Test tone: %d Hz, %d ms\n", freq, duration);
    Serial.printf("  Bytes written: %d\n", bytesWritten);
    
    if (bytesWritten == 0) {
        _tests.back().message = "Failed to play test tone";
        return TestResult::FAILED;
    }
    
    // Note: Can't automatically verify audio output, needs manual check
    _tests.back().message = "Verify audio manually";
    return TestResult::PASSED;
}

TestResult HardwareTest::testWebSocket() {
    using namespace UEBot::Network;
    
    WebSocketClient& ws = WebSocketClient::getInstance();
    
    if (!ws.isConnected()) {
        _tests.back().message = "WebSocket not connected";
        return TestResult::FAILED;
    }
    
    if (!ws.isRegistered()) {
        _tests.back().message = "Device not registered";
        return TestResult::FAILED;
    }
    
    Serial.printf("  Session ID: %s\n", ws.getSessionId().c_str());
    
    return TestResult::PASSED;
}

TestResult HardwareTest::testLED() {
    using namespace UEBot::Indicators;
    
    LEDIndicator& led = LEDIndicator::getInstance();
    
    // Test all states
    LEDState states[] = {
        LEDState::BOOT,
        LEDState::WIFI_CONNECTING,
        LEDState::WIFI_CONNECTED,
        LEDState::LISTENING,
        LEDState::RECORDING,
        LEDState::PROCESSING,
        LEDState::ERROR,
        LEDState::OFF
    };
    
    for (auto state : states) {
        led.setState(state);
        for (int i = 0; i < 20; i++) {  // Run animation for 200ms
            led.update();
            delay(10);
        }
    }
    
    led.setState(LEDState::OFF);
    
    _tests.back().message = "Verify LED patterns manually";
    return TestResult::PASSED;
}

TestResult HardwareTest::testButtons() {
    using namespace UEBot::Input;
    
    _tests.back().message = "Press main button within 5 seconds...";
    Serial.println("  Press main button within 5 seconds...");
    
    bool buttonPressed = false;
    uint32_t start = millis();
    
    ButtonHandler::getInstance().onMainButton([&buttonPressed](ButtonEvent event) {
        if (event == ButtonEvent::SHORT_PRESS) {
            buttonPressed = true;
        }
    });
    
    while (millis() - start < 5000 && !buttonPressed) {
        ButtonHandler::getInstance().update();
        delay(10);
    }
    
    if (!buttonPressed) {
        _tests.back().message = "Button press timeout";
        return TestResult::FAILED;
    }
    
    Serial.println("  Button press detected!");
    return TestResult::PASSED;
}

void HardwareTest::printResults() {
    Serial.println("\n========== TEST RESULTS ==========");
    
    int passed = 0, failed = 0, skipped = 0;
    
    for (const auto& test : _tests) {
        const char* status;
        switch (test.result) {
            case TestResult::PASSED: status = "✓ PASS"; passed++; break;
            case TestResult::FAILED: status = "✗ FAIL"; failed++; break;
            case TestResult::SKIPPED: status = "- SKIP"; skipped++; break;
            default: status = "? PEND"; break;
        }
        
        Serial.printf("  %s: %s\n", test.name.c_str(), status);
    }
    
    Serial.println("==================================");
    Serial.printf("  Passed: %d  Failed: %d  Skipped: %d\n", passed, failed, skipped);
    Serial.println("==================================\n");
}

String HardwareTest::getResultsJson() {
    DynamicJsonDocument doc(2048);
    
    JsonArray tests = doc.createNestedArray("tests");
    
    for (const auto& test : _tests) {
        JsonObject t = tests.createNestedObject();
        t["name"] = test.name;
        t["result"] = test.result == TestResult::PASSED ? "passed" :
                      test.result == TestResult::FAILED ? "failed" : "skipped";
        t["duration"] = test.durationMs;
        if (!test.message.isEmpty()) {
            t["message"] = test.message;
        }
    }
    
    String output;
    serializeJson(doc, output);
    return output;
}

} // namespace Test
}
```

---

## ✅ Acceptance Criteria

- [ ] All tests execute correctly
- [ ] Memory test passes with > 50KB free
- [ ] PSRAM is detected and usable
- [ ] WiFi test shows connection info
- [ ] Microphone test detects signal
- [ ] Speaker plays test tone
- [ ] LED test cycles through patterns
- [ ] Test results exported as JSON
- [ ] Tests integrate into firmware

---

## 🧪 Running Tests

```cpp
void setup() {
    Serial.begin(115200);
    
    // Initialize components
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) delay(100);
    
    I2SAudio::getInstance().begin();
    LEDIndicator::getInstance().begin();
    ButtonHandler::getInstance().begin();
    
    // Run tests
    HardwareTest::getInstance().onProgress([](const String& name, int cur, int total) {
        Serial.printf("Test %d/%d: %s\n", cur, total, name.c_str());
    });
    
    HardwareTest::getInstance().onComplete([](int passed, int failed, int skipped) {
        if (failed == 0) {
            Serial.println("All tests passed!");
            LEDIndicator::getInstance().setState(LEDState::SUCCESS);
        } else {
            Serial.println("Some tests failed!");
            LEDIndicator::getInstance().setState(LEDState::ERROR);
        }
    });
    
    // Run quick tests
    HardwareTest::getInstance().runQuickTests();
    
    // Or run all tests
    // HardwareTest::getInstance().runAllTests();
}
```

---

## 📚 References

- [ESP32 Memory](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/heap_debug.html)
- [Unity Test Framework](https://github.com/ThrowTheSwitch/Unity)
