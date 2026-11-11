import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Scissors,
  ArrowRight,
  ExternalLink,
  Heart,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ChevronDown,
  MessageCircle
} from 'lucide-react';
import Logo from '../components/Logo';

const HERO_SLIDES = [
  {
    id: 1,
    src: '/hero-slide-1.jpg',
    alt: 'Golden retriever enjoying full grooming bath and drying pampering session at My Pet Center Sheikh Zayed',
    tag: 'Hydro-Bath & Coat Styling'
  },
  {
    id: 2,
    src: '/hero-slide-2.jpg',
    alt: 'Happy pampered Shih Tzu dog styled at My Pet Center Sheikh Zayed',
    tag: 'Precision Styling & Gentle Care'
  },
  {
    id: 3,
    src: '/hero-slide-3.png',
    alt: 'Complete pet hygiene and wellness care at My Pet Center',
    tag: 'Sanitary Hygiene & Coat Care'
  }
];

const FAQS = [
  {
    question: 'How can I book a grooming appointment?',
    answer: 'Choose your preferred date and time on our website, enter your name and phone number, and confirm your booking!'
  },
  {
    question: 'Do I need to pay when booking?',
    answer: 'No! Booking is free. You pay at My Pet Center after your grooming session.'
  },
  {
    question: 'How long does grooming take?',
    answer: "It depends on your pet's size, coat, and grooming needs. Our team will guide you."
  },
  {
    question: 'Can I change or cancel my appointment?',
    answer: "Of course! Just contact us on WhatsApp as early as possible, and we'll help you."
  },
  {
    question: 'Do you groom both cats and dogs?',
    answer: 'Yes! We welcome both cats and dogs for grooming.'
  },
  {
    question: 'How do I get my FREE gift? 🎁',
    answer: 'Book through our website and complete 3 paid grooming visits using the same phone number to earn your free gift.'
  },
  {
    question: 'Is the 50% grooming discount still available?',
    answer: "Yes! We're currently offering 50% OFF grooming. Contact our team for offer details."
  },
  {
    question: 'Where is My Pet Center located?',
    answer: "We're located in Sheikh Zayed – Gate 4, in front of New Cairo University – Chillout. Tap Get Directions to find us easily!"
  }
];

