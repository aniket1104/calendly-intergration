# Calendly Conversational Booking Agent

A Node.js based conversational agent that schedules medical appointments using Calendly APIs (simulated).

## Prerequisites
- Node.js installed
- `npm install` run to install dependencies

## Running the Server
The server runs on port 3000.

```bash
npm run dev
# OR
npm start
```

## Interacting with the Agent

### Option 1: Verification Script (CLI)
Run the included script to simulate a full conversation:
```bash
./verify.sh
```

### Option 2: HTTP Requests
You can send POST requests to `http://localhost:3000/chat`.

**Request Body:**
```json
{
  "sessionId": "unique-session-id",
  "message": "Hello"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-1", "message": "I need a consultation"}'
```

## Configuration
- **Mock Mode**: Enabled by default in `.env` (`MOCK_MODE=true`).
- **Real Calendly API**: Set `MOCK_MODE=false` and provide `CALENDLY_TOKEN` in `.env`.
