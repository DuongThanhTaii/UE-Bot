'use client';

import {
  Battery,
  Cpu,
  MoreVertical,
  Plus,
  RefreshCw,
  Settings,
  Signal,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useState } from 'react';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Device {
  id: string;
  name: string;
  macAddress: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'connecting';
  batteryLevel: number;
  signalStrength: number;
  firmwareVersion: string;
  lastSeen: string;
  capabilities: string[];
}

// Mock devices data
const mockDevices: Device[] = [
  {
    id: '1',
    name: 'ESP32-Living Room',
    macAddress: 'AA:BB:CC:DD:EE:01',
    ipAddress: '192.168.1.101',
    status: 'online',
    batteryLevel: 85,
    signalStrength: -45,
    firmwareVersion: '1.0.0',
    lastSeen: 'Just now',
    capabilities: ['microphone', 'speaker', 'led'],
  },
  {
    id: '2',
    name: 'ESP32-Bedroom',
    macAddress: 'AA:BB:CC:DD:EE:02',
    ipAddress: '192.168.1.102',
    status: 'offline',
    batteryLevel: 20,
    signalStrength: -70,
    firmwareVersion: '1.0.0',
    lastSeen: '2 hours ago',
    capabilities: ['microphone', 'speaker'],
  },
  {
    id: '3',
    name: 'ESP32-Kitchen',
    macAddress: 'AA:BB:CC:DD:EE:03',
    ipAddress: '192.168.1.103',
    status: 'online',
    batteryLevel: 100,
    signalStrength: -55,
    firmwareVersion: '1.0.1',
    lastSeen: '5 min ago',
    capabilities: ['microphone', 'speaker', 'led', 'motor'],
  },
];

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getSignalBars = (strength: number) => {
    if (strength > -50) return 4;
    if (strength > -60) return 3;
    if (strength > -70) return 2;
    return 1;
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-500';
    if (level > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
            <p className="text-muted-foreground">
              Manage your ESP32 devices and their configurations
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{devices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {devices.filter((d) => d.status === 'online').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Offline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">
                {devices.filter((d) => d.status === 'offline').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Devices Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <Card key={device.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-full p-2 ${
                        device.status === 'online'
                          ? 'bg-green-100 dark:bg-green-900'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      {device.status === 'online' ? (
                        <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{device.name}</CardTitle>
                      <CardDescription className="text-xs">{device.macAddress}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Configure
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Restart
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                      {device.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{device.lastSeen}</span>
                  </div>

                  {/* Device Info */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Signal className="h-4 w-4 text-muted-foreground" />
                      <span>{getSignalBars(device.signalStrength)}/4</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Battery className={`h-4 w-4 ${getBatteryColor(device.batteryLevel)}`} />
                      <span>{device.batteryLevel}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                      <span>v{device.firmwareVersion}</span>
                    </div>
                    <div className="text-muted-foreground">{device.ipAddress}</div>
                  </div>

                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1">
                    {device.capabilities.map((cap) => (
                      <Badge key={cap} variant="outline" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Device Card */}
          <Card className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-accent">
            <CardContent className="flex flex-col items-center gap-2 py-8">
              <Plus className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Add New Device</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
