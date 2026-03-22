/**
 * In-memory token store with automatic persistence to AsyncStorage
 * This provides immediate access while also attempting to save for next session
 */

let inMemoryToken: string | null = null;
let inMemoryUserData: string | null = null;

export const tokenStore = {
  setToken(token: string) {
    if (!token || typeof token !== 'string') {
      console.error('[TokenStore] Invalid token provided:', typeof token);
      return;
    }
    
    inMemoryToken = token;
    console.log('[TokenStore] Token stored in memory (length:', token.length, ')');
  },

  getToken(): string | null {
    if (!inMemoryToken) {
      console.log('[TokenStore] No token in memory');
      return null;
    }
    console.log('[TokenStore] Returning token from memory (length:', inMemoryToken.length, ')');
    return inMemoryToken;
  },

  setUserData(userData: string) {
    if (!userData || typeof userData !== 'string') {
      console.error('[TokenStore] Invalid user data provided:', typeof userData);
      return;
    }
    
    inMemoryUserData = userData;
    console.log('[TokenStore] User data stored in memory (length:', userData.length, ')');
  },

  getUserData(): string | null {
    return inMemoryUserData;
  },

  clear() {
    inMemoryToken = null;
    inMemoryUserData = null;
    console.log('[TokenStore] Memory cleared');
  },

  hasToken(): boolean {
    return !!(inMemoryToken && inMemoryToken.length > 0);
  },
};
