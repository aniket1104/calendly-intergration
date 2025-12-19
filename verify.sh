#!/bin/bash

SESSION_ID="test-session-$(date +%s)"
API_URL="http://localhost:3000/chat"

echo "Starting verification for Session: $SESSION_ID"

function send_msg() {
  echo "User: $1"
  RESPONSE=$(curl -s -X POST $API_URL -H "Content-Type: application/json" -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"$1\"}")
  echo "Agent: $(echo $RESPONSE | jq -r '.response')"
  echo "------------------------------------------------"
}

# 1. Init
send_msg "Hi"

# 2. Reason
send_msg "I need a general consultation"

# 3. Date
send_msg "Tomorrow morning"

# 4. Slot Selection
send_msg "1"

# 5. Name
send_msg "John Doe"

# 6. Email
send_msg "john@example.com"

# 7. Confirmation
send_msg "Yes, please book it"
