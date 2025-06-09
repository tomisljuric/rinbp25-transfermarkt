import React, { useState } from 'react';
import { PlayersList } from './PlayerList';
import { PlayerDetails } from './PlayerDetails';

function App() {
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      <PlayersList onSelect={setSelectedPlayer} />
      <PlayerDetails playerId={selectedPlayer} />
    </div>
  );
}

export default App;
