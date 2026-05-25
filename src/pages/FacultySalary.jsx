import React, { useEffect, useState } from 'react'
import { getMySalaryPayments } from '../api'
import { getAuth } from '../utils/session'
import FacultyLayout from '../components/faculty/FacultyLayout'
import './AdminSalary.css'

export default function FacultySalary() {
    const [payments, setPayments] = useState([])
    const [error, setError] = useState('')

    async function load() {
        setError('')
        try {
            const { token } = getAuth()
            const list = await getMySalaryPayments(token)
            setPayments(list || [])
        } catch (e) { setError(e?.message || 'Failed to load') }
    }
    useEffect(() => { load() }, [])

    async function downloadReceipt(id, receiptNo = '') {
        try {
            const { token } = getAuth()
            const base = (import.meta.env.VITE_API_BASE || '')
            // Directly fetch HTML receipt and open in a new tab
            const htmlRes = await fetch(`${base}/api/salary/receipt/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            if (!htmlRes.ok) {
                const err = await htmlRes.json().catch(() => ({ message: 'Download failed' }))
                throw new Error(err.message || 'Download failed')
            }
            const html = await htmlRes.text()
            const blob = new Blob([html], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            window.open(url, '_blank')
        } catch (e) {
            setError(e?.message || 'Failed to download receipt')
        }
    }

    return (
        <FacultyLayout title="Salary">
            <div className="faculty-salary-page">
                <h2>My Salary</h2>
                {error && <div className="error">{error}</div>}
                <table className="payments-table">
                    <thead>
                        <tr>
                            <th>Receipt</th>
                            <th>Month</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map(p => (
                            <tr key={p._id}>
                                <td>{p.receiptNo || '-'}</td>
                                <td>{p.month}</td>
                                <td>₹{p.amount}</td>
                                <td>{p.status}</td>
                                <td>
                                    {p.status === 'paid' ? (
                                        <button type="button" onClick={() => downloadReceipt(p._id, p.receiptNo)}>Download Receipt (PDF)</button>
                                    ) : (
                                        <span style={{ opacity: 0.7 }}>Pending</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </FacultyLayout>
    )
}
