import { Blend, Globe, MapPin, MapPinned, Radio, type LucideIcon } from 'lucide-react';
import type { LocationType } from '@/types';

// Ikony form uczestnictwa — wspólne dla formularzy i strony wydarzenia.
export const LOCATION_TYPE_ICONS: Record<LocationType, LucideIcon> = {
  onsite: MapPin,
  online: Globe,
  hybrid: Blend,
  broadcast: Radio,
  nationwide: MapPinned,
};
