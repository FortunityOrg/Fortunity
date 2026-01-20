import * as SecureStore from 'expo-secure-store';

// --- API ANAHTAR HAVUZU ---
// Buraya sırasıyla 1., 2. ve 3. API Keylerini girmelisiniz.
const API_KEYS_POOL = [
  "",                   // 1. Ana Key 
  "",                   // 2. Yedek Key
  ""                    // 3. Yedek Key 
];

export const saveApiKey = async (value) => {
  try {
    await SecureStore.setItemAsync('user_api_key', value);
  } catch (error) {
    console.error("Key kaydetme hatası:", error);
  }
};

// Tek bir key getirmek yerine, sırayla denenecek tüm keyleri döndürür
export const getApiKeys = async () => {
  try {
    // Eğer kullanıcı özel bir key kaydettiyse, onu listenin en başına ekleyebiliriz
    // Veya sadece hardcoded havuzu kullanabiliriz.
    const savedKey = await SecureStore.getItemAsync('user_api_key');
    
    if (savedKey) {
      // Eğer kullanıcı elle key girdiyse onu en başa koy, diğerlerini yedeğe at
      return [savedKey, ...API_KEYS_POOL];
    }
    
    return API_KEYS_POOL;
  } catch (error) {
    console.error("Key getirme hatası:", error);
    return API_KEYS_POOL;
  }
};

// Eski uyumluluk için tek key getiren fonksiyon (Gerekirse diye bırakıldı)
export const getApiKey = async () => {
  const keys = await getApiKeys();
  return keys[0];
};