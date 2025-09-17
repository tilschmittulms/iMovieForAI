export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-xl w-full space-y-6 text-center p-6">
        <h1 className="text-4xl font-bold text-gray-900">
          iMovie for AI Videos 🎬
        </h1>
        <p className="text-gray-600">
          Paste your script below and generate a short concept video.
        </p>

        <form className="space-y-4">
          <textarea
            className="w-full h-40 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste your script here..."
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Generate Video
          </button>
        </form>
      </div>
    </main>
  );
}
