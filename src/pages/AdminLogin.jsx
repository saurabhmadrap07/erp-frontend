import React, { useState } from 'react'
import { login } from '../api'
import { setAuth } from '../utils/session'
import './Auth.css'

export default function AdminLogin() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const data = await login(username, password)
            // ensure only admin accounts may login here
            if (data.role !== 'admin') {
                setError('This account does not have admin access.')
                setLoading(false)
                return
            }

            // save token to session (per-tab)
            setAuth(data.token, data.role)
            // redirect to suggested path
            window.location.href = data.redirect || '/'
        } catch (err) {
            setError(err.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-root">
            <div className="auth-card">
                <div className="accent" />
                <div className="brand">
                    <div className="logo">S</div>
                    <div>
                        <div style={{ fontWeight: 700 }}>School ERP</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Admin Portal</div>
                    </div>
                </div>

                <h2>Admin Login</h2>
                <form onSubmit={handleSubmit}>
                    <label>
                        Email or Username
                        <input value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </label>
                    <label>
                        Password
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </label>

                    {error && <div className="auth-error">{error}</div>}

                    <div className="auth-actions">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Logging...' : 'Login'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button type="button" className="btn-forgot" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/forgot-password'); window.dispatchEvent(new PopStateEvent('popstate')) }}>Forgot password?</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
