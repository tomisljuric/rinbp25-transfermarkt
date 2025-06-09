// copyMarketValues.js
const mongoose = require('mongoose');
const fs = require('fs');

mongoose.connect('mongodb://127.0.0.1:27017/projekt-transfermarkt', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const playersDataSchema = new mongoose.Schema({}, { strict: false });
const clubPlayersSchema = new mongoose.Schema({}, { strict: false });

const Player = mongoose.model('PlayersData', playersDataSchema, 'players_data');
const ClubPlayer = mongoose.model('ClubPlayers', clubPlayersSchema, 'club_players');

function parseMarketValue(valueStr) {
  if (!valueStr || typeof valueStr !== 'string') return 0;
  const cleaned = valueStr.trim().replace(/[€m]/g, '');
  const isMillion = valueStr.includes('m');
  const number = parseFloat(cleaned);
  return isMillion ? number * 1_000_000 : number;
}

(async () => {
  try {
    const clubPlayers = await ClubPlayer.find({});
    let updated = 0;

    for (const cp of clubPlayers) {
      const value = parseMarketValue(cp.Player_MarketValue);
      const result = await Player.updateOne(
        { player_id: cp.PlayerID },
        { $set: { value: value } }
      );
      if (result.modifiedCount > 0) updated++;
    }

    console.log(`Ažurirano ${updated} igrača s tržišnom vrijednošću.`);
    mongoose.disconnect();
  } catch (err) {
    console.error(err);
    mongoose.disconnect();
  }
})();
