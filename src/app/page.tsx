import HomePageContent, { type HomePageData } from './HomePageContent';
import { getBackendUrl } from '@/lib/env';
import type { Category, EventListItem } from '@/types';

export const revalidate = 60;

const EMPTY_HOME_PAGE_DATA: HomePageData = {
  goldEvents: [],
  promotedEvents: [],
  latestEvents: [],
  top10Events: [],
  categorySliders: [],
  categories: [],
};

async function fetchPublicData<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${getBackendUrl()}/api${path}`, {
      next: { revalidate },
    });

    return response.ok ? (response.json() as Promise<T>) : null;
  } catch {
    return null;
  }
}

async function getHomePageData(): Promise<HomePageData> {
  const [goldEvents, promotedEvents, latestEvents, top10Events, categorySliders, categories] = await Promise.all([
    fetchPublicData<EventListItem[]>('/events/gold/'),
    fetchPublicData<EventListItem[]>('/events/promoted/'),
    fetchPublicData<EventListItem[]>('/events/latest/?limit=15'),
    fetchPublicData<EventListItem[]>('/events/top10/'),
    fetchPublicData<HomePageData['categorySliders']>('/events/category-sliders/'),
    fetchPublicData<Category[]>('/categories/'),
  ]);

  return {
    goldEvents: goldEvents ?? EMPTY_HOME_PAGE_DATA.goldEvents,
    promotedEvents: promotedEvents ?? EMPTY_HOME_PAGE_DATA.promotedEvents,
    latestEvents: latestEvents ?? EMPTY_HOME_PAGE_DATA.latestEvents,
    top10Events: top10Events ?? EMPTY_HOME_PAGE_DATA.top10Events,
    categorySliders: categorySliders ?? EMPTY_HOME_PAGE_DATA.categorySliders,
    categories: categories ?? EMPTY_HOME_PAGE_DATA.categories,
  };
}

export default async function HomePage() {
  const data = await getHomePageData();

  return <HomePageContent data={data} />;
}
