import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Menu, X } from 'lucide-react';
import './Navbar.css';

const Navbar: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState<boolean>(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
    const location = useLocation();
    const isHomePage = location.pathname === '/';

    useEffect(() => {
        const handleScroll = (): void => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
            <div className="container navbar-content">
                <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
                    <Moon className="logo-icon" size={28} />
                    <span className="logo-text">Markaz wali Masjid</span>
                </Link>

                <div className="desktop-menu">
                    <Link to="/" className={`nav-link ${isHomePage ? 'active' : ''}`}>Home</Link>
                    {isHomePage ? (
                        <>
                            <a href="#prayer-times" className="nav-link">Prayer Times</a>
                            <a href="#monthly-schedule" className="nav-link">Monthly Timetable</a>
                            <a href="#about" className="nav-link">About</a>
                            <a href="#contact" className="nav-link">Contact</a>
                        </>
                    ) : (
                        <>
                            <Link to="/#prayer-times" className="nav-link">Prayer Times</Link>
                            <Link to="/#monthly-schedule" className="nav-link">Monthly Timetable</Link>
                            <Link to="/#about" className="nav-link">About</Link>
                            <Link to="/#contact" className="nav-link">Contact</Link>
                        </>
                    )}
                </div>

                <button
                    className="mobile-menu-btn"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {isMobileMenuOpen && (
                    <div className="mobile-menu">
                        <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                        <a href="#prayer-times" onClick={() => setIsMobileMenuOpen(false)}>Prayer Times</a>
                        <a href="#monthly-schedule" onClick={() => setIsMobileMenuOpen(false)}>Monthly Timetable</a>
                        <a href="#about" onClick={() => setIsMobileMenuOpen(false)}>About</a>
                        <a href="#contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</a>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
