import React, { useEffect, useState } from 'react'
import './Gallery.css'
import { API_BASE, createGallery, addGalleryImages, deleteGalleryImage, getGallery } from '../../api'

const GALLERY_LABEL = 'Gallery'

export default function GalleryAdmin() {
    const [gallery, setGallery] = useState(null)
    const [files, setFiles] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => { fetchGallery() }, [])

    async function fetchGallery() {
        setLoading(true)
        try {
            const all = await getGallery()
            const found = (all || []).find(g => String(g.label || '').toLowerCase() === GALLERY_LABEL.toLowerCase())
            setGallery(found || null)
        } catch (e) { console.warn(e) }
        setLoading(false)
    }

    function onFiles(e) { setFiles(Array.from(e.target.files || [])) }

    async function onUpload(e) {
        e.preventDefault()
        if (!files || files.length === 0) return alert('Choose images to upload')
        const fd = new FormData()
        for (const f of files) fd.append('images', f)
        try {
            const token = localStorage.getItem('erp_token')
            if (gallery && gallery._id) {
                await addGalleryImages(gallery._id, fd, token)
            } else {
                // create new gallery with label
                fd.append('label', GALLERY_LABEL)
                await createGallery(fd, token)
            }
            setFiles([])
            fetchGallery()
        } catch (err) { alert(err && err.message ? err.message : 'Upload failed') }
    }

    async function onDeleteImage(im) {
        if (!gallery || !gallery._id) return
        if (!confirm('Delete this image?')) return
        try {
            const token = localStorage.getItem('erp_token')
            const filename = im.filename || (im.url ? im.url.split('/').pop() : '')
            await deleteGalleryImage(gallery._id, filename, token)
            fetchGallery()
        } catch (err) { alert(err && err.message ? err.message : 'Delete failed') }
    }

    return (
        <div className="admin-gallery-root" style={{ maxWidth: 920, margin: '18px auto', padding: 12 }}>
            <h2 style={{ marginTop: 0 }}>Gallery — {GALLERY_LABEL}</h2>

            <div className="card" style={{ padding: 12, marginBottom: 12 }}>
                <form onSubmit={onUpload} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="file" accept="image/*" multiple onChange={onFiles} />
                    <button className="btn" type="submit">Upload</button>
                </form>
                <div className="small" style={{ marginTop: 8 }}>Images uploaded here will appear on the public <code>/start</code> page.</div>
            </div>

            <div>
                {loading ? <div>Loading...</div> : (
                    <div className="gallery-images" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(gallery && gallery.images && gallery.images.length > 0) ? gallery.images.map((im, idx) => {
                            const raw = im && im.url ? String(im.url) : ''
                            const src = raw && (raw.startsWith('http://') || raw.startsWith('https://')) ? raw : (raw && raw.startsWith('/') ? `${API_BASE}${raw}` : (im && im.filename ? `${API_BASE}/uploads/${im.filename}` : raw))
                            return (
                                <div key={idx} style={{ position: 'relative' }}>
                                    <img src={src} alt={im.originalname || ''} style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                                    <button className="btn small" style={{ position: 'absolute', right: 6, top: 6 }} onClick={() => onDeleteImage(im)}>Remove</button>
                                </div>
                            )
                        }) : <div className="card" style={{ padding: 12 }}>No images uploaded yet.</div>}
                    </div>
                )}
            </div>
        </div>
    )
}
