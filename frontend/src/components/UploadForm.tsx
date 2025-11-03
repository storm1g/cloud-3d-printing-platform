"use client";

import React, { useState, useEffect, useRef } from "react";

// --- Configuration ---
const REST_API_ENDPOINT = process.env.NEXT_PUBLIC_REST_API_ENDPOINT;
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
// --- ---

type ResultData = {
  fileName: string;
  estimatedTime?: string | number; // Make optional initially
  materialUsage?: string | number; // Make optional initially
  layerCount?: number; // Make optional initially
  price?: number; // Add price
};

type Stage =
  | "idle" // Initial state
  | "creatingJob" // Calling API Gateway
  | "uploading" // Uploading to S3
  | "connectingWs" // Connecting WebSocket
  | "subscribingWs" // Subscribing to job updates
  | "processing" // Generic processing state from WS (Slicing, Calculating)
  | "completed" // Final state from WS
  | "failed"; // Failure state from WS or client-side error

type WsMessage = {
  jobId: string;
  status: string; // e.g., "Slicing", "Calculating", "Completed", "Failed"
  price?: number;
  printTimeSeconds?: number;
  filamentUsedGrams?: number;
  errorMessage?: string;
};

const stageLabels: Record<Stage, string> = {
  idle: "Ready",
  creatingJob: "Requesting upload link...",
  uploading: "Uploading file to S3...",
  connectingWs: "Connecting to status updates...",
  subscribingWs: "Subscribing to status updates...",
  processing: "Processing...", // Generic message, specific status comes from WS
  completed: "Done!",
  failed: "Failed!",
};

const stageProgress: Record<Stage, number> = {
  idle: 0,
  creatingJob: 10,
  uploading: 30, // Upload itself might have progress later
  connectingWs: 60,
  subscribingWs: 70,
  processing: 80, // Slicing/Calculating happens here
  completed: 100,
  failed: 100, // Or maybe 0 depending on desired UX
};

