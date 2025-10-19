"use client";

import { useState } from "react";

export default function UploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | null }>({
    text: "",
    type: null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setMessage({ text: "", type: null });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setMessage({ text: "", type: null });

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      setMessage({ text: "File uploaded successfully!", type: "success" });
      setSelectedFile(null);
    } catch (error) {
      console.error(error);
      setMessage({ text: "Error uploading file. Please try again.", type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center justify-center gap-6 w-full max-w-lg mx-auto"
    >
      <label className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-blue-400 rounded-2xl cursor-pointer bg-blue-50 hover:bg-blue-100 transition">
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
          className="hidden"
        />
      </label>

      <button
        type="submit"
        disabled={!selectedFile || isUploading}
        className={`px-6 py-3 rounded-xl font-semibold text-white transition ${
          !selectedFile || isUploading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isUploading ? "Uploading..." : "Upload File"}
      </button>

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
  );
}