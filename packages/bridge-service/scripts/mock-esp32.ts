#!/usr/bin/env npx ts-node

/**
 * Mock ESP32 Test Script
 *
 * Usage:
 *   npx ts-node scripts/mock-esp32.ts [server-url]
 *
 * Example:
 *   npx ts-node scripts/mock-esp32.ts ws://localhost:3001/ws/esp32
 */

import { MockESP32Client } from '../src/utils/mock-esp32';

const DEFAULT_SERVER = 'ws://localhost:3001/ws/esp32';

async function main(): Promise<void> {
  const serverUrl = process.argv[2] || DEFAULT_SERVER;

  console.log('🔌 Mock ESP32 Client');
  console.log('====================');
  console.log(`Server: ${serverUrl}\n`);

  const client = new MockESP32Client({
    serverUrl,
    firmwareVersion: '1.0.0-test',
    capabilities: {
      hasWakeWord: true,
      hasSpeaker: true,
      hasMicrophone: true,
      hasLED: true,
      maxSampleRate: 16000,
      supportedFormats: ['pcm16'],
    },
  });

  // Register handlers
  client.onMessage('handshake_ack', (msg) => {
    console.log('✅ Handshake successful!');
  });

  client.onMessage('text_response', (msg) => {
    const text = (msg as { text: string }).text;
    console.log('\n💬 Bot:', text);
  });

  client.onMessage('error', (msg) => {
    const error = msg as { error: string; code?: string };
    console.error('❌ Error:', error.error, error.code ? `(${error.code})` : '');
  });

  client.onMessage('audio_play', () => {
    console.log('🔊 Audio playback starting...');
  });

  try {
    await client.connect();
    console.log(`\n📟 Device ID: ${client.deviceId}`);
    console.log('\n📋 Available commands:');
    console.log('  [1] Send test audio (2s sine wave)');
    console.log('  [2] Send status update');
    console.log('  [3] Simulate wake word');
    console.log('  [q] Quit\n');

    await interactiveMode(client);
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

async function interactiveMode(client: MockESP32Client): Promise<void> {
  const readline = await import('readline');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (): void => {
    rl.question('\n> ', async (answer) => {
      const cmd = answer.trim().toLowerCase();

      try {
        switch (cmd) {
          case '1':
          case 'audio':
            console.log('🎤 Recording simulation (2s)...');
            await client.streamTestAudio(2000);
            console.log('✅ Audio sent, waiting for response...');
            break;

          case '2':
          case 'status':
            client.sendStatus('idle');
            console.log('📊 Status sent');
            break;

          case '3':
          case 'wake':
            console.log('🗣️ Simulating wake word detection...');
            await client.streamTestAudio(1000);
            break;

          case 'q':
          case 'quit':
          case 'exit':
            console.log('👋 Disconnecting...');
            client.disconnect();
            rl.close();
            process.exit(0);
            break;

          case 'h':
          case 'help':
            console.log('\n📋 Commands:');
            console.log('  1, audio - Send test audio');
            console.log('  2, status - Send status');
            console.log('  3, wake - Simulate wake word');
            console.log('  q, quit - Exit');
            break;

          case '':
            break;

          default:
            console.log('❓ Unknown command. Type "h" for help.');
        }
      } catch (error) {
        console.error('❌ Command failed:', error);
      }

      prompt();
    });
  };

  prompt();
}

main().catch(console.error);
