#!/bin/bash
# Test Shipment CRUD API
echo "Running Shipment CRUD Tests..."
npx jest src/app/api/orders/\\[id\\]/shipments/route.test.ts --verbose
