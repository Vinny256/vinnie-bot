# Use the official Node.js 20 image (Stable and fast)
FROM node:20-slim

# Install system dependencies
# git: for cloning plugins
# ffmpeg & imagemagick: for sticker and video processing
# curl: for health checks
RUN apt-get update && apt-get install -y \
    git \
    ffmpeg \
    imagemagick \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy package files first (to cache npm install)
COPY package*.json ./

# Install production dependencies only to keep the image small
RUN npm install --production

# Copy the rest of your bot code
COPY . .

# Expose port 3000 for Render/Heroku health checks
EXPOSE 3000

# Start the bot
CMD ["node", "index.js"]
