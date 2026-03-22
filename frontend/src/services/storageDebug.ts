import { storage } from './storage';
import { tokenStore } from './tokenStore';

/**
 * Debug utilities to test and troubleshoot storage
 * Call these from console or add a debug button
 */

export const storageDebug = {
  /**
   * Run comprehensive storage tests
   */
  async runTests(): Promise<void> {
    console.log('\n========== STORAGE DEBUG TEST START ==========\n');

    // Test 1: Check if storage module loaded
    console.log('Test 1: Storage module check');
    console.log('  - storage object exists:', !!storage);
    console.log('  - storage.isAvailable():', storage.isAvailable());

    // Test 2: Manual storage test
    console.log('\nTest 2: Manual storage read/write test');
    try {
      const testKey = 'debug_test_key';
      const testValue = 'debug_test_value_' + Date.now();

      console.log('  - Writing test value...');
      await storage.setItem(testKey, testValue);

      console.log('  - Reading test value...');
      const readValue = await storage.getItem(testKey);

      console.log('  - Comparing values...');
      console.log('    Written:', testValue);
      console.log('    Read:   ', readValue);
      console.log('    Match:  ', readValue === testValue ? '✓ PASS' : '✗ FAIL');

      console.log('  - Cleaning up...');
      await storage.removeItem(testKey);

      console.log('  - Test result: ✓ PASS');
    } catch (error) {
      console.error('  - Test result: ✗ FAIL');
      console.error('  - Error:', error);
    }

    // Test 3: Check current token
    console.log('\nTest 3: Check current auth tokens');
    try {
      const storedToken = await storage.getItem('userToken');
      const memoryToken = tokenStore.getToken();

      console.log('  - AsyncStorage token:', storedToken ? `Found (length: ${storedToken.length})` : 'Not found');
      console.log('  - Memory token:', memoryToken ? `Found (length: ${memoryToken.length})` : 'Not found');
      console.log('  - Tokens match:', storedToken === memoryToken ? '✓ Yes' : '✗ No');
    } catch (error) {
      console.error('  - Error reading tokens:', error);
    }

    // Test 4: TokenStore check
    console.log('\nTest 4: TokenStore functionality');
    const testToken = 'test_token_' + Date.now();
    tokenStore.setToken(testToken);
    const retrievedToken = tokenStore.getToken();
    console.log('  - Set token:', testToken);
    console.log('  - Get token:', retrievedToken);
    console.log('  - Match:', testToken === retrievedToken ? '✓ PASS' : '✗ FAIL');
    console.log('  - hasToken():', tokenStore.hasToken());

    console.log('\n========== STORAGE DEBUG TEST END ==========\n');
  },

  /**
   * Show current auth state
   */
  async showAuthState(): Promise<void> {
    console.log('\n========== AUTH STATE ==========');
    
    try {
      const token = await storage.getItem('userToken');
      const userData = await storage.getItem('userData');
      const memToken = tokenStore.getToken();
      const memUserData = tokenStore.getUserData();

      console.log('AsyncStorage:');
      console.log('  - userToken:', token ? `${token.substring(0, 20)}... (${token.length} chars)` : 'null');
      console.log('  - userData:', userData ? JSON.parse(userData) : 'null');

      console.log('\nMemory Store:');
      console.log('  - token:', memToken ? `${memToken.substring(0, 20)}... (${memToken.length} chars)` : 'null');
      console.log('  - userData:', memUserData ? JSON.parse(memUserData) : 'null');
      console.log('  - hasToken():', tokenStore.hasToken());
    } catch (error) {
      console.error('Error showing auth state:', error);
    }

    console.log('================================\n');
  },

  /**
   * Clear all auth data
   */
  async clearAuth(): Promise<void> {
    console.log('[StorageDebug] Clearing all auth data...');
    await storage.removeItem('userToken');
    await storage.removeItem('userData');
    tokenStore.clear();
    console.log('[StorageDebug] All auth data cleared');
  },

  /**
   * Test persistence
   */
  async testPersistence(): Promise<void> {
    console.log('\n========== PERSISTENCE TEST ==========');
    
    const testToken = 'persistence_test_' + Date.now();
    const testUser = JSON.stringify({ name: 'Test User', email: 'test@test.com' });

    console.log('1. Storing test data...');
    tokenStore.setToken(testToken);
    tokenStore.setUserData(testUser);

    if (storage.isAvailable()) {
      await storage.setItem('userToken', testToken);
      await storage.setItem('userData', testUser);
      console.log('2. Stored to AsyncStorage');
    } else {
      console.log('2. AsyncStorage not available');
    }

    console.log('3. Reading back from AsyncStorage...');
    const readToken = await storage.getItem('userToken');
    const readUser = await storage.getItem('userData');

    console.log('4. Results:');
    console.log('  - Token match:', readToken === testToken ? '✓ PASS' : '✗ FAIL');
    console.log('  - User match:', readUser === testUser ? '✓ PASS' : '✗ FAIL');

    console.log('======================================\n');
  },
};

// Make it globally available for easy console access
if (typeof global !== 'undefined') {
  (global as any).storageDebug = storageDebug;
}
