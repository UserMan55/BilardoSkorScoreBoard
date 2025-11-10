import React, { useEffect, useState } from "react";
import { getPlayerNames } from "./firebase";

function PlayerNamesList() {
  const [names, setNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchNames() {
      try {
        const result = await getPlayerNames();
        setNames(result);
      } catch (err) {
        setError("Veri çekilemedi.");
      } finally {
        setLoading(false);
      }
    }
    fetchNames();
  }, []);

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h2>Oyuncu İsimleri</h2>
      <ul>
        {names.map((name, idx) => (
          <li key={idx}>{name}</li>
        ))}
      </ul>
    </div>
  );
}

export default PlayerNamesList;
