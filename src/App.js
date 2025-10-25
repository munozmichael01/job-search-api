import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Demo from './pages/Demo';
import HtmlDemo from './pages/HtmlDemo';

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

