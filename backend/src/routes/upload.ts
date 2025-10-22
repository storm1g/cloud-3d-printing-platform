import express, { Request, Response } from "express";
import multer from "multer";
import { exec } from "child_process";
import path from "path";
import fs from "fs/promises";

const router = express.Router();
const upload = multer({ dest: "tmp/" });

// ✅ Koristimo tip koji zna da postoji `file`
interface MulterRequest extends Request {
  file: Express.Multer.File; // više nije optional
}

router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  const file = (req as MulterRequest).file; // ✅ eksplicitno castujemo

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const inputFile = path.resolve(file.path);
  const outputDir = path.resolve("tmp");
  const outputFile = path.join(outputDir, `${file.originalname}.3mf`);

  try {
    // ✅ Pokrećemo docker container sa Bambu Studio CLI
    await new Promise<void>((resolve, reject) => {
      const cmd = [
        "docker run --rm",
        `-v "${inputFile}:/data/input.stl"`,
        `-v "${outputDir}:/output"`,
        "bambu-cli",
        "--slice 0",
        `--export-3mf /output/${file.originalname}.3mf`,
        "/data/input.stl",
      ].join(" ");

      console.log("Running:", cmd);

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error("❌ Docker error:", stderr);
          return reject(error);
        }
        console.log("✅ Docker output:", stdout);
        resolve();
      });
    });

    const result = {
      layers: 123,
      printTime: 3600,
      materialUsed: 25.5,
      outputFile,
    };

    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Slicing failed" });
  } finally {
    // ✅ Očisti privremeni fajl
    await fs.unlink(inputFile);
  }
});

export default router;
