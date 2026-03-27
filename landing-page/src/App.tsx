import { Routes, Route } from 'react-router-dom'
import JoinPage from './pages/JoinPage'
import EducatorsPage from './pages/EducatorsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<JoinPage />} />
      <Route path="/educators" element={<EducatorsPage />} />
    </Routes>
  )
}

export default App
