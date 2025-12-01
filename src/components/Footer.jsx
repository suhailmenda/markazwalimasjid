import React from 'react';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';
import './Footer.css';

const Footer = () => {
    return (
        <footer id="contact" className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-col">
                        <h3 className="footer-title">Markaz wali Masjid</h3>
                        <p className="footer-text">
                            A center for spiritual growth and community service. We welcome everyone to join us in our journey of faith.
                        </p>
                    </div>

                    <div className="footer-col">
                        <h4 className="footer-subtitle">Quick Links</h4>
                        <ul className="footer-links">
                            <li><a href="#">Home</a></li>
                            <li><a href="#prayer-times">Prayer Times</a></li>
                            <li><a href="#about">About Us</a></li>
                            <li><a href="#donate">Donate</a></li>
                        </ul>
                    </div>

                    <div className="footer-col">
                        <h4 className="footer-subtitle">Contact Us</h4>
                        <ul className="contact-list">
                            <li>
                                <MapPin size={18} />
                                <span>Kilvani Rd, Silvassa, Dadra and Nagar Haveli and Daman and Diu 396230, India</span>
                            </li>
                            <li>
                                <Phone size={18} />
                                <span>+91 1234 5678 90</span>
                            </li>
                            <li>
                                <Mail size={18} />
                                <span>suhailmenda@gmail.com</span>
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
