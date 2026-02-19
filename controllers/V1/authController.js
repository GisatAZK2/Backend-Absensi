const { Users, Mahasiswa } = require('../../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET = "SECRET_KEY_KAMU";

// =======================
// LOGIN DOSEN
// =======================
exports.loginDosen = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Users.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Password salah" });

    const token = jwt.sign(
      { id: user.id_user, role: "dosen" },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, user });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// =======================
// LOGIN MAHASISWA (NIM)
// =======================
exports.loginMahasiswa = async (req, res) => {
  try {
    const { nim } = req.body;

    const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
    if (!mahasiswa)
      return res.status(404).json({ message: "NIM tidak ditemukan" });

    const token = jwt.sign(
      { id: mahasiswa.id_mahasiswa, role: "mahasiswa" },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, mahasiswa });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// =======================
// GET PROFILE
// =======================
exports.getProfile = async (req, res) => {
  try {
    const { id, role } = req.user;

    if (role === "dosen") {
      const user = await Users.findByPk(id, {
        attributes: { exclude: ['password'] }
      });

      if (!user)
        return res.status(404).json({ message: "User tidak ditemukan" });

      return res.json({
        role,
        data: user
      });
    }

    if (role === "mahasiswa") {
      const mahasiswa = await Mahasiswa.findByPk(id);

      if (!mahasiswa)
        return res.status(404).json({ message: "Mahasiswa tidak ditemukan" });

      return res.json({
        role,
        data: mahasiswa
      });
    }

    return res.status(403).json({ message: "Role tidak dikenali" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
