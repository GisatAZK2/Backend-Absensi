const db = require('../../models');
const { sequelize, Absensi, Absensi_Detail, Mahasiswa } = db;
const { getDistance } = require('geolib');
const { Transaction } = require('sequelize');
const cloudinary = require("../../config/cloudinary");
const fs = require("fs");


const VALID_LOCATIONS = [
  { lat: -6.288926, lng: 107.082678 },
  { lat: -6.288821, lng: 107.082769 },
  { lat: -6.289092, lng: 107.083029 }
];

const MAX_RADIUS = 100; 


const PAGI_START = 6;
const PAGI_END = 8.5;

const MALAM_START = 18;
const MALAM_END = 21;

const getCurrentHour = () => {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
};


function isLocationValid(lat, lng) {
  return VALID_LOCATIONS.some(location => {
    const distance = getDistance(
      { latitude: lat, longitude: lng },
      { latitude: location.lat, longitude: location.lng }
    );
    return distance <= MAX_RADIUS;
  });
}


function isSesiAktif(sesi) {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();

  if (sesi === "Pagi") {
    const start = 6 * 60;     
    const end = 8.5 * 60;       
    return totalMinutes >= start && totalMinutes <= end;
  }

  if (sesi === "Malam") {
    const start = 18 * 60;    
    const end = 21 * 60;      
    return totalMinutes >= start && totalMinutes <= end;
  }

  return false;
}


function getAllowedStatus(sesi) {
  const onTime = isSesiAktif(sesi);

  if (onTime) {
    return {
      on_time: true,
      allowed: ["Hadir", "Izin", "Sakit"]
    };
  }

  return {
    on_time: false,
    allowed: ["Alpa"]
  };
}

