"use client";

import React, { useState, useEffect, useRef } from "react";

// --- Configuration ---
const REST_API_ENDPOINT = process.env.NEXT_PUBLIC_REST_API_ENDPOINT;
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
// --- ---

type ResultData = {
  fileName: string;
  estimatedTime?: string | number;
  materialUsage?: string | number;
  price?: number;
};

type Stage =
  | "idle"
  | "creatingJob"
  | "uploading"
  | "connectingWs"
  | "subscribingWs"
  | "processing"
  | "completed"
  | "failed";

type WsMessage = {
  jobId: string;
  status: string;
  price?: number;
  printTimeSeconds?: number;
  filamentUsedGrams?: number;
  errorMessage?: string;
};

const stageProgress: Record<Stage, number> = {
  idle: 0,
  creatingJob: 10,
  uploading: 35,
  connectingWs: 60,
  subscribingWs: 70,
  processing: 85,
  completed: 100,
  failed: 100,
};

const stageStatusText: Record<Stage, string> = {
  idle: "",
  creatingJob: "Priprema zahteva...",
  uploading: "Slanje fajla...",
  connectingWs: "Uspostavljanje veze...",
  subscribingWs: "Pretplata na ažuriranja...",
  processing: "Analiziranje modela...",
  completed: "Završeno!",
  failed: "Greška",
};

