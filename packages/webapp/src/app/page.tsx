'use client';

import { Activity, Bot, Cpu, MessageSquare, Mic, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Stats data
const stats = [
  {
    title: 'Total Messages',
    value: '1,234',
    change: '+12%',
    icon: MessageSquare,
    color: 'text-blue-500',
  },
  {
    title: 'Active Devices',
    value: '3',
    change: '+1',
    icon: Cpu,
    color: 'text-green-500',
  },
  {
    title: 'Voice Commands',
    value: '567',
    change: '+23%',
    icon: Mic,
    color: 'text-purple-500',
  },
  {
    title: 'Uptime',
    value: '99.9%',
    change: '',
    icon: Activity,
    color: 'text-orange-500',
  },
];

// Mock devices
const devices = [
  { id: '1', name: 'ESP32-Living Room', status: 'online', lastSeen: 'Just now' },
  { id: '2', name: 'ESP32-Bedroom', status: 'offline', lastSeen: '2 hours ago' },
  { id: '3', name: 'ESP32-Kitchen', status: 'online', lastSeen: '5 min ago' },
];

// Mock recent messages
const recentMessages = [
  { id: '1', text: 'Turn on the living room lights', time: '2 min ago', type: 'voice' },
  { id: '2', text: "What's the weather today?", time: '15 min ago', type: 'text' },
  { id: '3', text: 'Play some music', time: '1 hour ago', type: 'voice' },
  { id: '4', text: 'Set a timer for 30 minutes', time: '2 hours ago', type: 'text' },
];

export default function DashboardPage() {
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
                {stat.change && (
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="mr-1 inline h-3 w-3 text-green-500" />
                    {stat.change} from last week
                  </p>
                )}
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
              <div className="space-y-4">
                {devices.map((device) => (
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
                        <p className="text-xs text-muted-foreground">{device.lastSeen}</p>
                      </div>
                    </div>
                    <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                      {device.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="mt-4 w-full" asChild>
                <Link href="/devices">View All Devices</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Messages Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Messages
              </CardTitle>
              <CardDescription>Latest conversations with UE-Bot</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMessages.map((message) => (
                  <div key={message.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {message.type === 'voice' ? (
                          <Mic className="h-4 w-4" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">{message.text}</p>
                      <p className="text-xs text-muted-foreground">{message.time}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {message.type}
                    </Badge>
                  </div>
                ))}
              </div>
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
