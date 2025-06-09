import React, { useEffect, useState } from "react";
import "./PlayerDetails.css";

export function PlayerDetails({ playerId }) {
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    if (!playerId) return;

    fetch(`http://localhost:4000/api/player/${playerId}`)
      .then((res) => res.json())
      .then(setPlayer)
      .catch(console.error);
  }, [playerId]);

  if (!player) return <div>Učitavanje...</div>;

  return (
    <div className="player-details-container">
      <h2>
        {player.given_name ||
          player.name ||
          player.clubPlayer?.Player_name ||
          "Nepoznato"}
      </h2>
      <p>Državljanstvo: {player.citizenship || "Nepoznato"}</p>
      <p>
        Trenutni klub: {player.club_name || player.current_club || "Nepoznato"}
      </p>
      <p>Pozicija: {player.clubPlayer?.Player_possition || "N/A"}</p>
      <p>Datum rođenja: {player.date_of_birth || "Nepoznato"}</p>
      <p>Agent: {player.agent || "Nepoznato"}</p>

      <p>
        Vrijednost:{" "}
        {player.clubPlayer?.Player_MarketValue ||
          (player.value
            ? `€${(player.value / 1_000_000).toFixed(2)}m`
            : "Nepoznato")}
      </p>

      <h3>Transferi</h3>
      {player.transfers && player.transfers.length > 0 ? (
        <ul>
          {player.transfers.map((t, idx) => (
            <li key={idx}>
              Sezona: {t.season}, Datum: {t.date}, Iz: {t.left} → U: {t.joined},
              Tadašnja vrijednost: {t.mv}, Vrijednost transfera: {t.fee}
            </li>
          ))}
        </ul>
      ) : (
        <p>Nema podataka o transferima.</p>
      )}
    </div>
  );
}
