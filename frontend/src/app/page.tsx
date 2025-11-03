import UploadForm from "@/components/UploadForm";

export default function Page() {
  return (
    <main className="flex flex-col items-center justify-between min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-8">
      
      <div className="flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4 mt-8 sm:mt-16">
          3D Print Price Estimator
        </h1>
        
        <p className="text-lg text-gray-600 mb-10 text-center max-w-lg">
          Get a quick price estimation for your 3D models.
          Upload your .stl file to begin.
        </p>

        <UploadForm />
      </div>

      <footer className="text-sm text-gray-500 py-4 mt-16">
        © {new Date().getFullYear()} Storm3D Print Platform. All Rights Reserved.
      </footer>

    </main>
  );
}
