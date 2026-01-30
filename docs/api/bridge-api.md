# Bridge Service API

## Base URL

- Development: `http://localhost:8080`
- Production: `https://api.yourdomain.com`

## Endpoints

### Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### Chat

```http
POST /api/chat
Content-Type: application/json
Authorization: Bearer <token>
```

**Request:**

```json
{
  "message": "Hello, how are you?",
  "sessionId": "optional-session-id"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "response": "I'm doing well, thank you!",
    "sessionId": "session-123"
  }
}
```

### Device Registration

```http
POST /api/devices/register
Content-Type: application/json
Authorization: Bearer <token>
```

**Request:**

```json
{
  "deviceId": "esp32-001",
  "name": "Living Room Speaker",
  "firmwareVersion": "0.1.0"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deviceToken": "device-token-xxx",
    "expiresAt": "2024-12-31T23:59:59.000Z"
  }
}
```

### Device Status

```http
GET /api/devices/:deviceId
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deviceId": "esp32-001",
    "name": "Living Room Speaker",
    "status": "online",
    "lastSeen": "2024-01-01T00:00:00.000Z",
    "firmwareVersion": "0.1.0",
    "wifiStrength": -45
  }
}
```

### List Devices

```http
GET /api/devices
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "deviceId": "esp32-001",
        "name": "Living Room Speaker",
        "status": "online"
      }
    ]
  }
}
```

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {
        "field": "message",
        "error": "Required"
      }
    ]
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required"
  }
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Device not found"
  }
}
```

### 429 Rate Limited

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

### 500 Internal Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```
