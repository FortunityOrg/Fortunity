import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  View, Text,
  TouchableOpacity, FlatList, StyleSheet, 
  Alert, Modal, TextInput, ActivityIndicator, ScrollView, 
  Keyboard, TouchableWithoutFeedback, BackHandler, LayoutAnimation, Platform, UIManager, Switch,KeyboardAvoidingView
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import Markdown from 'react-native-markdown-display';
import { getApiKeys } from './KeyStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaProvider} from 'react-native-safe-area-context';

// Android için LayoutAnimation aktivasyonu
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// --- APP CONTEXT (Kullanıcı Bilgileri ve Tema İçin) ---
const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState({
    name: '',
    surname: '',
    age: '',
    zodiac: '',
    job: '',
    gender: '', 
    extraInfo: ''
  });

  const [isDarkMode, setIsDarkMode] = useState(true);

  // Uygulama açılınca verileri yükle
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedProfile = await AsyncStorage.getItem('userProfile');
        const savedTheme = await AsyncStorage.getItem('isDarkMode');

        if (savedProfile) {
          setUserProfile(JSON.parse(savedProfile));
        }
        if (savedTheme !== null) {
          setIsDarkMode(JSON.parse(savedTheme));
        }
      } catch (error) {
        console.error("Ayarlar yüklenirken hata:", error);
      }
    };
    loadSettings();
  }, []);

  // Profil değişince kaydet
  useEffect(() => {
    const saveProfile = async () => {
      try {
        await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
      } catch (error) {
        console.error("Profil kaydedilemedi:", error);
      }
    };
    saveProfile();
  }, [userProfile]);

  // Tema değişince kaydet
  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
      } catch (error) {
        console.error("Tema kaydedilemedi:", error);
      }
    };
    saveTheme();
  }, [isDarkMode]);

  // Tema Renkleri
  const theme = {
    background: isDarkMode ? '#1a0029' : '#f0f0f0',
    text: isDarkMode ? '#d4af37' : '#4b0082',
    subText: isDarkMode ? '#aaa' : '#666',
    cardBg: isDarkMode ? '#330044' : '#e0e0e0',
    headerBg: isDarkMode ? '#1a0029' : '#ffffff',
    inputBg: isDarkMode ? '#2a1a35' : '#ffffff',
    inputText: isDarkMode ? '#ffffff' : '#000000',
    buttonBg: '#4b0082',
    buttonText: '#ffffff',
    borderColor: '#d4af37'
  };

  return (
    <AppContext.Provider value={{ userProfile, setUserProfile, isDarkMode, setIsDarkMode, theme }}>
      {children}
    </AppContext.Provider>
  );
};

// --- SABİTLER ---
const LOADING_MESSAGES = [
  "Yıldızlar senin için hizalanıyor...",
  "Küremdeki sisler yavaşça dağılıyor...",
  "Evrenin enerjisi kelimelere dökülüyor...",
  "Ruhlar rehberlik etmek için fısıldıyor...",
  "Kaderin çizgileri belirginleşiyor..."
];

const MAJOR_ARCANA = [
  "Joker", "Büyücü", "Azize", "İmparatoriçe", "İmparator", "Aziz", "Aşıklar", "Savaş Arabası",
  "Güç", "Ermiş", "Kader Çarkı", "Adalet", "Asılan Adam", "Ölüm", "Denge", "Şeytan",
  "Yıkılan Kule", "Yıldız", "Ay", "Güneş", "Mahkeme", "Dünya"
];
const SUITS = ["Değnek", "Kupa", "Kılıç", "Tılsım"];
const RANKS = ["As", "İkili", "Üçlü", "Dörtlü", "Beşli", "Altılı", "Yedili", "Sekizli", "Dokuzlu", "Onlu", "Prensi", "Şövalyesi", "Kraliçesi", "Kralı"];

let FULL_TAROT_DECK = [...MAJOR_ARCANA];
SUITS.forEach(suit => {
  RANKS.forEach(rank => { FULL_TAROT_DECK.push(`${suit} ${rank}`); });
});

