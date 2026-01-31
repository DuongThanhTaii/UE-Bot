# 📋 UE-Bot Project Plan

## Project Information

- **Project Name**: UE-Bot (Universal ESP32 Bot)
- **Repository**: https://github.com/DuongThanhTaii/UE-Bot
- **Start Date**: January 29, 2026
- **Target Completion**: April 30, 2026 (~14 weeks)

---

## 🎯 Project Goals

### Primary Goals

1. ✅ Clone Moltbot và giữ nguyên toàn bộ tính năng
2. ✅ Xây dựng custom web dashboard (Direct Groq API)
3. 🔲 Tích hợp ESP32 voice control
4. 🔲 Deploy production-ready system

### Success Metrics

- [x] Moltbot Gateway chạy ổn định (Bypassed - dùng Direct Groq)
- [x] WebChat hoạt động qua custom website
- [ ] ESP32 có thể gửi voice commands
- [ ] Latency voice command < 3 giây
- [ ] System uptime > 99%

---

## 📅 Timeline Overview

```
Phase 1: Foundation          │██████████│ Week 1-2   ✅ COMPLETED
Phase 2: Core Integration    │██████████│ Week 3-4   ✅ COMPLETED (Direct Groq)
Phase 3: ESP32 Development   │███████████████│ Week 5-7   🔄 IN PROGRESS
Phase 4: Bridge Service      │██████████│ Week 8-9   (Mar 19 - Apr 1)
Phase 5: Custom Skills       │██████████│ Week 10-11 (Apr 2 - Apr 15)
Phase 6: Testing & Polish    │█████│ Week 12    (Apr 16 - Apr 22)
Phase 7: Deployment          │██████████│ Week 13-14 (Apr 23 - Apr 30)
```

---

## 📦 PHASE 1: FOUNDATION (Week 1-2) ✅ COMPLETED

### Objectives

- Setup project structure
- Initialize all packages
- Configure development environment
- Document architecture

### Tasks

| ID   | Task                       | Priority | Est. Hours | Status |
| ---- | -------------------------- | -------- | ---------- | ------ |
| T001 | Create project structure   | High     | 2h         | ✅     |
| T002 | Setup pnpm workspace       | High     | 1h         | ✅     |
| T003 | Configure TypeScript       | High     | 2h         | ✅     |
| T004 | Setup ESLint + Prettier    | Medium   | 1h         | ✅     |
| T005 | Create shared package      | High     | 3h         | ✅     |
| T006 | Initialize webapp package  | High     | 4h         | ✅     |
| T007 | Initialize bridge-service  | High     | 3h         | ✅     |
| T008 | Initialize ESP32 firmware  | High     | 2h         | ✅     |
| T009 | Setup Docker configs       | Medium   | 2h         | ✅     |
| T010 | Create CI/CD workflows     | Medium   | 3h         | ✅     |
| T011 | Write architecture docs    | High     | 4h         | ✅     |
| T012 | Clone Moltbot as submodule | High     | 1h         | ✅     |

### Deliverables

- [x] Working monorepo structure
- [x] All packages initialized
- [x] Development environment ready
- [x] Architecture documentation complete

---

## 📦 PHASE 2: CORE INTEGRATION (Week 3-4) ✅ COMPLETED

### Objectives

- ~~Integrate Moltbot Gateway~~ → Direct Groq API (Bypass OpenClaw)
- Setup basic WebChat
- Configure channels

### Notes

> **Decision**: Bypassed OpenClaw/Moltbot Gateway do context overflow issues với Groq free tier.
> Thay vào đó sử dụng Direct Groq API cho cả Telegram Bot và Webapp.

### Tasks

| ID   | Task                                 | Priority | Est. Hours | Status         |
| ---- | ------------------------------------ | -------- | ---------- | -------------- |
| T013 | Configure Moltbot Gateway            | High     | 4h         | ⏸️ Bypassed    |
| T014 | Setup WebChat channel                | High     | 3h         | ⏸️ Bypassed    |
| T015 | Create Gateway wrapper service       | High     | 6h         | ✅             |
| T016 | Implement health checks              | Medium   | 2h         | ✅             |
| T017 | Setup Telegram channel (Direct Groq) | Low      | 2h         | ✅             |
| T018 | Create webapp layout                 | High     | 4h         | ✅             |
| T019 | Implement dashboard page             | High     | 6h         | ✅             |
| T020 | Create chat interface (Direct Groq)  | High     | 8h         | ✅             |
| T021 | Implement WebSocket client           | High     | 4h         | ✅ (API Route) |
| T022 | Add authentication UI                | Medium   | 6h         | ✅             |
| T023 | Write integration tests              | Medium   | 4h         | 🔲             |
| T024 | ESP32 WebSocket Protocol             | High     | 4h         | ✅             |

