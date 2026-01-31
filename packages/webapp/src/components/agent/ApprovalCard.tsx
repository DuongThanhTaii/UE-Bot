'use client';

import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

/**
 * Approval request data
 */
export interface ApprovalRequestData {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  reason: string;
  state: 'pending' | 'approved' | 'denied';
  createdAt: string;
}

/**
 * ApprovalCard props
 */
interface ApprovalCardProps {
  request: ApprovalRequestData;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  isLoading?: boolean;
}

/**
 * Approval card component for displaying and handling tool approval requests
 */
export function ApprovalCard({ request, onApprove, onDeny, isLoading = false }: ApprovalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isPending = request.state === 'pending';

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all',
        isPending
          ? 'border-yellow-500/50 bg-yellow-500/10'
          : request.state === 'approved'
            ? 'border-green-500/50 bg-green-500/10'
            : 'border-red-500/50 bg-red-500/10'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {isPending ? (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          ) : request.state === 'approved' ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Tool: {request.toolName}</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                isPending
                  ? 'bg-yellow-500/20 text-yellow-600'
                  : request.state === 'approved'
                    ? 'bg-green-500/20 text-green-600'
                    : 'bg-red-500/20 text-red-600'
              )}
            >
              {request.state}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>

          {/* Timestamp */}
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{new Date(request.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Expand button */}
        <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-muted rounded">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Arguments (expanded) */}
      {expanded && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-medium mb-2">Arguments:</p>
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
            {JSON.stringify(request.arguments, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onApprove(request.id)}
            disabled={isLoading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2',
              'px-4 py-2 rounded-md text-sm font-medium',
              'bg-green-600 text-white hover:bg-green-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            <CheckCircle className="h-4 w-4" />
            Approve
          </button>

          <button
            onClick={() => onDeny(request.id)}
            disabled={isLoading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2',
              'px-4 py-2 rounded-md text-sm font-medium',
              'bg-red-600 text-white hover:bg-red-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            <XCircle className="h-4 w-4" />
            Deny
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * ApprovalList props
 */
interface ApprovalListProps {
  requests: ApprovalRequestData[];
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  isLoading?: boolean;
}

/**
 * List of approval requests
 */
export function ApprovalList({ requests, onApprove, onDeny, isLoading }: ApprovalListProps) {
  const pendingRequests = requests.filter((r) => r.state === 'pending');
  const resolvedRequests = requests.filter((r) => r.state !== 'pending');

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No approval requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Pending Approvals ({pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <ApprovalCard
                key={request.id}
                request={request}
                onApprove={onApprove}
                onDeny={onDeny}
                isLoading={isLoading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resolved requests */}
      {resolvedRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 text-muted-foreground">Recent Decisions</h3>
          <div className="space-y-2">
            {resolvedRequests.slice(0, 5).map((request) => (
              <ApprovalCard
                key={request.id}
                request={request}
                onApprove={onApprove}
                onDeny={onDeny}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Approval banner for inline display
 */
interface ApprovalBannerProps {
  request: ApprovalRequestData;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  isLoading?: boolean;
}

export function ApprovalBanner({ request, onApprove, onDeny, isLoading }: ApprovalBannerProps) {
  return (
    <div className="flex items-center gap-4 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          Approval required for <code className="bg-muted px-1 rounded">{request.toolName}</code>
        </p>
        <p className="text-xs text-muted-foreground truncate">{request.reason}</p>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => onApprove(request.id)}
          disabled={isLoading}
          className={cn(
            'px-3 py-1.5 rounded text-sm font-medium',
            'bg-green-600 text-white hover:bg-green-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Approve
        </button>
        <button
          onClick={() => onDeny(request.id)}
          disabled={isLoading}
          className={cn(
            'px-3 py-1.5 rounded text-sm font-medium',
            'bg-red-600 text-white hover:bg-red-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Deny
        </button>
      </div>
    </div>
  );
}
