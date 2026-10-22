import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
	Dumbbell, 
	Users, 
	ShieldCheck, 
	Flame, 
	Clock, 
	MapPin, 
	Phone, 
	MessageCircle, 
	CheckCircle2, 
	ArrowRight, 
	Sparkles, 
	Menu, 
	X, 
	Navigation,
	Activity,
	Zap,
	HeartPulse,
	Copy,
	Check,
	ExternalLink,
	Trophy,
	TrendingUp,
	Target
} from 'lucide-react';
import './LandingPage.scss';

// Import original local photos only
import galImg1 from './assets/photos/pic1.jpg';
import galImg2 from './assets/photos/pic2.jpg';
import galImg3 from './assets/photos/pic3.jpg';
import galImg4 from './assets/photos/pic4.jpg';
import brandLogo from './assets/photos/logo.jpg';
import heroBg from './assets/images/hero-banner.jpg';
import ctaBg from './assets/images/cta-bg.jpg';
import trainingImg1 from './assets/images/program-fat-loss.jpg';
import trainingImg2 from './assets/images/program-muscle-gain.jpg';
import trainingImg3 from './assets/images/program-athletic.jpg';

const dynamicWords = ['STRENGTH', 'DISCIPLINE', 'HYPERTROPHY', 'RESULTS'];

