
// Türkçe sayı kelimelerini rakama çevir - ÇOK KAPSAMLI versiyon
export const parseTurkishNumber = (text) => {
    if (!text) return null;

    // Normalize: küçük harf, fazla boşlukları temizle
    const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');

    // console.log('🔢 Sayı parse ediliyor:', text, '→ normalized:', normalized);

    // 1. Direkt rakam varsa parse et (öncelikli)
    const onlyDigits = normalized.replace(/[^0-9]/g, '');
    if (onlyDigits.length > 0) {
        const directNumber = parseInt(onlyDigits);
        if (!isNaN(directNumber) && directNumber > 0 && directNumber <= 100) {
            // console.log('🔢 Direkt rakam bulundu:', directNumber);
            return directNumber;
        }
    }

    // 2. ONLAR basamağı haritası - tüm olası yanlış algılamalar
    const tensMap = {
        // 10
        'on': 10,
        // 20 - yirmi varyasyonları
        'yirmi': 20, 'yirmı': 20, 'yırmi': 20, 'yermi': 20, 'yirmiy': 20, 'yirme': 20,
        // 30 - otuz varyasyonları (en problematik)
        'otuz': 30, 'otus': 30, 'oduz': 30, 'otüz': 30, 'otuş': 30, 'odus': 30,
        'otız': 30, 'otos': 30, 'otu': 30, 'otu z': 30,
        // 40 - kırk varyasyonları
        'kırk': 40, 'kirk': 40, 'kırg': 40, 'kork': 40, 'kurk': 40, 'kurg': 40, 'gırk': 40,
        // 50 - elli varyasyonları
        'elli': 50, 'eli': 50, 'elle': 50, 'elı': 50,
        // 60 - altmış varyasyonları
        'altmış': 60, 'altmis': 60, 'altmiş': 60, 'altımış': 60, 'altmıs': 60,
        // 70 - yetmiş varyasyonları
        'yetmiş': 70, 'yetmis': 70, 'yetmıs': 70,
        // 80 - seksen varyasyonları
        'seksen': 80, 'segsen': 80, 'seksan': 80,
        // 90 - doksan varyasyonları
        'doksan': 90, 'doxan': 90, 'doksen': 90
    };

    // 3. BİRLER basamağı haritası - tüm olası yanlış algılamalar
    const onesMap = {
        'bir': 1, 'bır': 1, 'bi': 1,
        'iki': 2, 'ikı': 2, 'ike': 2,
        'üç': 3, 'uc': 3, 'üc': 3, 'uç': 3, 'üs': 3, 'us': 3,
        'dört': 4, 'dort': 4, 'dord': 4, 'dörd': 4,
        'beş': 5, 'bes': 5, 'besh': 5, 'beşi': 5, 'beşş': 5,
        'altı': 6, 'alti': 6, 'alte': 6,
        'yedi': 7, 'yedı': 7,
        'sekiz': 8, 'segiz': 8, 'sekis': 8,
        'dokuz': 9, 'doquz': 9, 'dokus': 9
    };

    // 4. TAM SAYI haritası - 1'den 100'e kadar tüm sayılar
    const fullNumberMap = {};

    // 1-10 arası
    Object.keys(onesMap).forEach(k => { fullNumberMap[k] = onesMap[k]; });
    fullNumberMap['on'] = 10;

    // 11-19: on + birler
    Object.keys(onesMap).forEach(onesWord => {
        const val = 10 + onesMap[onesWord];
        fullNumberMap['on' + onesWord] = val;
        fullNumberMap['on ' + onesWord] = val;
    });

    // 20-99: onlar + birler
    Object.keys(tensMap).forEach(tensWord => {
        const tensVal = tensMap[tensWord];
        fullNumberMap[tensWord] = tensVal; // Sadece onlar (20, 30, 40...)
        Object.keys(onesMap).forEach(onesWord => {
            const val = tensVal + onesMap[onesWord];
            fullNumberMap[tensWord + onesWord] = val; // Bitişik
            fullNumberMap[tensWord + ' ' + onesWord] = val; // Boşluklu
        });
    });

    // 100
    fullNumberMap['yüz'] = 100;
    fullNumberMap['yuz'] = 100;

    // 5. Direkt eşleşme dene
    if (fullNumberMap[normalized]) {
        // console.log('🔢 Direkt eşleşme:', fullNumberMap[normalized]);
        return fullNumberMap[normalized];
    }

    // 6. Boşluksuz birleşik aramayı dene ("otuzbeş" → "otuz" + "beş")
    const noSpace = normalized.replace(/\s/g, '');
    if (fullNumberMap[noSpace]) {
        // console.log('🔢 Boşluksuz eşleşme:', fullNumberMap[noSpace]);
        return fullNumberMap[noSpace];
    }

    // 7. Kelime bazlı ayrıştırma ("otuz beş" → 30 + 5)
    const words = normalized.split(' ');
    if (words.length >= 2) {
        // Son 2 kelimeyi dene
        for (let i = 0; i < words.length - 1; i++) {
            const possibleTens = words[i];
            const possibleOnes = words[i + 1];

            // Onlar + birler
            const tensVal = tensMap[possibleTens];
            const onesVal = onesMap[possibleOnes];

            if (tensVal && onesVal) {
                const result = tensVal + onesVal;
                // console.log('🔢 Kelime birleşim:', possibleTens, '+', possibleOnes, '=', result);
                return result;
            }

            // Sadece onlar
            if (tensVal && !onesVal) {
                // console.log('🔢 Sadece onlar:', tensVal);
                return tensVal;
            }
        }
    }

    // 8. Fuzzy eşleştirme - Levenshtein ile
    let bestMatch = null;
    let bestScore = 3; // Max 2 hata toleransı

    for (const [numWord, numVal] of Object.entries(fullNumberMap)) {
        const dist = levenshteinDistance(noSpace, numWord.replace(/\s/g, ''));
        if (dist < bestScore) {
            bestScore = dist;
            bestMatch = numVal;
        }
    }

    if (bestMatch !== null) {
        // console.log('🔢 Fuzzy eşleşme (mesafe=' + bestScore + '):', bestMatch);
        return bestMatch;
    }

    // 9. Kısmi eşleşme - metin içinde sayı kelimesi ara
    for (const [numWord, numVal] of Object.entries(tensMap)) {
        if (normalized.includes(numWord)) {
            // Onlar bulundu, birler var mı?
            const afterTens = normalized.split(numWord)[1] || '';
            for (const [onesWord, onesVal] of Object.entries(onesMap)) {
                if (afterTens.includes(onesWord)) {
                    const result = numVal + onesVal;
                    // console.log('🔢 Kısmi eşleşme:', numWord, '+', onesWord, '=', result);
                    return result;
                }
            }
            // Sadece onlar
            // console.log('🔢 Kısmi onlar:', numVal);
            return numVal;
        }
    }

    // 10. Sadece birler basamağı
    for (const [onesWord, onesVal] of Object.entries(onesMap)) {
        if (normalized === onesWord || normalized.includes(onesWord)) {
            // console.log('🔢 Birler bulundu:', onesVal);
            return onesVal;
        }
    }

    // console.log('🔢 Sayı bulunamadı:', text);
    return null;
};