export default function UploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [result, setResult] = useState<ResultData | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Print settings (for future backend use)
  const [material, setMaterial] = useState("pla-white");
  const [infill, setInfill] = useState("20");
  const [quality, setQuality] = useState("0.20");

  // Request form (results step)
  const [requestEmail, setRequestEmail] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);

  const webSocketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      webSocketRef.current?.close();
    };
  }, []);

  const isInProcessingStage =
    stage === "creatingJob" ||
    stage === "uploading" ||
    stage === "connectingWs" ||
    stage === "subscribingWs" ||
    stage === "processing";

  const handleFileChange = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".stl")) {
      setErrorMessage("Neispravan format fajla. Molimo odaberite .stl fajl.");
      setSelectedFile(null);
      setStage("idle");
      setResult(null);
      setCurrentJobId(null);
      return;
    }
    setSelectedFile(file);
    setErrorMessage("");
    setStage("idle");
    setResult(null);
    setCurrentJobId(null);
    setRequestSent(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileChange(e.target.files[0]);
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeFile = () => {
    setSelectedFile(null);
    setStage("idle");
    setResult(null);
    setErrorMessage("");
    setCurrentJobId(null);
    setRequestSent(false);
    setShowOrderForm(false);
    webSocketRef.current?.close();
  };

  const handleCancel = () => {
    webSocketRef.current?.close();
    setIsProcessing(false);
    setStage("idle");
    setErrorMessage("");
    setCurrentJobId(null);
  };

  const connectWebSocket = (jobId: string) => {
    if (!WEBSOCKET_URL) {
      setErrorMessage("Greška konfiguracije: WebSocket URL nedostaje.");
      setStage("failed");
      setIsProcessing(false);
      return;
    }

    setStage("connectingWs");
    const ws = new WebSocket(WEBSOCKET_URL);
    webSocketRef.current = ws;

    ws.onopen = () => {
      setStage("subscribingWs");
      ws.send(JSON.stringify({ action: "subscribeJob", jobId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsMessage;
        switch (data.status) {
          case "Slicing":
          case "Calculating":
            setStage("processing");
            break;
          case "Completed":
            setStage("completed");
            setResult({
              fileName: selectedFile?.name ?? "Unknown",
              price: data.price,
              estimatedTime: data.printTimeSeconds
                ? formatDuration(data.printTimeSeconds)
                : undefined,
              materialUsage: data.filamentUsedGrams
                ? `${data.filamentUsedGrams.toFixed(1)} g`
                : undefined,
            });
            setIsProcessing(false);
            ws.close();
            break;
          case "Failed":
            setStage("failed");
            setErrorMessage(
              `Obrada nije uspela: ${data.errorMessage ?? "Nepoznata greška"}`
            );
            setIsProcessing(false);
            ws.close();
            break;
          default:
            setStage("processing");
            break;
        }
      } catch {
        setErrorMessage("Primljeno nevažeće ažuriranje statusa.");
      }
    };

    ws.onerror = () => {
      setErrorMessage(
        "Greška WebSocket veze. Nije moguće dobiti ažuriranja u realnom vremenu."
      );
      setStage("failed");
      setIsProcessing(false);
    };

    ws.onclose = () => {
      webSocketRef.current = null;
      if (stage !== "completed" && isProcessing) {
        setStage("failed");
        setErrorMessage("Veza je prekinuta tokom obrade.");
        setIsProcessing(false);
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isProcessing) return;

    if (!REST_API_ENDPOINT) {
      setErrorMessage("Greška konfiguracije: API endpoint nedostaje.");
      setStage("failed");
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setStage("creatingJob");
    setErrorMessage("");
    setResult(null);
    setCurrentJobId(null);
    webSocketRef.current?.close();

    try {
      const createJobResponse = await fetch(REST_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          material,
          infill: parseInt(infill),
          layerHeight: parseFloat(quality),
        }),
      });

      if (!createJobResponse.ok) {
        throw new Error(
          `Kreiranje posla nije uspelo: ${createJobResponse.statusText}`
        );
      }

      const { jobId, presignedUrl } = await createJobResponse.json();
      setCurrentJobId(jobId);

      setStage("uploading");
      const uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `Slanje na S3 nije uspelo: ${uploadResponse.statusText}`
        );
      }

      connectWebSocket(jobId);
    } catch (error) {
      setErrorMessage(
        `Greška: ${
          error instanceof Error ? error.message : "Nepoznata greška"
        }`
      );
      setStage("failed");
      setIsProcessing(false);
    }
  };

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    // Future: send order to backend
    setRequestSent(true);
  };

  const formatDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    let r = "";
    if (hours > 0) r += `${hours}h `;
    if (minutes > 0) r += `${minutes}m `;
    if (seconds > 0 || r === "") r += `${seconds}s`;
    return r.trim();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const progressPercent = stageProgress[stage] ?? 0;
  const materialLabel: Record<string, string> = {
    "pla-white": "PLA Bela",
    "pla-black": "PLA Crna",
    "petg-clear": "PETG Prozirna",
    "abs-grey": "ABS Siva",
  };

  // ── COMPLETED STATE ───────────────────────────────────────
  if (stage === "completed" && result) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg flex flex-col gap-stack-md">
        {/* File info row with params used */}
        <div className="border border-outline-variant rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}
            >
              deployed_code
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-label-md text-label-md font-medium text-on-surface truncate">
              {result.fileName}
            </p>
            <p className="font-label-sm text-label-sm text-secondary">
              {materialLabel[material] ?? material} · {infill}% infill · {quality}mm
            </p>
          </div>
        </div>

        {/* Result bar */}
        <div className="bg-surface-container rounded-lg px-stack-md py-stack-md flex flex-col items-center gap-stack-md text-center">
          <span className="font-label-md text-label-md text-secondary uppercase tracking-widest">
            Procenjena cena
          </span>
          <div>
            <span className="font-display-lg text-display-lg text-on-surface">
              {result.price !== undefined
                ? Math.round(result.price).toLocaleString("sr-RS")
                : "—"}
            </span>
            <span className="font-body-lg text-body-lg text-secondary ml-2">din</span>
          </div>
          <hr className="w-full border-t border-outline-variant" />
          <div className="grid grid-cols-2 gap-stack-lg w-full">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 text-secondary">
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>timer</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider">Vreme štampe</span>
              </div>
              <span className="font-body-md text-body-md text-on-surface">{result.estimatedTime ?? "—"}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 text-secondary">
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>scale</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider">Materijal</span>
              </div>
              <span className="font-body-md text-body-md text-on-surface">{result.materialUsage ?? "—"}</span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-surface-container-low p-stack-sm rounded-lg border border-outline-variant w-full text-left">
            <span
              className="material-symbols-outlined text-secondary mt-0.5 shrink-0"
              style={{ fontSize: "18px" }}
            >
              info
            </span>
            <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
              Napomena: Ovo je okvirna procena. Finalna cena će biti potvrđena nakon manuelnog pregleda modela.
            </p>
          </div>
          {!showOrderForm && !requestSent && (
            <button
              onClick={() => setShowOrderForm(true)}
              className="w-full font-label-md text-label-md text-white bg-primary-container py-2.5 rounded hover:opacity-90 transition-all"
            >
              Naruči štampu
            </button>
          )}
        </div>

        {/* Order form – shown after clicking "Naruči štampu" */}
        {showOrderForm && (
          requestSent ? (
            <div className="flex flex-col items-center gap-stack-sm py-stack-md text-center">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: "40px", fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <p className="font-headline-md text-headline-md text-on-surface">Zahtev poslat!</p>
              <p className="font-body-md text-body-md text-secondary">
                Kontaktiraćemo vas uskoro na navedenu email adresu.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSendRequest}
              className="border border-outline-variant rounded-lg p-stack-md flex flex-col gap-stack-md"
            >
              <h3 className="font-headline-md text-headline-md text-on-surface">Pošalji zahtev</h3>
              <div className="flex flex-col gap-unit">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="req-email">
                  Email adresa
                </label>
                <input
                  id="req-email"
                  type="email"
                  required
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  placeholder="vasa.adresa@email.com"
                  className="w-full bg-surface border border-outline-variant rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-unit">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="req-notes">
                  Napomena
                </label>
                <textarea
                  id="req-notes"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Npr. Specifična boja, veća gustina ispune..."
                  rows={3}
                  className="w-full bg-surface border border-outline-variant rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full font-label-md text-label-md bg-primary-container text-white py-2.5 rounded hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                Pošalji zahtev
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>send</span>
              </button>
            </form>
          )
        )}

        {/* Secondary: start over */}
        {!requestSent && (
          <button
            onClick={removeFile}
            className="w-full font-label-md text-label-md text-secondary border border-outline-variant px-4 py-2 rounded hover:bg-surface-container transition-colors text-center"
          >
            Novi izračun
          </button>
        )}
      </div>
    );
  }

  // ── PROCESSING STATE ──────────────────────────────────────
  if (isInProcessingStage) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg flex flex-col gap-stack-md">
        {/* File info – dimmed */}
        <div className="border border-outline-variant rounded-lg p-4 flex items-center gap-4 opacity-50">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}
            >
              deployed_code
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-label-md text-label-md text-on-surface truncate">{selectedFile?.name}</p>
            <p className="font-label-sm text-label-sm text-secondary">
              {selectedFile ? formatFileSize(selectedFile.size) : ""}
            </p>
          </div>
        </div>

        {/* Params – dimmed */}
        <div className="grid grid-cols-3 gap-stack-sm opacity-50 pointer-events-none">
          {[
            { label: "Materijal", value: materialLabel[material] ?? material },
            { label: "Ispuna",    value: `${infill}%` },
            { label: "Kvalitet",  value: `${quality}mm` },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">{label}</span>
              <div className="border border-outline-variant rounded px-3 py-2 bg-surface font-body-md text-body-md text-on-surface">{value}</div>
            </div>
          ))}
        </div>

        {/* Wait box */}
        <div className="bg-surface-container rounded-lg px-stack-md py-stack-md flex flex-col gap-stack-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-stack-sm">
              {/* Compact spinner */}
              <div className="relative w-7 h-7 shrink-0">
                <div className="absolute inset-0 rounded-full border-2 border-outline-variant opacity-30" />
                <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1", lineHeight: 1 }}
                  >
                    precision_manufacturing
                  </span>
                </div>
              </div>
              <span className="font-label-md text-label-md font-medium text-on-surface">
                {stageStatusText[stage]}
              </span>
            </div>
            <button
              onClick={handleCancel}
              className="font-label-sm text-label-sm text-secondary underline hover:text-on-surface transition-colors"
            >
              Otkaži
            </button>
          </div>
          <div className="w-full h-1 bg-surface-container-lowest rounded-full overflow-hidden border border-outline-variant">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="font-label-sm text-label-sm text-secondary">
            Obično 45–90 sekundi · rezultat stiže automatski
          </p>
        </div>
      </div>
    );
  }

  // ── FAILED STATE ──────────────────────────────────────────
  if (stage === "failed") {
    return (
      <div className="bg-surface-container-lowest border border-error/30 rounded-xl p-stack-lg flex flex-col gap-stack-md">
        <div className="flex items-start gap-stack-sm">
          <span
            className="material-symbols-outlined text-error shrink-0"
            style={{ fontSize: "24px", fontVariationSettings: "'FILL' 1" }}
          >
            error
          </span>
          <div>
            <p className="font-headline-md text-headline-md text-on-surface mb-unit">
              Došlo je do greške
            </p>
            <p className="font-body-md text-body-md text-secondary">
              {errorMessage}
            </p>
          </div>
        </div>
        <button
          onClick={removeFile}
          className="self-start font-label-md text-label-md text-primary border border-primary px-4 py-2 rounded hover:bg-surface-container-low transition-colors flex items-center gap-2"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "18px" }}
          >
            refresh
          </span>
          Pokušaj ponovo
        </button>
      </div>
    );
  }

  // ── IDLE STATE (file selected or not) ────────────────────
  const fileSelected = !!selectedFile;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg flex flex-col gap-stack-lg">
      {/* Upload zone or file info */}
      <div className="flex flex-col gap-stack-sm">
        <label className="font-label-md text-label-md text-on-surface">
          {fileSelected ? "Odabrani fajl" : "3D Model fajl"}
        </label>

        {fileSelected ? (
          /* File info row */
          <div className="border border-outline-variant bg-surface rounded-lg p-4 flex items-center justify-between hover:border-primary transition-colors duration-200">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{
                    fontSize: "24px",
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  deployed_code
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-headline-md text-headline-md text-on-surface truncate pb-0.5">
                  {selectedFile.name}
                </p>
                <p className="font-label-md text-label-md text-secondary flex items-center gap-2 flex-wrap">
                  <span>Format: STL</span>
                  <span className="w-1 h-1 rounded-full bg-outline-variant inline-block" />
                  <span>Veličina: {formatFileSize(selectedFile.size)}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeFile}
              title="Ukloni fajl"
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-secondary hover:bg-surface-container hover:text-error transition-colors"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "20px" }}
              >
                close
              </span>
            </button>
          </div>
        ) : (
          /* Drop zone */
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg py-section-gap px-stack-lg flex flex-col items-center justify-center gap-stack-md bg-surface transition-colors group ${
              isDragging
                ? "border-primary bg-primary-container/5"
                : "border-outline-variant hover:border-primary-container"
            }`}
          >
            <span
              className={`material-symbols-outlined transition-colors ${
                isDragging
                  ? "text-primary"
                  : "text-secondary group-hover:text-primary-container"
              }`}
              style={{ fontSize: "48px" }}
            >
              upload_file
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant text-center">
              Prevuci fajl ovde ili
            </p>
            <label className="font-label-md text-label-md text-primary border border-primary px-4 py-2 rounded bg-surface-container-lowest hover:bg-surface-container-low transition-all cursor-pointer">
              Odaberi fajl
              <input
                type="file"
                accept=".stl"
                onChange={handleInputChange}
                className="sr-only"
              />
            </label>
            <p className="font-label-sm text-label-sm text-secondary">
              Podržani formati: .STL (Max 50MB)
            </p>
          </div>
        )}

        {errorMessage && (
          <p className="font-label-sm text-label-sm text-error flex items-center gap-1">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px" }}
            >
              error
            </span>
            {errorMessage}
          </p>
        )}
      </div>

      {/* Controls row */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-stack-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* Material */}
          <div className="flex flex-col gap-stack-sm relative">
            <label
              className="font-label-md text-label-md text-on-surface"
              htmlFor="material"
            >
              Materijal
            </label>
            <select
              id="material"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              disabled={!fileSelected}
              className="appearance-none w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="pla-white">PLA (Bela)</option>
              <option value="pla-black">PLA (Crna)</option>
              <option value="petg-clear">PETG (Prozirna)</option>
              <option value="abs-grey">ABS (Siva)</option>
            </select>
            <span
              className="material-symbols-outlined absolute right-4 top-[38px] text-secondary pointer-events-none"
              style={{ fontSize: "20px" }}
            >
              expand_more
            </span>
          </div>

          {/* Infill */}
          <div className="flex flex-col gap-stack-sm relative">
            <label
              className="font-label-md text-label-md text-on-surface"
              htmlFor="infill"
            >
              Ispuna (Infill)
            </label>
            <select
              id="infill"
              value={infill}
              onChange={(e) => setInfill(e.target.value)}
              disabled={!fileSelected}
              className="appearance-none w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="10">10% (Ušteda)</option>
              <option value="20">20% (Standard)</option>
              <option value="50">50% (Čvrsto)</option>
              <option value="100">100% (Solidno)</option>
            </select>
            <span
              className="material-symbols-outlined absolute right-4 top-[38px] text-secondary pointer-events-none"
              style={{ fontSize: "20px" }}
            >
              expand_more
            </span>
          </div>

          {/* Quality */}
          <div className="flex flex-col gap-stack-sm relative">
            <label
              className="font-label-md text-label-md text-on-surface"
              htmlFor="quality"
            >
              Kvalitet sloja
            </label>
            <select
              id="quality"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              disabled={!fileSelected}
              className="appearance-none w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="0.12">0.12mm (Visok)</option>
              <option value="0.20">0.20mm (Standard)</option>
              <option value="0.28">0.28mm (Brz)</option>
            </select>
            <span
              className="material-symbols-outlined absolute right-4 top-[38px] text-secondary pointer-events-none"
              style={{ fontSize: "20px" }}
            >
              expand_more
            </span>
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-stack-md border-t border-outline-variant flex justify-center">
          <button
            type="submit"
            disabled={!fileSelected}
            className="w-full md:w-auto font-label-md text-label-md bg-primary-container text-on-primary-container px-8 py-3 rounded hover:opacity-90 hover:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "20px" }}
            >
              calculate
            </span>
            Izračunaj cenu
          </button>
        </div>
      </form>
    </div>
  );
}
