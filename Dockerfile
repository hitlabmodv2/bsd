
FROM node:21-bullseye

# Install system dependencies including FFmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    libffi-dev \
    libssl-dev \
    ffmpeg \
    imagemagick \
    webp \
    git \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Configure ImageMagick policy for better compatibility
RUN sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy source code
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p sesi DATA temp database attached_assets && \
    chmod 755 sesi DATA temp database attached_assets

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Asia/Jakarta

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Bot is running')" || exit 1

# Start the bot
CMD ["node", "index.js"]
