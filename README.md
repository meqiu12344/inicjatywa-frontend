# Wydarzenia Katolickie - Frontend

Nowoczesna aplikacja frontendowa zbudowana w Next.js 15 z App Router i Tailwind CSS.

## 🛠️ Stack technologiczny

- **Next.js 15** - Framework React z App Router
- **TypeScript** - Statyczne typowanie
- **Tailwind CSS** - Utility-first CSS framework
- **TanStack Query** - Zarządzanie stanem serwera i cache
- **Zustand** - Lekki state management
- **Axios** - HTTP client
- **React Hook Form** - Formularze
- **Lucide React** - Ikony
- **date-fns** - Formatowanie dat

## 📁 Struktura projektu

```
frontend/
├── src/
│   ├── app/                    # App Router pages
│   │   ├── (auth)/             # Grupowanie stron auth
│   │   ├── wydarzenia/         # Strony wydarzeń
│   │   ├── kalendarz/          # Kalendarz wydarzeń
│   │   ├── organizatorzy/      # Profile organizatorów
│   │   ├── profil/             # Profil użytkownika
│   │   ├── moje-wydarzenia/    # Zarządzanie wydarzeniami
│   │   ├── moje-bilety/        # Bilety użytkownika
│   │   ├── szukaj/             # Wyszukiwanie
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Strona główna
│   │   └── globals.css         # Globalne style
│   ├── components/
│   │   ├── layout/             # Navbar, Footer
│   │   └── events/             # EventCard, EventFiltersBar
│   ├── lib/
│   │   └── api/                # Klienci API
│   ├── hooks/                  # Custom hooks
│   ├── stores/                 # Zustand stores
│   └── types/                  # TypeScript types
├── public/                     # Statyczne pliki
├── tailwind.config.ts          # Konfiguracja Tailwind
├── next.config.mjs             # Konfiguracja Next.js
└── package.json
```

## 🚀 Uruchomienie

### Wymagania

- Node.js 18.17+
- npm lub yarn

### Instalacja

```bash
# Przejdź do katalogu frontend
cd frontend

# Zainstaluj zależności
npm install

# Utwórz plik .env.local (skopiuj z .env.example)
cp .env.example .env.local

# Edytuj .env.local i ustaw URL backendu
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem http://localhost:3000

### Build produkcyjny

```bash
npm run build
npm run start
```

## 🔧 Konfiguracja

### Google Analytics 4 i pomiar reklam

Wspólny `MarketingTags` w głównym layoucie ładuje jeden `gtag.js` dla GA4
`G-Y2T7MLDZX1` i dotychczasowego Google Ads. ID GA4 można nadpisać przez
`NEXT_PUBLIC_GA_MEASUREMENT_ID` przed zbudowaniem frontendu. Kolejka zdarzeń
powstaje przed załadowaniem biblioteki; ponowne montowanie komponentów nie
inicjalizuje ponownie pomiaru. Stare strony Django również korzystają z jednego
loadera, z zachowaniem dotychczasowych identyfikatorów.

Odsłony obsługuje automatyczny pomiar GA4. W panelu **Administracja → Strumienie
danych → inicjatywakatolicka.pl → Pomiar zaawansowany → Wyświetlenia strony →
Ustawienia zaawansowane** opcja **Zmiany strony na podstawie zdarzeń historii
przeglądarki** musi być włączona. Obejmuje to nawigację Next.js oraz Wstecz/Dalej.
Nie należy dodawać drugiego taga ani ręcznych `page_view`, które dublowałyby
odsłony. [Dokumentacja Google](https://developers.google.com/analytics/devguides/collection/ga4/views).

Banery i popup wysyłają `advertisement_impression` oraz `advertisement_click`
wyłącznie do wskazanego GA4, równolegle z dotychczasowymi licznikami API.
Wyświetlenie jest naliczane raz dla danej emisji, gdy poprawnie załadowany obraz
jest widoczny w co najmniej 50% przez nieprzerwaną sekundę w aktywnej karcie.
Przewinięcie poza ten próg lub ukrycie karty zeruje czas. Zamknięcie popupu
anuluje oczekujące naliczenie. Kliknięcia obejmują lewy i środkowy przycisk oraz
aktywację linku klawiaturą; pomiar nie wstrzymuje otwarcia reklamy.

W **Definicjach niestandardowych** GA4 należy utworzyć wymiary o zakresie
**Zdarzenie**, aby grupować reklamy w raportach i eksploracjach:

| Parametr zdarzenia | Znaczenie |
| --- | --- |
| `ad_id` | ID konkretnej reklamy w bazie |
| `ad_slot` | Faktyczne miejsce emisji, np. `ad-banner-1`, `ad-banner-2`, `ad-popup-entry` |
| `ad_campaign_id` | ID kampanii z edytora reklamy (opcjonalne) |
| `ad_advertiser_id` | ID reklamodawcy z edytora reklamy (opcjonalne) |

Oba zdarzenia mają te same parametry. Pola ID można edytować w panelu reklam
Next.js i w Django Admin. Używaj kodów kampanii i partnerów, bez e-maili ani
danych kontaktowych; nazwy i dane kontaktowe reklamodawców nie trafiają do tych
zdarzeń. Prefiks `ad_` odróżnia te identyfikatory od kampanii pozyskania ruchu
(UTM). Zdarzenia mają własne nazwy, ponieważ `ad_impression` jest zastrzeżone
dla strumieni aplikacji ([reguły Google](https://support.google.com/analytics/answer/13316687)).
Raport CTR: liczba `advertisement_click` / liczba `advertisement_impression` × 100%.

Wdrożenie wymaga migracji backendu przed uruchomieniem nowego frontendu:

```bash
python manage.py migrate AdvertisementService
cd frontend
npm run test:analytics
npm run build
```

Po wdrożeniu sprawdź w Tag Assistant / GA4 DebugView oraz Realtime: pierwszą
odsłonę, przejścia między stronami bez przeładowania, Wstecz/Dalej i kliknięcia
reklam. W DevTools filtr `g/collect` powinien pokazać `tid=G-Y2T7MLDZX1`.
Weryfikację wykonuj bez blokera reklam; nie należy obchodzić odmowy zgody
użytkownika. Testy automatyczne używają lokalnej kolejki i zegara, bez wysyłania
testowych zdarzeń do Google.

### Zmienne środowiskowe

Utwórz plik `.env.local` z następującymi zmiennymi:

```env
# URL API backendu Django
NEXT_PUBLIC_API_URL=http://localhost:8000

