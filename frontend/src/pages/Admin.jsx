import React, { useState, useEffect } from 'react';
import {
  Settings,
  Calendar,
  Clock,
  Scissors,
  ShowerHead,
  Search,
  Edit3,
  Check,
  RefreshCw,
  Lock,
  UserCheck,
  AlertCircle,
  FileText,
  X,
  Ban,
  Plus,
  LogOut,
  Sparkles,
  TrendingUp,
  Filter,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config';

export default function Admin({ adminUser, onAdminLogin, onAdminLogout, onBackToSite }) {
  // Admin Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin Dashboard State
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'bookings' | 'services' | 'settings'
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [settings, setSettings] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Filters for Bookings
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Rescheduling modal state
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [newRescheduleTime, setNewRescheduleTime] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Block Slot Modal state
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockDate, setBlockDate] = useState(new Date().toISOString().split('T')[0]);
  const [blockTime, setBlockTime] = useState('16:00:00');
  const [blockDuration, setBlockDuration] = useState(60);
  const [blockReason, setBlockReason] = useState('Staff Maintenance / Slot Block');
  const [blockLoading, setBlockLoading] = useState(false);

  // Service editing state
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editingServiceData, setEditingServiceData] = useState({});

  // Settings editing state
  const [editingSettings, setEditingSettings] = useState({});

  const getAdminToken = () => localStorage.getItem('mpc_token');

  // Handle Private Admin Login via dedicated /auth/admin-login
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    fetch(`${API_BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: loginEmail.trim(),
        password: loginPassword.trim(),
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Invalid admin credentials.');
        }
        return data;
      })
      .then((data) => {
        setLoginLoading(false);
        if (data.user?.role !== 'admin') {
          throw new Error('Access denied: Administrator permissions required.');
        }
        localStorage.setItem('mpc_token', data.access_token);
        onAdminLogin(data.user);
      })
      .catch((err) => {
        setLoginLoading(false);
        setLoginError(err.message);
      });
  };

  // Fetch Stats
  const fetchDashboardStats = () => {
    const token = getAdminToken();
    if (!token) return;

    fetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => setStats(data))
      .catch((err) => console.error(err));
  };

  // Fetch Bookings
  const fetchBookings = () => {
    const token = getAdminToken();
    if (!token) return;

    let url = `${API_BASE_URL}/admin/bookings?`;
    if (searchName) url += `customer_name=${encodeURIComponent(searchName)}&`;
    if (searchPhone) url += `phone=${encodeURIComponent(searchPhone)}&`;
    if (filterDate) url += `booking_date=${filterDate}&`;
    if (filterStatus) url += `status_filter=${filterStatus}&`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => setBookings(data))
      .catch((err) => console.error(err));
  };

  // Fetch Services & Settings
  const fetchServicesAndSettings = () => {
    const token = getAdminToken();
    if (!token) return;

    Promise.all([
      fetch(`${API_BASE_URL}/admin/services`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([servicesData, settingsData]) => {
        if (Array.isArray(servicesData)) setServices(servicesData);
        if (Array.isArray(settingsData)) {
          setSettings(settingsData);
          const map = {};
          settingsData.forEach((s) => (map[s.key] = s.value));
          setEditingSettings(map);
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (adminUser && adminUser.role === 'admin') {
      fetchDashboardStats();
      fetchBookings();
      fetchServicesAndSettings();
    }
  }, [adminUser]);

  // Status update
  const handleUpdateStatus = (bookingIdNum, newStatus) => {
    const token = getAdminToken();
    setActionError('');
    setActionSuccess('');

    fetch(`${API_BASE_URL}/admin/bookings/${bookingIdNum}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Status update failed.');
        return data;
      })
      .then(() => {
        setActionSuccess(`Booking status marked as ${newStatus}.`);
        fetchBookings();
        fetchDashboardStats();
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setActionError(err.message);
        setTimeout(() => setActionError(''), 4000);
      });
  };

  // Reschedule submit
  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    if (!reschedulingBooking || !newRescheduleDate || !newRescheduleTime) return;

    const token = getAdminToken();
    setRescheduleLoading(true);
    setActionError('');

    let timeFormatted = newRescheduleTime;
    if (timeFormatted.length === 5) timeFormatted += ':00';

    fetch(`${API_BASE_URL}/admin/bookings/${reschedulingBooking.id}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        booking_date: newRescheduleDate,
        start_time: timeFormatted,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Reschedule failed.');
        return data;
      })
      .then(() => {
        setRescheduleLoading(false);
        setReschedulingBooking(null);
        setActionSuccess(`Booking ${reschedulingBooking.booking_id} successfully rescheduled!`);
        fetchBookings();
        fetchDashboardStats();
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setRescheduleLoading(false);
        setActionError(err.message);
      });
  };

  // Block slot submit
  const handleBlockSlotSubmit = (e) => {
    e.preventDefault();
    const token = getAdminToken();
    setBlockLoading(true);
    setActionError('');

    let timeFormatted = blockTime;
    if (timeFormatted.length === 5) timeFormatted += ':00';

    fetch(`${API_BASE_URL}/admin/block-slot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        booking_date: blockDate,
        start_time: timeFormatted,
        duration: parseInt(blockDuration, 10),
        reason: blockReason,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to block slot.');
        return data;
      })
      .then((data) => {
        setBlockLoading(false);
        setBlockModalOpen(false);
        setActionSuccess(`Time slot blocked successfully (${data.booking_id})!`);
        fetchBookings();
        fetchDashboardStats();
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setBlockLoading(false);
        setActionError(err.message);
      });
  };

  // Save Service
  const handleSaveService = (serviceId) => {
    const token = getAdminToken();
    const payload = editingServiceData[serviceId];
    if (!payload) return;

    fetch(`${API_BASE_URL}/admin/services/${serviceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to update service.');
        return data;
      })
      .then(() => {
        setEditingServiceId(null);
        setActionSuccess('Service updated successfully.');
        fetchServicesAndSettings();
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setActionError(err.message);
        setTimeout(() => setActionError(''), 4000);
      });
  };

  // Save Setting
  const handleSaveSetting = (key, val) => {
    const token = getAdminToken();
    fetch(`${API_BASE_URL}/admin/settings/${key}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value: val }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to update setting.');
        return data;
      })
      .then(() => {
        setActionSuccess(`Setting '${key}' updated to ${val}.`);
        fetchServicesAndSettings();
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setActionError(err.message);
        setTimeout(() => setActionError(''), 4000);
      });
  };

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${minutes} ${ampm}`;
  };

  // ==========================================
  // VIEW 1: PRIVATE ADMIN LOGIN (UNAUTHENTICATED)
  // ==========================================
  if (!adminUser || adminUser.role !== 'admin') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="glass-card-plum rounded-3xl p-8 sm:p-10 max-w-md w-full border border-plum-soft shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <Logo size="md" />
            </div>
            <div className="inline-flex items-center gap-1.5 bg-plum-deep text-white px-3 py-1 rounded-full text-xs font-bold">
              <Lock className="w-3.5 h-3.5 text-gold-primary" />
              Restricted Staff Portal
            </div>
            <h1 className="text-2xl font-black text-plum-deep tracking-tight font-display">
              My Pet Center Admin
            </h1>
            <p className="text-xs text-slate-600">
              Sign in with administrator credentials to manage appointments & settings.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-plum-deep uppercase tracking-wider mb-1">
                Email / Staff ID
              </label>
              <input
                type="text"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@mypetcenter.com"
                className="w-full bg-white border border-plum-soft rounded-xl px-4 py-3 text-sm font-semibold text-plum-deep placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-plum-deep uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-plum-soft rounded-xl px-4 py-3 text-sm font-semibold text-plum-deep placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-primary"
                required
              />
            </div>

            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-plum-primary to-plum-deep hover:from-plum-dark hover:to-plum-deep text-white font-extrabold py-3.5 rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-plum-soft/20"
            >
              {loginLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-gold-primary" />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-[11px] text-slate-500">
              Only authorized staff accounts can access this panel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: FULL ADMIN DASHBOARD (AUTHENTICATED)
  // ==========================================
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((b) => b.booking_date === todayStr);

  return (
    <div className="min-h-screen bg-[#FAF8FC] text-plum-deep font-sans pb-16">
      {/* Top Private Admin Navbar */}
      <header className="bg-plum-deep text-white sticky top-0 z-40 border-b border-plum-dark shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Admin Brand */}
            <div className="flex items-center gap-3">
              <Logo size="sm" variant="light" />
              <div className="border-l border-plum-dark pl-3">
                <span className="text-sm font-black tracking-tight text-white block font-display">
                  My Pet Center — Admin
                </span>
                <span className="text-[10px] text-teal-light font-bold uppercase tracking-wider block">
                  Staff Control Panel
                </span>
              </div>
            </div>

            {/* Admin User Info & Actions */}
            <div className="flex items-center gap-3">
              <span className="text-xs bg-plum-dark border border-plum-soft/30 text-plum-soft px-3 py-1.5 rounded-xl font-mono hidden sm:inline-block">
                👤 {adminUser.email || adminUser.name}
              </span>

              <button
                onClick={onAdminLogout}
                className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Log Out of Admin Panel"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Admin Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-plum-soft shadow-xs">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-plum-deep text-white shadow-sm font-display'
                  : 'text-slate-600 hover:bg-plum-bg'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-teal-primary" />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'bookings'
                  ? 'bg-plum-deep text-white shadow-sm font-display'
                  : 'text-slate-600 hover:bg-plum-bg'
              }`}
            >
              <Calendar className="w-4 h-4 text-gold-primary" />
              Bookings ({bookings.length})
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'services'
                  ? 'bg-plum-deep text-white shadow-sm font-display'
                  : 'text-slate-600 hover:bg-plum-bg'
              }`}
            >
              <Scissors className="w-4 h-4 text-teal-light" />
              Services ({services.length})
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-plum-deep text-white shadow-sm font-display'
                  : 'text-slate-600 hover:bg-plum-bg'
              }`}
            >
              <Settings className="w-4 h-4 text-teal-dark" />
              Schedule Settings
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBlockModalOpen(true)}
              className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              Block Time Slot
            </button>
            <button
              onClick={() => {
                fetchDashboardStats();
                fetchBookings();
                fetchServicesAndSettings();
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-xl transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Alerts */}
        {actionSuccess && (
          <div className="bg-teal-veryLight border border-teal-light text-teal-deep p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <CheckCircle className="w-4 h-4 text-teal-primary" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="bg-rose-50 border border-rose-300 text-rose-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 1: DASHBOARD METRICS */}
        {/* ========================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-plum-soft shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Bookings</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-plum-deep font-display">{stats?.today_count ?? todayBookings.length}</span>
                  <span className="text-xs font-bold text-teal-deep bg-teal-veryLight border border-teal-light/40 px-2 py-0.5 rounded-md">Live</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-plum-soft shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Bookings</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-plum-deep font-display">{stats?.upcoming_count ?? 0}</span>
                  <span className="text-xs font-bold text-plum-deep bg-gold-bg border border-gold-primary/30 px-2 py-0.5 rounded-md">Next 7 Days</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-plum-soft shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Capacity</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-plum-deep font-display">{stats?.capacity_percentage ?? 0}%</span>
                  <span className="text-xs font-bold text-slate-600 bg-plum-bg px-2 py-0.5 rounded-md">Max {editingSettings.max_simultaneous_bookings || '1'} / Slot</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-plum-soft shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active Services</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-plum-deep font-display">{services.filter((s) => s.active).length}</span>
                  <span className="text-xs font-bold text-teal-deep bg-teal-bg border border-teal-veryLight px-2 py-0.5 rounded-md">Grooming</span>
                </div>
              </div>
            </div>

            {/* Today's Schedule Overview */}
            <div className="bg-white rounded-3xl p-6 border border-plum-soft shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-plum-soft/40 pb-4">
                <div>
                  <h3 className="font-extrabold text-base text-plum-deep font-display">Today's Schedule</h3>
                  <p className="text-xs text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className="text-xs font-bold text-teal-dark hover:underline cursor-pointer"
                >
                  View All Bookings &rarr;
                </button>
              </div>

              {todayBookings.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-medium">
                  No appointments booked for today yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {todayBookings.map((b) => (
                    <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-plum-bg rounded-2xl border border-plum-soft gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black font-mono bg-white px-2.5 py-1 rounded-lg border border-plum-soft text-plum-deep">
                          {formatTime12h(b.start_time)}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-plum-deep">{b.user?.name}</span>
                            <span className="text-[10px] text-slate-600 font-mono">({b.user?.phone})</span>
                          </div>
                          <span className="text-xs text-slate-700">
                            {b.pet?.type === 'dog' ? '🐶 Dog' : '🐱 Cat'} • {b.service?.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          b.status === 'completed'
                            ? 'bg-teal-veryLight text-teal-deep border border-teal-light/40'
                            : b.status === 'no-show'
                            ? 'bg-rose-100 text-rose-800'
                            : b.status === 'blocked'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-gold-bg text-plum-deep border border-gold-primary/30'
                        }`}>
                          {b.status}
                        </span>

                        {b.status === 'confirmed' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpdateStatus(b.id, 'completed')}
                              className="bg-teal-primary hover:bg-teal-dark text-plum-deep font-bold text-[11px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(b.id, 'no-show')}
                              className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[11px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              No-Show
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: BOOKINGS MANAGEMENT */}
        {/* ========================================== */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-white p-5 rounded-3xl border border-plum-soft shadow-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-plum-deep uppercase mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Search name..."
                    className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold text-plum-deep placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-plum-deep uppercase mb-1">Phone</label>
                  <input
                    type="text"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    placeholder="Search phone..."
                    className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold text-plum-deep placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-plum-deep uppercase mb-1">Filter Date</label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-plum-deep uppercase mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  >
                    <option value="">All Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="no-show">No-Show</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setSearchName('');
                    setSearchPhone('');
                    setFilterDate('');
                    setFilterStatus('');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-plum-deep px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Clear Filters
                </button>
                <button
                  onClick={fetchBookings}
                  className="bg-plum-deep text-white font-bold text-xs px-4 py-1.5 rounded-xl hover:bg-plum-dark transition-colors cursor-pointer border border-plum-soft/20"
                >
                  Apply Filters
                </button>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-3xl border border-plum-soft shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-plum-bg border-b border-plum-soft text-plum-deep uppercase font-extrabold tracking-wider text-[10px] font-display">
                    <tr>
                      <th className="px-5 py-4">Booking ID</th>
                      <th className="px-5 py-4">Date & Time</th>
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Pet & Package</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-plum-soft/40 font-medium text-slate-800">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-plum-bg/40 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-plum-deep">
                          {b.booking_id}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-plum-deep">{b.booking_date}</div>
                          <span className="text-slate-600 font-mono">{formatTime12h(b.start_time)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-plum-deep">{b.user?.name}</div>
                          <span className="text-slate-600 font-mono text-[11px]">{b.user?.phone}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold capitalize text-plum-deep">
                            {b.pet?.type === 'dog' ? '🐶 Dog' : '🐱 Cat'} {b.pet?.breed ? `(${b.pet.breed})` : ''}
                          </div>
                          <span className="text-slate-600">{b.service?.name}</span>
                          {b.special_notes && (
                            <div className="text-[10px] text-plum-deep bg-gold-bg border border-gold-primary/30 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                              📝 {b.special_notes}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            b.status === 'completed'
                              ? 'bg-teal-veryLight text-teal-deep border border-teal-light/40'
                              : b.status === 'no-show'
                              ? 'bg-rose-100 text-rose-800'
                              : b.status === 'blocked'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-gold-bg text-plum-deep border border-gold-primary/30'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                          {b.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => {
                                  setReschedulingBooking(b);
                                  setNewRescheduleDate(b.booking_date);
                                  setNewRescheduleTime(b.start_time);
                                }}
                                className="bg-plum-bg hover:bg-plum-soft/40 text-plum-deep font-bold px-2.5 py-1 rounded-md text-[11px] transition-colors cursor-pointer border border-plum-soft"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(b.id, 'completed')}
                                className="bg-teal-primary hover:bg-teal-dark text-plum-deep font-bold px-2.5 py-1 rounded-md text-[11px] transition-colors cursor-pointer"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(b.id, 'no-show')}
                                className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold px-2.5 py-1 rounded-md text-[11px] transition-colors cursor-pointer"
                              >
                                No-Show
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: SERVICES MANAGEMENT */}
        {/* ========================================== */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-3xl p-6 border border-plum-soft shadow-xs space-y-6">
            <div className="border-b border-plum-soft/40 pb-4">
              <h3 className="font-extrabold text-base text-plum-deep font-display">Grooming Services & Duration Catalog</h3>
              <p className="text-xs text-slate-500">Configure treatment durations and active catalog items.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((s) => {
                const isEditing = editingServiceId === s.id;
                const draft = editingServiceData[s.id] || s;

                return (
                  <div key={s.id} className="p-5 rounded-2xl border border-plum-soft bg-plum-bg/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-plum-deep capitalize font-display">
                        {s.pet_type === 'dog' ? '🐶' : '🐱'} {s.name} ({s.pet_size})
                      </span>
                      <span className="text-[10px] font-black bg-teal-veryLight text-teal-deep border border-teal-light/40 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 pt-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600">Duration (mins)</label>
                          <input
                            type="number"
                            value={draft.duration}
                            onChange={(e) =>
                              setEditingServiceData({
                                ...editingServiceData,
                                [s.id]: { ...draft, duration: parseInt(e.target.value, 10) },
                              })
                            }
                            className="w-full bg-white border border-plum-soft rounded-lg p-1.5 text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary"
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleSaveService(s.id)}
                            className="flex-1 bg-teal-primary hover:bg-teal-dark text-plum-deep font-bold py-1.5 rounded-lg text-xs cursor-pointer shadow-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingServiceId(null)}
                            className="bg-plum-bg hover:bg-plum-soft/40 text-plum-deep font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer border border-plum-soft"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs pt-1">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Service Duration:</span>
                          <span className="font-bold text-plum-deep">{s.duration} mins</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Type:</span>
                          <span className="font-bold text-teal-dark capitalize">{s.pet_type} ({s.pet_size})</span>
                        </div>

                        <button
                          onClick={() => {
                            setEditingServiceId(s.id);
                            setEditingServiceData({ ...editingServiceData, [s.id]: { ...s } });
                          }}
                          className="w-full bg-white hover:bg-plum-bg border border-plum-soft text-plum-deep font-bold py-1.5 rounded-lg text-xs mt-2 transition-colors cursor-pointer"
                        >
                          Edit Duration
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 4: SCHEDULE SETTINGS */}
        {/* ========================================== */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 border border-plum-soft shadow-xs space-y-6">
            <div className="border-b border-plum-soft/40 pb-4">
              <h3 className="font-extrabold text-base text-plum-deep font-display">Schedule & Internal Capacity Settings</h3>
              <p className="text-xs text-slate-500">Controls operating hours, booking window, and simultaneous booking limits.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Working Hours */}
              <div className="p-5 bg-plum-bg/40 rounded-2xl border border-plum-soft space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-plum-deep font-display">Opening Time</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingSettings.opening_time || '15:00:00'}
                    onChange={(e) => setEditingSettings({ ...editingSettings, opening_time: e.target.value })}
                    className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-mono font-bold text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  />
                  <button
                    onClick={() => handleSaveSetting('opening_time', editingSettings.opening_time)}
                    className="bg-plum-deep hover:bg-plum-dark text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Save
                  </button>
                </div>
                <span className="text-[10px] text-slate-500">Default: 15:00:00 (3:00 PM)</span>
              </div>

              <div className="p-5 bg-plum-bg/40 rounded-2xl border border-plum-soft space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-plum-deep font-display">Closing Time</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingSettings.closing_time || '00:00:00'}
                    onChange={(e) => setEditingSettings({ ...editingSettings, closing_time: e.target.value })}
                    className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-mono font-bold text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  />
                  <button
                    onClick={() => handleSaveSetting('closing_time', editingSettings.closing_time)}
                    className="bg-plum-deep hover:bg-plum-dark text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Save
                  </button>
                </div>
                <span className="text-[10px] text-slate-500">Default: 00:00:00 (12:00 AM midnight)</span>
              </div>

              {/* Internal Capacity */}
              <div className="p-5 bg-plum-bg/40 rounded-2xl border border-plum-soft space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-plum-deep font-display">Max Simultaneous Bookings (Internal Capacity)</h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={editingSettings.max_simultaneous_bookings || '1'}
                    onChange={(e) => setEditingSettings({ ...editingSettings, max_simultaneous_bookings: e.target.value })}
                    className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-mono font-bold text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  />
                  <button
                    onClick={() => handleSaveSetting('max_simultaneous_bookings', editingSettings.max_simultaneous_bookings)}
                    className="bg-plum-deep hover:bg-plum-dark text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Save
                  </button>
                </div>
                <span className="text-[10px] text-slate-500">Default: 1 simultaneous appointment. (Never shown to customers).</span>
              </div>

              {/* Slot Interval (Minutes) */}
              <div className="p-5 bg-plum-bg/40 rounded-2xl border border-plum-soft space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-plum-deep font-display">Booking Slot Interval (Minutes)</h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={editingSettings.slot_interval_minutes || '60'}
                    onChange={(e) => setEditingSettings({ ...editingSettings, slot_interval_minutes: e.target.value })}
                    className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-mono font-bold text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  />
                  <button
                    onClick={() => handleSaveSetting('slot_interval_minutes', editingSettings.slot_interval_minutes)}
                    className="bg-plum-deep hover:bg-plum-dark text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Save
                  </button>
                </div>
                <span className="text-[10px] text-slate-500">Default: 60 minutes. Whole-hour slots only (3 PM, 4 PM, etc.).</span>
              </div>

              {/* Booking Window */}
              <div className="p-5 bg-plum-bg/40 rounded-2xl border border-plum-soft space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-plum-deep font-display">Booking Window Ahead (Days)</h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={editingSettings.max_booking_days_ahead || '7'}
                    onChange={(e) => setEditingSettings({ ...editingSettings, max_booking_days_ahead: e.target.value })}
                    className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-mono font-bold text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  />
                  <button
                    onClick={() => handleSaveSetting('max_booking_days_ahead', editingSettings.max_booking_days_ahead)}
                    className="bg-plum-deep hover:bg-plum-dark text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Save
                  </button>
                </div>
                <span className="text-[10px] text-slate-500">Default: 7 days ahead (Today + next 6 days).</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL: RESCHEDULE BOOKING */}
      {/* ========================================== */}
      {reschedulingBooking && (
        <div className="fixed inset-0 bg-plum-deep/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-plum-soft relative animate-fade-in">
            <button
              onClick={() => setReschedulingBooking(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-plum-deep cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-plum-deep font-display">
                Reschedule Booking
              </h3>
              <p className="text-xs text-slate-600">
                {reschedulingBooking.booking_id} — {reschedulingBooking.user?.name}
              </p>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase mb-1">New Date</label>
                <input
                  type="date"
                  value={newRescheduleDate}
                  onChange={(e) => setNewRescheduleDate(e.target.value)}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-sm font-semibold text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase mb-1">New Time (3:00 PM – 12:00 AM)</label>
                <input
                  type="time"
                  value={newRescheduleTime.slice(0, 5)}
                  onChange={(e) => setNewRescheduleTime(e.target.value)}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-sm font-semibold font-mono text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={rescheduleLoading}
                  className="flex-1 bg-gradient-to-r from-plum-primary to-plum-deep hover:from-plum-dark hover:to-plum-deep text-white font-extrabold py-3 rounded-xl text-xs cursor-pointer disabled:opacity-50 border border-plum-soft/20"
                >
                  {rescheduleLoading ? 'Updating Schedule...' : 'Confirm Reschedule'}
                </button>
                <button
                  type="button"
                  onClick={() => setReschedulingBooking(null)}
                  className="bg-plum-bg hover:bg-plum-soft/40 text-plum-deep font-bold px-4 py-3 rounded-xl text-xs cursor-pointer border border-plum-soft"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: BLOCK TIME SLOT */}
      {/* ========================================== */}
      {blockModalOpen && (
        <div className="fixed inset-0 bg-plum-deep/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-plum-soft relative animate-fade-in">
            <button
              onClick={() => setBlockModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-plum-deep cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-plum-deep flex items-center gap-2 font-display">
                <Ban className="w-5 h-5 text-rose-600" />
                Block Time Slot
              </h3>
              <p className="text-xs text-slate-600">
                Prevent customer bookings during staff sanitization, breaks, or maintenance.
              </p>
            </div>

            <form onSubmit={handleBlockSlotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase mb-1">Date</label>
                <input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-sm font-semibold text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase mb-1">Start Time</label>
                <input
                  type="time"
                  value={blockTime.slice(0, 5)}
                  onChange={(e) => setBlockTime(e.target.value)}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-sm font-semibold font-mono text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase mb-1">Duration (minutes)</label>
                <select
                  value={blockDuration}
                  onChange={(e) => setBlockDuration(e.target.value)}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-sm font-semibold text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary"
                >
                  <option value={30}>30 mins</option>
                  <option value={60}>60 mins (1 hr)</option>
                  <option value={90}>90 mins (1.5 hrs)</option>
                  <option value={120}>120 mins (2 hrs)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Center deep clean, staff training..."
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs text-plum-deep placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={blockLoading}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 rounded-xl text-xs cursor-pointer disabled:opacity-50"
                >
                  {blockLoading ? 'Blocking Slot...' : 'Block Slot Now'}
                </button>
                <button
                  type="button"
                  onClick={() => setBlockModalOpen(false)}
                  className="bg-plum-bg hover:bg-plum-soft/40 text-plum-deep font-bold px-4 py-3 rounded-xl text-xs cursor-pointer border border-plum-soft"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
