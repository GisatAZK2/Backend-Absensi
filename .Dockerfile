# Gunakan image Node.js resmi
FROM node:20-alpine

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

# Command untuk menjalankan aplikasi
CMD ["node", "index.js"]