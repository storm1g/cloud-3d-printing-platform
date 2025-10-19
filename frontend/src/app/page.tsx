import UploadForm from "@/components/UploadForm";

export default function Page() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-900">
      <h1 className="text-4xl font-bold mb-8">Cloud 3D Printing Platform</h1>
      <UploadForm />
    </main>
  );
}
