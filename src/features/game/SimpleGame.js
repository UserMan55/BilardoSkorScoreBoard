import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// TV için Ultra-Hafif Oyun Modu (v3 - Live Data)
function SimpleGame({
    player1Name: initialP1,
    player2Name: initialP2,
    tableId = 'table_1',
    onExit
}) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    // Firebase Dinleyici
    useEffect(() => {
        try {
            const tableRef = doc(db, 'tables', tableId);

            const unsubscribe = onSnapshot(tableRef, (docSnap) => {
                if (docSnap.exists()) {
                    const tableData = docSnap.data();
                    setData(tableData);
                }
            }, (err) => {
                console.error("Firebase Hatası:", err);
                setError(err.message);
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Setup Hatası:", e);
            setError(e.message);
        }
    }, [tableId]);

    // Veri yoksa veya yükleniyorsa
    // İlk başta props'tan gelen isimleri gösterelim
    const p1Name = data?.currentMatch?.player1 || initialP1 || 'OYUNCU 1';
    const p2Name = data?.currentMatch?.player2 || initialP2 || 'OYUNCU 2';

    // Skorlar - data.stats içinden veya direkt root'tan (yapıya göre değişir)
    // StandardGame yapısında "stats" objesi içinde tutuluyor olabilir veya direkt root'ta
    // ScoreboardReceiver mantığına bakalım: data.stats.score1
    const p1Score = data?.stats?.score1 || 0;
    const p2Score = data?.stats?.score2 || 0;
    const inning = data?.stats?.inning || 0;
    const currentTurn = data?.stats?.currentTurn || 0;

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: 'black',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            overflow: 'hidden',
            position: 'absolute',
            top: 0,
            left: 0
        }}>
            {/* Üst Bilgi Çubuğu */}
            <div style={{
                textAlign: 'center',
                padding: '10px',
                borderBottom: '1px solid #333',
                fontSize: '20px',
                color: '#666'
            }}>
                TV LITE MODE • {tableId}
                {error && <span style={{ color: 'red', marginLeft: '20px' }}>⚠️ {error}</span>}
            </div>

            {/* Ana Skor Alanı - Table Layout (Güvenli) */}
            <table style={{ width: '100%', height: '80%', paddingTop: '20px' }}>
                <tbody>
                    <tr>
                        {/* Oyuncu 1 */}
                        <td style={{ width: '40%', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{
                                fontSize: '40px',
                                color: currentTurn === 0 ? '#4ECDC4' : '#888',
                                marginBottom: '20px'
                            }}>
                                {p1Name}
                            </div>
                            <div style={{
                                fontSize: '180px',
                                fontWeight: 'bold',
                                color: currentTurn === 0 ? '#fff' : '#444'
                            }}>
                                {p1Score}
                            </div>
                            {currentTurn === 0 && <div style={{ fontSize: '30px', color: 'yellow' }}>🔴 SIRA SENDE</div>}
                        </td>

                        {/* Orta Bilgi (Inning) */}
                        <td style={{ width: '20%', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{
                                border: '4px solid #333',
                                borderRadius: '50%',
                                width: '120px',
                                height: '120px',
                                margin: '0 auto',
                                display: 'block', // Flex yerine block
                                paddingTop: '25px', // Dikey ortalama hilesi
                                boxSizing: 'border-box'
                            }}>
                                <div style={{ fontSize: '16px', color: '#aaa' }}>ISTAKA</div>
                                <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#fff' }}>{inning}</div>
                            </div>
                        </td>

                        {/* Oyuncu 2 */}
                        <td style={{ width: '40%', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{
                                fontSize: '40px',
                                color: currentTurn === 1 ? '#4ECDC4' : '#888',
                                marginBottom: '20px'
                            }}>
                                {p2Name}
                            </div>
                            <div style={{
                                fontSize: '180px',
                                fontWeight: 'bold',
                                color: currentTurn === 1 ? '#fff' : '#444'
                            }}>
                                {p2Score}
                            </div>
                            {currentTurn === 1 && <div style={{ fontSize: '30px', color: 'yellow' }}>🔴 SIRA SENDE</div>}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Alt Bilgi */}
            <div style={{ textAlign: 'center', marginTop: '20px', color: '#444' }}>
                Maçı telefondan yönetebilirsiniz.
            </div>
        </div>
    );
}

export default SimpleGame;
