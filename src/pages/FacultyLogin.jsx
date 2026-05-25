import React, { useState } from 'react'
import { login } from '../api'
import { setAuth } from '../utils/session'
import './Auth.css'

export default function FacultyLogin() {
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
            // ensure only faculty may login here
            if (data.role !== 'faculty') {
                setError('This account does not have faculty access.')
                setLoading(false)
                return
            }

            setAuth(data.token, data.role)
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
                    <div className="logo">F</div>
                    <div>
                        <div style={{ fontWeight: 700 }}>School ERP</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Faculty Portal</div>
                    </div>
                </div>

                <h2>Faculty Login</h2>
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
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Logging...' : 'Login'}
                        </button>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <a href="/faculty-register" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/faculty-register'); window.dispatchEvent(new PopStateEvent('popstate')) }}>Register</a>
                            <a href="/forgot-password" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/forgot-password'); window.dispatchEvent(new PopStateEvent('popstate')) }}>Forgot password?</a>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
