import React, { useState } from 'react'
import { clearAuth, getAuth } from '../../utils/session'
import { useNavigate } from 'react-router-dom'
import { logoutApi } from '../../api'

export default function Header({ onToggleSidebar }) {
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const auth = getAuth()
    const [profile, setProfile] = useState({ name: '', email: '', contact: '', address: '', avatar: '' })
    const displayName = (profile.name) || (auth && (auth.name || auth.username)) || 'Admin'

    React.useEffect(() => {
        try {
            const v = localStorage.getItem('admin_profile')
            if (v) setProfile(JSON.parse(v))
        } catch (e) { }
    }, [])

    // If no saved profile, try to prefill from JWT payload (token)
    React.useEffect(() => {
        try {
            const v = localStorage.getItem('admin_profile')
            if (v) return
        } catch (e) { }
        try {
            const token = sessionStorage.getItem('erp_token') || localStorage.getItem('erp_token')
            if (!token) return
            const payload = (() => {
                try {
                    const p = token.split('.')[1]
                    const json = atob(p.replace(/-/g, '+').replace(/_/g, '/'))
                    return JSON.parse(decodeURIComponent(escape(json)))
                } catch (err) { return null }
            })()
            if (payload) {
                setProfile(p => ({
                    ...p,
                    name: payload.name || payload.fullname || p.name,
                    email: payload.email || p.email,
                    avatar: payload.avatar || payload.picture || p.avatar || ''
                }))
            }
        } catch (e) { }
    }, [])

    React.useEffect(() => {
        function onProfileUpdated(e) {
            if (!e || !e.detail || e.detail.role !== 'admin') return
            try {
                const v = localStorage.getItem('admin_profile')
                if (v) setProfile(JSON.parse(v))
            } catch (err) { }
        }
        window.addEventListener('erp_profile_updated', onProfileUpdated)
        return () => window.removeEventListener('erp_profile_updated', onProfileUpdated)
    }, [])

    function handleLogout() {
        setOpen(false)
        try { logoutApi().catch(() => { }) } catch (e) { }
        clearAuth({ global: false })
        navigate('/admin-login')
    }

    function handleViewProfile() {
        setOpen(false)
        navigate('/admin/profile')
    }

    return (
        <header className="admin-header">
            <button
                className="hamburger"
                aria-label="Toggle sidebar"
                onClick={onToggleSidebar}
            >
                <span />
                <span />
                <span />
            </button>

            <div className="admin-title">ADMIN PANEL</div>

            <div className="header-spacer" />

            <div style={{ position: 'relative' }}>
                <button
                    className="profile-btn"
                    onClick={() => setOpen(o => !o)}
                    title="Profile"
                    aria-haspopup="menu"
                    aria-expanded={open}
                >
                    <span className="profile-avatar-ring" aria-hidden>
                        {profile.avatar ? (
                            <img src={profile.avatar} alt={`${displayName} avatar`} className="profile-avatar-img" />
                        ) : (
                            <div className="avatar-placeholder">{(displayName || 'A')[0].toUpperCase()}</div>
                        )}
                    </span>
                    <span className="profile-label">{(displayName || 'Admin').split(' ')[0]}</span>
                </button>
                {open && (
                    <div className="profile-dropdown" role="menu">
                        <button className="profile-item" onClick={handleViewProfile}>View profile</button>
                        <button className="profile-item" onClick={handleLogout}>Logout</button>
                    </div>
                )}
            </div>
        </header>
    )
}
