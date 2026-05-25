import React, { useEffect, useState } from 'react';
import StudentLayout from '../../components/student/StudentLayout';
import { getAuth } from '../../utils/session';
import { getMyTransportAllocations, getMyTransportReceipts, createTransportRazorpayOrder, confirmTransportPayment, markTransportAllocationPaid } from '../../api';

function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

export default function StudentTransport() {
    const { token } = getAuth();
    const [allocs, setAllocs] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [viewMode, setViewMode] = useState('details') // 'details' | 'fees'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [paying, setPaying] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [a, r] = await Promise.all([
                    getMyTransportAllocations(token),
                    getMyTransportReceipts(token)
                ]);
                setAllocs(Array.isArray(a) ? a : (a ? [a] : []));
                setReceipts(Array.isArray(r) ? r : []);
            } catch (e) {
                setError(e.message || 'Failed to load transport info');
            } finally {
                setLoading(false);
            }
        })();
    }, [token]);

    function isAllocationPaid(a) {
        if (!a) return false
        try {
            if (a.paid) return true
            if (Array.isArray(a.payments) && a.payments.some(p => p && String(p.status).toLowerCase() === 'paid')) return true
            // also check receipts state for matching allocation id
            if (Array.isArray(receipts) && receipts.some(r => String(r.allocationId || r.allocationId) === String(a._id || a.id))) return true
        } catch (e) { }
        return false
    }

    async function handlePay(allocation) {
        if (!allocation) return;
        setPaying(true);
        try {
            await loadRazorpayScript();
            const allocationId = allocation._id || allocation.id
            const amount = Number((allocation && allocation.fee && allocation.fee.amount) ?? allocation.amount ?? 0)
            if (!allocationId) return alert('Allocation id missing')
            const order = await createTransportRazorpayOrder(amount, `transport_${allocationId}`, token);
            const options = {
                key: order && (order.keyId || order.key_id) || 'rzp_test_YourKeyHere',
                amount: order.amount,
                currency: order.currency,
                name: 'School Name',
                description: 'Transport Fee Payment',
                order_id: order.id,
                handler: async function (response) {
                    try {
                        const res = await confirmTransportPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            allocationId: allocationId,
                            amount: amount,
                        }, token);
                        // Optimistic UI update: mark allocation paid immediately and add receipt if available
                        try {
                            console.log('confirmTransportPayment response:', res)
                            setAllocs(prev => prev.map(x => (String(x._id || x.id) === String(allocationId) ? { ...x, paid: true, payments: (x.payments || []).concat([{ status: 'paid', amount, orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id }]) } : x)));
                            if (res && res.receipt) {
                                setReceipts(prev => [res.receipt, ...prev])
                            } else {
                                // If backend didn't return receipt in response even though DB shows it, refresh receipts explicitly
                                try {
                                    const fresh = await getMyTransportReceipts(token)
                                    console.log('fetched transport receipts after confirm:', fresh)
                                    setReceipts(Array.isArray(fresh) ? fresh : [])
                                } catch (e) { console.warn('failed to refresh transport receipts after confirm', e) }
                            }
                        } catch (e) { console.warn('optimistic update failed', e) }
                        // switch to receipts view so user sees the new receipt
                        try {
                            setViewMode('fees')
                            setTimeout(() => {
                                const el = document.getElementById('transport-fee-receipts')
                                if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth' })
                            }, 150)
                        } catch (e) { }
                        // notify admin pages to refresh
                        window.dispatchEvent(new Event('erp_transport_payment_completed'));
                        // reload allocations and receipts in background to ensure server state is synced
                        (async () => {
                            try {
                                const [a, r] = await Promise.all([getMyTransportAllocations(token), getMyTransportReceipts(token)])
                                console.log('refreshed allocations', a)
                                console.log('refreshed transport receipts', r)
                                setAllocs(Array.isArray(a) ? a : (a ? [a] : []))
                                setReceipts(Array.isArray(r) ? r : [])
                            } catch (e) { console.warn('Failed to refresh allocations/receipts after payment', e) }
                        })()
                    } catch (e) {
                        // try fallback: mark allocation paid (creates receipt on server without razorpay ids)
                        try {
                            await markTransportAllocationPaid(allocationId, token)
                            alert('Payment registered. Receipt created (fallback).')
                            // optimistic update for fallback
                            setAllocs(prev => prev.map(x => (String(x._id || x.id) === String(allocationId) ? { ...x, paid: true } : x)));
                            try {
                                const [a, r] = await Promise.all([getMyTransportAllocations(token), getMyTransportReceipts(token)])
                                setAllocs(Array.isArray(a) ? a : (a ? [a] : []))
                                setReceipts(Array.isArray(r) ? r : [])
                            } catch (e) { console.warn('Failed to refresh after fallback', e) }
                        } catch (e2) {
                            alert('Payment confirmation failed: ' + (e.message || 'Unknown error') + '\nFallback also failed: ' + (e2 && e2.message ? e2.message : String(e2)))
                        }
                    }
                },
                prefill: {
                    name: allocation.student && allocation.student.name,
                    email: allocation.student && allocation.student.email,
                },
                theme: { color: '#3399cc' },
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (e) {
            alert('Payment failed: ' + (e.message || 'Unknown error'));
        } finally {
            setPaying(false);
        }
    }

    return (
        <StudentLayout>
            <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>Transport Details</h2>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setViewMode('details')} style={{ padding: '6px 10px', borderRadius: 6, background: viewMode === 'details' ? '#0ea5e9' : '#f1f5f9', color: viewMode === 'details' ? '#fff' : '#0f172a' }}>Details</button>
                        <button onClick={() => setViewMode('fees')} style={{ padding: '6px 10px', borderRadius: 6, background: viewMode === 'fees' ? '#0ea5e9' : '#f1f5f9', color: viewMode === 'fees' ? '#fff' : '#0f172a' }}>Transport Fee</button>
                    </div>
                </div>
                {loading && <p>Loading...</p>}
                {error && <p style={{ color: 'crimson' }}>{error}</p>}
                {!loading && allocs.length === 0 && <p>No transport allocations found.</p>}
                {viewMode === 'details' && allocs.map(a => (
                    <section key={a._id || a.id} style={{ border: '2px solid #000', borderRadius: 12, padding: 16, background: '#f8fafc', marginBottom: 12 }}>
                        <h3>Allocation — {a.routeId || a._id}</h3>
                        <div><strong>When:</strong> {new Date(a.when || a.createdAt || Date.now()).toLocaleString()}</div>
                        <div><strong>Route:</strong> {a.routeName || a.routeId || '-'}</div>
                        <div><strong>Stop:</strong> {a.stopName || a.stopId || '-'}</div>
                        <div><strong>Bus:</strong> {a.busName || a.busId || '-'}</div>
                        <div><strong>Seat:</strong> {a.seatNo || '-'}</div>
                        <div><strong>Fee:</strong> ₹{a.fee?.amount || 0}</div>
                        <div style={{ marginTop: 8 }}>
                            {isAllocationPaid(a) ? (
                                <button disabled style={{ marginTop: 10, border: '2px solid #064e3b', borderRadius: 8, padding: '8px 16px', background: '#10b981', color: '#fff', cursor: 'default' }}>Paid</button>
                            ) : (
                                <button onClick={() => handlePay(a)} disabled={paying} style={{ marginTop: 10, border: '2px solid #000', borderRadius: 8, padding: '8px 16px', background: '#22c55e', color: '#fff' }}>Pay Now</button>
                            )}
                        </div>
                        {isAllocationPaid(a) && (() => {
                            // find matching receipt
                            const rec = receipts.find(r => String(r.allocationId || r.allocationId) === String(a._id || a.id))
                            if (rec && rec.pdfUrl) return (<div style={{ marginTop: 8 }}><a href={rec.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Download receipt (PDF)</a></div>)
                            return null
                        })()}
                        {Array.isArray(a.payments) && a.payments.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                                <strong>Payments:</strong>
                                <ul>
                                    {a.payments.map((p, idx) => (
                                        <li key={idx}>{p.status} — ₹{p.amount} {p.orderId ? ` / Order: ${p.orderId}` : ''} {p.paymentId ? ` / Payment: ${p.paymentId}` : ''}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                ))}
                <section id="transport-fee-receipts" style={{ border: '2px solid #000', borderRadius: 12, padding: 16, background: '#fffefc' }}>
                    <h3>Transport Fee</h3>
                    <p style={{ marginTop: 0, color: '#475569' }}>Your transport payment receipts are listed here.</p>
                    {receipts.length === 0 && <p>No transport receipts found.</p>}
                    <div>
                        {receipts.map(r => (
                            <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #e6eef8' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{r.routeName || r.busName || `Allocation ${r.allocationId || ''}`}</div>
                                    <div style={{ fontSize: 13, color: '#475569' }}>{new Date(r.createdAt).toLocaleString()} — ₹{r.amount} — {r.studentName || ''}</div>
                                    <div style={{ fontSize: 13, color: '#475569' }}>{r.routeName ? `Route: ${r.routeName}` : ''} {r.stopName ? ` • Stop: ${r.stopName}` : ''} {r.busName ? ` • Bus: ${r.busName}` : ''}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {r.pdfUrl ? (
                                        <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>Download PDF</a>
                                    ) : (
                                        <span style={{ color: '#64748b' }}>PDF not available</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </StudentLayout>
    );
}
