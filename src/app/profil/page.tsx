'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { 
  User, Mail, Camera, LogOut, Trash2, Eye, EyeOff, Key, 
  Check, Building2, Ticket, History, ShoppingBag, Settings,
  ChartLine, CreditCard, ExternalLink, Edit, Clock, XCircle,
  CheckCircle, AlertCircle, Calendar
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore, useHydration } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ProfileFormData {
  username: string;
  email: string;
  bio: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface EventRegistration {
  id: number;
  event: {
    id: number;
    title: string;
    slug: string;
    start_date: string;
    image?: string;
  };
  registered_at: string;
  attended: boolean;
}

interface PromotionPurchase {
  id: number;
  event_title: string;
  promotion_type: string;
  amount: string;
  purchased_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'pending' | 'failed' | 'refunded';
}

interface OrganizerRequest {
  id: number;
  organization_name: string;
  organization_logo?: string;
  status: 'pending' | 'approved' | 'rejected';
  slug?: string;
  is_public?: boolean;
}

type TabType = 'profile' | 'history' | 'purchases' | 'settings';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const hydrated = useHydration();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const purchaseStatusMap: Record<PromotionPurchase['status'], { label: string; className: string }> = {
    active: { label: 'Aktywna', className: 'bg-emerald-500/20 text-emerald-400' },
    expired: { label: 'Wygasła', className: 'bg-slate-600 text-slate-300' },
    pending: { label: 'Oczekuje na płatność', className: 'bg-amber-500/20 text-amber-400' },
    failed: { label: 'Płatność nieudana', className: 'bg-red-500/20 text-red-400' },
    refunded: { label: 'Zwrócona', className: 'bg-blue-500/20 text-blue-400' },
  };

  // Redirect if not authenticated (wait for hydration first)
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/logowanie?redirect=/profil');
    }
  }, [hydrated, isAuthenticated, router]);

  // Pobierz profil
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/profile/');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  // Pobierz historię wydarzeń
  const { data: eventHistory } = useQuery({
    queryKey: ['event-history'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/event-history/');
      return response.data as EventRegistration[];
    },
    enabled: isAuthenticated && activeTab === 'history',
  });

  // Pobierz historię zakupów promocji
  const { data: purchaseHistory } = useQuery({
    queryKey: ['purchase-history'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/purchase-history/');
      return response.data as PromotionPurchase[];
    },
    enabled: isAuthenticated && activeTab === 'purchases',
  });

  // Pobierz dane organizatora
  const { data: organizerData } = useQuery({
    queryKey: ['organizer-profile'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/organizer-profile/');
      return response.data as OrganizerRequest;
    },
    enabled: isAuthenticated && profile?.role === 'organizer',
  });

  // Form dla profilu
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isDirty },
  } = useForm<ProfileFormData>({
    values: profile ? {
      username: profile.username || '',
      email: profile.email || '',
      bio: profile.profile?.bio || '',
    } : undefined,
  });

  // Form dla hasła
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch: watchPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>();

  const newPassword = watchPassword('new_password');

  // Mutacja aktualizacji profilu
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiClient.patch('/auth/profile/', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Profil został zaktualizowany');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast.error('Nie udało się zaktualizować profilu');
    },
  });

  // Mutacja zmiany hasła
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const response = await apiClient.post('/auth/change-password/', {
        old_password: data.current_password,
        new_password: data.new_password,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Hasło zostało zmienione');
      resetPassword();
    },
    onError: () => {
      toast.error('Nie udało się zmienić hasła');
    },
  });

  // Mutacja usuwania konta
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete('/auth/delete-account/');
      return response.data;
    },
    onSuccess: () => {
      toast.success('Konto zostało usunięte');
      logout();
      router.push('/');
    },
    onError: () => {
      toast.error('Nie udało się usunąć konta');
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload avatar
      const formData = new FormData();
      formData.append('avatar', file);
      
      try {
        await apiClient.patch('/auth/profile/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Zdjęcie profilowe zostało zaktualizowane');
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } catch {
        toast.error('Nie udało się przesłać zdjęcia');
      }
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
    toast.success('Zostałeś wylogowany');
  };

  const onSubmitProfile = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onSubmitPassword = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : 0;
  const strengthLabels = ['Bardzo słabe', 'Słabe', 'Średnie', 'Dobre', 'Bardzo dobre'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; className: string }> = {
      user: { label: 'Użytkownik', className: 'bg-gray-600' },
      organizer: { label: 'Organizator', className: 'bg-amber-600' },
      admin: { label: 'Administrator', className: 'bg-red-600' },
    };
    return roleMap[role] || roleMap.user;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
      approved: { label: 'Zweryfikowany', icon: CheckCircle, className: 'bg-emerald-500' },
      pending: { label: 'Oczekuje na weryfikację', icon: Clock, className: 'bg-amber-500' },
      rejected: { label: 'Odrzucony', icon: XCircle, className: 'bg-red-500' },
    };
    return statusMap[status] || statusMap.pending;
  };

  if (!hydrated || !isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-1/4 mb-8" />
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <div className="flex flex-col items-center gap-6">
                <div className="w-28 h-28 bg-slate-700 rounded-full" />
                <div className="space-y-3 w-full max-w-xs">
                  <div className="h-6 bg-slate-700 rounded w-2/3 mx-auto" />
                  <div className="h-4 bg-slate-700 rounded w-1/2 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const roleBadge = getRoleBadge(profile?.role || 'user');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Profile Header Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Profil użytkownika</h1>
          
          {/* Avatar & User Info */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-slate-700 ring-4 ring-amber-500/30">
                {avatarPreview || profile?.profile?.avatar ? (
                  <Image
                    src={avatarPreview || profile?.profile?.avatar}
                    alt="Avatar"
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User className="w-14 h-14" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2.5 bg-amber-500 text-slate-900 rounded-full cursor-pointer hover:bg-amber-400 transition-colors shadow-lg">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>

            <h2 className="text-xl font-semibold text-white">{profile?.username}</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-slate-400 text-sm">{profile?.email}</p>
              {profile?.email_verified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle className="w-3 h-3" />
                  Zweryfikowany
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <AlertCircle className="w-3 h-3" />
                  Niezweryfikowany
                </span>
              )}
            </div>
            
            <div className="mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${roleBadge.className}`}>
                {roleBadge.label}
              </span>
            </div>

            {/* Zostań organizatorem */}
            {profile?.role === 'user' && !profile?.organizer_request_pending && (
              <div className="mt-4 p-4 bg-slate-700/50 rounded-xl w-full max-w-md">
                <p className="text-sm text-slate-300 mb-3">
                  Chcesz dodawać własne wydarzenia na platformie?
                </p>
                <Link
                  href="/zostan-organizatorem"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium rounded-lg transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  Złóż wniosek o rolę organizatora
                </Link>
              </div>
            )}

            {/* Oczekuje na weryfikację */}
            {profile?.organizer_request_pending && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl w-full max-w-md">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-amber-500 font-medium text-sm">Twój wniosek o rolę organizatora jest w trakcie rozpatrywania.</p>
                    <p className="text-slate-400 text-xs mt-1">Powiadomimy Cię mailowo o decyzji.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                Wyloguj się
              </button>
              
              <Link
                href="/moje-bilety"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors text-sm"
              >
                <Ticket className="w-4 h-4" />
                Moje bilety
              </Link>
            </div>
          </div>
        </div>

        {/* Organizer Banner */}
        {profile?.role === 'organizer' && organizerData && (
          <div className="mb-6 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #043f6b 0%, #0a5a96 100%)' }}>
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-5">
                {/* Logo */}
                <div className="flex-shrink-0">
                  {organizerData.organization_logo ? (
                    <Image
                      src={organizerData.organization_logo}
                      alt={organizerData.organization_name}
                      width={80}
                      height={80}
                      className="rounded-xl object-cover border-2 border-white/30 shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-white/20 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white/80" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h5 className="text-white font-semibold text-lg">{organizerData.organization_name}</h5>
                    {(() => {
                      const statusBadge = getStatusBadge(organizerData.status);
                      const StatusIcon = statusBadge.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white ${statusBadge.className}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusBadge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-white/80 text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Panel organizatora wydarzeń
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {organizerData.status === 'approved' && organizerData.slug && organizerData.is_public && (
                    <Link
                      href={`/organizatorzy/${organizerData.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white text-slate-800 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Zobacz profil
                    </Link>
                  )}
                  <Link
                    href={`/organizatorzy/${organizerData.slug}/edytuj`}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edytuj profil
                  </Link>
                  <Link
                    href="/moje-wydarzenia"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-lg text-sm font-medium transition-colors"
                  >
                    <ChartLine className="w-4 h-4" />
                    Moje wydarzenia
                  </Link>
                  <Link
                    href="/bilety/organizator/wyplaty"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-white border border-emerald-500/30 rounded-lg text-sm font-medium transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Wypłaty i bilety
                  </Link>
                </div>
              </div>

              {organizerData.status === 'approved' && !organizerData.slug && (
                <div className="mt-4 p-3 bg-white/15 rounded-lg text-sm text-white">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  <strong>Uzupełnij profil publiczny</strong> - dodaj opis, social media i inne informacje, aby być widocznym na liście organizatorów.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
          <div className="flex border-b border-slate-700 overflow-x-auto">
            {[
              { id: 'profile', label: 'Dane profilu', icon: User },
              { id: 'history', label: 'Historia wydarzeń', icon: History },
              { id: 'purchases', label: 'Historia zakupów', icon: ShoppingBag },
              { id: 'settings', label: 'Ustawienia', icon: Settings },
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`
                    flex items-center gap-2 px-5 py-4 font-medium text-sm transition-colors whitespace-nowrap
                    ${activeTab === tab.id 
                      ? 'text-amber-500 border-b-2 border-amber-500 bg-slate-700/30' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/20'
                    }
                  `}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nazwa użytkownika
                    </label>
                    <input
                      {...registerProfile('username', { required: 'Pole wymagane' })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                    {profileErrors.username && (
                      <p className="text-sm text-red-400 mt-1">{profileErrors.username.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Email
                      {profile?.email_verified ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle className="w-3 h-3" /> Zweryfikowany
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-400">
                          <AlertCircle className="w-3 h-3" /> Niezweryfikowany
                        </span>
                      )}
                    </label>
                    <input
                      {...registerProfile('email', { 
                        required: 'Pole wymagane',
                        pattern: { value: /^\S+@\S+$/i, message: 'Nieprawidłowy email' }
                      })}
                      type="email"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                    {profileErrors.email && (
                      <p className="text-sm text-red-400 mt-1">{profileErrors.email.message}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      {...registerProfile('bio')}
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors resize-none"
                      placeholder="Opowiedz coś o sobie..."
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending || !isDirty}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-medium rounded-lg transition-colors"
                  >
                    {updateProfileMutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
                  </button>
                </div>
              </form>
            )}

            {/* Event History Tab */}
            {activeTab === 'history' && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-500" />
                  Moja historia wydarzeń
                </h3>
                
                {eventHistory && eventHistory.length > 0 ? (
                  <div className="space-y-4">
                    {eventHistory.map((registration) => (
                      <div
                        key={registration.id}
                        className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-xl border border-slate-600 hover:border-slate-500 transition-colors"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                          {registration.event.image ? (
                            <Image
                              src={registration.event.image}
                              alt={registration.event.title}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-slate-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/wydarzenia/${registration.event.slug}`}
                            className="text-white font-medium hover:text-amber-500 transition-colors truncate block"
                          >
                            {registration.event.title}
                          </Link>
                          <p className="text-slate-400 text-sm mt-1">
                            {format(new Date(registration.event.start_date), 'd MMMM yyyy', { locale: pl })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            registration.attended
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-600 text-slate-300'
                          }`}>
                            {registration.attended ? 'Obecność potwierdzona' : 'Niepotwierdzona'}
                          </span>
                          <p className="text-slate-500 text-xs mt-1">
                            Zarejestrowano: {format(new Date(registration.registered_at), 'd.MM.yyyy', { locale: pl })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Nie masz jeszcze żadnych wydarzeń w historii</p>
                    <Link
                      href="/szukaj"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium rounded-lg transition-colors"
                    >
                      Przeglądaj wydarzenia
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Purchase History Tab */}
            {activeTab === 'purchases' && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-500" />
                  Moja historia zakupów subskrypcji
                </h3>
                
                {purchaseHistory && purchaseHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Wydarzenie</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Typ promocji</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Kwota</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Data zakupu</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Wygasa</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseHistory.map((purchase) => (
                          <tr key={purchase.id} className="border-b border-slate-700/50">
                            <td className="py-3 px-4 text-white">{purchase.event_title}</td>
                            <td className="py-3 px-4 text-slate-300">{purchase.promotion_type}</td>
                            <td className="py-3 px-4 text-amber-500 font-medium">{purchase.amount} PLN</td>
                            <td className="py-3 px-4 text-slate-400 text-sm">
                              {format(new Date(purchase.purchased_at), 'd.MM.yyyy', { locale: pl })}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-sm">
                              {format(new Date(purchase.expires_at), 'd.MM.yyyy', { locale: pl })}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  purchaseStatusMap[purchase.status]?.className || 'bg-slate-600 text-slate-300'
                                }`}
                              >
                                {purchaseStatusMap[purchase.status]?.label || 'Wygasła'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Nie masz jeszcze żadnych zakupów promocji</p>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-8">
                {/* Change Password */}
                <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5 text-amber-500" />
                    Zmień hasło
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Twoje bezpieczeństwo jest dla nas ważne. Regularna zmiana hasła to kluczowy krok w ochronie Twoich danych.
                  </p>

                  <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Aktualne hasło
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          {...registerPassword('current_password', { required: 'Pole wymagane' })}
                          className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {passwordErrors.current_password && (
                        <p className="text-sm text-red-400 mt-1">{passwordErrors.current_password.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Nowe hasło
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          {...registerPassword('new_password', { 
                            required: 'Pole wymagane',
                            minLength: { value: 8, message: 'Minimum 8 znaków' }
                          })}
                          className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {passwordErrors.new_password && (
                        <p className="text-sm text-red-400 mt-1">{passwordErrors.new_password.message}</p>
                      )}
                      
                      {/* Password Strength */}
                      {newPassword && (
                        <div className="mt-2">
                          <div className="flex gap-1 mb-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full ${
                                  i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-slate-600'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-slate-400">
                            Siła hasła: {strengthLabels[Math.max(0, passwordStrength - 1)]}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Potwierdź nowe hasło
                      </label>
                      <input
                        type="password"
                        {...registerPassword('confirm_password', {
                          required: 'Pole wymagane',
                          validate: value => value === newPassword || 'Hasła nie są identyczne'
                        })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                      />
                      {passwordErrors.confirm_password && (
                        <p className="text-sm text-red-400 mt-1">{passwordErrors.confirm_password.message}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-medium rounded-lg transition-colors"
                    >
                      {changePasswordMutation.isPending ? 'Zapisywanie...' : 'Zmień hasło'}
                    </button>
                  </form>
                </div>

                {/* Connected Accounts */}
                <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600">
                  <h3 className="text-lg font-semibold text-white mb-4">Połączone konta</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-white">Google</p>
                          <p className="text-sm text-slate-400">Logowanie przez Google</p>
                        </div>
                      </div>
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-colors text-sm">
                        Połącz z Google
                      </button>
                    </div>
                  </div>

                  {/* Link do zarządzania kontami - funkcja w przygotowaniu */}
                  <span
                    className="inline-flex items-center gap-2 mt-4 text-slate-500 text-sm cursor-not-allowed"
                    title="Funkcja w przygotowaniu"
                  >
                    Zarządzaj połączonymi kontami
                    <ExternalLink className="w-4 h-4" />
                  </span>
                </div>

                {/* Delete Account */}
                <div className="bg-red-500/10 rounded-xl p-6 border border-red-500/30">
                  <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Usunięcie konta
                  </h3>
                  <p className="text-slate-300 text-sm mb-4">
                    <strong className="text-red-400">Uwaga:</strong> usunięcie konta jest nieodwracalne. 
                    Wszystkie Twoje dane, wydarzenia i pliki zostaną trwale usunięte z systemu.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Usuń konto
                    </button>
                  ) : (
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-white font-medium mb-3">Czy na pewno chcesz usunąć konto?</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => deleteAccountMutation.mutate()}
                          disabled={deleteAccountMutation.isPending}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                        >
                          {deleteAccountMutation.isPending ? 'Usuwanie...' : 'Tak, usuń konto'}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-colors"
                        >
                          Anuluj
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
