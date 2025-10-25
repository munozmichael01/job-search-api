import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Demo from './demo/Demo';
import HtmlDemo from './demo/HtmlDemo';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Demo />} />
        <Route path="/html-demo" element={<HtmlDemo />} />
      </Routes>
    </Router>
  );
}

export default App;

