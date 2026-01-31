# Task 035: Document Hardware Setup

## 📋 Task Information

| Field       | Value                        |
| ----------- | ---------------------------- |
| **Task ID** | T035                         |
| **Phase**   | Phase 3 - ESP32 Development  |
| **Priority**| Medium                       |
| **Estimate**| 4 hours                      |
| **Status**  | 🔲 Not Started               |

---

## 🎯 Objective

Create comprehensive documentation for hardware assembly, wiring diagrams, and setup instructions.

---

## 📝 Requirements

### Documentation Contents

1. **Bill of Materials (BOM)**
2. **Wiring Diagrams**
3. **Assembly Instructions**
4. **Pin Configuration Table**
5. **Troubleshooting Guide**
6. **3D Printed Case Files** (optional)

---

## 📁 Files to Create

```
packages/esp32-firmware/
├── docs/
│   ├── HARDWARE_SETUP.md
│   ├── WIRING_DIAGRAM.md
│   ├── TROUBLESHOOTING.md
│   └── images/
│       ├── wiring_diagram.png
│       ├── assembly_1.png
│       └── assembly_2.png
└── hardware/
    └── case/
        ├── case_top.stl
        └── case_bottom.stl
```

---

## 📖 Hardware Setup Documentation

### Bill of Materials (BOM)

| Component | Model | Quantity | Approximate Price | Notes |
|-----------|-------|----------|-------------------|-------|
| Microcontroller | ESP32-S3 DevKitC-1 | 1 | $10-15 | N16R8 variant preferred (16MB Flash, 8MB PSRAM) |
| Microphone | INMP441 I2S MEMS | 1 | $3-5 | Digital output, better than analog |
| DAC/Amplifier | MAX98357A | 1 | $3-5 | I2S input, 3W output |
| Speaker | 3W 4Ω or 8Ω | 1 | $2-5 | Match with MAX98357A |
| LED | WS2812B NeoPixel | 1 | $1 | Optional, for status indication |
| Push Button | Tactile 6x6mm | 1-3 | $0.10 | Optional, can use onboard BOOT button |
| Resistor | 10kΩ | 1-3 | $0.01 | For button pull-ups if needed |
| Capacitor | 100µF | 1 | $0.10 | Power filtering |
| Capacitor | 0.1µF | 2 | $0.05 | Decoupling |
| Breadboard | Full-size | 1 | $5 | For prototyping |
| Jumper Wires | Male-Male, Male-Female | 20+ | $3 | Various lengths |
| USB Cable | USB-C | 1 | $3 | For programming and power |

**Total Estimated Cost: $30-50**

---

### Pin Configuration

#### ESP32-S3 DevKitC-1 Pinout

```
                    ┌─────────────────┐
                    │   ESP32-S3      │
                    │   DevKitC-1     │
           3V3  ────┤ 3V3         5V  ├──── 5V (USB)
           GND  ────┤ GND        GND  ├──── GND
                    │                  │
    INMP441 SD  ────┤ GPIO15    GPIO48├──── WS2812 DATA
    INMP441 WS  ────┤ GPIO16    GPIO47├──── (Reserved)
    INMP441 SCK ────┤ GPIO17    GPIO21├──── (Reserved)
                    │                  │
    MAX98357 DIN ───┤ GPIO18    GPIO20├──── (I2C SDA)
    MAX98357 BCLK ──┤ GPIO19    GPIO19├──── (I2C SCL)
    MAX98357 LRC ───┤ GPIO20    GPIO18├──── (Reserved)
                    │                  │
    Button 1 ───────┤ GPIO0     GPIO17├──── (Reserved)
    (BOOT button)   │                  │
                    │                  │
                    └─────────────────┘
```

#### INMP441 Microphone Wiring

| INMP441 Pin | ESP32-S3 Pin | Description |
|-------------|--------------|-------------|
| VDD | 3V3 | Power (3.3V) |
| GND | GND | Ground |
| SD | GPIO15 | Serial Data (Audio out) |
| WS | GPIO16 | Word Select (L/R Clock) |
| SCK | GPIO17 | Serial Clock (Bit Clock) |
| L/R | GND | Left channel (GND) or Right (3V3) |

#### MAX98357A Amplifier Wiring

| MAX98357A Pin | ESP32-S3 Pin | Description |
|---------------|--------------|-------------|
| VIN | 5V | Power (5V from USB) |
| GND | GND | Ground |
| DIN | GPIO18 | Data Input |
| BCLK | GPIO19 | Bit Clock |
| LRC | GPIO20 | Left/Right Clock |
| GAIN | - | Leave floating for 9dB |
| SD | - | Leave floating (enabled) |

#### WS2812 LED Wiring

| WS2812 Pin | ESP32-S3 Pin | Description |
|------------|--------------|-------------|
| VCC | 5V | Power |
| GND | GND | Ground |
| DIN | GPIO48 | Data Input |

---

### Wiring Diagram

