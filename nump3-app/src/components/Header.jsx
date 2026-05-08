import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './Header.css'
import logo from '../assets/NuMP3-logo.png'

function Header() {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkLogin = () => {
      const token = localStorage.getItem('token')
      setIsLoggedIn(!!token)
    }

    checkLogin()

    window.addEventListener('storage', checkLogin)
    window.addEventListener('authChange', checkLogin)

    return () => {
      window.removeEventListener('storage', checkLogin)
      window.removeEventListener('authChange', checkLogin)
    }
  }, [])



  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    window.dispatchEvent(new Event('authChange'))

    setIsLoggedIn(false)
    navigate('/auth')
  }

  return (
    <header className="header">
      <h1 className="logo">NuMP3</h1>
      <img src={logo} alt="NuMP3 Logo" className="logo-img" />

      <nav className="nav">
        <Link to="/">Home</Link>

        {isLoggedIn && <Link to="/profile">Profile</Link>}

        {isLoggedIn ? (
          <button className="nav-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <Link to="/auth">Login / Sign up</Link>
        )}
      </nav>
    </header>
  )
}

export default Header