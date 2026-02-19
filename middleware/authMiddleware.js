const jwt = require('jsonwebtoken');
const { Users, Mahasiswa } = require('../models');

const SECRET = "SECRET_KEY_KAMU";

module.exports = async (req, res, next) => {
  try {
    // =========================
    // 1. Ambil Authorization Header
    // =========================
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({
        message: "Token tidak ditemukan"
      });
    }

    // =========================
    // 2. Ambil Token (Bearer xxx)
    // =========================
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        message: "Format token salah"
      });
    }

    const token = parts[1];
    if (!token) {
      return res.status(401).json({
        message: "Token tidak valid"
      });
    }

    // =========================
    // 3. Verify JWT
    // =========================
    const decoded = jwt.verify(token, SECRET);

    // =========================
    // 4. Cek Role dan Ambil Data
    // =========================
    if (decoded.role === "dosen") {

      const user = await Users.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(401).json({
          message: "User tidak ditemukan"
        });
      }

      req.user = {
        id: user.id_user,
        role: "dosen",
        name: user.name,
        email: user.email
      };

    } else if (decoded.role === "mahasiswa") {

      const mahasiswa = await Mahasiswa.findByPk(decoded.id);

      if (!mahasiswa) {
        return res.status(401).json({
          message: "Mahasiswa tidak ditemukan"
        });
      }

      req.user = {
        id: mahasiswa.id_mahasiswa,
        role: "mahasiswa",
        nim: mahasiswa.nim,
        nama: mahasiswa.nama_mahasiswa
      };

    } else {
      return res.status(401).json({
        message: "Role tidak dikenali"
      });
    }

    // =========================
    // 5. Lanjut ke Route
    // =========================
    next();

  } catch (err) {
    return res.status(403).json({
      message: "Token tidak valid atau kadaluarsa",
      error: err.message
    });
  }
};