const SUITS_PC = ["Sinek ♣️", "Maça ♠️", "Kupa ♥️", "Karo ♦️"];
const RANKS_PC = ["As", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Vale", "Kız", "Papaz"];

let FULL_PC_DECK = [];
SUITS_PC.forEach(suit => {
  RANKS_PC.forEach(rank => { FULL_PC_DECK.push(`${suit} ${rank}`); });
});

// --- API FONKSİYONU ---
const getFalYorumu = async (tur, veri, userProfile) => {
  try {
    // 1. Tüm anahtarları havuzdan çek (Sırasıyla 1, 2, 3...)
    const apiKeys = await getApiKeys();

    // 2. Kullanıcı Bilgilerini ve Prompt'u Hazırla (Bu kısım döngüden bağımsız sabit kalır)
    let userContextStr = "";
    if (userProfile) {
      userContextStr = `
      KULLANICI BİLGİLERİ (Yorumu buna göre kişiselleştir):
      - İsim Soyisim: ${userProfile.name} ${userProfile.surname}
      - Yaş: ${userProfile.age}
      - Burç: ${userProfile.zodiac}
      - Meslek: ${userProfile.job}
      - Cinsiyet: ${userProfile.gender}
      - Kullanıcı Hakkında Ekstra Not: "${userProfile.extraInfo}"
      
      Eğer kullanıcı ismi varsa ona ismiyle hitap et. Burç veya meslek bilgisi varsa yorumuna bu açıdan da değin.
      `;
    }

    const baseInstruction = `Sen 'Mistik Ana' adında, yüzyıllardır yaşayan, bilge falcısın. Mistik, emojili ve akıcı konuş. Tıbbi tavsiye verme.\n${userContextStr}`;
    let userMessage = "";
    
    const jsonInstruction = `
    CEVAP FORMATI:
    Cevabı SADECE aşağıdaki JSON formatında ver. Başka hiçbir sohbet metni veya markdown kodu (\`\`\`json gibi) ekleme. Sadece saf JSON ver.
    {
      "intro": "Kısa, mistik bir giriş cümlesi (Kullanıcının ismini biliyorsan kullan).",
      "summary": "Seçilen tüm kartlara, niyete ve kişinin özelliklerine dayanarak yapılan detaylı fal yorumu",
      "cards": [
        { "title": "Kart Adı", "content": "Bu kartın detaylı yorumu." },
        { "title": "Kart Adı", "content": "Bu kartın detaylı yorumu." },
        { "title": "Kart Adı", "content": "Bu kartın detaylı yorumu." }
      ]
    }
    `;

    if (tur === "tarot") {
      const kartlar = veri.cards.join(", ");
      const niyet = veri.intent;
      userMessage = `${baseInstruction}\n\nKullanıcı Tarot kartları: ${kartlar}. Niyet: "${niyet}". Bu kartları bu niyete göre yorumla.\n${jsonInstruction}`;
    } else if (tur === "iskambil") { 
      const kartlar = veri.cards.join(", ");
      const niyet = veri.intent;
      userMessage = `${baseInstruction}\n\nKullanıcı İskambil Falı (Playing Cards) için şu kartları seçti: ${kartlar}. Niyet: "${niyet}". Kartların renklerine ve sayılarına dikkat et.\n${jsonInstruction}`;
    } else if (tur === "ruya") {
      userMessage = `
        ${baseInstruction}
        herhangi bir {title: } , content , intro , {summary} gibi biçimlendirme şeyi yazmana gerek yok
        GÖREV: Aşağıdaki metni analiz et.
        KULLANICI METNİ: "${veri}"
        KURALLAR:
        1. Eğer metin anlamsızsa veya rüya ile alakasızsa (örn: "asdasf", "Naber"), ŞU CEVABI VER:
           "🔮 **Zihnin Çok Karışık...**\n\nKüremde sadece bulanık sisler görüyorum. Bu yazdıkların bir rüyaya benzemiyor. Lütfen bana gerçekten gördüğün rüyayı anlat."
        2. Eğer geçerli bir rüyaysa şu formatta yorumla:
           - Genel Enerji
           - Gelecek İşareti
           - Rüya Sembollerinin Anlamı
           - Mistik Tavsiye (Kişisel bilgilerine atıfta bulun)
      `;
    } else {
      userMessage = `${baseInstruction}\n\nGenel mistik yorum yap.`;
    }

    // 3. API RETRY (TEKRAR DENEME) MEKANİZMASI
    // Elimizdeki tüm anahtarları sırasıyla dener. Başarılı olana kadar devam eder.
    for (let i = 0; i < apiKeys.length; i++) {
        const currentKey = apiKeys[i];
        
        try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: userMessage }] }] })
              }
            );
        
            const result = await response.json();
            
            // Eğer model hata döndürdüyse (Overload vs.) veya cevap boşsa
            if (result.error) {
                console.log(`Key ${i+1} hatası: ${result.error.message}. Sıradaki key deneniyor...`);
                continue; // Döngüyü kırma, bir sonraki key'e geç
            }
            
            // Başarılı cevap geldiyse
            if (result.candidates && result.candidates.length > 0) {
                let rawText = result.candidates[0].content.parts[0].text;
                rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                return rawText; // Başarılı sonucu döndür ve fonksiyondan çık
            }
        
        } catch (fetchError) {
            console.log(`Key ${i+1} bağlantı hatası. Sıradaki key deneniyor...`);
            continue; // Ağ hatası vs. olursa sonraki key'e geç
        }
    }

    // Döngü bitti ve hala return yapılmadıysa tüm keyler başarısız olmuştur
    return JSON.stringify({ error: "Şu an evrenin enerjisi çok yoğun (Sunucular meşgul). Lütfen az sonra tekrar dene." });

  } catch (error) {
    return JSON.stringify({ error: "Bağlantı hatası." });
  }
};