export default function Home({ onNavigate }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

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

  const handleBookGeneric = () => {
    onNavigate('book');
  };

  return (
    <div className="w-full animate-fade-in">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-6 pb-10 sm:pt-8 sm:pb-12 lg:pt-10 lg:pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#EEFBFB]/90 via-[#FAF6FB]/95 to-[#F7F2F9] rounded-b-[36px] sm:rounded-b-[48px] border-b border-[#E8DCED]/70 shadow-xs">
        {/* Soft Ambient Pastel Glows */}
        <div className="absolute top-0 left-0 w-[520px] h-[520px] bg-gradient-to-br from-[#D2F5F7]/70 via-[#E4F8FA]/40 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute top-0 right-8 w-[560px] h-[560px] bg-gradient-to-bl from-[#F6EAFB]/75 via-[#FAF0FC]/45 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN: Clean Typography, Offer & Primary Booking CTA */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-5 sm:space-y-6 text-left flex flex-col justify-center">
            {/* 50% OFF OFFER BADGE */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#E6D8EC] text-[#874A96] font-black text-xs sm:text-sm tracking-wider uppercase shadow-xs">
                <Sparkles className="w-4 h-4 text-teal-dark" />
                <span>SHEIKH ZAYED PET CARE</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-teal-deep to-teal-dark text-white font-black text-xs sm:text-sm tracking-wide shadow-sm">
                <span>🔥 50% OFF All Grooming</span>
              </div>
            </div>

            {/* Clear Headline Communicating Pet Grooming in Sheikh Zayed */}
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[52px] font-black text-[#26132C] tracking-tight font-display leading-[1.15]">
              Professional Pet Grooming in Sheikh Zayed
            </h1>

            {/* Subtitle Body */}
            <p className="text-slate-600 text-sm sm:text-base lg:text-[16px] font-normal leading-relaxed max-w-lg">
              Full gentle wash, warm blow-dry, styled haircut, nail trimming, and ear hygiene. Dedicated, stress-free pampering tailored for dogs and cats.
            </p>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 pt-1 sm:pt-2">
              <button
                onClick={handleBookGeneric}
                className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-plum-deep via-plum-dark to-plum-primary hover:from-[#1c0821] hover:to-plum-dark text-white font-black px-8 py-4 sm:px-10 sm:py-4.5 rounded-2xl text-base sm:text-lg shadow-[0_12px_28px_rgba(73,39,82,0.35)] hover:shadow-[0_16px_36px_rgba(73,39,82,0.45)] transition-all duration-300 cursor-pointer transform hover:-translate-y-1 border border-teal-light/30 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <Calendar className="w-5 h-5 text-teal-light animate-pulse" />
                <span className="tracking-wide">Book Grooming Session</span>
                <ArrowRight className="w-4 h-4 text-teal-light group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('grooming')}
                className="inline-flex items-center justify-center gap-2 bg-white/95 hover:bg-[#FAF6FC] text-[#26132C] font-extrabold px-6 py-4 rounded-2xl text-sm sm:text-base border border-slate-200/90 hover:border-plum-soft/80 transition-all duration-300 shadow-xs cursor-pointer transform hover:-translate-y-0.5"
              >
                <Scissors className="w-4 h-4 text-teal-dark" />
                <span>Explore Care Info</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: 3-Slide Image Carousel with Clean Separated Info */}
          <div className="lg:col-span-6 xl:col-span-6 w-full flex flex-col items-center lg:items-end">
            <div
              className="relative w-full max-w-[460px] lg:max-w-[480px] xl:max-w-[500px]"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Rounded Image Container */}
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

                {/* Slide Navigation Arrows */}
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

                {/* Floating Info Badge Overlay (Clean, Truthful, Non-overlapping) */}
                <div className="absolute bottom-3.5 left-3.5 sm:bottom-5 sm:left-5 z-20 bg-white/95 backdrop-blur-md border border-white/95 shadow-[0_10px_25px_rgba(43,21,51,0.14)] rounded-2xl px-4 py-2.5 flex items-center gap-3 select-none">
                  <div className="w-8 h-8 rounded-full bg-teal-veryLight border border-teal-light flex items-center justify-center text-xs shadow-xs shrink-0">
                    <ShieldCheck className="w-4 h-4 text-teal-dark" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs sm:text-[13px] font-black text-[#26132C] leading-tight">
                      My Pet Center · Sheikh Zayed
                    </div>
                    <div className="text-[10px] font-bold text-teal-dark tracking-wider uppercase mt-0.5">
                      Clinic · Grooming · Gentle Care
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20 pt-8 sm:pt-10 pb-16">

        {/* MY PET REWARDS LOYALTY SECTION */}
        <section className="bg-gradient-to-r from-plum-deep via-plum-dark to-[#240e2b] text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-plum-light/30 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-teal-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-teal-light px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide border border-white/15">
                <span>🐾 My Pet Rewards</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display tracking-tight text-white">
                Book 3 Times & Get a FREE Gift! 🎁
              </h2>
              <p className="text-plum-soft text-sm sm:text-base leading-relaxed">
                Book your grooming appointments through our website and earn 1 stamp after every completed visit.
              </p>
              <div className="inline-block bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-teal-light font-extrabold text-sm sm:text-base tracking-wide border border-white/10">
                🐾 🐾 🐾 = 🎁 FREE GIFT!
              </div>
              <p className="text-xs text-slate-300">
                No registration needed! We automatically track your visits using your phone number.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 flex flex-col items-center gap-4 shrink-0 text-center w-full md:w-auto">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-teal-primary text-plum-deep font-black text-xl flex items-center justify-center shadow-md">
                  🐾
                </div>
                <div className="w-12 h-12 rounded-full bg-teal-primary text-plum-deep font-black text-xl flex items-center justify-center shadow-md">
                  🐾
                </div>
                <div className="w-12 h-12 rounded-full bg-teal-primary text-plum-deep font-black text-xl flex items-center justify-center shadow-md">
                  🐾
                </div>
                <span className="text-xl font-black text-teal-light">=</span>
                <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-dashed border-teal-light text-white font-black text-xl flex items-center justify-center animate-bounce">
                  🎁
                </div>
              </div>
              <button
                onClick={handleBookGeneric}
                className="w-full bg-teal-primary hover:bg-teal-dark text-plum-deep font-black text-sm px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer hover:shadow-teal-glow"
              >
                Book Now & Start Earning
              </button>
            </div>
          </div>
        </section>

        {/* 3. PET CARE INFORMATION (GENERIC BOOKING ACTION ONLY) */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 bg-teal-veryLight text-teal-deep px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-teal-light/40">
              <Sparkles className="w-3.5 h-3.5 text-teal-primary" />
              Tailored Pet Pampering
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-plum-deep tracking-tight font-display">
              Care Tailored for Dogs & Cats
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              All dogs and cats are welcome. We provide individual, stress-free grooming sessions with gentle handling.
            </p>
          </div>

          {/* Informational Cards (Generic Book Grooming button everywhere) */}
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
                      <span className="text-xs text-teal-dark font-bold">Gentle Coat & Skin Care</span>
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

              {/* GENERIC ACTION */}
              <button
                onClick={handleBookGeneric}
                className="w-full bg-plum-deep hover:bg-plum-dark text-white font-bold py-3.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-plum-soft/20"
              >
                <span>Book Grooming</span>
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
                      <span className="text-xs text-teal-dark font-bold">Deep Cleansing & Deshedding</span>
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

              {/* GENERIC ACTION */}
              <button
                onClick={handleBookGeneric}
                className="w-full bg-plum-deep hover:bg-plum-dark text-white font-bold py-3.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-plum-soft/20"
              >
                <span>Book Grooming</span>
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
                      <span className="text-xs text-teal-dark font-bold">100% Sedation-Free</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Gentle, sedation-free handling in a calm and quiet environment designed to keep feline friends comfortable.
                </p>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                    <span>Gentle, quiet, stress-free handling</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                    <span>Therapeutic bath, soft brushing & warm dry</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                    <span>Sanitary trim, nail clipping & ear cleansing</span>
                  </div>
                </div>
              </div>

              {/* GENERIC ACTION */}
              <button
                onClick={handleBookGeneric}
                className="w-full bg-plum-deep hover:bg-plum-dark text-white font-bold py-3.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-plum-soft/20"
              >
                <span>Book Grooming</span>
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
              <h3 className="font-extrabold text-plum-deep text-base font-display">Convenient Schedule</h3>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                Store open daily 11:00 AM – 11:00 PM. Grooming slots from 12:00 PM Sat–Thu, and from 3:00 PM on Fridays.
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
              <h3 className="font-extrabold text-plum-deep text-base font-display">Fast Guest Booking</h3>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                Choose day and time to lock in your appointment in seconds. No advance deposit required.
              </p>
            </div>
          </div>
        </section>

        {/* 4. SHORT FAQ ACCORDION (ACTUAL BUSINESS POLICIES) */}
        <section className="glass-card rounded-3xl p-6 sm:p-10 border border-plum-soft shadow-md space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 text-teal-dark text-xs font-black uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>HELP & SUPPORT</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-plum-deep font-display">
              Got Questions? We've Got Answers! 🐾
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Everything you need to know before booking your pet's grooming appointment.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3 pt-2">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white border border-plum-soft rounded-2xl overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-plum-deep text-sm cursor-pointer hover:bg-plum-bg/40 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-teal-dark shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-plum-soft/40 pt-3 animate-fade-in">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. VISIT US & LOCATION SECTION */}
        <section id="visit-us-section" className="glass-card rounded-3xl p-6 sm:p-10 border border-plum-soft shadow-md space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Branch Information in English */}
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
                    <span className="font-extrabold text-plum-deep block text-base">
                      Sheikh Zayed – Gate 4
                    </span>
                    <span className="text-slate-700 block mt-1 text-sm font-medium">
                      In front of New Cairo University – Chillout
                    </span>
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
                      <span className="text-slate-500 text-[11px] font-bold block uppercase">Store Hours</span>
                      <span className="font-extrabold text-plum-deep text-xs block">Daily: 11:00 AM – 11:00 PM</span>
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
                  href="https://wa.me/201200888841?text=Hello%20My%20Pet%20Center,%20I%20have%20an%20inquiry%20about%20pet%20grooming"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold px-6 py-3.5 rounded-xl text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Contact</span>
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
