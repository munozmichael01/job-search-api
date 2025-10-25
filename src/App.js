import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Demo from './pages/Demo.jsx';
import HtmlDemo from './pages/HtmlDemo.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Demo />} />
        <Route path="/html-demo" element={<HtmlDemo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

