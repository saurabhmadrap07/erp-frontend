import React, { useEffect, useState } from 'react'
import AdminLayout from '../components/admin/AdminLayout'
import { API_BASE, getStaffList, getStaffSalaryPayments, createStaffSalaryOrder, confirmStaffSalaryPayment } from '../api'
import { getAuth } from '../utils/session'

function uuid() { return Math.random().toString(36).slice(2) }
function loadLS(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def } }
function saveLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch { } }

function formatStaffId(staff) {
    if (!staff) return ''
    const eid = (staff.employeeId || '').toString().trim()
    if (eid && /^s/i.test(eid)) return eid
    const mongoId = (staff._id || '').toString()
    if (!mongoId) return ''
    const tail = mongoId.slice(-6).toUpperCase()
    return `STF-${tail}`
}

export default function AdminStaffSalary() {
    const [staffList, setStaffList] = useState([])
    const [payments, setPayments] = useState([])
    const [form, setForm] = useState({ staffId: '', month: '', amount: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // no local storage; all data from backend

    async function load() {
        setError('')
        try {
            const { token } = getAuth()
            const [staff, pays] = await Promise.all([
                getStaffList(token),
                getStaffSalaryPayments(token),
            ])
            setStaffList(Array.isArray(staff) ? staff : [])
            setPayments(Array.isArray(pays) ? pays : [])
        } catch (e) { setError(e?.message || 'Failed to load staff') }
    }
    useEffect(() => { load() }, [])

    function onChange(e) { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })) }

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
            if (!form.staffId || !form.month || !amountNum) throw new Error('Select staff, month and amount')
            const { token } = getAuth()
            const orderResp = await createStaffSalaryOrder({ userId: form.staffId, month: form.month, amount: amountNum }, token)
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
                    description: `Salary for ${orderResp.staff?.name || ''} - ${form.month}`,
                    order_id: orderResp.order.id,
                    prefill: { name: orderResp.staff?.name || 'Staff', email: orderResp.staff?.email || '' },
                    notes: { userId: orderResp.staff?.id, month: form.month },
                    handler: async function (resp) {
                        try {
                            const confirmed = await confirmStaffSalaryPayment({ userId: form.staffId, month: form.month, amount: amountNum, orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature }, token)
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
                setError('Failed to initiate payment')
            }
        } catch (e) { setError(e?.message || 'Payment failed') }
        finally { setLoading(false) }
    }

    async function downloadReceipt(id) {
        try {
            const { token } = getAuth()
            const htmlUrl = `${API_BASE}/api/staff-salary/receipt/${id}?token=${encodeURIComponent(token)}`
            window.open(htmlUrl, '_blank')
        } catch (e) {
            setError(e?.message || 'Failed to open receipt')
        }
    }

    return (
        <AdminLayout title="Staff Salary">
            <div className="admin-salary-page admin-page">
                <h2>Staff Salary</h2>
                <div className="salary-form colorful-vertical-form">
                    <label>
                        Staff
                        <select className="colorful-input" name="staffId" value={form.staffId} onChange={onChange}>
                            <option value="">Select staff</option>
                            {staffList.map(s => <option key={s._id} value={s._id}>{s.name} ({formatStaffId(s) || 'N/A'})</option>)}
                        </select>
                    </label>
                    {form.staffId && (
                        <div className="readonly-field">
                            <strong>Staff ID:</strong> {(() => { const st = staffList.find(x => String(x._id) === String(form.staffId)); return formatStaffId(st) })()}
                        </div>
                    )}
                    <label>
                        Month
                        <input className="colorful-input colorful-placeholder" name="month" placeholder="e.g. December 2025" value={form.month} onChange={onChange} />
                    </label>
                    <label>
                        Amount (₹)
                        <input className="colorful-input colorful-placeholder" name="amount" type="number" value={form.amount} onChange={onChange} />
                    </label>
                    <button className="colorful-button" disabled={loading} onClick={onPay}>{loading ? 'Paying…' : 'Mark as Paid'}</button>
                    {error && <div className="error">{error}</div>}
                </div>

                <h3>Payments</h3>
                <table className="payments-table">
                    <thead>
                        <tr>
                            <th>Receipt</th>
                            <th>Staff</th>
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
                                <td>{p.staffName || p.userId}</td>
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
        </AdminLayout>
    )
}
