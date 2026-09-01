import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Menu, X } from 'lucide-react';
import './Navbar.css';

const navItems = [
    { id: 'home', label: 'Home', href: '#' },
    { id: 'prayer-times', label: 'Prayer Times', href: '#prayer-times' },
    { id: 'monthly-schedule', label: 'Monthly Timetable', href: '#monthly-schedule' },
    { id: 'about', label: 'About', href: '#about' },
    { id: 'contact', label: 'Contact', href: '#contact' },
];

const Navbar: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState<boolean>(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
    const [activeSection, setActiveSection] = useState<string>('home');
    const location = useLocation();
    const isHomePage = location.pathname === '/';

    useEffect(() => {
        const handleScroll = (): void => {
            setIsScrolled(window.scrollY > 20);

            if (isHomePage) {
                if (window.scrollY < 200) {
                    setActiveSection('home');
                    return;
                }
                const sections = ['prayer-times', 'monthly-schedule', 'about', 'contact'];
                for (const sectionId of sections) {
                    const el = document.getElementById(sectionId);
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        if (rect.top <= 150 && rect.bottom >= 150) {
                            setActiveSection(sectionId);
                            break;
                        }
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isHomePage]);

    return (
        <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
            <div className="container navbar-content">
                <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
                    <Moon className="logo-icon" size={28} />
                    <span className="logo-text">Markaz wali Masjid</span>
                </Link>

                <div className="desktop-menu">
                    {navItems.map((item) => (
                        <a
                            key={item.id}
                            href={isHomePage ? item.href : `/${item.href}`}
                            onClick={() => setActiveSection(item.id)}
                            className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
                        >
                            {item.label}
                        </a>
                    ))}
                </div>

                <button
                    className="mobile-menu-btn"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {isMobileMenuOpen && (
                    <div className="mobile-menu">
                        {navItems.map((item) => (
                            <a
                                key={item.id}
                                href={isHomePage ? item.href : `/${item.href}`}
                                onClick={() => {
                                    setActiveSection(item.id);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={activeSection === item.id ? 'active' : ''}
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
