import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';

const STORAGE_KEY = 'my_dukaan_magic_qr_codes';

// Helper function to compress and resize image via canvas with resilient fallback
async function processAndCompressImage(file, maxSize = 800) {
  try {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = (e) => {
        const rawResult = e.target?.result;
        if (!rawResult) {
          return reject(new Error('Empty file result'));
        }

        const img = new Image();
        img.onerror = () => {
          // If Image object fails (e.g. SVG or strange format), use raw data URL
          resolve(rawResult);
        };
        img.onload = () => {
          try {
            let width = img.width || 400;
            let height = img.height || 400;

            if (width > height) {
              if (width > maxSize) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return resolve(rawResult);
            }

            // Draw white background for transparent QR codes
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
            resolve(compressedBase64);
          } catch (canvasErr) {
            resolve(rawResult);
          }
        };
        img.src = rawResult;
      };
      reader.readAsDataURL(file);
    });
  } catch (err) {
    return new Promise((resolve, reject) => {
      const fallbackReader = new FileReader();
      fallbackReader.onload = () => resolve(fallbackReader.result);
      fallbackReader.onerror = () => reject(err);
      fallbackReader.readAsDataURL(file);
    });
  }
}


export default function MagicQrModal({ isOpen, onClose, language = 'en', t = {} }) {
  const [qrList, setQrList] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullScreenQr, setFullScreenQr] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [replacingId, setReplacingId] = useState(null);
  const [qrToDelete, setQrToDelete] = useState(null); // For delete confirmation dialog

  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const isTa = language === 'ta';

  // Load saved QR codes from Dexie DB or fallback to localStorage
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadData() {
      try {
        let loaded = [];
        // Check Dexie DB first
        const dbEntry = await db.settings.get('magic_qr_codes');
        if (dbEntry && Array.isArray(dbEntry.list) && dbEntry.list.length > 0) {
          loaded = dbEntry.list;
        } else {
          // Fallback to localStorage
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) loaded = parsed;
          }
        }

        if (isMounted) {
          setQrList(loaded.slice(0, 3));
          setActiveIndex(0);
          setUploadError('');
        }
      } catch (err) {
        console.error('Failed to load QR codes:', err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Persist QR codes in Dexie and localStorage
  const saveQrs = async (updated) => {
    const listToSave = updated.slice(0, 3);
    setQrList(listToSave);

    try {
      // 1. Save to Dexie
      await db.settings.put({ id: 'magic_qr_codes', list: listToSave });
    } catch (e) {
      console.warn('Dexie save error:', e);
    }

    try {
      // 2. Sync to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(listToSave));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  };

  // Handle New QR Image Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(isTa ? 'தயவுசெய்து ஒரு படத்தை தேர்ந்தெடுக்கவும்' : 'Please select a valid image file');
      return;
    }

    if (qrList.length >= 3) {
      setUploadError(isTa ? 'அதிகபட்சம் 3 QR குறியீடுகள் மட்டுமே சேர்க்க முடியும்' : 'Maximum 3 QR codes allowed');
      return;
    }

    setIsProcessing(true);
    setUploadError('');

    try {
      const base64Data = await processAndCompressImage(file);

      const defaultNames = isTa
        ? ['GPay / PhonePe QR', 'கடை UPI QR', 'வங்கி QR']
        : ['GPay / PhonePe QR', 'Shop UPI QR', 'Bank QR'];

      const newQr = {
        id: Date.now().toString(),
        name: defaultNames[qrList.length] || `QR Code ${qrList.length + 1}`,
        image: base64Data,
        dateAdded: new Date().toISOString(),
      };

      const updated = [...qrList, newQr];
      await saveQrs(updated);
      setActiveIndex(updated.length - 1);

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Scroll to newly added item
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            left: scrollContainerRef.current.scrollWidth,
            behavior: 'smooth',
          });
        }
      }, 150);
    } catch (err) {
      console.error('Image compression error:', err);
      setUploadError(isTa ? 'படம் பதிவேற்றுவதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.' : 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Replacing existing QR image
  const handleReplaceImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !replacingId) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(isTa ? 'தயவுசெய்து ஒரு படத்தை தேர்ந்தெடுக்கவும்' : 'Please select a valid image file');
      return;
    }

    setIsProcessing(true);
    setUploadError('');

    try {
      const base64Data = await processAndCompressImage(file);
      const updated = qrList.map((q) => (q.id === replacingId ? { ...q, image: base64Data } : q));
      await saveQrs(updated);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
      setReplacingId(null);
    } catch (err) {
      console.error('Replace error:', err);
      setUploadError(isTa ? 'படம் மாற்றுவதில் பிழை ஏற்பட்டது.' : 'Failed to replace image.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm and execute delete
  const executeDelete = async () => {
    if (!qrToDelete) return;
    const updated = qrList.filter((q) => q.id !== qrToDelete.id);
    await saveQrs(updated);
    if (activeIndex >= updated.length) {
      setActiveIndex(Math.max(0, updated.length - 1));
    }
    setQrToDelete(null);
  };

  const startRename = (qr, e) => {
    e.stopPropagation();
    setEditingId(qr.id);
    setEditLabel(qr.name);
  };

  const saveRename = (id, e) => {
    e.stopPropagation();
    if (!editLabel.trim()) return;
    const updated = qrList.map((q) => (q.id === id ? { ...q, name: editLabel.trim() } : q));
    saveQrs(updated);
    setEditingId(null);
  };

  const scrollToSlide = (idx) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.clientWidth * 0.85;
      container.scrollTo({
        left: idx * cardWidth,
        behavior: 'smooth',
      });
      setActiveIndex(idx);
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.clientWidth * 0.85;
      const newIdx = Math.round(container.scrollLeft / cardWidth);
      if (newIdx !== activeIndex && newIdx >= 0 && newIdx < qrList.length) {
        setActiveIndex(newIdx);
      }
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
        background: 'rgba(10, 15, 30, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={onClose}
    >
      {/* Hidden File Picker for New Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />

      {/* Hidden File Picker for Replacing */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleReplaceImage}
      />

      {/* Main Glassmorphic Modal Window */}
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          background: 'rgba(255, 255, 255, 0.12)',
          border: '1.5px solid rgba(255, 255, 255, 0.28)',
          borderRadius: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
          color: '#FFFFFF',
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
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.55) 0%, rgba(79, 70, 229, 0.2) 70%, transparent 100%)',
            pointerEvents: 'none',
            borderRadius: '50%',
            filter: 'blur(35px)',
          }}
        />

        {/* Modal Header */}
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
                boxShadow: '0 4px 14px rgba(147, 51, 234, 0.4)',
              }}
            >
              <Sparkles size={20} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.3px' }}>
                {isTa ? 'மேஜிக் QR வாலட்' : 'Magic QR Vault'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)' }}>
                {qrList.length === 0
                  ? (isTa ? 'உங்கள் QR குறியீட்டை பதிவேற்றவும்' : 'Upload your payment QR')
                  : `${qrList.length}/3 ${isTa ? 'QR குறியீடுகள் சேர்க்கப்பட்டுள்ளன' : 'QR codes added'}`}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {uploadError && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
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

        {/* Loading Spinner */}
        {isProcessing && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              marginBottom: '10px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={16} className="animate-spin" />
            <span>{isTa ? 'படம் செயலாக்கப்படுகிறது...' : 'Processing image...'}</span>
          </div>
        )}

        {/* Content Body */}
        {qrList.length === 0 ? (
          /* ==================================================== */
          /* 1ST TIME EMPTY STATE: UPLOAD BOX                     */
          /* ==================================================== */
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '2px dashed rgba(255, 255, 255, 0.38)',
              borderRadius: '22px',
              padding: '36px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              cursor: isProcessing ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
              margin: '6px 0',
            }}
            onClick={() => {
              if (!isProcessing) fileInputRef.current?.click();
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              }}
            >
              <QrCode size={36} color="#FFFFFF" />
            </div>

            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              {isTa ? 'உங்கள் QR குறியீட்டை பதிவேற்றவும்' : 'Upload Payment QR Code'}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.72)',
                maxWidth: '260px',
                lineHeight: 1.4,
                marginBottom: '20px',
              }}
            >
              {isTa
                ? 'GPay, PhonePe, Paytm அல்லது கடை UPI QR படத்தை பதிவேற்றி வாடிக்கையாளர்களிடம் பணம் பெறலாம் (அதிகபட்சம் 3 QR).'
                : 'Upload up to 3 GPay, PhonePe, Paytm or shop QR images for quick scanning by customers.'}
            </div>

            <button
              type="button"
              disabled={isProcessing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #9333EA, #4F46E5)',
                border: 'none',
                color: '#FFFFFF',
                padding: '12px 24px',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(147, 51, 234, 0.5)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isProcessing) fileInputRef.current?.click();
              }}
            >
              <Upload size={17} />
              <span>{isTa ? 'QR படம் தேர்ந்தெடுக்கவும்' : 'Choose QR Image'}</span>
            </button>
          </div>
        ) : (
          /* ==================================================== */
          /* CAROUSEL VIEW: 1 TO 3 QR CODES (SCROLLABLE RIGHT/LEFT) */
          /* ==================================================== */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Horizontal Scrollable Gallery */}
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
                    background: 'rgba(255, 255, 255, 0.96)',
                    color: '#0F172A',
                    borderRadius: '22px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
                    position: 'relative',
                  }}
                >
                  {/* Top Bar: Title / Rename & Delete / Replace Actions */}
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
                          maxWidth: '65%',
                        }}
                        onClick={(e) => startRename(qr, e)}
                        title={isTa ? 'பெயரை மாற்ற கிளிக் செய்க' : 'Click to rename'}
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

                    {/* Action buttons (Replace & Delete) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {/* Replace Image Button */}
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

                      {/* Delete QR Button (Opens Confirmation) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrToDelete(qr);
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#EF4444',
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title={isTa ? 'QR குறியீட்டை நீக்கு' : 'Delete QR Code'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* QR Image Display */}
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1/1',
                      maxHeight: '230px',
                      background: '#FFFFFF',
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
                    title={isTa ? 'பெரிதாக்க கிளிக் செய்க' : 'Tap to enlarge'}
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
                        <ImageIcon size={36} />
                        <span style={{ fontSize: '11px' }}>Image missing</span>
                      </div>
                    )}

                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: '#FFFFFF',
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

                  {/* Scan Instruction Footer */}
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
                    <span>{isTa ? 'வாடிக்கையாளர் ஸ்கேன் செய்ய தட்டவும்' : 'Tap QR for full-screen brightness'}</span>
                  </div>
                </div>
              ))}

              {/* Add Another Slot Card (if less than 3) */}
              {qrList.length < 3 && (
                <div
                  style={{
                    flex: '0 0 75%',
                    scrollSnapAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '2px dashed rgba(255, 255, 255, 0.38)',
                    borderRadius: '22px',
                    padding: '24px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: isProcessing ? 'wait' : 'pointer',
                    minHeight: '260px',
                  }}
                  onClick={() => {
                    if (!isProcessing) fileInputRef.current?.click();
                  }}
                >
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <Plus size={28} color="#FFFFFF" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                    {isTa ? '+ மேலும் ஒரு QR சேர்க்க' : '+ Add Another QR'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {isTa ? `(மொத்தம் 3 வரை - ${qrList.length} உள்ளது)` : `(${3 - qrList.length} more slot available)`}
                  </div>
                </div>
              )}
            </div>

            {/* Pagination Dots & Navigation Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {qrList.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    onClick={() => scrollToSlide(dotIdx)}
                    style={{
                      width: activeIndex === dotIdx ? '22px' : '7px',
                      height: '7px',
                      borderRadius: '999px',
                      background:
                        activeIndex === dotIdx
                          ? 'linear-gradient(90deg, #9333EA, #4F46E5)'
                          : 'rgba(255, 255, 255, 0.3)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                    }}
                    aria-label={`Go to QR ${dotIdx + 1}`}
                  />
                ))}
              </div>

              {/* Add QR Button */}
              {qrList.length < 3 && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(255, 255, 255, 0.18)',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    color: '#FFFFFF',
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
        )}
      </div>

      {/* ==================================================== */}
      {/* DELETE CONFIRMATION DIALOG MODAL                     */}
      {/* ==================================================== */}
      {qrToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            background: 'rgba(0, 0, 0, 0.7)',
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
              background: '#FFFFFF',
              color: '#0F172A',
              borderRadius: '24px',
              padding: '24px 20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
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
                background: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <Trash2 size={26} color="#EF4444" />
            </div>

            <div style={{ fontSize: '17px', fontWeight: 800, marginBottom: '6px', color: '#0F172A' }}>
              {isTa ? 'QR குறியீட்டை நீக்கவா?' : 'Delete this QR Code?'}
            </div>

            <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px', lineHeight: 1.4 }}>
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
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1.5px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {isTa ? 'ரத்து' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={executeDelete}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
                }}
              >
                {isTa ? 'ஆம், நீக்கு' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* FULL SCREEN / MAX BRIGHTNESS QR MODAL                */}
      {/* ==================================================== */}
      {fullScreenQr && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: '#000000',
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
              top: '24px',
              right: '24px',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.25)',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close full screen"
          >
            <Minimize2 size={22} />
          </button>

          <div
            style={{
              color: '#FFFFFF',
              fontSize: '20px',
              fontWeight: 800,
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            {fullScreenQr.name}
          </div>

          <div
            style={{
              background: '#FFFFFF',
              padding: '18px',
              borderRadius: '24px',
              boxShadow: '0 0 60px rgba(255, 255, 255, 0.45)',
              maxWidth: '90vw',
              maxHeight: '70vh',
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
                maxHeight: '65vh',
                objectFit: 'contain',
              }}
            />
          </div>

          <div
            style={{
              marginTop: '20px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '13px',
              textAlign: 'center',
            }}
          >
            {isTa ? 'மூட திரையைத் தட்டவும்' : 'Tap anywhere to close full screen'}
          </div>
        </div>
      )}
    </div>
  );
}
