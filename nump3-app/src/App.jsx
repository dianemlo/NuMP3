import Header from './components/Header'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Explore from './pages/Explore'
import Auth from './pages/Auth'
import { PlayerProvider } from "./player/PlayerContext";
import Player from './components/Player'

function App() {
  return (
    <BrowserRouter>
      <PlayerProvider>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/auth" element={<Auth />} />
          {/* <Home songs={songs} currentUser={currentUser} /> */}
        </Routes>
        <Player />
      </PlayerProvider>
    </BrowserRouter>
  );
}

export default App