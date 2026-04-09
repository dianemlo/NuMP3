import { Link } from 'react-router-dom'
import './Header.css'
import logo from '../assets/NuMP3-logo.png'

function Header() {
  return (
    <header className="header">
      <h1 className="logo">NuMP3</h1>
      <img src={logo} alt="NuMP3 Logo" className="logo-img" />

      <nav className="nav">
        <Link to="/">Home</Link>
        <Link to="/profile">Profile</Link>
        <Link to="/auth">Login / Sign up</Link>
      </nav>
    </header>
  )
}

export default Header
