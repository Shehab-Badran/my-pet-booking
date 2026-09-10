import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Sparkles, User, Phone, CheckCircle2, ArrowRight, MapPin } from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config';

export default function MyBookings({ currentUser, onNavigate, onOpenAuth }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBookings = () => {
    const token = localStorage.getItem('mpc_token');
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API_BASE_URL}/bookings/my/all`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch bookings.');
        return res.json();
      })
      .then((data) => {
        setBookings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (currentUser) {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${minutes} ${ampm}`;
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center animate-fade-in">
        <div className="glass-card-plum rounded-3xl p-8 space-y-6 shadow-xl border border-plum-soft">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-plum-deep font-display">My Bookings</h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Please log in to view and track your grooming appointments.
            </p>
          </div>
          <button
            onClick={onOpenAuth}
            className="w-full bg-gradient-to-r from-plum-primary to-plum-deep hover:from-plum-dark hover:to-plum-deep text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer border border-plum-soft/20"
          >
            <User className="w-4 h-4 text-teal-light" />
            Log In to View Bookings
          </button>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingBookings = bookings.filter((b) => b.booking_date >= todayStr && b.status === 'confirmed');
  const pastBookings = bookings.filter((b) => b.booking_date < todayStr || b.status !== 'confirmed');

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-plum-soft/60 pb-4">
        <div>
          <h1 className="text-3xl font-black text-plum-deep tracking-tight font-display">My Bookings</h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
            Logged in as <span className="font-bold text-plum-deep">{currentUser.name}</span> ({currentUser.phone})
          </p>
        </div>
        <button
          onClick={() => onNavigate('book')}
          className="bg-gradient-to-r from-plum-primary to-plum-deep hover:from-plum-light hover:to-plum-primary text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-sm transition-all self-start sm:self-center cursor-pointer flex items-center gap-1.5 border border-plum-soft/20"
        >
          <span>+ Book Grooming</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-plum-primary"></div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="glass-card-plum rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto border border-plum-soft shadow-sm">
          <span className="text-5xl block">🐾</span>
          <h3 className="text-xl font-black text-plum-deep font-display">No Bookings Yet</h3>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            You don't have any appointments booked yet. Reserve a relaxing grooming session for your pet today!
          </p>
          <button
            onClick={() => onNavigate('book')}
            className="bg-gradient-to-r from-plum-primary to-plum-deep hover:from-plum-light hover:to-plum-primary text-white font-extrabold px-6 py-3 rounded-xl text-sm transition-all inline-flex items-center gap-2 cursor-pointer shadow-md border border-plum-soft/20"
          >
            <Calendar className="w-4 h-4 text-teal-light" />
            <span>Book Grooming Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-plum-deep flex items-center gap-2 font-display">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-primary"></span>
              Upcoming Appointments ({upcomingBookings.length})
            </h2>

            {upcomingBookings.length === 0 ? (
              <div className="bg-plum-bg border border-plum-soft rounded-2xl p-6 text-center text-slate-600 text-xs sm:text-sm">
                No active upcoming bookings.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingBookings.map((b) => (
                  <div
                    key={b.id}
                    className="glass-card-plum rounded-2xl p-6 border-l-4 border-l-teal-primary space-y-4 shadow-sm hover:shadow-md transition-shadow border border-plum-soft"
                  >
                    <div className="flex justify-between items-center border-b border-plum-soft/40 pb-3">
                      <span className="font-mono font-black text-sm text-plum-deep">
                        {b.booking_id}
                      </span>
                      <span className="bg-teal-veryLight text-teal-deep text-[10px] font-extrabold px-2.5 py-1 rounded-full capitalize border border-teal-light/40">
                        ● {b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Appointment Date</span>
                        <span className="font-bold text-plum-deep text-xs sm:text-sm">{b.booking_date}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[11px]">Time Slot</span>
                        <span className="font-extrabold text-teal-dark text-xs sm:text-sm font-mono">{formatTime12h(b.start_time)}</span>
                      </div>
                    </div>

                    {b.special_notes && (
                      <div className="bg-plum-bg p-2.5 rounded-lg text-xs text-slate-800 border border-plum-soft/60">
                        <span className="font-bold text-plum-deep font-display">Notes:</span> {b.special_notes}
                      </div>
                    )}

                    <div className="border-t border-plum-soft/40 pt-3 flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium font-arabic">📍 الشيخ زايد – Chill Out</span>
                      <span className="text-teal-dark font-bold">Pay at Center</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Section */}
          {pastBookings.length > 0 && (
            <div className="space-y-4 pt-4">
              <h2 className="text-base font-bold text-slate-700 flex items-center gap-2 font-display">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                Past Appointments ({pastBookings.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastBookings.map((b) => (
                  <div
                    key={b.id}
                    className="glass-card rounded-2xl p-5 opacity-90 hover:opacity-100 space-y-3 shadow-xs transition-opacity border border-plum-soft"
                  >
                    <div className="flex justify-between items-center border-b border-plum-soft/30 pb-2.5">
                      <span className="font-mono font-bold text-xs text-slate-700">{b.booking_id}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          b.status === 'completed'
                            ? 'bg-teal-veryLight text-teal-deep border border-teal-light/40'
                            : b.status === 'no-show'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        ● {b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Date</span>
                        <span className="font-medium text-slate-800">{b.booking_date}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Time</span>
                        <span className="font-medium text-slate-800 font-mono">{formatTime12h(b.start_time)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