### Deliverables

- [x] Direct Groq API integration working
- [x] WebChat functional (Webapp + Telegram)
- [x] Full dashboard UI (Dashboard, Chat, Devices, Settings, Auth)
- [x] Health monitoring endpoints

---

## 📦 PHASE 3: ESP32 DEVELOPMENT (Week 5-7) 🔄 IN PROGRESS

### Objectives

- Develop ESP32 firmware
- Implement audio capture
- Create WebSocket client
- Add wake word detection

### Notes

> Hardware đang được mua: ESP32-S3, INMP441 mic, MAX98357A speaker, motors, sensors.
> Protocol và handler đã được thiết kế và test.

### Tasks

| ID   | Task                          | Priority | Est. Hours | Status |
| ---- | ----------------------------- | -------- | ---------- | ------ |
| T024 | Setup PlatformIO project      | High     | 2h         | ✅     |
| T025 | Implement WiFi manager        | High     | 4h         | 🔲     |
| T026 | Configure I2S microphone      | High     | 6h         | 🔲     |
| T027 | Configure I2S speaker         | High     | 4h         | 🔲     |
| T028 | Implement audio buffer        | High     | 6h         | 🔲     |
| T029 | Create WebSocket client       | High     | 8h         | 🔲     |
| T030 | Implement wake word detection | High     | 12h        | 🔲     |
| T031 | Add LED status indicators     | Low      | 2h         | 🔲     |
| T032 | Implement button controls     | Medium   | 3h         | 🔲     |
| T033 | Create OTA update system      | Medium   | 6h         | 🔲     |
| T034 | Write hardware tests          | Medium   | 4h         | 🔲     |
| T035 | Document hardware setup       | High     | 3h         | 🔲     |

### Deliverables

- [ ] Working ESP32 firmware
- [ ] Audio capture functional
- [ ] WebSocket connection stable
- [ ] Wake word detection working
- [ ] Hardware documentation complete

---

## 📦 PHASE 4: BRIDGE SERVICE (Week 8-9)

### Objectives

- Build ESP32-Gateway bridge
- Implement STT service
- Implement TTS service
- Device management

### Tasks

| ID   | Task                      | Priority | Est. Hours | Status |
| ---- | ------------------------- | -------- | ---------- | ------ |
| T036 | Create bridge server      | High     | 4h         | 🔲     |
| T037 | Implement ESP32 handler   | High     | 6h         | 🔲     |
| T038 | Implement Gateway handler | High     | 6h         | 🔲     |
| T039 | Create audio processor    | High     | 8h         | 🔲     |
| T040 | Integrate Whisper STT     | High     | 6h         | 🔲     |
| T041 | Integrate ElevenLabs TTS  | High     | 4h         | 🔲     |
| T042 | Implement device registry | Medium   | 4h         | 🔲     |
| T043 | Add device authentication | High     | 4h         | 🔲     |
| T044 | Create admin API          | Medium   | 4h         | 🔲     |
| T045 | Write unit tests          | Medium   | 4h         | 🔲     |
| T046 | Add logging & monitoring  | Medium   | 3h         | 🔲     |

### Deliverables

- [ ] Bridge service operational
- [ ] STT working with Whisper
- [ ] TTS working with ElevenLabs
- [ ] Device management functional

---

## 📦 PHASE 5: CUSTOM SKILLS (Week 10-11)

### Objectives

- Create ESP32 voice skill
- Build home automation skills
- Integrate with Moltbot skill system

### Tasks

| ID   | Task                          | Priority | Est. Hours | Status |
| ---- | ----------------------------- | -------- | ---------- | ------ |
| T047 | Create esp32-voice skill      | High     | 8h         | 🔲     |
| T048 | Create device-control skill   | High     | 6h         | 🔲     |
| T049 | Create status-report skill    | Medium   | 4h         | 🔲     |
| T050 | Register skills with ClawdHub | Low      | 2h         | 🔲     |
| T051 | Add skill management UI       | Medium   | 6h         | 🔲     |
| T052 | Implement skill testing       | Medium   | 4h         | 🔲     |
| T053 | Write skill documentation     | High     | 4h         | 🔲     |

### Deliverables