// --- EKRANLAR ---

function SettingsScreen({ navigation }) {
  const { userProfile, setUserProfile, isDarkMode, setIsDarkMode, theme } = useContext(AppContext);
  
  const handleChange = (key, value) => {
    setUserProfile(prev => ({ ...prev, [key]: value }));
  };

  const GenderOption = ({ label, value }) => (
    <TouchableOpacity 
      style={[
        styles.genderButton, 
        { borderColor: theme.borderColor, backgroundColor: userProfile.gender === value ? theme.buttonBg : 'transparent' }
      ]}
      onPress={() => handleChange('gender', value)}
    >
      <Text style={{ color: userProfile.gender === value ? '#fff' : theme.text, fontWeight: 'bold' }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.background }]}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView 
        style={{ width: '100%' }} 
        // paddingBottom artırılarak klavye açıldığında en altta kaydırma payı bırakıldı
        contentContainerStyle={{ padding: 20, paddingBottom: 150 }} 
      >
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Uygulama Ayarları</Text>
        
        <View style={styles.settingRow}>
          <Text style={{ color: theme.text, fontSize: 18 }}>Karanlık Tema</Text>
          <Switch 
            value={isDarkMode} 
            onValueChange={setIsDarkMode}
            trackColor={{ false: "#767577", true: "#4b0082" }}
            thumbColor={isDarkMode ? "#d4af37" : "#f4f3f4"}
          />
        </View>

        <Text style={[styles.sectionHeader, { color: theme.text, marginTop: 30 }]}>Kişisel Bilgiler</Text>
        <Text style={{ color: theme.subText, marginBottom: 15 }}>Bu bilgiler fal yorumlarını kişiselleştirmek için kullanılacaktır, opsiyoneldir.</Text>

        <Text style={[styles.inputLabel, { color: theme.text }]}>İsim</Text>
        <TextInput 
          style={[styles.settingsInput, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.borderColor }]}
          value={userProfile.name}
          onChangeText={(t) => handleChange('name', t)}
        />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Soyisim</Text>
        <TextInput 
          style={[styles.settingsInput, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.borderColor }]}
          value={userProfile.surname}
          onChangeText={(t) => handleChange('surname', t)}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: '48%' }}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Yaş</Text>
                <TextInput 
                style={[styles.settingsInput, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.borderColor }]}
                value={userProfile.age}
                keyboardType='numeric'
                onChangeText={(t) => handleChange('age', t)}
                />
            </View>
            <View style={{ width: '48%' }}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Burç</Text>
                <TextInput 
                style={[styles.settingsInput, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.borderColor }]}
                value={userProfile.zodiac}
                onChangeText={(t) => handleChange('zodiac', t)}
                />
            </View>
        </View>

        <Text style={[styles.inputLabel, { color: theme.text }]}>Meslek</Text>
        <TextInput 
          style={[styles.settingsInput, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.borderColor }]}
          value={userProfile.job}
          onChangeText={(t) => handleChange('job', t)}
        />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Cinsiyet</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
          <GenderOption label="Erkek" value="Erkek" />
          <GenderOption label="Kadın" value="Kadın" />
        </View>
        <GenderOption label="Belirtmek İstemiyorum" value="Belirtilmedi" />

        <Text style={[styles.inputLabel, { color: theme.text, marginTop: 20 }]}>Hakkında Ekstra Bilgi (İsteğe Bağlı)</Text>
        <TextInput 
          style={[styles.settingsInput, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.borderColor, height: 100, textAlignVertical: 'top' }]}
          value={userProfile.extraInfo}
          placeholder="Yapay zekanın senin hakkında bilmesini istediğin özel durumlar..."
          placeholderTextColor={theme.subText}
          multiline
          onChangeText={(t) => handleChange('extraInfo', t)}
        />

        <TouchableOpacity style={[styles.homeButton, { marginTop: 30 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.homeButtonText}>Kaydet ve Dön</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HomeScreen({ navigation }) {
  const { theme } = useContext(AppContext);

  // Navigasyon başlığına ayarlar butonunu ekle
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ paddingRight: 15 }}>
          <Text style={{ fontSize: 24 }}>⚙️</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>🔮 Mistik Falcı</Text>
      <Text style={[styles.subtitle, { color: theme.subText }]}>Geleceğini Keşfet</Text>

      <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('Tarot')}>
        <Text style={styles.buttonText}>🃏 Tarot Falı Bak</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.menuButton, styles.playingCardButton]} onPress={() => navigation.navigate('PlayingCard')}>
        <Text style={styles.buttonText}>🂠 İskambil Falı</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.menuButton, styles.dreamButton]} onPress={() => navigation.navigate('Dream')}>
        <Text style={styles.buttonText}>🌙 Rüya Tabiri</Text>
      </TouchableOpacity>
    </View>
  );
}

