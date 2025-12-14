#!/bin/bash

# Auto-run benchmark when deepseek-r1:1.5b finishes downloading

echo "Waiting for deepseek-r1:1.5b download to complete..."

# Wait for model to be available
while true; do
    if docker exec timbaos-ollama ollama list | grep -q "deepseek-r1:1.5b"; then
        echo "✓ Model downloaded!"
        break
    fi
    sleep 10
done

echo ""
echo "Starting benchmark: qwen2.5:3b vs qwen3:8b vs deepseek-r1:1.5b"
echo ""

cd /home/monty/timbaos
node benchmark-model.js qwen2.5:3b qwen3:8b deepseek-r1:1.5b
