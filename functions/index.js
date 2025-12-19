/**
 * Firebase Cloud Functions for BilardoSkor
 * 
 * Bu dosya notification_queue koleksiyonunu dinler ve
 * maç başladığında oyunculara push notification gönderir.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/**
 * notification_queue koleksiyonuna yeni döküman eklendiğinde tetiklenir
 * Maç başlangıç bildirimi gönderir
 */
exports.sendMatchNotification = functions.firestore
  .document('notification_queue/{notificationId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const notificationId = context.params.notificationId;
    
    console.log('📩 Bildirim işleniyor:', notificationId, data);
    
    // Sadece MATCH_STARTED tipindeki bildirimleri işle
    if (data.type !== 'MATCH_STARTED') {
      console.log('⏭️ Bildirim tipi MATCH_STARTED değil, atlanıyor');
      return null;
    }
    
    // Zaten işlenmişse atla
    if (data.status !== 'pending') {
      console.log('⏭️ Bildirim zaten işlenmiş:', data.status);
      return null;
    }
    
    const { notifyPlayerIds, matchInfo, tableId, startedBy } = data;
    
    if (!notifyPlayerIds || notifyPlayerIds.length === 0) {
      console.log('⏭️ Bildirim gönderilecek oyuncu yok');
      await snap.ref.update({ status: 'skipped', reason: 'no_recipients' });
      return null;
    }
    
    // Oyuncuların FCM token'larını al
    const tokens = [];
    const tokenPromises = notifyPlayerIds.map(async (playerId) => {
      try {
        const tokenDoc = await db.collection('user_fcm_tokens').doc(playerId).get();
        if (tokenDoc.exists) {
          const tokenData = tokenDoc.data();
          if (tokenData.token) {
            tokens.push({
              playerId,
              token: tokenData.token
            });
          }
        }
      } catch (error) {
        console.error(`Token alınamadı (${playerId}):`, error);
      }
    });
    
    await Promise.all(tokenPromises);
    
    if (tokens.length === 0) {
      console.log('⏭️ FCM token bulunamadı');
      await snap.ref.update({ status: 'skipped', reason: 'no_tokens' });
      return null;
    }
    
    // Bildirim mesajını hazırla
    const players = matchInfo?.players || ['Oyuncu 1', 'Oyuncu 2'];
    const mode = matchInfo?.mode || '2vs2';
    
    const title = '🎱 Maça Davet Edildiniz!';
    const body = `${players[0]} vs ${players[1]} maçı başladı. Maçı takip edip yönetebilirsiniz.`;
    
    // Her token için bildirim gönder
    const sendPromises = tokens.map(async ({ playerId, token }) => {
      try {
        const message = {
          token,
          notification: {
            title,
            body
          },
          data: {
            type: 'MATCH_STARTED',
            tableId: tableId || 'table_1',
            matchId: data.matchId || notificationId,
            click_action: 'OPEN_MATCH_CONTROLLER'
          },
          webpush: {
            fcmOptions: {
              link: `https://3cscore.com/match/${tableId || 'table_1'}`
            },
            notification: {
              icon: '/logo192.png',
              badge: '/logo192.png',
              vibrate: [200, 100, 200],
              requireInteraction: true,
              actions: [
                {
                  action: 'open',
                  title: 'Maça Git'
                },
                {
                  action: 'dismiss',
                  title: 'Kapat'
                }
              ]
            }
          }
        };
        
        const response = await admin.messaging().send(message);
        console.log(`✅ Bildirim gönderildi (${playerId}):`, response);
        return { playerId, success: true, response };
      } catch (error) {
        console.error(`❌ Bildirim gönderilemedi (${playerId}):`, error);
        return { playerId, success: false, error: error.message };
      }
    });
    
    const results = await Promise.all(sendPromises);
    
    // Sonuçları kaydet
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    await snap.ref.update({
      status: 'completed',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      results: {
        total: tokens.length,
        success: successCount,
        failed: failCount,
        details: results
      }
    });
    
    console.log(`📤 Bildirim işlemi tamamlandı: ${successCount} başarılı, ${failCount} başarısız`);
    return null;
  });

/**
 * Eski bildirimleri temizle (7 günden eski)
 * Her gün saat 03:00'te çalışır
 */
exports.cleanupOldNotifications = functions.pubsub
  .schedule('0 3 * * *')
  .timeZone('Europe/Istanbul')
  .onRun(async (context) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    const oldNotifications = await db.collection('notification_queue')
      .where('createdAt', '<', cutoffDate)
      .get();
    
    const batch = db.batch();
    oldNotifications.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`🧹 ${oldNotifications.size} eski bildirim silindi`);
    return null;
  });

/**
 * Firebase ID Token Doğrulama
 * 3cscore.com'dan gelen kullanıcıların token'ını doğrular
 */
exports.verifyToken = functions.https.onCall(async (data, context) => {
  const { idToken } = data;
  
  if (!idToken) {
    throw new functions.https.HttpsError('invalid-argument', 'Token gerekli');
  }
  
  try {
    // Token'ı doğrula
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    console.log('✅ Token doğrulandı:', decodedToken.uid);
    
    return {
      valid: true,
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || null
    };
  } catch (error) {
    console.error('❌ Token doğrulama hatası:', error.message);
    throw new functions.https.HttpsError('unauthenticated', 'Geçersiz token');
  }
});

/**
 * HTTP endpoint - CORS destekli token doğrulama
 * Frontend'den doğrudan çağrılabilir
 */
exports.verifyTokenHttp = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  const idToken = req.body?.idToken || req.query?.idToken;
  
  if (!idToken) {
    res.status(400).json({ valid: false, error: 'Token gerekli' });
    return;
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    console.log('✅ Token doğrulandı:', decodedToken.uid);
    
    res.json({
      valid: true,
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || null
    });
  } catch (error) {
    console.error('❌ Token doğrulama hatası:', error.message);
    res.status(401).json({ valid: false, error: 'Geçersiz token' });
  }
});