function TarotScreen({ navigation }) {
  const { theme } = useContext(AppContext);
  useEffect(() => {
    const backAction = () => { navigation.popToTop(); return true; };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const [visibleCards, setVisibleCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [modalVisible, setModalVisible] = useState(true);
  const [selectedIntent, setSelectedIntent] = useState("");

  useEffect(() => { shuffleDeck(); }, []);

  const shuffleDeck = () => {
    const shuffled = [...FULL_TAROT_DECK].sort(() => 0.5 - Math.random());
    const selected12 = shuffled.slice(0, 12).map((name, index) => ({ id: index, name: name }));
    setVisibleCards(selected12);
  };

  const handleIntentSelection = (niyet) => {
    setSelectedIntent(niyet);
    setModalVisible(false);
  };

  const toggleCard = (cardId) => {
    if (selectedCards.includes(cardId) || selectedCards.length >= 3) return;
    const newSelection = [...selectedCards, cardId];
    setSelectedCards(newSelection);

    if (newSelection.length === 3) {
      setTimeout(() => {
        const cardNames = newSelection.map(id => visibleCards.find(c => c.id === id).name);
        navigation.navigate('Result', { 
          type: 'tarot', 
          data: { cards: cardNames, intent: selectedIntent }
        });
      }, 500);
    }
  };

  const renderCard = ({ item }) => {
    const isSelected = selectedCards.includes(item.id);
    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.cardBg }, isSelected && styles.selectedCard]} 
        disabled={selectedCards.length === 3}
        onPress={() => toggleCard(item.id)}>
        <Text style={isSelected ? styles.cardNameText : styles.cardQuestionText}>
          {isSelected ? item.name : "?"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!modalVisible && <Text style={[styles.subHeader, { color: theme.text }]}>Niyet: {selectedIntent}</Text>}
      <Text style={[styles.header, { color: theme.text }]}>
        {selectedCards.length < 3 ? `3 Kart Seç (${selectedCards.length}/3)` : "Yorumlanıyor..."}
      </Text>
      
      <FlatList 
        data={visibleCards} 
        renderItem={renderCard} 
        numColumns={3} 
        keyExtractor={item => item.id.toString()}
      />

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => navigation.goBack()}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.inputBg, borderColor: theme.borderColor }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Niyetini Belirle 🔮</Text>
            <Text style={styles.modalSubtitle}>Kartlara dokunmadan önce enerjini odakla...</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => handleIntentSelection('Aşk ve İlişkiler')}>
              <Text style={styles.modalButtonText}>❤️ Aşk Hayatı</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => handleIntentSelection('Kariyer ve Para')}>
              <Text style={styles.modalButtonText}>💰 Kariyer & Para</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#555'}]} onPress={() => handleIntentSelection('Genel Bakış')}>
              <Text style={styles.modalButtonText}>🔮 Genel Gidişat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Text style={styles.closeButtonText}>Vazgeç ve Dön</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PlayingCardScreen({ navigation }) {
  const { theme } = useContext(AppContext);
  useEffect(() => {
    const backAction = () => { navigation.popToTop(); return true; };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const [visibleCards, setVisibleCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [modalVisible, setModalVisible] = useState(true);
  const [selectedIntent, setSelectedIntent] = useState("");

  useEffect(() => { shuffleDeck(); }, []);

  const shuffleDeck = () => {
    const shuffled = [...FULL_PC_DECK].sort(() => 0.5 - Math.random());
    const selected12 = shuffled.slice(0, 12).map((name, index) => ({ id: index, name: name }));
    setVisibleCards(selected12);
  };

  const handleIntentSelection = (niyet) => {
    setSelectedIntent(niyet);
    setModalVisible(false);
  };

  const toggleCard = (cardId) => {
    if (selectedCards.includes(cardId) || selectedCards.length >= 3) return;
    const newSelection = [...selectedCards, cardId];
    setSelectedCards(newSelection);

    if (newSelection.length === 3) {
      setTimeout(() => {
        const cardNames = newSelection.map(id => visibleCards.find(c => c.id === id).name);
        navigation.navigate('Result', { 
          type: 'iskambil', 
          data: { cards: cardNames, intent: selectedIntent }
        });
      }, 500);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!modalVisible && <Text style={[styles.subHeader, { color: theme.text }]}>Niyet: {selectedIntent}</Text>}
      <Text style={[styles.header, { color: theme.text }]}>
        {selectedCards.length < 3 ? `3 Kart Seç (${selectedCards.length}/3)` : "Yorumlanıyor..."}
      </Text>
      <FlatList 
        data={visibleCards} 
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.playingCardBox, selectedCards.includes(item.id) && styles.selectedPlayingCard]} 
            disabled={selectedCards.length === 3}
            onPress={() => toggleCard(item.id)}>
            <Text style={selectedCards.includes(item.id) ? styles.playingCardNameText : styles.cardQuestionText}>
              {selectedCards.includes(item.id) ? item.name : "?"}
            </Text>
          </TouchableOpacity>
        )} 
        numColumns={3} 
        keyExtractor={item => item.id.toString()}
      />

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => navigation.goBack()}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.inputBg, borderColor: theme.borderColor }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>İskambil Niyeti ♣️</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => handleIntentSelection('Aşk ve İlişkiler')}>
              <Text style={styles.modalButtonText}>❤️ Aşk Hayatı</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => handleIntentSelection('Kariyer ve Para')}>
              <Text style={styles.modalButtonText}>💰 Kariyer & Para</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#555'}]} onPress={() => handleIntentSelection('Genel Bakış')}>
              <Text style={styles.modalButtonText}>🔮 Genel Gidişat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Text style={styles.closeButtonText}>Vazgeç ve Dön</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DreamScreen({ navigation }) {
  const { theme } = useContext(AppContext);
  useEffect(() => {
    const backAction = () => { navigation.popToTop(); return true; };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const [dreamText, setDreamText] = useState("");

  const handleYorumla = () => {
    const temizMetin = dreamText.trim();
    if (temizMetin.length < 10) {
      Alert.alert("Çok Kısa!", "Rüyalar detaylarda gizlidir. Lütfen rüyanı en az 1-2 cümleyle anlat.");
      return;
    }
    navigation.navigate('Result', { type: 'ruya', data: temizMetin });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <View style={{ width: '100%', padding: 20, alignItems: 'center' }}>
            <Text style={[styles.header, { color: theme.text }]}>Rüyanı Anlat 🌙</Text>
            <Text style={[styles.subHeader, { color: theme.subText }]}>Bilinçaltının kapılarını aralayalım...</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.borderColor }]}
              placeholder="Dün gece rüyamda..."
              placeholderTextColor={theme.subText}
              multiline
              value={dreamText}
              onChangeText={setDreamText}
            />
            <TouchableOpacity style={styles.menuButton} onPress={handleYorumla}>
              <Text style={styles.buttonText}>Tabir Et 🔮</Text>
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

function ResultScreen({ navigation, route }) {
  const { type, data } = route.params;
  const { userProfile, theme } = useContext(AppContext); // Kullanıcı profilini çek
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState("");
  const [jsonResult, setJsonResult] = useState(null); 
  const [expandedCardIndex, setExpandedCardIndex] = useState(null); 
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);

  useEffect(() => {
    const backAction = () => { navigation.popToTop(); return true; };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[index]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);
    
  const selectedCards = (type === 'tarot' || type === 'iskambil') ? data.cards : [];

  useEffect(() => {
    // API çağrısına userProfile'ı da ekle
    getFalYorumu(type, data, userProfile).then((response) => {
      if (type === 'tarot' || type === 'iskambil') {
        try {
          const parsed = JSON.parse(response);
          if (parsed.error) {
             setResult("🔮 Enerjiler tıkalı... (" + parsed.error + ")");
          } else {
             setJsonResult(parsed);
          }
        } catch (e) {
          setResult(response);
        }
      } else {
        setResult(response);
      }
      setLoading(false);
    });
  }, []);

  const toggleAccordion = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedCardIndex === index) {
      setExpandedCardIndex(null); 
    } else {
      setExpandedCardIndex(index); 
    }
  };

  // Markdown stillerini temaya göre güncelle
  const dynamicMarkdownStyles = { 
    body: { color: theme.text, fontSize: 16, lineHeight: 26 },
    heading1: { color: theme.text, fontSize: 24, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
    heading2: { color: theme.text, fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
    strong: { color: theme.borderColor, fontWeight: 'bold' },
    paragraph: { marginBottom: 15 },
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {(type === 'tarot' || type === 'iskambil') && (
        <View style={[styles.cardsContainer, { backgroundColor: theme.inputBg, borderBottomColor: theme.borderColor }]}>
          <Text style={[styles.cardsTitle, { color: theme.text }]}>Seçtiğin Kartlar</Text>
          <View style={styles.cardsRow}>
            {selectedCards.map((cardName, index) => (
              <View key={index} style={[styles.miniCard, { backgroundColor: theme.borderColor }]}>
                <Text style={styles.miniCardText}>{cardName}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d4af37" />
          <Text style={[styles.loadingText, { color: theme.text }]}>Enerjiler okunuyor...</Text>
          <Text style={[styles.loadingSubText, { color: theme.subText }]}>{loadingMsg} 🔮</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.resultScroll}>
          {jsonResult ? (
             <View>
                <Text style={[styles.jsonIntro, { color: theme.text }]}>{jsonResult.intro}</Text>
                
                <Text style={[styles.sectionHeader, { color: theme.text, borderBottomColor: theme.subText }]}> FAL YORUMU </Text>
                <Markdown style={dynamicMarkdownStyles}>{jsonResult.summary}</Markdown>

                <Text style={[styles.sectionHeader, { color: theme.text, borderBottomColor: theme.subText }]}> KART YORUMLARI </Text>
                {jsonResult.cards && jsonResult.cards.map((card, index) => (
                  <View key={index} style={[styles.accordionContainer, { borderColor: theme.borderColor }]}>
                    <TouchableOpacity 
                      style={[
                          styles.accordionHeader, 
                          { backgroundColor: theme.cardBg }, 
                          expandedCardIndex === index && styles.accordionHeaderActive
                      ]} 
                      onPress={() => toggleAccordion(index)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.accordionTitle, 
                        // DÜZELTME BURADA YAPILDI: Eğer kart açıksa (expanded) yazı rengini her zaman Gold yap.
                        { color: expandedCardIndex === index ? '#d4af37' : theme.text }
                      ]}>
                        {expandedCardIndex === index ? "▼" : "▶"} {card.title}
                      </Text>
                    </TouchableOpacity>
                    {expandedCardIndex === index && (
                      <View style={[styles.accordionContent, { backgroundColor: theme.inputBg }]}>
                        <Markdown style={dynamicMarkdownStyles}>{card.content}</Markdown>
                      </View>
                    )}
                  </View>
                ))}
             </View>
          ) : (
            <Markdown style={dynamicMarkdownStyles}>{result}</Markdown>
          )}

          <TouchableOpacity style={[styles.homeButton, { borderColor: theme.borderColor }]} onPress={() => navigation.popToTop()}>
            <Text style={styles.homeButtonText}>🏠 Ana Menüye Dön</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const Stack = createNativeStackNavigator();

function AppNavigation() {
    const { theme } = useContext(AppContext);

    return (
        <NavigationContainer>
        <StatusBar style={theme.background === '#1a0029' ? "light" : "dark"} />
        <Stack.Navigator 
            screenOptions={({ navigation }) => ({
            headerStyle: { backgroundColor: theme.headerBg },
            headerTintColor: theme.text,
            headerTitleStyle: { fontWeight: 'bold' },
            headerBackVisible: false,
            headerLeft: () => (
                <TouchableOpacity 
                onPress={() => navigation.popToTop()} 
                style={{ paddingLeft: 10, paddingRight: 20, paddingVertical: 5 }}
                >
                <Text style={{ color: theme.text, fontSize: 28, fontWeight: 'bold' }}>←</Text>
                </TouchableOpacity>
            ),
            })}
        >
            <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ 
                title: 'Ana Sayfa', 
                headerLeft: () => null,
                gestureEnabled: false
            }} 
            />
            <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={({ navigation }) => ({ 
                title: 'Ayarlar', 
                headerLeft: () => (
                    <TouchableOpacity 
                      onPress={() => navigation.goBack()} 
                      style={{ paddingLeft: 10, paddingRight: 20 }} // Boşluk için paddingRight eklendi
                    >
                        <Text style={{ color: theme.text, fontSize: 28, fontWeight: 'bold' }}>←</Text>
                    </TouchableOpacity>
                )
            })} 
            />
            <Stack.Screen 
            name="Tarot" 
            component={TarotScreen} 
            options={{ title: 'Tarot Falı', gestureEnabled: false }} 
            />
            <Stack.Screen 
            name="PlayingCard" 
            component={PlayingCardScreen} 
            options={{ title: 'İskambil Falı', gestureEnabled: false }} 
            />
            <Stack.Screen name="Dream" component={DreamScreen} options={{ title: 'Rüya Tabiri' }} />
            <Stack.Screen 
            name="Result" 
            component={ResultScreen} 
            options={{ title: 'Falın Çıktı', gestureEnabled: false }} 
            />
        </Stack.Navigator>
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <AppProvider>
            <AppNavigation />
        </AppProvider>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0029', alignItems: 'center' },
  title: { fontSize: 32, color: '#d4af37', fontWeight: 'bold', marginBottom: 10, marginTop: 100 },
  subtitle: { fontSize: 16, color: '#aaa', marginBottom: 50 },
  menuButton: { backgroundColor: '#4b0082', padding: 20, borderRadius: 15, width: '80%', marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#d4af37' },
  playingCardButton: { backgroundColor: '#3e2723' }, 
  dreamButton: { backgroundColor: '#2c3e50' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  header: { color: 'white', fontSize: 22, marginBottom: 10, marginTop: 20 },
  subHeader: { color: '#d4af37', fontSize: 16, marginBottom: 5, marginTop: 30, fontStyle: 'italic' },
  card: { width: 95, height: 140, backgroundColor: '#330044', margin: 6, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#555', padding: 5 },
  selectedCard: { backgroundColor: '#d4af37', borderColor: 'white' },
  cardQuestionText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  cardNameText: { color: '#1a0029', fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  playingCardBox: { width: 95, height: 140, backgroundColor: '#1b5e20', margin: 6, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#81c784', padding: 5 },
  selectedPlayingCard: { backgroundColor: '#fff', borderColor: '#d4af37' },
  playingCardNameText: { color: '#000', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }, 
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalContent: { width: '85%', backgroundColor: '#2a1a35', borderRadius: 20, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: '#d4af37' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#d4af37', marginBottom: 10 },
  modalSubtitle: { fontSize: 15, color: '#ccc', marginBottom: 25, textAlign: 'center' },
  modalButton: { backgroundColor: '#4b0082', padding: 15, borderRadius: 12, width: '100%', marginBottom: 12, alignItems: 'center' },
  modalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  closeButton: { marginTop: 15 },
  closeButtonText: { color: '#aaa', textDecorationLine: 'underline' },
  input: { backgroundColor: '#2a1a35', color: 'white', padding: 15, borderRadius: 15, height: 180, textAlignVertical: 'top', fontSize: 16, borderWidth: 1, borderColor: '#4b0082', width: '100%', marginBottom: 20 },
  cardsContainer: { backgroundColor: '#2a1a35', padding: 15, borderBottomWidth: 1, borderBottomColor: '#d4af37', paddingTop: 20, width: '100%' },
  cardsTitle: { color: '#d4af37', textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 10 },
  cardsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  miniCard: { width: 90, height: 60, backgroundColor: '#d4af37', borderRadius: 8, justifyContent: 'center', alignItems: 'center', padding: 5 },
  miniCardText: { color: '#1a0029', fontWeight: 'bold', textAlign: 'center', fontSize: 12 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { color: 'white', marginTop: 20, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  loadingSubText: { color: '#aaa', marginTop: 10, fontSize: 14, fontStyle: 'italic' },
  resultScroll: { padding: 20, paddingBottom: 50, width: '100%' },
  homeButton: { backgroundColor: '#4b0082', padding: 15, borderRadius: 15, marginTop: 30, marginBottom: 40, alignItems: 'center', borderWidth: 1, borderColor: '#d4af37' },
  homeButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  jsonIntro: { color: '#fff', fontSize: 18, fontStyle: 'italic', marginBottom: 20, textAlign: 'center' },
  sectionHeader: { color: '#d4af37', fontSize: 20, fontWeight: 'bold', marginTop: 15, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#555', paddingBottom: 5 },
  accordionContainer: { marginBottom: 10, borderWidth: 1, borderColor: '#4b0082', borderRadius: 10, overflow: 'hidden' },
  accordionHeader: { backgroundColor: '#330044', padding: 15 },
  accordionHeaderActive: { backgroundColor: '#4b0082' },
  accordionTitle: { color: '#d4af37', fontSize: 16, fontWeight: 'bold' },
  accordionContent: { backgroundColor: '#2a1a35', padding: 15 },
  // YENİ AYARLAR STİLİ
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  settingsInput: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 15, fontSize: 16 },
  inputLabel: { fontWeight: 'bold', marginBottom: 5, fontSize: 14 },
  genderButton: { flex: 1, alignItems: 'center', padding: 10, borderWidth: 1, borderRadius: 10, marginHorizontal: 2 }
});