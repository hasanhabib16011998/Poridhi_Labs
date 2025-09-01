import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import ChatPage from './ChatPage';
import NavBar from './NavBar';

function App() {

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-gray-100">
      <Router>
        <NavBar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </div>
    </>
  )
}

export default App;
