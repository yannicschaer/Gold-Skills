import { useState } from 'react'

interface Props {
  onExportCsv: () => void
  onExportPdf: () => void
}

export function ExportButtons({ onExportCsv, onExportPdf }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-[8px] px-[14px] py-[8px] rounded-[8px] border border-sand-200
                   bg-white font-body text-[13px] font-semibold text-forest-950
                   hover:bg-sand-50 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <path d="M8 2v8m0 0L5 7m3 3l3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Export
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-[4px] z-20 w-[160px] bg-white rounded-[8px] border border-sand-200 shadow-lg py-[4px]">
            <button
              type="button"
              onClick={() => { onExportCsv(); setOpen(false) }}
              className="flex items-center gap-[8px] w-full px-[12px] py-[8px] font-body text-[13px] text-forest-950 hover:bg-sand-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                <path d="M2 1h7l3 3v9H2V1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M4 8h6M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Als CSV
            </button>
            <button
              type="button"
              onClick={() => { onExportPdf(); setOpen(false) }}
              className="flex items-center gap-[8px] w-full px-[12px] py-[8px] font-body text-[13px] text-forest-950 hover:bg-sand-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                <path d="M2 1h7l3 3v9H2V1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M4 7h2.5a1.25 1.25 0 000-2.5H4V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Als PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
}
