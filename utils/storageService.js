const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "local";

exports.deleteFile = async (filePathOrUrl) => {
  if (!filePathOrUrl) return;

  try {

    if (STORAGE_PROVIDER === "cloudinary") {

      const parts = filePathOrUrl.split("/");
      const fileName = parts[parts.length - 1]; // namafile.jpg
      const folder = parts[parts.length - 2];   // absensi

      const publicIdWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));

      const public_id = `${folder}/${publicIdWithoutExt}`;

      await cloudinary.uploader.destroy(public_id);

      return;
    }

    // ==============================
    // LOCAL STORAGE
    // ==============================
    if (STORAGE_PROVIDER === "local") {
      const fullPath = path.join(__dirname, "..", filePathOrUrl);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      return;
    }

  } catch (err) {
    console.error("Error delete file:", err.message);
  }
};