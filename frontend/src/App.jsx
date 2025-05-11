import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CheckIn from './pages/CheckIn';
import Distribution from './pages/Distribution';
import CSVUpload from './pages/CSVUpload';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="check-in" element={<CheckIn />} />
          <Route path="distribution" element={<Distribution />} />
          <Route path="upload" element={<CSVUpload />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
