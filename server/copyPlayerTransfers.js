const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/projekt-transfermarkt");

const rawTransferSchema = new mongoose.Schema({}, { strict: false });
const RawTransfer = mongoose.model("RawTransfer", rawTransferSchema, "players_transfers");

const transferSchema = new mongoose.Schema({
  player_id: Number,
  season: String,
  date: String,
  from: String,
  to: String,
  market_value: String,
  fee: String
});
const Transfer = mongoose.model("Transfer", transferSchema, "Transfers");

async function copyPlayersTransfers() {
  try {
    const allTransfers = await RawTransfer.find();
    console.log("Pronađeno transfera:", allTransfers.length);

    await Transfer.deleteMany({});

    const newTransfers = allTransfers.map(t => ({
      player_id: Number(t.player_id),
      season: t.season || "",
      date: t.date || "",
      from: t.left || "",
      to: t.joined || "",
      market_value: t.mv || "",
      fee: t.fee || ""
    }));

    await Transfer.insertMany(newTransfers);

    console.log(`✅ Uspješno kopirano ${newTransfers.length} transfera.`);
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Greška:", err);
    mongoose.connection.close();
  }
}

copyPlayersTransfers();
