import type { ServiceRecommendation } from '@/types/ai';

const BOOKLET_STORAGE_KEY = 'matria.booklet';

export interface BookletItem {
  id: string;
  name: string;
  description: string | null;
  support_type: string;
  languages: string[];
  delivery_modes: string[];
  availability: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  saved_at: string;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readBookletItems(): BookletItem[] {
  if (!canUseStorage()) {
    return [];
  }

  const raw = window.localStorage.getItem(BOOKLET_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BookletItem[]) : [];
  } catch {
    window.localStorage.removeItem(BOOKLET_STORAGE_KEY);
    return [];
  }
}

function writeBookletItems(items: BookletItem[]): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(BOOKLET_STORAGE_KEY, JSON.stringify(items));
}

export function getBookletItems(): BookletItem[] {
  return readBookletItems();
}

export function isServiceSavedToBooklet(serviceId: string): boolean {
  return readBookletItems().some((item) => item.id === serviceId);
}

export function addServiceToBooklet(service: ServiceRecommendation): BookletItem[] {
  const currentItems = readBookletItems();

  if (currentItems.some((item) => item.id === service.id)) {
    return currentItems;
  }

  const nextItems: BookletItem[] = [
    {
      id: service.id,
      name: service.name,
      description: service.description,
      support_type: service.support_type,
      languages: service.languages,
      delivery_modes: service.delivery_modes,
      availability: service.availability,
      phone: service.phone,
      email: service.email,
      website: service.website,
      address: service.address,
      saved_at: new Date().toISOString(),
    },
    ...currentItems,
  ];

  writeBookletItems(nextItems);
  return nextItems;
}

export function removeServiceFromBooklet(serviceId: string): BookletItem[] {
  const nextItems = readBookletItems().filter((item) => item.id !== serviceId);
  writeBookletItems(nextItems);
  return nextItems;
}
