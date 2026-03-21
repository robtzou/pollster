interface SlideViewerProps {
  pdfUrl: string | null
  currentSlide: number
  pollActive: boolean
}

export default function SlideViewer({ pdfUrl, currentSlide, pollActive }: SlideViewerProps) {
  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0c0e14]">
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-30">📄</div>
          <p className="text-white/30 text-lg font-medium">No presentation loaded</p>
          <p className="text-white/15 text-sm mt-2">
            Load a PDF from the sidebar to begin presenting
          </p>
        </div>
      </div>
    )
  }

  const iframeSrc = `http://localhost:3000/pdf#page=${currentSlide}&view=FitH&toolbar=0`

  return (
    <div className="relative w-full h-full bg-[#0c0e14] flex items-center justify-center p-4">
      <div className="relative w-full max-h-full" style={{ aspectRatio: '16 / 9', maxWidth: '100%' }}>
        <iframe
          key={currentSlide}
          src={iframeSrc}
          className={`absolute inset-0 w-full h-full border-0 rounded-lg shadow-2xl ${pollActive ? 'pointer-events-none' : ''}`}
          title="Slide Viewer"
        />
      </div>
    </div>
  )
}
