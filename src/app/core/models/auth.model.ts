export interface GoogleAccountProfile {
  id: string;
  name: string;
  firstName: string;
  email: string;
  avatarInitial: string;
  calendarSynced: boolean;
  tasksSynced: boolean;
  accessToken?: string;
}

export interface GoogleAuthResponse {
  connected: boolean;
  profile: GoogleAccountProfile | null;
  syncedAt: string;
}
