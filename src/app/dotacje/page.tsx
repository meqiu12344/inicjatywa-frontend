'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  Heart, 
  CreditCard, 
  Calendar, 
  Gift, 
  Users, 
  Church, 
  BookOpen,
  Sparkles,
  Check,
  Loader2,
  ArrowRight,
  Star
} from 'lucide-react';

const QUICK_AMOUNTS = [10, 20, 50, 100];

const BENEFITS = [
  {
    icon: Church,
    title: 'Wsparcie Parafii',
    description: 'Pomagamy parafiom w organizacji wydarzeń i docieraniu do wiernych'
  },
  {
    icon: Users,
    title: 'Budowanie Wspólnoty',
    description: 'Łączymy katolików z całej Polski poprzez wydarzenia religijne'
  },
  {
    icon: BookOpen,
    title: 'Edukacja i Formacja',
    description: 'Wspieramy rekolekcje, warsztaty i spotkania formacyjne'
  },
  {
    icon: Gift,
    title: 'Darmowy Dostęp',
    description: 'Utrzymujemy platformę bezpłatną dla wszystkich użytkowników'
  }
];

const RECENT_DONORS = [
  { name: 'Anna M.', amount: 50, time: '2 godz. temu' },
  { name: 'Piotr K.', amount: 100, time: '5 godz. temu' },
  { name: 'Maria S.', amount: 20, time: '1 dzień temu' },
  { name: 'Jan P.', amount: 50, time: '2 dni temu' },
];

export default function DonationsPage() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [frequency, setFrequency] = useState<'one-time' | 'monthly'>('one-time');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'blik' | 'transfer'>('card');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string }>({});

  const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;

  const handleQuickAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setErrors({});
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: { amount?: string } = {};

    if (!finalAmount || finalAmount <= 0) {
      newErrors.amount = 'Proszę wybrać lub wpisać kwotę dotacji';
    } else if (finalAmount < 1) {
      newErrors.amount = 'Minimalna kwota dotacji to 1 zł';
    } else if (finalAmount > 10000) {
      newErrors.amount = 'Maksymalna kwota dotacji to 10 000 zł';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Simulate API call - replace with actual payment API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Here you would redirect to payment gateway
      
      // For now, show toast - replace with actual payment redirect
      toast.success(`Dziękujemy! Przekierowanie do płatności: ${finalAmount} zł (${frequency === 'monthly' ? 'miesięcznie' : 'jednorazowo'})`);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Nie udało się przetworzyć płatności. Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-amber-500/10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-rose-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 mb-6 shadow-lg shadow-rose-500/30">
              <Heart className="w-10 h-10 text-white" fill="currentColor" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Wesprzyj Inicjatywę{' '}
              <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                Katolicką
              </span>
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Twoja dotacja pomaga nam rozwijać platformę, wspierać parafie i organizatorów 
              w dotarciu do katolików z całej Polski. Każda złotówka ma znaczenie!
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Donation Form */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 md:p-8">
              {/* Frequency Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-rose-400" />
                  Częstotliwość dotacji
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setFrequency('one-time')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      frequency === 'one-time'
                        ? 'border-rose-500 bg-rose-500/10 text-white'
                        : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-semibold">Jednorazowo</div>
                    <div className="text-sm opacity-70">Pojedyncza wpłata</div>
                  </button>
                  <button
                    onClick={() => setFrequency('monthly')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 relative ${
                      frequency === 'monthly'
                        ? 'border-rose-500 bg-rose-500/10 text-white'
                        : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-xs font-bold text-white">
                      Polecane
                    </div>
                    <div className="font-semibold">Miesięcznie</div>
                    <div className="text-sm opacity-70">Stałe wsparcie</div>
                  </button>
                </div>
              </div>

              {/* Amount Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Wybierz kwotę
                </h3>
                
                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {QUICK_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleQuickAmountSelect(amount)}
                      className={`py-4 px-3 rounded-xl font-bold text-lg transition-all duration-200 ${
                        selectedAmount === amount && !customAmount
                          ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 scale-105'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600'
                      }`}
                    >
                      {amount} zł
                    </button>
                  ))}
                </div>

                {/* Custom Amount Input */}
                <div className="relative">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="Inna kwota..."
                    min="1"
                    max="10000"
                    className={`w-full px-4 py-4 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
                      customAmount ? 'border-rose-500' : 'border-gray-600'
                    } ${errors.amount ? 'border-red-500 ring-2 ring-red-500/50' : ''}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                    PLN
                  </span>
                </div>
                
                {errors.amount && (
                  <p className="mt-2 text-red-400 text-sm">{errors.amount}</p>
                )}
              </div>

              {/* Payment Method */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-pink-400" />
                  Metoda płatności
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'card', label: 'Karta', icon: '💳' },
                    { id: 'blik', label: 'BLIK', icon: '📱' },
                    { id: 'transfer', label: 'Przelew', icon: '🏦' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as typeof paymentMethod)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                        paymentMethod === method.id
                          ? 'border-rose-500 bg-rose-500/10 text-white'
                          : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <span className="text-2xl">{method.icon}</span>
                      <span className="font-medium">{method.label}</span>
                      {method.id === 'card' && paymentMethod === 'card' && (
                        <Check className="w-4 h-4 text-rose-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary & Submit */}
              <div className="bg-gradient-to-r from-gray-700/50 to-gray-700/30 rounded-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Kwota dotacji:</span>
                  <span className="text-2xl font-bold text-white">
                    {finalAmount || 0} zł
                  </span>
                </div>
                {frequency === 'monthly' && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Częstotliwość:</span>
                    <span className="text-amber-400">Co miesiąc</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={isLoading || !finalAmount}
                className="w-full py-4 px-6 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:via-pink-600 hover:to-rose-700 text-white font-bold text-lg rounded-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Przetwarzanie...
                  </>
                ) : (
                  <>
                    Przejdź do płatności
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-gray-500 text-sm mt-4">
                🔒 Bezpieczna płatność przez certyfikowanego operatora
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Donors */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                Ostatni darczyńcy
              </h3>
              <div className="space-y-3">
                {RECENT_DONORS.map((donor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                        {donor.name[0]}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">{donor.name}</div>
                        <div className="text-gray-500 text-xs">{donor.time}</div>
                      </div>
                    </div>
                    <div className="text-rose-400 font-bold">{donor.amount} zł</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Badge */}
            <div className="bg-gradient-to-br from-rose-500/10 to-amber-500/10 rounded-2xl border border-rose-500/20 p-6 text-center">
              <Heart className="w-12 h-12 text-rose-400 mx-auto mb-3" fill="currentColor" />
              <div className="text-3xl font-bold text-white mb-1">2,847</div>
              <div className="text-gray-400">darczyńców w tym roku</div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            Na co przeznaczamy Twoje wsparcie?
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-10">
            Każda złotówka jest wykorzystywana z rozwagą, aby wspierać rozwój 
            katolickiej wspólnoty w Polsce.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((benefit, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 hover:border-rose-500/50 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <benefit.icon className="w-6 h-6 text-rose-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-gray-400 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-12">
          <Link 
            href="/" 
            className="text-gray-400 hover:text-rose-400 transition-colors inline-flex items-center gap-2"
          >
            ← Wróć na stronę główną
          </Link>
        </div>
      </div>
    </div>
  );
}
