import React, { useEffect, useState } from 'react'
import { getFeeStructure, getFeeForClass, createRazorpayOrder, confirmPayment, getMyReceipts, getMyStudent } from '../../api'
import { getAuth } from '../../utils/session'
import './Fees.css'

export default function Fees() {
    const [fees, setFees] = useState({})
    const [receipts, setReceipts] = useState([])
    const [student, setStudent] = useState(null)
    const [selectedReceipt, setSelectedReceipt] = useState(null)
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [paymentDraft, setPaymentDraft] = useState({ cls: '', term: '', amount: 0, name: '', email: '', rollNo: '' })

    async function load() {
        try {
            const { token } = getAuth()
            // load student record first
            let studentRecord = null
            try {
                studentRecord = await getMyStudent(token)
                setStudent(studentRecord)
            } catch (err) {
                // ignore if student record not found
            }

            // If we have a student record, fetch fee only for that class/section
            const map = {}
            if (studentRecord && studentRecord.class) {
                const cls = String(studentRecord.class)
                try {
                    const entries = await getFeeForClass(cls, studentRecord.section || 'ALL', token)
                    if (entries && entries.length) map[cls] = entries[0]
                } catch (err) {
                    console.warn('Failed to fetch fee for class', err)
                }
            } else {
                // fallback: admin endpoint (if token has rights) — keep original behavior
                try {
                    const data = await getFeeStructure(token)
                    const grouped = {}
                        ; (data || []).forEach(f => { grouped[f.class] = grouped[f.class] || []; grouped[f.class].push(f) })
                    Object.keys(grouped).forEach(cls => {
                        const items = grouped[cls]
                        const all = items.find(x => x.section === 'ALL') || items[0]
                        map[cls] = all
                    })
                } catch (err) { console.warn('Failed to load all fee structure', err) }
            }

            setFees(map)
            const my = await getMyReceipts(token)
            setReceipts(my || [])
        } catch (e) { console.error(e) }
    }

    useEffect(() => { load() }, [])

    function isPaidForTerm(cls, term) {
        return receipts.some(r => (r.class === cls) && (r.term === term))
    }

    function parseYmd(s) {
        if (!s) return null
        try { const [y, m, d] = String(s).split('-').map(n => parseInt(n, 10)); if (!y || !m || !d) return null; return new Date(y, m - 1, d) } catch { return null }
    }
    function monthsBetween(a, b) {
        const years = b.getFullYear() - a.getFullYear();
        const months = years * 12 + (b.getMonth() - a.getMonth());
        // if b day > a day, count as a month elapsed
        return months + (b.getDate() > a.getDate() ? 1 : 0)
    }
    function daysBetween(a, b) {
        const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0)
        return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
    }
    function calcFineForTerm(f, termLabel) {
        const today = new Date()
        const isT1 = termLabel === 'Term1'
        const dueStr = isT1 ? (f.term1DueDate || '') : (f.term2DueDate || '')
        const mode = isT1 ? (f.term1FineMode || 'none') : (f.term2FineMode || 'none')
        const rate = Number(isT1 ? (f.term1FineAmount || 0) : (f.term2FineAmount || 0))
        const due = parseYmd(dueStr)
        if (!due || !rate || mode === 'none') return 0
        if (today <= due) return 0
        if (mode === 'flat') return rate
        if (mode === 'per_day') return rate * daysBetween(new Date(due), new Date(today))
        if (mode === 'per_month') return rate * Math.max(1, monthsBetween(new Date(due), new Date(today)))
        return 0
    }

    function pay(cls, term, amount) {
        // open modal to allow editing name/email/roll before proceeding
        const auth = getAuth()
        setPaymentDraft({ cls, term, amount, name: student?.name || auth.username || '', email: student?.email || auth.username || '', rollNo: student?.rollNo || '' })
        setPaymentModalOpen(true)
    }

    async function startPayment() {
        try {
            const { token, sub, username } = getAuth()
            const { cls, term, amount, name, email, rollNo } = paymentDraft
            setPaymentModalOpen(false)
            const order = await createRazorpayOrder(amount, `fee_${cls}_${term}_${Date.now()}`, token)
            const runtimeKey = import.meta.env.VITE_RAZORPAY_KEY || ''
            // Debug: log masked frontend key so we can verify the client read the env (remove this in production)
            try { console.log('Frontend Razorpay key present:', !!runtimeKey, 'key(masked):', runtimeKey ? (String(runtimeKey).slice(0, 8) + '...') : '<none>') } catch (e) { }

            // Ensure Razorpay SDK is loaded; if not, load it dynamically
            async function loadRazorpaySdk() {
                if (typeof window === 'undefined') return false
                if (window.Razorpay) return true
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script')
                    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
                    script.async = true
                    script.onload = () => resolve(true)
                    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'))
                    document.body.appendChild(script)
                })
            }
            if (!runtimeKey) {
                alert('Razorpay key is not configured. Set `VITE_RAZORPAY_KEY` in the frontend `.env` and restart the dev server.')
                return
            }
            const options = {
                key: runtimeKey,
                amount: order.amount,
                currency: order.currency,
                name: 'ERP Fee Payment',
                description: `Fee for Class ${cls} ${term}`,
                order_id: order.id,
                prefill: { name: name || username, email: email || username },
                notes: { rollNo: rollNo || '' },
                handler: async function (response) {
                    try {
                        const payload = {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            studentId: student?._id || sub,
                            studentName: name || student?.name || username,
                            studentEmail: email || student?.email || username,
                            class: cls,
                            term,
                            amount
                        }
                        await confirmPayment(payload, token)
                        alert('Payment successful')
                        await load()
                    } catch (err) { console.error(err); alert('Payment confirmation failed') }
                }
            }
            try {
                await loadRazorpaySdk()
            } catch (err) {
                console.error('Failed to load Razorpay SDK', err)
                alert('Failed to load Razorpay SDK. Check your network or try again.')
                return
            }

            if (!window.Razorpay) {
                alert('Razorpay SDK not available after loading.')
                return
            }

            const rzp = new window.Razorpay(options)
            try {
                rzp.open()
            } catch (err) {
                console.error('Razorpay open failed', err)
                alert('Failed to open Razorpay checkout. See console for details.')
            }
        } catch (e) { console.error(e); alert('Payment failed to start') }
    }

    const classesToShow = student?.class ? [student.class] : Object.keys(fees)

    function openReceipt(r) {
        setSelectedReceipt(r)
    }

    function closeReceipt() {
        setSelectedReceipt(null)
    }

    function closePaymentModal() {
        setPaymentModalOpen(false)
    }

    return (
        <div className="student-page fees-page">
            <header className="fees-header">
                <div>
                    <h2>Your Fees</h2>
                    <p className="muted">Manage and pay your term fees securely.</p>
                </div>
                <div className="student-info">
                    <div className="student-name">{student?.name || getAuth().username}</div>
                    <div className="student-meta">{student?.class ? `Class ${student.class}` : ''} {student?.section ? ` • Section ${student.section}` : ''} {student?.rollNo ? ` • Roll ${student.rollNo}` : ''}</div>
                </div>
            </header>

            <main>
                <section className="fees-list">
                    {classesToShow.length === 0 && <div className="empty">No fee data available.</div>}
                    {classesToShow.map(cls => {
                        const f = fees[cls]
                        if (!f) return (
                            <div key={cls} className="fee-card empty-card">
                                <div className="fee-title">Class {cls}</div>
                                <div className="empty">No fee structure set for this class.</div>
                            </div>
                        )
                        return (
                            <div key={cls} className="fee-card">
                                <div className="fee-title">Class {cls}</div>
                                <div className="fee-terms">
                                    <div className="term">
                                        <div className="term-name">Term 1</div>
                                        {(() => {
                                            const base = Number(f.term1 || 0); const fine = isPaidForTerm(cls, 'Term1') ? 0 : calcFineForTerm(f, 'Term1'); const total = base + fine; return (
                                                <>
                                                    <div className="term-amount">₹{total} {fine > 0 && <span className="muted" style={{ fontSize: 12 }}>(includes fine ₹{fine})</span>}</div>
                                                    <div className="term-action">{isPaidForTerm(cls, 'Term1') ? <button className="btn ghost" onClick={() => openReceipt(receipts.find(r => r.class === cls && r.term === 'Term1'))}>View Receipt</button> : <button className="btn primary" onClick={() => pay(cls, 'Term1', total)}>Pay</button>}</div>
                                                    {f.term1DueDate && <div className="muted" style={{ fontSize: 12 }}>Due date: {f.term1DueDate}</div>}
                                                </>
                                            )
                                        })()}
                                    </div>

                                    <div className="term">
                                        <div className="term-name">Term 2</div>
                                        {(() => {
                                            const base = Number(f.term2 || 0); const fine = isPaidForTerm(cls, 'Term2') ? 0 : calcFineForTerm(f, 'Term2'); const total = base + fine; return (
                                                <>
                                                    <div className="term-amount">₹{total} {fine > 0 && <span className="muted" style={{ fontSize: 12 }}>(includes fine ₹{fine})</span>}</div>
                                                    <div className="term-action">{isPaidForTerm(cls, 'Term2') ? <button className="btn ghost" onClick={() => openReceipt(receipts.find(r => r.class === cls && r.term === 'Term2'))}>View Receipt</button> : <button className="btn primary" onClick={() => pay(cls, 'Term2', total)}>Pay</button>}</div>
                                                    {f.term2DueDate && <div className="muted" style={{ fontSize: 12 }}>Due date: {f.term2DueDate}</div>}
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </section>

                {/* Payment modal (edit prefill before starting Razorpay) */}
                {paymentModalOpen && (
                    <div className="modal-backdrop" role="dialog" onClick={closePaymentModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h4>Confirm Payment</h4>
                                <button className="btn ghost" onClick={closePaymentModal}>Close</button>
                            </div>
                            <div className="modal-body">
                                <div style={{ display: 'grid', gap: 8 }}>
                                    <label>Name<input value={paymentDraft.name} onChange={e => setPaymentDraft(p => ({ ...p, name: e.target.value }))} /></label>
                                    <label>Email<input value={paymentDraft.email} onChange={e => setPaymentDraft(p => ({ ...p, email: e.target.value }))} /></label>
                                    <label>Roll No<input value={paymentDraft.rollNo} onChange={e => setPaymentDraft(p => ({ ...p, rollNo: e.target.value }))} /></label>
                                    {/* Razorpay key must be configured via VITE_RAZORPAY_KEY (no runtime input). */}
                                    <label>Class<input value={paymentDraft.cls} readOnly /></label>
                                    <label>Term<input value={paymentDraft.term} readOnly /></label>
                                    <label>Amount<input value={paymentDraft.amount} readOnly /></label>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                    <button className="btn outline" onClick={closePaymentModal}>Cancel</button>
                                    <button className="btn" onClick={startPayment}>Proceed to Pay</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <section className="receipts">
                    <h3>Your Payments</h3>
                    {receipts.length === 0 && <div className="empty">No payments found.</div>}
                    {receipts.length > 0 && (
                        <table className="receipts-table">
                            <thead>
                                <tr><th>Date</th><th>Class</th><th>Term</th><th>Amount</th><th>Payment ID</th><th></th></tr>
                            </thead>
                            <tbody>
                                {receipts.map(r => (
                                    <tr key={r._id}>
                                        <td>{new Date(r.createdAt || r.date || Date.now()).toLocaleString()}</td>
                                        <td>{r.class}</td>
                                        <td>{r.term}</td>
                                        <td>₹{r.amount}</td>
                                        <td className="mono">{r.razorpayPaymentId || r.razorpay_payment_id || '-'}</td>
                                        <td><button className="btn ghost" onClick={() => openReceipt(r)}>View</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </main>

            {selectedReceipt && (
                <div className="modal-backdrop" role="dialog" onClick={closeReceipt}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h4>Receipt</h4>
                            <button className="btn ghost" onClick={closeReceipt}>Close</button>
                        </div>
                        <div className="modal-body">
                            <div><strong>Student:</strong> {selectedReceipt.studentName || selectedReceipt.studentEmail}</div>
                            <div><strong>Class:</strong> {selectedReceipt.class} • <strong>Term:</strong> {selectedReceipt.term}</div>
                            <div><strong>Amount:</strong> ₹{selectedReceipt.amount}</div>
                            <div><strong>Payment ID:</strong> {selectedReceipt.razorpayPaymentId || selectedReceipt.razorpay_payment_id}</div>
                            <div className="mono small">Order ID: {selectedReceipt.razorpayOrderId || selectedReceipt.razorpay_order_id}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
