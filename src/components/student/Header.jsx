import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../utils/auth'

export default function Header({ onToggleSidebar }) {
    const [open, setOpen] = useState(false)
    const [profile, setProfile] = useState({ name: '', admission: '', class: '', email: '', contact: '', avatar: '' })
    const panelRef = useRef()

    useEffect(() => {
        try {
            const v = localStorage.getItem('student_profile')
            if (v) { setProfile(JSON.parse(v)); return }
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
                setProfile(p => ({ ...p, name: payload.name || payload.fullname || p.name, email: payload.email || p.email, avatar: payload.avatar || payload.picture || p.avatar }))
            }
        } catch (e) { }
    }, [])

    useEffect(() => {
        function onProfileUpdated(e) {
            if (!e || !e.detail || e.detail.role !== 'student') return
            try {
                const v = localStorage.getItem('student_profile')
                if (v) setProfile(JSON.parse(v))
            } catch (err) { }
        }
        window.addEventListener('erp_profile_updated', onProfileUpdated)
        return () => window.removeEventListener('erp_profile_updated', onProfileUpdated)
    }, [])

    useEffect(() => {
        function onDoc(e) {
            if (!panelRef.current) return
            if (!panelRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('click', onDoc)
        return () => document.removeEventListener('click', onDoc)
    }, [])

    const navigate = useNavigate()
    function handleLogout() {
        logout('/student-login')
        navigate('/student-login')
    }

    function handleViewProfile() {
        setOpen(false)
        navigate('/student/profile')
    }

    return (
        <header className="student-header">
            <div className="header-left">
                <button className="hamburger" aria-label="Toggle sidebar" onClick={onToggleSidebar}>
                    <span />
                    <span />
                    <span />
                </button>
            </div>

            <div className="header-center">
                <div className="student-title">STUDENT PANEL</div>
            </div>

            <div className="header-right">
                <div className="student-profile" ref={panelRef}>
                    <button className="profile-btn" onClick={() => setOpen(s => !s)} aria-haspopup="true" aria-expanded={open}>
                        {profile.avatar ? <img src={profile.avatar} alt="avatar" /> : <div className="avatar-placeholder">S</div>}
                        <span className="profile-label">{(profile.name || '').split(' ')[0] || 'Me'}</span>
                    </button>

                    {open && (
                        <div className="profile-panel" role="menu">
                            <button className="profile-item" onClick={handleViewProfile}>View profile</button>
                            <button className="profile-item" onClick={handleLogout}>Logout</button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
