const mongoose = require('mongoose');
const fs = require('fs');

mongoose.connect("mongodb://127.0.0.1:27017/projekt-transfermarkt");

const playerSchema = new mongoose.Schema({
  name: String,
  surname: String,
  birthDate: Date,
  position: String,
  currentClub: String,
  value: Number,
  nationality: String
});

const Player = mongoose.model("Player", playerSchema, "Players");

async function seedPlayers() {
  try {
    const data = fs.readFileSync('./Players.json', 'utf-8');
    const players = JSON.parse(data);

    await Player.deleteMany({});
    await Player.insertMany(players);

    console.log("Uspješno uneseni igrači!");
    mongoose.connection.close();
  } catch (err) {
    console.error("Greška pri unosu:", err);
  }
}

seedPlayers();
