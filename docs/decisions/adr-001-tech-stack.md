# ADR 001: Technology Stack Selection

## Status

Accepted

## Date

2024-01-XX

## Context

Cần chọn technology stack cho UE-Bot project với các yêu cầu:

- Clone và mở rộng Moltbot
- Custom web interface
- ESP32 voice integration
- Real-time communication
- Easy deployment

## Decision

### Frontend: Next.js 14 + TailwindCSS + Shadcn/UI

**Reasons:**

- Server-side rendering cho SEO và performance
- App Router cho routing hiện đại
- TailwindCSS cho rapid styling
- Shadcn/UI cho consistent components

### Backend Bridge: Express.js + WebSocket

**Reasons:**

- Lightweight và flexible
- Native WebSocket support
- Easy integration với Moltbot
- Wide ecosystem

### ESP32 Platform: PlatformIO + Arduino

**Reasons:**

- Familiar Arduino ecosystem
- Good IDE support
- Large community
- Easy library management

### Monorepo: pnpm Workspaces

**Reasons:**

- Fast package installation
- Built-in workspace support
- Disk efficient
- Strict dependency management

## Consequences

### Positive

- Modern, well-supported stack
- Good developer experience
- Scalable architecture
- Easy to find developers

### Negative

- Learning curve for Next.js App Router
- TypeScript everywhere requires discipline
- Multiple deployment targets

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [PlatformIO Documentation](https://docs.platformio.org)
- [pnpm Workspaces](https://pnpm.io/workspaces)
