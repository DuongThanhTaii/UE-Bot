# 📋 UE-Bot Project Plan

## Project Information

- **Project Name**: UE-Bot (Universal ESP32 Bot)
- **Repository**: https://github.com/DuongThanhTaii/UE-Bot
- **Start Date**: January 29, 2026
- **Target Completion**: April 30, 2026 (~14 weeks)

---

## 🎯 Project Goals

### Primary Goals

1. ✅ Xây dựng custom web dashboard (Direct Groq API)
2. 🔲 **Clone OpenClaw/ClawdBot AI Agent System**
3. 🔲 Thêm CLI interface
4. 🔲 Tích hợp ESP32 voice control
5. 🔲 Deploy production-ready system

### Success Metrics

- [x] WebChat hoạt động qua custom website
- [x] Telegram Bot hoạt động
- [ ] **AI Agent có thể gọi tools (function calling)**
- [ ] **Agent tự động thực hiện multi-step tasks**
- [ ] CLI interface hoạt động
- [ ] ESP32 có thể gửi voice commands
- [ ] Latency voice command < 3 giây
- [ ] System uptime > 99%

---

## 📅 Timeline Overview

```
Phase 1: Foundation            │██████████│ Week 1-2   ✅ COMPLETED
Phase 2: Basic Integration     │██████████│ Week 3-4   ✅ COMPLETED (Direct Groq)
Phase 3: AI AGENT CORE         │███████████████│ Week 5-8   🔲 NOT STARTED ← CURRENT
Phase 4: CLI Interface         │█████│ Week 9      🔲 NOT STARTED
Phase 5: ESP32 Development     │██████████│ Week 10-11 🔲 BLOCKED (waiting hardware)
Phase 6: Voice Integration     │█████│ Week 12     🔲 NOT STARTED
Phase 7: Testing & Polish      │█████│ Week 13     🔲 NOT STARTED
Phase 8: Deployment            │█████│ Week 14     🔲 NOT STARTED
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

## 📦 PHASE 2: BASIC INTEGRATION (Week 3-4) ✅ COMPLETED

### Objectives

- Setup basic WebChat with Direct Groq API
- Configure Telegram Bot
- Build dashboard UI

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

## 📦 PHASE 3: AI AGENT CORE (Week 5-8) 🔲 NOT STARTED

### Objectives

- **Clone OpenClaw/ClawdBot Agent capabilities**
- Implement Function Calling with Groq
- Build Tool System (file, exec, web, memory)
- Create Agent Execution Loop

### Notes

> **Target**: Tạo AI Agent có thể tự động thực hiện multi-step tasks như ClawdBot/OpenClaw.
> Sử dụng Groq API với function calling để gọi các tools.
> Reference: https://docs.openclaw.ai/

### Tasks

| ID   | Task                                   | Priority | Est. Hours | Status |
| ---- | -------------------------------------- | -------- | ---------- | ------ |
| T025 | Design Agent Architecture              | High     | 4h         | 🔲     |
| T026 | Implement Function Calling (Groq)      | High     | 8h         | 🔲     |
| T027 | Create Tool Registry System            | High     | 6h         | 🔲     |
| T028 | Implement File Tools (read/write/edit) | High     | 8h         | 🔲     |
| T029 | Implement Exec Tools (bash/process)    | High     | 8h         | 🔲     |
| T030 | Implement Web Tools (search/fetch)     | Medium   | 6h         | 🔲     |
| T031 | Implement Memory System                | Medium   | 8h         | 🔲     |
| T032 | Create Agent Execution Loop            | High     | 10h        | 🔲     |
| T033 | Add Streaming Support                  | Medium   | 6h         | 🔲     |
| T034 | Implement Session Management           | Medium   | 6h         | 🔲     |
| T035 | Update Chat UI for Agent Actions       | High     | 8h         | 🔲     |
| T036 | Add Tool Approval Flow                 | Medium   | 4h         | 🔲     |
| T037 | Create Agent API Endpoints             | High     | 6h         | 🔲     |
| T038 | Implement Error Recovery               | Medium   | 4h         | 🔲     |
| T039 | Write Agent Tests                      | Medium   | 6h         | 🔲     |

### Tool Groups to Implement (like OpenClaw)

| Group            | Tools                             | Description             |
| ---------------- | --------------------------------- | ----------------------- |
| `group:fs`       | `read`, `write`, `edit`, `list`   | File system operations  |
| `group:runtime`  | `exec`, `bash`, `process`         | Shell command execution |
| `group:web`      | `web_search`, `web_fetch`         | Web search and scraping |
| `group:memory`   | `memory_save`, `memory_search`    | Long-term memory        |
| `group:sessions` | `session_list`, `session_history` | Conversation sessions   |

### Deliverables

- [ ] Agent can use function calling
- [ ] File tools working (read/write/edit)
- [ ] Exec tools working (run commands)
- [ ] Web tools working (search/fetch)
- [ ] Memory system functional
- [ ] Agent execution loop stable
- [ ] UI shows tool calls and results

---

## 📦 PHASE 4: CLI INTERFACE (Week 9) 🔲 NOT STARTED

### Objectives

- Build command-line interface for Agent
- Support interactive and single-command modes
- Pipe input/output support

### Tasks

| ID   | Task                          | Priority | Est. Hours | Status |
| ---- | ----------------------------- | -------- | ---------- | ------ |
| T040 | Setup CLI package             | High     | 2h         | 🔲     |
| T041 | Implement interactive mode    | High     | 6h         | 🔲     |
| T042 | Implement single-command mode | High     | 4h         | 🔲     |
| T043 | Add pipe support              | Medium   | 4h         | 🔲     |
| T044 | Add configuration options     | Medium   | 3h         | 🔲     |
| T045 | Implement output formatting   | Low      | 3h         | 🔲     |
| T046 | Write CLI documentation       | Medium   | 2h         | 🔲     |

### Deliverables

- [ ] CLI package working
- [ ] Interactive chat mode
- [ ] Single command execution
- [ ] Pipe input support
- [ ] CLI documentation complete

---

## 📦 PHASE 5: ESP32 DEVELOPMENT (Week 10-11) 🔲 BLOCKED

### Objectives

- Develop ESP32 firmware
- Implement audio capture
- Create WebSocket client
- Add wake word detection

### Notes

> **BLOCKED**: Đang chờ mua hardware (ESP32-S3, INMP441 mic, MAX98357A speaker).
> Task documentation đã được tạo sẵn trong thư mục `tasks/`.

### Tasks

| ID   | Task                          | Priority | Est. Hours | Status |
| ---- | ----------------------------- | -------- | ---------- | ------ |
| T047 | Setup PlatformIO project      | High     | 2h         | ✅     |
| T048 | Implement WiFi manager        | High     | 4h         | 🔲     |
| T049 | Configure I2S microphone      | High     | 6h         | 🔲     |
| T050 | Configure I2S speaker         | High     | 4h         | 🔲     |
| T051 | Implement audio buffer        | High     | 6h         | 🔲     |
| T052 | Create WebSocket client       | High     | 8h         | 🔲     |
| T053 | Implement wake word detection | High     | 12h        | 🔲     |
| T054 | Add LED status indicators     | Low      | 2h         | 🔲     |
| T055 | Implement button controls     | Medium   | 3h         | 🔲     |
| T056 | Create OTA update system      | Medium   | 6h         | 🔲     |
| T057 | Write hardware tests          | Medium   | 4h         | 🔲     |
| T058 | Document hardware setup       | High     | 3h         | 🔲     |

### Deliverables

- [ ] Working ESP32 firmware
- [ ] Audio capture functional
- [ ] WebSocket connection stable
- [ ] Wake word detection working
- [ ] Hardware documentation complete

---

## 📦 PHASE 6: VOICE INTEGRATION (Week 12) 🔲 NOT STARTED

### Objectives

- Integrate ESP32 with Agent system
- Implement STT (Speech-to-Text)
- Implement TTS (Text-to-Speech)
- Voice command flow

### Tasks

| ID   | Task                              | Priority | Est. Hours | Status |
| ---- | --------------------------------- | -------- | ---------- | ------ |
| T059 | Create Bridge Service             | High     | 6h         | 🔲     |
| T060 | Implement ESP32 WebSocket handler | High     | 6h         | 🔲     |
| T061 | Integrate Whisper STT             | High     | 6h         | 🔲     |
| T062 | Integrate TTS (ElevenLabs/Edge)   | High     | 4h         | 🔲     |
| T063 | Connect voice to Agent            | High     | 6h         | 🔲     |
| T064 | Implement voice feedback          | Medium   | 4h         | 🔲     |
| T065 | Add device management             | Medium   | 4h         | 🔲     |

### Deliverables

- [ ] ESP32 connects to Agent
- [ ] STT working
- [ ] TTS working
- [ ] Voice commands execute Agent tasks

---

## 📦 PHASE 7: TESTING & POLISH (Week 13) 🔲 NOT STARTED

### Objectives

- Comprehensive testing
- Performance optimization
- Bug fixes
- UI polish

### Tasks

| ID   | Task                 | Priority | Est. Hours | Status |
| ---- | -------------------- | -------- | ---------- | ------ |
| T066 | End-to-end testing   | High     | 8h         | 🔲     |
| T067 | Performance testing  | High     | 4h         | 🔲     |
| T068 | Latency optimization | High     | 6h         | 🔲     |
| T069 | Fix critical bugs    | High     | 8h         | 🔲     |
| T070 | UI/UX improvements   | Medium   | 6h         | 🔲     |
| T071 | Security audit       | High     | 4h         | 🔲     |
| T072 | Update documentation | Medium   | 4h         | 🔲     |

### Deliverables

- [ ] All tests passing
- [ ] Latency < 3 seconds
- [ ] No critical bugs
- [ ] Security verified

---

## 📦 PHASE 8: DEPLOYMENT (Week 14) 🔲 NOT STARTED

### Objectives

- Production deployment
- Monitoring setup
- User documentation
- Launch

### Tasks

| ID   | Task                        | Priority | Est. Hours | Status |
| ---- | --------------------------- | -------- | ---------- | ------ |
| T073 | Setup production server     | High     | 4h         | 🔲     |
| T074 | Configure Docker production | High     | 4h         | 🔲     |
| T075 | Setup SSL/TLS               | High     | 2h         | 🔲     |
| T076 | Configure monitoring        | High     | 4h         | 🔲     |
| T077 | Setup alerting              | Medium   | 2h         | 🔲     |
| T078 | Create user guide           | High     | 6h         | 🔲     |
| T079 | Create video tutorials      | Low      | 8h         | 🔲     |
| T080 | Final testing               | High     | 4h         | 🔲     |
| T081 | Launch preparation          | High     | 2h         | 🔲     |
| T082 | Go live!                    | High     | 2h         | 🔲     |

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
| Groq API           | Free tier         |
| OpenAI Whisper API | ~$5               |
| ElevenLabs TTS     | $5-22             |
| Brave Search API   | Free tier         |
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
- ⏸️ On Hold/Bypassed
- ❌ Cancelled

---

## 📝 Notes & Decisions

### Decision Log

| Date         | Decision                | Rationale                              |
| ------------ | ----------------------- | -------------------------------------- |
| Jan 29, 2026 | Use pnpm workspace      | Better performance, strict deps        |
| Jan 29, 2026 | TypeScript strict mode  | Catch errors early                     |
| Jan 29, 2026 | ESP32-S3 over ESP32     | Better audio support                   |
| Jan 31, 2026 | Bypass OpenClaw/Moltbot | Groq context overflow on free tier     |
| Jan 31, 2026 | Direct Groq API         | Simpler, more reliable                 |
| Jan 31, 2026 | Clone OpenClaw Agent    | Full agent capabilities like ClawdBot  |
| Jan 31, 2026 | AI Agent before ESP32   | Core feature first, ESP32 is extension |

### Risks

| Risk                  | Impact | Mitigation                     |
| --------------------- | ------ | ------------------------------ |
| Groq function calling | High   | Test thoroughly, fallback plan |
| Whisper API latency   | High   | Local Whisper option           |
| ESP32 memory limits   | Medium | Optimize audio buffer          |
| Tool security         | High   | Approval flow, sandboxing      |

---

## 🔗 References

- OpenClaw Docs: https://docs.openclaw.ai/
- Groq API: https://console.groq.com/docs
- ESP32 Audio: https://docs.espressif.com/
- Whisper API: https://platform.openai.com/docs/guides/speech-to-text
- ElevenLabs: https://docs.elevenlabs.io/
- Brave Search API: https://brave.com/search/api/
