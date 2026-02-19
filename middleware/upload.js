const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

exports.uploadFotoMahasiswa = async (req, res) => {
  try {
    const { id } = req.params;

    await Mahasiswa.update(
      { profile_path: req.file.filename },
      { where: { id_mahasiswa: id } }
    );

    res.json({ message: "Foto berhasil diupload" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = multer({ storage });