- [ ] ESP32 voice skill working
- [ ] Device control functional
- [ ] Skills integrated with Moltbot
- [ ] Skill documentation complete

---

## 📦 PHASE 6: TESTING & POLISH (Week 12)

### Objectives

- Comprehensive testing
- Performance optimization
- Bug fixes
- UI polish

### Tasks

| ID   | Task                 | Priority | Est. Hours | Status |
| ---- | -------------------- | -------- | ---------- | ------ |
| T054 | End-to-end testing   | High     | 8h         | 🔲     |
| T055 | Performance testing  | High     | 4h         | 🔲     |
| T056 | Latency optimization | High     | 6h         | 🔲     |
| T057 | Fix critical bugs    | High     | 8h         | 🔲     |
| T058 | UI/UX improvements   | Medium   | 6h         | 🔲     |
| T059 | Security audit       | High     | 4h         | 🔲     |
| T060 | Update documentation | Medium   | 4h         | 🔲     |

### Deliverables

- [ ] All tests passing
- [ ] Latency < 3 seconds
- [ ] No critical bugs
- [ ] Security verified

---

## 📦 PHASE 7: DEPLOYMENT (Week 13-14)

### Objectives

- Production deployment
- Monitoring setup
- User documentation
- Launch

### Tasks

| ID   | Task                        | Priority | Est. Hours | Status |
| ---- | --------------------------- | -------- | ---------- | ------ |
| T061 | Setup production server     | High     | 4h         | 🔲     |
| T062 | Configure Docker production | High     | 4h         | 🔲     |
| T063 | Setup SSL/TLS               | High     | 2h         | 🔲     |
| T064 | Configure monitoring        | High     | 4h         | 🔲     |
| T065 | Setup alerting              | Medium   | 2h         | 🔲     |
| T066 | Create user guide           | High     | 6h         | 🔲     |
| T067 | Create video tutorials      | Low      | 8h         | 🔲     |
| T068 | Final testing               | High     | 4h         | 🔲     |
| T069 | Launch preparation          | High     | 2h         | 🔲     |
| T070 | Go live!                    | High     | 2h         | 🔲     |

### Deliverables

- [ ] Production system running
- [ ] Monitoring active
- [ ] Documentation complete
- [ ] System launched

---

## 📊 Resource Requirements

### Hardware

| Item               | Quantity | Est. Cost |
| ------------------ | -------- | --------- |
| ESP32-S3 DevKit    | 2        | $20       |
| INMP441 Microphone | 2        | $10       |
| MAX98357A DAC      | 2        | $10       |
| Speaker 3W         | 2        | $5        |
| Breadboard + Wires | 1 set    | $10       |
| **Total**          |          | **~$55**  |

### Services (Monthly)

| Service            | Cost              |
| ------------------ | ----------------- |
| VPS (2GB RAM)      | $10-20            |
| OpenAI Whisper API | ~$5               |
| ElevenLabs TTS     | $5-22             |
| Domain             | $1                |
| **Total**          | **~$21-48/month** |

---

## 🔄 Progress Tracking

### Weekly Checklist

- [ ] Review completed tasks
- [ ] Update task statuses
- [ ] Identify blockers
- [ ] Plan next week
- [ ] Push changes to GitHub

### Status Legend

- 🔲 Not Started
- 🔄 In Progress
- ✅ Completed
- ⏸️ On Hold
- ❌ Cancelled

---

## 📝 Notes & Decisions

### Decision Log

| Date         | Decision                | Rationale                          |
| ------------ | ----------------------- | ---------------------------------- |
| Jan 29, 2026 | Use pnpm workspace      | Better performance, strict deps    |
| Jan 29, 2026 | TypeScript strict mode  | Catch errors early                 |
| Jan 29, 2026 | ESP32-S3 over ESP32     | Better audio support               |
| Feb 15, 2026 | Bypass OpenClaw/Moltbot | Groq context overflow on free tier |
| Feb 15, 2026 | Direct Groq API         | Simpler, more reliable             |

### Risks

| Risk                     | Impact | Mitigation                |
| ------------------------ | ------ | ------------------------- |
| Whisper API latency      | High   | Local Whisper option      |
| ESP32 memory limits      | Medium | Optimize audio buffer     |
| Moltbot breaking changes | Medium | Pin version, test updates |

---

## 🔗 References

- Moltbot Docs: https://docs.molt.bot/
- ESP32 Audio: https://docs.espressif.com/
- Whisper API: https://platform.openai.com/docs/guides/speech-to-text
- ElevenLabs: https://docs.elevenlabs.io/
