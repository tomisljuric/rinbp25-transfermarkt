import React, { useState } from "react";
import "./PlayerList.css";

export function PlayersList({ onSelect }) {
  const [players, setPlayers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    citizenship: "",
    currentClub: "",
    value: "",
    position: "",
    birthDate: "",
    agent: "",
  });

  const [errors, setErrors] = useState({ value: "" });

  function isValidValueInput(value) {
    if (!value) return true;
    return /^(\d+(\.\d+)?)([mk])?$/i.test(value.trim());
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "value") {
      if (!isValidValueInput(value)) {
        setErrors((prev) => ({ ...prev, [name]: "Neispravan format" }));
      } else {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    }
  };

  const handleSearch = () => {
    if (errors.value) {
      alert("Ispravi grešku u unosu vrijednosti prije pretraživanja.");
      return;
    }

    const params = new URLSearchParams();
    Object.entries(form).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });

    fetch(`http://localhost:4000/api/players?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setPlayers(data))
      .catch(console.error);
  };

  return (
    <div className="players-list-container">
      <h2>Pretraži igrače</h2>
      <input
        name="name"
        placeholder="Ime"
        value={form.name}
        onChange={handleChange}
      />
      <input
        name="citizenship"
        placeholder="Državljanstvo"
        value={form.citizenship}
        onChange={handleChange}
      />
      <input
        name="currentClub"
        placeholder="Klub"
        value={form.currentClub}
        onChange={handleChange}
      />
      <input
        name="position"
        placeholder="Pozicija"
        value={form.position}
        onChange={handleChange}
      />
      <input
        name="birthDate"
        placeholder="Datum rođenja"
        value={form.birthDate}
        onChange={handleChange}
      />
      <input
        name="agent"
        placeholder="Agent"
        value={form.agent}
        onChange={handleChange}
      />

      <input
        name="value"
        placeholder="Vrijednost"
        value={form.value}
        onChange={handleChange}
        style={{ borderColor: errors.value ? "red" : undefined }}
      />
      {errors.value && <div style={{ color: "red" }}>{errors.value}</div>}

      <button
        onClick={handleSearch}
        disabled={!!errors.minValue || !!errors.maxValue}
      >
        Pretraži
      </button>

      <ul>
        {players.map((p) => (
          <li
            key={p.player_id}
            onClick={() => onSelect(p.player_id)}
            style={{ cursor: "pointer" }}
          >
            {p.given_name || "Nepoznato"} -
            {p.clubPlayer?.Player_possition || "N/A"} -
            {p.clubPlayer?.Player_MarketValue ||
              (p.value ? `€${(p.value / 1_000_000).toFixed(2)}m` : "N/A")}
          </li>
        ))}
      </ul>
    </div>
  );
}