exports.absenMahasiswa = async (req, res) => {
  const t = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  let uploadedImage = null;

  try {
    const id_mahasiswa = req.user.id;
    const { latitude, longitude, id_absensi, status, jam, keterangan } = req.body;

    if (!id_absensi || !jam) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "ID Absensi dan Jam wajib diisi"
      });
    }

    // ==============================
    // LOCK MAHASISWA
    // ==============================
    const mahasiswa = await Mahasiswa.findByPk(id_mahasiswa, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!mahasiswa) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Mahasiswa tidak ditemukan"
      });
    }

    const sesiMahasiswa = mahasiswa.sesi.toLowerCase();

    // ==============================
    // LOCK ABSENSI
    // ==============================
    const absensi = await Absensi.findByPk(id_absensi, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!absensi) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Data absensi tidak ditemukan"
      });
    }

    // ==============================
    // CEK SUDAH ABSEN (LOCKED)
    // ==============================
    const sudahAbsen = await Absensi_Detail.findOne({
      where: { id_absensi, id_mahasiswa },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (sudahAbsen) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Anda sudah melakukan absensi"
      });
    }

    // ==============================
    // VALIDASI SESI DI TIPE ABSENSI
    // ==============================
    let tipe_absensi = [];

    if (typeof absensi.tipe_absensi === "string") {
      try {
        tipe_absensi = JSON.parse(absensi.tipe_absensi);
      } catch {
        tipe_absensi = absensi.tipe_absensi.split(",");
      }
    } else if (Array.isArray(absensi.tipe_absensi)) {
      tipe_absensi = absensi.tipe_absensi;
    }

    if (!tipe_absensi.includes(sesiMahasiswa)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Sesi ${sesiMahasiswa} tidak tersedia`
      });
    }

    // ==============================
    // VALIDASI JAM SESUAI SESI
    // ==============================
    const currentHour = getCurrentHour();

    let startHour, endHour;

    if (sesiMahasiswa === "pagi") {
      startHour = PAGI_START;
      endHour = PAGI_END;
    } else {
      startHour = MALAM_START;
      endHour = MALAM_END;
    }

    const isWithinTime = currentHour >= startHour && currentHour <= endHour;

    let finalStatus = "Alpa";

    // ==============================
    // VALIDASI STATUS HADIR
    // ==============================
    if (status === "Hadir") {

      if (!isWithinTime) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Di luar jam absensi sesi anda"
        });
      }

      // WAJIB LOKASI UNTUK PAGI
      if (sesiMahasiswa === "pagi") {

        if (!latitude || !longitude) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: "Lokasi wajib diisi untuk sesi pagi"
          });
        }

        const valid = isLocationValid(
          parseFloat(latitude),
          parseFloat(longitude)
        );

        if (!valid) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: "Anda berada di luar area absensi"
          });
        }
      }

      finalStatus = "Hadir";
    }

    // ==============================
    // VALIDASI IZIN / SAKIT
    // ==============================
    if (status === "Izin" || status === "Sakit") {

      if (!keterangan) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Keterangan wajib diisi"
        });
      }

      finalStatus = status;
    }

    // ==============================
    // UPLOAD GAMBAR (SETELAH VALIDASI LOLOS)
    // ==============================
    let url_gambar = null;

    if (req.file) {
      uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "absensi",
      });

      url_gambar = uploadedImage.secure_url;

      fs.unlinkSync(req.file.path);
    }

    // ==============================
    // INSERT DETAIL (ANTI RACE)
    // ==============================
    const detail = await Absensi_Detail.create({
      id_absensi,
      id_mahasiswa,
      nama_snapshot: mahasiswa.nama_mahasiswa,
      nim_snapshot: mahasiswa.nim,
      bukti_foto: url_gambar,
      jam,
      latitude: latitude || null,
      longitude: longitude || null,
      status: finalStatus,
      keterangan: (status === "Izin" || status === "Sakit") ? keterangan : null
    }, { transaction: t });

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Absensi berhasil",
      data: detail
    });

  } catch (err) {

    await t.rollback();

    // Jika insert gagal, hapus gambar yang sudah terupload
    if (uploadedImage) {
      await cloudinary.uploader.destroy(uploadedImage.public_id);
    }

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Anda sudah melakukan absensi"
      });
    }

    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: err.message
    });
  }
};

exports.editAbsensiMahasiswa = async (req, res) => {
  const t = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  let uploadedImage = null;

  try {
    const id_mahasiswa = req.user.id;
    const { id_detail, keterangan } = req.body;

    if (!id_detail) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "ID Detail wajib diisi"
      });
    }

    // ==============================
    // LOCK DETAIL ABSENSI
    // ==============================
      const detail = await Absensi_Detail.findOne({
      where: { 
        id_detail: id_detail,
        id_mahasiswa: id_mahasiswa
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });


    if (!detail) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Data absensi tidak ditemukan"
      });
    }

    // ==============================
    // STATUS ALPA TIDAK BOLEH EDIT
    // ==============================
    if (detail.status === "Alpa") {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Status Alpa tidak dapat diedit"
      });
    }

    // ==============================
    // VALIDASI KETERANGAN
    // ==============================
    if (
      (detail.status === "Izin" || detail.status === "Sakit") &&
      !keterangan
    ) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Keterangan wajib diisi"
      });
    }

    let newImageUrl = detail.bukti_foto;

    // ==============================
    // JIKA ADA FILE BARU → REPLACE
    // ==============================
    if (req.file) {

      // Upload gambar baru dulu
      uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "absensi",
      });

      fs.unlinkSync(req.file.path);

      // Hapus gambar lama jika ada
      if (detail.bukti_foto) {
        const publicId = detail.bukti_foto
          .split("/")
          .slice(-2)
          .join("/")
          .split(".")[0];

        await cloudinary.uploader.destroy(publicId);
      }

      newImageUrl = uploadedImage.secure_url;
    }

    // ==============================
    // UPDATE DATA
    // ==============================
    detail.bukti_foto = newImageUrl;
    detail.keterangan =
      detail.status === "Izin" || detail.status === "Sakit"
        ? keterangan
        : null;

    await detail.save({ transaction: t });

    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Absensi berhasil diperbarui",
      data: detail
    });

  } catch (err) {

    await t.rollback();

    // Jika upload sudah terjadi tapi gagal update DB
    if (uploadedImage) {
      await cloudinary.uploader.destroy(uploadedImage.public_id);
    }

    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: err.message
    });
  }
};


exports.getStatusOptions = async (req, res) => {
  try {
    const userId = req.user.id;

    const mahasiswa = await db.Mahasiswa.findByPk(userId);
    if (!mahasiswa) {
      return res.status(404).json({
        success: false,
        message: "Mahasiswa tidak ditemukan"
      });
    }

    const result = getAllowedStatus(mahasiswa.sesi);

    return res.json({
      sesi: mahasiswa.sesi,
      on_time: result.on_time,
      status_options: result.allowed
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


exports.getHistoryMahasiswa = async (req, res) => {
  try {
    const id_mahasiswa = req.user.id;

    const data = await db.Absensi_Detail.findAll({
      where: { id_mahasiswa },
      include: [
        {
          model: db.Absensi,
          attributes: ['tanggal_absensi']
        },
        {
          model: db.Mahasiswa,
          attributes: ['Sesi'] // atau 'sesi' sesuaikan nama kolom
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSesiAbsensi = async (req, res) => {
  try {
    const sesi = await Absensi.findAll({
      where: {
        is_deleted: false
      },
      attributes: [
        "id_absensi",
        "tanggal_absensi",
        'tipe_absensi'
      ],
      order: [["tanggal_absensi", "DESC"]]
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil sesi absensi",
      data: sesi
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message
    });
  }
};

exports.getAbsensiHariIni = async (req, res) => {
  try {
    const { kelas, sesi } = req.query;

    const today = new Date().toISOString().split("T")[0];

    const mahasiswaWhere = {};
    if (kelas) mahasiswaWhere.kelas = kelas;
    if (sesi) mahasiswaWhere.sesi = sesi.toLowerCase();

    const allMahasiswa = await db.Mahasiswa.findAll({
      where: mahasiswaWhere,
      attributes: ["id_mahasiswa", "nama_mahasiswa", "nim", "kelas", "sesi"],
      order: [["nama_mahasiswa", "ASC"]],
    });

    const absensiHariIni = await db.Absensi.findOne({
      where: { tanggal_absensi: today },
      include: [
        {
          model: db.Absensi_Detail,
          as: "Absensi_Details",
          required: false,
        },
      ],
    });

    const absensiMap = new Map();
    if (absensiHariIni) {
      for (const detail of absensiHariIni.Absensi_Details || []) {
        const mhsId = detail.id_mahasiswa;
        absensiMap.set(mhsId, {
          status: detail.status,
          bukti_foto_url: detail.bukti_foto,
          jam: detail.jam,
          latitude: detail.latitude,
          longitude: detail.longitude,
        });
      }
    }

    // 4. Gabungkan semua mahasiswa + status
    const result = allMahasiswa.map((mhs) => {
      const data = absensiMap.get(mhs.id_mahasiswa) || {};
      return {
        id_mahasiswa: mhs.id_mahasiswa,
        nama: mhs.nama_mahasiswa,
        nim: mhs.nim,
        kelas: mhs.kelas,
        sesi: mhs.sesi,
        status: data.status || "Belum Absen",
        bukti_foto_url: data.bukti_foto_url || null,
        jam: data.jam || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      };
    });

    res.json({
      tanggal: today,
      absensi: result,
    });
  } catch (err) {
    console.error("[getAbsensiHariIni]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // asumsi dari middleware auth
    const mahasiswa = await db.Mahasiswa.findOne({
      where: { id_mahasiswa: userId },
      attributes: ['id_mahasiswa', 'nim', 'nama_mahasiswa', 'profile_path', 'kelas', 'sesi', 'createdAt', 'updatedAt']
    });

    if (!mahasiswa) {
      return res.status(404).json({ success: false, message: 'Mahasiswa tidak ditemukan' });
    }

    res.json({
      role: "mahasiswa",
      data: mahasiswa
    });
  } catch (err) {
    console.error("[getProfile]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFlagsAbsen = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const mahasiswa = await db.Mahasiswa.findByPk(userId);
    if (!mahasiswa) {
      return res.status(404).json({
        success: false,
        message: "Mahasiswa tidak ditemukan"
      });
    }

    const absensiHariIni = await db.Absensi.findOne({
      where: {
        tanggal_absensi: today,
        is_deleted: false
      }
    });

    let sudahAbsen = false;
    if (absensiHariIni) {
      const detailAbsen = await db.Absensi_Detail.findOne({
        where: {
          id_absensi: absensiHariIni.id_absensi,
          id_mahasiswa: userId
        }
      });
      sudahAbsen = !!detailAbsen;
    }

    const sesiAktif = isSesiAktif(mahasiswa.sesi);

    return res.json({
      role: "mahasiswa",
      sesi: mahasiswa.sesi,
      sudah_absen: sudahAbsen,
      sesi_aktif: sesiAktif
    });

  } catch (err) {
    console.error("[getFlagsDoneAbsen]", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.getAllAbsensi = async (req, res) => {
  try {
    const data = await db.Absensi_Detail.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getAbsensiByMahasiswa = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await db.Absensi_Detail.findAll({
      where: { id_mahasiswa: id },
      order: [['createdAt', 'DESC']]
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteAbsensi = async (req, res) => {
  try {
    const { id } = req.params;

    const detail = await db.Absensi_Detail.findByPk(id);

    if (!detail) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await detail.destroy();

    res.json({ message: "Absensi berhasil dihapus" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
