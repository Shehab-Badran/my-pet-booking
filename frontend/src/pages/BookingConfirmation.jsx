import React from 'react';
import { CheckCircle, Calendar, Clock, Phone, User, Heart, ArrowRight, Sparkles, MapPin, ExternalLink } from 'lucide-react';
import Logo from '../components/Logo';

export default function BookingConfirmation({ booking, onNavigate }) {
  if (!booking) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <p className="text-slate-500">No booking details available.</p>
        <button
          onClick={() => onNavigate('home')}
          className="bg-plum-deep text-white px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer hover:bg-plum-dark transition-colors"
        >
          Go to Home
        </button>
      </div>
    );
  }

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${minutes} ${ampm}`;
  };

  return (
    <div className="max-w-xl mx-auto pb-16 space-y-6 animate-fade-in">
      {/* Brand logo & Confirmation Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center mb-1">
          <Logo size="md" />
        </div>
        <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-veryLight text-teal-deep rounded-full border-2 border-teal-light shadow-inner">
          <CheckCircle className="w-8 h-8 text-teal-dark" />
        </div>
        <h1 className="text-3xl font-black text-plum-deep tracking-tight font-display">
          Booking Confirmed ✓
        </h1>
        <p className="text-slate-600 text-sm max-w-sm mx-auto">
          Your grooming appointment has been reserved successfully.
        </p>
      </div>

      {/* Booking Details Card (Zero Prices) */}
      <div className="glass-card-plum rounded-3xl p-6 sm:p-8 border border-plum-soft space-y-6 shadow-xl">
        {/* Booking ID Header */}
        <div className="bg-gradient-to-r from-plum-deep via-plum-dark to-[#16081B] text-white rounded-2xl p-4 text-center border border-plum-soft/30">
          <span className="text-[10px] text-teal-light block uppercase tracking-widest font-extrabold mb-0.5">
            Booking Reference ID
          </span>
          <span className="text-2xl font-black tracking-wide font-mono text-white">
            {booking.booking_id}
          </span>
        </div>

        {/* Info Grid */}
        <div className="border-t border-b border-plum-soft/60 py-4 space-y-3 text-xs sm:text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 block text-xs">Customer</span>
              <span className="font-bold text-plum-deep">{booking.user?.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">Phone</span>
              <span className="font-bold text-plum-deep font-mono">{booking.user?.phone}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 block text-xs">Date</span>
              <span className="font-bold text-plum-deep">{booking.booking_date}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">Time</span>
              <span className="font-bold text-teal-dark font-mono">{formatTime12h(booking.start_time)}</span>
            </div>
          </div>

          {booking.special_notes && (
            <div className="bg-plum-bg p-3 rounded-xl border border-plum-soft">
              <span className="text-plum-deep block text-xs font-bold font-display">Special Instructions:</span>
              <span className="text-slate-800 font-medium text-xs mt-0.5 block">{booking.special_notes}</span>
            </div>
          )}
        </div>

        {/* Payment Policy Note (Zero Prices) */}
        <div className="bg-teal-bg border border-teal-veryLight rounded-2xl p-4 text-xs text-teal-deep text-left space-y-1">
          <p className="font-bold flex items-center gap-1.5 font-display">
            <Sparkles className="w-4 h-4 text-teal-primary" />
            <span>Zero Deposit Required:</span>
          </p>
          <p className="text-slate-700">Payment is completed conveniently at the center after your pet's grooming session.</p>
        </div>

        {/* Center Location Note */}
        <div className="bg-plum-bg border border-plum-soft rounded-2xl p-4 text-xs text-slate-700 text-left space-y-1.5">
          <p className="font-bold text-plum-deep flex items-center gap-1.5 font-display">
            <MapPin className="w-4 h-4 text-teal-dark" />
            <span>Center Location:</span>
          </p>
          <p className="text-slate-800 font-medium font-arabic">الشيخ زايد – زايد 4 – أمام جامعة القاهرة الجديدة – Chill Out</p>
          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-plum-deep font-bold">📞 01200888841</span>
            <a
              href="https://maps.app.goo.gl/RiG8uRZs7g8p4tFy6"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-dark hover:underline font-bold inline-flex items-center gap-1"
            >
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Helpful arrival note */}
      <div className="bg-gold-bg border border-gold-primary/30 rounded-2xl p-4 flex items-center gap-3 text-xs text-plum-deep">
        <Heart className="w-5 h-5 text-gold-dark shrink-0" />
        <div>
          Please arrive 5-10 minutes prior to your scheduled time slot at our Sheikh Zayed center.
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={() => onNavigate('my_bookings')}
          className="flex-1 bg-gradient-to-r from-plum-primary to-plum-deep hover:from-plum-dark hover:to-plum-deep text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-plum-soft/20"
        >
          <span>View My Bookings</span>
          <ArrowRight className="w-4 h-4 text-teal-light" />
        </button>
        <button
          onClick={() => onNavigate('home')}
          className="bg-plum-bg hover:bg-plum-soft/40 text-plum-deep font-bold py-3.5 px-6 rounded-xl text-sm transition-colors cursor-pointer border border-plum-soft"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
