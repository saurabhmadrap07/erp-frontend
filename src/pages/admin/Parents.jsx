import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import '../../pages/AdminPanel.css'
import { getParents, deleteParent, blockParent, createParent, uploadFile } from '../../api'
import { getAuth } from '../../utils/session'

export default function Parents() {
    const [loading, setLoading] = useState(false)
    const [parents, setParents] = useState([])
    const [searchTerm, setSearchTerm] = useState('')

    async function load(q = '') {
        setLoading(true)
        try {
            const { token } = getAuth()
            const data = await getParents(q, token)
            setParents(data)
        } catch (e) {
            console.error(e)
            setParents([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    function onSearch(e) { e && e.preventDefault(); load(searchTerm && searchTerm.trim()) }

    async function onDelete(id) {
        if (!confirm('Delete this parent? This action cannot be undone.')) return
        try {
            const { token } = getAuth()
            await deleteParent(id, token)
            await load()
        } catch (e) { console.error(e); alert('Delete failed') }
    }

    async function onToggleBlock(id, block) {
        const action = block ? 'Block' : 'Unblock'
        if (!confirm(`${action} this parent account?`)) return
        try {
            const { token } = getAuth()
            await blockParent(id, block, token)
            await load()
        } catch (e) { console.error(e); alert('Failed to update block status') }
    }

    // Add parent modal state
    const [showAdd, setShowAdd] = useState(false)
    const [adding, setAdding] = useState(false)
    const [newParent, setNewParent] = useState({ name: '', email: '', contact: '', address: '', parentOf: '', avatar: '', password: '' })
    const [selectedParent, setSelectedParent] = useState(null)

    function openAdd() {
        setNewParent({ name: '', email: '', contact: '', address: '', parentOf: '', avatar: '', password: '' })
        setShowAdd(true)
    }
    function closeAdd() { setShowAdd(false) }

    function openDetails(p) { setSelectedParent(p) }
    function closeDetails() { setSelectedParent(null) }

    async function uploadAvatar(file) {
        if (!file) return ''
        try {
            const { token } = getAuth()
            const fd = new FormData()
            fd.append('file', file)
            const res = await uploadFile(fd, token)
            return res.url
        } catch (e) {
            console.error(e)
            alert('Upload failed')
            return ''
        }
    }

    async function saveNewParent(e) {
        e && e.preventDefault()
        try {
            if (!newParent.name || !newParent.email || !newParent.password || !newParent.parentOf) {
                alert('Please fill required fields (name, email, password, Parent of)')
                return
            }
            setAdding(true)
            let avatarUrl = newParent.avatar || ''
            if (avatarUrl instanceof File) {
                avatarUrl = await uploadAvatar(avatarUrl)
            }
            const payload = {
                name: newParent.name,
                email: newParent.email,
                contact: newParent.contact,
                address: newParent.address,
                parentOf: newParent.parentOf ? [newParent.parentOf] : [],
                avatar: avatarUrl,
                password: newParent.password
            }
            const { token } = getAuth()
            await createParent(payload, token)
            await load()
            closeAdd()
            alert('Parent created')
        } catch (err) {
            console.error(err)
            alert('Failed to create parent: ' + (err && err.message ? err.message : String(err)))
        } finally { setAdding(false) }
    }

    return (
        <AdminLayout title="Parents Management">
            <div className="admin-page">
                <h2>Parents Management</h2>

                <div className="student-search-card" style={{ padding: 18, borderRadius: 12, background: 'linear-gradient(90deg,#f0fdfa,#eef2ff)', marginBottom: 12 }}>
                    <form onSubmit={onSearch} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                        <input
                            placeholder="Search by name, email or contact"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ flex: 1, minWidth: 220 }}
                        />

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-primary" type="submit">Search</button>
                            <button type="button" className="btn-secondary" onClick={() => { setSearchTerm(''); load('') }}>Reset</button>
                        </div>
                    </form>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0b1220' }}>All Parents</div>
                    <div>
                        <button
                            onClick={openAdd}
                            style={{
                                padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 800, color: '#071132',
                                border: '2px solid transparent', background: 'linear-gradient(white, white) padding-box, linear-gradient(90deg,#7c3aed,#06b6d4) border-box'
                            }}
                        >
                            + Add Parent
                        </button>
                    </div>
                </div>

                {showAdd && (
                    <div className="faculty-add-modal-backdrop">
                        <div className="faculty-add-modal">
                            <div className="faculty-add-header">
                                <div style={{ fontSize: 18, fontWeight: 800 }}>Add Parent</div>
                                <button onClick={closeAdd} className="faculty-add-close">×</button>
                            </div>
                            <form onSubmit={saveNewParent} className="faculty-add-form">
                                <label>Name
                                    <input className="boxed-input" placeholder="Full name" required value={newParent.name} onChange={e => setNewParent(s => ({ ...s, name: e.target.value }))} />
                                </label>
                                <label>Email
                                    <input className="boxed-input" placeholder="email@example.com" required type="email" value={newParent.email} onChange={e => setNewParent(s => ({ ...s, email: e.target.value }))} />
                                </label>
                                <label>Password
                                    <input className="boxed-input" placeholder="Password" required type="password" value={newParent.password} onChange={e => setNewParent(s => ({ ...s, password: e.target.value }))} />
                                </label>
                                <label>Contact
                                    <input className="boxed-input" placeholder="Phone" value={newParent.contact} onChange={e => setNewParent(s => ({ ...s, contact: e.target.value }))} />
                                </label>
                                <label>Address
                                    <input className="boxed-input" placeholder="Address" value={newParent.address} onChange={e => setNewParent(s => ({ ...s, address: e.target.value }))} />
                                </label>
                                <label>Parent of (student name or id)
                                    <input className="boxed-input" placeholder="e.g. Student 5-A1 or student id" required value={newParent.parentOf} onChange={e => setNewParent(s => ({ ...s, parentOf: e.target.value }))} />
                                </label>
                                <label>Profile Image
                                    <input type="file" accept="image/*" onChange={e => setNewParent(s => ({ ...s, avatar: e.target.files && e.target.files[0] }))} />
                                </label>

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                                    <button type="button" className="btn-secondary" onClick={closeAdd}>Cancel</button>
                                    <button className="btn-primary" type="submit" disabled={adding}>{adding ? 'Adding...' : 'Save'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="faculty-table-wrap" style={{ borderRadius: 12, overflowX: 'auto', overflowY: 'hidden' }}>
                    <table className="faculty-table" style={{ width: '100%' }}>
                        <thead style={{ background: 'linear-gradient(90deg,#06b6d4,#60a5fa)', color: '#fff' }}>
                            <tr>
                                <th style={{ padding: 12, textAlign: 'left' }}>Profile</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Name</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Email</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Contact</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Parent Of</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Address</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Created</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ padding: 18 }}>Loading...</td></tr>
                            ) : parents.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: 18 }}>No parents found</td></tr>
                            ) : parents.map((p) => (
                                <tr key={p._id || p.username} style={{ borderBottom: '1px solid #f0f0f0', background: p.disabled ? '#fff1f2' : '#f0fdf4' }}>
                                    <td style={{ padding: 12 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: p.disabled ? '#fee2e2' : '#ecfccb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{(p.name || 'P')[0]}</div>
                                    </td>
                                    <td style={{ padding: 12 }}>{p.name}</td>
                                    <td style={{ padding: 12 }}>{p.username}</td>
                                    <td style={{ padding: 12 }}>{p.contact || '-'}</td>
                                    <td style={{ padding: 12 }}>{Array.isArray(p.parentOf) ? (p.parentOf.join(', ') || '-') : (p.parentOf || '-')}</td>
                                    <td style={{ padding: 12 }}>{p.address || '-'}</td>
                                    <td style={{ padding: 12 }}>{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
                                    <td style={{ padding: 12 }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button type="button" onClick={() => openDetails(p)} style={{ color: '#000', border: '1px solid #000', background: '#fff', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>Details</button>
                                            {p.disabled ? (
                                                <button className="btn-primary" onClick={() => onToggleBlock(p._id, false)}>Unblock</button>
                                            ) : (
                                                <button className="btn-black" onClick={() => onToggleBlock(p._id, true)}>Block</button>
                                            )}
                                            <button className="btn-danger" onClick={() => onDelete(p._id)}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {selectedParent && (
                    <div className="faculty-add-modal-backdrop">
                        <div className="faculty-add-modal" style={{ maxWidth: 700 }}>
                            <div className="faculty-add-header">
                                <div style={{ fontSize: 18, fontWeight: 800 }}>Parent Details</div>
                                <button onClick={closeDetails} className="faculty-add-close">×</button>
                            </div>
                            <div style={{ padding: 12, background: '#fff' }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                                    {selectedParent.avatar ? (
                                        <img src={selectedParent.avatar} alt="avatar" style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 28 }}>{(selectedParent.name || 'P')[0]}</div>
                                    )}
                                    <div>
                                        <div style={{ fontSize: 18, fontWeight: 800 }}>{selectedParent.name}</div>
                                        <div style={{ color: '#6b7280' }}>{selectedParent.username}</div>
                                    </div>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr><td style={{ padding: 8, fontWeight: 700, width: 160 }}>Name</td><td style={{ padding: 8 }}>{selectedParent.name || '-'}</td></tr>
                                        <tr><td style={{ padding: 8, fontWeight: 700 }}>Email</td><td style={{ padding: 8 }}>{selectedParent.username || '-'}</td></tr>
                                        <tr><td style={{ padding: 8, fontWeight: 700 }}>Contact</td><td style={{ padding: 8 }}>{selectedParent.contact || '-'}</td></tr>
                                        <tr><td style={{ padding: 8, fontWeight: 700 }}>Parent Of</td><td style={{ padding: 8 }}>{Array.isArray(selectedParent.parentOf) ? (selectedParent.parentOf.join(', ') || '-') : (selectedParent.parentOf || '-')}</td></tr>
                                        <tr><td style={{ padding: 8, fontWeight: 700 }}>Address</td><td style={{ padding: 8 }}>{selectedParent.address || '-'}</td></tr>
                                        <tr><td style={{ padding: 8, fontWeight: 700 }}>Created</td><td style={{ padding: 8 }}>{selectedParent.createdAt ? new Date(selectedParent.createdAt).toLocaleString() : '-'}</td></tr>
                                        <tr><td style={{ padding: 8, fontWeight: 700 }}>Status</td><td style={{ padding: 8 }}>{selectedParent.disabled ? 'Blocked' : 'Active'}</td></tr>
                                    </tbody>
                                </table>

                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                                    <button className="btn-secondary" onClick={closeDetails}>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
