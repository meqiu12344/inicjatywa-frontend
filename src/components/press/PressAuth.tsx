'use client';

import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Eye, EyeOff, FileText, Loader2, ShieldCheck } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '@/hooks/useAuth';
import './press.css';

type FieldErrors = Record<string, string>;

const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

function pressRedirect(value: string | null) {
  return value && /^\/(dla-mediow|admin\/prasa)(\/|\?|$)/.test(value) ? value : '/dla-mediow';
}

function errorText(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(' ');
  return typeof value === 'string' ? value : '';
}

function parseErrors(error: unknown): { fields: FieldErrors; general: string } {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  const fields: FieldErrors = {};
  let general = '';
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data)) {
      const text = errorText(value);
      if (!text) continue;
      if (['detail', 'message', 'error', 'non_field_errors', 'recaptcha_token'].includes(key)) general = general ? `${general} ${text}` : text;
      else fields[key] = text;
    }
  }
  if (!general && !Object.keys(fields).length) general = 'Nie udało się wykonać operacji. Spróbuj ponownie.';
  return { fields, general };
}

function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="press-auth">
    <aside className="press-auth-aside">
      <Link href="/dla-mediow" className="press-auth-brand">
        <Image src="/images/inicjatywa-logo-granatowe.svg" alt="Inicjatywa Katolicka" width={120} height={72} priority className="brightness-0 invert" />
        <strong>IK Media Hub</strong>
      </Link>
      <p className="press-auth-tagline">Materiały dla mediów.<br />W jednym miejscu.</p>
      <ul className="press-auth-features">
        <li><FileText size={20} aria-hidden="true" />Komunikaty, zdjęcia i nagrania</li>
        <li><Download size={20} aria-hidden="true" />Pliki z jasnymi warunkami licencji</li>
        <li><ShieldCheck size={20} aria-hidden="true" />Dostęp weryfikowany przez redakcję</li>
      </ul>
    </aside>
    <div className="press-auth-main"><div className="press-auth-card">{children}</div></div>
  </div>;
}

function PasswordField({ name, label, placeholder, autoComplete, error }: { name: string; label: string; placeholder: string; autoComplete: string; error?: string }) {
  const [visible, setVisible] = useState(false);
  return <label>{label}
    <span className="press-auth-password">
      <input name={name} type={visible ? 'text' : 'password'} required placeholder={placeholder} autoComplete={autoComplete} aria-invalid={!!error} />
      <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ukryj hasło' : 'Pokaż hasło'} title={visible ? 'Ukryj hasło' : 'Pokaż hasło'}>
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
    {error && <small className="press-auth-field-error" role="alert">{error}</small>}
  </label>;
}

function Captcha({ captcha, onChange }: { captcha: React.RefObject<ReCAPTCHA | null>; onChange: (token: string | null) => void }) {
  if (!recaptchaSiteKey) return null;
  return <div className="press-auth-captcha"><ReCAPTCHA ref={captcha} sitekey={recaptchaSiteKey} onChange={onChange} onExpired={() => onChange(null)} /></div>;
}

export function PressLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = pressRedirect(searchParams.get('redirect'));
  const { login, isLoggingIn, isAuthenticated, isLoading } = useAuth();
  const captcha = useRef<ReCAPTCHA | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { if (!isLoading && isAuthenticated) router.replace(redirect); }, [isAuthenticated, isLoading, redirect, router]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (recaptchaSiteKey && !token) { setError('Potwierdź, że nie jesteś robotem.'); return; }
    setError('');
    login({ email: String(form.get('email')), password: String(form.get('password')) }, {
      onSuccess: () => router.push(redirect),
      onError: (failure: unknown) => {
        captcha.current?.reset(); setToken(null);
        const status = (failure as { response?: { status?: number } })?.response?.status;
        setError(status === 401 ? 'Nieprawidłowy e-mail lub hasło.' : parseErrors(failure).general || 'Sprawdź wprowadzone dane.');
      },
    });
  }

  if (isLoading || isAuthenticated) return <AuthLayout><p role="status">Ładowanie…</p></AuthLayout>;
  return <AuthLayout>
    <h1>Zaloguj się</h1>
    <p className="press-auth-lead">Witaj ponownie! Zaloguj się do strefy prasowej.</p>
    {searchParams.get('registered') === 'true' && <p className="press-auth-alert success" role="status">Konto utworzone. Kliknij link aktywacyjny wysłany na Twój adres e-mail, a następnie zaloguj się.</p>}
    {error && <p className="press-auth-alert" role="alert">{error}</p>}
    <form className="press-auth-form" onSubmit={submit}>
      <label>Adres e-mail<input name="email" type="email" required placeholder="np. jan@redakcja.pl" autoComplete="email" /></label>
      <PasswordField name="password" label="Hasło" placeholder="Wprowadź hasło" autoComplete="current-password" />
      <Link href="/reset-hasla" className="press-auth-forgot">Nie pamiętasz hasła?</Link>
      <Captcha captcha={captcha} onChange={value => { setToken(value); if (value) setError(''); }} />
      <button className="press-auth-submit" disabled={isLoggingIn}>{isLoggingIn && <Loader2 size={18} className="press-auth-spin" />}{isLoggingIn ? 'Logowanie…' : 'Zaloguj się'}</button>
    </form>
    <p className="press-auth-switch">Nie masz konta? <Link href={`/dla-mediow/rejestracja?redirect=${encodeURIComponent(redirect)}`}>Zarejestruj się</Link></p>
  </AuthLayout>;
}

