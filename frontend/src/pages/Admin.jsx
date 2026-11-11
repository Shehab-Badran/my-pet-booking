import React, { useState, useEffect } from 'react';
import {
  Settings,
  Calendar,
  Clock,
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
  AlertTriangle,
  Download,
  Phone,
  User,
  History,
  MessageCircle,
  Eye,
  Shield,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  DollarSign,
  Award,
  Send,
  Users,
  Gift,
  EyeOff,
  Trash2
} from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config';

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
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Admin({ adminUser, onAdminLogin, onAdminLogout, onBackToSite }) {
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Tabs: 'today' | 'bookings' | 'customers' | 'management'
  const [activeTab, setActiveTab] = useState('today');
  const [bookingsViewMode, setBookingsViewMode] = useState('list'); // 'list' | 'calendar'
  const [managementSubTab, setManagementSubTab] = useState('reports'); // 'reports' | 'schedule' | 'loyalty' | 'notifications'
  const [detailsModalBooking, setDetailsModalBooking] = useState(null);
  const [bookingSearch, setBookingSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [adminCustomers, setAdminCustomers] = useState([]);
  const [adminCustomersLoading, setAdminCustomersLoading] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [settings, setSettings] = useState([]);
  const [fridayConflicts, setFridayConflicts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Filters for Bookings
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');

  // Calendar View State: 'daily' | 'weekly'
  const [calendarMode, setCalendarMode] = useState('daily');
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Modals State: Manual Booking
  const [manualBookingModalOpen, setManualBookingModalOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState('12:00:00');
  const [manualSource, setManualSource] = useState('phone');
  const [manualNotes, setManualNotes] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Modal State: Invoice Entry / Completion
  const [invoiceModalBooking, setInvoiceModalBooking] = useState(null);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoicePaymentStatus, setInvoicePaymentStatus] = useState('paid');
  const [invoicePaymentDate, setInvoicePaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Modal State: Cancellation
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('Customer cancelled by phone');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Modal State: No-Show
  const [noShowModalBooking, setNoShowModalBooking] = useState(null);
  const [noShowReason, setNoShowReason] = useState('Customer failed to attend (No-show)');
  const [noShowLoading, setNoShowLoading] = useState(false);

  // Edit Details Modal State
  const [editDetailsBooking, setEditDetailsBooking] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDetailsLoading, setEditDetailsLoading] = useState(false);

  // Reschedule Modal State
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Audit Log Modal State
  const [auditModalBooking, setAuditModalBooking] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Customer History & Loyalty State
  const [historyCustomerPhone, setHistoryCustomerPhone] = useState('');
  const [customerHistory, setCustomerHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [redeemCustomerPhone, setRedeemCustomerPhone] = useState('');
  const [redeemNotes, setRedeemNotes] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);

  // Revenue Report State
  const now = new Date();
  const [revenueReport, setRevenueReport] = useState(null);
  const [revenueReportYear, setRevenueReportYear] = useState(now.getFullYear());
  const [revenueReportMonth, setRevenueReportMonth] = useState(now.getMonth() + 1);
  const [revenueReportLoading, setRevenueReportLoading] = useState(false);

  // Telegram Notification Test State
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [showTelegramToken, setShowTelegramToken] = useState(false);

  // Special Dates & Holiday Schedule State
  const [specialDates, setSpecialDates] = useState({});
  const [newSpecialDate, setNewSpecialDate] = useState('');
  const [newSpecialClosed, setNewSpecialClosed] = useState(true);
  const [newSpecialOpening, setNewSpecialOpening] = useState('12:00');
  const [newSpecialClosing, setNewSpecialClosing] = useState('23:00');
  const [newSpecialReason, setNewSpecialReason] = useState('');

  // Block Slot Modal State
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockDate, setBlockDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [blockTime, setBlockTime] = useState('16:00:00');
  const [blockDuration, setBlockDuration] = useState(60);
  const [blockReason, setBlockReason] = useState('Staff Maintenance / Slot Block');
  const [blockLoading, setBlockLoading] = useState(false);

  // Settings State
  const [editingSettings, setEditingSettings] = useState({});
  const [savingSettings, setSavingSettings] = useState({});
  const [savedSettings, setSavedSettings] = useState({});
  const [errorSettings, setErrorSettings] = useState({});

  const getAdminToken = () => localStorage.getItem('mpc_token');

  // Handle Login
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
        if (!res.ok) throw new Error(data.detail || 'Invalid admin credentials.');
        return data;
      })
      .then((data) => {
        setLoginLoading(false);
        if (data.user?.role !== 'admin' && data.user?.role !== 'manager' && data.user?.role !== 'staff') {
          throw new Error('Access denied: Staff or Administrator permissions required.');
        }
        localStorage.setItem('mpc_token', data.access_token);
        onAdminLogin(data.user);
      })
      .catch((err) => {
        setLoginLoading(false);
        setLoginError(err.message);
      });
  };

  // Fetch Dashboard Stats
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
      .then((data) => {
        setStats(data);
        if (data.friday_conflicts) {
          setFridayConflicts(data.friday_conflicts);
        }
      })
      .catch((err) => console.error(err));
  };

  // Fetch Bookings with Filters
  const fetchBookings = () => {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);

    let url = `${API_BASE_URL}/admin/bookings?`;
    if (searchName) url += `customer_name=${encodeURIComponent(searchName)}&`;
    if (searchPhone) url += `phone=${encodeURIComponent(searchPhone)}&`;
    if (filterDate) url += `booking_date=${filterDate}&`;
    if (filterStartDate) url += `start_date=${filterStartDate}&`;
    if (filterEndDate) url += `end_date=${filterEndDate}&`;
    if (filterStatus) url += `status_filter=${filterStatus}&`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => {
        setBookings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  // Fetch Settings
  const fetchSettings = () => {
    const token = getAdminToken();
    if (!token) return;

    fetch(`${API_BASE_URL}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSettings(data);
          const map = {};
          data.forEach((s) => (map[s.key] = s.value));
          setEditingSettings(map);
          if (map['special_dates_schedule']) {
            try {
              const parsed = JSON.parse(map['special_dates_schedule']);
              if (parsed && typeof parsed === 'object') {
                setSpecialDates(parsed);
              }
            } catch (e) {
              setSpecialDates({});
            }
          }
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (adminUser) {
      fetchDashboardStats();
      fetchBookings();
      fetchSettings();
      fetchAdminCustomers();
    }
  }, [adminUser]);

  // Fetch Customers Summary from backend
  const fetchAdminCustomers = (search = '') => {
    const token = getAdminToken();
    if (!token) return;
    setAdminCustomersLoading(true);
    let url = `${API_BASE_URL}/admin/customers`;
    if (search && search.trim()) {
      url += `?search=${encodeURIComponent(search.trim())}`;
    }
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load customers');
        return res.json();
      })
      .then((data) => {
        setAdminCustomers(Array.isArray(data) ? data : []);
        setAdminCustomersLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setAdminCustomersLoading(false);
      });
  };

  // Grouped Settings Batch Save
  const handleBatchSaveSettings = (settingsMap, successMsg = 'Settings saved successfully.') => {
    const token = getAdminToken();
    if (!token) return;
    setBatchSaving(true);
    setActionError('');
    setActionSuccess('');

    fetch(`${API_BASE_URL}/admin/settings-batch`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settingsMap),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to save settings.');
        return data;
      })
      .then(() => {
        setBatchSaving(false);
        setActionSuccess(successMsg);
        fetchSettings();
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setBatchSaving(false);
        setActionError(err.message || 'Failed to save settings.');
        setTimeout(() => setActionError(''), 5000);
      });
  };

  const isFutureBooking = (b) => {
    if (!b || !b.booking_date || !b.start_time) return false;
    const [h, m] = (b.start_time || '00:00:00').split(':');
    const bDt = new Date(`${b.booking_date}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`);
    return bDt > new Date();
  };

  // Execute Search
  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    fetchBookings();
  };

  const handleClearFilters = () => {
    setSearchName('');
    setSearchPhone('');
    setBookingSearch('');
    setFilterDate('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterStatus('');
    setFilterSource('');
    setTimeout(() => {
      const token = getAdminToken();
      fetch(`${API_BASE_URL}/admin/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => setBookings(data));
    }, 50);
  };

  // Revenue Report Fetch
  const fetchRevenueReport = (year = revenueReportYear, month = revenueReportMonth) => {
    const token = getAdminToken();
    if (!token) return;
    setRevenueReportLoading(true);

    fetch(`${API_BASE_URL}/admin/reports/revenue?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load revenue report.');
        return res.json();
      })
      .then((data) => {
        setRevenueReport(data);
        setRevenueReportLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setRevenueReportLoading(false);
      });
  };

  // Status Action: Open Invoice Modal to mark completed or update invoice
  const handleOpenInvoiceModal = (b) => {
    if (b.status !== 'completed' && isFutureBooking(b)) {
      setActionError(`Cannot mark appointment as completed before its scheduled start time (${formatTime12h(b.start_time)} on ${formatDateDisplay(b.booking_date)}).`);
      setTimeout(() => setActionError(''), 6000);
      return;
    }
    setInvoiceModalBooking(b);
    setInvoiceAmount(b.final_invoice_amount !== null && b.final_invoice_amount !== undefined ? b.final_invoice_amount : (b.price || ''));
    setInvoicePaymentStatus(b.payment_status || 'paid');
    setInvoicePaymentDate(b.payment_date || new Date().toISOString().split('T')[0]);
    setInvoiceNotes(b.invoice_notes || '');
  };

  const handleSaveInvoice = (e) => {
    e.preventDefault();
    if (!invoiceModalBooking) return;
    const token = getAdminToken();
    setInvoiceLoading(true);
    setActionError('');

    const parsedAmount = parseFloat(invoiceAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setInvoiceLoading(false);
      setActionError('Please enter a valid invoice amount in EGP.');
      return;
    }

    const payload = {
      status: 'completed',
      final_invoice_amount: parsedAmount,
      payment_status: invoicePaymentStatus,
      payment_date: invoicePaymentDate,
      invoice_notes: invoiceNotes.trim() || null,
    };

    fetch(`${API_BASE_URL}/admin/bookings/${invoiceModalBooking.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to record invoice.');
        return data;
      })
      .then((data) => {
        setInvoiceLoading(false);
        setInvoiceModalBooking(null);
        setActionSuccess(`Invoice of ${parsedAmount} EGP recorded for ${data.booking_id}. Marked as Completed.`);
        fetchBookings();
        fetchDashboardStats();
        if (activeTab === 'reports') fetchRevenueReport(revenueReportYear, revenueReportMonth);
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setInvoiceLoading(false);
        setActionError(err.message);
      });
  };

  // Status Action: Open Cancellation Modal
  const handleOpenCancelModal = (b) => {
    setCancelModalBooking(b);
    setCancelReason('Customer cancelled by phone');
  };

  const handleConfirmCancel = (e) => {
    e.preventDefault();
    if (!cancelModalBooking) return;
    const token = getAdminToken();
    setCancelLoading(true);
    setActionError('');

    fetch(`${API_BASE_URL}/admin/bookings/${cancelModalBooking.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: 'cancelled',
        reason: cancelReason.trim() || 'Customer requested cancellation',
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to cancel appointment.');
        return data;
      })
      .then((data) => {
        setCancelLoading(false);
        setCancelModalBooking(null);
        setActionSuccess(`Booking ${data.booking_id} marked as Cancelled. Time slot released.`);
        fetchBookings();
        fetchDashboardStats();
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setCancelLoading(false);
        setActionError(err.message);
      });
  };

  // Status Action: Open No-Show Modal
  const handleOpenNoShowModal = (booking) => {
    setNoShowModalBooking(booking);
    setNoShowReason('Customer failed to attend (No-show)');
  };

  const handleConfirmNoShow = (e) => {
    e.preventDefault();
    if (!noShowModalBooking) return;
    const token = getAdminToken();
    setNoShowLoading(true);
    setActionError('');

    fetch(`${API_BASE_URL}/admin/bookings/${noShowModalBooking.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: 'no-show',
        reason: noShowReason.trim() || 'No-show / Failed to attend',
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to update status.');
        return data;
      })
      .then((data) => {
        setNoShowLoading(false);
        setNoShowModalBooking(null);
        setActionSuccess(`Booking ${data.booking_id} marked as No-show. Slot released.`);
        fetchBookings();
        fetchDashboardStats();
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setNoShowLoading(false);
        setActionError(err.message);
      });
  };

  // Status Action: Restore from Cancelled or No-Show to Confirmed
  const handleRestoreBooking = (bookingId) => {
    const token = getAdminToken();
    setActionError('');

    fetch(`${API_BASE_URL}/admin/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'confirmed' }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to restore booking.');
        return data;
      })
      .then((data) => {
        setActionSuccess(`Booking ${data.booking_id} successfully restored to Confirmed.`);
        fetchBookings();
        fetchDashboardStats();
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setActionError(err.message);
        setTimeout(() => setActionError(''), 5000);
      });
  };

  // Loyalty Reward Redemption Action
  const handleRedeemLoyalty = (phone, notes = '') => {
    const token = getAdminToken();
    if (!token) return;
    setRedeemLoading(true);
    setActionError('');

    fetch(`${API_BASE_URL}/admin/customers/loyalty/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        phone: phone,
        notes: notes.trim() || 'Redeemed complimentary grooming reward',
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to redeem reward.');
        return data;
      })
      .then((data) => {
        setRedeemLoading(false);
        setRedeemCustomerPhone('');
        setRedeemNotes('');
        setActionSuccess(data.message || 'Reward successfully redeemed!');
        fetchBookings();
        fetchAdminCustomers();
        if (historyCustomerPhone) {
          handleOpenCustomerHistory(historyCustomerPhone);
        }
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setRedeemLoading(false);
        setActionError(err.message);
      });
  };

  // Telegram Test Notification Action
  const handleTestTelegram = () => {
    const token = getAdminToken();
    if (!token) return;
    setTelegramTesting(true);
    setActionError('');
    setActionSuccess('');

    fetch(`${API_BASE_URL}/admin/notifications/telegram/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bot_token: editingSettings['telegram_bot_token'] || undefined,
        chat_id: editingSettings['telegram_chat_id'] || undefined,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Telegram test message delivery failed.');
        return data;
      })
      .then((data) => {
        setTelegramTesting(false);
        setActionSuccess('Telegram test alert sent successfully! Check your Telegram chat.');
        setTimeout(() => setActionSuccess(''), 5000);
      })
      .catch((err) => {
        setTelegramTesting(false);
        setActionError(err.message);
      });
  };

  const handleTestTelegramNotification = handleTestTelegram;

  const handleAddSpecialDate = () => {
    if (!newSpecialDate) {
      setActionError('Please select a date first.');
      return;
    }
    const updated = {
      ...specialDates,
      [newSpecialDate]: {
        closed: newSpecialClosed,
        opening_time: newSpecialClosed ? null : (newSpecialOpening ? `${newSpecialOpening}:00` : '13:00:00'),
        closing_time: newSpecialClosed ? null : (newSpecialClosing ? `${newSpecialClosing}:00` : '00:00:00'),
        reason: newSpecialReason.trim() || (newSpecialClosed ? 'Center Closed' : 'Custom Hours'),
      },
    };
    setSpecialDates(updated);
    setEditingSettings((prev) => ({
      ...prev,
      special_dates_schedule: JSON.stringify(updated),
    }));
    setNewSpecialDate('');
    setNewSpecialReason('');
    setActionSuccess(`Added special date ${newSpecialDate}. Click Save Schedule Settings to commit.`);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleRemoveSpecialDate = (dateKey) => {
    const updated = { ...specialDates };
    delete updated[dateKey];
    setSpecialDates(updated);
    setEditingSettings((prev) => ({
      ...prev,
      special_dates_schedule: JSON.stringify(updated),
    }));
    setActionSuccess(`Removed ${dateKey}. Click Save Schedule Settings to commit.`);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  // Revenue CSV Export Action
  const handleExportRevenueCSV = () => {
    if (!revenueReport || !revenueReport.items || revenueReport.items.length === 0) {
      setActionError('No revenue report data available to export.');
      return;
    }

    const headers = [
      'Customer Name',
      'Phone Number',
      'Booking ID',
      'Booking Date',
      'Payment Date',
      'Source Channel',
      'Status',
      'Payment Status',
      'Invoice Amount (EGP)',
      'Invoice Notes',
    ];

    const rows = revenueReport.items.map((item) => [
      `"${(item.customer_name || '').replace(/"/g, '""')}"`,
      `"${item.customer_phone || ''}"`,
      `"${item.booking_id}"`,
      `"${item.booking_date}"`,
      `"${item.payment_date || ''}"`,
      `"${item.booking_source}"`,
      `"${item.status}"`,
      `"${item.payment_status}"`,
      `"${item.final_invoice_amount}"`,
      `"${(item.invoice_notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Website_Revenue_Report_${revenueReport.year}_${String(revenueReport.month).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setActionSuccess('Revenue Report CSV exported successfully.');
    setTimeout(() => setActionSuccess(''), 3000);
  };

  // Open Edit Details Modal
  const handleOpenEditDetails = (b) => {
    setEditDetailsBooking(b);
    setEditName(b.customer_name || b.user?.name || '');
    setEditPhone(b.customer_phone || b.user?.phone || '');
    setEditNotes(b.special_notes || '');
  };

  const handleSaveEditDetails = (e) => {
    e.preventDefault();
    if (!editDetailsBooking) return;
    const token = getAdminToken();
    setEditDetailsLoading(true);
    setActionError('');

    fetch(`${API_BASE_URL}/admin/bookings/${editDetailsBooking.id}/details`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        customer_name: editName.trim(),
        customer_phone: editPhone.trim(),
        special_notes: editNotes.trim() || null,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to update details.');
        return data;
      })
      .then((data) => {
        setEditDetailsLoading(false);
        setEditDetailsBooking(null);
        setActionSuccess(`Details updated for booking ${data.booking_id}.`);
        fetchBookings();
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setEditDetailsLoading(false);
        setActionError(err.message);
      });
  };

  // Open Reschedule Modal
  const handleOpenReschedule = (b) => {
    setReschedulingBooking(b);
    setRescheduleDate(b.booking_date);
    setRescheduleTime(b.start_time);
  };

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    if (!reschedulingBooking || !rescheduleDate || !rescheduleTime) return;
    const token = getAdminToken();
    setRescheduleLoading(true);
    setActionError('');

    let timeFormatted = rescheduleTime;
    if (timeFormatted.length === 5) timeFormatted += ':00';

    fetch(`${API_BASE_URL}/admin/bookings/${reschedulingBooking.id}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        booking_date: rescheduleDate,
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
        setActionSuccess(`Booking ${reschedulingBooking.booking_id} successfully rescheduled.`);
        fetchBookings();
        fetchDashboardStats();
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setRescheduleLoading(false);
        setActionError(err.message);
      });
  };

  // Open Audit History Modal
  const handleOpenAuditModal = (b) => {
    setAuditModalBooking(b);
    setAuditLoading(true);
    const token = getAdminToken();

    fetch(`${API_BASE_URL}/admin/bookings/${b.id}/audit`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setAuditLogs(Array.isArray(data) ? data : []);
        setAuditLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setAuditLoading(false);
      });
  };

  // Open Customer History Modal
  const handleOpenCustomerHistory = (phone) => {
    if (!phone) return;
    setHistoryCustomerPhone(phone);
    setCustomerHistory(null);
    setHistoryLoading(true);
    const token = getAdminToken();

    fetch(`${API_BASE_URL}/admin/customers/${encodeURIComponent(phone)}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setCustomerHistory(data);
        setHistoryLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setHistoryLoading(false);
      });
  };

  // Manual Booking Submission
  const handleManualBookingSubmit = (e) => {
    e.preventDefault();
    const token = getAdminToken();
    setManualLoading(true);
    setActionError('');

    let timeFormatted = manualTime;
    if (timeFormatted.length === 5) timeFormatted += ':00';

    fetch(`${API_BASE_URL}/admin/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: manualName.trim(),
        phone: manualPhone.trim(),
        booking_date: manualDate,
        start_time: timeFormatted,
        booking_source: manualSource,
        special_notes: manualNotes.trim() || null,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Manual booking failed.');
        return data;
      })
      .then((data) => {
        setManualLoading(false);
        setManualBookingModalOpen(false);
        setManualName('');
        setManualPhone('');
        setManualNotes('');
        setActionSuccess(`Manual appointment created successfully (${data.booking_id}).`);
        fetchBookings();
        fetchDashboardStats();
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setManualLoading(false);
        setActionError(err.message);
      });
  };

  // Block Slot Submission
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
        setActionSuccess(`Slot blocked successfully (${data.booking_id}).`);
        fetchBookings();
        fetchDashboardStats();
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setBlockLoading(false);
        setActionError(err.message);
      });
  };

  // Save Schedule Setting
  const handleSaveSetting = (key, val) => {
    const token = getAdminToken();
    const cleanVal = String(val ?? '').trim();

    setSavingSettings((prev) => ({ ...prev, [key]: true }));
    setErrorSettings((prev) => ({ ...prev, [key]: '' }));
    setSavedSettings((prev) => ({ ...prev, [key]: false }));

    fetch(`${API_BASE_URL}/admin/settings/${key}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value: cleanVal }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Failed to update setting.');
        }
        return data;
      })
      .then((data) => {
        setSavingSettings((prev) => ({ ...prev, [key]: false }));
        setSavedSettings((prev) => ({ ...prev, [key]: true }));
        setEditingSettings((prev) => ({ ...prev, [key]: data.value }));
        setSettings((prev) => {
          const exists = prev.some((s) => s.key === key);
          if (exists) return prev.map((s) => (s.key === key ? data : s));
          return [...prev, data];
        });
        setActionSuccess(`Setting '${key}' saved (${data.value}).`);
        setTimeout(() => {
          setSavedSettings((prev) => ({ ...prev, [key]: false }));
        }, 3500);
        setTimeout(() => setActionSuccess(''), 4000);
      })
      .catch((err) => {
        setSavingSettings((prev) => ({ ...prev, [key]: false }));
        setErrorSettings((prev) => ({ ...prev, [key]: err.message || 'Could not save.' }));
      });
  };

  // CSV Export of Filtered Bookings
  const handleExportCSV = () => {
    if (bookings.length === 0) {
      alert('No bookings available to export.');
      return;
    }

    const headers = [
      'Booking ID',
      'Date',
      'Start Time',
      'End Time',
      'Customer Name',
      'Phone Number',
      'Status',
      'Service Description',
      'Booking Source',
      'Cancellation Reason',
      'Special Notes',
      'Created At'
    ];

    const rows = bookings.map((b) => [
      `"${b.booking_id}"`,
      `"${b.booking_date}"`,
      `"${b.start_time}"`,
      `"${b.end_time}"`,
      `"${(b.customer_name || b.user?.name || '').replace(/"/g, '""')}"`,
      `"${b.customer_phone || b.user?.phone || ''}"`,
      `"${b.status}"`,
      `"${b.service_name_display || 'Grooming Appointment'}"`,
      `"${b.booking_source || 'website'}"`,
      `"${(b.cancellation_reason || '').replace(/"/g, '""')}"`,
      `"${(b.special_notes || '').replace(/"/g, '""')}"`,
      `"${b.created_at}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MPC_Bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // LOGIN SCREEN IF NOT AUTHENTICATED
  if (!adminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8FC] px-4 py-12">
        <div className="max-w-md w-full glass-card-plum rounded-3xl p-8 border border-plum-soft shadow-2xl space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <Logo size="md" />
            </div>
            <div className="inline-flex items-center gap-1.5 bg-plum-bg border border-plum-soft px-3 py-1 rounded-full text-xs font-bold text-plum-deep">
              <Shield className="w-3.5 h-3.5 text-teal-dark" />
              <span>Staff & Management Portal</span>
            </div>
            <h1 className="text-2xl font-black text-plum-deep font-display">Staff Authentication</h1>
            <p className="text-xs text-slate-500">Sign in with authorized administrator credentials.</p>
          </div>

          {loginError && (
            <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-plum-deep uppercase tracking-wider mb-1">
                Admin Email / Username
              </label>
              <input
                type="text"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@mypetcenter.com"
                className="w-full bg-white border border-plum-soft rounded-xl px-4 py-2.5 text-sm font-semibold text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-plum-deep uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white border border-plum-soft rounded-xl px-4 py-2.5 text-sm font-semibold text-plum-deep focus:outline-none focus:ring-2 focus:ring-teal-primary shadow-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-plum-primary via-plum-dark to-plum-deep hover:from-plum-light hover:to-plum-primary text-white font-black py-3 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Lock className="w-4 h-4 text-teal-light" />
                  <span>Access Dashboard</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={onBackToSite}
              className="text-xs text-slate-500 hover:text-plum-deep font-semibold underline cursor-pointer"
            >
              &larr; Back to Public Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-[#FAF8FC] text-plum-deep font-sans pb-16">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-plum-soft/80 shadow-xs px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div onClick={onBackToSite} className="cursor-pointer">
            <Logo size="sm" />
          </div>
          <span className="hidden sm:inline-block w-px h-5 bg-plum-soft" />
          <div className="flex items-center gap-1.5">
            <span className="bg-plum-bg text-plum-deep border border-plum-soft font-bold text-xs px-2.5 py-0.5 rounded-lg">
              Staff Portal
            </span>
            <span className="text-xs text-slate-500 font-semibold hidden md:inline">
              Cairo Timezone (UTC+2/+3)
            </span>
          </div>
        </div>

        {/* Global Action Notifications */}
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setManualBookingModalOpen(true)}
            className="bg-teal-primary hover:bg-teal-dark text-plum-deep font-black text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Manual Booking</span>
          </button>

          <button
            onClick={() => setBlockModalOpen(true)}
            className="bg-plum-bg hover:bg-plum-soft/50 text-plum-deep border border-plum-soft font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Ban className="w-3.5 h-3.5 text-rose-500" />
            <span>Block Slot</span>
          </button>

          <div className="flex items-center gap-2 border-l border-plum-soft/80 pl-3">
            <button
              onClick={onBackToSite}
              className="text-xs font-semibold text-slate-600 hover:text-plum-deep cursor-pointer"
            >
              Public Site
            </button>
            <button
              onClick={onAdminLogout}
              title="Log Out"
              className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-plum-soft/70 pb-3 gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'today'
                  ? 'bg-plum-deep text-white shadow-sm'
                  : 'bg-white border border-plum-soft text-slate-600 hover:bg-plum-bg'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Today</span>
              {bookings.filter((b) => b.booking_date === new Date().toISOString().split('T')[0]).length > 0 && (
                <span className="bg-teal-primary text-plum-deep text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {bookings.filter((b) => b.booking_date === new Date().toISOString().split('T')[0]).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'bookings'
                  ? 'bg-plum-deep text-white shadow-sm'
                  : 'bg-white border border-plum-soft text-slate-600 hover:bg-plum-bg'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Bookings</span>
              {bookings.length > 0 && (
                <span className="bg-plum-bg text-plum-deep text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {bookings.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('customers');
                fetchAdminCustomers();
              }}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'customers'
                  ? 'bg-plum-deep text-white shadow-sm'
                  : 'bg-white border border-plum-soft text-slate-600 hover:bg-plum-bg'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customers</span>
            </button>

            {adminUser?.role === 'admin' && (
              <button
                onClick={() => {
                  setActiveTab('management');
                  if (managementSubTab === 'reports') {
                    fetchRevenueReport(revenueReportYear, revenueReportMonth);
                  }
                }}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'management'
                    ? 'bg-plum-deep text-white shadow-sm'
                    : 'bg-white border border-plum-soft text-slate-600 hover:bg-plum-bg'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Management</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchDashboardStats();
                fetchBookings();
                if (activeTab === 'customers') fetchAdminCustomers();
                if (activeTab === 'management' && managementSubTab === 'reports') {
                  fetchRevenueReport(revenueReportYear, revenueReportMonth);
                }
              }}
              className="bg-white border border-plum-soft text-slate-600 hover:text-plum-deep px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

{/* FRIDAY CONFLICT WARNING BANNER */}
        {fridayConflicts.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                  Friday Schedule Notice ({fridayConflicts.length} Appointment Need Review)
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Friday appointments begin at 3:00 PM. The following active booking(s) are scheduled before 3:00 PM:
                </p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {fridayConflicts.map((c) => (
                    <span key={c.id} className="bg-white border border-amber-300 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded-lg">
                      {c.booking_id} · {formatTime12h(c.start_time)} · {c.customer_name || 'Customer'} ({c.customer_phone})
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('bookings');
                setFilterDate(fridayConflicts[0].booking_date);
                fetchBookings();
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl shrink-0 cursor-pointer shadow-xs"
            >
              Review Bookings
            </button>
          </div>
        )}

        {/* ================= 1. TAB: DASHBOARD ================= */}


        {/* ================= 1. TAB: TODAY (DEFAULT STAFF SCREEN) ================= */}
        {activeTab === 'today' && (() => {
          const todayStr = new Date().toISOString().split('T')[0];
          const todayBookings = bookings
            .filter((b) => b.booking_date === todayStr)
            .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

          const todayCompletedCount = todayBookings.filter((b) => b.status === 'completed').length;
          const todayConfirmedCount = todayBookings.filter((b) => b.status === 'confirmed').length;

          return (
            <div className="space-y-6 animate-fade-in">
              {/* Daily KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-plum-soft rounded-2xl p-5 shadow-xs border-l-4 border-l-plum-deep">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Today's Bookings
                  </span>
                  <span className="text-3xl font-black text-plum-deep block font-display mt-1">
                    {todayBookings.length}
                  </span>
                  <span className="text-xs text-slate-400">Total appointments scheduled for today</span>
                </div>

                <div className="bg-white border border-plum-soft rounded-2xl p-5 shadow-xs border-l-4 border-l-teal-600">
                  <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">
                    Completed
                  </span>
                  <span className="text-3xl font-black text-teal-800 block font-display mt-1">
                    {todayCompletedCount}
                  </span>
                  <span className="text-xs text-teal-600 font-medium">Finished grooming sessions</span>
                </div>

                <div className="bg-white border border-plum-soft rounded-2xl p-5 shadow-xs border-l-4 border-l-emerald-600">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                    Remaining Appointments
                  </span>
                  <span className="text-3xl font-black text-emerald-800 block font-display mt-1">
                    {todayConfirmedCount}
                  </span>
                  <span className="text-xs text-emerald-600 font-medium">Awaiting service today</span>
                </div>
              </div>

              {/* Today's Appointments List (Chronological Order) */}
              <div className="bg-white border border-plum-soft rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-plum-soft/60 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-plum-deep font-display flex items-center gap-2">
                      <Clock className="w-5 h-5 text-teal-dark" />
                      <span>Today's Appointments ({formatDateDisplay(todayStr)})</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Chronological grooming schedule. Click Complete Visit to record customer payment.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setManualDate(todayStr);
                        setManualBookingModalOpen(true);
                      }}
                      className="bg-plum-deep hover:bg-plum-dark text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 text-teal-light" />
                      <span>New Booking Today</span>
                    </button>
                  </div>
                </div>

                {todayBookings.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No appointments scheduled for today yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayBookings.map((b) => {
                      const isCompleted = b.status === 'completed';
                      const isCancelled = b.status === 'cancelled';
                      const isNoShow = b.status === 'no-show';
                      const isConfirmed = b.status === 'confirmed';
                      const isFuture = isFutureBooking(b);

                      return (
                        <div
                          key={b.id}
                          className={`border rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-xs ${
                            isCompleted
                              ? 'bg-teal-50/40 border-teal-200'
                              : isCancelled
                              ? 'bg-rose-50/30 border-rose-200 opacity-70'
                              : isNoShow
                              ? 'bg-slate-50 border-slate-200 opacity-70'
                              : 'bg-white border-plum-soft hover:border-plum-primary/60'
                          }`}
                        >
                          {/* Time & Customer Info */}
                          <div className="flex items-start gap-4">
                            <div className="bg-plum-bg border border-plum-soft rounded-2xl p-3 text-center min-w-[85px] shrink-0">
                              <span className="block text-sm font-black text-plum-deep font-mono">
                                {formatTime12h(b.start_time)}
                              </span>
                              <span className="block text-[10px] text-teal-dark font-bold mt-0.5">
                                60 min slot
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-black text-plum-deep text-base">
                                  {b.customer_name || 'Guest Customer'}
                                </span>
                                <span className="text-xs font-mono text-slate-500">
                                  ({b.customer_phone || '—'})
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                  isCompleted
                                    ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                    : isConfirmed
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : isCancelled
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                                }`}>
                                  {b.status}
                                </span>
                              </div>

                              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2.5">
                                <span className="font-mono text-slate-400">{b.booking_id}</span>
                                <span>·</span>
                                <span>Grooming Appointment</span>
                                {b.payment_status === 'paid' && b.final_invoice_amount && (
                                  <span className="text-emerald-700 font-bold">
                                    · Paid: {b.final_invoice_amount} EGP
                                  </span>
                                )}
                                {isCompleted && b.payment_status === 'unpaid' && (
                                  <span className="text-amber-700 font-bold">· Unpaid Invoice</span>
                                )}
                                {b.special_notes && (
                                  <span className="text-slate-600 italic">· Note: "{b.special_notes}"</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons: [Complete Visit] [Details] */}
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            {isCompleted ? (
                              <button
                                onClick={() => handleOpenInvoiceModal(b)}
                                className="bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 px-3.5 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-teal-700" />
                                <span>{b.final_invoice_amount ? `${b.final_invoice_amount} EGP ✓` : 'Completed ✓'}</span>
                              </button>
                            ) : isCancelled || isNoShow ? (
                              <button
                                onClick={() => setDetailsModalBooking(b)}
                                className="bg-white border border-slate-200 text-slate-600 hover:bg-plum-bg px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                              >
                                View Details
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenInvoiceModal(b)}
                                disabled={isFuture}
                                title={isFuture ? "Cannot complete before appointment start time" : "Complete Visit and record payment"}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                                  isFuture
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                                }`}
                              >
                                <Check className="w-4 h-4" />
                                <span>Complete Visit</span>
                              </button>
                            )}

                            <button
                              onClick={() => setDetailsModalBooking(b)}
                              className="bg-white hover:bg-plum-bg text-plum-deep border border-plum-soft px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}


        {/* ================= 2. TAB: BOOKINGS & CALENDAR ================= */}
        {activeTab === 'bookings' && (() => {
          const todayStr = new Date().toISOString().split('T')[0];

          // Filter bookings
          const filteredBookings = bookings.filter((b) => {
            if (bookingSearch.trim()) {
              const q = bookingSearch.trim().toLowerCase();
              const name = (b.customer_name || b.user?.name || '').toLowerCase();
              const phone = (b.customer_phone || b.user?.phone || '').toLowerCase();
              const id = (b.booking_id || '').toLowerCase();
              if (!name.includes(q) && !phone.includes(q) && !id.includes(q)) return false;
            }
            if (filterDate && b.booking_date !== filterDate) return false;
            if (filterStatus && b.status !== filterStatus) return false;
            if (filterSource && (b.booking_source || 'website').toLowerCase() !== filterSource.toLowerCase()) return false;
            return true;
          });

          return (
            <div className="space-y-6 animate-fade-in">
              {/* Top View Mode Switcher & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-plum-soft rounded-2xl p-4 shadow-xs">
                {/* Switcher */}
                <div className="flex items-center gap-1 bg-plum-bg/60 p-1 rounded-xl border border-plum-soft">
                  <button
                    onClick={() => setBookingsViewMode('list')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      bookingsViewMode === 'list'
                        ? 'bg-plum-deep text-white shadow-xs'
                        : 'text-slate-600 hover:text-plum-deep'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>List View</span>
                  </button>
                  <button
                    onClick={() => setBookingsViewMode('calendar')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      bookingsViewMode === 'calendar'
                        ? 'bg-plum-deep text-white shadow-xs'
                        : 'text-slate-600 hover:text-plum-deep'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Calendar View</span>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setManualDate(todayStr);
                      setManualBookingModalOpen(true);
                    }}
                    className="bg-plum-deep hover:bg-plum-dark text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-light" />
                    <span>+ New Booking</span>
                  </button>
                  <button
                    onClick={() => {
                      setBlockDate(todayStr);
                      setBlockModalOpen(true);
                    }}
                    className="bg-white border border-plum-soft hover:bg-plum-bg text-plum-deep font-bold text-xs px-3 py-2 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Block Slot</span>
                  </button>
                </div>
              </div>

              {/* View Rendering */}
              {bookingsViewMode === 'calendar' ? (
                <div className="space-y-6 animate-fade-in">
            {/* Calendar Controls */}
            <div className="bg-white border border-plum-soft rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={calendarSelectedDate}
                  onChange={(e) => setCalendarSelectedDate(e.target.value)}
                  className="bg-plum-bg border border-plum-soft rounded-xl px-3 py-1.5 text-xs font-bold text-plum-deep"
                />
                <button
                  onClick={() => setCalendarSelectedDate(new Date().toISOString().split('T')[0])}
                  className="bg-plum-bg hover:bg-plum-soft text-plum-deep px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalendarMode('daily')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${calendarMode === 'daily'
                      ? 'bg-plum-deep text-white'
                      : 'bg-white border border-plum-soft text-slate-600'
                    }`}
                >
                  Daily Timeline
                </button>
                <button
                  onClick={() => setCalendarMode('weekly')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${calendarMode === 'weekly'
                      ? 'bg-plum-deep text-white'
                      : 'bg-white border border-plum-soft text-slate-600'
                    }`}
                >
                  Weekly View
                </button>
              </div>
            </div>

            {/* Daily Timeline View */}
            {calendarMode === 'daily' && (() => {
              const dateObj = new Date(calendarSelectedDate + 'T00:00:00');
              const isFriday = dateObj.getDay() === 5;
              const startHour = isFriday ? 15 : 12;
              const hours = [];
              for (let h = startHour; h <= 22; h++) {
                hours.push(h);
              }

              const dateBookings = bookings.filter((b) => b.booking_date === calendarSelectedDate);

              return (
                <div className="bg-white border border-plum-soft rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="border-b border-plum-soft/60 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-base text-plum-deep font-display">
                        Schedule for {formatDateDisplay(calendarSelectedDate)}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isFriday ? 'Friday Schedule (3:00 PM – 10:00 PM start times, finishes 11:00 PM)' : 'Standard Schedule (12:00 PM – 10:00 PM start times, finishes 11:00 PM)'}
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-teal-veryLight text-teal-deep px-3 py-1 rounded-full border border-teal-light">
                      {dateBookings.filter((b) => b.status === 'confirmed').length} Active Appointments
                    </span>
                  </div>

                  <div className="space-y-2">
                    {hours.map((h) => {
                      const timeStr = `${String(h).padStart(2, '0')}:00:00`;
                      const matched = dateBookings.filter(
                        (b) => b.start_time.startsWith(String(h).padStart(2, '0'))
                      );

                      return (
                        <div
                          key={h}
                          className="flex items-start gap-4 p-3 rounded-2xl border border-plum-soft/50 hover:bg-plum-bg/20 transition-colors"
                        >
                          <div className="w-24 shrink-0 font-mono font-bold text-xs text-plum-deep pt-1">
                            {formatTime12h(timeStr)}
                          </div>
                          <div className="flex-grow space-y-1.5">
                            {matched.length === 0 ? (
                              <span className="text-xs text-slate-400 font-medium italic">
                                Open Slot (Available)
                              </span>
                            ) : (
                              matched.map((b) => (
                                <div
                                  key={b.id}
                                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${b.status === 'blocked'
                                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                                      : b.status === 'no-show'
                                        ? 'bg-slate-100 border-slate-200 text-slate-500 line-through'
                                        : b.status === 'completed'
                                          ? 'bg-teal-50 border-teal-200 text-teal-900'
                                          : 'bg-emerald-50 border-emerald-200 text-emerald-950 font-semibold'
                                    }`}
                                >
                                  <div>
                                    <div className="font-bold flex items-center gap-2">
                                      <span>{b.booking_id}</span>
                                      <span>·</span>
                                      <span>{b.customer_name || 'Guest'}</span>
                                      {b.customer_phone && <span className="font-mono">({b.customer_phone})</span>}
                                    </div>
                                    <div className="text-[11px] text-slate-600 mt-0.5">
                                      {b.service_name_display || 'Grooming Appointment'} {b.special_notes ? `· Notes: ${b.special_notes}` : ''}
                                      {b.cancellation_reason && ` · Reason: ${b.cancellation_reason}`}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {b.status === 'confirmed' && (
                                      <>
                                        <button
                                          onClick={() => handleMarkCompleted(b.id)}
                                          className="bg-teal-primary hover:bg-teal-dark text-plum-deep text-[11px] font-bold px-2 py-1 rounded-lg"
                                        >
                                          Complete
                                        </button>
                                        <button
                                          onClick={() => handleOpenNoShowModal(b)}
                                          className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-1 rounded-lg"
                                        >
                                          No-Show
                                        </button>
                                      </>
                                    )}
                                    {b.status === 'no-show' && (
                                      <button
                                        onClick={() => handleRestoreBooking(b.id)}
                                        className="bg-plum-deep text-white text-[11px] font-bold px-2 py-1 rounded-lg"
                                      >
                                        Restore
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Weekly Overview View */}
            {calendarMode === 'weekly' && (() => {
              const base = new Date(calendarSelectedDate + 'T00:00:00');
              const weekDays = [];
              for (let i = 0; i < 7; i++) {
                const d = new Date(base);
                d.setDate(base.getDate() + i);
                weekDays.push(d.toISOString().split('T')[0]);
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                  {weekDays.map((wDate) => {
                    const dayBookings = bookings.filter((b) => b.booking_date === wDate);
                    const dObj = new Date(wDate + 'T00:00:00');
                    const isFri = dObj.getDay() === 5;

                    return (
                      <div key={wDate} className="bg-white border border-plum-soft rounded-2xl p-3 space-y-2 shadow-xs flex flex-col justify-between">
                        <div className="border-b border-plum-soft pb-2">
                          <span className="text-[11px] font-extrabold uppercase text-slate-500 block">
                            {dObj.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="text-sm font-black text-plum-deep font-display block">
                            {dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {isFri && (
                            <span className="text-[9px] bg-teal-veryLight text-teal-deep font-black px-1.5 py-0.5 rounded-full inline-block mt-1">
                              Fri 3 PM
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 my-2 flex-grow overflow-y-auto max-h-72">
                          {dayBookings.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">No bookings</p>
                          ) : (
                            dayBookings.map((b) => (
                              <div
                                key={b.id}
                                className={`p-2 rounded-xl border text-[11px] space-y-0.5 ${b.status === 'blocked'
                                    ? 'bg-rose-50 border-rose-200'
                                    : b.status === 'no-show'
                                      ? 'bg-slate-100 border-slate-200 line-through opacity-70'
                                      : 'bg-emerald-50 border-emerald-200'
                                  }`}
                              >
                                <span className="font-mono font-bold block">{formatTime12h(b.start_time)}</span>
                                <span className="font-semibold text-plum-deep block truncate">{b.customer_name || 'Guest'}</span>
                              </div>
                            ))
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setCalendarSelectedDate(wDate);
                            setCalendarMode('daily');
                          }}
                          className="w-full bg-plum-bg hover:bg-plum-soft text-plum-deep text-[11px] font-bold py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          View Day
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
              ) : (
                <div className="space-y-4">
                  {/* Search & Essential Filters */}
                  <div className="bg-white border border-plum-soft rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      {/* Search Bar */}
                      <div className="relative flex-grow w-full">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={bookingSearch}
                          onChange={(e) => setBookingSearch(e.target.value)}
                          placeholder="Search customer name or phone number..."
                          className="w-full bg-plum-bg/40 border border-plum-soft rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-plum-deep focus:outline-none focus:ring-1 focus:ring-teal-primary"
                        />
                      </div>

                      {/* Date Filter */}
                      <div className="w-full sm:w-auto">
                        <input
                          type="date"
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                          className="w-full sm:w-auto bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold text-plum-deep cursor-pointer"
                          title="Filter by appointment date"
                        />
                      </div>

                      {/* Status Filter */}
                      <div className="w-full sm:w-auto">
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="w-full sm:w-auto bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold text-plum-deep cursor-pointer"
                        >
                          <option value="">All Statuses</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="no-show">No-Show</option>
                        </select>
                      </div>

                      {/* Filter Reset & Advanced Toggle */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                          className="text-xs text-slate-500 hover:text-plum-deep font-semibold px-2 py-1.5 cursor-pointer"
                        >
                          {showAdvancedFilters ? 'Simple Filters' : 'Advanced Filters'}
                        </button>
                        {(bookingSearch || filterDate || filterStatus || filterSource) && (
                          <button
                            onClick={() => {
                              setBookingSearch('');
                              setFilterDate('');
                              setFilterStatus('');
                              setFilterSource('');
                            }}
                            className="text-xs text-rose-600 hover:underline font-bold px-2 py-1.5 cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {showAdvancedFilters && (
                      <div className="pt-2 border-t border-plum-soft/50 flex flex-wrap items-center gap-3 text-xs">
                        <div>
                          <label className="text-slate-500 text-[10px] uppercase font-bold block mb-0.5">Booking Source</label>
                          <select
                            value={filterSource}
                            onChange={(e) => setFilterSource(e.target.value)}
                            className="bg-plum-bg/40 border border-plum-soft rounded-lg px-2.5 py-1 text-xs font-semibold"
                          >
                            <option value="">All Sources</option>
                            <option value="website">Website</option>
                            <option value="phone">Phone</option>
                            <option value="walkin">Walk-in</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bookings Table */}
                  <div className="bg-white border border-plum-soft rounded-3xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-plum-soft/60 pb-3">
                      <h3 className="font-black text-base text-plum-deep font-display">
                        Bookings ({filteredBookings.length})
                      </h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-plum-bg/80 text-plum-deep font-bold border-b border-plum-soft">
                          <tr>
                            <th className="py-2.5 px-3">Date & Time</th>
                            <th className="py-2.5 px-3">ID</th>
                            <th className="py-2.5 px-3">Customer</th>
                            <th className="py-2.5 px-3">Phone</th>
                            <th className="py-2.5 px-3">Source</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-plum-soft/40">
                          {filteredBookings.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400">
                                No bookings found matching filters.
                              </td>
                            </tr>
                          ) : (
                            filteredBookings.map((b) => {
                              const isCompleted = b.status === 'completed';
                              const isCancelled = b.status === 'cancelled';
                              const isNoShow = b.status === 'no-show';
                              const isConfirmed = b.status === 'confirmed';
                              const isFuture = isFutureBooking(b);

                              return (
                                <tr key={b.id} className="hover:bg-plum-bg/30 transition-colors">
                                  <td className="py-3 px-3 font-medium">
                                    <span className="font-bold text-plum-deep block">
                                      {formatDateDisplay(b.booking_date)}
                                    </span>
                                    <span className="text-[11px] text-teal-dark font-mono font-bold block">
                                      {formatTime12h(b.start_time)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 font-mono font-bold text-slate-600">
                                    {b.booking_id}
                                  </td>
                                  <td className="py-3 px-3 font-extrabold text-plum-deep">
                                    {b.customer_name || 'Guest'}
                                  </td>
                                  <td className="py-3 px-3 font-mono text-slate-700">
                                    {b.customer_phone || '—'}
                                  </td>
                                  <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-500">
                                    {b.booking_source || 'website'}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                      isCompleted
                                        ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                        : isConfirmed
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                        : isCancelled
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                                    }`}>
                                      {b.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {isCompleted ? (
                                        <button
                                          onClick={() => handleOpenInvoiceModal(b)}
                                          className="bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                        >
                                          {b.final_invoice_amount ? `${b.final_invoice_amount} EGP ✓` : 'Invoice'}
                                        </button>
                                      ) : isCancelled || isNoShow ? (
                                        <button
                                          onClick={() => setDetailsModalBooking(b)}
                                          className="bg-white border border-slate-200 text-slate-600 hover:bg-plum-bg px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                        >
                                          Details
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleOpenInvoiceModal(b)}
                                          disabled={isFuture}
                                          title={isFuture ? "Cannot complete before appointment start time" : "Complete Visit"}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 ${
                                            isFuture
                                              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                          }`}
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Complete</span>
                                        </button>
                                      )}

                                      <button
                                        onClick={() => setDetailsModalBooking(b)}
                                        className="bg-white hover:bg-plum-bg text-plum-deep border border-plum-soft px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                      >
                                        Details
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}


        {/* ================= 3. TAB: CUSTOMERS & LOYALTY ================= */}
        {activeTab === 'customers' && (() => {
          let customerList = adminCustomers;
          if (!customerList || customerList.length === 0) {
            const customerMap = {};
            bookings.forEach((b) => {
              const phone = b.customer_phone || b.user?.phone;
              if (!phone) return;
              if (!customerMap[phone]) {
                customerMap[phone] = {
                  phone: phone,
                  name: b.customer_name || b.user?.name || 'Customer',
                  completed_visits: 0,
                  last_appointment_date: b.booking_date,
                  stamps_count: 0,
                  reward_available: false,
                };
              }
              const entry = customerMap[phone];
              if (b.status === 'completed') {
                entry.completed_visits += 1;
                if ((b.booking_source || 'website').toLowerCase() === 'website' && b.payment_status === 'paid') {
                  entry.stamps_count = (entry.stamps_count + 1) % 3;
                }
              }
              if (b.booking_date > entry.last_appointment_date) {
                entry.last_appointment_date = b.booking_date;
              }
            });
            customerList = Object.values(customerMap);
          }

          if (customerSearch.trim()) {
            const q = customerSearch.trim().toLowerCase();
            customerList = customerList.filter(
              (c) => (c.phone || '').includes(q) || (c.name || '').toLowerCase().includes(q)
            );
          }

          return (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border border-plum-soft rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-plum-soft/60 pb-4">
                  <div>
                    <h3 className="font-black text-lg text-plum-deep font-display flex items-center gap-2">
                      <Award className="w-5 h-5 text-teal-dark" />
                      <span>Customers & My Pet Rewards</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Customer directory & loyalty progress (3 completed & paid visits = 1 Free Gift).
                    </p>
                  </div>

                  <div className="w-full sm:w-72">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          fetchAdminCustomers(e.target.value);
                        }}
                        placeholder="Search customer name or phone..."
                        className="w-full bg-plum-bg/40 border border-plum-soft rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-plum-deep focus:outline-none focus:ring-1 focus:ring-teal-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Simplified Customer Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-plum-bg/80 text-plum-deep font-bold border-b border-plum-soft">
                      <tr>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">Phone Number</th>
                        <th className="py-2.5 px-3 text-center">Completed Visits</th>
                        <th className="py-2.5 px-3">Last Appointment</th>
                        <th className="py-2.5 px-3">Loyalty Progress</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-plum-soft/40">
                      {customerList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            {adminCustomersLoading ? 'Loading customers...' : 'No customers found.'}
                          </td>
                        </tr>
                      ) : (
                        customerList.map((c) => {
                          const stamps = c.loyalty_stamps !== undefined ? c.loyalty_stamps : (c.stamps_count || 0);
                          const isRewardReady = c.reward_available || (c.rewards_unlocked && c.rewards_unlocked > 0);

                          return (
                            <tr key={c.phone} className="hover:bg-plum-bg/30 transition-colors">
                              <td className="py-3 px-3 font-extrabold text-plum-deep text-sm">
                                {c.name || 'Customer'}
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-slate-700">
                                {c.phone}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-plum-deep">
                                {c.completed_visits || 0}
                              </td>
                              <td className="py-3 px-3 text-slate-600 font-medium">
                                {c.last_appointment_date ? formatDateDisplay(c.last_appointment_date) : '—'}
                              </td>
                              <td className="py-3 px-3">
                                {isRewardReady ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-[11px] border border-emerald-300">
                                    <span>🎁 Free Gift Unlocked!</span>
                                  </span>
                                ) : (
                                  <span className="font-mono text-plum-deep font-bold text-xs inline-flex items-center gap-1">
                                    <span className="tracking-widest">
                                      {'🐾'.repeat(stamps)}
                                      {'◯'.repeat(Math.max(0, 3 - stamps))}
                                    </span>
                                    <span className="text-slate-400 text-[11px]">
                                      ({stamps}/3)
                                    </span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={() => handleOpenCustomerHistory(c.phone)}
                                  className="bg-white hover:bg-plum-bg text-plum-deep border border-plum-soft font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer shadow-xs transition-colors"
                                >
                                  View History
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}


        {/* ================= 4. TAB: MANAGEMENT ================= */}
        {activeTab === 'management' && adminUser?.role === 'admin' && (
          <div className="space-y-6 animate-fade-in">
            {/* Sub-Navigation Pills */}
            <div className="flex items-center gap-2 border-b border-plum-soft/60 pb-3 overflow-x-auto">
              <button
                onClick={() => {
                  setManagementSubTab('reports');
                  fetchRevenueReport(revenueReportYear, revenueReportMonth);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  managementSubTab === 'reports'
                    ? 'bg-plum-deep text-white shadow-xs'
                    : 'bg-white border border-plum-soft text-slate-600 hover:bg-plum-bg'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Revenue Reports</span>
              </button>

              <button
                onClick={() => setManagementSubTab('schedule')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  managementSubTab === 'schedule'
                    ? 'bg-plum-deep text-white shadow-xs'
                    : 'bg-white border border-plum-soft text-slate-600 hover:bg-plum-bg'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Schedule Settings</span>
              </button>

              <button
                onClick={() => setManagementSubTab('loyalty')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  managementSubTab === 'loyalty'
                    ? 'bg-plum-deep text-white shadow-xs'
                    : 'bg-white border border-plum-soft text-slate-600 hover:bg-plum-bg'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Loyalty Settings</span>
              </button>

              <button
                onClick={() => setManagementSubTab('notifications')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  managementSubTab === 'notifications'
                    ? 'bg-plum-deep text-white shadow-xs'
                    : 'bg-white border border-plum-soft text-slate-600 hover:bg-plum-bg'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Telegram Notifications</span>
              </button>
            </div>

            {/* Sub-Tab 1: Revenue Reports */}
            {managementSubTab === 'reports' && (
              <div className="space-y-6 animate-fade-in">
                {/* Header & Controls */}
                <div className="bg-white border border-plum-soft rounded-3xl p-6 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-plum-soft/60 pb-4">
                    <div>
                      <h3 className="font-black text-xl text-plum-deep font-display flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        <span>Website Revenue</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Simple, accurate monthly revenue tracking from website bookings.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={revenueReportMonth}
                        onChange={(e) => {
                          const m = parseInt(e.target.value, 10);
                          setRevenueReportMonth(m);
                          fetchRevenueReport(revenueReportYear, m);
                        }}
                        className="bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold text-plum-deep cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-primary"
                      >
                        {[
                          'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'
                        ].map((name, idx) => (
                          <option key={name} value={idx + 1}>{name}</option>
                        ))}
                      </select>

                      <select
                        value={revenueReportYear}
                        onChange={(e) => {
                          const y = parseInt(e.target.value, 10);
                          setRevenueReportYear(y);
                          fetchRevenueReport(y, revenueReportMonth);
                        }}
                        className="bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold text-plum-deep cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-primary"
                      >
                        {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleExportRevenueCSV}
                        className="bg-teal-primary hover:bg-teal-dark text-plum-deep font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Report</span>
                      </button>
                    </div>
                  </div>

                  {revenueReportLoading ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-plum-primary border-t-transparent mx-auto mb-2" />
                      <span>Calculating monthly revenue...</span>
                    </div>
                  ) : revenueReport ? (
                    <div className="space-y-6">
                      {/* Single Prominent Revenue Card */}
                      <div className="bg-gradient-to-br from-plum-deep to-[#3d1847] text-white p-6 sm:p-7 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider block text-teal-light">
                            {revenueReport.month_name} {revenueReport.year}
                          </span>
                          <span className="text-sm font-bold text-plum-soft block mt-0.5">
                            Total Revenue This Month
                          </span>
                          <div className="text-3xl sm:text-4xl font-black font-mono mt-1 text-white flex items-baseline gap-2">
                            <span>{Number(revenueReport.total_website_revenue || 0).toLocaleString()}</span>
                            <span className="text-base sm:text-lg font-bold text-teal-light">EGP</span>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="inline-block bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl text-xs text-plum-soft font-semibold border border-white/10">
                            Counted from completed & paid website appointments
                          </span>
                        </div>
                      </div>

                      {/* Simplified Customer Invoices Table (4 columns) */}
                      <div className="border-t border-plum-soft/60 pt-4 space-y-3">
                        <h4 className="text-xs font-black text-plum-deep uppercase tracking-wider">
                          Customer Invoices ({revenueReport.month_name} {revenueReport.year})
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-plum-bg/80 text-plum-deep font-bold border-b border-plum-soft">
                              <tr>
                                <th className="py-2.5 px-3">Customer</th>
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3">Amount Paid</th>
                                <th className="py-2.5 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-plum-soft/40">
                              {revenueReport.items.length === 0 ? (
                                <tr>
                                  <td colSpan="4" className="py-8 text-center text-slate-500">
                                    No paid customer invoices recorded for this month.
                                  </td>
                                </tr>
                              ) : (
                                revenueReport.items.map((item) => (
                                  <tr key={item.id} className="hover:bg-plum-bg/25 transition-colors">
                                    <td className="py-3 px-3 font-bold text-plum-deep">
                                      <div>
                                        <span>{item.customer_name || 'Customer'}</span>
                                        <span className="block text-[10px] text-slate-400 font-mono font-normal">
                                          {item.booking_id}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 text-slate-600 font-medium">
                                      {item.payment_date ? formatDateDisplay(item.payment_date) : formatDateDisplay(item.booking_date)}
                                    </td>
                                    <td className="py-3 px-3 font-mono font-bold text-emerald-800 text-sm">
                                      {Number(item.final_invoice_amount).toLocaleString()} EGP
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                        item.payment_status === 'paid'
                                          ? 'bg-teal-100 text-teal-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {item.payment_status === 'paid' ? 'Paid' : item.payment_status}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Schedule Settings (Grouped Form with ONE Save button) */}
            {managementSubTab === 'schedule' && (
              <div className="bg-white border border-plum-soft rounded-3xl p-6 shadow-xs space-y-6">
                <div className="border-b border-plum-soft/60 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-lg text-plum-deep font-display">
                      Business Schedule Settings
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configure standard operating hours, midnight closing, capacity, and holiday/closed dates.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const toSave = {
                        opening_time: editingSettings['opening_time'] || '12:00:00',
                        opening_time_friday: editingSettings['opening_time_friday'] || '15:00:00',
                        closing_time: editingSettings['closing_time'] || '23:00:00',
                        max_simultaneous_bookings: String(editingSettings['max_simultaneous_bookings'] || '1'),
                        max_booking_days_ahead: String(editingSettings['max_booking_days_ahead'] || '5'),
                        slot_interval_minutes: String(editingSettings['slot_interval_minutes'] || '60'),
                        working_days: editingSettings['working_days'] || 'Sat - Thu: 12:00 PM - 11:00 PM, Friday: 3:00 PM - 11:00 PM',
                        special_dates_schedule: JSON.stringify(specialDates),
                      };
                      handleBatchSaveSettings(toSave, 'Schedule settings saved successfully!');
                    }}
                    disabled={batchSaving}
                    className="bg-plum-deep hover:bg-plum-dark text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-teal-light" />
                    <span>{batchSaving ? 'Saving...' : 'Save Schedule Settings'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-plum-bg/40 border border-plum-soft rounded-2xl p-4 space-y-1.5">
                    <label className="block text-xs font-black text-plum-deep uppercase tracking-wider">
                      Opening Time: Sat – Thu
                    </label>
                    <p className="text-[11px] text-slate-500">First appointment start time (e.g. 12:00 / 12:00 PM).</p>
                    <input
                      type="time"
                      value={(editingSettings['opening_time'] || '12:00:00').substring(0, 5)}
                      onChange={(e) => setEditingSettings({ ...editingSettings, opening_time: e.target.value + ':00' })}
                      className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold font-mono text-plum-deep mt-1"
                    />
                  </div>

                  <div className="bg-plum-bg/40 border border-plum-soft rounded-2xl p-4 space-y-1.5">
                    <label className="block text-xs font-black text-plum-deep uppercase tracking-wider">
                      Opening Time: Friday
                    </label>
                    <p className="text-[11px] text-slate-500">Friday appointments start time (e.g. 15:00 / 3:00 PM).</p>
                    <input
                      type="time"
                      value={(editingSettings['opening_time_friday'] || '15:00:00').substring(0, 5)}
                      onChange={(e) => setEditingSettings({ ...editingSettings, opening_time_friday: e.target.value + ':00' })}
                      className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold font-mono text-plum-deep mt-1"
                    />
                  </div>

                  <div className="bg-plum-bg/40 border border-plum-soft rounded-2xl p-4 space-y-1.5">
                    <label className="block text-xs font-black text-plum-deep uppercase tracking-wider">
                      Grooming Closing Time: Every Day
                    </label>
                    <p className="text-[11px] text-slate-500">Last appointment finishes at this time (e.g. 23:00 / 11:00 PM).</p>
                    <input
                      type="time"
                      value={(editingSettings['closing_time'] || '23:00:00').substring(0, 5)}
                      onChange={(e) => setEditingSettings({ ...editingSettings, closing_time: e.target.value + ':00' })}
                      className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold font-mono text-plum-deep mt-1"
                    />
                  </div>

                  <div className="bg-plum-bg/40 border border-plum-soft rounded-2xl p-4 space-y-1.5">
                    <label className="block text-xs font-black text-plum-deep uppercase tracking-wider">
                      Slot Duration (Minutes)
                    </label>
                    <p className="text-[11px] text-slate-500">Standard appointment duration in minutes.</p>
                    <input
                      type="number"
                      min="15"
                      max="180"
                      step="15"
                      value={editingSettings['slot_interval_minutes'] || '60'}
                      onChange={(e) => setEditingSettings({ ...editingSettings, slot_interval_minutes: e.target.value })}
                      className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold text-plum-deep mt-1"
                    />
                  </div>

                  <div className="bg-plum-bg/40 border border-plum-soft rounded-2xl p-4 space-y-1.5">
                    <label className="block text-xs font-black text-plum-deep uppercase tracking-wider">
                      Bookings Per Slot
                    </label>
                    <p className="text-[11px] text-slate-500">Maximum simultaneous pets groomed per hour.</p>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={editingSettings['max_simultaneous_bookings'] || '1'}
                      onChange={(e) => setEditingSettings({ ...editingSettings, max_simultaneous_bookings: e.target.value })}
                      className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold text-plum-deep mt-1"
                    />
                  </div>

                  <div className="bg-plum-bg/40 border border-plum-soft rounded-2xl p-4 space-y-1.5">
                    <label className="block text-xs font-black text-plum-deep uppercase tracking-wider">
                      Advance Booking Window (Days)
                    </label>
                    <p className="text-[11px] text-slate-500">How many days in advance customers can book.</p>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={editingSettings['max_booking_days_ahead'] || '5'}
                      onChange={(e) => setEditingSettings({ ...editingSettings, max_booking_days_ahead: e.target.value })}
                      className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold text-plum-deep mt-1"
                    />
                  </div>
                </div>

                {/* Special Dates & Closed Holidays Section */}
                <div className="border-t border-plum-soft/60 pt-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-black text-sm text-plum-deep uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-teal-dark" />
                        <span>Special Dates & Holiday Hours</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mark specific public holidays or maintenance days as closed, or set custom hours.
                      </p>
                    </div>
                  </div>

                  {/* Add New Special Date Form */}
                  <div className="bg-plum-bg/30 border border-plum-soft rounded-2xl p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-plum-deep uppercase mb-1">Date</label>
                        <input
                          type="date"
                          value={newSpecialDate}
                          onChange={(e) => setNewSpecialDate(e.target.value)}
                          className="w-full bg-white border border-plum-soft rounded-xl px-3 py-1.5 text-xs font-semibold text-plum-deep"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-plum-deep uppercase mb-1">Reason / Note</label>
                        <input
                          type="text"
                          value={newSpecialReason}
                          onChange={(e) => setNewSpecialReason(e.target.value)}
                          placeholder="e.g. Public Holiday, Maintenance"
                          className="w-full bg-white border border-plum-soft rounded-xl px-3 py-1.5 text-xs text-plum-deep"
                        />
                      </div>

                      <div className="flex items-center sm:pt-6">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-plum-deep">
                          <input
                            type="checkbox"
                            checked={newSpecialClosed}
                            onChange={(e) => setNewSpecialClosed(e.target.checked)}
                            className="rounded border-plum-soft text-plum-primary focus:ring-0 cursor-pointer"
                          />
                          <span>Closed All Day</span>
                        </label>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleAddSpecialDate}
                          className="w-full bg-plum-deep hover:bg-plum-dark text-white font-extrabold text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Date</span>
                        </button>
                      </div>
                    </div>

                    {!newSpecialClosed && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-plum-soft/40">
                        <div>
                          <label className="block text-[11px] font-bold text-plum-deep uppercase mb-1">Special Opening Time</label>
                          <input
                            type="time"
                            value={newSpecialOpening}
                            onChange={(e) => setNewSpecialOpening(e.target.value)}
                            className="w-full bg-white border border-plum-soft rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-plum-deep"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-plum-deep uppercase mb-1">Special Closing Time</label>
                          <input
                            type="time"
                            value={newSpecialClosing}
                            onChange={(e) => setNewSpecialClosing(e.target.value)}
                            className="w-full bg-white border border-plum-soft rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-plum-deep"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* List of Special Dates */}
                  {Object.keys(specialDates).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No special or closed dates configured yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(specialDates).map(([dateKey, config]) => (
                        <div
                          key={dateKey}
                          className="p-3 bg-white border border-plum-soft rounded-2xl flex items-center justify-between text-xs shadow-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-plum-deep font-mono">{formatDateDisplay(dateKey)}</span>
                            {config.closed ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                                Closed All Day
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-100 text-teal-800 border border-teal-200">
                                Open: {config.opening_time ? formatTime12h(config.opening_time) : 'Default'} – {config.closing_time ? formatTime12h(config.closing_time) : 'Default'}
                              </span>
                            )}
                            {config.reason && (
                              <span className="text-slate-500 text-[11px] font-medium italic">
                                ({config.reason})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecialDate(dateKey)}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            title="Remove date"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-Tab 3: Loyalty Settings (Grouped with 1 Save button) */}
            {managementSubTab === 'loyalty' && (
              <div className="bg-white border border-plum-soft rounded-3xl p-6 shadow-xs space-y-6">
                <div className="border-b border-plum-soft/60 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-lg text-plum-deep font-display">
                      My Pet Rewards Loyalty Settings
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configure the loyalty program status and staff-facing reward description.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const toSave = {
                        loyalty_program_enabled: editingSettings['loyalty_program_enabled'] || 'true',
                        loyalty_reward_description: editingSettings['loyalty_reward_description'] || '1 Free Shower',
                      };
                      handleBatchSaveSettings(toSave, 'Loyalty settings saved successfully!');
                    }}
                    disabled={batchSaving}
                    className="bg-plum-deep hover:bg-plum-dark text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-teal-light" />
                    <span>{batchSaving ? 'Saving...' : 'Save Loyalty Settings'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-plum-bg/40 border border-plum-soft rounded-2xl p-4 space-y-1.5">
                    <label className="block text-xs font-black text-plum-deep uppercase tracking-wider">
                      Loyalty Program Status
                    </label>
                    <p className="text-[11px] text-slate-500">Enable or disable phone-based digital stamp tracking.</p>
                    <select
                      value={editingSettings['loyalty_program_enabled'] || 'true'}
                      onChange={(e) => setEditingSettings({ ...editingSettings, loyalty_program_enabled: e.target.value })}
                      className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold text-plum-deep mt-1"
                    >
                      <option value="true">Active (Enabled)</option>
                      <option value="false">Disabled (Off)</option>
                    </select>
                  </div>

                  <div className="bg-plum-bg/40 border border-plum-soft rounded-2xl p-4 space-y-1.5">
                    <label className="block text-xs font-black text-plum-deep uppercase tracking-wider">
                      Unlocked Gift Description (Staff & Admin)
                    </label>
                    <p className="text-[11px] text-slate-500">The actual reward unlocked after 3 completed visits.</p>
                    <input
                      type="text"
                      value={editingSettings['loyalty_reward_description'] || '1 Free Shower'}
                      onChange={(e) => setEditingSettings({ ...editingSettings, loyalty_reward_description: e.target.value })}
                      placeholder="1 Free Shower"
                      className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold text-plum-deep mt-1"
                    />
                  </div>
                </div>

                <div className="bg-plum-bg/30 border border-plum-soft/60 rounded-2xl p-4 text-xs text-slate-600 space-y-1">
                  <span className="font-bold text-plum-deep block">🐾 Customer Rewards Policy Reminder:</span>
                  <p>
                    Customers earn 1 stamp per eligible completed and paid grooming visit. 3 stamps unlock <strong>1 Free Shower</strong>.
                    The public customer banner remains generic (<em>&ldquo;🐾 Book 3 Times & Get a FREE Gift! 🎁&rdquo;</em>) while the administration dashboard shows the exact reward: <strong>1 Free Shower</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Sub-Tab 4: Telegram Notifications */}
            {managementSubTab === 'notifications' && (
              <div className="bg-white border border-plum-soft rounded-3xl p-6 shadow-xs space-y-6">
                <div className="border-b border-plum-soft/60 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-lg text-plum-deep font-display flex items-center gap-2">
                        <Send className="w-5 h-5 text-sky-600" />
                        <span>Telegram Notifications</span>
                      </h3>
                      {editingSettings['telegram_notifications_enabled'] === 'true' && editingSettings['telegram_bot_token'] && editingSettings['telegram_chat_id'] ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                          Not Configured / Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Receive instant automatic alerts on customer bookings, cancellations, and reschedules.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestTelegramNotification}
                      disabled={telegramTesting}
                      className="bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{telegramTesting ? 'Sending Test...' : 'Send Test Notification'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const toSave = {
                          telegram_notifications_enabled: editingSettings['telegram_notifications_enabled'] || 'false',
                          telegram_bot_token: editingSettings['telegram_bot_token'] || '',
                          telegram_chat_id: editingSettings['telegram_chat_id'] || '',
                        };
                        handleBatchSaveSettings(toSave, 'Telegram notification settings saved successfully!');
                      }}
                      disabled={batchSaving}
                      className="bg-plum-deep hover:bg-plum-dark text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="w-4 h-4 text-teal-light" />
                      <span>{batchSaving ? 'Saving...' : 'Save Settings'}</span>
                    </button>
                  </div>
                </div>

                {/* Management Recipient Banner */}
                <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-extrabold text-sky-900 block">
                      Target Management Recipient: +20 114 859 8927
                    </span>
                    <span className="text-sky-700 text-[11px] block mt-0.5">
                      Telegram bots require a private Chat ID. Follow the simple one-time setup guide below to link your bot.
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-white border border-sky-200 rounded-xl text-sky-800 font-mono font-bold text-xs self-start sm:self-auto">
                    Owner: +20 114 859 8927
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-plum-bg/40 border border-plum-soft rounded-2xl p-4 space-y-1.5">
                    <label className="block text-xs font-black text-plum-deep uppercase tracking-wider">
                      Notification Status
                    </label>
                    <p className="text-[11px] text-slate-500">Enable or disable automatic alerts.</p>
                    <select
                      value={editingSettings['telegram_notifications_enabled'] || 'false'}
                      onChange={(e) => setEditingSettings({ ...editingSettings, telegram_notifications_enabled: e.target.value })}
                      className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold text-plum-deep mt-1"
                    >
                      <option value="true">Active (Enabled)</option>
                      <option value="false">Disabled (Off)</option>
                    </select>
                  </div>

                  <div className="bg-plum-bg/40 border border-plum-soft rounded-2xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-plum-deep uppercase tracking-wider">
                        Telegram Bot Token
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowTelegramToken(!showTelegramToken)}
                        className="text-slate-400 hover:text-plum-deep p-0.5 text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        {showTelegramToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showTelegramToken ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">HTTP API token obtained from @BotFather.</p>
                    <input
                      type={showTelegramToken ? 'text' : 'password'}
                      value={editingSettings['telegram_bot_token'] || ''}
                      onChange={(e) => setEditingSettings({ ...editingSettings, telegram_bot_token: e.target.value })}
                      placeholder="123456789:ABC-DEF..."
                      className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-mono font-semibold text-plum-deep mt-1"
                    />
                  </div>

                  <div className="bg-plum-bg/40 border border-plum-soft rounded-2xl p-4 space-y-1.5">
                    <label className="block text-xs font-black text-plum-deep uppercase tracking-wider">
                      Telegram Chat ID
                    </label>
                    <p className="text-[11px] text-slate-500">Private chat ID for +20 114 859 8927.</p>
                    <input
                      type="text"
                      value={editingSettings['telegram_chat_id'] || ''}
                      onChange={(e) => setEditingSettings({ ...editingSettings, telegram_chat_id: e.target.value })}
                      placeholder="e.g. 123456789"
                      className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-mono font-semibold text-plum-deep mt-1"
                    />
                  </div>
                </div>

                {/* Step-by-Step Setup Guide */}
                <div className="bg-white border border-plum-soft rounded-2xl p-5 space-y-3">
                  <h4 className="font-extrabold text-xs text-plum-deep uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-dark" />
                    <span>Quick One-Time Telegram Bot Setup</span>
                  </h4>
                  <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>
                      Open Telegram on your phone (<strong>+20 114 859 8927</strong>) and search for <strong>@BotFather</strong>.
                    </li>
                    <li>
                      Send <code>/newbot</code>, give it a name (e.g. <em>My Pet Center Alert Bot</em>), and copy the <strong>HTTP API Token</strong> into the Bot Token field above.
                    </li>
                    <li>
                      Search for your newly created bot username in Telegram and tap <strong>Start</strong> (or send <code>/start</code>).
                    </li>
                    <li>
                      To get your numeric Chat ID, search for <strong>@userinfobot</strong> in Telegram and click Start. Copy the numeric <code>Id</code> into the Chat ID field above.
                    </li>
                    <li>
                      Click <strong>Save Settings</strong> above, then click <strong>Send Test Notification</strong> to confirm delivery!
                    </li>
                  </ol>
                </div>

                {/* Event Types Supported */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-plum-bg/30 border border-plum-soft rounded-xl">
                    <span className="font-bold text-plum-deep block">🐾 New Website Booking</span>
                    <span className="text-[11px] text-slate-500">Dispatched immediately after customer confirms booking.</span>
                  </div>
                  <div className="p-3 bg-plum-bg/30 border border-plum-soft rounded-xl">
                    <span className="font-bold text-plum-deep block">❌ Appointment Cancellation</span>
                    <span className="text-[11px] text-slate-500">Alerts staff with cancellation reason and slot info.</span>
                  </div>
                  <div className="p-3 bg-plum-bg/30 border border-plum-soft rounded-xl">
                    <span className="font-bold text-plum-deep block">🔄 Appointment Reschedule</span>
                    <span className="text-[11px] text-slate-500">Notifies of new date and time changes in real-time.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* ================= MODAL: APPOINTMENT DETAILS & ACTIONS ================= */}
      {detailsModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-plum-soft rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-plum-soft pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-dark block">
                  Appointment Details
                </span>
                <h3 className="font-black text-lg text-plum-deep font-display flex items-center gap-2">
                  <span>{formatTime12h(detailsModalBooking.start_time)}</span>
                  <span className="text-slate-400 font-normal">·</span>
                  <span>{detailsModalBooking.customer_name || 'Guest Customer'}</span>
                </h3>
              </div>
              <button
                onClick={() => setDetailsModalBooking(null)}
                className="text-slate-400 hover:text-plum-deep cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status & Key Info Banner */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-plum-bg/40 border border-plum-soft p-3 rounded-2xl">
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Booking ID</span>
                <span className="font-black text-plum-deep font-mono text-sm block mt-0.5">
                  {detailsModalBooking.booking_id}
                </span>
              </div>
              <div className="bg-plum-bg/40 border border-plum-soft p-3 rounded-2xl">
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Status</span>
                <span className="font-black text-plum-deep text-sm block mt-0.5 capitalize">
                  {detailsModalBooking.status}
                </span>
              </div>
            </div>

            {/* Customer Contact & Appointment Details */}
            <div className="bg-white border border-plum-soft rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-plum-soft/50 pb-2">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-plum-deep">{detailsModalBooking.customer_name || 'Guest'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-plum-soft/50 pb-2">
                <span className="text-slate-500">Phone:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-plum-deep font-mono">{detailsModalBooking.customer_phone || '—'}</span>
                  {detailsModalBooking.customer_phone && (
                    <>
                      <a
                        href={`https://wa.me/2${detailsModalBooking.customer_phone.replace(/^0/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 p-1"
                        title="WhatsApp Customer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`tel:${detailsModalBooking.customer_phone}`}
                        className="text-plum-deep hover:text-teal-dark p-1"
                        title="Call Customer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-plum-soft/50 pb-2">
                <span className="text-slate-500">Date:</span>
                <span className="font-bold text-plum-deep">{formatDateDisplay(detailsModalBooking.booking_date)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-plum-soft/50 pb-2">
                <span className="text-slate-500">Time Slot:</span>
                <span className="font-bold text-teal-dark font-mono">
                  {formatTime12h(detailsModalBooking.start_time)} – {formatTime12h(detailsModalBooking.end_time)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-plum-soft/50 pb-2">
                <span className="text-slate-500">Booking Source:</span>
                <span className="font-bold text-plum-deep uppercase">{detailsModalBooking.booking_source || 'website'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-plum-soft/50 pb-2">
                <span className="text-slate-500">Payment Status:</span>
                <span className="font-bold text-plum-deep capitalize">
                  {detailsModalBooking.payment_status || 'unpaid'}
                  {detailsModalBooking.final_invoice_amount && ` (${detailsModalBooking.final_invoice_amount} EGP)`}
                </span>
              </div>
              {detailsModalBooking.cancellation_reason && (
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900">
                  <span className="font-bold block">Cancellation / No-Show Reason:</span>
                  <span>{detailsModalBooking.cancellation_reason}</span>
                </div>
              )}
              {detailsModalBooking.special_notes && (
                <div className="bg-plum-bg/50 p-2.5 rounded-xl border border-plum-soft text-slate-700">
                  <span className="font-bold block text-plum-deep">Special Notes:</span>
                  <span>{detailsModalBooking.special_notes}</span>
                </div>
              )}
            </div>

            {/* Quick Actions inside Details Modal */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Appointment Actions
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Reschedule */}
                {detailsModalBooking.status !== 'cancelled' && detailsModalBooking.status !== 'no-show' && (
                  <button
                    onClick={() => {
                      const b = detailsModalBooking;
                      setDetailsModalBooking(null);
                      setReschedulingBooking(b);
                      setRescheduleDate(b.booking_date);
                      setRescheduleTime(b.start_time);
                    }}
                    className="bg-white hover:bg-plum-bg text-plum-deep border border-plum-soft font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5 text-teal-dark" />
                    <span>Reschedule</span>
                  </button>
                )}

                {/* Cancel */}
                {detailsModalBooking.status === 'confirmed' && (
                  <button
                    onClick={() => {
                      const b = detailsModalBooking;
                      setDetailsModalBooking(null);
                      setCancelModalBooking(b);
                      setCancelReason('Customer cancelled by phone');
                    }}
                    className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <X className="w-3.5 h-3.5 text-rose-600" />
                    <span>Cancel Booking</span>
                  </button>
                )}

                {/* Mark No-Show */}
                {detailsModalBooking.status === 'confirmed' && (
                  <button
                    onClick={() => {
                      const b = detailsModalBooking;
                      setDetailsModalBooking(null);
                      setNoShowModalBooking(b);
                      setNoShowReason('Customer failed to attend (No-show)');
                    }}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Ban className="w-3.5 h-3.5 text-slate-500" />
                    <span>Mark No-Show</span>
                  </button>
                )}

                {/* Edit Invoice if completed */}
                {detailsModalBooking.status === 'completed' && (
                  <button
                    onClick={() => {
                      const b = detailsModalBooking;
                      setDetailsModalBooking(null);
                      handleOpenInvoiceModal(b);
                    }}
                    className="bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-teal-700" />
                    <span>Edit Invoice / Payment</span>
                  </button>
                )}

                {/* Restore if Cancelled or No-Show */}
                {(detailsModalBooking.status === 'cancelled' || detailsModalBooking.status === 'no-show') && (
                  <button
                    onClick={() => {
                      const b = detailsModalBooking;
                      setDetailsModalBooking(null);
                      handleDirectStatusChange(b.id, 'confirmed');
                    }}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Restore to Confirmed</span>
                  </button>
                )}

                {/* Edit Customer Details */}
                <button
                  onClick={() => {
                    const b = detailsModalBooking;
                    setDetailsModalBooking(null);
                    setEditDetailsBooking(b);
                    setEditName(b.customer_name || '');
                    setEditPhone(b.customer_phone || '');
                    setEditNotes(b.special_notes || '');
                  }}
                  className="bg-white hover:bg-plum-bg text-plum-deep border border-plum-soft font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-plum-primary" />
                  <span>Edit Details</span>
                </button>

                {/* Audit History */}
                <button
                  onClick={() => {
                    const b = detailsModalBooking;
                    setDetailsModalBooking(null);
                    handleOpenAuditLogs(b);
                  }}
                  className="bg-white hover:bg-plum-bg text-slate-600 border border-plum-soft font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Audit History</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-plum-soft/60">
              <button
                onClick={() => setDetailsModalBooking(null)}
                className="w-full bg-plum-bg hover:bg-plum-soft/50 text-plum-deep font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


{/* ================= MODAL: INVOICE ENTRY & COMPLETION ================= */}
      {invoiceModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-plum-soft rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-plum-soft pb-3">
              <div>
                <h3 className="font-black text-base text-plum-deep font-display flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Record Final Invoice
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {invoiceModalBooking.booking_id} · {invoiceModalBooking.source?.toUpperCase() || 'WEBSITE'}
                </p>
              </div>
              <button
                onClick={() => setInvoiceModalBooking(null)}
                className="text-slate-400 hover:text-plum-deep"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-plum-bg p-3.5 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-plum-deep">
                Customer: {invoiceModalBooking.customer_name || 'Guest'} ({invoiceModalBooking.customer_phone || '—'})
              </p>
              <p className="text-slate-600">
                Scheduled: {formatDateDisplay(invoiceModalBooking.booking_date)} at {formatTime12h(invoiceModalBooking.start_time)}
              </p>
              <p className="text-[11px] text-slate-500">
                Entering a paid invoice will mark this booking as <strong>Completed</strong> and award 1 loyalty stamp if booked via website.
              </p>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Final Paid Invoice Amount (EGP) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full bg-white border border-plum-soft rounded-xl pl-3 pr-14 py-2.5 text-base font-black font-mono text-plum-deep focus:ring-2 focus:ring-plum-deep focus:outline-none"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    EGP
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                    Payment Status
                  </label>
                  <select
                    value={invoicePaymentStatus}
                    onChange={(e) => setInvoicePaymentStatus(e.target.value)}
                    className="w-full bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold text-plum-deep"
                  >
                    <option value="paid">✅ Paid</option>
                    <option value="unpaid">⏳ Unpaid</option>
                    <option value="refunded">↩️ Refunded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={invoicePaymentDate}
                    onChange={(e) => setInvoicePaymentDate(e.target.value)}
                    className="w-full bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold text-plum-deep"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Invoice Notes (Optional)
                </label>
                <input
                  type="text"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Grooming + extra bath, medicated shampoo..."
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-medium text-plum-deep"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInvoiceModalBooking(null)}
                  className="px-4 py-2 border border-plum-soft rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invoiceLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2 rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  {invoiceLoading ? 'Saving...' : 'Save & Mark Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CANCELLATION ================= */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div>
                <h3 className="font-black text-base text-rose-800 font-display flex items-center gap-2">
                  <Ban className="w-5 h-5 text-rose-600" />
                  Cancel Appointment
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {cancelModalBooking.booking_id}
                </p>
              </div>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-rose-900">
                Customer: {cancelModalBooking.customer_name || 'Guest'} ({cancelModalBooking.customer_phone || '—'})
              </p>
              <p className="text-rose-700">
                Scheduled: {formatDateDisplay(cancelModalBooking.booking_date)} at {formatTime12h(cancelModalBooking.start_time)}
              </p>
              <p className="text-[11px] text-rose-600 mt-1">
                ⚠️ Cancelling will <strong>immediately release this slot</strong> so other customers can book it.
              </p>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Reason for Cancellation
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold text-plum-deep mb-2"
                >
                  <option value="Customer cancelled by phone">Customer cancelled by phone</option>
                  <option value="Customer cancelled via WhatsApp">Customer cancelled via WhatsApp</option>
                  <option value="Customer requested rescheduling">Customer requested rescheduling</option>
                  <option value="Emergency / Pet unwell">Emergency / Pet unwell</option>
                  <option value="Duplicate booking">Duplicate booking</option>
                  <option value="Other / Staff cancellation">Other</option>
                </select>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Specify cancellation note..."
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold text-plum-deep"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalBooking(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50"
                >
                  Keep Active
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                >
                  <Ban className="w-4 h-4" />
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: LOYALTY REWARD REDEMPTION ================= */}
      {redeemCustomerPhone && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-teal-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-teal-100 pb-3">
              <div>
                <h3 className="font-black text-base text-teal-800 font-display flex items-center gap-2">
                  <Gift className="w-5 h-5 text-teal-600" />
                  Redeem My Pet Reward
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Customer: {redeemCustomerPhone}
                </p>
              </div>
              <button
                onClick={() => setRedeemCustomerPhone('')}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-teal-800 font-bold text-sm">
                <span>🎁 Free Grooming Add-On Reward</span>
              </div>
              <p className="text-teal-700 text-xs">
                This customer has earned 3+ loyalty stamps from completed website visits. Redeeming will mark the reward as claimed and record your staff ID.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Redemption Note / Perk Applied
                </label>
                <input
                  type="text"
                  value={redeemNotes}
                  onChange={(e) => setRedeemNotes(e.target.value)}
                  placeholder="e.g. Complimentary blueberry facial bath & nail trim"
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-medium text-plum-deep"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRedeemCustomerPhone('')}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={redeemLoading}
                  onClick={() => handleRedeemLoyalty(redeemCustomerPhone, redeemNotes)}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs px-5 py-2 rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                >
                  <Award className="w-4 h-4" />
                  {redeemLoading ? 'Redeeming...' : 'Confirm Redemption'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MANUAL BOOKING ================= */}
      {manualBookingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-plum-soft rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-plum-soft pb-3">
              <h3 className="font-black text-base text-plum-deep font-display">
                Create Manual Appointment
              </h3>
              <button onClick={() => setManualBookingModalOpen(false)} className="text-slate-400 hover:text-plum-deep">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2.5 text-xs font-bold text-plum-deep"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Egyptian Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2.5 text-xs font-bold font-mono text-plum-deep"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                    Booking Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold text-plum-deep"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    step="3600"
                    required
                    value={manualTime.substring(0, 5)}
                    onChange={(e) => setManualTime(e.target.value + ':00')}
                    className="w-full bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold font-mono text-plum-deep"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Booking Channel / Source
                </label>
                <select
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value)}
                  className="w-full bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold text-plum-deep"
                >
                  <option value="phone">📞 Phone Call</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="walk-in">🚶 Walk-in</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Special Notes (Optional)
                </label>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  rows={2}
                  placeholder="Breed, special requests..."
                  className="w-full bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2 text-xs font-medium text-plum-deep"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualBookingModalOpen(false)}
                  className="px-4 py-2 border border-plum-soft rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualLoading}
                  className="bg-teal-primary hover:bg-teal-dark text-plum-deep font-black text-xs px-5 py-2 rounded-xl cursor-pointer"
                >
                  {manualLoading ? 'Saving...' : 'Create Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NO-SHOW / PHONE CANCELLATION ================= */}
      {noShowModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-plum-soft rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-plum-soft pb-3">
              <h3 className="font-black text-base text-plum-deep font-display">
                Mark as No-Show / Cancelled
              </h3>
              <button onClick={() => setNoShowModalBooking(null)} className="text-slate-400 hover:text-plum-deep">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-plum-bg p-3.5 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-plum-deep">
                Booking: {noShowModalBooking.booking_id}
              </p>
              <p className="text-slate-600">
                Customer: {noShowModalBooking.customer_name || 'Guest'} ({noShowModalBooking.customer_phone || '—'})
              </p>
              <p className="text-slate-600">
                Time: {formatDateDisplay(noShowModalBooking.booking_date)} at {formatTime12h(noShowModalBooking.start_time)}
              </p>
            </div>

            <p className="text-xs text-slate-600">
              This action will release the slot for other customers while keeping this appointment record in history.
            </p>

            <form onSubmit={handleConfirmNoShow} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Reason for Cancellation
                </label>
                <select
                  value={noShowReason}
                  onChange={(e) => setNoShowReason(e.target.value)}
                  className="w-full bg-plum-bg/40 border border-plum-soft rounded-xl px-3 py-2 text-xs font-bold text-plum-deep mb-2"
                >
                  <option value="Customer cancelled by phone">Customer cancelled by phone</option>
                  <option value="Customer cancelled via WhatsApp">Customer cancelled via WhatsApp</option>
                  <option value="Customer failed to attend">Customer failed to attend (No-show)</option>
                  <option value="Customer requested rescheduling">Customer requested rescheduling</option>
                  <option value="Other / Staff cancellation">Other</option>
                </select>
                <input
                  type="text"
                  value={noShowReason}
                  onChange={(e) => setNoShowReason(e.target.value)}
                  placeholder="Custom internal reason..."
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold text-plum-deep"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNoShowModalBooking(null)}
                  className="px-4 py-2 border border-plum-soft rounded-xl text-xs font-bold cursor-pointer"
                >
                  Keep Active
                </button>
                <button
                  type="submit"
                  disabled={noShowLoading}
                  className="bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  {noShowLoading ? 'Updating...' : 'Confirm No-Show & Release Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT CUSTOMER DETAILS ================= */}
      {editDetailsBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-plum-soft rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-plum-soft pb-3">
              <h3 className="font-black text-base text-plum-deep font-display">
                Edit Appointment Details
              </h3>
              <button onClick={() => setEditDetailsBooking(null)} className="text-slate-400 hover:text-plum-deep">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold text-plum-deep"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Customer Phone
                </label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold font-mono text-plum-deep"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Special Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-medium text-plum-deep"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditDetailsBooking(null)}
                  className="px-4 py-2 border border-plum-soft rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editDetailsLoading}
                  className="bg-plum-deep hover:bg-plum-dark text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  {editDetailsLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESCHEDULE ================= */}
      {reschedulingBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-plum-soft rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-plum-soft pb-3">
              <h3 className="font-black text-base text-plum-deep font-display">
                Reschedule Booking: {reschedulingBooking.booking_id}
              </h3>
              <button onClick={() => setReschedulingBooking(null)} className="text-slate-400 hover:text-plum-deep">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  New Appointment Date
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold text-plum-deep"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  New Start Time
                </label>
                <input
                  type="time"
                  step="3600"
                  required
                  value={rescheduleTime.substring(0, 5)}
                  onChange={(e) => setRescheduleTime(e.target.value + ':00')}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold font-mono text-plum-deep"
                />
                <p className="text-[10px] text-slate-400 mt-1">Friday starts at 3 PM · Other days start at 12 PM</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReschedulingBooking(null)}
                  className="px-4 py-2 border border-plum-soft rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleLoading}
                  className="bg-plum-deep hover:bg-plum-dark text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  {rescheduleLoading ? 'Checking...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: AUDIT LOGS ================= */}
      {auditModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-plum-soft rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-plum-soft pb-3">
              <div>
                <h3 className="font-black text-base text-plum-deep font-display">
                  Audit History: {auditModalBooking.booking_id}
                </h3>
                <p className="text-xs text-slate-500">Track all status changes, edits, and staff actions</p>
              </div>
              <button onClick={() => setAuditModalBooking(null)} className="text-slate-400 hover:text-plum-deep">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 pr-1">
              {auditLoading ? (
                <div className="text-center py-8 text-xs text-slate-500">Loading audit history...</div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">No audit events recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-plum-bg/40 border border-plum-soft rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-plum-deep">
                      <span className="capitalize">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700">
                      <strong>By:</strong> {log.user_name || 'System / Customer'}
                    </p>
                    {log.new_value && (
                      <p className="text-slate-600 font-mono text-[11px]">{log.new_value}</p>
                    )}
                    {log.reason && (
                      <p className="text-slate-500 italic">
                        <strong>Reason:</strong> {log.reason}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-plum-soft pt-3 flex justify-end">
              <button
                onClick={() => setAuditModalBooking(null)}
                className="bg-plum-bg hover:bg-plum-soft text-plum-deep text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CUSTOMER HISTORY ================= */}
      {historyCustomerPhone && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-plum-soft rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-plum-soft pb-3">
              <div>
                <h3 className="font-black text-base text-plum-deep font-display">
                  Customer History: {historyCustomerPhone}
                </h3>
                <p className="text-xs text-slate-500">Complete appointment track record for this phone number</p>
              </div>
              <button onClick={() => setHistoryCustomerPhone('')} className="text-slate-400 hover:text-plum-deep">
                <X className="w-5 h-5" />
              </button>
            </div>

            {historyLoading ? (
              <div className="text-center py-8 text-xs text-slate-500">Loading customer history...</div>
            ) : customerHistory ? (
              <div className="space-y-4 flex-grow overflow-y-auto pr-1">
                {/* Lifetime Spend & Loyalty Status Card */}
                <div className="bg-gradient-to-br from-plum-bg via-white to-teal-50 border border-plum-soft rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-plum-soft/50 pb-2.5">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-dark block">
                        My Pet Rewards & Lifetime Value
                      </span>
                      <span className="font-bold text-plum-deep text-xs">
                        Customer Loyalty Status
                      </span>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Lifetime Revenue</span>
                      <span className="font-mono font-black text-plum-deep text-sm">
                        {Number(customerHistory.total_paid_revenue || 0).toLocaleString()} EGP
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white/80 border border-plum-soft/60 p-2.5 rounded-xl">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">Current Stamps</span>
                      <span className="font-black text-plum-deep text-base">
                        {customerHistory.loyalty_stamps || 0} / 3
                      </span>
                    </div>
                    <div className="bg-white/80 border border-plum-soft/60 p-2.5 rounded-xl">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">Earned Reward</span>
                      <span className="font-black text-plum-deep text-xs block mt-1">
                        1 Free Shower
                      </span>
                    </div>
                    <div className="bg-white/80 border border-plum-soft/60 p-2.5 rounded-xl">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">Availability</span>
                      <span className={`font-black text-xs block mt-1 ${customerHistory.reward_available ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {customerHistory.reward_available ? 'Ready to Redeem' : 'In Progress'}
                      </span>
                    </div>
                    <div className="bg-white/80 border border-plum-soft/60 p-2.5 rounded-xl">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">Redeemed</span>
                      <span className="font-black text-teal-800 text-base">
                        {customerHistory.rewards_redeemed || 0}
                      </span>
                    </div>
                  </div>

                  {customerHistory.reward_available && (
                    <div className="pt-1 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <div>
                        <span className="font-extrabold text-xs text-emerald-900 block">🎁 Reward Ready: 1 Free Shower</span>
                        <span className="text-[11px] text-emerald-700">Customer completed 3 eligible website visits.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRedeemCustomerPhone(historyCustomerPhone);
                          setRedeemNotes('1 Free Shower reward redemption');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Redeem 1 Free Shower</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-plum-bg rounded-xl">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Total</span>
                    <span className="text-lg font-black text-plum-deep">{customerHistory.total_appointments}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-xl">
                    <span className="text-emerald-700 block text-[10px] font-bold uppercase">Confirmed</span>
                    <span className="text-lg font-black text-emerald-800">{customerHistory.confirmed_appointments}</span>
                  </div>
                  <div className="p-2.5 bg-teal-50 rounded-xl">
                    <span className="text-teal-700 block text-[10px] font-bold uppercase">Completed</span>
                    <span className="text-lg font-black text-teal-800">{customerHistory.completed_appointments}</span>
                  </div>
                  <div className="p-2.5 bg-slate-100 rounded-xl">
                    <span className="text-slate-600 block text-[10px] font-bold uppercase">No-Show / Cancel</span>
                    <span className="text-lg font-black text-slate-700">{customerHistory.no_show_appointments}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase text-plum-deep tracking-wider">
                    Appointment History
                  </h4>
                  {customerHistory.bookings.map((b) => (
                    <div key={b.id} className="p-3 bg-white border border-plum-soft rounded-2xl flex items-center justify-between text-xs shadow-xs">
                      <div>
                        <span className="font-mono font-bold text-plum-deep">{b.booking_id}</span>
                        <span className="text-slate-500 ml-2">
                          {formatDateDisplay(b.booking_date)} at {formatTime12h(b.start_time)}
                        </span>
                        {b.cancellation_reason && (
                          <span className="block text-[10px] text-slate-400 italic">
                            Reason: {b.cancellation_reason}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${b.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'completed'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-plum-soft pt-3 flex justify-end">
              <button
                onClick={() => setHistoryCustomerPhone('')}
                className="bg-plum-bg hover:bg-plum-soft text-plum-deep text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: BLOCK SLOT ================= */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-plum-soft rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-plum-soft pb-3">
              <h3 className="font-black text-base text-plum-deep font-display">
                Block Grooming Slot
              </h3>
              <button onClick={() => setBlockModalOpen(false)} className="text-slate-400 hover:text-plum-deep">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBlockSlotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold text-plum-deep"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  step="3600"
                  required
                  value={blockTime.substring(0, 5)}
                  onChange={(e) => setBlockTime(e.target.value + ':00')}
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold font-mono text-plum-deep"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-plum-deep uppercase tracking-wider mb-1">
                  Reason for Block
                </label>
                <input
                  type="text"
                  required
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Staff Maintenance / Cleaning"
                  className="w-full bg-white border border-plum-soft rounded-xl px-3 py-2 text-xs font-semibold text-plum-deep"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBlockModalOpen(false)}
                  className="px-4 py-2 border border-plum-soft rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={blockLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  {blockLoading ? 'Blocking...' : 'Block Time Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
