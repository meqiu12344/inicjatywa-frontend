'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Search, User, Calendar, Plus, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AdminNotificationBadge } from '@/components/AdminNotificationBadge';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Wydarzenia', href: '/' },
  { name: 'Kalendarz', href: '/kalendarz' },
  { name: 'Organizatorzy', href: '/organizatorzy' },
  { name: 'Newsletter', href: '/newsletter' },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, profile, isAuthenticated, isLoading, isOrganizer, isAdmin, canCreateEvent, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">WK</span>
            </div>
            <span className="hidden sm:block font-display font-semibold text-lg text-slate-900">
              Wydarzenia Katolickie
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Search button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Szukaj"
            >
              <Search className="w-5 h-5" />
            </button>

            {isLoading ? (
              <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse" />
            ) : isAuthenticated ? (
              <>
                {/* Admin notifications badge */}
                {user?.is_staff && <AdminNotificationBadge />}

                {/* Add event button - only for organizers/admins */}
                {canCreateEvent && (
                  <Link
                    href="/wydarzenia/dodaj"
                    className="hidden sm:flex btn-primary"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Dodaj wydarzenie</span>
                  </Link>
                )}

                {/* User menu */}
                <div className="relative group">
                  <button className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="hidden lg:block text-sm font-medium text-slate-700">
                      {user?.first_name || user?.username}
                    </span>
                  </button>

                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link
                      href="/profil"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Mój profil
                    </Link>
                    <Link
                      href="/moje-wydarzenia"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Moje wydarzenia
                    </Link>
                    <Link
                      href="/moje-bilety"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Moje bilety
                    </Link>
                    {isOrganizer && (
                      <Link
                        href="/spolecznosc-organizatorow"
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Społeczność organizatorów
                      </Link>
                    )}
                    {!isOrganizer && (
                      <Link
                        href="/zostan-organizatorem"
                        className="block px-4 py-2 text-sm text-primary-600 hover:bg-primary-50"
                      >
                        Zostań organizatorem
                      </Link>
                    )}
                    {user?.is_staff && (
                      <>
                        <hr className="my-1 border-slate-200" />
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"
                        >
                          Panel admina
                        </Link>
                      </>
                    )}
                    <hr className="my-1 border-slate-200" />
                    <button
                      onClick={() => logout()}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Wyloguj się
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/logowanie" className="btn-ghost hidden sm:flex">
                  <LogIn className="w-4 h-4" />
                  <span>Zaloguj</span>
                </Link>
                <Link href="/rejestracja" className="btn-primary">
                  Dołącz
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div
          className={clsx(
            'overflow-hidden transition-all duration-300',
            searchOpen ? 'max-h-20 py-3' : 'max-h-0'
          )}
        >
          <form action="/szukaj" className="flex gap-2">
            <input
              type="text"
              name="q"
              placeholder="Szukaj wydarzeń..."
              className="input flex-1"
            />
            <button type="submit" className="btn-primary">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Szukaj</span>
            </button>
          </form>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={clsx(
          'md:hidden fixed inset-0 top-16 bg-white z-40 transition-transform duration-300',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="p-4 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-base font-medium text-slate-900 hover:bg-slate-50 rounded-lg"
            >
              {item.name}
            </Link>
          ))}

          <hr className="my-4 border-slate-200" />

          {isLoading ? (
            <div className="px-4 py-3">
              <div className="h-4 bg-slate-100 rounded animate-pulse w-32" />
            </div>
          ) : isAuthenticated ? (
            <>
              {canCreateEvent && (
                <Link
                  href="/wydarzenia/dodaj"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-base font-medium text-primary-600 hover:bg-primary-50 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                  Dodaj wydarzenie
                </Link>
              )}
              <Link
                href="/profil"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-base text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                Mój profil
              </Link>
              <Link
                href="/moje-wydarzenia"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-base text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                Moje wydarzenia
              </Link>
              <Link
                href="/moje-bilety"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-base text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                Moje bilety
              </Link>
              {isOrganizer && (
                <Link
                  href="/spolecznosc-organizatorow"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-base text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  Społeczność organizatorów
                </Link>
              )}
              {!isOrganizer && (
                <Link
                  href="/zostan-organizatorem"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-base text-primary-600 hover:bg-primary-50 rounded-lg"
                >
                  Zostań organizatorem
                </Link>
              )}
              {user?.is_staff && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-base text-orange-600 hover:bg-orange-50 rounded-lg"
                >
                  Panel admina
                </Link>
              )}
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-base text-red-600 hover:bg-red-50 rounded-lg"
              >
                Wyloguj się
              </button>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                href="/logowanie"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center btn-outline"
              >
                Zaloguj się
              </Link>
              <Link
                href="/rejestracja"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center btn-primary"
              >
                Zarejestruj się
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
