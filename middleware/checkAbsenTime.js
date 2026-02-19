// middleware/checkAbsenTime.js
const START_TIME = 6;

module.exports = (req, res, next) => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour + (minute / 60);

  if (currentTime < START_TIME) {
    return res.status(403).json({
      message: "Belum bisa absen, jam absensi baru dibuka pukul 06:00"
    });
  }

  next(); // lanjut ke Multer & controller
};
