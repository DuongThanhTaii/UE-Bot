'use client';

import {
  Bot,
  Loader2,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { AgentChat } from '@/components/agent/AgentChat';
import { ApprovalCard } from '@/components/agent/ApprovalCard';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApproval } from '@/hooks/useApproval';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import type { AgentSession } from '@/types';

export default function ChatPage() {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { requests, pendingCount, isLoading: approvalLoading, approve, deny } = useApproval();

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      const data = await api.getSessions();
      setSessions(data.sessions);
    } catch {
      // Sessions may not be available yet
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  // Create new session
  const handleNewSession = async () => {
    try {
      const data = await api.createSession();
      setSessions((prev) => [data.session, ...prev]);
      setActiveSessionId(data.session.id);
    } catch {
      // Silently fail - user can retry
    }
  };

  // Delete session
  const handleDeleteSession = async (id: string) => {
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(undefined);
      }
    } catch {
      // Silently fail
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)]">
        {/* Session Sidebar */}
        <div
          className={cn(
            'flex flex-col border-r transition-all duration-200',
            sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
          )}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <h2 className="text-sm font-semibold">Sessions</h2>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewSession}>
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Session List */}
          <ScrollArea className="flex-1">
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No sessions yet. Start chatting or create one.
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      'group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-muted',
                      activeSessionId === session.id && 'bg-muted font-medium'
                    )}
                    onClick={() => {
                      setActiveSessionId(session.id);
                    }}
                  >
                    <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">
                      {session.title ?? `Session ${session.id.slice(0, 8)}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteSession(session.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Pending Approvals */}
          {pendingCount > 0 && (
            <div className="border-t p-3">
              <p className="text-xs font-medium text-yellow-600 mb-2">
                {pendingCount} pending approval{pendingCount > 1 ? 's' : ''}
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {requests
                  .filter((r) => r.state === 'pending')
                  .map((req) => (
                    <ApprovalCard
                      key={req.id}
                      request={req}
                      onApprove={approve}
                      onDeny={deny}
                      isLoading={approvalLoading}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Chat Header */}
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setSidebarOpen(!sidebarOpen);
              }}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">UE-Bot Agent</h1>
            {activeSessionId && (
              <span className="text-xs text-muted-foreground ml-2">
                Session: {activeSessionId.slice(0, 8)}...
              </span>
            )}
          </div>

          {/* Agent Chat Component */}
          <div className="flex-1 min-h-0">
            <AgentChat />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
