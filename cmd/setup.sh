#!/bin/bash

echo "🌲 Setting up Pine Environment..."

# Function to load NVM
load_nvm() {
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
}

# 1. Install NVM if not present
if [ -d "$HOME/.nvm" ]; then
  echo "✅ NVM already installed."
  load_nvm
else
  echo "⬇️ Installing NVM..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  load_nvm
fi

# 2. Install Node v20
echo "⬇️ Installing Node.js v20..."
nvm install 20
nvm use 20
nvm alias default 20

# 3. Install Dependencies
echo "📦 Installing project dependencies..."
npm install

# 4. Fix Permissions (just in case)
chmod +x node_modules/.bin/next

echo "-------------------------------------------"
echo "✅ Setup Complete!"
echo "PLEASE RESTART YOUR TERMINAL to ensure Node v20 is loaded."
echo "Then run: npm run dev"
echo "-------------------------------------------"
