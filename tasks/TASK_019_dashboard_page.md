# TASK-019: Implement Dashboard Page

## Task Information

- **ID**: T019
- **Phase**: 2 - Core Integration
- **Priority**: High
- **Estimated Hours**: 6h
- **Dependencies**: T018 (Webapp Layout)

---

## Objective

Implement trang Dashboard hiển thị:

- System status overview
- Connected devices
- Recent conversations
- Quick actions
- Real-time statistics

---

## Acceptance Criteria

- [ ] Dashboard page renders correctly
- [ ] System status cards displayed
- [ ] Device list with status indicators
- [ ] Recent conversations preview
- [ ] Quick action buttons working
- [ ] Real-time updates via WebSocket
- [ ] Loading states handled
- [ ] Error states handled

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Dashboard                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 🟢 Gateway   │ │ 📱 Devices   │ │ 💬 Messages  │        │
│  │   Online     │ │     3        │ │    127       │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  ┌────────────────────────────┐ ┌────────────────────────┐ │
│  │      Recent Chats          │ │      Devices           │ │
│  │                            │ │                        │ │
│  │  • User: Hello bot...      │ │  🟢 ESP32-Living       │ │
│  │  • User: Turn on light...  │ │  🟢 ESP32-Bedroom      │ │
│  │  • User: What time...      │ │  🔴 ESP32-Kitchen      │ │
│  │                            │ │                        │ │
│  └────────────────────────────┘ └────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │                  Quick Actions                          ││
│  │  [🎤 Voice Chat] [💬 Text Chat] [⚙️ Settings]          ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Instructions

### Step 1: Install Additional Dependencies

```bash
cd packages/webapp

# Install charting library (optional)
pnpm add recharts

# Install date formatting
pnpm add date-fns

# Shadcn components
npx shadcn@latest add skeleton
npx shadcn@latest add progress
```

### Step 2: Create Dashboard Types

Tạo file `packages/webapp/src/types/dashboard.ts`:

```typescript
export interface SystemStatus {
  gateway: {
    status: 'online' | 'offline' | 'error';
    uptime: number;
    version: string;
  };
  devices: {
    total: number;
    online: number;
    offline: number;
  };
  messages: {
    today: number;
    total: number;
  };
}

export interface Device {
  id: string;
  name: string;
  type: 'esp32' | 'web' | 'mobile';
  status: 'online' | 'offline' | 'error';
  lastSeen: Date;
  location?: string;
}

export interface RecentChat {
  id: string;
  userId: string;
  userName: string;
  lastMessage: string;
  timestamp: Date;
  unread: boolean;
}
```

### Step 3: Create Status Card Component

Tạo file `packages/webapp/src/components/features/dashboard/status-card.tsx`:

```tsx
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatusCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  status?: 'success' | 'warning' | 'error' | 'default';
}

const statusColors = {
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
  default: 'text-muted-foreground',
};

export function StatusCard({
  title,
  value,
  description,
  icon: Icon,
  status = 'default',
}: StatusCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-4 w-4', statusColors[status])} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
```

### Step 4: Create Device List Component

Tạo file `packages/webapp/src/components/features/dashboard/device-list.tsx`:

