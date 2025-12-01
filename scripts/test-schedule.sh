#!/bin/bash
set -e

echo "Running Schedule API Tests..."
npx jest src/app/api/orders/schedule/route.test.ts
