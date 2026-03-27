'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, Crown, Medal, Star, Check, ArrowRight,
  TrendingUp, Eye, MousePointer, Users, Calendar
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const plans = [
  {
    level: 'bronze',
    name: 'Bronze',
    price: 29,
    days: 7,
    icon: Medal,
    color: 'from-amber-600 to-amber-700',
    features: [
      'Widoczność w sekcji promowanych na stronie głównej',
      'Odznaka Bronze przy wydarzeniu',
      'Statystyki promocji (wyświetlenia, kliknięcia, CTR)',
    ],
  },
  {
    level: 'silver',
    name: 'Silver',
    price: 59,
    days: 14,
    icon: Star,
    color: 'from-gray-400 to-gray-500',
    popular: true,
    features: [
      'Widoczność w sekcji promowanych na stronie głównej',
      'Priorytetowa pozycja w wynikach wyszukiwania',
      'Odznaka Silver przy wydarzeniu',
      'Statystyki promocji (wyświetlenia, kliknięcia, CTR)',
    ],
  },
  {
    level: 'gold',
    name: 'Gold',
    price: 99,
    days: 30,
    icon: Crown,
    color: 'from-yellow-400 to-yellow-600',
    features: [
      'Najwyższa pozycja w wynikach wyszukiwania',
      'Baner na stronie głównej',
      'Widoczność w sekcji promowanych',
      'Wyróżnienie w cotygodniowym newsletterze',
      'Odznaka Gold przy wydarzeniu',
      'Statystyki promocji (wyświetlenia, kliknięcia, CTR)',
    ],
  },
];

const benefits = [
  {
    icon: Eye,
    title: 'Większa widoczność',
    description: 'Twoje wydarzenie będzie wyświetlane w sekcji promowanych na stronie głównej i w wynikach wyszukiwania.',
  },
  {
    icon: TrendingUp,
    title: 'Więcej uczestników',
    description: 'Promowane wydarzenia notują średnio 3x więcej wyświetleń i 2x więcej rejestracji.',
  },
  {
    icon: MousePointer,
    title: 'Szczegółowe statystyki',
    description: 'Śledź skuteczność promocji dzięki statystykom wyświetleń, kliknięć i CTR.',
  },
  {
    icon: Users,
    title: 'Dotarcie do społeczności',
    description: 'Twoje wydarzenie dotrze do tysięcy katolików szukających inspirujących spotkań.',
  },
];

const faqs = [
  {
    question: 'Jak długo trwa aktywacja promocji?',
    answer: 'Promocja aktywuje się natychmiast po zaksięgowaniu płatności (zwykle kilka sekund).',
  },
  {
    question: 'Czy mogę zmienić plan promocji?',
    answer: 'Tak! Możesz ulepszać swój plan w dowolnym momencie (np. z Bronze na Silver lub Gold). Zapłacisz jedynie różnicę w cenie. Opcja upgrade jest dostępna na stronie promocji Twojego wydarzenia.',
  },
  {
    question: 'Jakie metody płatności są dostępne?',
    answer: 'Akceptujemy karty płatnicze, BLIK oraz Przelewy24.',
  },
  {
    question: 'Czy otrzymam fakturę?',
    answer: 'Tak, faktura zostanie wysłana automatycznie na adres e-mail powiązany z kontem.',
  },
  {
    question: 'Co jeśli moje wydarzenie zostanie odwołane?',
    answer: 'Skontaktuj się z nami - rozpatrzymy indywidualnie możliwość zwrotu lub przeniesienia promocji.',
  },
];

export default function PromocjaPage() {
  const { isAuthenticated } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10" />
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Zwiększ zasięg swojego wydarzenia
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Promuj swoje wydarzenie
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Dotrzyj do tysięcy katolików szukających wartościowych wydarzeń. 
              Wybierz plan promocji i zwiększ liczbę uczestników.
            </p>
            {isAuthenticated ? (
              <Link
                href="/moje-wydarzenia"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                Wybierz wydarzenie do promocji
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link
                href="/logowanie?redirect=/moje-wydarzenia"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                Zaloguj się, aby promować
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Dlaczego warto promować?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Wybierz plan promocji
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Każdy plan zwiększa widoczność Twojego wydarzenia
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.level}
                  className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                    plan.popular ? 'ring-2 ring-indigo-600 scale-105' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-sm font-medium rounded-full">
                      Najpopularniejszy
                    </div>
                  )}

                  <div
                    className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center`}
                  >
                    <Icon className="w-10 h-10 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">
                    {plan.name}
                  </h3>

                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500"> PLN</span>
                    <p className="text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {plan.days} dni promocji
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={isAuthenticated ? '/moje-wydarzenia' : '/logowanie?redirect=/moje-wydarzenia'}
                    className={`block w-full py-3 text-center rounded-xl font-semibold transition-colors ${
                      plan.popular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    Wybierz {plan.name}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Jak to działa?
          </h2>
          <div className="space-y-8">
            {[
              { step: 1, title: 'Wybierz wydarzenie', description: 'Przejdź do swoich wydarzeń i wybierz to, które chcesz promować.' },
              { step: 2, title: 'Wybierz plan', description: 'Dopasuj plan promocji do swoich potrzeb i budżetu.' },
              { step: 3, title: 'Opłać promocję', description: 'Bezpieczna płatność przez Stripe - kartą, BLIK lub Przelewy24.' },
              { step: 4, title: 'Ciesz się rezultatami', description: 'Twoje wydarzenie natychmiast pojawi się w sekcji promowanych!' },
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-6">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Często zadawane pytania
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <span className={`transition-transform ${openFaq === index ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-gray-600">{faq.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Sparkles className="w-12 h-12 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Gotowy, aby promować swoje wydarzenie?
          </h2>
          <p className="text-gray-600 mb-8">
            Dołącz do setek organizatorów, którzy zwiększyli zasięg swoich wydarzeń.
          </p>
          <Link
            href={isAuthenticated ? '/moje-wydarzenia' : '/logowanie?redirect=/moje-wydarzenia'}
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            {isAuthenticated ? 'Przejdź do moich wydarzeń' : 'Zaloguj się i zacznij'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
