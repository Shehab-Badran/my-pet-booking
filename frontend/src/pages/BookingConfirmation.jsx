import React from 'react';
import {
  CheckCircle,
  Navigation,
  Calendar,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
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

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const customerName = booking.customer_name || booking.user?.name || 'Customer';
  const serviceName = booking.service_name_display || 'Pet Grooming';
  const whatsappUrl = `https://wa.me/201200888841?text=${encodeURIComponent(`Hello My Pet Center, I need to make changes to my booking ${booking.booking_id}`)}`;

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 px-4 space-y-6 animate-fade-in">
      {/* Compact Ticket Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-plum-soft shadow-xl text-center space-y-5">
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        {/* Success Icon & Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-teal-veryLight text-teal-deep rounded-full border-2 border-teal-light shadow-inner">
            <CheckCircle className="w-7 h-7 text-teal-dark" />
          </div>
          <h1 className="text-2xl font-black text-plum-deep tracking-tight font-display">
            Booking Confirmed! 🐾
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm">
            We look forward to seeing you and your pet!
          </p>
        </div>

        {/* Booking Reference Ticket Block */}
        <div className="bg-plum-bg/70 border border-plum-soft rounded-2xl p-3.5 space-y-0.5">
          <span className="text-[10px] text-plum-deep/70 uppercase tracking-widest font-extrabold block">
            Booking Reference
          </span>
          <span className="text-2xl font-black font-mono tracking-wider text-plum-deep block">
            {booking.booking_id}
          </span>
        </div>

        {/* Appointment Details Box */}
        <div className="bg-plum-bg/30 border border-plum-soft/60 rounded-2xl p-4 text-left space-y-2.5 text-xs sm:text-sm">
          <div className="text-[11px] font-black uppercase tracking-wider text-plum-deep/80 border-b border-plum-soft/60 pb-1.5 font-display">
            Your Appointment
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Customer:</span>
            <span className="font-bold text-plum-deep">{customerName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Date:</span>
            <span className="font-bold text-plum-deep">{formatDateDisplay(booking.booking_date)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Time:</span>
            <span className="font-extrabold text-teal-dark font-mono">{formatTime12h(booking.start_time)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Service:</span>
            <span className="font-bold text-plum-deep">{serviceName}</span>
          </div>
          <div className="flex justify-between items-start pt-2 border-t border-plum-soft/60">
            <span className="text-slate-500 font-medium">Location:</span>
            <span className="font-bold text-plum-deep text-right text-xs">
              Sheikh Zayed – Gate 4,<br />
              in front of New Cairo University – Chillout
            </span>
          </div>
        </div>

        {/* Free Gift Reminder */}
        <div className="bg-teal-veryLight/70 border border-teal-light/80 rounded-2xl p-3 text-center text-xs font-bold text-teal-deep">
          🎁 Complete 3 grooming visits and get a FREE Gift!
        </div>

        {/* Get Directions Button */}
        <div>
          <a
            href="https://maps.app.goo.gl/RiG8uRZs7g8p4tFy6"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-teal-primary hover:bg-teal-dark text-plum-deep font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            <span>Get Directions</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Need to change your booking? Small text link */}
        <div className="pt-1 text-center">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-plum-deep underline transition-colors"
          >
            Need to change your booking? Contact us
          </a>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-plum-soft/60">
          <button
            onClick={() => onNavigate('book')}
            className="flex-1 bg-plum-deep hover:bg-plum-dark text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Book Another
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="flex-1 bg-plum-bg hover:bg-plum-soft/60 text-plum-deep font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border border-plum-soft"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
