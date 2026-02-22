const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const generate = require('../controllers/V1/generate_absensi_Controller');


const authController = require('../controllers/V1/authController');
const absensiController = require('../controllers/V1/absensiController');
const checkAbsenTime = require('../middleware/checkAbsenTime');
const authMiddleware = require('../middleware/authMiddleware');

const generateAbsensiExcel = require('../utils/generateAbsensiExcel');


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
  upload('bukti_foto'),
  absensiController.absenMahasiswa
);


router.put(
  "/v1/edit-absensi",
  authMiddleware,
  upload("bukti_foto"),
  absensiController.editAbsensiMahasiswa
);

// =======================
// GET ABSENSI BY MAHASISWA
// =======================
router.get(
  '/absensi/mahasiswa/:id',
  authMiddleware,
  absensiController.getAbsensiByMahasiswa
);


router.delete(
  '/absensi/:id',
  authMiddleware,
  absensiController.deleteAbsensi
);

// Router For Admin
router.post('/v1/auth/login-admin', authController.loginDosen);
router.get('/v1/admin/profile', authMiddleware, authController.getProfile);
router.post('/v1/admin/generate-absensi', authMiddleware,generate.generateWithLibur);
router.put('/v1/admin/update-absensi', authMiddleware,generate.updateAbsensiConfig);
router.get('/v1/admin/get-flag-absensi', authMiddleware,generate.getAbsensiRelationFlag);

router.get(
  '/v1/admin/all-absensi',
  authMiddleware,
  absensiController.getAbsensiSemuaHari
);

router.post('/v1/admin/generate-excel-absensi', generateAbsensiExcel.generateAbsensiExcel);

module.exports = router;
