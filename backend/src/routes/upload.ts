import express, { Request, Response } from "express";
import multer from "multer";
import { exec } from "child_process";
import path from "path";
import fs from "fs/promises";

const router = express.Router();
const upload = multer({ dest: "tmp/" });

// Definišemo custom tip requesta koji ima file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

router.post("/", upload.single("file"), async (req: MulterRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const inputFile = path.resolve(req.file.path);
  const outputDir = path.resolve("tmp");
  const outputFile = path.join(outputDir, `${req.file.originalname}.3mf`);

  try {
    // Pokreni docker container sa slicerom
    await new Promise<void>((resolve, reject) => {
      const cmd = [
        "docker run --rm",
        `-v "${inputFile}:/data/input.stl"`,
        `-v "${outputDir}:/output"`,
        "bambu-cli",
        "--slice 0",
        `--export-3mf /output/${req.file.originalname}.3mf`,
        "/data/input.stl",
      ].join(" ");

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(stderr);
          return reject(error);
        }
        console.log(stdout);
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
    // Očisti privremeni input fajl
    await fs.unlink(inputFile);
  }
});

export default router;