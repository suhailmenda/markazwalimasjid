import React from 'react';
import { Mail, MapPin } from 'lucide-react';
import './Footer.css';

const Footer: React.FC = () => {
    return (
        <footer id="contact" className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-col">
                        <h3 className="footer-title">Markaz wali Masjid</h3>
                        <p className="footer-text">
                            This website is created solely for a noble cause to provide accurate prayer times and serve the community.
                        </p>
                    </div>

                    <div className="footer-col">
                        <h4 className="footer-subtitle">Quick Links</h4>
                        <ul className="footer-links">
                            <li><a href="#">Home</a></li>
                            <li><a href="#prayer-times">Prayer Times</a></li>
                            <li><a href="#monthly-schedule">Monthly Timetable</a></li>
                            <li><a href="#about">About Us</a></li>
                        </ul>
                    </div>

                    <div className="footer-col">
                        <h4 className="footer-subtitle">Contact Us</h4>
                        <ul className="contact-list">
                            <li>
                                <a
                                    href="https://maps.app.goo.gl/ufyaAWqVv5rJ1DXQ9"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="contact-link"
                                >
                                    <MapPin size={18} />
                                    <span>72G4+9WG, Kilvani Rd, near Jalaram Temple, Naka, Park City, Silvassa, Dadra and Nagar Haveli and Daman and Diu 396230</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} Markaz wali Masjid. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
