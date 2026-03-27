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
