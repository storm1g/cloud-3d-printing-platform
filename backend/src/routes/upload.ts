import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { simulateSlicing } from "../utils/simulateSlicing";

const router = express.Router();

// 📁 Folder za privremeno čuvanje fajlova
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = path.resolve(req.file.path);

    console.log(`📦 Received file: ${req.file.originalname}`);

    // ⏳ Simuliramo slicing proces
    const result = await simulateSlicing(req.file.originalname);

    // 🧹 Brišemo privremeni fajl
    fs.unlinkSync(filePath);

    res.json({
      status: "success",
      file: req.file.originalname,
      result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error processing file" });
  }
});

export default router;
