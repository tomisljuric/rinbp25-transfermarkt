const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/projekt-transfermarkt");

const rawClubPlayerSchema = new mongoose.Schema({}, { strict: false });
const RawClubPlayer = mongoose.model("RawClubPlayer", rawClubPlayerSchema, "club_players");

const cleanClubPlayerSchema = new mongoose.Schema({
  season: Number,
  league: String,
  club_id: Number,
  player_id: Number,
  player_name: String,
  position: String,
  market_value: String
});
const ClubPlayer = mongoose.model("ClubPlayer", cleanClubPlayerSchema, "ClubPlayers");

async function copyClubPlayers() {
  try {
    const all = await RawClubPlayer.find();
    console.log("Pronađeno igrača u klubovima:", all.length);

    await ClubPlayer.deleteMany({});

    const newEntries = all.map(p => ({
      season: Number(p.Season),
      league: p.League || "",
      club_id: Number(p.ClubID),
      player_id: Number(p.PlayerID),
      player_name: p.Player_name || "",
      position: p.Player_possition || "",
      market_value: p.Player_MarketValue || ""
    }));

    await ClubPlayer.insertMany(newEntries);

    console.log(`✅ Uspješno kopirano ${newEntries.length} zapisa.`);
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Greška:", err);
    mongoose.connection.close();
  }
}

copyClubPlayers();
