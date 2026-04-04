'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { post } from '@/lib/api/client';
import toast from 'react-hot-toast';

const footerLinks = {
  wydarzenia: [
    { name: 'Przeglądaj wydarzenia', href: '/' },
    { name: 'Kalendarz', href: '/kalendarz' },
    { name: 'Dodaj wydarzenie', href: '/wydarzenia/dodaj' },
    { name: 'Szukaj wydarzeń', href: '/szukaj' },
  ],
  informacje: [
    { name: 'Newsletter', href: '/newsletter' },
    { name: 'FAQ', href: '/regulamin' },
    { name: 'Regulamin', href: '/regulamin' },
    { name: 'Polityka prywatności', href: '/polityka-prywatnosci' },
  ],
  organizatorzy: [
    { name: 'Zostań organizatorem', href: '/zostan-organizatorem' },
    { name: 'Moje wydarzenia', href: '/moje-wydarzenia' },
    { name: 'Społeczność organizatorów', href: '/spolecznosc-organizatorow' },
    { name: 'Promuj wydarzenie', href: '/promocja' },
  ],
};

export function Footer() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Podaj adres email');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await post('/newsletter/quick-subscribe/', { email });
      toast.success('Sprawdź swoją skrzynkę email i potwierdź subskrypcję!');
      setEmail('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Nie udało się zapisać do newslettera');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-12 2xl:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 2xl:gap-12">
          {/* Brand section */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-5 transition-transform duration-200 hover:opacity-90 active:scale-95">
              <Image
                src="/images/inicjatywa-logo-granatowe.svg"
                alt="Logo Inicjatywa"
                width={250}
                height={150}
                className="w-auto h-16 sm:h-20 object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-sm text-slate-400 mb-4">
              Odkryj wydarzenia katolickie w swojej okolicy. Rekolekcje, pielgrzymki, 
              spotkania modlitewne i wiele więcej.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-slate-800 hover:bg-primary-600 rounded-lg flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-slate-800 hover:bg-primary-600 rounded-lg flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="mailto:kontakt@wydarzeniakatolickie.pl"
                className="w-9 h-9 bg-slate-800 hover:bg-primary-600 rounded-lg flex items-center justify-center transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links sections */}
          <div>
            <h3 className="font-semibold text-white mb-4">Wydarzenia</h3>
            <ul className="space-y-2">
              {footerLinks.wydarzenia.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Informacje</h3>
            <ul className="space-y-2">
              {footerLinks.informacje.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Dla organizatorów</h3>
            <ul className="space-y-2">
              {footerLinks.organizatorzy.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter signup */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-white mb-1">
                Bądź na bieżąco z wydarzeniami
              </h3>
              <p className="text-sm text-slate-400">
                Zapisz się do newslettera i otrzymuj informacje o nadchodzących wydarzeniach.
              </p>
            </div>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2 flex-1 md:max-w-md">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Twój adres email"
                className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? '...' : 'Zapisz się'}
              </button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
          <p>
            © {new Date().getFullYear()} Wydarzenia Katolickie. Wszelkie prawa zastrzeżone.
          </p>
          <p className="mt-1">
            Stworzone z ❤️ przez{' '}
            <a href="#" className="text-primary-400 hover:text-primary-300">
              Inicjatywę Katolicką
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
