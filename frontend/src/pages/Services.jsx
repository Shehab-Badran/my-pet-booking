import React, { useState } from 'react';
import {
  Sparkles,
  Scissors,
  ShowerHead,
  ArrowRight,
  CheckCircle2,
  Clock,
  Heart,
  ShieldCheck
} from 'lucide-react';

export default function Services({ onNavigate, setPreselectedService }) {
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'dogs' | 'cats'

  const handleBook = (serviceName = null) => {
    if (setPreselectedService) {
      setPreselectedService(serviceName);
    }
    onNavigate('book');
  };

  return (
    <div className="space-y-12 pb-16 animate-fade-in">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 bg-teal-veryLight text-teal-deep px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-teal-light/40">
          <Sparkles className="w-3.5 h-3.5 text-teal-primary" />
          Professional Pet Pampering
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-plum-deep tracking-tight font-display">
          Grooming & Pet Care Services
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
          Full-service grooming experiences tailored for dogs and cats. From refreshing baths to full styled breed cuts.
        </p>

        {/* Category Filter Pills */}
        <div className="flex justify-center gap-2 pt-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-plum-deep text-white shadow-sm'
                : 'bg-white border border-plum-soft text-plum-deep hover:bg-plum-bg'
            }`}
          >
            All Services
          </button>
          <button
            onClick={() => setActiveCategory('dogs')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'dogs'
                ? 'bg-plum-deep text-white shadow-sm'
                : 'bg-white border border-plum-soft text-plum-deep hover:bg-plum-bg'
            }`}
          >
            <span>🐶</span> Dog Care
          </button>
          <button
            onClick={() => setActiveCategory('cats')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'cats'
                ? 'bg-plum-deep text-white shadow-sm'
                : 'bg-white border border-plum-soft text-plum-deep hover:bg-plum-bg'
            }`}
          >
            <span>🐱</span> Cat Care
          </button>
        </div>
      </div>

      <div className="space-y-14">
        {/* ================= 1. DOG GROOMING SERVICES ================= */}
        {(activeCategory === 'all' || activeCategory === 'dogs') && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-plum-soft/60 pb-3">
              <span className="text-2xl">🐶</span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-plum-deep font-display">
                  Dog Grooming & Spa Treatments
                </h2>
                <p className="text-xs text-slate-500">Available for Small Dogs (&lt;15kg) and Large Dogs (&gt;15kg)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Shower / Bath Card */}
              <div className="glass-card-plum rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:-translate-y-1 space-y-6 border border-plum-soft">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3.5 bg-teal-bg text-teal-deep rounded-2xl shadow-xs border border-teal-veryLight">
                      <ShowerHead className="w-6 h-6 text-teal-dark" />
                    </div>
                    <span className="bg-plum-bg border border-plum-soft text-plum-deep font-bold text-[11px] px-3 py-1 rounded-full">
                      Hydro-Bath
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-plum-deep font-display">Shower & Bath 🛁</h3>
                    <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                      A revitalizing deep-cleansing wash using therapeutic shampoos followed by a warm blow-dry.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-plum-soft/60">
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Hypoallergenic coat wash & conditioning</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Gentle warm blow-dry & full brushing</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Nail clipping & soothing ear cleansing</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-plum-deep font-bold bg-plum-bg p-2.5 rounded-xl border border-plum-soft/60">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-teal-dark" />
                    <span>Duration: 45 – 60 minutes</span>
                  </div>
                </div>

                <button
                  onClick={() => handleBook('Shower')}
                  className="w-full bg-plum-deep hover:bg-plum-dark text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-plum-soft/20"
                >
                  <span>Book Bath Treatment</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-light" />
                </button>
              </div>

              {/* Cut / Styling Card */}
              <div className="glass-card-plum rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:-translate-y-1 space-y-6 border border-plum-soft">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3.5 bg-teal-bg text-teal-deep rounded-2xl shadow-xs border border-teal-veryLight">
                      <Scissors className="w-6 h-6 text-teal-dark" />
                    </div>
                    <span className="bg-plum-bg border border-plum-soft text-plum-deep font-bold text-[11px] px-3 py-1 rounded-full">
                      Custom Styling
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-plum-deep font-display">Haircut & Styling ✂️</h3>
                    <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                      Custom breed styling, scissor shaping, coat trimming, and sanitary grooming hygiene.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-plum-soft/60">
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Breed-standard or requested styled haircut</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Sanitary trimming & paw pad grooming</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Nail trimming & ear cleaning</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-plum-deep font-bold bg-plum-bg p-2.5 rounded-xl border border-plum-soft/60">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-teal-dark" />
                    <span>Duration: 60 – 90 minutes</span>
                  </div>
                </div>

                <button
                  onClick={() => handleBook('Cut')}
                  className="w-full bg-plum-deep hover:bg-plum-dark text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-plum-soft/20"
                >
                  <span>Book Haircut & Style</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-light" />
                </button>
              </div>

              {/* Complete Shower + Cut Card */}
              <div className="glass-card-plum rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:-translate-y-1 space-y-6 border-2 border-teal-primary relative shadow-plum-md">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3.5 bg-gradient-to-r from-plum-primary to-plum-deep text-white rounded-2xl shadow-md border border-plum-soft/30">
                      <Sparkles className="w-6 h-6 text-gold-primary" />
                    </div>
                    <span className="bg-gradient-to-r from-teal-primary to-teal-dark text-plum-deep font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                      All-Inclusive
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-plum-deep font-display">Shower + Cut Package 🛁✂️</h3>
                    <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                      The ultimate full pamper treatment combining bath, blow-dry, styled haircut, and hygiene suite.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-plum-soft/60">
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Complete hydro-bath & deep coat wash</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Full body styled haircut & scissor finishing</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Nail clipping, ears, sanitary trim & fragrance</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-teal-deep font-bold bg-teal-bg p-2.5 rounded-xl border border-teal-veryLight">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-teal-dark" />
                    <span>Duration: 105 – 150 minutes</span>
                  </div>
                </div>

                <button
                  onClick={() => handleBook('Shower + Cut')}
                  className="w-full bg-gradient-to-r from-plum-primary to-plum-deep hover:from-plum-light hover:to-plum-primary text-white font-black py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-plum-soft/30"
                >
                  <span>Book Full Package</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-light" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. CAT GROOMING SERVICES ================= */}
        {(activeCategory === 'all' || activeCategory === 'cats') && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-plum-soft/60 pb-3">
              <span className="text-2xl">🐱</span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-plum-deep font-display">
                  Cat Grooming & Pampering (100% Sedation-Free)
                </h2>
                <p className="text-xs text-slate-500">Gentle, quiet, stress-free care with feline experts</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Cat Shower */}
              <div className="glass-card-plum rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:-translate-y-1 space-y-6 border border-plum-soft">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3.5 bg-teal-bg text-teal-deep rounded-2xl shadow-xs border border-teal-veryLight">
                      <ShowerHead className="w-6 h-6 text-teal-dark" />
                    </div>
                    <span className="bg-plum-bg border border-plum-soft text-plum-deep font-bold text-[11px] px-3 py-1 rounded-full">
                      Gentle Bath
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-plum-deep font-display">Cat Shower 🛁</h3>
                    <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                      Stress-free warm bath with cat-safe organic shampoo, gentle brushing, and low-noise drying.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-plum-soft/60">
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Calm feline-friendly bath</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Soft towel & low-noise gentle drying</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Nail trimming & gentle ear cleansing</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-plum-deep font-bold bg-plum-bg p-2.5 rounded-xl border border-plum-soft/60">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-teal-dark" />
                    <span>Duration: 45 minutes</span>
                  </div>
                </div>

                <button
                  onClick={() => handleBook('Cat Shower')}
                  className="w-full bg-plum-deep hover:bg-plum-dark text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-plum-soft/20"
                >
                  <span>Book Cat Bath</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-light" />
                </button>
              </div>

              {/* Cat Cut */}
              <div className="glass-card-plum rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:-translate-y-1 space-y-6 border border-plum-soft">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3.5 bg-teal-bg text-teal-deep rounded-2xl shadow-xs border border-teal-veryLight">
                      <Scissors className="w-6 h-6 text-teal-dark" />
                    </div>
                    <span className="bg-plum-bg border border-plum-soft text-plum-deep font-bold text-[11px] px-3 py-1 rounded-full">
                      Trim & Sanitary
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-plum-deep font-display">Cat Haircut & Trim ✂️</h3>
                    <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                      Gentle sanitary trim, mat removal, or styled haircut with peaceful handling techniques.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-plum-soft/60">
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Sanitary trim or styled haircut</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Gentle coat brushing & deshedding</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Nail clipping & ear hygiene</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-plum-deep font-bold bg-plum-bg p-2.5 rounded-xl border border-plum-soft/60">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-teal-dark" />
                    <span>Duration: 60 minutes</span>
                  </div>
                </div>

                <button
                  onClick={() => handleBook('Cat Cut')}
                  className="w-full bg-plum-deep hover:bg-plum-dark text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs border border-plum-soft/20"
                >
                  <span>Book Cat Trim</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-light" />
                </button>
              </div>

              {/* Cat Shower + Cut */}
              <div className="glass-card-plum rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:-translate-y-1 space-y-6 border-2 border-teal-primary relative shadow-plum-md">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3.5 bg-gradient-to-r from-plum-primary to-plum-deep text-white rounded-2xl shadow-md border border-plum-soft/30">
                      <Sparkles className="w-6 h-6 text-gold-primary" />
                    </div>
                    <span className="bg-gradient-to-r from-teal-primary to-teal-dark text-plum-deep font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                      Full Package
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-plum-deep font-display">Cat Shower + Cut 🛁✂️</h3>
                    <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                      Complete all-inclusive pampering session for cats: soothing bath, styled trim, nails, and ears.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-plum-soft/60">
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Stress-free warm wash & conditioning</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Styled trim or full coat grooming</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-primary shrink-0 mt-0.5" />
                      <span>Nail clipping, ears & coat brushing</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-teal-deep font-bold bg-teal-bg p-2.5 rounded-xl border border-teal-veryLight">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-teal-dark" />
                    <span>Duration: 105 minutes</span>
                  </div>
                </div>

                <button
                  onClick={() => handleBook('Cat Shower + Cut')}
                  className="w-full bg-gradient-to-r from-plum-primary to-plum-deep hover:from-plum-light hover:to-plum-primary text-white font-black py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-plum-soft/30"
                >
                  <span>Book Full Cat Grooming</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-light" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
