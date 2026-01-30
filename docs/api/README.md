# API Documentation

## Overview

UE-Bot exposes APIs through two main services:

1. **Webapp API** - Next.js API routes for web frontend
2. **Bridge API** - Express API for ESP32 and external integrations

## Quick Links

- [Webapp API](./webapp-api.md) - Web frontend API
- [Bridge API](./bridge-api.md) - Bridge service REST API
- [WebSocket Protocol](./websocket-protocol.md) - Real-time communication

## Base URLs

| Service | Development               | Production                 |
| ------- | ------------------------- | -------------------------- |
| Webapp  | http://localhost:3000/api | https://yourdomain.com/api |
| Bridge  | http://localhost:8080     | https://api.yourdomain.com |

## Authentication

### JWT Token

Most endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Device Token

ESP32 devices use device tokens:

```
X-Device-Token: <device_token>
```

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Rate Limiting

| Endpoint Type | Rate Limit  |
| ------------- | ----------- |
| Public        | 60 req/min  |
| Authenticated | 300 req/min |
| WebSocket     | 100 msg/sec |

## Error Codes

| Code             | Description             |
| ---------------- | ----------------------- |
| AUTH_REQUIRED    | Authentication required |
| AUTH_INVALID     | Invalid token           |
| RATE_LIMITED     | Too many requests       |
| NOT_FOUND        | Resource not found      |
| VALIDATION_ERROR | Invalid input           |
| INTERNAL_ERROR   | Server error            |
