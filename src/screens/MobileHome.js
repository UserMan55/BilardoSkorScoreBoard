import React, { useState } from 'react';
import './MobileHome.css';

/**
 * MobileHome - Mobil Kullanıcı Ana Ekranı
 * live.3cscore.com için modern, şık tasarım
 */
function MobileHome({
    userProfile,
    onStartVoiceMatch,
    onOpenController
}) {
    const [activeTab, setActiveTab] = useState('matches');

    // Kullanıcı baş harflerini al
    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Rol belirleme
    const getUserRole = () => {
        if (userProfile?.role === 'admin') return 'Admin';
        if (userProfile?.role === 'owner') return 'Salon Sahibi';
        return 'Oyuncu';
    };

    return (
        <div className="mobile-home">
            {/* Header */}
            <header className="mobile-home-header">
                <div className="user-info">
                    <div className="user-avatar">
                        {userProfile?.photoURL ? (
                            <img src={userProfile.photoURL} alt="Avatar" />
                        ) : (
                            <span>{getInitials(userProfile?.fullName)}</span>
                        )}
                    </div>
                    <div className="user-details">
                        <span className="user-name">{userProfile?.fullName || 'Kullanıcı'}</span>
                        <span className="user-role">{getUserRole()}</span>
                    </div>
                </div>
                <button className="settings-btn">
                    ⚙️
                </button>
            </header>

            {/* Tab Navigation */}
            <nav className="mobile-home-tabs">
                <button
                    className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
                    onClick={() => setActiveTab('matches')}
                >
                    🎱 Canlı Maçlar
                </button>
                <button
                    className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
                    onClick={() => setActiveTab('players')}
                >
                    👥 Oyuncular
                </button>
                <button
                    className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    📊 İstatistik
                </button>
            </nav>

            {/* Tab Content */}
            <main className="mobile-home-content">
                {activeTab === 'matches' && (
                    <div className="tab-content matches-content">
                        <div className="empty-state">
                            <div className="empty-icon">🎱</div>
                            <h3>Aktif Maç Yok</h3>
                            <p>Henüz canlı bir maç başlatılmadı</p>
                        </div>

                        {/* Masa Durumları */}
                        <div className="tables-section">
                            <h4>Masalar</h4>
                            <div className="table-card">
                                <div className="table-status idle"></div>
                                <span className="table-name">Masa 1</span>
                                <span className="table-badge">Boş</span>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'players' && (
                    <div className="tab-content players-content">
                        <div className="empty-state">
                            <div className="empty-icon">👥</div>
                            <h3>Oyuncu Listesi</h3>
                            <p>Yakında...</p>
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="tab-content stats-content">
                        <div className="empty-state">
                            <div className="empty-icon">📊</div>
                            <h3>İstatistikler</h3>
                            <p>Yakında...</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Fixed Bottom Action */}
            <footer className="mobile-home-footer">
                <button className="start-match-btn" onClick={onStartVoiceMatch}>
                    🎱 CANLI MAÇ BAŞLAT
                </button>
            </footer>
        </div>
    );
}

export default MobileHome;
