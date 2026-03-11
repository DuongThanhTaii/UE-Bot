'use client';

import { Activity, Bot, Cpu, Loader2, MessageSquare, Mic, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';
import type { Device, AgentSession } from '@/types';

export default function DashboardPage(): React.ReactElement {
  const [devices, setDevices] = useState<Device[]>([]);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const [devicesRes, sessionsRes] = await Promise.all([
          api.getDevices().catch(() => ({ devices: [] })),
          api.getSessions().catch(() => ({ sessions: [] })),
        ]);
        setDevices(devicesRes.devices);
        setSessions(sessionsRes.sessions);
      } finally {
        setIsLoading(false);
      }
    }
    void fetchData();
  }, []);

  const onlineDevices = devices.filter((d) => d.status === 'online').length;

  const stats = [
    {
      title: 'Total Messages',
      value: sessions.reduce((sum, s) => sum + (s.messageCount ?? 0), 0).toString(),
      icon: MessageSquare,
      color: 'text-blue-500',
    },
    {
      title: 'Active Devices',
      value: onlineDevices.toString(),
      icon: Cpu,
      color: 'text-green-500',
    },
    {
      title: 'Chat Sessions',
      value: sessions.length.toString(),
      icon: Mic,
      color: 'text-purple-500',
    },
    {
      title: 'Total Devices',
      value: devices.length.toString(),
      icon: Activity,
      color: 'text-orange-500',
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here&apos;s an overview of your UE-Bot system.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/devices">Manage Devices</Link>
            </Button>
            <Button asChild>
              <Link href="/chat">
                <MessageSquare className="mr-2 h-4 w-4" />
                Start Chat
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Devices Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Connected Devices
              </CardTitle>
              <CardDescription>Your ESP32 devices and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No devices registered yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {devices.slice(0, 5).map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-full p-2 ${device.status === 'online' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}
                        >
                          {device.status === 'online' ? (
                            <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {device.lastSeen ?? 'Never'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                        {device.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" className="mt-4 w-full" asChild>
                <Link href="/devices">View All Devices</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Sessions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Sessions
              </CardTitle>
              <CardDescription>Latest agent conversations</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No chat sessions yet. Start a conversation!
                </p>
              ) : (
                <div className="space-y-4">
                  {sessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <MessageSquare className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">{session.title ?? 'Untitled session'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.createdAt).toLocaleDateString()}
                          {session.messageCount !== null &&
                            session.messageCount !== undefined &&
                            ` · ${session.messageCount} messages`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" className="mt-4 w-full" asChild>
                <Link href="/chat">Open Chat</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                <Mic className="h-6 w-6" />
                <span>Voice Command</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                <Cpu className="h-6 w-6" />
                <span>Add Device</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                <MessageSquare className="h-6 w-6" />
                <span>New Chat</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                <Activity className="h-6 w-6" />
                <span>View Logs</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
