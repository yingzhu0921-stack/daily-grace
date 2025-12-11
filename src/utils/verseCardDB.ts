/**
 * Hybrid storage for verse cards: IndexedDB (local) + Supabase (cloud sync)
 * - IndexedDB: Fast local access, works offline
 * - Supabase: Cloud backup, cross-device sync
 */

import { supabase } from '@/integrations/supabase/client';

const DB_NAME = 'VerseCardsDB';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

export type VerseCard = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  ratio: '1:1' | '9:16' | '16:9' | '4:3' | '4:5' | '3:4' | '2:3';
  bg: string;
  text: string;
  ref: string;
  tags: string[];
  imageDataUrl?: string;
  editorState?: any;
};

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Save a card (create or update) - Hybrid: IndexedDB + Supabase
 */
export async function saveCard(card: VerseCard): Promise<void> {
  // 1. Save to IndexedDB (always)
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(card);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // 2. Save to Supabase (if authenticated)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase
        .from('verse_cards')
        .upsert({
          id: card.id,
          user_id: session.user.id,
          card_data: card,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Supabase save error:', error);
      } else {
        console.log('✅ Card saved to cloud');
      }
    }
  } catch (error) {
    console.error('❌ Cloud sync error:', error);
    // Continue - local save already succeeded
  }
}

/**
 * Get all cards sorted by creation date (newest first) - Hybrid: IndexedDB + Supabase
 */
export async function getAllCards(): Promise<VerseCard[]> {
  // 1. Get from IndexedDB
  const db = await initDB();
  const localCards = await new Promise<VerseCard[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as VerseCard[]);
    request.onerror = () => reject(request.error);
  });

  // 2. Get from Supabase (if authenticated)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: supabaseData, error } = await supabase
        .from('verse_cards')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase fetch error:', error);
      } else if (supabaseData) {
        // Merge cards from Supabase and IndexedDB
        const cardMap = new Map<string, VerseCard>();
        
        // Add Supabase cards to map
        supabaseData.forEach(row => {
          const card = row.card_data as VerseCard;
          cardMap.set(row.id, card);
        });
        
        // Add local cards that aren't in Supabase
        localCards.forEach(card => {
          if (!cardMap.has(card.id)) {
            cardMap.set(card.id, card);
          }
        });

        const mergedCards = Array.from(cardMap.values());
        mergedCards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        // Sync Supabase cards to IndexedDB in background (don't block UI)
        supabaseData.forEach(row => {
          const card = row.card_data as VerseCard;
          const localCard = localCards.find(c => c.id === card.id);
          if (!localCard) {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.put(card);
          }
        });
        
        console.log('✅ Cards synced:', mergedCards.length);
        return mergedCards;
      }
    }
  } catch (error) {
    console.error('❌ Cloud sync error:', error);
  }

  // Fallback: Return local cards only
  localCards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return localCards;
}

/**
 * Get a single card by ID
 */
export async function getCardById(id: string): Promise<VerseCard | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a card by ID - Hybrid: IndexedDB + Supabase
 */
export async function deleteCard(id: string): Promise<void> {
  // 1. Delete from IndexedDB
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // 2. Delete from Supabase (if authenticated)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase
        .from('verse_cards')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('❌ Supabase delete error:', error);
      } else {
        console.log('✅ Card deleted from cloud');
      }
    }
  } catch (error) {
    console.error('❌ Cloud sync error:', error);
    // Continue - local delete already succeeded
  }
}

/**
 * Clear all cards from IndexedDB
 */
export async function clearAllCards(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      console.log('✅ All cards cleared from IndexedDB');
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Migrate existing cards from localStorage to IndexedDB (one-time migration)
 */
export async function migrateFromLocalStorage(): Promise<number> {
  try {
    const stored = localStorage.getItem('verse_cards');
    if (!stored) return 0;

    const cards = JSON.parse(stored) as VerseCard[];
    console.log(`Migrating ${cards.length} cards from localStorage to IndexedDB...`);

    for (const card of cards) {
      await saveCard(card);
    }

    // Keep localStorage as backup for now, but mark as migrated
    localStorage.setItem('verse_cards_migrated', 'true');
    console.log('Migration completed successfully');
    return cards.length;
  } catch (error) {
    console.error('Migration error:', error);
    return 0;
  }
}
