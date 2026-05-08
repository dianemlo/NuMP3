import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'

function Auth() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    identifier: '',
    password: ''
  })

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (token) {
      navigate('/profile')
    }
  }, [navigate])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const endpoint = isLogin
        ? 'http://localhost:5000/api/auth/login'
        : 'http://localhost:5000/api/auth/register'

      const bodyData = isLogin
        ? {
          identifier: formData.identifier,
          password: formData.password
        }
        : {
          username: formData.username,
          email: formData.email,
          password: formData.password
        }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong')
      }

      setMessage(data.message)

      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        window.dispatchEvent(new Event('authChange'))
        navigate('/profile')
      }

      setFormData({
        username: '',
        email: '',
        identifier: '',
        password: ''
      })
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container panel">
        <h2 className="auth-title">
          {isLogin ? 'SYSTEM LOGIN' : 'CREATE PROFILE'}
        </h2>

        <p className="auth-subtitle">
          {isLogin ? '// Welcome back to the frequency' : '// Join the NuMP3 network'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="input-group">
              <label>USERNAME</label>
              <input
                type="text"
                name="username"
                placeholder="user.wav"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label>{isLogin ? 'EMAIL OR USERNAME' : 'EMAIL ADDRESS'}</label>
            <input
              type={isLogin ? 'text' : 'email'}
              name={isLogin ? 'identifier' : 'email'}
              placeholder={isLogin ? 'username or email' : 'name@domain.com'}
              value={isLogin ? formData.identifier : formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>PASSWORD</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'LOADING...' : isLogin ? 'INITIALIZE' : 'REGISTER'}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already a member?"}
            <span
              className="toggle-link"
              onClick={() => {
                setIsLogin(!isLogin)
                setMessage('')
              }}
            >
              {isLogin ? ' SIGN UP' : ' LOGIN'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Auth
