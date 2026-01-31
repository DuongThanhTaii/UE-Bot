import { createApprovalChecker } from '@ue-bot/agent-core';
import { NextRequest, NextResponse } from 'next/server';

// Global approval checker instance
const approvalChecker = createApprovalChecker();

/**
 * GET /api/agent/approval
 * Get pending approval requests
 */
export async function GET() {
  try {
    const pending = approvalChecker.getPendingRequests();

    return NextResponse.json({
      success: true,
      data: pending.map(
        (r: {
          id: string;
          toolName: string;
          arguments: unknown;
          reason: string;
          state: string;
          createdAt: Date;
        }) => ({
          id: r.id,
          toolName: r.toolName,
          arguments: r.arguments,
          reason: r.reason,
          state: r.state,
          createdAt: r.createdAt.toISOString(),
        })
      ),
    });
  } catch (error) {
    console.error('Error getting approval requests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get approval requests',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent/approval
 * Approve or deny a request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing requestId or action',
        },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'deny') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be "approve" or "deny"',
        },
        { status: 400 }
      );
    }

    // Get request first to check if it exists
    const approvalRequest = approvalChecker.getRequest(requestId);
    if (!approvalRequest) {
      return NextResponse.json(
        {
          success: false,
          error: 'Approval request not found',
        },
        { status: 404 }
      );
    }

    if (approvalRequest.state !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: 'Approval request already resolved',
        },
        { status: 400 }
      );
    }

    // Process action
    if (action === 'approve') {
      await approvalChecker.approve(requestId);
    } else {
      await approvalChecker.deny(requestId);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: requestId,
        action,
        state: action === 'approve' ? 'approved' : 'denied',
      },
    });
  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process approval',
      },
      { status: 500 }
    );
  }
}
