import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import type { TimelineBlock } from '../types'
import Card from './Card'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.js?url'

interface SequencerLayoutProps {
  onExit: () => void
}

export default function SequencerLayout({ onExit }: SequencerLayoutProps) {
  const [timeline, setTimeline] = useState<TimelineBlock[]>([])
  const [isProcessingPdf, setIsProcessingPdf] = useState(false)

  const addBlock = (type: TimelineBlock['type']) => {
    let newBlock: TimelineBlock
    const id = crypto.randomUUID()
    
    switch (type) {
      case 'markdown':
        newBlock = { id, type: 'markdown', content: '' }
        break
      case 'slide':
        newBlock = { id, type: 'slide', localPath: '' }
        break
      case 'pulse':
        newBlock = { id, type: 'pulse', question: '', options: ['', ''] }
        break
    }
    setTimeline([...timeline, newBlock])
  }

  // Handle DND reorder
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    
    const items = Array.from(timeline)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    
    setTimeline(items)
  }

  const updateBlock = (id: string, updates: Partial<TimelineBlock>) => {
    setTimeline(timeline.map(b => b.id === id ? { ...b, ...updates } as TimelineBlock : b))
  }

  const deleteBlock = (id: string) => {
    setTimeline(timeline.filter(b => b.id !== id))
  }

  const handleExport = async () => {
    const success = await window.api.exportLesson(timeline)
    if (success) {
      alert("Lesson successfully exported!")
    } else {
      alert("Export canceled or failed.")
    }
  }

  const importPdfSlides = async () => {
    try {
      const pdfPath = await window.api.selectPdf()
      if (!pdfPath) return

      setIsProcessingPdf(true)
      
      let rawBuffer = await window.api.readFileBuffer(pdfPath)
      if (!rawBuffer) throw new Error("Could not read file buffer")

      // Electron IPC often JSON-serializes Node Buffers to an object { type: 'Buffer', data: [...] }
      let pdfData: Uint8Array
      if ((rawBuffer as any).type === 'Buffer' && Array.isArray((rawBuffer as any).data)) {
        pdfData = new Uint8Array((rawBuffer as any).data)
      } else if (rawBuffer instanceof Uint8Array) {
        pdfData = rawBuffer
      } else {
        pdfData = new Uint8Array(rawBuffer as unknown as Iterable<number>)
      }

      // Dynamically import pdfjs-dist backend logic
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

      const loadingTask = pdfjsLib.getDocument({ data: pdfData })
      const pdf = await loadingTask.promise

      const newBlocks: TimelineBlock[] = []
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        // Scale by 2.0 for higher quality exports
        const viewport = page.getViewport({ scale: 2.0 })
        
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) continue

        canvas.height = viewport.height
        canvas.width = viewport.width

        await page.render({ canvasContext: context, viewport } as any).promise

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        const localPath = await window.api.saveBase64Image(dataUrl)

        if (localPath) {
          newBlocks.push({
            id: crypto.randomUUID(),
            type: 'slide',
            localPath
          })
        }
      }

      setTimeline((prev) => [...prev, ...newBlocks])
    } catch (error) {
      console.error("PDF Import Failed", error)
      alert("Failed to import PDF slides. Check console for details.")
    } finally {
      setIsProcessingPdf(false)
    }
  }

  return (
    <div className="flex h-full w-full bg-[#0c0e14]">
       {/* Sidebar for Controls */}
       <div className="w-[300px] border-r border-white/10 bg-[#12151e] p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3">
             <button onClick={onExit} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border-0 cursor-pointer transition-colors">
               ←
             </button>
             <h2 className="text-xl font-bold text-white mb-0 mt-0">Handout Forge</h2>
          </div>
          
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">Add Blocks</h3>
            <button onClick={() => addBlock('markdown')} className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg text-left transition-colors font-medium border border-white/5 text-sm cursor-pointer">📝 Markdown Text</button>
            <button onClick={() => addBlock('slide')} className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg text-left transition-colors font-medium border border-white/5 text-sm cursor-pointer">🖼 Presentation Slide</button>
            <button onClick={() => addBlock('pulse')} className="px-4 py-3 bg-[#5b8def]/15 hover:bg-[#5b8def]/25 text-[#5b8def] rounded-lg text-left transition-colors font-medium border border-[#5b8def]/30 text-sm cursor-pointer">📊 Interactive Pulse</button>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <h3 className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">Automations</h3>
            <button 
              onClick={importPdfSlides} 
              disabled={isProcessingPdf}
              className="px-4 py-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 rounded-lg text-left transition-colors font-medium border border-amber-500/30 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessingPdf ? "⏳ Slicing PDF..." : "📁 Import PDF Slides"}
            </button>
          </div>

          <div className="mt-auto flex flex-col gap-3">
             <button onClick={handleExport} className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all border-none cursor-pointer">
               📦 Export .sig Pack
             </button>
          </div>
       </div>

       {/* Main Timeline Canvas */}
       <div className="flex-1 overflow-y-auto p-12 bg-black/40">
          <div className="max-w-2xl mx-auto">
             <DragDropContext onDragEnd={onDragEnd}>
               <Droppable droppableId="timeline-droppable">
                 {(provided) => (
                   <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="min-h-[200px]"
                   >
                     {timeline.map((block, index) => (
                       <Draggable key={block.id} draggableId={block.id} index={index}>
                         {(provided) => (
                           <div
                             ref={provided.innerRef}
                             {...provided.draggableProps}
                             className="group relative"
                           >
                             <Card
                               block={block}
                               index={index}
                               onChange={updateBlock}
                               onDelete={deleteBlock}
                               dragHandleProps={provided.dragHandleProps}
                             />
                           </div>
                         )}
                       </Draggable>
                     ))}
                     {provided.placeholder}
                   </div>
                 )}
               </Droppable>
             </DragDropContext>
             
             {timeline.length === 0 && (
               <div className="text-center p-12 mt-12 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                 <p className="text-white/40 text-lg">Your timeline is empty.</p>
                 <p className="text-white/20 text-sm mt-2">Add blocks from the sidebar to start building your lesson.</p>
               </div>
             )}
          </div>
       </div>
    </div>
  )
}
