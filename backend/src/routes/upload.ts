import express, { Request, Response } from "express";
import multer from "multer";
import { exec } from "child_process";
import path from "path";

const router = express.Router();
const upload = multer({ dest: "/mnt/d/temp/test_data" }); // folder gde uploaduješ fajlove

// Koristimo tip koji garantuje da postoji `file`
interface MulterRequest extends Request {
  file: Express.Multer.File;
}

router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  const file = (req as MulterRequest).file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const inputDir = path.dirname(file.path); // folder gde su JSON + STL fajlovi
  const outputDir = "/mnt/d/temp/output";
  const runtimeDir = path.join(outputDir, "runtime"); // folder za XDG_RUNTIME_DIR
  const outputFile = path.join(outputDir, `${file.originalname}.3mf`);

  try {
    // Pokrećemo docker container sa Bambu Studio CLI
    await new Promise<void>((resolve, reject) => {
      const cmd = [
        "docker run --rm",
        `-v "${inputDir}:/data"`,
        `-v "${outputDir}:/output"`,
        `-v "${runtimeDir}:${runtimeDir}"`,
        `-e XDG_RUNTIME_DIR=${runtimeDir}`,
        "bambu-cli",
        "--orient 1",
        "--arrange 1",
        `--load-settings "/data/machine.json;/data/process.json"`,
        `--load-filaments "/data/filament.json"`,
        "--slice 0",
        "--debug 5",
        `--export-3mf /output/${file.originalname}.3mf`,
        `/data/${file.originalname}`,
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
  }
});

export default router;
