import React from 'react';
import './Hero.css';

const Hero = () => {
    const today = new Date();
    
    // Format date in Asia/Kolkata timezone
    const formatDateInIST = (date) => {
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Kolkata'
        });
    };

    return (
        <section className="hero">
            <div className="hero-overlay"></div>
            <div className="container hero-content">
                <span className="islamic-date">
                    {formatDateInIST(today)}
                </span>
                <h1 className="hero-title">
                    Welcome to <span className="text-gold">Markaz wali Masjid</span>
                </h1>
                <p className="hero-subtitle">
                    A place of peace, prayer, and community. Join us in worship and spiritual growth.
                </p>
                <div className="hero-buttons">
                    <a href="#prayer-times" className="btn btn-primary">View Prayer Times</a>
                    <a href="#about" className="btn btn-outline">Learn More</a>
                </div>
            </div>
        </section>
    );
};

export default Hero;
