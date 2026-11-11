import React, { useState } from 'react';
import {
  Sparkles,
  Scissors,
  ShowerHead,
  ArrowRight,
  CheckCircle2,
  Clock,
  Heart,
  ShieldCheck,
  Calendar,
  MessageCircle,
  HelpCircle
} from 'lucide-react';

export default function Services({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'dogs' | 'cats'

  const handleBookGeneric = () => {
    onNavigate('book');
  };

  return (
    <div className="space-y-12 pb-16 animate-fade-in">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 bg-teal-veryLight text-teal-deep px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-teal-light/40">
          <Sparkles className="w-3.5 h-3.5 text-teal-primary" />
          Gentle & Caring Experience
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-plum-deep tracking-tight font-display">
          Pet Grooming in Sheikh Zayed
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
          Comprehensive hygiene, washing, drying, and styling care for dogs and cats. Every session is an all-inclusive 60-minute appointment tailored to your pet's needs.
        </p>

        {/* 50% OFF Banner */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-teal-deep to-teal-dark text-white font-black text-xs sm:text-sm shadow-sm mt-1">
          <span>✨ 50% OFF Grooming Offer Applied</span>
        </div>

        {/* Tab Filters */}
        <div className="flex justify-center gap-2 pt-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-plum-deep text-white shadow-sm'
                : 'bg-white border border-plum-soft text-plum-deep hover:bg-plum-bg'
            }`}
          >
            All Pet Care
          </button>
          <button
            onClick={() => setActiveTab('dogs')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dogs'
                ? 'bg-plum-deep text-white shadow-sm'
                : 'bg-white border border-plum-soft text-plum-deep hover:bg-plum-bg'
            }`}
          >
            <span>🐶</span> Dogs
          </button>
          <button
            onClick={() => setActiveTab('cats')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cats'
                ? 'bg-plum-deep text-white shadow-sm'
                : 'bg-white border border-plum-soft text-plum-deep hover:bg-plum-bg'
            }`}
          >
            <span>🐱</span> Cats
          </button>
        </div>
      </div>

      <div className="space-y-14">
        {/* ================= 1. DOG CARE ================= */}
        {(activeTab === 'all' || activeTab === 'dogs') && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-plum-soft/60 pb-3">
              <span className="text-2xl">🐶</span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-plum-deep font-display">
                  Dog Grooming & Coat Care
                </h2>
                <p className="text-xs text-slate-500">Welcoming dogs of all sizes, from small breeds to large companions</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bath & Hygiene Card */}
              <div className="glass-card-plum rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:-translate-y-1 space-y-6 border border-plum-soft">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3.5 bg-teal-bg text-teal-deep rounded-2xl shadow-xs border border-teal-veryLight">
                      <ShowerHead className="w-6 h-6 text-teal-dark" />
                    </div>
                    <span className="bg-plum-bg border border-plum-soft text-plum-deep font-bold text-[11px] px-3 py-1 rounded-full">
                      Hydro-Bath & Hygiene
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-plum-deep font-display">Bath, Cleanse & Dry 🛁</h3>
                    <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                      Deep revitalizing wash using gentle shampoos, thorough coat conditioning, warm blow-dry, and hygiene maintenance.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-plum-soft/60">
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Hypoallergenic coat wash & conditioning</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Gentle warm blow-dry & full coat brushing</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Nail trimming, paw pad trim & ear cleansing</span>
                    </div>
                  </div>
                </div>

                {/* GENERIC ACTION */}
                <button
                  onClick={handleBookGeneric}
                  className="w-full bg-plum-deep hover:bg-plum-dark text-white font-bold py-3.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-plum-soft/20"
                >
                  <Calendar className="w-3.5 h-3.5 text-teal-light" />
                  <span>Book Grooming</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-light" />
                </button>
              </div>

              {/* Styling & Haircut Card */}
              <div className="glass-card-plum rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:-translate-y-1 space-y-6 border border-plum-soft">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3.5 bg-teal-bg text-teal-deep rounded-2xl shadow-xs border border-teal-veryLight">
                      <Scissors className="w-6 h-6 text-teal-dark" />
                    </div>
                    <span className="bg-plum-bg border border-plum-soft text-plum-deep font-bold text-[11px] px-3 py-1 rounded-full">
                      Custom Styling & Trim
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-plum-deep font-display">Styled Haircut & Finish ✂️</h3>
                    <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                      Custom breed-specific clipping, precision scissor shaping, sanitary area grooming, and paw pad trim.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-plum-soft/60">
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Breed-standard or customer-requested styled haircut</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Sanitary trimming & paw pad grooming</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Nail clipping & soothing ear cleaning</span>
                    </div>
                  </div>
                </div>

                {/* GENERIC ACTION */}
                <button
                  onClick={handleBookGeneric}
                  className="w-full bg-plum-deep hover:bg-plum-dark text-white font-bold py-3.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-plum-soft/20"
                >
                  <Calendar className="w-3.5 h-3.5 text-teal-light" />
                  <span>Book Grooming</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-light" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. CAT CARE ================= */}
        {(activeTab === 'all' || activeTab === 'cats') && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-plum-soft/60 pb-3">
              <span className="text-2xl">🐱</span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-plum-deep font-display">
                  Cat Grooming & Pampering (100% Sedation-Free)
                </h2>
                <p className="text-xs text-slate-500">Gentle, quiet, stress-free care with patient handlers</p>
              </div>
            </div>

            <div className="glass-card-plum rounded-3xl p-6 sm:p-8 border border-plum-soft space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 bg-teal-veryLight text-teal-deep px-3 py-1 rounded-full text-xs font-bold border border-teal-light">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    <span>Gentle & Stress-Free Approach</span>
                  </div>
                  <h3 className="text-2xl font-black text-plum-deep font-display">
                    Sedation-Free Cat Grooming
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    We understand cats require extra patience and a calm, quiet environment. Our team provides gentle coat care without the need for sedation.
                  </p>

                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Gentle hydro-bath with feline-safe shampoo</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Quiet, low-noise blow-dry & thorough soft brushing</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Sanitary trim, claw clipping & ear cleansing</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleBookGeneric}
                      className="bg-plum-deep hover:bg-plum-dark text-white font-extrabold px-6 py-3.5 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer border border-plum-soft/20"
                    >
                      <Calendar className="w-4 h-4 text-teal-light" />
                      <span>Book Grooming</span>
                      <ArrowRight className="w-4 h-4 text-teal-light" />
                    </button>
                  </div>
                </div>

                <div className="bg-plum-bg border border-plum-soft rounded-2xl p-6 space-y-4">
                  <h4 className="font-extrabold text-sm text-plum-deep font-display uppercase tracking-wider">
                    Our Grooming Promise
                  </h4>
                  <ul className="space-y-3 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="text-teal-dark font-black">✓</span>
                      <span><strong>One-on-one attention:</strong> Dedicated 60-minute appointment per slot.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-dark font-black">✓</span>
                      <span><strong>Zero advance deposit:</strong> Book online as a guest, pay after grooming in person.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-dark font-black">✓</span>
                      <span><strong>Sanitized suites:</strong> Clean, sterile tools for every individual pet.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-dark font-black">✓</span>
                      <span><strong>50% OFF Offer:</strong> All appointments benefit from our 50% discount.</span>
                    </li>
                  </ul>
                  <div className="pt-2 border-t border-plum-soft">
                    <a
                      href="https://wa.me/201200888841?text=Hello%20My%20Pet%20Center,%20I%20have%20questions%20about%20cat%20grooming"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-dark hover:underline font-extrabold text-xs inline-flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Have special questions? Chat on WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