```
                                    ┌──────────────────────────────────────┐
                                    │            ESP32-S3                  │
    ┌─────────────┐                 │                                      │
    │  INMP441    │                 │                                      │
    │             │                 │                                      │
    │ VDD ────────┼─────────────────┤ 3V3                                  │
    │ GND ────────┼─────────────────┤ GND                                  │
    │ SD  ────────┼─────────────────┤ GPIO15                               │
    │ WS  ────────┼─────────────────┤ GPIO16                               │
    │ SCK ────────┼─────────────────┤ GPIO17                               │
    │ L/R ────────┼──┬──────────────┤ GND (Left Channel)                   │
    └─────────────┘  │              │                                      │
                     │              │                                      │
    ┌─────────────┐  │              │                                      │
    │ MAX98357A   │  │              │                                      │
    │             │  │              │                                      │
    │ VIN ────────┼──┼──────────────┤ 5V (USB)                             │
    │ GND ────────┼──┴──────────────┤ GND                                  │
    │ DIN ────────┼─────────────────┤ GPIO18                               │
    │ BCLK ───────┼─────────────────┤ GPIO19                               │
    │ LRC ────────┼─────────────────┤ GPIO20                               │
    │             │                 │                                      │
    │ Speaker+ ───┼───┐             │                                      │
    │ Speaker- ───┼─┐ │             │                                      │
    └─────────────┘ │ │             │                                      │
                    │ │             │                                      │
    ┌───────────┐   │ │             │                                      │
    │  Speaker  │   │ │             │                                      │
    │    (+)────┼───┘ │             │                                      │
    │    (-)────┼─────┘             │                                      │
    └───────────┘                   │                                      │
                                    │                                      │
    ┌─────────────┐                 │                                      │
    │  WS2812B    │                 │                                      │
    │             │                 │                                      │
    │ VCC ────────┼─────────────────┤ 5V                                   │
    │ GND ────────┼─────────────────┤ GND                                  │
    │ DIN ────────┼─────────────────┤ GPIO48                               │
    └─────────────┘                 │                                      │
                                    │                                      │
    ┌─────────────┐                 │                                      │
    │  Button     │                 │                                      │
    │             │                 │                                      │
    │ Pin1 ───────┼─────────────────┤ GPIO0 (BOOT)                         │
    │ Pin2 ───────┼─────────────────┤ GND                                  │
    └─────────────┘                 │                                      │
                                    └──────────────────────────────────────┘
```

---

### Assembly Instructions

#### Step 1: Prepare Components

1. Gather all components from the BOM
2. Inspect for any visible damage
3. Test ESP32-S3 by connecting to USB and checking serial output

#### Step 2: Breadboard Setup

1. Place ESP32-S3 on breadboard (straddle the center gap)
2. Connect power rails: 3V3 to + rail, GND to - rail
3. Also connect 5V USB power to second power rail

#### Step 3: Connect INMP441 Microphone

1. Place INMP441 on breadboard
2. Connect VDD to 3V3 rail
3. Connect GND to GND rail
4. Connect SD to GPIO15
5. Connect WS to GPIO16
6. Connect SCK to GPIO17
7. Connect L/R to GND (for left channel)

**Important:** Keep wires short and away from power lines to reduce noise.

#### Step 4: Connect MAX98357A and Speaker

1. Place MAX98357A on breadboard
2. Connect VIN to 5V rail
3. Connect GND to GND rail
4. Connect DIN to GPIO18
5. Connect BCLK to GPIO19
6. Connect LRC to GPIO20
7. Connect speaker wires to Speaker+ and Speaker- terminals

**Important:** Don't connect speaker backwards - it won't damage but may reduce quality.

#### Step 5: Connect WS2812 LED (Optional)

1. Connect VCC to 5V
2. Connect GND to GND
3. Connect DIN to GPIO48
4. Add 100µF capacitor between 5V and GND near LED

#### Step 6: Test Setup

1. Upload test firmware
2. Run hardware tests
3. Verify:
   - Microphone captures audio
   - Speaker plays test tone
   - LED shows patterns
   - Button triggers recording

---

### Troubleshooting

#### No Audio from Microphone

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| No signal at all | Wrong pins | Check SD/WS/SCK wiring |
| Very low signal | L/R not connected | Connect L/R to GND or 3V3 |
| Noisy signal | Long wires | Shorten wires, add shielding |
| Distorted audio | Clock mismatch | Verify I2S settings |

#### No Audio from Speaker

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| No sound | SD pin pulled low | Leave SD floating |
| Very quiet | GAIN setting | Connect GAIN to VIN for 15dB |
| Crackling | Power issue | Add capacitors, use good 5V |
| Wrong audio | Sample rate mismatch | Check I2S output settings |

#### ESP32-S3 Issues

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| Won't flash | Wrong mode | Hold BOOT, press RESET |
| No serial | USB mode wrong | Set USB CDC mode in config |
| Low memory | PSRAM not enabled | Enable PSRAM in menuconfig |
| Crashes | Power brownout | Use good USB cable/power |

#### WiFi Issues

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| Won't connect | Wrong credentials | Double-check SSID/password |
| Weak signal | Antenna | Don't cover antenna area |
| Disconnects | Power saving | Disable WiFi sleep |

---

### Power Consumption

| Component | Active | Idle |
|-----------|--------|------|
| ESP32-S3 | 240mA | 10mA |
| INMP441 | 1.4mA | 1.4mA |
| MAX98357A | 2.4mA | 0.1mA |
| WS2812B | 60mA (white) | 1mA |
| **Total** | ~304mA | ~13mA |

**Recommended Power Supply:** 5V @ 1A minimum

---

## ✅ Acceptance Criteria

- [ ] BOM is complete and accurate
- [ ] Pin configuration table is correct
- [ ] Wiring diagram is clear
- [ ] Assembly instructions are step-by-step
- [ ] Troubleshooting covers common issues
- [ ] Documentation tested by someone unfamiliar with project

---

## 📚 References

- [ESP32-S3 DevKitC-1 Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/hw-reference/esp32s3/user-guide-devkitc-1.html)
- [INMP441 Datasheet](https://invensense.tdk.com/products/digital/inmp441/)
- [MAX98357A Datasheet](https://www.analog.com/en/products/max98357a.html)
- [WS2812B Datasheet](https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf)

---

## 📝 Notes

- Consider creating a PCB for permanent installation
- 3D printed case design can be added later
- Document any hardware revisions
