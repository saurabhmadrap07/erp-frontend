import React, { useEffect, useState } from 'react'
import AdminLayout from '../components/admin/AdminLayout'
import { API_BASE } from '../api'
import { getAuth } from '../utils/session'

function formatNumber(n) {
    const num = (typeof n === 'number') ? n : (Number(n) || 0)
    return num.toLocaleString()
}

export default function AdminPanel() {
    const [counts, setCounts] = useState({ students: 0, teachers: 0, classes: 0, fees: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Try to fetch admin dashboard data if backend supports it.
        // If not available, fallback to demo numbers.
        async function load() {
            setLoading(true)
            try {
                const { token } = getAuth()
                const res = await fetch(`${API_BASE}/api/admin/dashboard`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
                if (res.ok) {
                    const data = await res.json()
                    if (data && (data.students || data.teachers || data.classes || data.fees)) {
                        setCounts({
                            students: data.students || 0,
                            teachers: data.teachers || 0,
                            classes: data.classes || 0,
                            fees: data.fees || 0,
                        })
                        setLoading(false)
                        return
                    }
                }

                // fallback demo values suitable for an educational look
                setCounts({ students: 1248, teachers: 86, classes: 32, fees: 482350 })
                setLoading(false)
            } catch (err) {
                // On any error, log and keep sensible defaults
                // ensure loading is turned off so UI updates
                // eslint-disable-next-line no-console
                console.error('Failed to load admin dashboard', err)
                setLoading(false)
            }
        }

        load()
    }, [])

    return (
        <AdminLayout>
            <div className="admin-page">
                <h2>Welcome to Admin Dashboard</h2>
                <div className="dashboard-cards" role="list">
                    <div className="stat-card students" role="listitem">
                        <div className="stat-icon">🎓</div>
                        <div className="stat-body">
                            <div className="stat-title">Total Students</div>
                            <div className="stat-value">{formatNumber(counts.students)}</div>
                        </div>
                    </div>

                    <div className="stat-card teachers" role="listitem">
                        <div className="stat-icon">👩‍🏫</div>
                        <div className="stat-body">
                            <div className="stat-title">Total Teachers</div>
                            <div className="stat-value">{formatNumber(counts.teachers)}</div>
                        </div>
                    </div>

                    <div className="stat-card classes" role="listitem">
                        <div className="stat-icon">🏫</div>
                        <div className="stat-body">
                            <div className="stat-title">Total Classes</div>
                            <div className="stat-value">{formatNumber(counts.classes)}</div>
                        </div>
                    </div>

                    <div className="stat-card fees" role="listitem">
                        <div className="stat-icon">💰</div>
                        <div className="stat-body">
                            <div className="stat-title">Fee Collection</div>
                            <div className="stat-value">{`₹ ${formatNumber(counts.fees)}`}</div>
                        </div>
                    </div>
                </div>

                <p style={{ marginTop: 18 }}>This is the admin panel placeholder. Select a section from the sidebar.</p>
            </div>
        </AdminLayout>
    )
}
