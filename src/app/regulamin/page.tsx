'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Warunki korzystania z serwisu</h1>
          </div>

          <ol className="space-y-4 text-gray-700">
            <li className="flex gap-4">
              <span className="font-bold text-indigo-600 flex-shrink-0">1.</span>
              <div>
                <strong>Definicje:</strong> Serwis <strong>inicjatywakatolicka.pl</strong> umożliwia publikację, wyszukiwanie i promocję wydarzeń katolickich.
              </div>
            </li>

            <li className="flex gap-4">
              <span className="font-bold text-indigo-600 flex-shrink-0">2.</span>
              <div>
                <strong>Rejestracja i konto:</strong> Użytkownik może założyć konto, podając prawdziwe dane. Konto jest nieprzenoszalne i przeznaczone wyłącznie do użytku osobistego.
              </div>
            </li>

            <li className="flex gap-4">
              <span className="font-bold text-indigo-600 flex-shrink-0">3.</span>
              <div>
                <strong>Dodawanie wydarzeń:</strong> Organizatorzy mogą dodawać wydarzenia zgodne z tematyką serwisu. Zabronione jest publikowanie treści niezgodnych z prawem, obraźliwych lub wprowadzających w błąd.
              </div>
            </li>

            <li className="flex gap-4">
              <span className="font-bold text-indigo-600 flex-shrink-0">4.</span>
              <div>
                <strong>Newsletter:</strong> Użytkownik może zapisać się na newsletter, wyrażając zgodę na otrzymywanie informacji o wydarzeniach. Może w każdej chwili zrezygnować z subskrypcji.
              </div>
            </li>

            <li className="flex gap-4">
              <span className="font-bold text-indigo-600 flex-shrink-0">5.</span>
              <div>
                <strong>Płatności i promocje:</strong> Promowanie wydarzeń jest usługą płatną. Szczegóły płatności i promocji określone są w osobnych regulaminach.
              </div>
            </li>

            <li className="flex gap-4">
              <span className="font-bold text-indigo-600 flex-shrink-0">6.</span>
              <div>
                <strong>Odpowiedzialność:</strong> Serwis nie ponosi odpowiedzialności za treści publikowane przez użytkowników ani za przebieg wydarzeń. Administrator zastrzega sobie prawo do usuwania treści naruszających regulamin.
              </div>
            </li>

            <li className="flex gap-4">
              <span className="font-bold text-indigo-600 flex-shrink-0">7.</span>
              <div>
                <strong>Ochrona danych:</strong> Dane osobowe są przetwarzane zgodnie z{' '}
                <Link href="/polityka-prywatnosci" className="text-indigo-600 hover:underline">
                  Polityką prywatności
                </Link>.
              </div>
            </li>

            <li className="flex gap-4">
              <span className="font-bold text-indigo-600 flex-shrink-0">8.</span>
              <div>
                <strong>Zmiany w regulaminie:</strong> Administrator zastrzega sobie prawo do zmiany warunków korzystania. O zmianach użytkownicy zostaną poinformowani poprzez serwis.
              </div>
            </li>

            <li className="flex gap-4">
              <span className="font-bold text-indigo-600 flex-shrink-0">9.</span>
              <div>
                <strong>Reklamacje i kontakt:</strong> Wszelkie pytania i reklamacje należy kierować na adres:{' '}
                <a href="mailto:kontakt@wydarzeniakatolickie.pl" className="text-indigo-600 hover:underline">
                  kontakt@wydarzeniakatolickie.pl
                </a>
              </div>
            </li>

            <li className="flex gap-4">
              <span className="font-bold text-indigo-600 flex-shrink-0">10.</span>
              <div>
                <strong>Postanowienia końcowe:</strong> Korzystanie z serwisu oznacza akceptację niniejszych warunków.
              </div>
            </li>
          </ol>

          <hr className="my-6 border-gray-200" />

          <div className="text-center">
            <Link href="/" className="text-indigo-600 hover:underline">
              ← Wróć na stronę główną
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
