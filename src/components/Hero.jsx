import React from 'react';
import { format } from 'date-fns';
import './Hero.css';

const Hero = () => {
    const today = new Date();

    return (
        <section className="hero">
            <div className="hero-overlay"></div>
            <div className="container hero-content">
                <span className="islamic-date">
                    {format(today, 'EEEE, d MMMM yyyy')}
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
