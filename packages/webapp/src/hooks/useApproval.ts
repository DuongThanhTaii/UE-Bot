'use client';

import type { ApprovalRequestData } from '@/components/agent/ApprovalCard';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook for managing tool approval requests
 */
export function useApproval() {
  const [requests, setRequests] = useState<ApprovalRequestData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch pending approval requests
   */
  const fetchRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/agent/approval');
      const data = await response.json();

      if (data.success) {
        setRequests(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch approval requests');
      console.error('Error fetching approval requests:', err);
    }
  }, []);

  /**
   * Approve a request
   */
  const approve = useCallback(async (requestId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agent/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'approve' }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, state: 'approved' as const } : r))
        );
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err) {
      setError('Failed to approve request');
      console.error('Error approving request:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Deny a request
   */
  const deny = useCallback(async (requestId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agent/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'deny' }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, state: 'denied' as const } : r))
        );
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err) {
      setError('Failed to deny request');
      console.error('Error denying request:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get pending requests count
   */
  const pendingCount = requests.filter((r) => r.state === 'pending').length;

  /**
   * Poll for pending requests
   */
  useEffect(() => {
    // Initial fetch
    fetchRequests();

    // Poll every 2 seconds
    const interval = setInterval(fetchRequests, 2000);

    return () => clearInterval(interval);
  }, [fetchRequests]);

  return {
    requests,
    pendingCount,
    isLoading,
    error,
    approve,
    deny,
    fetchRequests,
    clearError,
  };
}
