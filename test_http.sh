#!/bin/bash

# Test script for HTTP communication between services
# This script tests the trip preview endpoint

echo "Testing HTTP communication..."

# Test trip preview
echo "Testing trip preview..."
curl -X POST http://localhost:8081/trip/preview \
  -H "Content-Type: application/json" \
  -d '{
    "userID": "test-user-123",
    "pickup": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "destination": {
      "latitude": 37.7849,
      "longitude": -122.4094
    }
  }' \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "Test completed."