// Basit Levenshtein distance hesaplama
export const levenshteinDistance = (str1, str2) => {
    const m = str1.length;
    const n = str2.length;
    if (m === 0) return n;
    if (n === 0) return m;

    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[m][n];
};

// Türkçe karakter normalizasyonu (fuzzy matching için)
export const normalizeText = (text) => {
    if (!text) return '';
    return text
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'i')
        .replace(/Ğ/g, 'g')
        .replace(/Ü/g, 'u')
        .replace(/Ş/g, 's')
        .replace(/Ö/g, 'o')
        .replace(/Ç/g, 'c')
        .trim();
};

// İsim benzerlik skoru hesapla (fuzzy matching)
export const calculateSimilarity = (str1, str2) => {
    const s1 = normalizeText(str1);
    const s2 = normalizeText(str2);

    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.85;

    // Kelime bazlı eşleştirme - ad veya soyad ayrı eşleşebilir
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);

    // Herhangi bir kelime tam eşleşiyorsa yüksek skor
    for (const w1 of words1) {
        for (const w2 of words2) {
            if (w1.length > 2 && w2.length > 2) {
                if (w1 === w2) return 0.8;
                if (w1.includes(w2) || w2.includes(w1)) return 0.7;
            }
        }
    }

    // Levenshtein distance hesapla
    const m = s1.length;
    const n = s2.length;
    if (m === 0) return n === 0 ? 1 : 0;
    if (n === 0) return 0;

    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }

    const distance = dp[m][n];
    const maxLen = Math.max(m, n);
    return 1 - distance / maxLen;
};

