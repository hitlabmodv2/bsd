
#!/bin/bash
set -e

# Create necessary directories
mkdir -p sesi DATA temp database attached_assets

# Set permissions
chmod 755 sesi DATA temp database attached_assets

# Start the bot
exec node index.js
