import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-amber-500/20">404</h1>
        <h2 className="text-2xl font-bold text-white mt-4 mb-2">Strona nie znaleziona</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Przepraszamy, nie możemy znaleźć strony, której szukasz. Sprawdź adres URL lub wróć na stronę główną.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-xl transition-all"
          >
            Strona główna
          </Link>
          <Link
            href="/szukaj"
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
          >
            Szukaj wydarzeń
          </Link>
        </div>
      </div>
    </div>
  );
}