const LandingPage = () => {
	const navigate = useNavigate();
	const { user } = useAuth();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const [copiedAddress, setCopiedAddress] = useState(false);
	const [currentWordIndex, setCurrentWordIndex] = useState(0);

	// Rotating hero power word
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentWordIndex((prev) => (prev + 1) % dynamicWords.length);
		}, 2600);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 40);
		};
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	// Scroll reveal effect via IntersectionObserver
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('visible');
					}
				});
			},
			{ threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
		);

		const elements = document.querySelectorAll('.reveal-on-scroll');
		elements.forEach((el) => observer.observe(el));

		return () => observer.disconnect();
	}, []);

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

	const handleCopyAddress = () => {
		navigator.clipboard.writeText('Yodha Gym, Satya Vihar, Rasulgarh, Bhubaneswar, Odisha 751010');
		setCopiedAddress(true);
		setTimeout(() => setCopiedAddress(false), 2500);
	};

	const stats = [
		{
			title: 'Premium Equipment',
			subtitle: 'World-Class Biomechanics',
			icon: <Dumbbell className="stat-svg" size={28} />
		},
		{
			title: 'Expert Instructors',
			subtitle: 'Certified Personal Trainers',
			icon: <Users className="stat-svg" size={28} />
		},
		{
			title: 'Hygienic Space',
			subtitle: 'Sanitized & Climate Controlled',
			icon: <ShieldCheck className="stat-svg" size={28} />
		}
	];

	const features = [
		{ 
			title: 'Strength Zone', 
			text: 'Modern equipment for hypertrophy, strength and athletic performance.', 
			icon: <Zap size={26} />,
			tag: 'Power & Mass'
		},
		{ 
			title: 'Cardio Deck', 
			text: 'High-energy cardio setup with guided endurance routines.', 
			icon: <Activity size={26} />,
			tag: 'Endurance & Stamina'
		},
		{ 
			title: 'Recovery Corner', 
			text: 'Mobility and post-workout recovery support for better consistency.', 
			icon: <HeartPulse size={26} />,
			tag: 'Mobility & Wellness'
		}
	];

	const programs = [
		{ 
			title: 'Fat Loss Program', 
			text: 'Structured workouts and nutrition discipline to burn fat safely.', 
			img: trainingImg1,
			badge: 'High Intensity'
		},
		{ 
			title: 'Muscle Gain Program', 
			text: 'Progressive overload plans focused on clean muscle growth.', 
			img: trainingImg2,
			badge: 'Hypertrophy'
		},
		{ 
			title: 'Athletic Program', 
			text: 'Speed, agility and conditioning routines for sports-level fitness.', 
			img: trainingImg3,
			badge: 'Performance'
		}
	];

	const pricing = [
		{
			title: '1 Day Pass',
			price: '300',
			cycle: 'Single Day',
			points: ['Full equipment access', 'Cardio zone access', 'Locker facility', 'Instant floor entry']
		},
		{
			title: '1 Month',
			price: '2,500',
			cycle: 'Monthly',
			points: ['Full gym access', 'Cardio zone', 'Locker facility', 'Basic workout guidance']
		},
		{
			title: '3 Months',
			price: '4,500',
			oldPrice: '7,500',
			cycle: 'Quarterly',
			saveLabel: 'SAVE ₹3,000',
			badge: 'Most Popular',
			popular: true,
			points: ['Full gym access', 'Cardio zone', 'Locker facility', 'Workout plan', 'Diet tips', 'Progress tracking']
		},
		{
			title: '6 Months',
			price: '6,500',
			oldPrice: '15,000',
			cycle: 'Half-Yearly',
			saveLabel: 'SAVE ₹8,500',
			badge: 'Best Value',
			points: ['Full gym access', 'Cardio zone', 'Locker facility', 'Personal training sessions', 'Custom workout plan', 'Nutrition guidance']
		},
		{
			title: '12 Months',
			price: '8,999',
			oldPrice: '30,000',
			cycle: 'Annual',
			saveLabel: 'SAVE ₹21,001',
			badge: 'Maximum Savings',
			points: ['Full gym access', 'Cardio zone', 'Premium locker', 'Unlimited personal training', 'Custom workout & diet plan', 'Body composition analysis']
		}
	];

	const openingHours = [
		{ day: 'Monday - Friday', time: '6:00 AM - 10:00 PM', active: true },
		{ day: 'Saturday', time: '6:00 AM - 10:30 PM', active: true },
		{ day: 'Sunday', time: '6:00 AM - 1:00 PM', active: false }
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
			{/* AMBIENT GLOW LIGHTS */}
			<div className="ambient-glow ambient-glow-1" />
			<div className="ambient-glow ambient-glow-2" />
			<div className="ambient-glow ambient-glow-3" />

			{/* NAVIGATION BAR */}
			<nav className={`nav ${isScrolled ? 'scrolled' : ''}`}>
				<div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
					<div className="logo-container">
						<img src={brandLogo} alt="Yodha Gym Logo" />
						<span className="logo-pulse" />
					</div>
					<h2>YODHA <span>GYM</span></h2>
				</div>

				<ul className="nav-menu">
					{navLinks.map((item) => (
						<li key={item.label}>
							<a href={item.href}>
								{item.label}
								<span className="nav-indicator" />
							</a>
						</li>
					))}
				</ul>

				<div className="nav-actions">
					<button className="nav-auth-btn interactive-btn" onClick={handleDashboardRedirect}>
						<span className="btn-text">{user ? 'Enter System' : 'LOGIN'}</span>
						<span className="btn-shine" />
					</button>

					<button
						type="button"
						className="nav-toggle interactive-btn"
						onClick={() => setIsMobileMenuOpen((prev) => !prev)}
						aria-label="Open navigation menu"
						aria-expanded={isMobileMenuOpen}
					>
						{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
					</button>
				</div>
			</nav>

			{/* MOBILE DRAWER */}
			<div className={`mobile-nav-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu} aria-hidden="true" />
			<aside className={`mobile-nav-drawer ${isMobileMenuOpen ? 'open' : ''}`} aria-hidden={!isMobileMenuOpen}>
				<div className="mobile-nav-head">
					<div className="brand">
						<img src={brandLogo} alt="Yodha Gym Logo" />
						<h2>YODHA <span>GYM</span></h2>
					</div>
					<button type="button" onClick={closeMobileMenu} aria-label="Close navigation menu" className="close-drawer-btn interactive-btn">
						<X size={20} />
					</button>
				</div>
				<ul className="mobile-nav-menu">
					{navLinks.map((item) => (
						<li key={item.label}>
							<a href={item.href} onClick={closeMobileMenu}>
								{item.label}
								<ArrowRight size={16} className="drawer-arrow" />
							</a>
						</li>
					))}
					<li className="mobile-auth-option">
						<button
							onClick={() => {
								closeMobileMenu();
								handleDashboardRedirect();
							}}
							className="mobile-login-btn interactive-btn"
						>
							{user ? 'Enter System' : 'LOGIN'}
						</button>
					</li>
				</ul>
			</aside>

			{/* ENHANCED ANIMATED HERO SECTION */}
			<section id="home" className="hero">
				<div className="hero-bg-container">
					<img src={heroBg} alt="Yodha Gym Interior" className="hero-bg-img" />
					<div className="hero-dark-overlay" />
					<div className="hero-vignette" />
					
					{/* ANIMATED HIGH-TECH SCAN LINE & MESH */}
					<div className="hero-grid-lines" />
					<div className="hero-laser-scanner" />

					{/* AMBIENT FLOATING LIGHT PARTICLES */}
					<div className="floating-particle particle-1" />
					<div className="floating-particle particle-2" />
					<div className="floating-particle particle-3" />
				</div>

				{/* FLOATING INTERACTIVE WARRIOR STAT BADGES (DESKTOP) */}
				<div className="hero-floating-stat stat-floating-left interactive-card">
					<div className="floating-badge-icon">
						<Trophy size={18} />
					</div>
					<div className="floating-badge-text">
						<strong>500+ Active</strong>
						<span>Warriors Enrolled</span>
					</div>
				</div>

				<div className="hero-floating-stat stat-floating-right interactive-card">
					<div className="floating-badge-icon pulse-glow">
						<Target size={18} />
					</div>
					<div className="floating-badge-text">
						<strong>100% Focused</strong>
						<span>Transformation Lab</span>
					</div>
				</div>

				<div className="hero-content reveal-on-scroll">
					<div className="hero-badge interactive-pill">
						<span className="badge-pulse-dot" />
						<span className="badge-text">BHUBANESWAR'S PREMIER FITNESS DESTINATION</span>
						<Sparkles size={14} className="badge-sparkle" />
					</div>

					<h1 className="hero-title">
						UNLEASH THE <span className="crimson-gradient">WARRIOR</span>
					</h1>

					{/* DYNAMIC ROTATING POWER WORDS TICKER */}
					<div className="hero-dynamic-tagline">
						<span className="tagline-prefix">FORGED FOR</span>
						<span className="dynamic-word-box">
							<span className="animated-word" key={currentWordIndex}>
								{dynamicWords[currentWordIndex]}
							</span>
						</span>
					</div>

					<p className="hero-description">
						Train with intensity in a red-black performance space built for transformation.
						Discipline, strength and results - all in one place.
					</p>

					<div className="hero-actions">
						<button 
							className="btn-primary interactive-btn" 
							onClick={user ? handleDashboardRedirect : handleWhatsAppRedirect}
						>
							<span className="btn-text">{user ? 'Go To Dashboard' : 'Join Now'}</span>
							<ArrowRight size={18} className="btn-arrow" />
							<span className="btn-shine" />
						</button>

						<button className="btn-secondary interactive-btn" onClick={handleWhatsAppRedirect}>
							<MessageCircle size={18} />
							<span>Start Today</span>
						</button>
					</div>

					{/* HERO TRUST PILLS */}
					<div className="hero-trust-bar">
						<div className="trust-item interactive-pill">
							<Flame size={16} className="trust-icon" />
							<span>High-Intensity Zone</span>
						</div>
						<div className="trust-divider" />
						<div className="trust-item interactive-pill">
							<ShieldCheck size={16} className="trust-icon" />
							<span>Certified Trainers</span>
						</div>
						<div className="trust-divider" />
						<div className="trust-item interactive-pill">
							<Clock size={16} className="trust-icon" />
							<span>Open 6:00 AM Daily</span>
						</div>
					</div>
				</div>
			</section>

			{/* ABOUT & STATS SECTION */}
			<div id="about" className="about-wrapper">
				<section className="stats reveal-on-scroll">
					{stats.map((stat, idx) => (
						<div className="stat-card interactive-card" key={idx}>
							<div className="stat-icon-wrapper">
								{stat.icon}
								<div className="icon-glow" />
							</div>
							<div className="stat-info">
								<h3>{stat.title}</h3>
								<p>{stat.subtitle}</p>
							</div>
							<div className="card-border-glow" />
						</div>
					))}
				</section>

				{/* ABOUT FEATURES */}
				<section className="features reveal-on-scroll">
					<div className="section-head">
						<span className="section-pill">WARRIOR ADVANTAGE</span>
						<h2>About Features</h2>
						<div className="heading-line" />
					</div>

					<div className="features-grid">
						{features.map((item) => (
							<div className="feature-card interactive-card" key={item.title}>
								<div className="feature-header">
									<div className="feature-icon">
										{item.icon}
									</div>
									<span className="feature-tag">{item.tag}</span>
								</div>
								<h3>{item.title}</h3>
								<p>{item.text}</p>
								<div className="feature-indicator" />
							</div>
						))}
					</div>
				</section>
			</div>

			{/* SERVICES / PROGRAMS SECTION */}
			<section id="services" className="programs reveal-on-scroll">
				<div className="section-head">
					<span className="section-pill">TRANSFORMATION PATHS</span>
					<h2>Our Services</h2>
					<div className="heading-line" />
				</div>

				<div className="programs-grid">
					{programs.map((item) => (
						<div className="program-card interactive-card" key={item.title}>
							<div className="program-img-wrapper">
								<img src={item.img} alt={item.title} className="program-img" />
								<div className="program-overlay" />
								<span className="program-badge">{item.badge}</span>
							</div>
							<div className="program-body">
								<h3>{item.title}</h3>
								<p>{item.text}</p>
								<button className="program-btn interactive-btn" onClick={handleWhatsAppRedirect}>
									<span>Learn More</span>
									<ArrowRight size={16} />
								</button>
							</div>
							<div className="card-ambient-edge" />
						</div>
					))}
				</div>
			</section>

			{/* PRICING PLANS SECTION */}
			<section id="pricing" className="pricing reveal-on-scroll">
				<div className="section-head">
					<span className="section-pill">TRANSPARENT PRICING</span>
					<h2>Membership Plans</h2>
					<div className="heading-line" />
					
					{/* PROMINENT ONE-TIME ADMISSION FEE BADGE */}
					<div className="admission-notice-banner interactive-pill">
						<span className="admission-pulse-dot" />
						<ShieldCheck size={18} className="admission-icon" />
						<div className="admission-text">
							<span>One-Time Admission Fee: <strong>₹500</strong></span>
							<span className="admission-sub">(New Member Registration • Full Facility Access)</span>
						</div>
					</div>
				</div>

				<div className="pricing-grid">
					{pricing.map((item) => (
						<div 
							className={`pricing-card interactive-card ${item.popular ? 'popular' : ''}`} 
							key={item.title}
						>
							{item.badge && (
								<div className="plan-badge-wrapper">
									<span className="plan-badge">
										<Sparkles size={13} />
										{item.badge}
									</span>
								</div>
							)}

							<div className="plan-header">
								<h3 className="plan-title">{item.title}</h3>
								<p className="plan-cycle">{item.cycle}</p>
							</div>

							<div className="plan-price-block">
								{item.oldPrice && (
									<span className="old-price">₹{item.oldPrice}</span>
								)}
								<div className="current-price">
									<span className="currency-symbol">₹</span>
									<span className="price-num">{item.price}</span>
								</div>
								{item.saveLabel && (
									<span className="save-pill">{item.saveLabel}</span>
								)}
							</div>

							<ul className="plan-features">
								{item.points.map((point) => (
									<li key={point}>
										<CheckCircle2 size={16} className="check-icon" />
										<span>{point}</span>
									</li>
								))}
							</ul>

							<button 
								className={`plan-cta-btn interactive-btn ${item.popular ? 'highlight' : ''}`} 
								onClick={handleWhatsAppRedirect}
							>
								<MessageCircle size={16} />
								<span>Join WhatsApp</span>
							</button>

							<div className="card-bottom-accent" />
						</div>
					))}
				</div>
			</section>

			{/* GALLERY SECTION (ONLY ORIGINAL REAL PHOTOS) */}
			<section id="gallery" className="gallery reveal-on-scroll">
				<div className="section-head">
					<span className="section-pill">TRAINING GROUND</span>
					<h2>Trainers & Gallery</h2>
					<div className="heading-line" />
				</div>

				<div className="gallery-grid">
					<div className="gallery-item interactive-card">
						<img src={galImg1} alt="Yodha Gym Training 1" loading="lazy" />
						<div className="gallery-overlay">
							<span className="gallery-tag">Strength Coaching</span>
							<p>Dedicated Personal Guidance</p>
						</div>
					</div>

					<div className="gallery-item interactive-card">
						<img src={galImg2} alt="Yodha Gym Training 2" loading="lazy" />
						<div className="gallery-overlay">
							<span className="gallery-tag">Hypertrophy Zone</span>
							<p>Free Weights & Performance Racks</p>
						</div>
					</div>

					<div className="gallery-item interactive-card">
						<img src={galImg3} alt="Yodha Gym Training 3" loading="lazy" />
						<div className="gallery-overlay">
							<span className="gallery-tag">Cardio Deck</span>
							<p>High-End Endurance Equipment</p>
						</div>
					</div>

					<div className="gallery-item interactive-card">
						<img src={galImg4} alt="Yodha Gym Training 4" loading="lazy" />
						<div className="gallery-overlay">
							<span className="gallery-tag">Warrior Community</span>
							<p>Intensity & Consistency</p>
						</div>
					</div>
				</div>
			</section>

			{/* REDESIGNED CONTACT & LOCATION SECTION */}
			<section id="contact" className="contact-v3 reveal-on-scroll">
				<div className="section-head">
					<span className="section-pill">GET IN TOUCH</span>
					<h2>Contact & Location</h2>
					<div className="heading-line" />
				</div>

				<div className="contact-v3-layout">
					{/* LEFT COLUMN: INTERACTIVE INFORMATION CARDS */}
					<div className="contact-v3-info-col">
						{/* LIVE STATUS CARD */}
						<div className="live-status-card interactive-card">
							<div className="status-indicator">
								<span className="status-dot-pulse" />
								<span className="status-title">OPEN TODAY</span>
							</div>
							<span className="status-hours">6:00 AM – 10:00 PM</span>
						</div>

						{/* OPERATING HOURS CARD */}
						<div className="info-block hours-block interactive-card">
							<div className="block-header">
								<div className="icon-badge">
									<Clock size={20} />
								</div>
								<div>
									<h3>Gym Hours</h3>
									<p className="block-sub">Weekly Schedule</p>
								</div>
							</div>
							<ul className="schedule-list">
								{openingHours.map((item) => (
									<li key={item.day} className={`schedule-row ${item.active ? 'active-day' : ''}`}>
										<span className="day-name">{item.day}</span>
										<strong className="day-hours">{item.time}</strong>
									</li>
								))}
							</ul>
						</div>

						{/* LOCATION & ADDRESS CARD */}
						<div className="info-block location-block interactive-card">
							<div className="block-header">
								<div className="icon-badge">
									<MapPin size={20} />
								</div>
								<div>
									<h3>Gym Location</h3>
									<p className="block-sub">Satya Vihar, Rasulgarh</p>
								</div>
							</div>
							<p className="full-address">
								Satya Vihar, Rasulgarh, Bhubaneswar, Odisha 751010
							</p>
							<div className="location-action-btns">
								<a 
									href="https://maps.google.com/?q=Yodha%20Gym,%20Satya%20Vihar,%20Bhubaneswar" 
									target="_blank" 
									rel="noreferrer" 
									className="btn-map-action interactive-btn"
								>
									<Navigation size={15} />
									<span>Get Directions</span>
								</a>

								<button 
									type="button" 
									onClick={handleCopyAddress} 
									className="btn-copy-address interactive-btn"
									title="Copy Address"
								>
									{copiedAddress ? <Check size={15} className="copied-icon" /> : <Copy size={15} />}
									<span>{copiedAddress ? 'Copied!' : 'Copy'}</span>
								</button>
							</div>
						</div>

						{/* DIRECT CONTACT (PHONE & WHATSAPP) */}
						<div className="info-block contact-block interactive-card">
							<div className="block-header">
								<div className="icon-badge">
									<Phone size={20} />
								</div>
								<div>
									<h3>Direct Contact</h3>
									<p className="block-sub">Call or WhatsApp</p>
								</div>
							</div>

							<a href="tel:+918093602446" className="primary-phone-link interactive-btn">
								<Phone size={18} />
								<span>+91 8093602446</span>
							</a>

							<div className="direct-chat-row">
								<button 
									type="button" 
									onClick={handleWhatsAppRedirect} 
									className="btn-whatsapp-chat interactive-btn"
								>
									<MessageCircle size={18} />
									<span>Chat on WhatsApp</span>
								</button>
							</div>
						</div>
					</div>

					{/* RIGHT COLUMN: HIGH-TECH DARK MAP DASHBOARD */}
					<div className="contact-v3-map-col interactive-card">
						<div className="map-hud-header">
							<div className="hud-pin-info">
								<span className="hud-beacon" />
								<div>
									<h4>Yodha Gym Headquarters</h4>
									<p>Satya Vihar, Rasulgarh, Bhubaneswar</p>
								</div>
							</div>
							<a 
								href="https://maps.google.com/?q=Yodha%20Gym,%20Satya%20Vihar,%20Bhubaneswar" 
								target="_blank" 
								rel="noreferrer" 
								className="hud-external-btn interactive-btn"
								title="Open in Google Maps"
							>
								<ExternalLink size={16} />
							</a>
						</div>

						<div className="map-iframe-container">
							<iframe
								title="Yodha Gym Satya Vihar Map"
								src="https://maps.google.com/maps?q=Yodha%20Gym,%20Satya%20Vihar,%20Bhubaneswar&t=&z=15&ie=UTF8&iwloc=&output=embed"
								width="100%"
								height="100%"
								style={{ border: 0 }}
								allowFullScreen=""
								loading="lazy"
								referrerPolicy="no-referrer-when-downgrade"
							/>
						</div>

						<div className="map-hud-footer">
							<div className="hud-stat">
								<span className="stat-label">Landmark:</span>
								<span className="stat-val">Near Rasulgarh Square</span>
							</div>
							<div className="hud-stat">
								<span className="stat-label">Parking:</span>
								<span className="stat-val">Free Dedicated Parking</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* CALL TO ACTION (CTA) */}
			<section className="cta reveal-on-scroll" style={{ backgroundImage: `url(${ctaBg})` }}>
				<div className="cta-overlay" />
				<div className="cta-content">
					<span className="cta-pill interactive-pill">START YOUR JOURNEY</span>
					<h2>Ready To Transform?</h2>
					<p>Step onto the floor and experience the ultimate training environment built for real results.</p>
					<button className="cta-btn interactive-btn" onClick={handleWhatsAppRedirect}>
						<MessageCircle size={18} />
						<span>Chat on WhatsApp</span>
						<span className="btn-shine" />
					</button>
				</div>
			</section>

			{/* FOOTER */}
			<footer className="footer reveal-on-scroll">
				<div className="footer-content">
					<div className="footer-col brand-col">
						<div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
							<img src={brandLogo} alt="Yodha Gym Logo" />
							<h3>YODHA <span>GYM</span></h3>
						</div>
						<p>
							Train with intensity in a red-black performance space built for transformation. 
							Discipline, strength and results - all in one place.
						</p>
					</div>

					<div className="footer-col">
						<h4>Quick Links</h4>
						<ul className="footer-links">
							<li><a href="#home">Home</a></li>
							<li><a href="#about">About</a></li>
							<li><a href="#services">Services</a></li>
							<li><a href="#pricing">Pricing</a></li>
							<li><a href="#gallery">Gallery</a></li>
							<li><a href="#contact">Contact</a></li>
						</ul>
					</div>

					<div className="footer-col contact-col">
						<h4>Contact Info</h4>
						<p><strong>Address:</strong> Satya Vihar, Rasulgarh, Bhubaneswar, Odisha 751010</p>
						<p><strong>Phone:</strong> +91 8093602446</p>
						<p><strong>Timing:</strong> 06:00 AM - 10:00 PM</p>
					</div>
				</div>

				<div className="footer-bottom">
					<p>&copy; {new Date().getFullYear()} Yodha Gym. All rights reserved.</p>
					<p className="footer-tagline">Forged for Warriors</p>
				</div>
			</footer>
		</div>
	);
};

export default LandingPage;