// Gelişmiş isim eşleştirme - alias desteği + birden fazla strateji
export const findBestPlayerMatches = (spokenText, names) => {
    const spoken = normalizeText(spokenText);
    const spokenLower = spokenText.toLowerCase().trim();
    const spokenWords = spoken.split(/\s+/).filter(w => w.length > 1);

    // console.log('🔍 Aranan:', spokenText, '→ normalize:', spoken, '→ kelimeler:', spokenWords);

    const results = names.map(player => {
        const fullName = normalizeText(player.fullName);
        const nameWords = fullName.split(/\s+/);

        // Strateji 0: ALIAS eşleştirme (en yüksek öncelik)
        let aliasScore = 0;
        const playerAliases = player.aliases || [];
        for (const alias of playerAliases) {
            const normalizedAlias = normalizeText(alias);
            // Tam alias eşleşmesi
            if (spoken === normalizedAlias || spokenLower === alias.toLowerCase()) {
                aliasScore = 1.0;
                // console.log(`  ✓ ${player.fullName}: ALIAS TAM EŞLEŞMESİ: "${alias}"`);
                break;
            }
            // Alias içeriyor
            if (spoken.includes(normalizedAlias) || normalizedAlias.includes(spoken)) {
                aliasScore = Math.max(aliasScore, 0.9);
            }
            // Alias benzeri (Levenshtein)
            const aliasSim = calculateSimilarity(spokenText, alias);
            if (aliasSim > 0.7) {
                aliasScore = Math.max(aliasScore, aliasSim);
            }
        }

        // Strateji 1: Tam isim benzerliği
        const fullSimilarity = calculateSimilarity(spokenText, player.fullName);

        // Strateji 2: Kelime bazlı eşleştirme
        let wordMatchScore = 0;
        let matchedWords = 0;

        for (const spokenWord of spokenWords) {
            let bestWordMatch = 0;

            // İsim kelimeleri + alias'ları da kontrol et
            const allNameWords = [...nameWords, ...playerAliases.map(a => normalizeText(a))];

            for (const nameWord of allNameWords) {
                // Tam eşleşme
                if (spokenWord === nameWord) {
                    bestWordMatch = Math.max(bestWordMatch, 1);
                }
                // Başlangıç eşleşmesi (en az 3 karakter)
                else if (spokenWord.length >= 3 && nameWord.startsWith(spokenWord)) {
                    bestWordMatch = Math.max(bestWordMatch, 0.9);
                }
                else if (nameWord.length >= 3 && spokenWord.startsWith(nameWord)) {
                    bestWordMatch = Math.max(bestWordMatch, 0.9);
                }
                // İçerme
                else if (spokenWord.length >= 3 && nameWord.includes(spokenWord)) {
                    bestWordMatch = Math.max(bestWordMatch, 0.85);
                }
                else if (nameWord.length >= 3 && spokenWord.includes(nameWord)) {
                    bestWordMatch = Math.max(bestWordMatch, 0.85);
                }
                // Levenshtein benzerliği
                else {
                    const wordSim = calculateSimilarity(spokenWord, nameWord);
                    if (wordSim > 0.55) {
                        bestWordMatch = Math.max(bestWordMatch, wordSim * 0.8);
                    }
                }
            }
            if (bestWordMatch > 0.4) {
                matchedWords++;
                wordMatchScore += bestWordMatch;
            }
        }

        // Kelime skoru ortalaması
        const avgWordScore = spokenWords.length > 0 ? wordMatchScore / spokenWords.length : 0;

        // Final skor: en iyi stratejiyi seç (alias en yüksek öncelik)
        const finalScore = Math.max(aliasScore, fullSimilarity, avgWordScore);

        if (finalScore > 0.3) {
            // console.log(`  → ${player.fullName}: alias=${aliasScore.toFixed(2)}, fullSim=${fullSimilarity.toFixed(2)}, wordScore=${avgWordScore.toFixed(2)}, final=${finalScore.toFixed(2)}`);
        }

        return {
            ...player,
            similarity: finalScore,
            matchedWords,
            aliasMatch: aliasScore > 0.5
        };
    });

    return results
        .filter(p => p.similarity > 0.20) // Daha düşük eşik
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 8);
};

