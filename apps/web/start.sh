#!/bin/sh
set -e

echo "🚀 Starting Reflet Zero..."
echo "📋 Environment:"
echo "   NODE_ENV: ${NODE_ENV:-development}"
echo "   PORT: ${PORT:-3000}"

# Inject runtime environment variables into the built frontend
# Vite bakes VITE_PUBLIC_* at build time, but we need them at runtime
# This replaces placeholder values in the JS bundle with actual env values
echo "🔧 Injecting runtime environment variables..."

if [ -n "$VITE_PUBLIC_ZERO_SERVER" ]; then
  echo "   VITE_PUBLIC_ZERO_SERVER: $VITE_PUBLIC_ZERO_SERVER"
  
  # Find and replace in all JS files
  find /app/dist -name '*.js' -type f | while read file; do
    # Replace placeholder URL with actual value
    sed -i "s|__VITE_PUBLIC_ZERO_SERVER__|$VITE_PUBLIC_ZERO_SERVER|g" "$file"
  done
  echo "✅ Environment variables injected!"
else
  echo "⚠️ VITE_PUBLIC_ZERO_SERVER not set"
  echo "   Zero sync will not work"
fi

# Start the server (migrations are handled by zero-cache or backend)
echo "✅ Starting web server on port ${PORT:-3000}..."
exec bun run server.ts
