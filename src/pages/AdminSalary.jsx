import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSalaryFaculties, getSalaryPayments, createSalaryPayment, createSalaryOrder, confirmSalaryPayment } from '../api'
import { getAuth } from '../utils/session'
import AdminLayout from '../components/admin/AdminLayout'
import './AdminSalary.css'

export default function AdminSalary() {
    const navigate = useNavigate()
    const [faculties, setFaculties] = useState([])
    const [payments, setPayments] = useState([])
    const [form, setForm] = useState({ facultyId: '', month: '', amount: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function loadData() {
        setError('')
        try {
            const { token } = getAuth()
            const [facs, pays] = await Promise.all([
                getSalaryFaculties(token),
                getSalaryPayments(token),
            ])
            setFaculties(facs || [])
            setPayments(pays || [])
        } catch (e) { setError(e?.message || 'Failed to load'); }
    }

    useEffect(() => { loadData() }, [])

    function onChange(e) {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))
    }

    async function loadRazorpayScript() {
        return new Promise((resolve) => {
            if (window.Razorpay) return resolve(true)
            const s = document.createElement('script')
            s.src = 'https://checkout.razorpay.com/v1/checkout.js'
            s.onload = () => resolve(true)
            s.onerror = () => resolve(false)
            document.body.appendChild(s)
        })
    }

    async function onPay() {
        setLoading(true); setError('')
        try {
            const amountNum = Number(form.amount)
            if (!form.facultyId || !form.month || !amountNum) throw new Error('Select faculty, month and amount')
            const { token } = getAuth()
            // Try Razorpay order for redirect checkout
            const orderResp = await createSalaryOrder({ facultyId: form.facultyId, month: form.month, amount: amountNum }, token)
            const loaded = await loadRazorpayScript()
            const keyId = (import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim()
            if (!keyId) {
                setError('Razorpay key missing in frontend env (VITE_RAZORPAY_KEY_ID).')
                return
            }
            if (loaded && window.Razorpay && orderResp && orderResp.order) {
                const options = {
                    key: keyId,
                    amount: orderResp.order.amount,
                    currency: orderResp.order.currency || 'INR',
                    name: 'ERP Admin',
                    description: `Salary for ${orderResp.faculty?.name || ''} - ${form.month}`,
                    order_id: orderResp.order.id,
                    prefill: { name: orderResp.faculty?.name || 'Faculty', email: orderResp.faculty?.email || '' },
                    notes: { facultyId: orderResp.faculty?.id, month: form.month },
                    handler: async function (resp) {
                        try {
                            const confirmed = await confirmSalaryPayment({ facultyId: form.facultyId, month: form.month, amount: amountNum, orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature }, token)
                            setPayments(prev => [confirmed, ...prev])
                            setForm(prev => ({ ...prev, amount: '' }))
                        } catch (e) { setError(e?.message || 'Payment confirm failed') }
                    },
                    modal: { ondismiss: function () { } },
                    method: { card: true, netbanking: true, wallet: true, upi: true },
                    theme: { color: '#7c3aed' },
                }
                const rzp = new window.Razorpay(options)
                rzp.on('payment.failed', function (resp) {
                    setError(resp?.error?.description || 'Payment failed')
                })
                rzp.open()
            } else {
                // Fallback: direct mock payment
                const created = await createSalaryPayment({ facultyId: form.facultyId, month: form.month, amount: amountNum }, token)
                setPayments(prev => [created, ...prev])
                setForm(prev => ({ ...prev, amount: '' }))
            }
        } catch (e) { setError(e?.message || 'Payment failed') }
        finally { setLoading(false) }
    }

    async function downloadReceipt(id, receiptNo = '') {
        try {
            const { token } = getAuth()
            const base = (import.meta.env.VITE_API_BASE || '')
            // Fetch HTML receipt and open in a new tab (use browser Print to save PDF)
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
        <AdminLayout title="Salary">
            <div className="admin-salary-page admin-page">
                <h2>Faculty Salary</h2>

                <div className="salary-form colorful-vertical-form">
                    <label>
                        Faculty
                        <select className="colorful-input" name="facultyId" value={form.facultyId} onChange={onChange}>
                            <option value="">Select faculty</option>
                            {faculties.map(f => <option key={f._id} value={f._id}>{f.name} ({f.employeeId || 'N/A'})</option>)}
                        </select>
                    </label>
                    <label>
                        Month
                        <input className="colorful-input colorful-placeholder" name="month" placeholder="e.g. December 2025" value={form.month} onChange={onChange} />
                    </label>
                    <label>
                        Amount (₹)
                        <input className="colorful-input colorful-placeholder" name="amount" type="number" value={form.amount} onChange={onChange} />
                    </label>
                    <button className="colorful-button" disabled={loading} onClick={onPay}>{loading ? 'Paying…' : 'Pay (Test)'}</button>
                    {error && <div className="error">{error}</div>}
                </div>

                <h3>Payments</h3>
                <table className="payments-table">
                    <thead>
                        <tr>
                            <th>Receipt</th>
                            <th>Faculty</th>
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
                                <td>{p.facultyName || p.facultyId}</td>
                                <td>{p.month}</td>
                                <td>₹{p.amount}</td>
                                <td>{p.status}</td>
                                <td>
                                    {p.status === 'paid' ? (
                                        <>
                                            <span style={{ marginRight: 8 }}>Paid</span>
                                            <button type="button" onClick={() => downloadReceipt(p._id, p.receiptNo)}>Download Receipt (PDF)</button>
                                        </>
                                    ) : (
                                        <span style={{ opacity: 0.7 }}>Pending</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    )
}
