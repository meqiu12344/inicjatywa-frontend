'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Polityka prywatności</h1>
          </div>

          <p className="text-gray-700 mb-6">
            Dbamy o Twoją prywatność. Poniżej znajdziesz szczegółowe informacje dotyczące przetwarzania Twoich danych osobowych w serwisie <strong>inicjatywakatolicka.pl</strong>.
          </p>

          <hr className="my-6 border-gray-200" />

          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Administrator danych</h2>
              <p className="text-gray-700">
                Administratorem danych osobowych jest właściciel serwisu. Kontakt: <a href="mailto:kontakt@wydarzeniakatolickie.pl" className="text-indigo-600 hover:underline">kontakt@wydarzeniakatolickie.pl</a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Jakie dane zbieramy?</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Adres e-mail (rejestracja, newsletter, kontakt)</li>
                <li>Dane podane w formularzach (imię, nazwisko, miasto, organizacja)</li>
                <li>Dane techniczne: adres IP, cookies, logi serwera, informacje o przeglądarce</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. W jakim celu przetwarzamy dane?</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Realizacja usług serwisu (rejestracja, logowanie, obsługa konta, newsletter)</li>
                <li>Kontakt z użytkownikami</li>
                <li>Obsługa płatności i promocji wydarzeń</li>
                <li>Analiza statystyk i poprawa działania strony</li>
                <li>Zapewnienie bezpieczeństwa serwisu</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Podstawa prawna przetwarzania</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Zgoda użytkownika (art. 6 ust. 1 lit. a RODO)</li>
                <li>Realizacja umowy (art. 6 ust. 1 lit. b RODO)</li>
                <li>Obowiązek prawny (art. 6 ust. 1 lit. c RODO)</li>
                <li>Prawnie uzasadniony interes administratora (art. 6 ust. 1 lit. f RODO)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Udostępnianie danych</h2>
              <p className="text-gray-700">
                Dane nie są udostępniane osobom trzecim, z wyjątkiem podmiotów realizujących usługi techniczne (hosting, newsletter, płatności) – tylko w zakresie niezbędnym do realizacji usług.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Twoje prawa</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Prawo dostępu do swoich danych</li>
                <li>Prawo do poprawiania i usunięcia danych</li>
                <li>Prawo do ograniczenia przetwarzania</li>
                <li>Prawo do przenoszenia danych</li>
                <li>Prawo do cofnięcia zgody w dowolnym momencie</li>
                <li>Prawo do wniesienia skargi do organu nadzorczego (PUODO)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Pliki cookies</h2>
              <p className="text-gray-700">
                Serwis wykorzystuje pliki cookies w celu zapewnienia prawidłowego działania strony, analizy statystyk oraz personalizacji treści. Możesz zarządzać cookies w ustawieniach swojej przeglądarki.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Okres przechowywania danych</h2>
              <p className="text-gray-700">
                Dane są przechowywane przez okres korzystania z serwisu oraz przez czas wymagany przepisami prawa lub do momentu cofnięcia zgody.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Kontakt</h2>
              <p className="text-gray-700">
                Wszelkie pytania dotyczące naszej Polityki prywatności prosimy kierować na adres: <a href="mailto:kontakt@wydarzeniakatolickie.pl" className="text-indigo-600 hover:underline">kontakt@wydarzeniakatolickie.pl</a>
              </p>
            </section>
          </div>

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