// Fonetik benzerlik - Türkçe ses tanıma hatalarını düzelt
export const phoneticSimilarity = (spoken, target) => {
    // Yaygın yanlış algılama haritası
    const phoneticMap = {
        // Sesli harfler
        'a': ['e', 'ı'], 'e': ['a', 'i'], 'i': ['ı', 'e', 'y'], 'ı': ['i', 'a'],
        'o': ['u', 'ö'], 'ö': ['o', 'ü'], 'u': ['o', 'ü'], 'ü': ['u', 'ö'],
        // Sessiz harfler
        'b': ['p', 'm'], 'c': ['j', 'ç'], 'ç': ['c', 'ş'], 'd': ['t'],
        'f': ['v'], 'g': ['k', 'ğ'], 'ğ': ['g', 'y'], 'h': [''],
        'j': ['c'], 'k': ['g', 'q'], 'l': ['r'], 'm': ['n', 'b'],
        'n': ['m'], 'p': ['b'], 'r': ['l'], 's': ['ş', 'z'],
        'ş': ['s', 'ç'], 't': ['d'], 'v': ['f', 'w'], 'y': ['i', 'j'],
        'z': ['s']
    };

    const s1 = normalizeText(spoken);
    const s2 = normalizeText(target);

    if (s1 === s2) return 1;

    // Her karakter için fonetik benzerlik hesapla
    let matches = 0;
    const maxLen = Math.max(s1.length, s2.length);
    const minLen = Math.min(s1.length, s2.length);

    for (let i = 0; i < minLen; i++) {
        const c1 = s1[i];
        const c2 = s2[i];
        if (c1 === c2) {
            matches += 1;
        } else if (phoneticMap[c1]?.includes(c2) || phoneticMap[c2]?.includes(c1)) {
            matches += 0.7; // Fonetik benzer
        }
    }

    return matches / maxLen;
};

// Gelişmiş isim eşleştirme - tüm alternatiflerle
export const findBestPlayerMatchesWithAlternatives = (alternatives, names) => {
    const allMatches = new Map(); // player.id -> best score

    for (const text of alternatives) {
        const matches = findBestPlayerMatches(text, names);
        for (const match of matches) {
            const existing = allMatches.get(match.id);
            if (!existing || match.similarity > existing.similarity) {
                allMatches.set(match.id, match);
            }
        }

        // Fonetik eşleştirme de yap
        for (const player of names) {
            const phonScore = phoneticSimilarity(text, player.fullName);
            if (phonScore > 0.5) {
                const existing = allMatches.get(player.id);
                const combinedScore = Math.max(phonScore * 0.9, existing?.similarity || 0);
                if (!existing || combinedScore > existing.similarity) {
                    allMatches.set(player.id, { ...player, similarity: combinedScore });
                }
            }
        }
    }

    return Array.from(allMatches.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 8);
};
