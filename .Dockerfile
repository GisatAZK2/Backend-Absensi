# Gunakan image Node.js resmi
FROM node:20-alpine

# Install tzdata untuk timezone
RUN apk add --no-cache tzdata bash

# Set timezone ke WIB (Asia/Jakarta)
ENV TZ=Asia/Jakarta

# Set working directory di container
WORKDIR /app

# Salin package.json dan package-lock.json dulu
COPY package*.json ./

# Install dependencies + sequelize-cli global supaya bisa migrate
RUN npm install --production \
    && npm install -g sequelize-cli

# Salin semua source code ke container
COPY . .

# Set environment variable
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Jalankan migration lalu start server
CMD ["sh", "-c", "sequelize db:migrate && node index.js"]
