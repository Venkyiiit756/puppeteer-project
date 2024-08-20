FROM node:16-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxdamage1 \
    libxcomposite1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libgbm1 \
    libasound2

# Work directory
WORKDIR /usr/src/app

# Copy package.json first to cache npm install
COPY package.json /usr/src/app/

# Install npm dependencies, including Puppeteer
RUN npm install

# Copy remaining files
COPY . .

# Start the application
CMD ["npm", "start"]
