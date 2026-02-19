require("./cron/autoAlpha");

const db = require('./models');
const express = require('express');
const cors = require('cors');
const path = require("path");
const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*', // untuk development, boleh semua origin
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json());

const apiRoutes = require('./routes/api');


app.use('/api', apiRoutes);


db.sequelize.sync().then(() => {
  console.log("Database connected...");
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});



