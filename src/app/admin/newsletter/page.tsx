'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  ArrowLeft, Mail, Users, Send, FileText, Plus,
  Search, Filter, MoreVertical, Trash2, Edit, Eye,
  CheckCircle, XCircle, Clock
} from 'lucide-react';
import { get, post, del } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface Newsletter {
  id: number;
  title: string;
  status: string;
  newsletter_type: string;
  created_at: string;
  scheduled_for: string | null;
  sent_at: string | null;
}

interface Subscriber {
  id: number;
  email: string;
  is_active: boolean;
  is_confirmed: boolean;
  created_at: string;
}

export default function AdminNewsletterPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'newsletters' | 'subscribers'>('newsletters');

  if (!user?.is_staff) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Brak dostępu</h1>
          <p className="text-gray-600">Strona dostępna tylko dla administratorów.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/admin"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Powrót do panelu admina
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
              <p className="text-gray-600">Zarządzaj newsletterami i subskrybentami</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('newsletters')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'newsletters'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="inline-block h-4 w-4 mr-2" />
                Newslettery
              </button>
              <button
                onClick={() => setActiveTab('subscribers')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'subscribers'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="inline-block h-4 w-4 mr-2" />
                Subskrybenci
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'newsletters' ? (
          <NewslettersTab />
        ) : (
          <SubscribersTab />
        )}
      </div>
    </div>
  );
}

function NewslettersTab() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data, isLoading } = useQuery({
    queryKey: ['admin-newsletter-drafts'],
    queryFn: async () => {
      const res = await get<{ drafts: Newsletter[] }>('/newsletter/admin/drafts/');
      return res;
    },
  });

  const newsletters: Newsletter[] = data?.drafts ?? [];

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj newsletterów..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <Link
          href="/admin/newsletter/nowy"
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-5 w-5" />
          Nowy newsletter
        </Link>
      </div>

      {/* Newsletters List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {newsletters.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Brak newsletterów</h3>
            <p className="text-gray-500 mb-4">
              Nie utworzono jeszcze żadnego newslettera.
            </p>
            <Link
              href="/admin/newsletter/nowy"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              <Plus className="h-5 w-5" />
              Stwórz pierwszy newsletter
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {newsletters.map((newsletter) => (
              <div key={newsletter.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{newsletter.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>
                        {format(parseISO(newsletter.created_at), 'd MMM yyyy', { locale: pl })}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        newsletter.status === 'sent' ? 'bg-green-100 text-green-800' :
                        newsletter.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {newsletter.status === 'sent' ? 'Wysłany' :
                         newsletter.status === 'scheduled' ? 'Zaplanowany' :
                         newsletter.status === 'draft' ? 'Szkic' : newsletter.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {newsletter.status === 'draft' && (
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                        <Send className="h-5 w-5" />
                      </button>
                    )}
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                      <Edit className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SubscribersTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  const { data, isLoading } = useQuery({
    queryKey: ['admin-newsletter-subscribers'],
    queryFn: async () => {
      const res = await get<{ subscribers: Subscriber[]; total: number; confirmed: number; active: number }>('/newsletter/admin/subscribers/');
      return res;
    },
  });

  const allSubscribers: Subscriber[] = data?.subscribers ?? [];
  const subscribers = allSubscribers.filter((s) => {
    if (filterStatus === 'active') return s.is_active && s.is_confirmed;
    if (filterStatus === 'inactive') return !s.is_active || !s.is_confirmed;
    return true;
  }).filter((s) => {
    if (!searchQuery) return true;
    return s.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj po emailu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">Wszyscy</option>
          <option value="active">Aktywni</option>
          <option value="inactive">Nieaktywni</option>
        </select>
      </div>

      {/* Subscribers List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {subscribers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Brak subskrybentów</h3>
            <p className="text-gray-500">
              Nikt jeszcze nie zapisał się do newslettera.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Data zapisu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">{subscriber.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                      subscriber.is_active && subscriber.is_confirmed
                        ? 'bg-green-100 text-green-800'
                        : subscriber.is_confirmed
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {subscriber.is_active && subscriber.is_confirmed ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Aktywny
                        </>
                      ) : subscriber.is_confirmed ? (
                        <>
                          <Clock className="h-3 w-3" />
                          Nieaktywny
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          Niepotwierdzony
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(parseISO(subscriber.created_at), 'd MMM yyyy', { locale: pl })}
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
