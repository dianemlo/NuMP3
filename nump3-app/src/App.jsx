import { useState } from 'react'
import Header from './components/Header'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Explore from './pages/Explore'
import Auth from './pages/Auth'
import { PlayerProvider } from "./player/PlayerContext";
import Player from './components/Player'

function App() {
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <BrowserRouter>
      <PlayerProvider>
        <Header />
        <Routes>
          <Route path="/" element={
            <Home
              searchResults={searchResults}
              setSearchResults={setSearchResults}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          } />
          <Route path="/profile" element={<Profile />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
        <Player />
      </PlayerProvider>
    </BrowserRouter>
  );
}

export default App