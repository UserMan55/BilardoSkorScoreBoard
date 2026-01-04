import React from 'react';

export default function TestTV() {
    const [count, setCount] = React.useState(0);

    return (
        <div style={{ backgroundColor: 'blue', color: 'white', height: '100vh', padding: 50, fontSize: 30 }}>
            <h1>TV TEST EKRANI</h1>
            <p>React Çalışıyor!</p>
            <p>Sayaç: {count}</p>
            <button
                style={{ padding: 20, fontSize: 30 }}
                onClick={() => setCount(count + 1)}
            >
                Sayacı Artır
            </button>
            <div style={{ marginTop: 20, fontSize: 16 }}>
                User Agent: {navigator.userAgent}
            </div>
        </div>
    );
}
