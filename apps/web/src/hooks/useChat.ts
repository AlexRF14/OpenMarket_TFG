import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  doc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | null;
  read: boolean;
}

interface UseChatOptions {
  limit?: number;
}

interface UseChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (text: string, senderId: string) => Promise<void>;
  markAsRead: (currentUserId: string) => Promise<void>;
}

/**
 * Hook para chat en tiempo real via Firestore onSnapshot.
 * El frontend escribe mensajes directamente en Firestore (no via backend).
 * El backend solo crea/valida las salas.
 *
 * @param chatId ID del chat en Firestore (null si todavía no se ha creado)
 * @param options Opciones de configuración
 */
export function useChat(chatId: string | null, options: UseChatOptions = {}): UseChatReturn {
  const messageLimit = options.limit ?? 50;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setFirebaseUser(u));
  }, []);

  useEffect(() => {
    if (!chatId || !firebaseUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(messageLimit),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ChatMessage, 'id'>),
        }));
        setMessages(msgs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [chatId, messageLimit, firebaseUser]);

  const sendMessage = useCallback(
    async (text: string, senderId: string) => {
      if (!chatId) throw new Error('chatId requerido');
      if (!text.trim()) return;

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId,
        text: text.trim(),
        createdAt: serverTimestamp(),
        read: false,
      });

      // Actualizar lastMessage en la sala
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: {
          text: text.trim(),
          senderId,
          createdAt: serverTimestamp(),
        },
      });
    },
    [chatId],
  );

  const markAsRead = useCallback(
    async (currentUserId: string) => {
      if (!chatId) return;

      const unreadQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        where('read', '==', false),
        where('senderId', '!=', currentUserId),
      );

      const snapshot = await import('firebase/firestore').then(({ getDocs }) =>
        getDocs(unreadQuery),
      );

      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.update(d.ref, { read: true }));
      await batch.commit();
    },
    [chatId],
  );

  return { messages, loading, error, sendMessage, markAsRead };
}
