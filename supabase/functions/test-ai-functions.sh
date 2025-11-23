#!/bin/bash

# Test script for AI Emergency Functions
# Usage: ./test-ai-functions.sh

set -e

echo "🧪 Testing AI Emergency Functions"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test an endpoint
test_endpoint() {
    local name=$1
    local data=$2
    local function=$3
    
    echo -e "${YELLOW}Testing: $name${NC}"
    
    if supabase functions invoke $function --data "$data" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI not found${NC}"
    echo "Install with: npm install -g supabase"
    exit 1
fi

echo "1. Testing AI Emergency Function"
echo "---------------------------------"

# Test 1: Activate Emergency
test_endpoint \
    "Activate Emergency Assistance" \
    '{"caseId":"test-123","action":"activate"}' \
    "ai-emergency"

# Test 2: Find Facilities
test_endpoint \
    "Find Facilities" \
    '{"caseId":"test-123","action":"find_facilities","location":{"latitude":28.6139,"longitude":77.2090},"animalType":"dog"}' \
    "ai-emergency"

# Test 3: Emergency Instructions
test_endpoint \
    "Get Emergency Instructions" \
    '{"caseId":"test-123","action":"emergency_instructions","animalType":"dog","condition":"injured leg","photos":[]}' \
    "ai-emergency"

# Test 4: Analyze Photos
test_endpoint \
    "Analyze Photos" \
    '{"action":"analyze_photos","photos":["https://example.com/photo.jpg"],"animalType":"dog"}' \
    "ai-emergency"

# Test 5: Transportation Options
test_endpoint \
    "Get Transportation Options" \
    '{"action":"transportation_options","origin":{"latitude":28.6139,"longitude":77.2090},"destination":{"latitude":28.6200,"longitude":77.2150}}' \
    "ai-emergency"

echo "2. Testing AI Chat Function"
echo "---------------------------"

# Test 6: AI Chat
test_endpoint \
    "AI Chat Message" \
    '{"caseId":"test-123","message":"How should I help this injured dog?","chatHistory":[]}' \
    "ai-chat"

# Test 7: AI Chat with History
test_endpoint \
    "AI Chat with History" \
    '{"caseId":"test-123","message":"What about transportation?","chatHistory":[{"role":"user","content":"I found an injured dog","timestamp":"2024-01-01T10:00:00Z"},{"role":"assistant","content":"I can help you","timestamp":"2024-01-01T10:00:05Z"}]}' \
    "ai-chat"

# Summary
echo "=================================="
echo "Test Summary"
echo "=================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo "Check function logs with:"
    echo "  supabase functions logs ai-emergency"
    echo "  supabase functions logs ai-chat"
    exit 1
fi
