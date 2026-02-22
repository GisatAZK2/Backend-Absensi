require('dotenv').config();

// ======================
// DAYJS GLOBAL SETUP
// ======================
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

// Set default timezone ke Asia/Jakarta
dayjs.tz.setDefault('Asia/Jakarta');

// OPTIONAL: simpan ke global supaya bisa dipakai di semua file tanpa require ulang
global.dayjs = dayjs;

// ======================
// LOAD CRON (setelah dayjs siap)
// ======================
require("./cron/autoAlpha");

const db = require('./models');
const express = require('express');
const cors = require('cors');
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// MIDDLEWARE
// ======================
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json());

const apiRoutes = require('./routes/api');

app.use('/api', apiRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ======================
// START SERVER
// ======================
db.sequelize.sync().then(() => {
  console.log("Database connected...");
  console.log("Server Time (WIB):", dayjs().format('YYYY-MM-DD HH:mm:ss'));

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});