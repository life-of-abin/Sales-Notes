import React, { useState, useEffect, useRef, useCallback } from 'react';
import db from '../db/database';
import {
  QrCode,
  Upload,
  Plus,
  Trash2,
  X,
  Maximize2,
  Minimize2,
  Edit2,
  Check,
  Smartphone,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

const DB_SETTINGS_KEY = 'magic_qr_codes';
const LOCAL_STORAGE_KEY = 'magic_qr_codes_v2';
const LEGACY_STORAGE_KEY = 'magic_qr_codes';

/**
 * Synchronously load initial QR codes from localStorage for 0ms render
 */
function getInitialQrList() {
  try {
    const v2Data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (v2Data) {
      const parsed = JSON.parse(v2Data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 3);
    }
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyData) {
      const parsed = JSON.parse(legacyData);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 3);
    }
  } catch (e) {
    console.warn('[MagicQR] localStorage read error:', e);
  }
  return [];
}

/**
 * Read File as Data URL with promise and timeout
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * High-performance, memory-safe canvas compressor with a 1.5s timeout guarantee
 */
function compressImage(dataUrl, maxDim = 500) {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (res) => {
      if (!resolved) {
        resolved = true;
        resolve(res);
      }
    };

    // Safety timeout: if canvas hangs, return raw dataUrl
    const timer = setTimeout(() => finish(dataUrl), 1500);

    try {
      const img = document.createElement('img');
      img.onload = () => {
        clearTimeout(timer);
        try {
          let w = img.naturalWidth || img.width || 400;
          let h = img.naturalHeight || img.height || 400;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            finish(dataUrl);
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          if (compressed && compressed.length > 50) {
            finish(compressed);
          } else {
            finish(dataUrl);
          }
        } catch {
          finish(dataUrl);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        finish(dataUrl);
      };

      img.src = dataUrl;
    } catch {
      clearTimeout(timer);
      finish(dataUrl);
    }
  });
}

