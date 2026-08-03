import { create } from 'zustand';
import { mmkvStorage } from './mmkv';
import { generateId as uuid } from '../utils/generateId';

export interface Note {
  id: string;
  title: string;
  body: string;
  type: 'note' | 'todo';
  pinned: boolean;
  completedItems: number[];
  createdAt: string;
  updatedAt: string;
}

interface NotesState {
  notes: Note[];
  addNote: (title: string, body: string, type: Note['type']) => void;
  updateNote: (id: string, data: Partial<Pick<Note, 'title' | 'body'>>) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  toggleTodo: (noteId: string, itemIndex: number) => void;
  load: () => void;
  _save: () => void;
}

function toIsoDate(value: unknown): string {
  const parsed = new Date(typeof value === 'string' || typeof value === 'number' ? value : '');
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeNote(raw: any): Note {
  const now = new Date().toISOString();
  const createdAt = toIsoDate(raw?.createdAt ?? now);
  return {
    id: typeof raw?.id === 'string' && raw.id.length ? raw.id : uuid(),
    title: typeof raw?.title === 'string' ? raw.title : '',
    body: typeof raw?.body === 'string' ? raw.body : '',
    type: raw?.type === 'todo' ? 'todo' : 'note',
    pinned: Boolean(raw?.pinned),
    completedItems: Array.isArray(raw?.completedItems)
      ? raw.completedItems.filter((x: unknown) => typeof x === 'number')
      : [],
    createdAt,
    updatedAt: toIsoDate(raw?.updatedAt ?? createdAt),
  };
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],

  addNote: (title, body, type) => {
    const note: Note = {
      id: uuid(), title, body, type,
      pinned: false,
      completedItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set(s => ({ notes: [note, ...s.notes] }));
    get()._save();
  },

  updateNote: (id, data) => {
    set(s => ({
      notes: s.notes.map(n =>
        n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n
      ),
    }));
    get()._save();
  },

  deleteNote: (id) => {
    set(s => ({ notes: s.notes.filter(n => n.id !== id) }));
    get()._save();
  },

  togglePin: (id) => {
    set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n) }));
    get()._save();
  },

  toggleTodo: (noteId, itemIndex) => {
    set(s => ({
      notes: s.notes.map(n => {
        if (n.id !== noteId) return n;
        const ci = n.completedItems.includes(itemIndex)
          ? n.completedItems.filter(i => i !== itemIndex)
          : [...n.completedItems, itemIndex];
        return { ...n, completedItems: ci };
      }),
    }));
    get()._save();
  },

  load: () => {
    const raw = mmkvStorage.getString('notes');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      set({ notes: Array.isArray(parsed) ? parsed.map(normalizeNote) : [] });
    } catch {
      set({ notes: [] });
    }
  },

  _save: () => {
    mmkvStorage.set('notes', JSON.stringify(get().notes));
  },
}));