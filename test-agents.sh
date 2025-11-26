#!/bin/bash

echo "🌲 Testing Pine AI Agents..."
echo "============================="

echo "1. Triggering Sales Analyst Agent..."
curl -X POST http://localhost:3000/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{"agentType": "SALES_ANALYST"}'
echo -e "\n"

echo "2. Triggering Product Recommendation Agent..."
curl -X POST http://localhost:3000/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{"agentType": "PRODUCT_RECOMMENDER"}'
echo -e "\n"

echo "============================="
echo "✅ Tests triggered. Check the output above for results."
