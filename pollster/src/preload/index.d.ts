import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getServerUrl: () => Promise<string>
      getRoomCode: () => Promise<string>
      selectPdf: () => Promise<string | null>
      uploadPdf: (filePath: string) => Promise<boolean>
      getLeaderboard: () => Promise<{ uuid: string; name: string; total_answers: number; correct_answers: number }[]>
      getSessionHistory: () => Promise<{ id: number; started_at: string; question_count: number; student_count: number; response_count: number }[]>
    }
  }
}
