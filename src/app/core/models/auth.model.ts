export interface GoogleAccountProfile {
  /** Firebase Auth user id (stable per Google account). */
  id: string;
  name: string;
  firstName: string;
  email: string;
  avatarInitial: string;
  photoURL: string | null;
  calendarSynced: boolean;
  tasksSynced: boolean;
}

/** Shape of the users/{uid} document in Firestore. */
export interface FlowdayUserDoc {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  language: 'EN' | 'HE';
  createdAt: unknown;
  lastLoginAt: unknown;
}