# URL aplikacji (dla callback OAuth)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Konfiguracja backendu Django

Backend Django musi mieć skonfigurowane:

1. **CORS** - dodaj domenę frontendową do `CORS_ALLOWED_ORIGINS`
2. **JWT** - SimpleJWT musi być skonfigurowany
3. **API endpoints** - wszystkie endpointy pod `/api/`

## 📱 Strony

| Ścieżka | Opis |
|---------|------|
| `/` | Strona główna z listą wydarzeń |
| `/kalendarz` | Widok kalendarza wydarzeń |
| `/wydarzenia/[slug]` | Szczegóły wydarzenia |
| `/wydarzenia/dodaj` | Formularz dodawania wydarzenia |
| `/organizatorzy` | Lista organizatorów |
| `/organizatorzy/[slug]` | Profil organizatora |
| `/logowanie` | Logowanie |
| `/rejestracja` | Rejestracja |
| `/profil` | Profil użytkownika |
| `/moje-wydarzenia` | Zarządzanie wydarzeniami |
| `/moje-bilety` | Bilety użytkownika |
| `/szukaj` | Wyszukiwanie wydarzeń |

## 🎨 Stylowanie

Projekt używa Tailwind CSS z niestandardową konfiguracją:

### Kolory

- `primary` - główny kolor marki (niebieski)
- `secondary` - kolor drugorzędny (szary)
- `gold` - kolor promocji (złoty)

### Komponenty CSS

Zdefiniowane w `globals.css`:

- `.btn`, `.btn-primary`, `.btn-outline` - przyciski
- `.input` - pola formularzy
- `.card` - karty
- `.badge`, `.badge-success`, `.badge-warning` - odznaki

## 🔐 Autentykacja

Autentykacja oparta na JWT:

1. **Login** - `/api/auth/login/` zwraca access i refresh token
2. **Token storage** - tokeny przechowywane w Zustand z persist
3. **Axios interceptors** - automatyczne dodawanie tokenu do requestów
4. **Token refresh** - automatyczne odświeżanie wygasłego tokenu

## 📡 API

Klient API w `lib/api/client.ts` z interceptorami:

- Automatyczne dodawanie tokenu JWT
- Automatyczne odświeżanie tokenu
- Obsługa błędów

## 🚢 Deployment (Vercel)

1. Połącz repozytorium z Vercel
2. Ustaw zmienne środowiskowe w Vercel Dashboard
3. Deploy!

```bash
# Lub użyj Vercel CLI
vercel
```

### Konfiguracja Vercel

W pliku `vercel.json` (jeśli potrzebne):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

## 📝 Licencja

MIT
