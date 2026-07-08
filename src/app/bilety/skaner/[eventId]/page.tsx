'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ScanLine, CheckCircle, XCircle, Camera, CameraOff, Keyboard, Wifi, WifiOff, Settings, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import * as gate from '@/lib/gate/scanner';
import toast from 'react-hot-toast';

// Dynamically import QRScanner to avoid SSR issues with html5-qrcode
const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false });

type ScanPhase = 'scanning' | 'loading' | 'success' | 'error';

interface TicketDetails {
  attendee_name?: string;
  ticket_code?: string;
  ticket_type?: string;
  event_title?: string;
  order_number?: string;
  used_at?: string;
}

interface Props {
  params: Promise<{ eventId: string }>;
}

export default function TicketScannerPage({ params }: Props) {
  const resolvedParams = use(params);
  const eventId = Number(resolvedParams.eventId);
  const router = useRouter();

  const [redirected, setRedirected] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isOrganizer = useAuthStore((state) => state.can('isOrganizer'));

  const [phase, setPhase] = useState<ScanPhase>('scanning');
  const [errorMessage, setErrorMessage] = useState('');
  const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(null);
  const [scanCount, setScanCount] = useState(0);

  // Manual code input
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // ── Gate mode (device token + offline) ──
  const [gateToken, setGateToken] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [showGateSetup, setShowGateSetup] = useState(false);
  const [gateTokenInput, setGateTokenInput] = useState('');
  const [manifestInfo, setManifestInfo] = useState<{ valid_count: number; generated_at: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Debounce: prevent re-processing the same code
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Load device token + cached manifest on mount
  useEffect(() => {
    const token = gate.getDeviceToken(eventId);
    setGateToken(token);
    const cached = gate.getCachedManifest(eventId);
    if (cached) setManifestInfo({ valid_count: cached.valid_count, generated_at: cached.generated_at });
    setPendingCount(gate.getQueueLength(eventId));
  }, [eventId]);

  // Register the service worker (installable PWA + offline app shell)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* SW opcjonalny — brak rejestracji nie blokuje skanera */
      });
    }
  }, []);

  // Online/offline detection + auto-reconcile on reconnect
  useEffect(() => {
    if (typeof navigator !== 'undefined') setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      if (gate.getDeviceToken(eventId) && gate.getQueueLength(eventId) > 0) {
        const res = await gate.reconcile(eventId);
        if (res && res.synced > 0) {
          toast.success(`Zsynchronizowano ${res.synced} skanów offline`);
          setPendingCount(gate.getQueueLength(eventId));
        }
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [eventId]);

  // Save device token + immediately sync manifest for offline use
  const handleSaveGateToken = useCallback(async () => {
    const trimmed = gateTokenInput.trim();
    if (!trimmed) return;
    gate.setDeviceToken(eventId, trimmed);
    setGateToken(trimmed);
    setSyncing(true);
    try {
      const manifest = await gate.fetchManifest(eventId, trimmed);
      setManifestInfo({ valid_count: manifest.valid_count, generated_at: manifest.generated_at });
      toast.success(`Bramka połączona — ${manifest.valid_count} ważnych biletów w cache offline`);
      setShowGateSetup(false);
      setGateTokenInput('');
    } catch {
      toast.error('Nie udało się pobrać manifestu — sprawdź token bramki');
    } finally {
      setSyncing(false);
    }
  }, [eventId, gateTokenInput]);

  const handleSyncManifest = useCallback(async () => {
    const token = gate.getDeviceToken(eventId);
    if (!token) return;
    setSyncing(true);
    try {
      const manifest = await gate.fetchManifest(eventId, token);
      setManifestInfo({ valid_count: manifest.valid_count, generated_at: manifest.generated_at });
      toast.success(`Zsynchronizowano: ${manifest.valid_count} ważnych biletów`);
    } catch {
      toast.error('Synchronizacja nie powiodła się');
    } finally {
      setSyncing(false);
    }
  }, [eventId]);

  const handleDisconnectGate = useCallback(() => {
    gate.clearDeviceToken(eventId);
    setGateToken(null);
    setManifestInfo(null);
    setShowGateSetup(false);
  }, [eventId]);

  // Redirect if not organizer
  useEffect(() => {
    if (user !== undefined && !isOrganizer && !redirected) {
      setRedirected(true);
      toast.error('Musisz być organizatorem aby używać skanera');
      router.push('/logowanie?redirect=/');
    }
  }, [isOrganizer, router, redirected, user]);

  const processTicket = useCallback(
    async (code: string) => {
      setPhase('loading');
      setErrorMessage('');
      setTicketDetails(null);

      // ── GATE MODE: pojedynczy atomowy skan + obsługa offline ──
      if (gate.getDeviceToken(eventId)) {
        try {
          const outcome = await gate.scan(eventId, code, { online: navigator.onLine });
          setPendingCount(gate.getQueueLength(eventId));

          const details: TicketDetails = {
            attendee_name: outcome.ticket?.attendee,
            ticket_code: outcome.ticket?.code || code,
            ticket_type: outcome.ticket?.type,
            used_at: outcome.ticket?.used_at || undefined,
          };

          if (outcome.admit) {
            setTicketDetails(details);
            setPhase('success');
            setScanCount((c) => c + 1);
          } else {
            setErrorMessage(
              (outcome.offline ? '[OFFLINE] ' : '') +
                (outcome.message || 'Bilet odrzucony')
            );
            setTicketDetails(details);
            setPhase('error');
          }
        } catch {
          setErrorMessage('Błąd skanowania');
          setPhase('error');
        }
        return;
      }

      // ── LEGACY MODE: organizator online (verify + mark) ──
      try {
        // Step 1: Verify
        const verifyRes = await apiClient.post('/tickets/verify/', {
          code,
          event_id: eventId,
        });

        const data = verifyRes.data;
        const details: TicketDetails = {
          attendee_name: data.attendee_name,
          ticket_code: data.ticket_code,
          ticket_type: data.ticket_type,
          event_title: data.event?.title,
          order_number: data.ticket?.order_number,
        };

        // Step 2: Mark as used
        const markRes = await apiClient.post('/tickets/mark-used/', { code });

        if (markRes.data?.success) {
          setTicketDetails(details);
          setPhase('success');
          setScanCount((c) => c + 1);
        } else {
          setErrorMessage(markRes.data?.message || 'Nie udało się oznaczyć biletu');
          setTicketDetails(details);
          setPhase('error');
        }
      } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message || err?.response?.data?.error;

        if (status === 409) {
          // Already used
          const usedAt = err?.response?.data?.used_at;
          setErrorMessage(msg || 'Bilet został już wykorzystany');
          setTicketDetails({
            ticket_code: code,
            used_at: usedAt,
          });
        } else if (status === 403) {
          setErrorMessage(msg || 'Brak uprawnień do tego biletu');
        } else if (status === 404) {
          setErrorMessage('Nie znaleziono biletu o podanym kodzie');
        } else {
          setErrorMessage(msg || 'Niepoprawny bilet');
        }

        setPhase('error');
      }
    },
    [eventId]
  );

  const handleScan = useCallback(
    (decodedText: string) => {
      const now = Date.now();
      // Debounce: ignore same code within 3 seconds
      if (
        decodedText === lastScannedRef.current &&
        now - lastScanTimeRef.current < 3000
      ) {
        return;
      }

      lastScannedRef.current = decodedText;
      lastScanTimeRef.current = now;
      processTicket(decodedText);
    },
    [processTicket]
  );

  const handleManualSubmit = () => {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    setShowManualInput(false);
    processTicket(trimmed);
    setManualCode('');
  };

  const handleScanNext = () => {
    setPhase('scanning');
    setErrorMessage('');
    setTicketDetails(null);
    lastScannedRef.current = '';
  };

  // Auth loading
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-gray-300">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!isOrganizer) {
    return null;
  }

  const isPaused = phase !== 'scanning';

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col relative">
      {/* Header */}
      <div className="bg-gray-900/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between z-10 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-indigo-400" />
          <h1 className="text-lg font-semibold text-white">Skaner biletów</h1>
        </div>
        <div className="flex items-center gap-3">
          {scanCount > 0 && (
            <span className="text-sm text-gray-400">
              Zeskanowano: <span className="text-white font-medium">{scanCount}</span>
            </span>
          )}
          {gateToken && (
            <span
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                isOnline ? 'bg-green-900/60 text-green-300' : 'bg-amber-900/60 text-amber-300'
              }`}
              title={isOnline ? 'Online' : 'Offline — skany w kolejce'}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? 'Online' : 'Offline'}
              {pendingCount > 0 && (
                <span className="ml-1 bg-white/20 rounded px-1">{pendingCount}</span>
              )}
            </span>
          )}
          <button
            onClick={() => setShowGateSetup((s) => !s)}
            className={`p-2 rounded-lg transition-colors ${
              gateToken ? 'bg-indigo-700 text-white' : 'bg-gray-800 text-gray-300 hover:text-white'
            }`}
            title="Ustawienia bramki"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white transition-colors"
            title="Wpisz kod ręcznie"
          >
            <Keyboard className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Gate setup panel */}
      {showGateSetup && (
        <div className="bg-gray-800 px-4 py-4 z-10 border-b border-gray-700 space-y-3">
          {gateToken ? (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  <p className="text-white font-medium">Bramka połączona</p>
                  {manifestInfo ? (
                    <p className="text-xs text-gray-400">
                      Cache offline: {manifestInfo.valid_count} biletów ·{' '}
                      {new Date(manifestInfo.generated_at).toLocaleString('pl-PL')}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-400">Brak manifestu — zsynchronizuj dla trybu offline</p>
                  )}
                </div>
                <button
                  onClick={handleSyncManifest}
                  disabled={syncing || !isOnline}
                  className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  Synchronizuj
                </button>
              </div>
              <button
                onClick={handleDisconnectGate}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Odłącz bramkę
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-300">
                Wklej token bramki, aby włączyć tryb urządzenia (atomowy skan + tryb offline).
              </p>
              <div className="flex gap-2">
                <input
                  value={gateTokenInput}
                  onChange={(e) => setGateTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveGateToken()}
                  placeholder="Token bramki (X-Gate-Token)..."
                  className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveGateToken}
                  disabled={!gateTokenInput.trim() || syncing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  {syncing ? 'Łączenie...' : 'Połącz'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Manual input bar */}
      {showManualInput && (
        <div className="bg-gray-800 px-4 py-3 flex gap-2 z-10 border-b border-gray-700">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            placeholder="Wpisz kod biletu..."
            className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualCode.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            Sprawdź
          </button>
        </div>
      )}

      {/* Camera viewfinder */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <QRScanner
          onScan={handleScan}
          paused={isPaused}
          className="w-full h-full"
        />

        {/* Scanning overlay - crosshair guide */}
        {phase === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white/40 rounded-2xl relative">
              {/* Corner accents */}
              <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
              <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
              <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
              <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />
            </div>
            <p className="absolute bottom-8 text-white/70 text-sm">
              Skieruj kamerę na kod QR biletu
            </p>
          </div>
        )}

        {/* Loading overlay */}
        {phase === 'loading' && (
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-400 border-t-transparent mx-auto mb-4" />
              <p className="text-white text-xl font-medium">Weryfikacja biletu...</p>
            </div>
          </div>
        )}

        {/* Success overlay */}
        {phase === 'success' && (
          <div className="absolute inset-0 bg-green-600/95 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-center px-6 max-w-sm">
              <CheckCircle className="w-24 h-24 text-white mx-auto mb-4" />
              <h2 className="text-4xl font-bold text-white mb-2">SUKCES</h2>
              <p className="text-green-100 text-lg mb-6">Bilet oznaczony jako wykorzystany</p>

              {ticketDetails && (
                <div className="bg-white/20 rounded-xl p-4 mb-8 text-left space-y-1">
                  {ticketDetails.attendee_name && (
                    <p className="text-white">
                      <span className="text-green-200 text-sm">Uczestnik:</span>{' '}
                      <span className="font-medium">{ticketDetails.attendee_name}</span>
                    </p>
                  )}
                  {ticketDetails.ticket_type && (
                    <p className="text-white">
                      <span className="text-green-200 text-sm">Typ:</span>{' '}
                      <span className="font-medium">{ticketDetails.ticket_type}</span>
                    </p>
                  )}
                  {ticketDetails.ticket_code && (
                    <p className="text-white">
                      <span className="text-green-200 text-sm">Kod:</span>{' '}
                      <span className="font-mono text-sm">{ticketDetails.ticket_code}</span>
                    </p>
                  )}
                  {ticketDetails.order_number && (
                    <p className="text-white">
                      <span className="text-green-200 text-sm">Zamówienie:</span>{' '}
                      <span className="font-mono text-sm">{ticketDetails.order_number}</span>
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleScanNext}
                className="w-full py-4 bg-white text-green-700 rounded-xl text-xl font-bold hover:bg-green-50 transition-colors active:scale-95"
              >
                <Camera className="w-6 h-6 inline mr-2" />
                Skanuj kolejny
              </button>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {phase === 'error' && (
          <div className="absolute inset-0 bg-red-600/95 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-center px-6 max-w-sm">
              <XCircle className="w-24 h-24 text-white mx-auto mb-4" />
              <h2 className="text-4xl font-bold text-white mb-2">BŁĄD</h2>
              <p className="text-red-100 text-lg mb-6">{errorMessage}</p>

              {ticketDetails?.used_at && (
                <div className="bg-white/20 rounded-xl p-4 mb-4 text-left">
                  <p className="text-white">
                    <span className="text-red-200 text-sm">Wykorzystany:</span>{' '}
                    <span className="font-medium">{ticketDetails.used_at}</span>
                  </p>
                </div>
              )}

              {ticketDetails?.ticket_code && (
                <div className="bg-white/20 rounded-xl p-4 mb-8 text-left">
                  <p className="text-white">
                    <span className="text-red-200 text-sm">Kod:</span>{' '}
                    <span className="font-mono text-sm">{ticketDetails.ticket_code}</span>
                  </p>
                </div>
              )}

              <button
                onClick={handleScanNext}
                className="w-full py-4 bg-white text-red-700 rounded-xl text-xl font-bold hover:bg-red-50 transition-colors active:scale-95"
              >
                <Camera className="w-6 h-6 inline mr-2" />
                Skanuj kolejny
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-900/90 backdrop-blur-sm px-4 py-3 border-t border-gray-700 z-10">
        <Link
          href="/moje-wydarzenia"
          className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
        >
          ← Wróć do moich wydarzeń
        </Link>
      </div>
    </div>
  );
}
