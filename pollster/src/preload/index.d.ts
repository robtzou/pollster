import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getServerUrl: () => Promise<string>
      getRoomCode: () => Promise<string>
      selectPdf: () => Promise<string | null>
      uploadPdf: (filePath: string) => Promise<boolean>
      getSessionHistory: () => Promise<{ id: number; started_at: string; question_count: number; student_count: number; response_count: number }[]>
      saveResource: (content: string) => Promise<boolean>
      loadResource: () => Promise<string>
    }
  }
}
