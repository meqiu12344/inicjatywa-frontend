// Nowy podział wydarzeń: Rodzaj / Dla kogo / Tematyka / Zasoby katolickie.
// Słowniki pochodzą z GET /api/classification/ (edytowalne w panelu admina), tu tylko wspólne reguły.
import type {
  ClassificationChoice, ClassificationDimension, ClassificationField, ClassificationValue, EventClassification,
  EventFilters,
} from '@/types';

export const CLASSIFICATION_FIELDS: ClassificationField[] = ['event_types', 'audiences', 'topics', 'resource_types'];

// Pola wydarzenia; Zasoby katolickie to osobny katalog (aplikacje, kanały…), a nie cecha wydarzenia.
export const EVENT_FIELDS: ClassificationField[] = ['event_types', 'audiences', 'topics'];

// Parametry w adresie wyszukiwarki — czytelne dla ludzi: /szukaj?rodzaj=rekolekcje&dla_kogo=mlodziez
export const URL_PARAMS: Record<ClassificationField, string> = {
  event_types: 'rodzaj',
  audiences: 'dla_kogo',
  topics: 'tematyka',
  resource_types: 'zasoby',
};

export const FIELD_LABELS: Record<ClassificationField, string> = {
  event_types: 'Rodzaj wydarzenia',
  audiences: 'Dla kogo?',
  topics: 'Tematyka',
  resource_types: 'Zasoby katolickie',
};

export function emptyChoice(): ClassificationChoice {
  return { event_types: [], audiences: [], topics: [], resource_types: [] };
}

export function hasChoice(choice: ClassificationChoice): boolean {
  return CLASSIFICATION_FIELDS.some(field => choice[field].length > 0);
}

/** Wybór z wydarzenia (np. przy edycji): slugi w każdym polu. */
export function choiceFromEvent(event: EventClassification | null | undefined): ClassificationChoice {
  const choice = emptyChoice();
  if (!event) return choice;
  CLASSIFICATION_FIELDS.forEach(field => {
    choice[field] = (event[field] || []).map(value => value.slug);
  });
  return choice;
}

/** Wybór z preferencji API (listy ID) — zamieniamy na slugi według słownika. */
export function choiceFromIds(
  ids: Partial<Record<ClassificationField, number[]>>, dimensions: ClassificationDimension[],
): ClassificationChoice {
  const choice = emptyChoice();
  dimensions.forEach(dimension => {
    const wanted = new Set(ids[dimension.field] || []);
    choice[dimension.field] = dimension.values.filter(value => wanted.has(value.id)).map(value => value.slug);
  });
  return choice;
}

type ParamReader = { get(key: string): string | null | undefined };

export function readChoiceFromParams(params: ParamReader): ClassificationChoice {
  const choice = emptyChoice();
  CLASSIFICATION_FIELDS.forEach(field => {
    choice[field] = (params.get(URL_PARAMS[field]) || '')
      .split(',').map(value => value.trim()).filter(value => /^[a-z0-9-]+$/.test(value));
  });
  return choice;
}

/** Stare linki: ?categories=4,12 albo ?category=4 (ID starych kategorii). */
export function readLegacyCategories(params: ParamReader): number[] {
  return (params.get('categories') || params.get('category') || '')
    .split(',').map(value => value.trim()).filter(value => /^\d+$/.test(value)).map(Number);
}

export function writeChoiceToParams(params: URLSearchParams, choice: ClassificationChoice): void {
  CLASSIFICATION_FIELDS.forEach(field => {
    if (choice[field].length > 0) params.set(URL_PARAMS[field], choice[field].join(','));
  });
}

/** Filtry API: ?event_types=a,b — OR w obrębie pola, AND między polami. */
export function choiceToFilters(choice: ClassificationChoice): Pick<EventFilters, ClassificationField> {
  const filters: Pick<EventFilters, ClassificationField> = {};
  CLASSIFICATION_FIELDS.forEach(field => {
    if (choice[field].length > 0) filters[field] = [...choice[field]];
  });
  return filters;
}

/** Link do wyszukiwarki z jedną wartością, np. z karty wydarzenia albo slidera. */
export function searchHref(field: ClassificationField, slug: string): string {
  return `/szukaj?${URL_PARAMS[field]}=${encodeURIComponent(slug)}`;
}

export function findValue(
  dimensions: ClassificationDimension[] | undefined, field: ClassificationField, slug: string,
): ClassificationValue | undefined {
  return dimensions?.find(dimension => dimension.field === field)?.values.find(value => value.slug === slug);
}

/** Reguły formularza wydarzenia (te same sprawdza backend). Zwraca komunikaty dla pól. */
export function validateEventChoice(
  choice: ClassificationChoice, dimensions: ClassificationDimension[],
): Partial<Record<ClassificationField, string>> {
  const errors: Partial<Record<ClassificationField, string>> = {};
  if (choice.event_types.length === 0 && choice.resource_types.length === 0) {
    errors.event_types = 'Wybierz rodzaj wydarzenia.';
  }
  dimensions.forEach(dimension => {
    if (dimension.limit && choice[dimension.field].length > dimension.limit) {
      errors[dimension.field] = `Możesz wybrać najwyżej ${dimension.limit}.`;
    }
  });
  return errors;
}

/** Krótka etykieta wydarzenia na kartach: pierwszy Rodzaj albo rodzaj zasobu (fallback: stara kategoria). */
export function primaryLabel(
  event: EventClassification & { categories?: { name: string }[] },
): string | undefined {
  return event.event_types?.[0]?.name || event.resource_types?.[0]?.name || event.categories?.[0]?.name;
}
