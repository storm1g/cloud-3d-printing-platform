"use client";

import { useState } from "react";

type ResultData = {
  fileName: string;
  estimatedTime: string;
  materialUsage: string;
  layerCount: number;
};

export default function UploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stage, setStage] = useState<
    "idle" | "uploading" | "slicing" | "calculating" | "done"
  >("idle");
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | null;
  }>({
    text: "",
    type: null,
  });

  const [result, setResult] = useState<ResultData | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setMessage({ text: "", type: null });
      setStage("idle");
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setStage("uploading");
    setMessage({ text: "", type: null });
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Simulacija faza (mock backend)
      await new Promise((r) => setTimeout(r, 1000));
      setStage("slicing");
      await new Promise((r) => setTimeout(r, 1000));
      setStage("calculating");
      await new Promise((r) => setTimeout(r, 1000));

      // Mock rezultat umesto API poziva
      setStage("done");
      setMessage({ text: "File processed successfully!", type: "success" });

      setResult({
        fileName: selectedFile.name,
        estimatedTime: "2h 45m",
        materialUsage: "23.4g (PLA)",
        layerCount: 118,
      });

      setSelectedFile(null);
    } catch (error) {
      console.error(error);
      setMessage({
        text: "Error uploading or processing file. Please try again.",
        type: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const stages = [
    { id: "uploading", label: "Uploading" },
    { id: "slicing", label: "Slicing" },
    { id: "calculating", label: "Calculating" },
  ];

  const currentStageIndex = stages.findIndex((s) => s.id === stage);
  const progressPercent =
    stage === "done"
      ? 100
      : Math.max(0, ((currentStageIndex + (isUploading ? 0.5 : 0)) / stages.length) * 100);

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-lg mx-auto">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center justify-center gap-6 w-full"
      >
        {/* File drop zone */}
        <label className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-blue-400 rounded-2xl cursor-pointer bg-blue-50 hover:bg-blue-100 transition relative">
          <svg
            className="w-10 h-10 text-blue-600 mb-2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
          <span className="text-gray-800 font-medium text-center">
            {selectedFile
              ? selectedFile.name
              : "Click or drag your STL file here"}
          </span>
          <input
            type="file"
            accept=".stl"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>

        {/* Upload button */}
        <button
          type="submit"
          disabled={!selectedFile || isUploading}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition ${
            !selectedFile || isUploading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isUploading ? (
            <>
              <svg
                className="w-5 h-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                ></path>
              </svg>
              Processing...
            </>
          ) : (
            "Upload File"
          )}
        </button>

        {/* Progress bar */}
        {isUploading && (
          <div className="w-full bg-gray-200 rounded-full h-3 mt-2 overflow-hidden">
            <div
              className="h-3 bg-blue-600 transition-all duration-700 ease-in-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        )}

        {/* Stage labels */}
        {isUploading && (
          <div className="flex justify-between w-full text-xs text-gray-600 mt-1">
            {stages.map((s) => (
              <span
                key={s.id}
                className={`${
                  stage === s.id ? "text-blue-700 font-semibold" : "text-gray-500"
                }`}
              >
                {s.label}
              </span>
            ))}
          </div>
        )}

        {/* Message */}
        {message.text && (
          <div
            className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              message.type === "success"
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-700 border border-red-300"
            }`}
          >
            {message.text}
          </div>
        )}
      </form>

      {/* Result Summary */}
      {result && (
        <div className="w-full p-5 mt-4 border border-gray-200 rounded-xl bg-gray-50 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            🧾 Print Summary
          </h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>
              <strong>File:</strong> {result.fileName}
            </li>
            <li>
              <strong>Estimated Print Time:</strong> {result.estimatedTime}
            </li>
            <li>
              <strong>Material Usage:</strong> {result.materialUsage}
            </li>
            <li>
              <strong>Layer Count:</strong> {result.layerCount}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