export default function UploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Combined state for busy status
  const [stage, setStage] = useState<Stage>("idle");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "info" | null;
  }>({
    text: "",
    type: null,
  });

  const [result, setResult] = useState<ResultData | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);

  // Cleanup WebSocket on component unmount
  useEffect(() => {
    return () => {
      webSocketRef.current?.close();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Check if the file name ends with .stl (case-insensitive)
      if (!file.name.toLowerCase().endsWith(".stl")) {
        console.error("Invalid file type selected:", file.name);
        setMessage({
          text: "Invalid file type. Please select a .stl file.",
          type: "error",
        });
        // Reset state
        setSelectedFile(null);
        e.target.value = ""; // Clear the input field
        setStage("idle");
        setResult(null);
        setCurrentJobId(null);
        return; // Stop processing this file
      }

      // File is valid, proceed
      setSelectedFile(file);
      setMessage({ text: "", type: null });
      setStage("idle");
      setResult(null);
      setCurrentJobId(null); // Reset job ID
    }
  };

  const connectWebSocket = (jobId: string) => {
    if (!WEBSOCKET_URL) {
      console.error(
        "WEBSOCKET_URL is not defined. Check .env.local or Amplify environment variables."
      );
      setMessage({
        text: "Configuration error: WebSocket URL is missing.",
        type: "error",
      });
      setStage("failed"); // Go to a failed state
      setIsProcessing(false); // Stop the spinner
      return; // Stop the submission
    }

    setStage("connectingWs");
    console.log("Connecting WebSocket...");
    
    const ws = new WebSocket(WEBSOCKET_URL);
    webSocketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setStage("subscribingWs");
      // Send subscription message immediately after connecting
      const subscribeMessage = {
        action: "subscribeJob", // Must match the route key in API Gateway
        jobId: jobId,
      };
      ws.send(JSON.stringify(subscribeMessage));
      console.log("Sent subscribeJob message for:", jobId);
      setMessage({
        text: "Subscribed. Waiting for processing to start...",
        type: "info",
      });
      // Don't set to processing immediately, wait for first WS message
    };

    ws.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
      try {
        const data = JSON.parse(event.data) as WsMessage;

        // Update stage based on received status
        switch (data.status) {
          case "Slicing":
          case "Calculating":
            setStage("processing");
            setMessage({ text: `Status: ${data.status}...`, type: "info" });
            break;
          case "Completed":
            setStage("completed");
            setMessage({
              text: "File processed successfully!",
              type: "success",
            });
            setResult({
              // Update result data with final details
              fileName: selectedFile?.name ?? "Unknown", // Get filename from state
              price: data.price,
              estimatedTime: data.printTimeSeconds
                ? formatDuration(data.printTimeSeconds)
                : undefined,
              materialUsage: data.filamentUsedGrams
                ? `${data.filamentUsedGrams.toFixed(2)} g`
                : undefined,
            });
            setIsProcessing(false); // Processing finished
            ws.close(); // Close WebSocket on completion
            break;
          case "Failed": // Handle potential failure status from backend
            setStage("failed");
            setMessage({
              text: `Processing failed: ${
                data.errorMessage || "Unknown error"
              }`,
              type: "error",
            });
            setIsProcessing(false);
            ws.close();
            break;
          default:
            console.warn("Received unknown status:", data.status);
            setMessage({ text: `Status update: ${data.status}`, type: "info" });
            setStage("processing"); // Assume it's still processing
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
        setMessage({ text: "Received invalid status update.", type: "error" });
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setMessage({
        text: "WebSocket connection error. Cannot get real-time updates.",
        type: "error",
      });
      setStage("failed");
      setIsProcessing(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      webSocketRef.current = null;
      // Only set to failed if not already completed
      if (stage !== "completed") {
        // Optionally set a disconnected message, or let the last error/status stand
        // setMessage({ text: "Real-time updates disconnected.", type: "info" });
        // If it disconnects unexpectedly during processing, mark as failed
        // Corrected the inner condition: only need to check isProcessing
        if (isProcessing) {
          setStage("failed");
          setMessage({
            text: "Connection lost during processing.",
            type: "error",
          });
          setIsProcessing(false);
        }
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    // --- Configuration Check ---
    // Check if the environment variables are loaded before proceeding.
    if (!REST_API_ENDPOINT) {
      console.error(
        "REST_API_ENDPOINT is not defined. Check .env.local or Amplify environment variables."
      );
      setMessage({
        text: "Configuration error: API endpoint is missing.",
        type: "error",
      });
      setStage("failed"); // Go to a failed state
      setIsProcessing(false); // Stop the spinner
      return; // Stop the submission
    }
    // --- End Configuration Check ---

    setIsProcessing(true);
    setStage("creatingJob");
    setMessage({ text: "", type: null });
    setResult(null);
    setCurrentJobId(null);
    webSocketRef.current?.close(); // Close any previous connection

    try {
      // 1. Call API Gateway to get JobID and Presigned URL
      setMessage({ text: "Requesting upload link...", type: "info" });
      const createJobResponse = await fetch(REST_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName: selectedFile.name }),
      });

      if (!createJobResponse.ok) {
        throw new Error(
          `Failed to create job: ${createJobResponse.statusText}`
        );
      }

      const { jobId, presignedUrl, s3Key } = await createJobResponse.json();
      setCurrentJobId(jobId); // Store the jobId
      console.log(`Job created: ${jobId} S3 Key: ${s3Key}`); // Log S3 Key as well // 2. Upload file directly to S3 using the Presigned URL

      setStage("uploading");
      setMessage({ text: "Uploading file to secure storage...", type: "info" }); // Note: No 'Content-Type' needed for PUT usually if presigned URL includes it // AWS SDK S3 Presigner typically does. Let's try without first.
      const uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        body: selectedFile, // headers: { // Add Content-Type if upload fails without it //   'Content-Type': selectedFile.type || 'application/octet-stream' // }
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 Upload failed: ${uploadResponse.statusText}`);
      }

      console.log("File uploaded successfully to S3");
      setMessage({
        text: "File uploaded. Connecting for status updates...",
        type: "info",
      }); // 3. Connect WebSocket and Subscribe

      connectWebSocket(jobId);
    } catch (error) {
      console.error("Error during submit:", error);
      setMessage({
        text: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        type: "error",
      });
      setStage("failed");
      setIsProcessing(false); // Stop processing on error
    } // Note: setIsProcessing(false) is now handled within WebSocket events or catch block
  };

  // Helper function to format duration
  const formatDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    let result = "";
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (seconds > 0 || result === "") result += `${seconds}s`; // Show seconds if duration is < 1 min
    return result.trim();
  };

  const progressPercent = stageProgress[stage] ?? 0;

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-lg mx-auto p-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center justify-center gap-6 w-full"
      >
        {/* File drop zone */}
        <label
          className={`flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-2xl transition relative ${
            isProcessing
              ? "cursor-not-allowed bg-gray-100 border-gray-300"
              : "cursor-pointer bg-blue-50 hover:bg-blue-100 border-blue-400"
          }`}
        >
          <svg
            className={`w-10 h-10 mb-2 ${
              isProcessing ? "text-gray-400" : "text-blue-600"
            }`}
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
          <span
            className={`font-medium text-center ${
              isProcessing ? "text-gray-500" : "text-gray-800"
            }`}
          >
            {selectedFile
              ? selectedFile.name
              : "Click or drag your STL file here"}
          </span>
          <input
            type="file"
            accept=".stl"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={isProcessing}
          />
        </label>

        {/* Upload button */}
        <button
          type="submit"
          disabled={!selectedFile || isProcessing}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition w-full ${
            !selectedFile || isProcessing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isProcessing ? (
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
            "Upload & Calculate Price"
          )}
        </button>

        {/* Progress bar and status */}
        {isProcessing && (
          <div className="w-full mt-2">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ease-out ${
                  stage === "failed" ? "bg-red-500" : "bg-blue-600"
                }`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="text-center text-sm text-gray-600 mt-1">
              {stageLabels[stage]}
              {stage === "processing" &&
                message.type === "info" &&
                ` (${message.text})`}
            </div>
          </div>
        )}

        {/* Message area for non-processing messages (success/error after completion/failure) */}
        {message.text && !isProcessing && (
          <div
            className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium transition w-full text-center ${
              message.type === "success"
                ? "bg-green-100 text-green-700 border border-green-300"
                : message.type === "error"
                ? "bg-red-100 text-red-700 border border-red-300"
                : "bg-blue-100 text-blue-700 border border-blue-300" // Default to info style
            }`}
          >
            {message.text}
          </div>
        )}
      </form>

      {/* Result Summary */}
      {result && stage === "completed" && (
        <div className="w-full p-5 mt-4 border border-gray-200 rounded-xl bg-gray-50 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            🧾 Print Summary & Price
          </h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>
              <strong>File:</strong> {result.fileName}
            </li>
            {result.estimatedTime && (
              <li>
                <strong>Estimated Print Time:</strong> {result.estimatedTime}
              </li>
            )}
            {result.materialUsage && (
              <li>
                <strong>Material Usage:</strong> {result.materialUsage}
              </li>
            )}
            {/* <li><strong>Layer Count:</strong> {result.layerCount ?? 'N/A'}</li> */}
            {result.price !== undefined && (
              <li>
                <strong>Estimated Price:</strong> {result.price.toFixed(2)} RSD
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
