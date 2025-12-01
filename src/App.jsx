import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PrayerTimes from './components/PrayerTimes';
import Footer from './components/Footer';
import Admin from './components/Admin';
import { PrayerProvider } from './context/PrayerContext';

const Home = () => (
  <>
    <Navbar />
    <Hero />
    <PrayerTimes />

    <section id="about" className="section-padding bg-white">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 className="section-title text-center mb-4" style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>About Our Community</h2>
          <p className="text-lg text-gray-600 mb-6" style={{ fontSize: '1.125rem', color: '#4b5563', lineHeight: '1.75', marginBottom: '1.5rem' }}>
            Markaz wali Masjid has been serving the community since 1995. We are dedicated to providing a welcoming space for worship, education, and community service. Our mission is to foster a strong, vibrant, and inclusive Muslim community that contributes positively to society.
          </p>
          <p className="text-lg text-gray-600" style={{ fontSize: '1.125rem', color: '#4b5563', lineHeight: '1.75' }}>
            We offer five daily prayers, Jumu'ah prayers, educational programs for children and adults, and various community events throughout the year. Everyone is welcome to visit and learn more about our faith and traditions.
          </p>
        </div>
      </div>
    </section>

    <Footer />
  </>
);

function App() {
  return (
    <PrayerProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </div>
      </Router>
    </PrayerProvider>
  );
}

export default App;
