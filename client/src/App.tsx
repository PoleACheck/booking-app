import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Booking from './pages/Booking';
import MyVisits from './pages/MyVisits';
import PriceList from './pages/PriceList';
import Contact from './pages/Contact';
import EmployeePanel from './pages/EmployeePanel';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/my-visits" element={<MyVisits />} />
            <Route path="/pricing" element={<PriceList />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/employee" element={<EmployeePanel />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;