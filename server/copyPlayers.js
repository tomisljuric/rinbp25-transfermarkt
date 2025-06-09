const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/projekt-transfermarkt");

const playersDataSchema = new mongoose.Schema({}, { strict: false });
const clubPlayerSchema = new mongoose.Schema({}, { strict: false });
const PlayerData = mongoose.model("PlayerData", playersDataSchema, "players_data");
const ClubPlayer = mongoose.model("ClubPlayer", clubPlayerSchema, "club_players");

const playerSchema = new mongoose.Schema({
  player_id: Number,
  name: String,
  birthDate: Date,
  citizenship: String,
  placeOfBirth: String,
  contractExpires: Date,
  agent: String,
  contractJoined: Date,
  currentClub: String,
  value: Number
});

const Player = mongoose.model("Player", playerSchema, "Players");
const marketValueMap = {};


function isValidDate(d) {
  const date = new Date(d);
  return !isNaN(date.getTime());
}

function parseMarketValue(valueStr) {
  if (!valueStr || typeof valueStr !== 'string') return 0;

  valueStr = valueStr.replace('€', '').replace(',', '.').trim();

  if (valueStr.endsWith('m')) {
    return parseFloat(valueStr) * 1_000_000;
  } else if (valueStr.endsWith('Th.') || valueStr.endsWith('k')) {
    return parseFloat(valueStr) * 1_000;
  }

  const numeric = parseFloat(valueStr);
  return isNaN(numeric) ? 0 : numeric;
}

async function updatePlayersWithValue() {
  const clubPlayers = await ClubPlayer.find();
  const players = await Player.find();

  // MAPA: PlayerID -> MarketValue
  const marketValueMap = {};
  for (const cp of clubPlayers) {
    const pid = parseInt(cp.PlayerID);
    const val = parseMarketValue(cp.Player_MarketValue);
    if (!isNaN(pid)) {
      marketValueMap[pid] = val;
    }
  }

  // Ažuriraj svaki player
  for (const p of players) {
    const pid = parseInt(p.player_id);
    const value = marketValueMap[pid] || 0;

    await Player.updateOne({ _id: p._id }, { $set: { value } });
    console.log(`Ažuriran: ${p.name} | ID: ${pid} | Vrijednost: ${value}`);
  }

  console.log('Gotovo!');
  mongoose.disconnect();
}

updatePlayersWithValue();



async function copyPlayers() {
  try {
    const allPlayers = await PlayerData.find();
    const clubPlayers = await ClubPlayer.find();

    // 🗺️ Mapiramo vrijednosti po PlayerID
    const marketValueMap = {};
    clubPlayers.forEach(cp => {
      if (cp.PlayerID && cp.Player_MarketValue) {
        marketValueMap[cp.PlayerID] = parseMarketValue(cp.Player_MarketValue);
      }
    });
    console.log("Pronađeno igrača:", allPlayers.length);



    await Player.deleteMany({}); // očisti prije unosa

    const newPlayers = allPlayers.map(p => ({
        player_id: p.player_id, 
        name: p.given_name || "",
        surname: "",
        birthDate: isValidDate(p.date_of_birth) ? new Date(p.date_of_birth) : null,
        position: p.position || "",
        currentClub: p.current_club || "",
        value: parseMarketValue(p.market_value), 
        citizenship: p.citizenship || "",
        contractExpires: isValidDate(p.contract_expires) ? new Date(p.contract_expires) : null,
}));


    await Player.insertMany(newPlayers);

    console.log(`✅ Uspješno kopirano ${newPlayers.length} igrača.`);
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Greška:", err);
    mongoose.connection.close();
  }
}

copyPlayers();
