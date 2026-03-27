'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';
import { eventsApi, categoriesApi } from '@/lib/api/events';
import { getErrorMessage } from '@/lib/api/client';
import type { EventFilters, CreateEventData } from '@/types';

// Query keys
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters?: EventFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...eventKeys.details(), id] as const,
  featured: () => [...eventKeys.all, 'featured'] as const,
  upcoming: () => [...eventKeys.all, 'upcoming'] as const,
  latest: () => [...eventKeys.all, 'latest'] as const,
  top10: () => [...eventKeys.all, 'top10'] as const,
  gold: () => [...eventKeys.all, 'gold'] as const,
  promoted: () => [...eventKeys.all, 'promoted'] as const,
  categorySliders: () => [...eventKeys.all, 'category-sliders'] as const,
  byCategory: (categoryId: number) => [...eventKeys.all, 'by-category', categoryId] as const,
  my: (filters?: EventFilters) => [...eventKeys.all, 'my', filters] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
  detail: (id: number) => [...categoryKeys.all, 'detail', id] as const,
};

// Events hooks
export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => eventsApi.getEvents(filters),
  });
}

export function useInfiniteEvents(filters?: EventFilters) {
  return useInfiniteQuery({
    queryKey: eventKeys.list(filters),
    queryFn: ({ pageParam = 1 }) => eventsApi.getEvents({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.next) {
        return pages.length + 1;
      }
      return undefined;
    },
  });
}

export function useEvent(idOrSlug: string | number) {
  return useQuery({
    queryKey: eventKeys.detail(idOrSlug),
    queryFn: () => eventsApi.getEvent(idOrSlug),
    enabled: !!idOrSlug,
  });
}

export function useFeaturedEvents() {
  return useQuery({
    queryKey: eventKeys.featured(),
    queryFn: eventsApi.getFeaturedEvents,
  });
}

export function useUpcomingEvents(limit?: number) {
  return useQuery({
    queryKey: eventKeys.upcoming(),
    queryFn: () => eventsApi.getUpcomingEvents(limit),
  });
}

export function useLatestEvents(limit?: number) {
  return useQuery({
    queryKey: eventKeys.latest(),
    queryFn: () => eventsApi.getLatestEvents(limit),
  });
}

export function useTop10Events() {
  return useQuery({
    queryKey: eventKeys.top10(),
    queryFn: eventsApi.getTop10Events,
  });
}

export function useGoldEvents() {
  return useQuery({
    queryKey: eventKeys.gold(),
    queryFn: eventsApi.getGoldEvents,
  });
}

export function usePromotedEvents() {
  return useQuery({
    queryKey: eventKeys.promoted(),
    queryFn: eventsApi.getPromotedEvents,
  });
}

export function useRecommendedEvents() {
  const { isAuthenticated } = useAuth();

  // Check localStorage directly so the query starts immediately without
  // waiting for the Zustand store to rehydrate from localStorage.
  const hasToken =
    typeof window !== 'undefined' ? !!localStorage.getItem('access_token') : false;

  return useQuery({
    queryKey: [...eventKeys.all, 'recommended'] as const,
    queryFn: eventsApi.getRecommendedEvents,
    enabled: !!isAuthenticated || hasToken,
  });
}

export function useCategorySliders() {
  return useQuery({
    queryKey: eventKeys.categorySliders(),
    queryFn: eventsApi.getCategorySliders,
  });
}

export function useEventsByCategory(categoryId: number, limit?: number) {
  return useQuery({
    queryKey: eventKeys.byCategory(categoryId),
    queryFn: () => eventsApi.getEventsByCategory(categoryId, limit),
    enabled: !!categoryId,
  });
}

export function useMyEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: eventKeys.my(filters),
    queryFn: () => eventsApi.getMyEvents(filters),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateEventData) => eventsApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      toast.success('Wydarzenie zostało utworzone!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateEventData> }) =>
      eventsApi.updateEvent(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      toast.success('Wydarzenie zostało zaktualizowane!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => eventsApi.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      toast.success('Wydarzenie zostało usunięte');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useRegisterForEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (eventId: number) => eventsApi.registerForEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      toast.success('Zarejestrowano na wydarzenie!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useCancelRegistration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (eventId: number) => eventsApi.cancelRegistration(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      toast.success('Rejestracja anulowana');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// Categories hooks
export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: categoriesApi.getCategories,
    staleTime: 5 * 60 * 1000, // Categories don't change often
  });
}
