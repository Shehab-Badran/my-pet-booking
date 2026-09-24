import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import Services from './pages/Services';
import BookNow from './pages/BookNow';
import BookingConfirmation from './pages/BookingConfirmation';
import Admin from './pages/Admin';
import Logo from './components/Logo';
import {
  Calendar,
  Menu,
  X,
  User,
  LogOut,
  MapPin,
  Phone,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Shield
} from 'lucide-react';
import { API_BASE_URL } from './config';

export default function App() {
  const getInitialPage = () => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path.includes('admin') || hash === '#admin') return 'admin';
    return 'home';
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage());
  const [preselectedService, setPreselectedService] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Admin User Authentication State (Dedicated for staff administration)
  const [currentUser, setCurrentUser] = useState(null);

  // Check existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('mpc_token');
    if (token) {
      fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Token expired.');
          return res.json();
        })
        .then((user) => {
          setCurrentUser(user);
          if (window.location.hash === '#admin' || window.location.pathname.startsWith('/admin')) {
            setCurrentPage('admin');
          }
        })
        .catch(() => {
          localStorage.removeItem('mpc_token');
          setCurrentUser(null);
        });
    }

    const checkAdminRoute = () => {
      if (window.location.hash === '#admin' || window.location.pathname.startsWith('/admin')) {
        setCurrentPage('admin');
      }
    };

    checkAdminRoute();
    window.addEventListener('hashchange', checkAdminRoute);
    window.addEventListener('popstate', checkAdminRoute);
    return () => {
      window.removeEventListener('hashchange', checkAdminRoute);
      window.removeEventListener('popstate', checkAdminRoute);
    };
  }, []);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    if (page === 'admin') {
      window.location.hash = '#admin';
    } else if (window.location.hash === '#admin') {
      window.location.hash = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookingComplete = (booking) => {
    setConfirmedBooking(booking);
    handleNavigate('confirmation');
  };

  const handleLogout = () => {
    localStorage.removeItem('mpc_token');
    setCurrentUser(null);
    if (currentPage === 'admin') {
      handleNavigate('home');
    }
  };

  // If in dedicated Admin mode, render the Admin Portal without customer header/footer
  if (currentPage === 'admin') {
    return (
      <Admin
        adminUser={currentUser}
        onAdminLogin={(user) => {
          setCurrentUser(user);
          setCurrentPage('admin');
          window.location.hash = '#admin';
        }}
        onAdminLogout={handleLogout}
        onBackToSite={() => handleNavigate('home')}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAF8FC] text-plum-deep font-sans">
      {/* Sticky Customer Header Navbar */}
      <header className="sticky top-0 z-40 glass-effect border-b border-plum-soft/60 shadow-plum-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[68px] sm:h-[72px]">
            {/* Brand Logo */}
            <div
              onClick={() => handleNavigate('home')}
              className="cursor-pointer group flex items-center transition-transform hover:scale-[1.02]"
            >
              <Logo size="md" />
            </div>

            {/* Customer Navigation Links */}
            <nav className="hidden md:flex items-center gap-7 text-sm font-extrabold text-plum-deep/80">
              <button
                onClick={() => handleNavigate('home')}
                className={`hover:text-plum-deep transition-colors cursor-pointer py-1 ${
                  currentPage === 'home'
                    ? 'text-plum-deep font-black relative after:content-[\'\'] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-teal-primary after:rounded-full'
                    : ''
                }`}
              >
                Home
              </button>
              <button
                onClick={() => handleNavigate('grooming')}
                className={`hover:text-plum-deep transition-colors cursor-pointer py-1 ${
                  currentPage === 'grooming'
                    ? 'text-plum-deep font-black relative after:content-[\'\'] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-teal-primary after:rounded-full'
                    : ''
                }`}
              >
                Grooming Services
              </button>
              <button
                onClick={() => handleNavigate('book')}
                className={`hover:text-plum-deep transition-colors cursor-pointer py-1 ${
                  currentPage === 'book'
                    ? 'text-plum-deep font-black relative after:content-[\'\'] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-teal-primary after:rounded-full'
                    : ''
                }`}
              >
                Book Now
              </button>
              <button
                onClick={() => {
                  handleNavigate('home');
                  setTimeout(() => {
                    const contactSection = document.getElementById('visit-us-section');
                    if (contactSection) {
                      contactSection.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }
                  }, 150);
                }}
                className="hover:text-plum-deep transition-colors cursor-pointer py-1"
              >
                Visit Us
              </button>
            </nav>

            {/* Customer CTA & Admin Status */}
            <div className="hidden md:flex items-center gap-3">
              {currentUser?.role === 'admin' && (
                <div className="flex items-center gap-2 bg-plum-bg border border-plum-soft px-3 py-1.5 rounded-xl shadow-xs">
                  <button
                    onClick={() => handleNavigate('admin')}
                    className="text-xs bg-plum-deep hover:bg-plum-dark text-teal-light font-black px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin Portal</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    title="Log Out"
                    className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-1 p-0.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={() => handleNavigate('book')}
                className="bg-gradient-to-r from-plum-primary via-plum-dark to-plum-deep hover:from-plum-light hover:to-plum-primary text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md hover:shadow-plum-glow transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5 border border-plum-soft/20"
              >
                <Calendar className="w-3.5 h-3.5 text-teal-light" />
                <span>Book Grooming</span>
                <ArrowRight className="w-3.5 h-3.5 text-teal-light" />
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-plum-deep p-2 hover:bg-plum-bg rounded-xl cursor-pointer"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6 text-plum-deep" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-plum-soft px-4 pt-3 pb-6 space-y-3 shadow-xl animate-fade-in">
            <button
              onClick={() => handleNavigate('home')}
              className="block w-full text-left py-2.5 font-bold text-plum-deep hover:text-plum-primary"
            >
              Home
            </button>
            <button
              onClick={() => handleNavigate('grooming')}
              className="block w-full text-left py-2.5 font-bold text-plum-deep hover:text-plum-primary"
            >
              Grooming Services
            </button>
            <button
              onClick={() => handleNavigate('book')}
              className="block w-full text-left py-2.5 font-bold text-plum-deep hover:text-plum-primary"
            >
              Book Now
            </button>
            <button
              onClick={() => {
                handleNavigate('home');
                setMobileMenuOpen(false);
                setTimeout(() => {
                  const contactSection = document.getElementById('visit-us-section');
                  if (contactSection) {
                    contactSection.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                  }
                }, 150);
              }}
              className="block w-full text-left py-2.5 font-bold text-plum-deep hover:text-plum-primary"
            >
              Visit Us
            </button>

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => handleNavigate('admin')}
                className="block w-full text-left py-2 font-extrabold text-plum-deep bg-plum-bg px-3 rounded-lg border border-plum-soft"
              >
                🛡️ Open Admin Dashboard
              </button>
            )}

            <div className="pt-3 border-t border-plum-soft/60 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setPreselectedService(null);
                  handleNavigate('book');
                }}
                className="w-full bg-gradient-to-r from-plum-primary to-plum-deep text-white font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md"
              >
                <Calendar className="w-4 h-4 text-teal-light" />
                Book Grooming
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content View */}
      <main className={`flex-grow w-full ${currentPage === 'home' ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10'}`}>
        {currentPage === 'home' && (
          <Home onNavigate={handleNavigate} setPreselectedService={setPreselectedService} />
        )}
        {currentPage === 'grooming' && (
          <Services onNavigate={handleNavigate} setPreselectedService={setPreselectedService} />
        )}
        {currentPage === 'book' && (
          <BookNow
            onNavigate={handleNavigate}
            preselectedServiceId={preselectedService}
            setPreselectedService={setPreselectedService}
            onBookingComplete={handleBookingComplete}
          />
        )}
        {currentPage === 'confirmation' && (
          <BookingConfirmation booking={confirmedBooking} onNavigate={handleNavigate} />
        )}
      </main>

      {/* Customer Footer */}
      <footer className="bg-plum-deep text-plum-soft py-12 border-t border-plum-dark/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand Brief with Logo */}
            <div className="space-y-3">
              <Logo size="md" variant="light" />
              <p className="text-xs text-plum-soft leading-relaxed max-w-xs pt-1">
                Premier, gentle pet grooming & styling care for dogs and cats in Sheikh Zayed.
              </p>
              <div className="pt-2">
                <a
                  href="https://www.tiktok.com/@my_petcenter?is_from_webapp=1&sender_device=pc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-plum-dark hover:bg-plum-primary text-white font-bold text-xs px-4 py-2 rounded-xl border border-plum-light/40 transition-colors cursor-pointer shadow-xs"
                >
                  <span>🎵</span> Follow us on TikTok
                </a>
              </div>
            </div>

            {/* Working Hours */}
            <div className="space-y-2 text-xs">
              <h4 className="font-extrabold text-white uppercase tracking-wider text-xs font-display">Working Hours</h4>
              <p className="text-slate-200">Every day: 12:00 PM – 12:00 AM</p>
              <p className="text-teal-light font-semibold">Open 7 days a week (No regular days off)</p>
              <p className="text-plum-soft">Shower, Styling, and complete grooming care</p>
            </div>

            {/* Exact Location & Contact */}
            <div className="space-y-2 text-xs">
              <h4 className="font-extrabold text-white uppercase tracking-wider text-xs font-display">Contact & Location</h4>
              <p className="text-white font-bold">My Pet Center — Sheikh Zayed Branch</p>
              <p className="text-slate-200 font-mono">
                📞 <a href="tel:01200888841" className="text-teal-light hover:text-white underline font-bold">01200888841</a>
              </p>
              <p className="text-slate-200 leading-relaxed font-arabic">
                📍 الشيخ زايد – زايد 4<br />
                أمام جامعة القاهرة الجديدة – Chill Out
              </p>
              <div className="pt-2">
                <a
                  href="https://maps.app.goo.gl/RiG8uRZs7g8p4tFy6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-teal-primary hover:bg-teal-dark text-plum-deep font-extrabold px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <span>📍 View on Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-plum-dark/80 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-plum-soft/70 gap-3">
            <span>&copy; {new Date().getFullYear()} My Pet Center. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <span>Sheikh Zayed City, Egypt</span>
              <button
                onClick={() => handleNavigate('admin')}
                className="text-plum-soft/40 hover:text-teal-light transition-colors text-[11px] cursor-pointer"
              >
                Staff Portal
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
