#!/bin/bash
# Setup NVIDIA Container Toolkit for Ollama GPU support

set -e

echo "=== Installing NVIDIA Container Toolkit ==="

# Detect distribution
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
echo "Detected distribution: $distribution"

# Add NVIDIA Container Toolkit repository
echo "Adding NVIDIA repository..."
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

# Use generic DEB repository for Ubuntu 24.04
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Update package list
echo "Updating package list..."
sudo apt-get update

# Install NVIDIA Container Toolkit
echo "Installing nvidia-container-toolkit..."
sudo apt-get install -y nvidia-container-toolkit

# Configure Docker to use NVIDIA runtime
echo "Configuring Docker..."
sudo nvidia-ctk runtime configure --runtime=docker

# Restart Docker
echo "Restarting Docker..."
sudo systemctl restart docker || sudo service docker restart

# Stop and remove existing Ollama container
echo "Removing old Ollama container..."
docker stop ollama 2>/dev/null || true
docker rm ollama 2>/dev/null || true

# Start Ollama with GPU support
echo "Starting Ollama with GPU support..."
docker run -d --gpus all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# Wait for Ollama to start
echo "Waiting for Ollama to start..."
sleep 5

# Test GPU access
echo ""
echo "=== Testing GPU Access ==="
docker exec ollama nvidia-smi || echo "Warning: nvidia-smi not available in container"

# Verify Ollama is running
echo ""
echo "=== Verifying Ollama ==="
curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | head -3

echo ""
echo "✓ Setup complete! Ollama should now use your GPU."
echo "GPU usage will appear when running inference."
