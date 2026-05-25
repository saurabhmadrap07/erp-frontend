import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import '../../pages/AdminPanel.css'
import { getHR, createHR, deleteHR, blockHR, updateHR } from '../../api'
import { getAuth } from '../../utils/session'
import { toast } from 'react-toastify'

export default function Hr() {
    const { token } = getAuth()
    const [q, setQ] = useState('')
    const [rows, setRows] = useState([])
    const [showAdd, setShowAdd] = useState(false)
    const [loading, setLoading] = useState(false)
    const [adding, setAdding] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [editRow, setEditRow] = useState({})

    async function load() {
        setLoading(true)
        try {
            const list = await getHR(q, token)
            setRows(Array.isArray(list) ? list : [])
        } catch (e) { toast.error(e.message || 'Failed to load HRs') }
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    async function doDelete(id) { if (!window.confirm('Delete this HR?')) return; try { await deleteHR(id, token); toast.success('Deleted'); load() } catch (e) { toast.error(e.message || 'Delete failed') } }
    async function doBlock(id, block) { try { await blockHR(id, block, token); toast.success(block ? 'Blocked' : 'Unblocked'); load() } catch (e) { toast.error(e.message || 'Update failed') } }
    async function doEditSave(id) { try { await updateHR(id, editRow, token); toast.success('Updated'); setEditingId(null); load() } catch (e) { toast.error(e.message || 'Update failed') } }

    function Row({ it, idx }) {
        const [local, setLocal] = useState({
            name: it.name || '', email: it.username || '', contact: it.contact || '', qualification: it.designation || '', address: it.address || '', gender: it.gender || '', age: it.age || '', religion: it.religion || '', category: it.category || ''
        })
        const cellStyle = { border: '2px solid #06b6d4', padding: 6, fontSize: 13, lineHeight: '18px' }
        return (
            <tr style={{ background: '#fff', borderTop: '2px solid #e5e7eb' }}>
                <td style={cellStyle}>{idx + 1}</td>
                <td style={cellStyle}><input className="cm-input" style={{ height: 28, fontSize: 13 }} value={local.name} onChange={e => setLocal({ ...local, name: e.target.value })} /></td>
                <td style={cellStyle}>{it.username}</td>
                <td style={cellStyle}><input className="cm-input" style={{ height: 28, fontSize: 13 }} value={local.contact} onChange={e => setLocal({ ...local, contact: e.target.value })} /></td>
                <td style={cellStyle}><input className="cm-input" style={{ height: 28, fontSize: 13 }} value={local.qualification} onChange={e => setLocal({ ...local, qualification: e.target.value })} /></td>
                <td style={cellStyle}><input className="cm-input" style={{ height: 28, fontSize: 13 }} value={local.address} onChange={e => setLocal({ ...local, address: e.target.value })} /></td>
                <td style={cellStyle}>
                    <select className="cm-input" style={{ height: 28, fontSize: 13 }} value={local.gender} onChange={e => setLocal({ ...local, gender: e.target.value })}>
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                </td>
                <td style={cellStyle}><input type="number" className="cm-input" style={{ height: 28, fontSize: 13 }} value={local.age} onChange={e => setLocal({ ...local, age: e.target.value })} /></td>
                <td style={cellStyle}><input className="cm-input" style={{ height: 28, fontSize: 13 }} value={local.religion} onChange={e => setLocal({ ...local, religion: e.target.value })} /></td>
                <td style={cellStyle}><input className="cm-input" style={{ height: 28, fontSize: 13 }} value={local.category} onChange={e => setLocal({ ...local, category: e.target.value })} /></td>
                <td style={cellStyle}>
                    <button className="btn" style={{ height: 28, fontSize: 13, marginRight: 6 }} onClick={async () => { try { await updateHR(it._id, { name: local.name, contact: local.contact, designation: local.qualification, address: local.address, gender: local.gender, age: local.age, religion: local.religion, category: local.category }, token); toast.success('Saved'); load() } catch (e) { toast.error(e.message || 'Save failed') } }}>Save</button>
                    <button className="btn" style={{ height: 28, fontSize: 13, marginRight: 6 }} onClick={() => doBlock(it._id, !it.disabled)}>{it.disabled ? 'Unblock' : 'Block'}</button>
                    <button className="btn" style={{ height: 28, fontSize: 13 }} onClick={() => doDelete(it._id)}>Delete</button>
                </td>
            </tr>
        )
    }

    function AddForm({ onClose, onCreated }) {
        const [form, setForm] = useState({ name: '', fatherName: '', email: '', contact: '', qualification: '', address: '', gender: '', age: '', religion: '', category: '' })
        const [saving, setSaving] = useState(false)
        function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })) }
        async function submit(e) {
            e.preventDefault()
            if (!form.name || !form.email || !form.contact) { toast.error('Name, email and contact required'); return }
            setSaving(true)
            try {
                const payload = { name: form.name, fatherName: form.fatherName, email: form.email, contact: form.contact, designation: form.qualification, address: form.address, gender: form.gender, age: form.age, religion: form.religion, category: form.category }
                const res = await createHR(payload, token)
                toast.success('HR added')
                if (res && res.username && res.password) {
                    setTimeout(() => { alert(`HR credentials:\nUsername: ${res.username}\nPassword: ${res.password}`) }, 50)
                }
                onCreated && onCreated()
                onClose && onClose()
            } catch (e) { toast.error(e.message || 'Failed to add HR') }
            setSaving(false)
        }
        return (
            <div style={{ border: '2px solid #06b6d4', borderRadius: 10, padding: 16, background: '#f0fdfa', maxWidth: 640 }}>
                <h3>Add HR</h3>
                <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                        Name
                        <input required className="cm-input" placeholder="Full name" value={form.name} onChange={e => setField('name', e.target.value)} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                        Father Name
                        <input className="cm-input" placeholder="Father's name" value={form.fatherName} onChange={e => setField('fatherName', e.target.value)} />
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
                        Qualification
                        <input className="cm-input" placeholder="Qualification" value={form.qualification} onChange={e => setField('qualification', e.target.value)} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                        Address
                        <input className="cm-input" placeholder="Address" value={form.address} onChange={e => setField('address', e.target.value)} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                        Gender
                        <select className="cm-input" value={form.gender} onChange={e => setField('gender', e.target.value)}>
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                        Age
                        <input type="number" className="cm-input" placeholder="Age" value={form.age} onChange={e => setField('age', e.target.value)} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                        Religion
                        <input className="cm-input" placeholder="Religion" value={form.religion} onChange={e => setField('religion', e.target.value)} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                        Category
                        <input className="cm-input" placeholder="Category" value={form.category} onChange={e => setField('category', e.target.value)} />
                    </label>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn" type="button" onClick={onClose}>Cancel</button>
                        <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </div>
        )
    }

    return (
        <AdminLayout title="HR Management">
            <div className="admin-page">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <button className="btn" onClick={() => setShowAdd(true)}>Add HR</button>
                    <input className="cm-input" placeholder="Search HR" value={q} onChange={e => setQ(e.target.value)} />
                    <button className="btn" onClick={load}>Search</button>
                </div>

                {showAdd && (
                    <AddForm onClose={() => setShowAdd(false)} onCreated={load} />
                )}

                <div style={{ overflowX: 'auto', border: '2px solid #0ea5a4', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: 'linear-gradient(90deg,#06b6d4,#0ea5a4)', color: '#fff' }}>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Sr No</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Name</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Email</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Contact</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Qualification</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Address</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Gender</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Age</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Religion</th>
                                <th style={{ padding: 6, borderRight: '2px solid #0ea5a4' }}>Category</th>
                                <th style={{ padding: 6 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={11} style={{ padding: 12 }}>Loading...</td></tr>}
                            {!loading && rows.length === 0 && <tr><td colSpan={11} style={{ padding: 12 }}>No HR found</td></tr>}
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
