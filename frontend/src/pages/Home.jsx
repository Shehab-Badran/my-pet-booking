import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Scissors,
  ShowerHead,
  ArrowRight,
  ExternalLink,
  Heart,
  CheckCircle2,
  Star,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Logo from '../components/Logo';

const HERO_SLIDES = [
  {
    id: 1,
    src: '/hero-slide-1.jpg',
    alt: 'Golden retriever enjoying full grooming bath and drying pampering session at My Pet Center',
    tag: 'Hydro-Bath & Coat Styling'
  },
  {
    id: 2,
    src: '/hero-slide-2.jpg',
    alt: 'Happy pampered Shih Tzu dog styled at My Pet Center Sheikh Zayed',
    tag: 'Styling & Gentle Care'
  },
  {
    id: 3,
    src: '/hero-slide-3.png',
    alt: 'Complete pet hygiene and wellness care at My Pet Center',
    tag: 'Hygiene & Sterile Care'
  }
];

export default function Home({ onNavigate, setPreselectedService }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Auto advance slides every 4.5 seconds when not hovered
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isHovered]);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const handleBookService = (serviceName = null) => {
    if (setPreselectedService) {
      setPreselectedService(serviceName);
    }
    onNavigate('book');
  };

  return (
    <div className="w-full animate-fade-in">
      {/* 1. EXACT REFERENCE-MATCHING HERO SECTION (ZERO TOP WHITE SPACE, BALANCED VIEWPORT) */}
      <section className="relative overflow-hidden pt-4 pb-8 sm:pt-6 sm:pb-10 lg:pt-8 lg:pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#EEFBFB]/85 via-[#FAF6FB]/90 to-[#F7F2F9] rounded-b-[32px] sm:rounded-b-[44px] border-b border-[#E8DCED]/70 shadow-xs">
        {/* Soft Ambient Pastel Glows Matching Reference Palette */}
        <div className="absolute top-0 left-0 w-[520px] h-[520px] bg-gradient-to-br from-[#D2F5F7]/70 via-[#E4F8FA]/40 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute top-0 right-8 w-[560px] h-[560px] bg-gradient-to-bl from-[#F6EAFB]/75 via-[#FAF0FC]/45 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute bottom-4 left-1/3 w-[420px] h-[420px] bg-[#FAF3FC]/60 rounded-full blur-2xl pointer-events-none -z-10"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN: Clean Typography, Tag & CTAs */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-4 sm:space-y-6 text-left flex flex-col justify-center">
            {/* Top Category Tag (No Arabic banner) */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#E6D8EC] text-[#B87C10] font-extrabold text-xs sm:text-sm tracking-wider uppercase shadow-xs w-fit">
              <Sparkles className="w-3.5 h-3.5 text-[#F5B32B]" />
              <span>GROOMING · SHEIKH ZAYED</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[48px] xl:text-[54px] font-black text-[#26132C] tracking-tight font-display leading-[1.1]">
              A full groom,<br />
              tailored with care.
            </h1>

            {/* Subtitle Body */}
            <p className="text-slate-600 text-sm sm:text-base lg:text-[16px] font-normal leading-relaxed max-w-lg">
              Bath, blow-dry, nail trim, ear clean and a coat check by our dedicated specialists. Gentle, stress-free pampering tailored for dogs and cats.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 pt-1 sm:pt-2">
              <button
                onClick={() => handleBookService(null)}
                className="inline-flex items-center justify-center gap-2.5 bg-[#492752] hover:bg-[#3C1F43] text-white font-extrabold px-7 py-3.5 sm:px-8 sm:py-4 rounded-full text-sm sm:text-base shadow-[0_10px_25px_rgba(73,39,82,0.25)] hover:shadow-[0_12px_30px_rgba(73,39,82,0.38)] transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 border border-plum-soft/20"
              >
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-teal-light" />
                <span>Book Grooming</span>
              </button>

              <button
                onClick={() => onNavigate('grooming')}
                className="inline-flex items-center justify-center gap-2 bg-white/95 hover:bg-[#FAF6FC] text-[#26132C] font-extrabold px-6 py-3.5 sm:px-7 sm:py-4 rounded-full text-sm sm:text-base border border-slate-200/90 hover:border-plum-soft/80 transition-all duration-300 shadow-xs cursor-pointer transform hover:-translate-y-0.5"
              >
                <Scissors className="w-4 h-4 text-teal-dark" />
                <span>Explore Services</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: 3-Slide Image Carousel & Floating Badge */}
          <div className="lg:col-span-6 xl:col-span-6 w-full flex justify-center lg:justify-end">
            <div
              className="relative w-full max-w-[460px] lg:max-w-[480px] xl:max-w-[500px]"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Main Rounded Image Container (1:1 Aspect Ratio displaying full images with zero unwanted black areas) */}
              <div className="relative w-full aspect-square rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_20px_45px_-10px_rgba(43,21,51,0.18)] bg-white border border-[#E5D7EB]/80 group">
                {HERO_SLIDES.map((slide, index) => {
                  const isActive = index === currentSlide;
                  return (
                    <div
                      key={slide.id}
                      className={`absolute inset-0 transition-all duration-600 ease-in-out ${
                        isActive
                          ? 'opacity-100 scale-100 z-10'
                          : 'opacity-0 scale-105 pointer-events-none z-0'
                      }`}
                    >
                      <img
                        src={slide.src}
                        alt={slide.alt}
                        className="w-full h-full object-cover object-center"
                        loading={index === 0 ? 'eager' : 'lazy'}
                      />
                    </div>
                  );
                })}

                {/* Slide Navigation Arrows (visible on desktop hover) */}
                <button
                  onClick={handlePrevSlide}
                  aria-label="Previous Slide"
                  className="hidden group-hover:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-[#26132C] items-center justify-center shadow-md backdrop-blur-xs transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextSlide}
                  aria-label="Next Slide"
                  className="hidden group-hover:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-[#26132C] items-center justify-center shadow-md backdrop-blur-xs transition-all cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Floating Rating Badge Overlay (exact reference design) */}
                <div className="absolute bottom-3.5 left-3.5 sm:bottom-5 sm:left-5 z-20 bg-white/95 backdrop-blur-md border border-white/95 shadow-[0_10px_25px_rgba(43,21,51,0.12)] rounded-full px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2.5 sm:gap-3 animate-float select-none">
                  <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-[#FFF7E8] border border-[#FFE7B3] flex items-center justify-center text-xs shadow-xs shrink-0">
                    <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#F5B32B] text-[#F5B32B]" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs sm:text-[13px] font-black text-[#26132C] leading-tight">
                      4.9 from 380+ reviews
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-black text-teal-deep tracking-wider uppercase mt-0.5">
                      CLINIC · GROOMING · CARE
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Horizontal Bar Carousel Indicators */}
              <div className="flex items-center gap-2.5 sm:gap-3 mt-3.5 sm:mt-4 px-1">
                {HERO_SLIDES.map((slide, index) => {
                  const isActive = index === currentSlide;
                  return (
                    <button
                      key={slide.id}
                      onClick={() => setCurrentSlide(index)}
                      className={`flex-1 h-2 rounded-full transition-all duration-400 cursor-pointer ${
                        isActive
                          ? 'bg-[#492752] shadow-xs'
                          : 'bg-[#E3D6E5] hover:bg-[#D5C2D8]'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                      title={slide.tag}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOWER SECTIONS CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20 pt-12 sm:pt-16 pb-16">

      {/* 2. PET CARE & GROOMING SERVICES SHOWCASE (ZERO PRICES) */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-teal-veryLight text-teal-deep px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-teal-light/40">
            <Sparkles className="w-3.5 h-3.5 text-teal-primary" />
            Pet-Centered Excellence
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-plum-deep tracking-tight font-display">
            Our Grooming Care & Treatments
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Tailored grooming experiences designed for the well-being, hygiene, and happiness of your pet.
          </p>
        </div>

        {/* Services Grid (Zero Prices) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Small Dogs */}
          <div className="glass-card-plum rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:-translate-y-1 space-y-6 border border-plum-soft">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-plum-soft/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-plum-bg text-plum-deep border border-plum-soft rounded-2xl flex items-center justify-center text-2xl shadow-xs">
                    🐕
                  </div>
                  <div>
                    <h3 className="font-extrabold text-plum-deep text-lg font-display">Small Dogs</h3>
                    <span className="text-xs text-teal-dark font-bold">Under 15 kg</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Gentle washing and precision styling crafted for small breeds to keep their coat silky, healthy, and tangle-free.
              </p>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                  <span>Therapeutic bath & warm blow-dry</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                  <span>Custom scissor or clipper styled haircut</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                  <span>Nail clipping, paw pad trim & ear cleaning</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleBookService('Small Dog')}
              className="w-full bg-plum-deep hover:bg-plum-dark text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-plum-soft/20"
            >
              <span>Book Small Dog</span>
              <ArrowRight className="w-3.5 h-3.5 text-teal-light" />
            </button>
          </div>

          {/* Card 2: Large Dogs */}
          <div className="glass-card-plum rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:-translate-y-1 space-y-6 border border-plum-soft">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-plum-soft/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-plum-bg text-plum-deep border border-plum-soft rounded-2xl flex items-center justify-center text-2xl shadow-xs">
                    🦮
                  </div>
                  <div>
                    <h3 className="font-extrabold text-plum-deep text-lg font-display">Large Dogs</h3>
                    <span className="text-xs text-teal-dark font-bold">Over 15 kg</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Deep cleansing, deshedding, and full coat styling designed specifically for medium and large dog breeds.
              </p>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                  <span>Deep coat wash & high-velocity blow-dry</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                  <span>Full coat haircut & undercoat deshedding</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                  <span>Nail clipping, sanitary trim & ear hygiene</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleBookService('Large Dog')}
              className="w-full bg-plum-deep hover:bg-plum-dark text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-plum-soft/20"
            >
              <span>Book Large Dog</span>
              <ArrowRight className="w-3.5 h-3.5 text-teal-light" />
            </button>
          </div>

          {/* Card 3: Cats */}
          <div className="glass-card-plum rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:-translate-y-1 space-y-6 border border-plum-soft">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-plum-soft/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-plum-bg text-plum-deep border border-plum-soft rounded-2xl flex items-center justify-center text-2xl shadow-xs">
                    🐱
                  </div>
                  <div>
                    <h3 className="font-extrabold text-plum-deep text-lg font-display">Cats</h3>
                    <span className="text-xs text-teal-dark font-bold">Gentle & Calm Care</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Zero-sedation gentle grooming in a quiet, stress-free setting with certified feline handling specialists.
              </p>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                  <span>100% sedation-free gentle handling</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                  <span>Therapeutic bath, soft brushing & blow-dry</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                  <span>Sanitary trim, nail clipping & ear cleansing</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleBookService('Cat')}
              className="w-full bg-plum-deep hover:bg-plum-dark text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-plum-soft/20"
            >
              <span>Book Cat</span>
              <ArrowRight className="w-3.5 h-3.5 text-teal-light" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. KEY HIGHLIGHTS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-3xl flex items-start gap-4 border border-plum-soft shadow-xs hover:shadow-md transition-all">
          <div className="p-3.5 bg-teal-bg text-teal-deep rounded-2xl shrink-0 border border-teal-veryLight">
            <Clock className="w-6 h-6 text-teal-dark" />
          </div>
          <div>
            <h3 className="font-extrabold text-plum-deep text-base font-display">Every Day 12:00 PM – 12:00 AM</h3>
            <p className="text-slate-600 text-xs mt-1 leading-relaxed">
              Open 7 days a week with extended evening hours and no regular days off.
            </p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl flex items-start gap-4 border border-plum-soft shadow-xs hover:shadow-md transition-all">
          <div className="p-3.5 bg-teal-bg text-teal-deep rounded-2xl shrink-0 border border-teal-veryLight">
            <ShieldCheck className="w-6 h-6 text-teal-dark" />
          </div>
          <div>
            <h3 className="font-extrabold text-plum-deep text-base font-display">Calm & Sterile Care</h3>
            <p className="text-slate-600 text-xs mt-1 leading-relaxed">
              Hygienic, sanitized grooming suites with gentle, stress-free handling.
            </p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl flex items-start gap-4 border border-plum-soft shadow-xs hover:shadow-md transition-all">
          <div className="p-3.5 bg-teal-bg text-teal-deep rounded-2xl shrink-0 border border-teal-veryLight">
            <Sparkles className="w-6 h-6 text-teal-dark" />
          </div>
          <div>
            <h3 className="font-extrabold text-plum-deep text-base font-display">Fast 30-Sec Booking</h3>
            <p className="text-slate-600 text-xs mt-1 leading-relaxed">
              Choose your day and time to lock in your appointment in seconds.
            </p>
          </div>
        </div>
      </section>

      {/* 4. VISIT US & LOCATION SECTION */}
      <section id="visit-us-section" className="glass-card rounded-3xl p-6 sm:p-10 border border-plum-soft shadow-md space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Branch Information */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-xs font-black text-teal-dark uppercase tracking-widest block mb-1">
                VISIT US
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-plum-deep tracking-tight font-display">
                My Pet Center — Sheikh Zayed Branch
              </h2>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3.5 bg-plum-bg border border-plum-soft p-4 rounded-2xl">
                <div className="p-2.5 bg-teal-bg text-teal-deep rounded-xl mt-0.5 shrink-0 border border-teal-veryLight">
                  <MapPin className="w-5 h-5 text-teal-dark" />
                </div>
                <div>
                  <span className="font-extrabold text-plum-deep block text-base font-arabic">📍 الشيخ زايد – زايد 4</span>
                  <span className="text-slate-700 block mt-1 text-sm font-medium font-arabic">أمام جامعة القاهرة الجديدة – Chill Out</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 bg-white border border-plum-soft p-3.5 rounded-2xl shadow-xs">
                  <div className="p-2.5 bg-teal-bg text-teal-deep rounded-xl shrink-0 border border-teal-veryLight">
                    <Phone className="w-5 h-5 text-teal-dark" />
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] font-bold block uppercase">Phone Number</span>
                    <a href="tel:01200888841" className="font-extrabold font-mono text-plum-deep hover:text-teal-dark transition-colors">
                      📞 01200888841
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white border border-plum-soft p-3.5 rounded-2xl shadow-xs">
                  <div className="p-2.5 bg-teal-bg text-teal-deep rounded-xl shrink-0 border border-teal-veryLight">
                    <Clock className="w-5 h-5 text-teal-dark" />
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] font-bold block uppercase">Working Hours</span>
                    <span className="font-extrabold text-plum-deep text-xs block">Every day: 12:00 PM – 12:00 AM</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="https://maps.app.goo.gl/RiG8uRZs7g8p4tFy6"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-teal-primary hover:bg-teal-dark text-plum-deep font-extrabold px-6 py-3.5 rounded-xl text-sm flex items-center gap-2 shadow-md hover:shadow-teal-glow transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                <MapPin className="w-4 h-4" />
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href="https://www.tiktok.com/@my_petcenter?is_from_webapp=1&sender_device=pc"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-plum-deep hover:bg-plum-dark text-white font-bold px-6 py-3.5 rounded-xl text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer border border-plum-soft/30"
              >
                <span>🎵</span>
                <span>TikTok</span>
              </a>
            </div>
          </div>

          {/* Right Column: Real Store Photo Card */}
          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-plum-soft/60 group">
              <img
                src="/store.jpg"
                alt="My Pet Center Sheikh Zayed Storefront"
                className="w-full h-80 sm:h-96 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-plum-deep/95 via-plum-deep/40 to-transparent flex flex-col justify-end p-6 text-white">
                <span className="bg-teal-primary text-plum-deep text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit mb-2 shadow-xs">
                  Official Storefront
                </span>
                <h4 className="text-xl font-black font-display">My Pet Center — Sheikh Zayed</h4>
                <p className="text-xs text-plum-soft mt-0.5 font-medium">Care · Walk · Shop · Clinic · Grooming</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
