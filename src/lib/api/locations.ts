import axios from 'axios';
import { getBackendUrl } from '@/lib/env';

const API_BASE = (typeof window !== 'undefined') 
  ? '' 
  : getBackendUrl();

export interface ValidatePostalCodeResponse {
  valid: boolean;
  error?: string;
  city?: string;
  region?: string;
}

export interface ValidateAddressResponse {
  valid: boolean;
  error?: string;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
}

/**
 * Czyści zapytanie adresowe, aby zwiększyć szansę dopasowania w mapach
 * (Nominatim). Usuwa przedrostki ulic, skróty honorowe oraz pojedyncze
 * inicjały imienia patrona ulicy (np. "K." w "K. Kadrzyckiej"), które są
 * wieloznaczne i uniemożliwiają znalezienie ulicy.
 */
export function normalizeAddressQuery(query: string): string {
  let q = query || '';
  // Przedrostki typu ulica/aleja/plac/osiedle
  q = q.replace(/\b(ul\.|ulica|al\.|aleja|pl\.|plac|os\.|osiedle)\s+/gi, '');
  // Skróty honorowe (św., ks., gen., kard., bp., abp, płk, mjr, kpt., prof., dr, o.)
  q = q.replace(/\b(św|ks|gen|kard|bp|abp|płk|mjr|kpt|kpl|prof|dr|o)\.?\s+/gi, '');
  // Pojedyncze inicjały imienia (np. "K.")
  q = q.replace(/\b[\p{L}]\.\s*/gu, '');
  // Scal wielokrotne spacje
  q = q.replace(/\s{2,}/g, ' ').trim();
  return q;
}

export const locationsApi = {
  /**
   * Validate Polish postal code (XX-XXX format)
   * Returns city and region if found
   */
  validatePostalCode: async (postalCode: string): Promise<ValidatePostalCodeResponse> => {
    const response = await axios.get(`${API_BASE}/locations/validate-postal-code/`, {
      params: { postal_code: postalCode }
    });
    return response.data;
  },

  /**
   * Validate address using Nominatim API
   * Returns formatted address, city, region, and postal code
   */
  validateAddress: async (address: string, city: string): Promise<ValidateAddressResponse> => {
    const response = await axios.get(`${API_BASE}/locations/validate-address/`, {
      params: { address, city }
    });
    return response.data;
  },
};
