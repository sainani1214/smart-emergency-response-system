import AsyncStorage from '@react-native-async-storage/async-storage';

const isStorageReady = () => {
  return Boolean(AsyncStorage && typeof AsyncStorage.getItem === 'function');
};

const ensureStorage = () => {
  if (!isStorageReady()) {
    throw new Error('Secure local storage is unavailable in this build. Restart Expo and rebuild the app.');
  }
};

export const storage = {
  async getItem(key: string) {
    ensureStorage();
    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string) {
    ensureStorage();
    return AsyncStorage.setItem(key, value);
  },

  async removeItem(key: string) {
    ensureStorage();
    return AsyncStorage.removeItem(key);
  },

  isAvailable() {
    return isStorageReady();
  },

  async setItemIfAvailable(key: string, value: string) {
    if (!isStorageReady()) {
      return false;
    }
    await AsyncStorage.setItem(key, value);
    return true;
  },
};
