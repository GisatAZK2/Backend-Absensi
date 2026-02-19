# Gunakan image Node.js resmi
FROM node:20-alpine

# Install tzdata untuk timezone
RUN apk add --no-cache tzdata

# Set timezone ke WIB (Asia/Jakarta)
ENV TZ=Asia/Jakarta

# Set working directory di container
WORKDIR /app

# Salin package.json dan package-lock.json dulu (untuk caching layer npm install)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Salin semua source code ke container
COPY . .

# Set environment variable (Railway biasanya pakai .env)
ENV NODE_ENV=production

# Expose port sesuai app
EXPOSE 3000

# Jalankan migration lalu start server
CMD npx sequelize db:migrate && node index.js
