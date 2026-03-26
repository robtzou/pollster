import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getServerUrl: (): Promise<string> => ipcRenderer.invoke('get-server-url'),
  getRoomCode: (): Promise<string> => ipcRenderer.invoke('get-room-code'),
  selectPdf: (): Promise<string | null> => ipcRenderer.invoke('select-pdf'),
  uploadPdf: (filePath: string): Promise<boolean> => ipcRenderer.invoke('upload-pdf', filePath),
  getSessionHistory: (): Promise<{ id: number; started_at: string; question_count: number; student_count: number; response_count: number }[]> =>
    ipcRenderer.invoke('get-session-history'),
  saveResource: (content: string): Promise<boolean> =>
    ipcRenderer.invoke('save-resource', content),
  loadResource: (): Promise<string> =>
    ipcRenderer.invoke('load-resource'),
  importImage: (): Promise<string | null> =>
    ipcRenderer.invoke('import-image'),
  exportLesson: (timeline: any[]): Promise<boolean> =>
    ipcRenderer.invoke('export-lesson', timeline),
  readFileBuffer: (path: string): Promise<Uint8Array | null> =>
    ipcRenderer.invoke('read-file-buffer', path),
  saveBase64Image: (dataUrl: string): Promise<string | null> =>
    ipcRenderer.invoke('save-base64-image', dataUrl)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
