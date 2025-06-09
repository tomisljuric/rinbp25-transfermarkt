# Technical Specifications

## Project Structure

```
rinbp25-transfermarkt/
├── src/                     # Frontend React application
│   ├── App.jsx              # Main application component
│   ├── PlayerList.jsx       # Component for displaying player list
│   ├── PlayerDetails.jsx    # Component for displaying player details
│   ├── *.css                # Component styles
│   └── ...
├── server/                  # Backend Express API
│   ├── server.js            # Express server and API routes
│   ├── seed.js              # Database seeding script
│   ├── copyPlayers.js       # Player data import script
│   ├── copyClubs.js         # Club data import script 
│   └── ...
├── public/                  # Static assets
└── ...
```

## Data Models

### Player
```javascript
{
  name: String,
  dateOfBirth: Date,
  nationality: String,
  height: Number,           // in centimeters
  position: String,
  foot: String,             // Left, Right, Both
  internationalCaps: Number,
  internationalGoals: Number
}
```

### Club
```javascript
{
  name: String,
  country: String,
  founded: Number,          // year
  stadium: String,
  capacity: Number,         // stadium capacity
  league: String,
  manager: String
}
```

### Transfer
```javascript
{
  playerId: ObjectId,       // reference to Player
  fromClubId: ObjectId,     // reference to Club
  toClubId: ObjectId,       // reference to Club
  transferFee: Number,      // in euros
  transferDate: Date,
  contractLength: Number    // in years
}
```

### Market Value
```javascript
{
  playerId: ObjectId,       // reference to Player
  value: Number,            // in euros
  date: Date
}
```

### Club Player (Association)
```javascript
{
  playerId: ObjectId,       // reference to Player
  clubId: ObjectId,         // reference to Club
  startDate: Date,
  endDate: Date,            // null if current club
  jerseyNumber: Number
}
```

## API Endpoints

### Players
- `GET /api/players` - Get all players
- `GET /api/players/:id` - Get player by ID
- `POST /api/players` - Create new player
- `GET /api/players/:id/clubs` - Get player's club history

### Clubs
- `GET /api/clubs` - Get all clubs
- `GET /api/clubs/:id/players` - Get club's current players

### Transfers
- `GET /api/transfers` - Get all transfers
- `POST /api/transfers` - Create new transfer

### Market Values
- `GET /api/marketvalues/:playerId` - Get player's market value history
- `POST /api/marketvalues` - Add new market value

## Setup and Installation

### Prerequisites
- Node.js and npm
- MongoDB

### Backend Setup
1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start MongoDB:
   ```
   mongod
   ```

4. Run the seed scripts to populate the database:
   ```
   node copyPlayers.js
   node copyClubs.js
   ```

5. Start the server:
   ```
   node server.js
   ```
   The server will run on port 3000.

### Frontend Setup
1. From the project root, install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```
   The application will be available at http://localhost:5173

## Future Improvements

1. User authentication and authorization
2. Player statistics and performance data
3. Advanced filtering and search capabilities
4. Image uploads for players and clubs
5. Responsive design for mobile devices
6. Data visualization for market values and transfers
7. Internationalization support
8. Social features (comments, ratings)

