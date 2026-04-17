import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './LandingPage.scss';

// Import local assets
import galImg1 from './assets/photos/pic1.jpg';
import galImg2 from './assets/photos/pic2.jpg';
import galImg3 from './assets/photos/pic3.jpg';
import galImg4 from './assets/photos/pic4.jpg';
import brandLogo from './assets/photos/logo.jpg';
import galImg5 from './assets/images/training-image-04.jpg';
import gymVideo from './assets/images/gym-video.mp4';
import ctaBg from './assets/images/cta-bg.jpg';
import featuresIcon from './assets/images/features-first-icon.png';
import trainingImg1 from './assets/images/training-image-01.jpg';
import trainingImg2 from './assets/images/training-image-02.jpg';
import trainingImg3 from './assets/images/training-image-03.jpg';

const LandingPage = () => {
	const navigate = useNavigate();
	const { user } = useAuth();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const handleDashboardRedirect = () => {
		if (!user) {
			navigate('/login');
			return;
		}

		const role = user.role?.toLowerCase() || 'member';
		if (role === 'developer') navigate('/dev/dashboard');
		else if (role === 'admin') navigate('/admin/dashboard');
		else if (role === 'trainer') navigate('/trainer/dashboard');
		else navigate('/member/dashboard');
	};

	const handleWhatsAppRedirect = () => {
		window.open('https://wa.me/918093602446?text=Hi,%20I%20would%20like%20to%20know%20more%20about%20Yodha%20Gym!', '_blank');
	};

	const features = [
		{ title: 'Strength Zone', text: 'Modern equipment for hypertrophy, strength and athletic performance.', img: featuresIcon },
		{ title: 'Cardio Deck', text: 'High-energy cardio setup with guided endurance routines.', img: featuresIcon },
		{ title: 'Recovery Corner', text: 'Mobility and post-workout recovery support for better consistency.', img: featuresIcon }
	];

	const programs = [
		{ title: 'Fat Loss Program', text: 'Structured workouts and nutrition discipline to burn fat safely.', img: trainingImg1 },
		{ title: 'Muscle Gain Program', text: 'Progressive overload plans focused on clean muscle growth.', img: trainingImg2 },
		{ title: 'Athletic Program', text: 'Speed, agility and conditioning routines for sports-level fitness.', img: trainingImg3 }
	];

	const pricing = [
		{
			title: '1 Day Pass',
			price: '100',
			cycle: 'Single Day',
			points: ['Access to all equipment', 'Cardio zone access', 'Locker facility']
		},
		{
			title: '1 Month',
			price: '1,499',
			cycle: 'Monthly',
			points: ['Full gym access', 'Cardio zone', 'Locker facility', 'Basic guidance']
		},
		{
			title: '3 Months',
			price: '3,999',
			oldPrice: '4,497',
			cycle: 'Quarterly',
			saveLabel: 'SAVE 498',
			badge: 'Most Popular',
			popular: true,
			points: ['Full gym access', 'Cardio zone', 'Locker facility', 'Workout plan', 'Diet tips', 'Progress tracking']
		},
		{
			title: '6 Months',
			price: '5,999',
			oldPrice: '8,994',
			cycle: 'Half-Yearly',
			saveLabel: 'SAVE 2995',
			badge: 'Best Value',
			points: ['Full gym access', 'Cardio zone', 'Locker facility', 'Personal training sessions', 'Custom workout plan', 'Nutrition guidance']
		},
		{
			title: '12 Months',
			price: '9,999',
			oldPrice: '17,988',
			cycle: 'Annual',
			saveLabel: 'SAVE 7989',
			badge: 'Maximum Savings',
			points: ['Full gym access', 'Cardio zone', 'Premium locker', 'Unlimited personal training', 'Custom workout & diet plan', 'Body composition analysis']
		}
	];

	const openingHours = [
		{ day: 'Monday - Friday', time: '6:00 AM - 10:00 PM' },
		{ day: 'Saturday', time: '6:00 AM - 10:30 PM' },
		{ day: 'Sunday', time: '6:00 AM - 1:00 PM' }
	];

	const navLinks = [
		{ label: 'Home', href: '#home' },
		{ label: 'About', href: '#about' },
		{ label: 'Services', href: '#services' },
		{ label: 'Pricing', href: '#pricing' },
		{ label: 'Gallery', href: '#gallery' },
		{ label: 'Contact', href: '#contact' }
	];

	useEffect(() => {
		document.body.classList.toggle('mobile-menu-open', isMobileMenuOpen);
		return () => document.body.classList.remove('mobile-menu-open');
	}, [isMobileMenuOpen]);

	const closeMobileMenu = () => setIsMobileMenuOpen(false);

	return (
		<div className="landing">
			<nav className="nav">
				<div className="brand">
					<img src={brandLogo} alt="Yodha Gym Logo" />
					<h2>Yodha <span>Gym</span></h2>
				</div>
				<ul className="nav-menu">
					{navLinks.map((item) => (
						<li key={item.label}><a href={item.href}>{item.label}</a></li>
					))}
				</ul>
				<div className="nav-actions">
					<button className="nav-auth-btn" onClick={handleDashboardRedirect}>{user ? 'Enter System' : 'LOGIN'}</button>
					<button
						type="button"
						className="nav-toggle"
						onClick={() => setIsMobileMenuOpen((prev) => !prev)}
						aria-label="Open navigation menu"
						aria-expanded={isMobileMenuOpen}
					>
						<span />
						<span />
						<span />
					</button>
				</div>
			</nav>

			<div className={`mobile-nav-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu} aria-hidden="true" />
			<aside className={`mobile-nav-drawer ${isMobileMenuOpen ? 'open' : ''}`} aria-hidden={!isMobileMenuOpen}>
				<div className="mobile-nav-head">
					<h3>Menu</h3>
					<button type="button" onClick={closeMobileMenu} aria-label="Close navigation menu">x</button>
				</div>
				<ul className="mobile-nav-menu">
					{navLinks.map((item) => (
						<li key={item.label}>
							<a href={item.href} onClick={closeMobileMenu}>{item.label}</a>
						</li>
					))}
				</ul>
				<button
					type="button"
					className="mobile-auth-btn"
					onClick={() => {
						closeMobileMenu();
						handleDashboardRedirect();
					}}
				>
					{user ? 'Enter System' : 'LOGIN'}
				</button>
			</aside>

			<section id="home" className="hero">
				<video autoPlay muted loop id="bg-video">
					<source src={gymVideo} type="video/mp4" />
				</video>
				<div className="overlay" />
				<div className="hero-content fade-up">
					<h1>UNLEASH THE WARRIOR</h1>
					<p>
						Train with intensity in a red-black performance space built for transformation.
						Discipline, strength and results - all in one place.
					</p>
					<button onClick={user ? handleDashboardRedirect : handleWhatsAppRedirect}>{user ? 'Go To Dashboard' : 'Join Now'}</button>
					<button className="outline" onClick={handleWhatsAppRedirect}>Start Today</button>
				</div>
			</section>

			<div id="about">
				<section className="stats fade-up">
					<div className="stat-card">
						<div className="stat-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none">
								<path d="M3 9H6V15H3V9ZM18 9H21V15H18V9ZM6 11H18V13H6V11ZM8 8H10V16H8V8ZM14 8H16V16H14V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
						</div>
						<h3>Premium Equipment</h3>
					</div>
					<div className="stat-card">
						<div className="stat-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none">
								<path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
								<path d="M5 20C5 16.6863 8.13401 14 12 14C15.866 14 19 16.6863 19 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
								<path d="M19 6L20.5 7.5L23 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
						</div>
						<h3>Expert Instructors</h3>
					</div>
					<div className="stat-card">
						<div className="stat-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none">
								<path d="M12 3L19 6V11C19 15.4183 16.3137 19.4571 12 21C7.68629 19.4571 5 15.4183 5 11V6L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
								<path d="M9.5 11.5L11.2 13.2L14.8 9.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
						</div>
						<h3>Hygienic Space</h3>
					</div>
				</section>

				<section className="features fade-up">
					<h2>About Features</h2>
					<div className="grid">
						{features.map((item) => (
							<div className="card feature-card" key={item.title}>
								<div className="icon">
									<img src={item.img} alt="icon" />
								</div>
								<h3>{item.title}</h3>
								<p>{item.text}</p>
							</div>
						))}
					</div>
				</section>
			</div>

			<section id="services" className="programs fade-up">
				<h2>Our Services</h2>
				<div className="grid">
					{programs.map((item) => (
						<div className="card image-card" key={item.title}>
							<img src={item.img} alt={item.title} className="service-img" />
							<div className="card-content">
								<h3>{item.title}</h3>
								<p>{item.text}</p>
							</div>
						</div>
					))}
				</div>
			</section>

			<section id="pricing" className="pricing fade-up">
				<h2>Membership Plans</h2>
				<div className="grid">
					{pricing.map((item) => (
						<div className={`plan ${item.popular ? 'popular' : ''}`} key={item.title}>
							{item.badge && <p className="plan-badge">{item.badge}</p>}
							<h3>{item.title}</h3>
							{item.oldPrice && <p className="old-price">₹{item.oldPrice}</p>}
							<h1><span>₹</span>{item.price}</h1>
							<p className="plan-cycle">{item.cycle}</p>
							{item.saveLabel && <p className="save-label">{item.saveLabel}</p>}
							<ul>
								{item.points.map((point) => (
									<li key={point}>{point}</li>
								))}
							</ul>
							<button onClick={handleWhatsAppRedirect}>Join WhatsApp</button>
						</div>
					))}
				</div>
			</section>

			<section id="gallery" className="gallery fade-up">
				<h2>Trainers & Gallery</h2>
				<div className="grid">
					<div className="gallery-item"><img src={galImg1} alt="Gallery 1" /></div>
					<div className="gallery-item"><img src={galImg2} alt="Gallery 2" /></div>
					<div className="gallery-item"><img src={galImg3} alt="Gallery 3" /></div>
					<div className="gallery-item"><img src={galImg4} alt="Gallery 4" /></div>
					
				</div>
			</section>

			<section id="contact" className="contact-v2 fade-up">
				<div className="contact-v2__container">
					<div className="contact-v2__details">
						<article className="contact-v2__card contact-v2__hours">
							<h3>Opening Hours</h3>
							<ul>
								{openingHours.map((item) => (
									<li key={item.day}>
										<span>{item.day}</span>
										<strong>{item.time}</strong>
									</li>
								))}
							</ul>
						</article>

						<article className="contact-v2__card">
							<h3>Address</h3>
							<p>Satya Vihar, Rasulgarh</p>
							<p>Bhubaneswar, Odisha 751010</p>
						</article>

						<article className="contact-v2__card">
							<h3>Phone & WhatsApp</h3>
							<a href="tel:+918093602446">+91-8093602446</a>
							<div className="contact-v2__actions">
								<button type="button" onClick={handleWhatsAppRedirect}>Chat on WhatsApp</button>
								<a href="https://maps.google.com/?q=Yodha%20Gym,%20Satya%20Vihar,%20Bhubaneswar" target="_blank" rel="noreferrer">Get Directions</a>
							</div>
						</article>
					</div>

					<div className="contact-v2__map">
						<iframe
							title="Yodha Gym Satya Vihar"
							src="https://maps.google.com/maps?q=Yodha%20Gym,%20Satya%20Vihar,%20Bhubaneswar&t=&z=15&ie=UTF8&iwloc=&output=embed"
							width="100%"
							height="100%"
							style={{ border: 0 }}
							allowFullScreen=""
							loading="lazy"
							referrerPolicy="no-referrer-when-downgrade"
						></iframe>
					</div>
				</div>
			</section>

			<section className="cta fade-up" style={{ backgroundImage: `url(${ctaBg})` }}>
				<div className="overlay" />
				<div className="cta-content">
					<h2>Ready To Transform?</h2>
					<button onClick={handleWhatsAppRedirect}>Chat on WhatsApp</button>
				</div>
			</section>

			<footer className="footer fade-up">
				<div className="footer-content">
					<div className="footer-col">
						<h3>Yodha <span>Gym</span></h3>
						<p>Train with intensity in a performance space built for transformation. Discipline, strength and results - all in one place.</p>
					</div>
					<div className="footer-col">
						<h3>Quick Links</h3>
						<ul>
							<li><a href="#home">Home</a></li>
							<li><a href="#about">About</a></li>
							<li><a href="#services">Services</a></li>
							<li><a href="#pricing">Pricing</a></li>
						</ul>
					</div>
					<div className="footer-col">
						<h3>Contact Info</h3>
						<p><strong>Address:</strong> Satya Vihar, Rasulgarh, Bhubaneswar, Odisha 751010</p>
						<p><strong>Phone:</strong> +91 8093602446</p>
						<p><strong>Timing:</strong> 06:00 AM - 10:00 PM</p>
					</div>
				</div>
				<div className="footer-bottom">
					<p>&copy; {new Date().getFullYear()} Yodha Gym. All rights reserved.</p>
				</div>
			</footer>
		</div>
	);
};

export default LandingPage;
