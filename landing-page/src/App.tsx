import { Routes, Route } from 'react-router-dom'
import JoinPage from './pages/JoinPage'
import EducatorsPage from './pages/EducatorsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<EducatorsPage />} />
      <Route path="/room" element={<JoinPage />} />
    </Routes>
  )
}

export default App
