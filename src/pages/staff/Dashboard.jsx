import React from 'react'
import StaffLayout from '../../components/staff/StaffLayout'
import { Link } from 'react-router-dom'

export default function StaffDashboard() {
    // Minimal attendance card on dashboard; details available on the attendance page
    return (
        <StaffLayout title="Dashboard">
            <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 640 }}>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, background: '#ffffff', boxShadow: '0 2px 6px rgba(2,6,23,0.04)' }}>
                        <h3 style={{ margin: 0 }}>Attendance</h3>
                        <p style={{ marginTop: 8, color: '#475569' }}>Quick summary — view detailed attendance and history on the attendance page.</p>
                        <div style={{ marginTop: 12 }}>
                            <Link to="/staff/attendance"><button className="btn">Open Attendance</button></Link>
                        </div>
                    </div>
                </div>
            </div>
        </StaffLayout>
    )
}