export function PressRegister() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = pressRedirect(searchParams.get('redirect'));
  const { register, isRegistering, isAuthenticated, isLoading } = useAuth();
  const captcha = useRef<ReCAPTCHA | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});
  const [error, setError] = useState('');

  useEffect(() => { if (!isLoading && isAuthenticated) router.replace(redirect); }, [isAuthenticated, isLoading, redirect, router]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(['first_name', 'last_name', 'username', 'email', 'password', 'password_confirm'].map(key => [key, String(form.get(key) ?? '').trim()]));
    const local: FieldErrors = {};
    if (values.password.length < 8) local.password = 'Hasło musi mieć co najmniej 8 znaków.';
    if (values.password !== values.password_confirm) local.password_confirm = 'Hasła nie są identyczne.';
    setFields(local); setError('');
    if (Object.keys(local).length) return;
    if (recaptchaSiteKey && !token) { setError('Potwierdź, że nie jesteś robotem.'); return; }
    register({ ...values, ...(token ? { recaptcha_token: token } : {}) }, {
      onSuccess: () => router.push(`/dla-mediow/logowanie?registered=true&redirect=${encodeURIComponent(redirect)}`),
      onError: (failure: unknown) => {
        captcha.current?.reset(); setToken(null);
        const parsed = parseErrors(failure);
        setFields(parsed.fields); setError(parsed.general);
      },
    });
  }

  if (isLoading || isAuthenticated) return <AuthLayout><p role="status">Ładowanie…</p></AuthLayout>;
  return <AuthLayout>
    <h1>Utwórz konto</h1>
    <p className="press-auth-lead">Dołącz do IK Media Hub. Po rejestracji złożysz wniosek o dostęp dla mediów.</p>
    {error && <p className="press-auth-alert" role="alert">{error}</p>}
    <form className="press-auth-form" onSubmit={submit}>
      <div className="press-auth-row">
        <label>Imię<input name="first_name" required maxLength={150} placeholder="Jan" autoComplete="given-name" aria-invalid={!!fields.first_name} />{fields.first_name && <small className="press-auth-field-error" role="alert">{fields.first_name}</small>}</label>
        <label>Nazwisko<input name="last_name" required maxLength={150} placeholder="Kowalski" autoComplete="family-name" aria-invalid={!!fields.last_name} />{fields.last_name && <small className="press-auth-field-error" role="alert">{fields.last_name}</small>}</label>
      </div>
      <label>Nazwa użytkownika<input name="username" required minLength={3} maxLength={150} placeholder="np. jkowalski" autoComplete="username" aria-invalid={!!fields.username} />{fields.username && <small className="press-auth-field-error" role="alert">{fields.username}</small>}</label>
      <label>Adres e-mail<input name="email" type="email" required placeholder="jan@redakcja.pl" autoComplete="email" aria-invalid={!!fields.email} />{fields.email && <small className="press-auth-field-error" role="alert">{fields.email}</small>}</label>
      <PasswordField name="password" label="Hasło" placeholder="Wprowadź hasło" autoComplete="new-password" error={fields.password} />
      <PasswordField name="password_confirm" label="Powtórz hasło" placeholder="Powtórz hasło" autoComplete="new-password" error={fields.password_confirm} />
      <label className="press-auth-check"><input type="checkbox" required /><span>Akceptuję <Link href="/regulamin" target="_blank">regulamin</Link> i <Link href="/polityka-prywatnosci" target="_blank">politykę prywatności</Link></span></label>
      <Captcha captcha={captcha} onChange={value => { setToken(value); if (value) setError(''); }} />
      <button className="press-auth-submit" disabled={isRegistering}>{isRegistering && <Loader2 size={18} className="press-auth-spin" />}{isRegistering ? 'Tworzenie konta…' : 'Utwórz konto'}</button>
    </form>
    <p className="press-auth-switch">Masz już konto? <Link href={`/dla-mediow/logowanie?redirect=${encodeURIComponent(redirect)}`}>Zaloguj się</Link></p>
  </AuthLayout>;
}
