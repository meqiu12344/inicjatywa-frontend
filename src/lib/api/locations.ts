import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
