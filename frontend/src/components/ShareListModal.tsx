'use client'
import { useEffect, useState } from 'react'
import Modal from '@/components/Modal'
import { track } from '@/lib/analytics'
import { Check, Copy, Download, Lock, QrCode, Share2 } from 'lucide-react'

/** Link, native share, messenger shortcuts and a QR code for invitations. Used by the owner only. */
export default function ShareListModal({ slug, listName, isPublic, onClose }: { slug: string; listName: string; isPublic: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [canShare, setCanShare] = useState(false)
  const shareUrl = `${window.location.origin}/lista/${slug}`
  const shareText = `Pogledaj našu Listicu želja: „${listName}"`

  useEffect(() => { track('share') }, [])

  useEffect(() => {
    setCanShare(typeof navigator.share === 'function')
    import('qrcode').then(QRCode => QRCode.toDataURL(shareUrl, { width: 320, margin: 2, color: { dark: '#1E1537', light: '#FFFFFF' } }))
      .then(setQrDataUrl)
      .catch(() => {})
  }, [shareUrl])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const nativeShare = () => navigator.share({ title: listName, text: shareText, url: shareUrl }).catch(() => {})

  return (
    <Modal title="Podijeli Listicu" onClose={onClose}>
      <div className="px-5 pb-6 sm:px-7 sm:pb-7">
        {!isPublic && (
          <p className="mb-4 flex items-start gap-2 rounded-2xl bg-tomato-soft p-3 text-[13px] font-medium text-tomato-ink">
            <Lock size={15} aria-hidden className="mt-0.5 flex-shrink-0" />
            Listica je zaključana. Gosti neće moći otvoriti link dok je ne otključaš u postavkama Listice.
          </p>
        )}
        <div className="mb-4 flex gap-2">
          <input type="text" value={shareUrl} readOnly aria-label="Link Listice" onFocus={e => e.target.select()} className="field min-w-0 flex-1 truncate !text-[13px]" />
          <button onClick={copyLink} className="btn btn-ink flex-shrink-0 !rounded-2xl !px-4 !text-sm">
            {copied ? <><Check size={16} strokeWidth={3} aria-hidden /> Kopirano</> : <><Copy size={15} aria-hidden /> Kopiraj</>}
          </button>
        </div>

        {canShare && (
          <button onClick={nativeShare} className="btn btn-primary mb-4 w-full"><Share2 size={17} aria-hidden /> Podijeli</button>
        )}

        <div className="mb-5 grid grid-cols-3 gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-soft !rounded-2xl">WhatsApp</a>
          <a href={`viber://forward?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`} className="btn btn-sm btn-soft !rounded-2xl">Viber</a>
          <a href={`fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`} className="btn btn-sm btn-soft !rounded-2xl !px-2">Messenger</a>
        </div>

        {qrDataUrl && (
          <div className="border-t border-line/10 pt-5 text-center">
            <p className="mb-3 flex items-center justify-center gap-1.5 text-sm font-bold"><QrCode size={15} aria-hidden /> QR kod za pozivnicu</p>
            <div className="inline-block rounded-3xl bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR kod za Listicu" className="h-40 w-40 sm:h-48 sm:w-48" />
            </div>
            <div className="mt-3">
              <a href={qrDataUrl} download={`listica-${slug.slice(0, 8)}-qr.png`} className="btn btn-sm btn-soft"><Download size={15} aria-hidden /> Preuzmi QR kod</a>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
