import React from 'react';

export default function Footer({ onTabChange }) {
    const currentYear = new Date().getFullYear();

    const handleQuickLinkClick = (tabName) => {
        if (onTabChange) {
            onTabChange(tabName);
        }
    };

    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h4>ER Triage System</h4>
                    <p>An AI-driven Clinical Command Center that uses voice intelligence to automate ER triage, slash documentation time, and prioritize life-saving care in real-time.</p>
                </div>
                
                <div className="footer-section">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleQuickLinkClick('triage'); }}>Patient Triage</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleQuickLinkClick('resource'); }}>Resource Allocation</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleQuickLinkClick('analytics'); }}>Analytics</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4>Support</h4>
                    <ul>
                        <li><a href="mailto:support@ertriage.com">Contact Support</a></li>
                        <li><a href="#privacy">Privacy Policy</a></li>
                        <li><a href="#terms">Terms of Service</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4>Information</h4>
                    <p>Version 1.0</p>
                    <p>Healthcare Management System</p>
                </div>

                <div className="footer-section">
                    <h4>Contact</h4>
                    <p><strong>Example Hospital</strong></p>
                    <p>📧 <a href="mailto:ertriage@gmail.com">ertriage@gmail.com</a></p>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; {currentYear} ER Triage System. All rights reserved.</p>
                <p>Designed for healthcare professionals</p>
            </div>
        </footer>
    );
}
