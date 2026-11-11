import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  MapPin,
  ExternalLink,
  Download,
  Navigation,
  MessageCircle,
  RotateCcw
} from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config';

// Compute YYYY-MM-DD in Africa/Cairo timezone
const getCairoDateString = (offsetDays = 0) => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const cairoTodayStr = formatter.format(now);
  const [year, month, day] = cairoTodayStr.split('-').map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day + offsetDays));
  const y = targetDate.getUTCFullYear();
  const m = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// 12-hour time formatter (e.g. 13:00:00 -> 1:00 PM, 23:00:00 -> 11:00 PM)
const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${minutes} ${ampm}`;
};

// Egyptian phone normalizer and validator
const normalizeEgyptianPhone = (str) => {
  if (!str) return '';
  const arabicToAscii = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  let cleaned = str.replace(/[٠-٩]/g, (d) => arabicToAscii[d] || d);
  cleaned = cleaned.replace(/\D/g, '');

  if (cleaned.startsWith('0020')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('20') && cleaned.length >= 11) {
    cleaned = cleaned.substring(2);
  }

  if (['10', '11', '12', '15'].some((p) => cleaned.startsWith(p)) && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
};

const isValidEgyptianPhone = (str) => {
  const norm = normalizeEgyptianPhone(str);
  return /^01[0125][0-9]{8}$/.test(norm);
};

export default function BookNow({ onNavigate, onBookingComplete }) {
  // Generate 5-day booking window in Africa/Cairo timezone
  const availableDates = (() => {
    const list = [];
    for (let i = 0; i < 5; i++) {
      const isoStr = getCairoDateString(i);
      const [y, m, dayNum] = isoStr.split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1, dayNum));
      const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      const isFriday = d.getUTCDay() === 5;
      list.push({ iso: isoStr, dayName, monthDay, isToday: i === 0, isFriday });
    }
    return list;
  })();

  const [selectedDate, setSelectedDate] = useState(() => getCairoDateString(0));
  const [selectedTime, setSelectedTime] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');

  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);

  const fetchSlots = useCallback(async (dateToFetch) => {
    if (!dateToFetch) return;
    setLoadingSlots(true);
    setSlotsError(false);
    setSelectedTime('');

    try {
      const res = await fetch(`${API_BASE_URL}/availability?booking_date=${dateToFetch}`);
      if (!res.ok) {
        throw new Error(`Failed to load time slots (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setSlots(data);
      } else {
        setSlots([]);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
      setSlots([]);
      setSlotsError(true);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // Fetch slots whenever selectedDate changes
  useEffect(() => {
    fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots]);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, dayNum] = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1, dayNum));
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setPhone(val);
    if (val.trim().length > 3) {
      if (!isValidEgyptianPhone(val)) {
        setPhoneError('Please enter a valid Egyptian mobile number (e.g. 01012345678 or +201012345678)');
      } else {
        setPhoneError('');
      }
    } else {
      setPhoneError('');
    }
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedDate) {
      setErrorMessage('Please choose an appointment date.');
      return;
    }

    if (!selectedTime) {
      setErrorMessage('Please select an available time slot.');
      return;
    }

    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const cleanPhone = normalizeEgyptianPhone(phone);
    if (!cleanPhone || !isValidEgyptianPhone(cleanPhone)) {
      setPhoneError('Please enter a valid Egyptian mobile number (e.g. 01012345678 or +201012345678)');
      setErrorMessage('Please provide a valid Egyptian mobile number.');
      return;
    }

    setSubmitting(true);

    try {
      const bookingPayload = {
        name: cleanName,
        phone: cleanPhone,
        booking_date: selectedDate,
        start_time: selectedTime,
        special_notes: specialNotes.trim() || null,
      };

      const bookingRes = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      });

      const bookingData = await bookingRes.json().catch(() => ({}));
      if (!bookingRes.ok) {
        let bErr = '';
        if (typeof bookingData.detail === 'string') {
          bErr = bookingData.detail;
        } else if (Array.isArray(bookingData.detail)) {
          bErr = bookingData.detail.map((d) => d.msg || 'Invalid field').join(', ');
        }

        const lowerDetail = bErr.toLowerCase();
        if (
          bookingRes.status === 409 ||
          lowerDetail.includes('no longer available') ||
          lowerDetail.includes('already booked') ||
          lowerDetail.includes('taken') ||
          lowerDetail.includes('capacity')
        ) {
          fetchSlots(selectedDate);
          throw new Error('This time was just booked. Please choose another available time.');
        }

        if (bookingRes.status >= 500) {
          throw new Error('Unable to confirm booking. Please try again.');
        }

        throw new Error(bErr || 'Unable to confirm booking. Please try again.');
      }

      setSubmitting(false);
      setConfirmedBookingData(bookingData);
      if (onBookingComplete) {
        onBookingComplete(bookingData);
      }
    } catch (err) {
      setSubmitting(false);
      setErrorMessage(err.message || 'Unable to confirm booking. Please try again.');
    }
  };

  // Add to Calendar (.ics download)
  const handleDownloadIcs = () => {
    if (!confirmedBookingData) return;
    const title = 'My Pet Center - Grooming Appointment';
    const description = `Grooming appointment for ${confirmedBookingData.customer_name}. Ref: ${confirmedBookingData.booking_id}.`;
    const location = 'My Pet Center, Sheikh Zayed – Gate 4, in front of New Cairo University – Chillout';

    const dateStr = confirmedBookingData.booking_date.replace(/-/g, '');
    const startParts = (confirmedBookingData.start_time || '12:00:00').split(':');
    const endParts = (confirmedBookingData.end_time || '13:00:00').split(':');

    const dtStart = `${dateStr}T${startParts[0].padStart(2, '0')}${startParts[1].padStart(2, '0')}00`;
    const dtEnd = `${dateStr}T${endParts[0].padStart(2, '0')}${endParts[1].padStart(2, '0')}00`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//My Pet Center//Grooming Booking//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MyPetCenter_${confirmedBookingData.booking_id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getGoogleCalendarUrl = () => {
    if (!confirmedBookingData) return '#';
    const title = encodeURIComponent('My Pet Center - Grooming Appointment');
    const details = encodeURIComponent(`Grooming appointment. Ref: ${confirmedBookingData.booking_id}`);
    const location = encodeURIComponent('My Pet Center, Sheikh Zayed – Gate 4, in front of New Cairo University – Chillout');
    const dateStr = confirmedBookingData.booking_date.replace(/-/g, '');
    const startParts = (confirmedBookingData.start_time || '12:00:00').split(':');
    const endParts = (confirmedBookingData.end_time || '13:00:00').split(':');
    const dtStart = `${dateStr}T${startParts[0].padStart(2, '0')}${startParts[1].padStart(2, '0')}00`;
    const dtEnd = `${dateStr}T${endParts[0].padStart(2, '0')}${endParts[1].padStart(2, '0')}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}&location=${location}`;
  };

  // Dedicated Post-Confirmation Screen (Compact Ticket Design)
  if (confirmedBookingData) {
    const bookingCustName = confirmedBookingData.customer_name || fullName;
    const whatsappUrl = `https://wa.me/201200888841?text=${encodeURIComponent(`Hello My Pet Center, I need to make changes to my booking ${confirmedBookingData.booking_id}`)}`;

    return (
      <div className="max-w-md mx-auto py-8 sm:py-12 px-4 space-y-6 animate-fade-in">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-plum-soft shadow-xl text-center space-y-5">
          <div className="flex justify-center">
            <Logo size="md" />
          </div>

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
              {confirmedBookingData.booking_id}
            </span>
          </div>

          {/* Appointment Details Box */}
          <div className="bg-plum-bg/30 border border-plum-soft/60 rounded-2xl p-4 text-left space-y-2.5 text-xs sm:text-sm">
            <div className="text-[11px] font-black uppercase tracking-wider text-plum-deep/80 border-b border-plum-soft/60 pb-1.5 font-display">
              Your Appointment
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Customer:</span>
              <span className="font-bold text-plum-deep">{bookingCustName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Date:</span>
              <span className="font-bold text-plum-deep">{formatDateDisplay(confirmedBookingData.booking_date)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Time:</span>
              <span className="font-extrabold text-teal-dark font-mono">{formatTime12h(confirmedBookingData.start_time)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Service:</span>
              <span className="font-bold text-plum-deep">Pet Grooming</span>
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
              onClick={() => {
                setConfirmedBookingData(null);
                setSelectedTime('');
                setSpecialNotes('');
              }}
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

  // --- 4-STEP GUEST BOOKING FLOW ---
  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-teal-veryLight text-teal-deep px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-teal-light/40">
          <Sparkles className="w-3.5 h-3.5 text-teal-primary" />
          Quick 30-Second Guest Booking
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-plum-deep tracking-tight font-display">
          Book Grooming Appointment
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
          Select your day and preferred 60-minute time slot. No advance deposit or account registration required.
        </p>

        {/* 50% OFF Badge */}
        <div className="pt-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-teal-deep to-teal-dark text-white font-black text-xs shadow-xs">
            ✨ 50% OFF Applied to All Sessions
          </span>
        </div>
      </div>

      <form onSubmit={handleConfirmBooking} className="space-y-6">
        {/* ================= STEP 1: CHOOSE DATE ================= */}
        <div className="glass-card-plum rounded-3xl p-6 sm:p-8 border border-plum-soft shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-plum-soft/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 bg-plum-deep text-white rounded-full flex items-center justify-center text-xs font-black">
                1
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-plum-deep font-display">
                Choose Date
              </h2>
            </div>
            <span className="text-xs text-teal-dark font-bold">5-Day Booking Window</span>
          </div>

          {/* 5-Day Horizontal Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {availableDates.map((item) => {
              const isSelected = selectedDate === item.iso;
              return (
                <button
                  key={item.iso}
                  type="button"
                  onClick={() => setSelectedDate(item.iso)}
                  className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${isSelected
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
                  {item.isFriday && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full mt-1 font-semibold ${isSelected ? 'text-teal-light' : 'text-slate-400'}`}>
                      Starts 3 PM
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= STEP 2: CHOOSE TIME ================= */}
        <div className="glass-card-plum rounded-3xl p-6 sm:p-8 border border-plum-soft shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-plum-soft/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 bg-plum-deep text-white rounded-full flex items-center justify-center text-xs font-black">
                2
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-plum-deep font-display">
                Choose Time
              </h2>
            </div>
          </div>

          {loadingSlots ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-plum-primary"></div>
              <span className="ml-3 text-xs text-slate-500 font-semibold">Checking live availability...</span>
            </div>
          ) : slotsError ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-xs text-rose-800 space-y-3">
              <p className="font-bold text-sm">Unable to load available times. Please try again.</p>
              <button
                type="button"
                onClick={() => fetchSlots(selectedDate)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : slots.length === 0 || slots.every((s) => !s.available) ? (
            <div className="bg-gold-bg border border-gold-primary/30 rounded-2xl p-6 text-center text-xs text-plum-deep space-y-1">
              <p className="font-bold text-sm">No appointments available for this day. Please choose another date.</p>
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
                    className={`py-3 px-2 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${isSelected
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

        {/* ================= STEP 3 & 4: CUSTOMER INFORMATION & CONFIRMATION ================= */}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left Column: Customer Input Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-plum-deep uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-dark" />
                  <span>Full Name</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-white border border-plum-soft rounded-xl px-4 py-3 text-sm font-semibold text-plum-deep placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-primary shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-plum-deep uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-dark" />
                  <span>Egyptian Mobile Number</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="Enter your mobile number"
                  className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-semibold font-mono text-plum-deep placeholder:text-slate-400 focus:outline-none focus:ring-2 shadow-xs ${phoneError ? 'border-rose-400 focus:ring-rose-400' : 'border-plum-soft focus:ring-teal-primary'
                    }`}
                />
                {phoneError && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">{phoneError}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold text-plum-deep uppercase tracking-wider mb-1.5">
                  Special Notes <span className="text-slate-400 text-[10px] font-normal">(optional)</span>
                </label>
                <textarea
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="Any notes for your pet (optional)"
                  rows={2}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3.5 py-2.5 text-xs font-medium text-plum-deep placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-primary shadow-xs"
                />
              </div>
            </div>

            {/* Right Column: Step 4 Compact Summary & Confirm */}
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
                  <span className="text-plum-soft">Session:</span>
                  <span className="font-bold text-white">Grooming Appointment (60 mins)</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-plum-soft">Date:</span>
                  <span className="font-bold text-white">{formatDateDisplay(selectedDate) || '—'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-plum-soft">Time:</span>
                  <span className="font-bold text-teal-light font-mono">{formatTime12h(selectedTime) || '—'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-plum-soft">Customer Name:</span>
                  <span className="font-bold text-white">
                    {fullName.trim() || '—'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-plum-soft">Phone Number:</span>
                  <span className="font-mono text-white">
                    {phone.trim() || '—'}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-rose-950/90 border border-rose-500/50 text-rose-200 p-3 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Button: Confirm Booking (Disabled while saving) */}
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
