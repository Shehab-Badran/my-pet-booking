import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  Lock,
  ArrowRight,
  Sparkles,
  MapPin,
  Heart
} from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config';

// Helper for local YYYY-MM-DD formatting (prevents UTC timezone shift bugs)
const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 12-hour time formatter (e.g. 17:00 -> 5:00 PM)
const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${minutes} ${ampm}`;
};

// Default fallback 30-minute slots (15:00 to 23:00)
const generateDefaultSlots = () => {
  const list = [];
  for (let min = 15 * 60; min <= 23 * 60; min += 30) {
    const h = String(Math.floor(min / 60)).padStart(2, '0');
    const m = String(min % 60).padStart(2, '0');
    list.push({ time: `${h}:${m}:00`, available: true });
  }
  return list;
};

export default function BookNow({
  onNavigate,
  onBookingComplete,
  currentUser,
  onOpenAuth
}) {
  // Generate the 7 available booking dates starting from today in local time
  const availableDates = (() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoStr = formatLocalDate(d);
      const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      list.push({ iso: isoStr, dayName, monthDay, isToday: i === 0 });
    }
    return list;
  })();

  // Date & Time selections
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()));
  const [selectedTime, setSelectedTime] = useState('');

  // Customer contact info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');

  // UI / slots state
  const [slots, setSlots] = useState(generateDefaultSlots());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);

  // Update contact fields if currentUser is logged in
  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.name || '');
      setCustomerPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  // Fetch live available time slots for the selected date (3:00 PM – 12:00 AM)
  useEffect(() => {
    if (selectedDate) {
      setLoadingSlots(true);
      setSelectedTime(''); // Reset time selection on date switch
      setErrorMessage('');

      fetch(`${API_BASE_URL}/availability?booking_date=${selectedDate}`)
        .then((res) => {
          if (!res.ok) throw new Error('Could not load time slots.');
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setSlots(data);
          } else {
            setSlots(generateDefaultSlots());
          }
          setLoadingSlots(false);
        })
        .catch((err) => {
          console.error(err);
          setSlots(generateDefaultSlots());
          setLoadingSlots(false);
        });
    }
  }, [selectedDate]);

  // Human date formatter
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  // Submit Booking
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedDate) {
      setErrorMessage('Please choose an appointment day.');
      return;
    }

    if (!selectedTime) {
      setErrorMessage('Please select an available time slot.');
      return;
    }

    const normalizePhone = (p) => {
      if (!p) return '';
      const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
      let cleaned = String(p).split('').map(c => {
        const idx = arabicDigits.indexOf(c);
        return idx > -1 ? idx.toString() : c;
      }).join('').replace(/\D/g, '');

      if (cleaned.startsWith('0020')) {
        cleaned = cleaned.slice(4);
      } else if (cleaned.startsWith('20') && cleaned.length >= 11) {
        cleaned = cleaned.slice(2);
      }

      if (cleaned.length === 10 && (cleaned.startsWith('10') || cleaned.startsWith('11') || cleaned.startsWith('12') || cleaned.startsWith('15'))) {
        cleaned = '0' + cleaned;
      }
      return cleaned;
    };

    const nameToSubmit = (currentUser ? currentUser.name : customerName).trim();
    const rawPhone = (currentUser ? currentUser.phone : customerPhone).trim();
    const phoneToSubmit = normalizePhone(rawPhone) || rawPhone;

    if (!nameToSubmit || nameToSubmit.length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!phoneToSubmit || phoneToSubmit.length < 9) {
      setErrorMessage('Please enter a valid phone number (e.g. 01200888841).');
      return;
    }

    setSubmitting(true);

    try {
      let token = localStorage.getItem('mpc_token');

      // Auto-register / login for guest customers
      if (!token) {
        const pwdToUse = accountPassword.trim() || 'customer123';

        // Try quick login
        let authRes = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneToSubmit, password: pwdToUse }),
        });

        // If not registered yet, auto-register account
        if (!authRes.ok) {
          authRes = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: nameToSubmit,
              phone: phoneToSubmit,
              password: pwdToUse,
            }),
          });
        }

        const authData = await authRes.json();
        if (authRes.ok && authData.access_token) {
          token = authData.access_token;
          localStorage.setItem('mpc_token', token);
        } else {
          let errDetail = 'Authentication failed. Please check your phone or log in.';
          if (typeof authData.detail === 'string') {
            errDetail = authData.detail;
          } else if (Array.isArray(authData.detail)) {
            errDetail = authData.detail.map((d) => d.msg || 'Invalid field').join(', ');
          }
          throw new Error(errDetail);
        }
      }

      // Create Booking with Day & Time (Zero prices involved)
      const bookingPayload = {
        booking_date: selectedDate,
        start_time: selectedTime,
        special_notes: specialNotes.trim() || null,
      };

      const bookingRes = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingPayload),
      });

      const bookingData = await bookingRes.json();
      if (!bookingRes.ok) {
        let bErr = 'Failed to confirm booking.';
        if (typeof bookingData.detail === 'string') {
          bErr = bookingData.detail;
        } else if (Array.isArray(bookingData.detail)) {
          bErr = bookingData.detail.map((d) => d.msg || 'Invalid field').join(', ');
        }
        throw new Error(bErr);
      }

      setSubmitting(false);
      setConfirmedBookingData(bookingData);
      if (onBookingComplete) {
        onBookingComplete(bookingData);
      }
    } catch (err) {
      setSubmitting(false);
      setErrorMessage(err.message || 'An error occurred while confirming your booking. Please try again.');
    }
  };

  // --- CONFIRMED BOOKING SCREEN ---
  if (confirmedBookingData) {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 space-y-6 animate-fade-in">
        <div className="glass-card-plum rounded-3xl p-6 sm:p-10 border border-plum-soft shadow-2xl text-center space-y-6">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-veryLight text-teal-deep rounded-full border-4 border-teal-light shadow-inner">
            <CheckCircle className="w-10 h-10 text-teal-dark" />
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black text-plum-deep tracking-tight font-display">
              ✓ Booking Confirmed
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm">
              Your grooming appointment is reserved! We look forward to pampering your pet.
            </p>
          </div>

          {/* Booking ID Badge */}
          <div className="bg-gradient-to-r from-plum-deep via-plum-dark to-[#16081B] text-white rounded-2xl p-5 shadow-lg border border-plum-soft/30">
            <span className="text-[11px] text-teal-light block uppercase tracking-widest font-extrabold mb-1">
              Booking Reference ID
            </span>
            <span className="text-3xl font-black font-mono tracking-wider text-white">
              {confirmedBookingData.booking_id}
            </span>
          </div>

          {/* Summary Card (Zero Prices) */}
          <div className="bg-white border border-plum-soft rounded-2xl p-5 text-left space-y-3 text-xs sm:text-sm shadow-xs">
            <div className="flex justify-between items-center border-b border-plum-soft/40 pb-2.5">
              <span className="text-slate-500 font-medium">Date & Time</span>
              <span className="font-extrabold text-plum-deep">
                {formatDateDisplay(confirmedBookingData.booking_date)} at {formatTime12h(confirmedBookingData.start_time)}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-plum-soft/40 pb-2.5">
              <span className="text-slate-500 font-medium">Customer</span>
              <span className="font-extrabold text-plum-deep font-mono">
                {confirmedBookingData.user?.name} ({confirmedBookingData.user?.phone})
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-500 font-medium">Payment Policy</span>
              <span className="font-bold text-teal-dark">
                Pay at center after grooming (Zero deposit required)
              </span>
            </div>
          </div>

          {/* Center Address Note */}
          <div className="bg-plum-bg border border-plum-soft rounded-2xl p-4 text-xs text-slate-700 text-left space-y-1.5">
            <p className="font-bold text-plum-deep flex items-center gap-1.5 font-display">
              <MapPin className="w-4 h-4 text-teal-dark" />
              <span>Center Location:</span>
            </p>
            <p className="text-slate-800 font-medium font-arabic">الشيخ زايد – زايد 4 – أمام جامعة القاهرة الجديدة – Chill Out</p>
            <p className="font-mono text-plum-deep font-bold">📞 Contact / WhatsApp: 01200888841</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => onNavigate('my_bookings')}
              className="flex-1 bg-gradient-to-r from-plum-primary to-plum-deep hover:from-plum-dark hover:to-plum-deep text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all text-xs sm:text-sm cursor-pointer border border-plum-soft/20"
            >
              View My Bookings
            </button>
            <button
              onClick={() => {
                setConfirmedBookingData(null);
                setSelectedTime('');
                setSpecialNotes('');
              }}
              className="flex-1 bg-plum-bg hover:bg-plum-soft/40 text-plum-deep font-bold py-3.5 px-4 rounded-xl transition-all text-xs sm:text-sm cursor-pointer border border-plum-soft"
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- SINGLE-PAGE ULTRA-FAST 3-STEP BOOKING FLOW ---
  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-teal-veryLight text-teal-deep px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-teal-light/40">
          <Sparkles className="w-3.5 h-3.5 text-teal-primary" />
          Easy 30-Second Reservation
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-plum-deep tracking-tight font-display">
          Book Grooming Appointment
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
          Select your day and preferred time slot to reserve your grooming session.
        </p>
      </div>

      <form onSubmit={handleConfirmBooking} className="space-y-6">
        {/* ================= 1. CHOOSE DAY ================= */}
        <div className="glass-card-plum rounded-3xl p-6 sm:p-8 border border-plum-soft shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-plum-soft/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 bg-plum-deep text-white rounded-full flex items-center justify-center text-xs font-black">
                1
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-plum-deep font-display">
                Choose Day
              </h2>
            </div>
            <span className="text-xs text-teal-dark font-bold">Next 7 days available</span>
          </div>

          {/* 7-Day Horizontal Pills with Responsive Wrapping */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {availableDates.map((item) => {
              const isSelected = selectedDate === item.iso;
              return (
                <button
                  key={item.iso}
                  type="button"
                  onClick={() => setSelectedDate(item.iso)}
                  className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'border-plum-deep bg-gradient-to-br from-plum-deep via-plum-dark to-plum-primary text-white font-extrabold shadow-md transform -translate-y-0.5 ring-2 ring-teal-primary/40'
                      : 'border-plum-soft bg-white hover:border-plum-primary/50 hover:bg-plum-bg/60 text-plum-deep font-semibold'
                  }`}
                >
                  <span className={`text-xs uppercase font-extrabold ${isSelected ? 'text-teal-light' : 'text-slate-500'}`}>
                    {item.dayName}
                  </span>
                  <span className="text-base sm:text-lg font-black mt-0.5 font-display">
                    {item.monthDay}
                  </span>
                  {item.isToday && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full mt-1 font-bold ${isSelected ? 'bg-teal-primary text-plum-deep' : 'bg-plum-bg text-plum-deep border border-plum-soft'}`}>
                      Today
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= 2. CHOOSE TIME ================= */}
        <div className="glass-card-plum rounded-3xl p-6 sm:p-8 border border-plum-soft shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-plum-soft/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 bg-plum-deep text-white rounded-full flex items-center justify-center text-xs font-black">
                2
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-plum-deep font-display">
                Choose Available Time
              </h2>
            </div>
            <span className="text-xs text-teal-dark font-bold">
              3:00 PM – 12:00 AM
            </span>
          </div>

          {loadingSlots ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-plum-primary"></div>
              <span className="ml-3 text-xs text-slate-500 font-semibold">Checking live availability...</span>
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-gold-bg border border-gold-primary/30 rounded-2xl p-6 text-center text-xs text-plum-deep space-y-1">
              <p className="font-bold">No slots available for this day.</p>
              <p className="text-slate-600">Please choose another day above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {slots.map((slot) => {
                const isSelected = selectedTime === slot.time;
                const isAvailable = slot.available;

                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-plum-deep text-white shadow-md ring-2 ring-teal-primary/50 transform scale-102'
                        : isAvailable
                        ? 'bg-white border border-plum-soft hover:border-teal-primary hover:bg-teal-bg/40 text-plum-deep'
                        : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed line-through opacity-50'
                    }`}
                  >
                    <span className="font-mono font-bold">{formatTime12h(slot.time)}</span>
                    <span className={`text-[9px] mt-0.5 font-medium ${isSelected ? 'text-teal-light' : isAvailable ? 'text-teal-dark' : 'text-slate-400'}`}>
                      {isAvailable ? (isSelected ? 'Selected' : 'Available') : 'Unavailable'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= 3. CUSTOMER DETAILS & CONFIRMATION ================= */}
        <div className="glass-card-plum rounded-3xl p-6 sm:p-8 border border-plum-soft shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-plum-soft/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 bg-plum-deep text-white rounded-full flex items-center justify-center text-xs font-black">
                3
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-plum-deep font-display">
                Customer Information
              </h2>
            </div>
            {currentUser ? (
              <span className="text-xs bg-plum-bg text-plum-deep px-3 py-1 rounded-full font-bold border border-plum-soft">
                👤 {currentUser.name}
              </span>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="text-xs text-teal-dark hover:underline font-bold cursor-pointer"
              >
                Already have an account? Log In
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Form Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-plum-deep uppercase tracking-wider mb-1">
                  Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={currentUser ? currentUser.name : customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={!!currentUser}
                    placeholder="Enter your full name"
                    className="w-full bg-white border border-plum-soft rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-plum-deep placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-primary disabled:bg-slate-100 disabled:text-slate-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-plum-deep uppercase tracking-wider mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    value={currentUser ? currentUser.phone : customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    disabled={!!currentUser}
                    placeholder="01200888841"
                    className="w-full bg-white border border-plum-soft rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold font-mono text-plum-deep placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-primary disabled:bg-slate-100 disabled:text-slate-700"
                    required
                  />
                </div>
              </div>

              {!currentUser && (
                <div>
                  <label className="block text-xs font-extrabold text-plum-deep uppercase tracking-wider mb-1">
                    Create Password <span className="text-slate-400 text-[10px] font-normal">(to view bookings later)</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-white border border-plum-soft rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-plum-deep placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-primary"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-plum-deep uppercase tracking-wider mb-1">
                  Special Notes <span className="text-slate-400 text-[10px] font-normal">(optional)</span>
                </label>
                <textarea
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="e.g. Any special instructions or grooming preferences..."
                  rows={2}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3.5 py-2.5 text-xs font-medium text-plum-deep placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-primary"
                />
              </div>
            </div>

            {/* Compact Summary & Confirm (Zero Prices) */}
            <div className="bg-plum-deep text-white rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl border border-plum-dark">
              <div className="flex items-center justify-between border-b border-plum-dark pb-3">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-teal-light font-display">
                  Booking Summary
                </h3>
                <span className="bg-plum-dark text-teal-light text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-teal-primary/30">
                  Instant Confirmation
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-plum-soft">Day:</span>
                  <span className="font-bold text-white">{formatDateDisplay(selectedDate) || '—'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-plum-soft">Time:</span>
                  <span className="font-bold text-teal-light font-mono">{formatTime12h(selectedTime) || '—'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-plum-soft">Customer:</span>
                  <span className="font-bold text-white">
                    {(currentUser ? currentUser.name : customerName) || '—'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-plum-soft">Phone:</span>
                  <span className="font-mono text-white">
                    {(currentUser ? currentUser.phone : customerPhone) || '—'}
                  </span>
                </div>

                <div className="border-t border-plum-dark pt-3 text-[11px] text-plum-soft bg-plum-dark/60 p-2.5 rounded-xl text-center">
                  ✨ Zero deposit required. Pay at the center after grooming.
                </div>
              </div>

              {errorMessage && (
                <div className="bg-rose-950/90 border border-rose-500/50 text-rose-200 p-3 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Confirm Booking Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-plum-primary via-plum-dark to-plum-deep hover:from-plum-light hover:to-plum-primary text-white font-black py-4 rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transform hover:-translate-y-0.5 border border-plum-soft/30"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Confirming Booking...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Booking</span>
                    <ArrowRight className="w-4 h-4 text-teal-light" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
