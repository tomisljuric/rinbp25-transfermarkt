const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/projekt-transfermarkt", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Greška pri spajanju na MongoDB:"));
db.once("open", () => {
  console.log("Spojeno na MongoDB");
  seedPlayers();
});

const { Schema } = mongoose;

const playerSchema = new Schema({
  name: String,
  surname: String,
  birthDate: Date,
  position: String,
  currentClub: String,
  value: Number,          // vrijednost igrača u milijunima
  nationality: String,    // nacionalnost igrača
});


const Player = mongoose.model("Player", playerSchema, "Players");

// Pravi igrači i njihovi klubovi
const playersData = [
    { name: "Luka", surname: "Modrić", birthDate: "1985-09-09T00:00:00.000Z", position: "Midfielder", currentClub: "Real Madrid", value: 10, nationality: "Croatian" },
    { name: "Ivan", surname: "Perišić", birthDate: "1989-02-02T00:00:00.000Z", position: "Winger", currentClub: "Tottenham Hotspur", value: 8, nationality: "Croatian" },
    { name: "Mario", surname: "Mandžukić", birthDate: "1986-05-21T00:00:00.000Z", position: "Forward", currentClub: "Retired", value: 0, nationality: "Croatian" },
    { name: "Ante", surname: "Rebić", birthDate: "1993-09-21T00:00:00.000Z", position: "Forward", currentClub: "AC Milan", value: 12, nationality: "Croatian" },
    { name: "Marcelo", surname: "Brozović", birthDate: "1992-11-16T00:00:00.000Z", position: "Midfielder", currentClub: "Inter Milan", value: 18, nationality: "Croatian" },
    { name: "Dejan", surname: "Lovren", birthDate: "1989-07-05T00:00:00.000Z", position: "Defender", currentClub: "Zenit St. Petersburg", value: 6, nationality: "Croatian" },
    { name: "Ivan", surname: "Strinić", birthDate: "1987-07-17T00:00:00.000Z", position: "Defender", currentClub: "Retired", value: 0, nationality: "Croatian" },
    { name: "Dominik", surname: "Livaković", birthDate: "1995-01-09T00:00:00.000Z", position: "Goalkeeper", currentClub: "Dinamo Zagreb", value: 10, nationality: "Croatian" },
    { name: "Andrej", surname: "Kramarić", birthDate: "1991-06-19T00:00:00.000Z", position: "Forward", currentClub: "Hoffenheim", value: 15, nationality: "Croatian" },
    { name: "Šime", surname: "Vrsaljko", birthDate: "1992-01-10T00:00:00.000Z", position: "Defender", currentClub: "Olympiacos", value: 7, nationality: "Croatian" },

    { name: "Cristiano", surname: "Ronaldo", birthDate: "1985-02-05T00:00:00.000Z", position: "Forward", currentClub: "Al Nassr", value: 25, nationality: "Portuguese" },
    { name: "Lionel", surname: "Messi", birthDate: "1987-06-24T00:00:00.000Z", position: "Forward", currentClub: "Paris Saint-Germain", value: 30, nationality: "Argentinian" },
    { name: "Neymar", surname: "Jr.", birthDate: "1992-02-05T00:00:00.000Z", position: "Forward", currentClub: "Paris Saint-Germain", value: 28, nationality: "Brazilian" },
    { name: "Kylian", surname: "Mbappé", birthDate: "1998-12-20T00:00:00.000Z", position: "Forward", currentClub: "Paris Saint-Germain", value: 60, nationality: "French" },
    { name: "Robert", surname: "Lewandowski", birthDate: "1988-08-21T00:00:00.000Z", position: "Forward", currentClub: "FC Barcelona", value: 20, nationality: "Polish" },
    { name: "Kevin", surname: "De Bruyne", birthDate: "1991-06-28T00:00:00.000Z", position: "Midfielder", currentClub: "Manchester City", value: 50, nationality: "Belgian" },
    { name: "Harry", surname: "Kane", birthDate: "1993-07-28T00:00:00.000Z", position: "Forward", currentClub: "Bayern Munich", value: 40, nationality: "English" },
    { name: "Mohamed", surname: "Salah", birthDate: "1992-06-15T00:00:00.000Z", position: "Forward", currentClub: "Liverpool", value: 45, nationality: "Egyptian" },
    { name: "Sergio", surname: "Ramos", birthDate: "1986-03-30T00:00:00.000Z", position: "Defender", currentClub: "Paris Saint-Germain", value: 8, nationality: "Spanish" },
    { name: "Virgil", surname: "Van Dijk", birthDate: "1991-07-08T00:00:00.000Z", position: "Defender", currentClub: "Liverpool", value: 55, nationality: "Dutch" },


    
    // Dodatni europski igrači
    { name: "Gareth", surname: "Bale", birthDate: "1989-07-16T00:00:00.000Z", position: "Forward", currentClub: "Retired", value: 0, nationality: "Welsh" },
    { name: "Karim", surname: "Benzema", birthDate: "1987-12-19T00:00:00.000Z", position: "Forward", currentClub: "Al-Ittihad", value: 12, nationality: "French" },
    { name: "Paul", surname: "Pogba", birthDate: "1993-03-15T00:00:00.000Z", position: "Midfielder", currentClub: "Juventus", value: 20, nationality: "French" },
    { name: "Eden", surname: "Hazard", birthDate: "1991-01-07T00:00:00.000Z", position: "Winger", currentClub: "Retired", value: 0, nationality: "Belgian" },
    { name: "Zlatan", surname: "Ibrahimović", birthDate: "1981-10-03T00:00:00.000Z", position: "Forward", currentClub: "Retired", value: 0, nationality: "Swedish" },
    { name: "Luka", surname: "Jovic", birthDate: "1997-12-23T00:00:00.000Z", position: "Forward", currentClub: "Fiorentina", value: 25, nationality: "Serbian" },
    { name: "Ciro", surname: "Immobile", birthDate: "1990-02-20T00:00:00.000Z", position: "Forward", currentClub: "Lazio", value: 15, nationality: "Italian" },
    { name: "Manuel", surname: "Neuer", birthDate: "1986-03-27T00:00:00.000Z", position: "Goalkeeper", currentClub: "Bayern Munich", value: 10, nationality: "German" },
    { name: "Jan", surname: "Oblak", birthDate: "1993-01-07T00:00:00.000Z", position: "Goalkeeper", currentClub: "Atletico Madrid", value: 60, nationality: "Slovenian" },
    { name: "Toni", surname: "Kroos", birthDate: "1990-01-04T00:00:00.000Z", position: "Midfielder", currentClub: "Real Madrid", value: 25, nationality: "German" },

    { name: "David", surname: "De Gea", birthDate: "1990-11-07T00:00:00.000Z", position: "Goalkeeper", currentClub: "Retired", value: 0, nationality: "Spanish" },
    { name: "Antonio", surname: "Rüdiger", birthDate: "1993-03-03T00:00:00.000Z", position: "Defender", currentClub: "Real Madrid", value: 25, nationality: "German" },
    { name: "Jadon", surname: "Sancho", birthDate: "2000-03-25T00:00:00.000Z", position: "Winger", currentClub: "Manchester United", value: 45, nationality: "English" },
    { name: "Kepa", surname: "Arrizabalaga", birthDate: "1994-10-03T00:00:00.000Z", position: "Goalkeeper", currentClub: "Chelsea", value: 15, nationality: "Spanish" },
    { name: "Rodri", surname: "Hernández", birthDate: "1996-06-22T00:00:00.000Z", position: "Midfielder", currentClub: "Manchester City", value: 80, nationality: "Spanish" },
    { name: "Erling", surname: "Haaland", birthDate: "2000-07-21T00:00:00.000Z", position: "Forward", currentClub: "Manchester City", value: 180, nationality: "Norwegian" },
    { name: "Vinícius", surname: "Júnior", birthDate: "2000-07-12T00:00:00.000Z", position: "Winger", currentClub: "Real Madrid", value: 150, nationality: "Brazilian" },
    { name: "Jude", surname: "Bellingham", birthDate: "2003-06-29T00:00:00.000Z", position: "Midfielder", currentClub: "Real Madrid", value: 120, nationality: "English" },
    { name: "Bukayo", surname: "Saka", birthDate: "2001-09-05T00:00:00.000Z", position: "Winger", currentClub: "Arsenal", value: 110, nationality: "English" },
    { name: "Florian", surname: "Wirtz", birthDate: "2003-05-03T00:00:00.000Z", position: "Midfielder", currentClub: "Bayer Leverkusen", value: 100, nationality: "German" },
    { name: "Jamal", surname: "Musiala", birthDate: "2003-02-26T00:00:00.000Z", position: "Midfielder", currentClub: "Bayern Munich", value: 100, nationality: "German" },
    { name: "Lamine", surname: "Yamal", birthDate: "2007-07-13T00:00:00.000Z", position: "Winger", currentClub: "Barcelona", value: 90, nationality: "Spanish" },
    { name: "Martin", surname: "Ødegaard", birthDate: "1998-12-17T00:00:00.000Z", position: "Midfielder", currentClub: "Arsenal", value: 85, nationality: "Norwegian" },
    { name: "Pedri", surname: "González", birthDate: "2002-11-25T00:00:00.000Z", position: "Midfielder", currentClub: "Barcelona", value: 80, nationality: "Spanish" },
    // Aston Villa
{ name: "Emiliano", surname: "Martínez", birthDate: "1992-09-02T00:00:00.000Z", position: "Goalkeeper", currentClub: "Aston Villa", value: 28, nationality: "Argentinian" },
{ name: "Ezri", surname: "Konsa", birthDate: "1997-10-23T00:00:00.000Z", position: "Defender", currentClub: "Aston Villa", value: 25, nationality: "English" },
{ name: "Douglas", surname: "Luiz", birthDate: "1998-05-09T00:00:00.000Z", position: "Midfielder", currentClub: "Aston Villa", value: 38, nationality: "Brazilian" },
{ name: "John", surname: "McGinn", birthDate: "1994-10-18T00:00:00.000Z", position: "Midfielder", currentClub: "Aston Villa", value: 22, nationality: "Scottish" },
{ name: "Ollie", surname: "Watkins", birthDate: "1995-12-30T00:00:00.000Z", position: "Forward", currentClub: "Aston Villa", value: 40, nationality: "English" },

// Real Sociedad
{ name: "Álex", surname: "Remiro", birthDate: "1995-03-24T00:00:00.000Z", position: "Goalkeeper", currentClub: "Real Sociedad", value: 20, nationality: "Spanish" },
{ name: "Robin", surname: "Le Normand", birthDate: "1996-11-11T00:00:00.000Z", position: "Defender", currentClub: "Real Sociedad", value: 30, nationality: "Spanish" },
{ name: "Mikel", surname: "Merino", birthDate: "1996-06-22T00:00:00.000Z", position: "Midfielder", currentClub: "Real Sociedad", value: 35, nationality: "Spanish" },
{ name: "Takefusa", surname: "Kubo", birthDate: "2001-06-04T00:00:00.000Z", position: "Winger", currentClub: "Real Sociedad", value: 42, nationality: "Japanese" },
{ name: "Umar", surname: "Sadiq", birthDate: "1997-02-02T00:00:00.000Z", position: "Forward", currentClub: "Real Sociedad", value: 18, nationality: "Nigerian" },
  {
    name: "Leon",
    surname: "Bailey",
    birthDate: new Date("1997-08-09"),
    position: "Winger",
    currentClub: "Aston Villa",
    value: 25,
    nationality: "Jamaican"
  },
  {
    name: "Mikel",
    surname: "Oyarzabal",
    birthDate: new Date("1997-04-21"),
    position: "Winger",
    currentClub: "Real Sociedad",
    value: 35,
    nationality: "Spanish"
  },
  {
    name: "Brais",
    surname: "Méndez",
    birthDate: new Date("1997-01-07"),
    position: "Midfielder",
    currentClub: "Real Sociedad",
    value: 25,
    nationality: "Spanish"
  },
  {
    name: "Nabil",
    surname: "Fekir",
    birthDate: new Date("1993-07-18"),
    position: "Midfielder",
    currentClub: "Real Betis",
    value: 25,
    nationality: "French"
  },
  {
    name: "Guido",
    surname: "Rodríguez",
    birthDate: new Date("1994-04-12"),
    position: "Midfielder",
    currentClub: "Real Betis",
    value: 18,
    nationality: "Argentinian"
  },
  {
    name: "Isco",
    surname: "Alarcón",
    birthDate: new Date("1992-04-21"),
    position: "Midfielder",
    currentClub: "Real Betis",
    value: 12,
    nationality: "Spanish"
  },
  {
    name: "Claudio",
    surname: "Bravo",
    birthDate: new Date("1983-04-13"),
    position: "Goalkeeper",
    currentClub: "Real Betis",
    value: 1,
    nationality: "Chilean"
  },
  {
    name: "Ayoze",
    surname: "Pérez",
    birthDate: new Date("1993-07-29"),
    position: "Forward",
    currentClub: "Real Betis",
    value: 8,
    nationality: "Spanish"
  },
  {
    name: "Youssef",
    surname: "En-Nesyri",
    birthDate: new Date("1997-06-01"),
    position: "Forward",
    currentClub: "Sevilla",
    value: 20,
    nationality: "Moroccan"
  },
  {
    name: "Ivan",
    surname: "Rakitić",
    birthDate: new Date("1988-03-10"),
    position: "Midfielder",
    currentClub: "Sevilla",
    value: 5,
    nationality: "Croatian"
  },
  {
    name: "Jesús",
    surname: "Navas",
    birthDate: new Date("1985-11-21"),
    position: "Defender",
    currentClub: "Sevilla",
    value: 2,
    nationality: "Spanish"
  },
  {
    name: "Nemanja",
    surname: "Gudelj",
    birthDate: new Date("1991-11-16"),
    position: "Midfielder",
    currentClub: "Sevilla",
    value: 6,
    nationality: "Serbian"
  },
  {
    name: "Marko",
    surname: "Dmitrović",
    birthDate: new Date("1992-01-24"),
    position: "Goalkeeper",
    currentClub: "Sevilla",
    value: 4,
    nationality: "Serbian"
  },
  {
    name: "Nicolás",
    surname: "González",
    birthDate: new Date("1998-04-06"),
    position: "Forward",
    currentClub: "Fiorentina",
    value: 30,
    nationality: "Argentinian"
  },
  {
    name: "Cristiano",
    surname: "Biraghi",
    birthDate: new Date("1992-09-01"),
    position: "Defender",
    currentClub: "Fiorentina",
    value: 7,
    nationality: "Italian"
  },
  {
    name: "Rolando",
    surname: "Mandragora",
    birthDate: new Date("1997-06-29"),
    position: "Midfielder",
    currentClub: "Fiorentina",
    value: 10,
    nationality: "Italian"
  },
  {
    name: "Lucas",
    surname: "Martínez Quarta",
    birthDate: new Date("1996-05-10"),
    position: "Defender",
    currentClub: "Fiorentina",
    value: 12,
    nationality: "Argentinian"
  },
  {
    name: "Pietro",
    surname: "Terracciano",
    birthDate: new Date("1990-03-08"),
    position: "Goalkeeper",
    currentClub: "Fiorentina",
    value: 3,
    nationality: "Italian"
  },
  {
    name: "Pepê",
    surname: "Aquino",
    birthDate: new Date("1997-02-24"),
    position: "Winger",
    currentClub: "Porto",
    value: 25,
    nationality: "Brazilian"
  },
  {
    name: "Otávio",
    surname: "Monteiro",
    birthDate: new Date("1995-02-09"),
    position: "Midfielder",
    currentClub: "Porto",
    value: 35,
    nationality: "Portuguese"
  },
  {
    name: "Diogo",
    surname: "Costa",
    birthDate: new Date("1999-09-19"),
    position: "Goalkeeper",
    currentClub: "Porto",
    value: 30,
    nationality: "Portuguese"
  },
  {
    name: "Iván",
    surname: "Marcano",
    birthDate: new Date("1987-06-23"),
    position: "Defender",
    currentClub: "Porto",
    value: 2,
    nationality: "Spanish"
  },
  {
    name: "Wendell",
    surname: "Nascimiento",
    birthDate: new Date("1993-07-20"),
    position: "Defender",
    currentClub: "Porto",
    value: 10,
    nationality: "Brazilian"
  },
  {
    name: "Callum",
    surname: "McGregor",
    birthDate: new Date("1993-06-14"),
    position: "Midfielder",
    currentClub: "Celtic",
    value: 10,
    nationality: "Scottish"
  },
  {
    name: "Kyogo",
    surname: "Furuhashi",
    birthDate: new Date("1995-01-20"),
    position: "Forward",
    currentClub: "Celtic",
    value: 15,
    nationality: "Japanese"
  },
  {
    name: "Joe",
    surname: "Hart",
    birthDate: new Date("1987-04-19"),
    position: "Goalkeeper",
    currentClub: "Celtic",
    value: 1,
    nationality: "English"
  },
  {
    name: "Greg",
    surname: "Taylor",
    birthDate: new Date("1997-11-05"),
    position: "Defender",
    currentClub: "Celtic",
    value: 5,
    nationality: "Scottish"
  },
  {
    name: "Reo",
    surname: "Hatate",
    birthDate: new Date("1997-11-21"),
    position: "Midfielder",
    currentClub: "Celtic",
    value: 8,
    nationality: "Japanese"
  }
];
  
  async function seedPlayers() {
    const players = playersData.map(data => {
      const player = new Player(data);
      return player;
    });
  
    try {
      await Player.insertMany(players);
      console.log("Igrači uspješno dodani!");
      process.exit();
    } catch (error) {
      console.error("Greška pri dodavanju igrača:", error);
      process.exit(1);
    }
  }
  