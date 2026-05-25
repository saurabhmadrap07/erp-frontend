import React, { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getStaff, createStaff, deleteStaff, blockStaff, updateStaff, getProfile } from '../../api'
import { getAuth } from '../../utils/session'
import { toast } from 'react-toastify'

function AddStaffForm({ onClose, onCreated }) {
    const { token } = getAuth()
    const [form, setForm] = useState({ name: '', fatherName: '', email: '', contact: '', designation: '', department: '' })
    const [saving, setSaving] = useState(false)
    function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })) }
    async function submit(e) {
        e.preventDefault()
        if (!form.name || !form.email || !form.contact || !form.designation) { toast.error('All details are required'); return }
        setSaving(true)
        try {
            const payload = { name: form.name, fatherName: form.fatherName, email: form.email, contact: form.contact, designation: form.designation, address: form.department }
            const res = await createStaff(payload, token)
            toast.success('Staff added')
            if (res && res.username && res.password) {
                setTimeout(() => {
                    alert(`Staff credentials:\nUsername: ${res.username}\nPassword: ${res.password}`)
                }, 50)
            }
            onCreated && onCreated()
            onClose && onClose()
        } catch (e) { toast.error(e.message || 'Failed to add staff') }
        setSaving(false)
    }
    return (
        <div style={{ border: '2px solid #06b6d4', borderRadius: 10, padding: 16, background: '#f0fdfa', maxWidth: 520 }}>
            <h3>Add Staff</h3>
            <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                    Name of Staff
                    <input required className="cm-input" placeholder="Full name" value={form.name} onChange={e => setField('name', e.target.value)} />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                    Father Name
                    <input required className="cm-input" placeholder="Father's name" value={form.fatherName} onChange={e => setField('fatherName', e.target.value)} />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                    Email
                    <input required type="email" className="cm-input" placeholder="Email" value={form.email} onChange={e => setField('email', e.target.value)} />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                    Contact
                    <input required className="cm-input" placeholder="Contact number" value={form.contact} onChange={e => setField('contact', e.target.value)} />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                    Designation
                    <input required className="cm-input" placeholder="Designation" value={form.designation} onChange={e => setField('designation', e.target.value)} />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                    Department
                    <input required className="cm-input" placeholder="Department" value={form.department} onChange={e => setField('department', e.target.value)} />
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    <button className="btn" type="button" onClick={onClose}>Cancel</button>
                </div>
            </form>
        </div>
    )
}

function formatStaffId(mongoId) {
    if (!mongoId) return ''
    const tail = String(mongoId).slice(-6).toUpperCase()
    return `STF-${tail}`
}

export default function AdminStaff() {
    const { token } = getAuth()
    const [q, setQ] = useState('')
    const [rows, setRows] = useState([])
    const [showAdd, setShowAdd] = useState(false)
    const [loading, setLoading] = useState(false)

    async function load() {
        setLoading(true)
        try {
            const prof = await getProfile(token)
            const mainId = prof && prof.user && prof.user.sub ? String(prof.user.sub) : ''
            const list = await getStaff(q, token)
            const filtered = Array.isArray(list) ? list.filter(it => String(it._id) !== mainId) : []
            setRows(filtered)
        } catch (e) { toast.error(e.message || 'Failed to load staff') }
        setLoading(false)
    }
    useEffect(() => { load() }, [])

    async function doDelete(id) { if (!window.confirm('Delete this staff?')) return; try { await deleteStaff(id, token); toast.success('Deleted'); load() } catch (e) { toast.error(e.message || 'Delete failed') } }
    async function doBlock(id, block) { try { await blockStaff(id, block, token); toast.success(block ? 'Blocked' : 'Unblocked'); load() } catch (e) { toast.error(e.message || 'Update failed') } }
    async function doEdit(id, patch) { try { await updateStaff(id, patch, token); toast.success('Updated'); load() } catch (e) { toast.error(e.message || 'Update failed') } }

    function Row({ it, idx }) {
        const [edit, setEdit] = useState({ name: it.name || '', fatherName: it.fatherName || '', designation: it.designation || '', contact: it.contact || '', department: it.address || '' })
        const cellStyle = { border: '2px solid #06b6d4', padding: 6, fontSize: 13, lineHeight: '18px' }
        return (
            <tr style={{ background: '#fff', borderTop: '2px solid #e5e7eb' }}>
                <td style={cellStyle}>{idx + 1}</td>
                <td style={cellStyle}><input className="cm-input" style={{ height: 28, fontSize: 13 }} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></td>
                <td style={cellStyle}><input className="cm-input" style={{ height: 28, fontSize: 13 }} value={edit.fatherName} onChange={e => setEdit({ ...edit, fatherName: e.target.value })} /></td>
                <td style={cellStyle}>{it.username}</td>
                <td style={cellStyle}><input className="cm-input" style={{ height: 28, fontSize: 13 }} value={edit.contact} onChange={e => setEdit({ ...edit, contact: e.target.value })} /></td>
                <td style={cellStyle}><input className="cm-input" style={{ height: 28, fontSize: 13 }} value={edit.designation} onChange={e => setEdit({ ...edit, designation: e.target.value })} /></td>
                <td style={cellStyle}><span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 8, background: '#7c3aed', color: '#fff', fontWeight: 700 }}>{formatStaffId(it._id)}</span></td>
                <td style={cellStyle}><input className="cm-input" style={{ height: 28, fontSize: 13 }} value={edit.department} onChange={e => setEdit({ ...edit, department: e.target.value })} /></td>
                <td style={cellStyle}>
                    <button className="btn" style={{ height: 28, fontSize: 13, marginRight: 6 }} onClick={() => doEdit(it._id, { name: edit.name, fatherName: edit.fatherName, contact: edit.contact, designation: edit.designation, address: edit.department })}>Save</button>
                    <button className="btn" style={{ height: 28, fontSize: 13, marginRight: 6 }} onClick={() => doBlock(it._id, !it.disabled)}>{it.disabled ? 'Unblock' : 'Block'}</button>
                    <button className="btn" style={{ height: 28, fontSize: 13 }} onClick={() => doDelete(it._id)}>Delete</button>
                </td>
            </tr>
        )
    }

    return (
        <AdminLayout title="Staff Management">
            <div className="admin-page">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <button className="btn" onClick={() => setShowAdd(true)}>Add Staff</button>
                    <input className="cm-input" placeholder="Search staff" value={q} onChange={e => setQ(e.target.value)} />
                    <button className="btn" onClick={load}>Search</button>
                </div>

                {showAdd && (
                    <AddStaffForm onClose={() => setShowAdd(false)} onCreated={load} />
                )}

                <div style={{ overflowX: 'auto', border: '2px solid #0ea5a4', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: 'linear-gradient(90deg,#06b6d4,#0ea5a4)', color: '#fff' }}>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Sr No</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Name of Staff</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Father Name</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Email</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Contact</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Designation</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Staff ID</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Department</th>
                                <th style={{ padding: 6 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={9} style={{ padding: 12 }}>Loading...</td></tr>}
                            {!loading && rows.length === 0 && <tr><td colSpan={9} style={{ padding: 12 }}>No staff found</td></tr>}
                            {!loading && rows.map((it, idx) => (
                                <Row key={it._id} it={it} idx={idx} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    )
}