```tsx
'use client';

import { formatDistanceToNow } from 'date-fns';
import { Cpu, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Device } from '@/types/dashboard';

interface DeviceListProps {
  devices: Device[];
  isLoading?: boolean;
}

const statusConfig = {
  online: {
    icon: Wifi,
    color: 'bg-green-500',
    badge: 'default' as const,
  },
  offline: {
    icon: WifiOff,
    color: 'bg-gray-500',
    badge: 'secondary' as const,
  },
  error: {
    icon: AlertCircle,
    color: 'bg-red-500',
    badge: 'destructive' as const,
  },
};

export function DeviceList({ devices, isLoading }: DeviceListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          Devices ({devices.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="space-y-3">
            {devices.map((device) => {
              const config = statusConfig[device.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${config.color}`} />
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {device.location ?? device.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={config.badge}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {device.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(device.lastSeen, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

### Step 5: Create Recent Chats Component

Tạo file `packages/webapp/src/components/features/dashboard/recent-chats.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RecentChat } from '@/types/dashboard';

interface RecentChatsProps {
  chats: RecentChat[];
  isLoading?: boolean;
}

export function RecentChats({ chats, isLoading }: RecentChatsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Chats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Recent Chats
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/chat">
            View all
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="space-y-3">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{chat.userName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{chat.userName}</p>
                    {chat.unread && (
                      <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(chat.timestamp, { addSuffix: true })}
                </span>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

### Step 6: Create Quick Actions Component

Tạo file `packages/webapp/src/components/features/dashboard/quick-actions.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { Mic, MessageSquare, Settings, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const actions = [
  {
    name: 'Voice Chat',
    description: 'Start voice conversation',
    icon: Mic,
    href: '/voice',
    variant: 'default' as const,
  },
  {
    name: 'Text Chat',
    description: 'Open chat interface',
    icon: MessageSquare,
    href: '/chat',
    variant: 'outline' as const,
  },
  {
    name: 'Add Device',
    description: 'Connect new ESP32',
    icon: Plus,
    href: '/devices/add',
    variant: 'outline' as const,
  },
  {
    name: 'Settings',
    description: 'Configure system',
    icon: Settings,
    href: '/settings',
    variant: 'outline' as const,
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {actions.map((action) => (
            <Button
              key={action.name}
              variant={action.variant}
              className="h-auto flex-col py-4"
              asChild
            >
              <Link href={action.href}>
                <action.icon className="h-6 w-6 mb-2" />
                <span className="font-medium">{action.name}</span>
                <span className="text-xs text-muted-foreground mt-1">{action.description}</span>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 7: Create Dashboard Store

Tạo file `packages/webapp/src/stores/dashboard.store.ts`:

```typescript
import { create } from 'zustand';
import type { SystemStatus, Device, RecentChat } from '@/types/dashboard';

interface DashboardState {
  systemStatus: SystemStatus | null;
  devices: Device[];
  recentChats: RecentChat[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setSystemStatus: (status: SystemStatus) => void;
  setDevices: (devices: Device[]) => void;
  setRecentChats: (chats: RecentChat[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateDeviceStatus: (deviceId: string, status: Device['status']) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  systemStatus: null,
  devices: [],
  recentChats: [],
  isLoading: true,
  error: null,

  setSystemStatus: (status) => set({ systemStatus: status }),
  setDevices: (devices) => set({ devices }),
  setRecentChats: (chats) => set({ recentChats: chats }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  updateDeviceStatus: (deviceId, status) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, status, lastSeen: new Date() } : d
      ),
    })),
}));
```

### Step 8: Create Dashboard Service

Tạo file `packages/webapp/src/services/dashboard.service.ts`:

```typescript
import type { SystemStatus, Device, RecentChat } from '@/types/dashboard';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080';

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error('Failed to fetch system status');
  }

  const health = await response.json();

  // Transform health response to SystemStatus
  return {
    gateway: {
      status: health.services.gateway.status === 'up' ? 'online' : 'offline',
      uptime: health.uptime,
      version: health.version,
    },
    devices: {
      total: 0, // Will be updated from devices endpoint
      online: 0,
      offline: 0,
    },
    messages: {
      today: 0,
      total: 0,
    },
  };
}

export async function fetchDevices(): Promise<Device[]> {
  const response = await fetch(`${API_URL}/api/devices`);
  if (!response.ok) {
    throw new Error('Failed to fetch devices');
  }
  return response.json();
}

export async function fetchRecentChats(): Promise<RecentChat[]> {
  const response = await fetch(`${API_URL}/api/chats/recent`);
  if (!response.ok) {
    throw new Error('Failed to fetch recent chats');
  }
  return response.json();
}
```

### Step 9: Create Dashboard Page

Tạo file `packages/webapp/src/app/(dashboard)/dashboard/page.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { Activity, Cpu, MessageSquare, Zap } from 'lucide-react';

import { StatusCard } from '@/components/features/dashboard/status-card';
import { DeviceList } from '@/components/features/dashboard/device-list';
import { RecentChats } from '@/components/features/dashboard/recent-chats';
import { QuickActions } from '@/components/features/dashboard/quick-actions';
import { useDashboardStore } from '@/stores/dashboard.store';
import { fetchSystemStatus, fetchDevices, fetchRecentChats } from '@/services/dashboard.service';

// Mock data for development
const mockDevices = [
  {
    id: '1',
    name: 'ESP32-Living',
    type: 'esp32' as const,
    status: 'online' as const,
    lastSeen: new Date(),
    location: 'Living Room',
  },
  {
    id: '2',
    name: 'ESP32-Bedroom',
    type: 'esp32' as const,
    status: 'online' as const,
    lastSeen: new Date(Date.now() - 60000),
    location: 'Bedroom',
  },
  {
    id: '3',
    name: 'ESP32-Kitchen',
    type: 'esp32' as const,
    status: 'offline' as const,
    lastSeen: new Date(Date.now() - 3600000),
    location: 'Kitchen',
  },
];

const mockChats = [
  {
    id: '1',
    userId: 'user1',
    userName: 'John',
    lastMessage: 'Turn on the living room lights',
    timestamp: new Date(Date.now() - 300000),
    unread: true,
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Jane',
    lastMessage: 'What is the temperature?',
    timestamp: new Date(Date.now() - 900000),
    unread: false,
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Guest',
    lastMessage: 'Hello bot!',
    timestamp: new Date(Date.now() - 1800000),
    unread: false,
  },
];

export default function DashboardPage() {
  const {
    systemStatus,
    devices,
    recentChats,
    isLoading,
    setSystemStatus,
    setDevices,
    setRecentChats,
    setLoading,
    setError,
  } = useDashboardStore();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        // For development, use mock data
        // In production, use actual API calls
        if (process.env.NODE_ENV === 'development') {
          // Simulate loading
          await new Promise((resolve) => setTimeout(resolve, 1000));

          setSystemStatus({
            gateway: {
              status: 'online',
              uptime: 86400000,
              version: '1.0.0',
            },
            devices: {
              total: 3,
              online: 2,
              offline: 1,
            },
            messages: {
              today: 42,
              total: 127,
            },
          });

          setDevices(mockDevices);
          setRecentChats(mockChats);
        } else {
          const [status, deviceList, chats] = await Promise.all([
            fetchSystemStatus(),
            fetchDevices(),
            fetchRecentChats(),
          ]);

          setSystemStatus(status);
          setDevices(deviceList);
          setRecentChats(chats);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void loadDashboardData();
  }, [setSystemStatus, setDevices, setRecentChats, setLoading, setError]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your UE-Bot system status</p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Gateway Status"
          value={systemStatus?.gateway.status ?? 'Unknown'}
          description={
            systemStatus
              ? `Uptime: ${Math.floor(systemStatus.gateway.uptime / 3600000)}h`
              : 'Loading...'
          }
          icon={Activity}
          status={systemStatus?.gateway.status === 'online' ? 'success' : 'error'}
        />
        <StatusCard
          title="Devices"
          value={systemStatus?.devices.total ?? '-'}
          description={`${systemStatus?.devices.online ?? 0} online, ${systemStatus?.devices.offline ?? 0} offline`}
          icon={Cpu}
          status={systemStatus?.devices.offline === 0 ? 'success' : 'warning'}
        />
        <StatusCard
          title="Messages Today"
          value={systemStatus?.messages.today ?? '-'}
          description={`${systemStatus?.messages.total ?? 0} total messages`}
          icon={MessageSquare}
          status="default"
        />
        <StatusCard
          title="Active Sessions"
          value="3"
          description="Currently active"
          icon={Zap}
          status="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentChats
          chats={recentChats.length > 0 ? recentChats : mockChats}
          isLoading={isLoading}
        />
        <DeviceList devices={devices.length > 0 ? devices : mockDevices} isLoading={isLoading} />
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}
```

### Step 10: Create Components Index

Tạo file `packages/webapp/src/components/features/dashboard/index.ts`:

```typescript
export { StatusCard } from './status-card';
export { DeviceList } from './device-list';
export { RecentChats } from './recent-chats';
export { QuickActions } from './quick-actions';
```

---

## File Structure After Completion

```
packages/webapp/src/
├── app/
│   └── (dashboard)/
│       ├── dashboard/
│       │   └── page.tsx
│       └── layout.tsx
├── components/
│   └── features/
│       └── dashboard/
│           ├── device-list.tsx
│           ├── index.ts
│           ├── quick-actions.tsx
│           ├── recent-chats.tsx
│           └── status-card.tsx
├── services/
│   └── dashboard.service.ts
├── stores/
│   └── dashboard.store.ts
└── types/
    └── dashboard.ts
```

---

## Verification Checklist

- [ ] Dashboard page loads correctly
- [ ] Status cards display system info
- [ ] Device list shows mock/real data
- [ ] Recent chats component works
- [ ] Quick actions navigate correctly
- [ ] Loading states displayed
- [ ] Dark mode works properly
- [ ] Responsive design tested
- [ ] No TypeScript errors
- [ ] Zustand store working

---

## Related Tasks

- **T018**: Create Webapp Layout (prerequisite)
- **T020**: Create Chat Interface (next)
- **T021**: Implement WebSocket Client (connects real-time data)
