const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/projekt-transfermarkt");

const rawClubSchema = new mongoose.Schema({}, { strict: false });
const RawClub = mongoose.model("RawClub", rawClubSchema, "club");

const cleanClubSchema = new mongoose.Schema({
  club_id: Number,
  name: String,
  league: String,
  country: String,
  season: Number,
  balance: String
});
const Club = mongoose.model("Club", cleanClubSchema, "Clubs");

async function copyClubs() {
  try {
    const allClubs = await RawClub.find();
    console.log("Pronađeno klubova:", allClubs.length);

    await Club.deleteMany({});

    const newClubs = allClubs.map(c => ({
      club_id: Number(c.ClubID),
      name: c.Club || "",
      league: c.League || "",
      country: c.Country || "",
      season: Number(c.Season),
      balance: c.Club_OverallBalance || ""
    }));

    await Club.insertMany(newClubs);

    console.log(`✅ Uspješno kopirano ${newClubs.length} klubova.`);
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Greška:", err);
    mongoose.connection.close();
  }
}

copyClubs();