export default function MagicQrModal({ isOpen, onClose, language = 'en', t = {} }) {
  const [qrList, setQrList] = useState(getInitialQrList);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullScreenQr, setFullScreenQr] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [replacingId, setReplacingId] = useState(null);
  const [qrToDelete, setQrToDelete] = useState(null);

  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const isTa = language === 'ta';

  // ── Load from dual storage when modal opens ─────────────
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    // 1. First sync immediately from localStorage
    const cached = getInitialQrList();
    if (cached.length > 0) {
      setQrList(cached);
    }

    // 2. Reconcile from Dexie DB
    (async () => {
      try {
        const entry = await db.settings.get(DB_SETTINGS_KEY);
        if (!cancelled && entry && Array.isArray(entry.data) && entry.data.length > 0) {
          setQrList(entry.data.slice(0, 3));
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entry.data.slice(0, 3)));
          } catch (_) {}
        }
      } catch (err) {
        console.warn('[MagicQR] Dexie read fallback to localStorage:', err);
      }
    })();

    setUploadError('');
    setActiveIndex(0);

    return () => { cancelled = true; };
  }, [isOpen]);

  // ── Persist to both localStorage and Dexie DB ──────────
  const persist = useCallback(async (list) => {
    setQrList(list);

    // Synchronous localStorage write
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[MagicQR] localStorage write warning:', e);
    }

    // Asynchronous Dexie DB write
    try {
      await db.settings.put({ id: DB_SETTINGS_KEY, data: list });
    } catch (err) {
      console.warn('[MagicQR] Dexie put warning:', err);
    }
  }, []);

  // ── Upload new QR image ───────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(isTa ? 'தயவுசெய்து படம் தேர்ந்தெடுக்கவும்' : 'Please select a valid image');
      return;
    }
    if (qrList.length >= 3) {
      setUploadError(isTa ? 'அதிகபட்சம் 3 QR மட்டுமே' : 'Max 3 QR codes allowed');
      return;
    }

    setIsProcessing(true);
    setUploadError('');

    try {
      const raw = await readFileAsDataURL(file);
      const image = await compressImage(raw, 500);

      const names = isTa
        ? ['GPay / PhonePe QR', 'கடை UPI QR', 'வங்கி QR']
        : ['GPay / PhonePe QR', 'Shop UPI QR', 'Bank QR'];

      const newQr = {
        id: String(Date.now()),
        name: names[qrList.length] || `QR ${qrList.length + 1}`,
        image,
      };

      const updated = [...qrList, newQr];
      await persist(updated);
      setActiveIndex(updated.length - 1);

      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }, 150);
    } catch (err) {
      console.error('[MagicQR] upload error:', err);
      setUploadError(isTa ? 'பதிவேற்ற பிழை. மீண்டும் முயற்சி செய்யவும்.' : 'Upload failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Replace existing QR image ─────────────────────────
  const handleReplace = async (e) => {
    const file = e.target.files?.[0];
    if (replaceInputRef.current) replaceInputRef.current.value = '';
    if (!file || !replacingId) return;

    setIsProcessing(true);
    try {
      const raw = await readFileAsDataURL(file);
      const image = await compressImage(raw, 500);
      const updated = qrList.map((q) => (q.id === replacingId ? { ...q, image } : q));
      await persist(updated);
    } catch (err) {
      console.error('[MagicQR] replace error:', err);
    } finally {
      setReplacingId(null);
      setIsProcessing(false);
    }
  };

  // ── Delete with confirmation ──────────────────────────
  const confirmDelete = async () => {
    if (!qrToDelete) return;
    const updated = qrList.filter((q) => q.id !== qrToDelete.id);
    await persist(updated);
    setActiveIndex(Math.min(activeIndex, Math.max(0, updated.length - 1)));
    setQrToDelete(null);
  };

  // ── Rename ────────────────────────────────────────────
  const startRename = (qr, e) => {
    e.stopPropagation();
    setEditingId(qr.id);
    setEditLabel(qr.name);
  };

  const saveRename = async (id, e) => {
    e.stopPropagation();
    if (!editLabel.trim()) return;
    const updated = qrList.map((q) => (q.id === id ? { ...q, name: editLabel.trim() } : q));
    await persist(updated);
    setEditingId(null);
  };

  // ── Scroll & Dots ─────────────────────────────────────
  const scrollToSlide = (idx) => {
    const c = scrollContainerRef.current;
    if (!c) return;
    c.scrollTo({ left: idx * c.clientWidth * 0.86, behavior: 'smooth' });
    setActiveIndex(idx);
  };

  const handleScroll = () => {
    const c = scrollContainerRef.current;
    if (!c) return;
    const newIdx = Math.round(c.scrollLeft / (c.clientWidth * 0.86));
    if (newIdx !== activeIndex && newIdx >= 0 && newIdx < qrList.length) {
      setActiveIndex(newIdx);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 15, 30, 0.84)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={onClose}
    >
      {/* File inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleReplace}
      />

      {/* ── Main Card ── */}
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          background: 'rgba(255, 255, 255, 0.12)',
          border: '1.5px solid rgba(255, 255, 255, 0.28)',
          borderRadius: '28px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.35)',
          color: '#FFF',
          padding: '22px 18px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '260px',
            height: '140px',
            background: 'radial-gradient(circle, rgba(147,51,234,0.55) 0%, rgba(79,70,229,0.2) 70%, transparent 100%)',
            pointerEvents: 'none',
            borderRadius: '50%',
            filter: 'blur(35px)',
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #9333EA, #4F46E5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(147,51,234,0.4)',
              }}
            >
              <Sparkles size={20} color="#FFF" />
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.3px' }}>
                {isTa ? 'மேஜிக் QR வாலட்' : 'Magic QR Vault'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>
                {qrList.length === 0
                  ? (isTa ? 'உங்கள் QR குறியீட்டை பதிவேற்றவும்' : 'Upload your payment QR')
                  : `${qrList.length}/3 ${isTa ? 'QR சேர்க்கப்பட்டுள்ளன' : 'QR codes added'}`}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error */}
        {uploadError && (
          <div
            style={{
              background: 'rgba(239,68,68,0.25)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#FECACA',
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              marginBottom: '12px',
              textAlign: 'center',
            }}
          >
            {uploadError}
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              marginBottom: '10px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span>{isTa ? 'படம் செயலாக்கப்படுகிறது...' : 'Processing image...'}</span>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {qrList.length === 0 && !isProcessing ? (
          <div
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '2px dashed rgba(255,255,255,0.38)',
              borderRadius: '22px',
              padding: '36px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              cursor: 'pointer',
              margin: '6px 0',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              <QrCode size={36} color="#FFF" />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              {isTa ? 'உங்கள் QR குறியீட்டை பதிவேற்றவும்' : 'Upload Payment QR Code'}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.72)',
                maxWidth: '260px',
                lineHeight: 1.4,
                marginBottom: '20px',
              }}
            >
              {isTa
                ? 'GPay, PhonePe, Paytm அல்லது கடை UPI QR படத்தை பதிவேற்றவும் (அதிகபட்சம் 3).'
                : 'Upload up to 3 GPay, PhonePe, Paytm or shop QR images for quick scanning.'}
            </div>
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #9333EA, #4F46E5)',
                border: 'none',
                color: '#FFF',
                padding: '12px 24px',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(147,51,234,0.5)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Upload size={17} />
              <span>{isTa ? 'QR படம் தேர்ந்தெடுக்கவும்' : 'Choose QR Image'}</span>
            </button>
          </div>
        ) : qrList.length > 0 ? (
          /* ── CAROUSEL VIEW ── */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              style={{
                display: 'flex',
                gap: '14px',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                padding: '4px 4px 12px 4px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {qrList.map((qr, idx) => (
                <div
                  key={qr.id}
                  style={{
                    flex: '0 0 86%',
                    scrollSnapAlign: 'center',
                    background: 'rgba(255,255,255,0.96)',
                    color: '#0F172A',
                    borderRadius: '22px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                    position: 'relative',
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #E2E8F0',
                    }}
                  >
                    {editingId === qr.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            borderRadius: '8px',
                            border: '1.5px solid #7C3AED',
                            fontSize: '13px',
                            fontWeight: 600,
                            outline: 'none',
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(qr.id, e);
                          }}
                        />
                        <button
                          onClick={(e) => saveRename(qr.id, e)}
                          style={{
                            background: '#16A34A',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          maxWidth: '60%',
                        }}
                        onClick={(e) => startRename(qr, e)}
                      >
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 800,
                            color: '#1E293B',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {qr.name}
                        </span>
                        <Edit2 size={12} color="#64748B" />
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {/* Replace Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplacingId(qr.id);
                          replaceInputRef.current?.click();
                        }}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          color: '#475569',
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title={isTa ? 'படத்தை மாற்று' : 'Replace Image'}
                      >
                        <RefreshCw size={13} />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrToDelete(qr);
                        }}
                        style={{
                          background: 'rgba(239,68,68,0.12)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#EF4444',
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title={isTa ? 'QR நீக்கு' : 'Delete QR'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* QR Image View */}
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1/1',
                      maxHeight: '230px',
                      background: '#FFF',
                      borderRadius: '16px',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #E2E8F0',
                      position: 'relative',
                      cursor: 'zoom-in',
                    }}
                    onClick={() => setFullScreenQr(qr)}
                  >
                    {qr.image ? (
                      <img
                        src={qr.image}
                        alt={qr.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          borderRadius: '8px',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#94A3B8',
                        }}
                      >
                        <QrCode size={36} />
                        <span style={{ fontSize: '11px' }}>No image</span>
                      </div>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(0,0,0,0.7)',
                        color: '#FFF',
                        borderRadius: '6px',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Maximize2 size={14} />
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#475569',
                    }}
                  >
                    <Smartphone size={13} color="#7C3AED" />
                    <span>{isTa ? 'பெரிதாக தட்டவும்' : 'Tap to enlarge for scanning'}</span>
                  </div>
                </div>
              ))}

              {/* Add Another Slot */}
              {qrList.length < 3 && (
                <div
                  style={{
                    flex: '0 0 75%',
                    scrollSnapAlign: 'center',
                    background: 'rgba(255,255,255,0.08)',
                    border: '2px dashed rgba(255,255,255,0.38)',
                    borderRadius: '22px',
                    padding: '24px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    minHeight: '260px',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '16px',
                      background: 'rgba(255,255,255,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <Plus size={28} color="#FFF" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                    {isTa ? '+ மேலும் QR சேர்க்க' : '+ Add Another QR'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                    {`(${3 - qrList.length} ${isTa ? 'இடம் உள்ளது' : 'slot available'})`}
                  </div>
                </div>
              )}
            </div>

            {/* Dots & Add button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {qrList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollToSlide(i)}
                    style={{
                      width: activeIndex === i ? '22px' : '7px',
                      height: '7px',
                      borderRadius: '999px',
                      background:
                        activeIndex === i
                          ? 'linear-gradient(90deg, #9333EA, #4F46E5)'
                          : 'rgba(255,255,255,0.3)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                    }}
                    aria-label={`QR ${i + 1}`}
                  />
                ))}
              </div>
              {qrList.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.35)',
                    color: '#FFF',
                    borderRadius: '10px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  <span>{isTa ? 'QR சேர்' : 'Add QR'}</span>
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {qrToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setQrToDelete(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '340px',
              background: '#FFF',
              color: '#0F172A',
              borderRadius: '24px',
              padding: '24px 20px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
                color: '#EF4444',
              }}
            >
              <Trash2 size={26} />
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800, marginBottom: '6px' }}>
              {isTa ? 'QR குறியீட்டை நீக்கவா?' : 'Delete QR Code?'}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#64748B',
                marginBottom: '20px',
                lineHeight: 1.4,
              }}
            >
              {isTa
                ? `"${qrToDelete.name}" நிச்சயமாக நீக்க விரும்புகிறீர்களா?`
                : `Are you sure you want to delete "${qrToDelete.name}"?`}
            </div>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                type="button"
                onClick={() => setQrToDelete(null)}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '12px',
                  background: '#F1F5F9',
                  border: 'none',
                  color: '#475569',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isTa ? 'ரத்து' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '12px',
                  background: '#EF4444',
                  border: 'none',
                  color: '#FFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239,68,68,0.4)',
                }}
              >
                {isTa ? 'நீக்கு' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FULL SCREEN ZOOM VIEW ── */}
      {fullScreenQr && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setFullScreenQr(null)}
        >
          <button
            onClick={() => setFullScreenQr(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            <X size={22} />
          </button>

          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#FFF',
              marginBottom: '16px',
            }}
          >
            {fullScreenQr.name}
          </div>

          <div
            style={{
              background: '#FFF',
              borderRadius: '24px',
              padding: '16px',
              maxWidth: '340px',
              width: '100%',
              aspectRatio: '1/1',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullScreenQr.image}
              alt={fullScreenQr.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '12px',
              }}
            />
          </div>

          <div
            style={{
              marginTop: '16px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {isTa ? 'வாடிக்கையாளரிடம் ஸ்கேன் செய்ய வைக்கவும்' : 'Show to customer for payment scan'}
          </div>
        </div>
      )}
    </div>
  );
}
