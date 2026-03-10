import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getServerUrl: (): Promise<string> => ipcRenderer.invoke('get-server-url'),
  getRoomCode: (): Promise<string> => ipcRenderer.invoke('get-room-code'),
  selectPdf: (): Promise<string | null> => ipcRenderer.invoke('select-pdf'),
  uploadPdf: (filePath: string): Promise<boolean> => ipcRenderer.invoke('upload-pdf', filePath),
  getLeaderboard: (): Promise<{ uuid: string; name: string; total_answers: number; correct_answers: number }[]> =>
    ipcRenderer.invoke('get-leaderboard'),
  getSessionHistory: (): Promise<{ id: number; started_at: string; question_count: number; student_count: number; response_count: number }[]> =>
    ipcRenderer.invoke('get-session-history')
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
