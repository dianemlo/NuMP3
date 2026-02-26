import { useState } from 'react'
import './Auth.css'

function Auth() {
  const [isLogin, setIsLogin] = useState(true)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Add authentication logic here
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
              <input type="text" placeholder="user.wav" required />
            </div>
          )}

          <div className="input-group">
            <label>EMAIL ADDRESS</label>
            <input type="email" placeholder="name@domain.com" required />
          </div>

          <div className="input-group">
            <label>PASSWORD</label>
            <input type="password" placeholder="••••••••" required />
          </div>

          <button type="submit" className="auth-submit-btn">
            {isLogin ? 'INITIALIZE' : 'REGISTER'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already a member?"}
            <span className="toggle-link" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? ' SIGN UP' : ' LOGIN'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Auth