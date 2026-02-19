const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const libur = require('../controllers/V1/hari_liburController');
const generate = require('../controllers/V1/generate_absensi_Controller');

// Import controller langsung
const authController = require('../controllers/V1/authController');
const absensiController = require('../controllers/V1/absensiController');
const checkAbsenTime = require('../middleware/checkAbsenTime');
const authMiddleware = require('../middleware/authMiddleware');

const generateAbsensiExcel = require('../utils/generateAbsensiExcel');

// ======================
// AUTH
// ======================
router.post('/v1/auth/login-dosen', authController.loginDosen);
router.post('/v1/auth/login-mahasiswa', authController.loginMahasiswa);

router.get('/v1/profile', authMiddleware, authController.getProfile);
router.get('/v1/history', authMiddleware, absensiController.getHistoryMahasiswa);
router.get('/v1/sesi-absensi', authMiddleware, absensiController.getSesiAbsensi);
router.get('/v1/absensi-hari-ini', authMiddleware, absensiController.getAbsensiHariIni);
router.get('/v1/flags-done-absen', authMiddleware, absensiController.getFlagsAbsen);
router.get('/v1/status-options', authMiddleware, absensiController.getStatusOptions);

router.post(
  '/v1/absensi',
  authMiddleware,
  checkAbsenTime,
  upload.single('bukti_foto'),
  absensiController.absenMahasiswa
);


router.put(
  "/v1/edit-absensi",
  authMiddleware,
  upload.single("bukti_foto"), // optional file
  absensiController.editAbsensiMahasiswa
);

// =======================
// GET ALL ABSENSI
// =======================
router.get(
  '/absensi',
  authMiddleware,
  absensiController.getAllAbsensi
);

// =======================
// GET ABSENSI BY MAHASISWA
// =======================
router.get(
  '/absensi/mahasiswa/:id',
  authMiddleware,
  absensiController.getAbsensiByMahasiswa
);

// =======================
// DELETE ABSENSI
// =======================
router.delete(
  '/absensi/:id',
  authMiddleware,
  absensiController.deleteAbsensi
);

// Router For Admin Generate Absensi
router.post('/v1/admin/generate-absensi', authMiddleware,generate.generateWithLibur);
router.post('/v1/admin/generate-excel-absensi', generateAbsensiExcel.generateAbsensiExcel);

module.exports = router;
