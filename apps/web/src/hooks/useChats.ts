import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

export interface ParticipantDetail {
  name: string;
  photoUrl?: string;
  type: 'user' | 'company';
}

export interface ChatRoom {
  id: string;
  participants: string[];
  participantDetails: Record<string, ParticipantDetail>;
  orderId?: string;
  createdAt: Timestamp | null;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: Timestamp | null;
  };
}

interface UseChatsReturn {
  chats: ChatRoom[];
  loading: boolean;
  /** true while waiting for Firebase Auth to complete (custom token sign-in) */
  firebaseReady: boolean;
  error: string | null;
}

/**
 * Suscripción en tiempo real a la lista de chats de un participante.
 * Usa onSnapshot para actualizar la lista cuando llega un nuevo mensaje (lastMessage cambia).
 *
 * @param participantId userId o companyId del usuario actual
 */
export function useChats(participantId: string | null): UseChatsReturn {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  // authResolved: true once onAuthStateChanged fires at least once
  const [authResolved, setAuthResolved] = useState(false);

  // Re-subscribe when Firebase Auth state changes (fixes race with signInWithCustomToken)
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setAuthResolved(true);
    });
  }, []);

  useEffect(() => {
    if (!participantId || !firebaseUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // No orderBy here — avoids composite index requirement.
    // Sort client-side instead (see below).
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', participantId),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rooms: ChatRoom[] = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<ChatRoom, 'id'>) }))
          .sort((a, b) => {
            const ta = a.createdAt?.toMillis() ?? 0;
            const tb = b.createdAt?.toMillis() ?? 0;
            return tb - ta;
          });
        setChats(rooms);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [participantId, firebaseUser]);

  return { chats, loading, firebaseReady: authResolved && !!firebaseUser, error };
}
