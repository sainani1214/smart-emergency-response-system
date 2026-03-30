#!/bin/bash

# Pre-deployment verification script
echo "🔍 Verifying deployment readiness..."

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in backend directory"
    exit 1
fi

# Check for required files
echo "📁 Checking required files..."
if [ ! -f "tsconfig.json" ]; then
    echo "❌ tsconfig.json not found"
    exit 1
fi
echo "✅ tsconfig.json found"

if [ ! -f "src/server.ts" ]; then
    echo "❌ src/server.ts not found"
    exit 1
fi
echo "✅ src/server.ts found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --quiet

# Run TypeScript build
echo "🔨 Building TypeScript..."
npm run build

# Check if dist/server.js was created
if [ ! -f "dist/server.js" ]; then
    echo "❌ Build failed: dist/server.js not created"
    exit 1
fi
echo "✅ Build successful: dist/server.js created"

# Check dist folder size
DIST_SIZE=$(du -sh dist | cut -f1)
echo "📦 Dist folder size: $DIST_SIZE"

# Verify required environment variables format
echo "🔐 Checking .env.example..."
if [ ! -f ".env.example" ]; then
    echo "⚠️  Warning: .env.example not found"
else
    echo "✅ .env.example found"
    echo "   Required env vars:"
    grep -E "^[A-Z_]+" .env.example | cut -d'=' -f1 | while read var; do
        echo "   - $var"
    done
fi

echo ""
echo "✅ Pre-deployment verification complete!"
echo ""
echo "📋 Next steps for Render deployment:"
echo "   1. Ensure MongoDB URI is set in Render environment variables"
echo "   2. Set NODE_ENV=production"
echo "   3. Configure build command: npm install && npm run build"
echo "   4. Configure start command: npm start"
echo ""
echo "🚀 Ready for deployment!"
