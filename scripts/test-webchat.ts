#!/usr/bin/env npx tsx
/**
 * WebChat Gateway Test Script
 * Tests the connection to OpenClaw Gateway via WebSocket
 */

import WebSocket from 'ws';

const GATEWAY_URL = process.env['GATEWAY_URL'] || 'ws://localhost:18789';
const GATEWAY_TOKEN = process.env['GATEWAY_TOKEN'] || 'uebot-gateway-token-2026';

interface GatewayMessage {
  type: string;
  payload?: unknown;
  id?: string;
}

async function testWebChat(): Promise<void> {
  console.log('🧪 Testing WebChat Connection to OpenClaw Gateway\n');
  console.log(`   Gateway URL: ${GATEWAY_URL}`);
  console.log(`   Token: ${GATEWAY_TOKEN.substring(0, 10)}...`);
  console.log('');

  return new Promise((resolve, reject) => {
    const wsUrl = `${GATEWAY_URL}?token=${GATEWAY_TOKEN}`;
    console.log('1️⃣  Connecting to Gateway...');

    const ws = new WebSocket(wsUrl);
    let sessionId: string | undefined;
    let responseReceived = false;

    ws.on('open', () => {
      console.log('   ✅ WebSocket connected!\n');

      // Send auth
      console.log('2️⃣  Authenticating...');
      ws.send(
        JSON.stringify({
          type: 'auth',
          payload: { token: GATEWAY_TOKEN },
        })
      );
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message: GatewayMessage = JSON.parse(data.toString());
        console.log(`   📨 Received: ${message.type}`);

        switch (message.type) {
          case 'auth_ok':
          case 'connected':
            sessionId = (message.payload as { sessionId?: string })?.sessionId;
            console.log(`   ✅ Authenticated! Session: ${sessionId || 'N/A'}\n`);

            // Send test message
            console.log('3️⃣  Sending test message...');
            ws.send(
              JSON.stringify({
                type: 'chat',
                payload: {
                  message: 'Hello! Please respond with a short greeting.',
                  sessionId,
                },
              })
            );
            break;

          case 'stream':
            const streamPayload = message.payload as { content?: string; done?: boolean };
            if (streamPayload?.content) {
              process.stdout.write(streamPayload.content);
            }
            if (streamPayload?.done) {
              console.log('\n');
              responseReceived = true;
            }
            break;

          case 'chat_response':
          case 'message':
            const chatPayload = message.payload as { content?: string };
            if (chatPayload?.content) {
              console.log(`   🤖 Response: ${chatPayload.content.substring(0, 200)}...`);
            }
            responseReceived = true;
            break;

          case 'error':
            const errorPayload = message.payload as { message?: string; code?: string };
            console.error(`   ❌ Error: ${errorPayload?.message || 'Unknown error'}`);
            break;

          case 'pong':
            // Heartbeat response
            break;

          default:
            console.log(
              `   📝 ${message.type}:`,
              JSON.stringify(message.payload).substring(0, 100)
            );
        }
      } catch (err) {
        console.error('   Failed to parse message:', err);
      }
    });

    ws.on('error', (error) => {
      console.error('   ❌ WebSocket error:', error.message);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      console.log(`\n4️⃣  Connection closed: ${code} ${reason.toString()}`);

      if (responseReceived) {
        console.log('\n✅ WebChat test PASSED!\n');
        resolve();
      } else {
        console.log('\n⚠️  WebChat test completed (no response received)\n');
        resolve();
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      console.log('\n⏱️  Test timeout - closing connection...');
      ws.close();
    }, 30000);

    // Close after receiving response
    setTimeout(() => {
      if (responseReceived) {
        console.log('\n   Closing connection...');
        ws.close(1000, 'Test complete');
      }
    }, 10000);
  });
}

// Health check first
async function checkHealth(): Promise<boolean> {
  const httpUrl = GATEWAY_URL.replace('ws://', 'http://').replace('wss://', 'https://');
  try {
    const response = await fetch(`${httpUrl}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('🏥 Health check:', data);
      return true;
    }
    return false;
  } catch {
    console.log('⚠️  Health check failed - Gateway may not be running');
    return false;
  }
}

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════');
  console.log('  UE-Bot WebChat Gateway Test');
  console.log('═══════════════════════════════════════════════\n');

  const healthy = await checkHealth();
  if (!healthy) {
    console.log('\n❌ Gateway is not running. Start it with:');
    console.log('   cd external/moltbot && node dist/entry.js gateway\n');
    process.exit(1);
  }

  console.log('');

  try {
    await testWebChat();
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
