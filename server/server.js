const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/projekt-transfermarkt");

const playerSchema = new mongoose.Schema({}, { strict: false });
const Player = mongoose.model("Players", playerSchema, "players_data");

app.get("/api/players", async (req, res) => {
  try {
    const {
      name,
      citizenship,
      currentClub,
      value,
      position,
      birthDate,
      agent,
    } = req.query;

    const filter = {};

    if (name) {
      filter.given_name = { $regex: name, $options: "i" };
    }
    if (citizenship) {
      filter.citizenship = { $regex: citizenship, $options: "i" };
    }
    if (currentClub) {
      filter.current_club = { $regex: currentClub, $options: "i" };
    }
    if (birthDate) {
      filter.date_of_birth = { $regex: birthDate, $options: "i" };
    }

    const players = await Player.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "club_players",
          localField: "player_id",
          foreignField: "PlayerID",
          as: "clubPlayerData",
        },
      },
      {
        $addFields: {
          clubPlayer: { $arrayElemAt: ["$clubPlayerData", 0] },
        },
      },
      ...(value
        ? [
            {
              $match: {
                "clubPlayer.Player_MarketValue": {
                  $regex: value,
                  $options: "i",
                },
              },
            },
          ]
        : []),
      ...(position || agent
        ? [
            {
              $match: {
                ...(position
                  ? {
                      "clubPlayer.Player_possition": {
                        $regex: position,
                        $options: "i",
                      },
                    }
                  : {}),
                ...(agent ? { agent: { $regex: agent, $options: "i" } } : {}), 
              },
            },
          ]
        : []),

      {
        $project: {
          player_id: 1,
          given_name: 1,
          value: 1,
          citizenship: 1,
          current_club: 1,
          "clubPlayer.Player_MarketValue": 1,
          "clubPlayer.Player_possition": 1,
          "clubPlayer.Player_agent": 1,
          date_of_birth: 1,
        },
      },
      { $limit: 50 },
    ]);

    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/player/:id", async (req, res) => {
  const playerId = Number(req.params.id);

  try {
    const playerDetails = await Player.aggregate([
      { $match: { player_id: playerId } },
      {
        $lookup: {
          from: "club_players",
          localField: "player_id",
          foreignField: "PlayerID",
          as: "clubPlayersData",
        },
      },
      {
        $lookup: {
          from: "players_transfers",
          localField: "player_id",
          foreignField: "player_id",
          as: "transfers",
        },
      },
      {
        $addFields: {
          clubPlayer: { $arrayElemAt: ["$clubPlayersData", 0] },
        },
      },
      {
        $lookup: {
          from: "club", 
          localField: "clubPlayer.ClubID",
          foreignField: "ClubID",
          as: "clubData",
        },
      },
      {
        $addFields: {
          club: { $arrayElemAt: ["$clubData", 0] },
        },
      },
      {
        $project: {
          given_name: 1,
          date_of_birth: 1,
          citizenship: 1,
          current_club: 1,
          agent: 1,
          clubPlayer: 1,
          transfers: 1,
          club_name: "$club.Club_name",
        },
      },
    ]);

    if (playerDetails.length === 0) {
      return res.status(404).json({ message: "Igrač nije pronađen" });
    }

    res.json(playerDetails[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Server radi na portu ${PORT}`));
