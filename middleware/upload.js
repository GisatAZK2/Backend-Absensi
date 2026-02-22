const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("../config/cloudinary");
require("dotenv").config();

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "local";

// ============================
// HELPER: Ensure Directory Exists
// ============================
const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// ============================
// LOCAL STORAGE
// ============================
const localUploadPath = path.join(__dirname, "../uploads");

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDirExists(localUploadPath);
    cb(null, localUploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const uploadLocal = multer({ storage: localStorage });

// ============================
// CLOUDINARY STORAGE (TEMP)
// ============================
const tempUploadPath = path.join(__dirname, "../temp");

const uploadCloudinary = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      ensureDirExists(tempUploadPath);
      cb(null, tempUploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + "-" + file.originalname;
      cb(null, uniqueName);
    }
  })
});

// ============================
// MAIN MIDDLEWARE
// ============================
const uploadMiddleware = (fieldName) => {
  return async (req, res, next) => {
    const uploader =
      STORAGE_PROVIDER === "cloudinary"
        ? uploadCloudinary.single(fieldName)
        : uploadLocal.single(fieldName);

    uploader(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      try {
        // ============================
        // CLOUDINARY FLOW
        // ============================
        if (req.file && STORAGE_PROVIDER === "cloudinary") {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "absensi"
          });

          // hapus file temp
          fs.unlinkSync(req.file.path);

          req.file.url = result.secure_url;
          req.file.public_id = result.public_id;
        }

        // ============================
        // LOCAL FLOW
        // ============================
        if (req.file && STORAGE_PROVIDER === "local") {
          req.file.url = `/uploads/${req.file.filename}`;
        }

        next();
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    });
  };
};

module.exports = uploadMiddleware;