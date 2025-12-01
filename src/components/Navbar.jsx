import React, { useState, useEffect } from 'react';
import { Menu, X, Moon } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
            <div className="container navbar-content">
                <div className="logo">
                    <Moon className="logo-icon" size={28} />
                    <span className="logo-text">Markaz wali Masjid</span>
                </div>

                <div className="desktop-menu">
                    <a href="#" className="nav-link active">Home</a>
                    <a href="#prayer-times" className="nav-link">Prayer Times</a>
                    <a href="#about" className="nav-link">About</a>
                    <a href="#contact" className="nav-link">Contact</a>
                    <button className="btn btn-primary btn-sm">Donate</button>
                </div>

                <button
                    className="mobile-menu-btn"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {isMobileMenuOpen && (
                    <div className="mobile-menu">
                        <a href="#" onClick={() => setIsMobileMenuOpen(false)}>Home</a>
                        <a href="#prayer-times" onClick={() => setIsMobileMenuOpen(false)}>Prayer Times</a>
                        <a href="#about" onClick={() => setIsMobileMenuOpen(false)}>About</a>
                        <a href="#contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</a>
                        <button className="btn btn-primary">Donate</button>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
