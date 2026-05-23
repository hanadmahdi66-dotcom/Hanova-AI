import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, Clock, Check, X, Shield, RefreshCw, LogOut, Search, 
  Trash2, Edit, Save, Database, TrendingUp
} from 'lucide-react';
import { User, PaymentRequest, AppStats } from '../types';

interface AdminPanelProps {
  adminEmail: string;
  onLogout: () => void;
}

export default function AdminPanel({ adminEmail, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'payments' | 'users' | 'analytics'>('payments');
  const [stats, setStats] = useState<AppStats>({
    totalUsers: 0,
    pendingPaymentsCount: 0,
    approvedPaymentsCount: 0,
    totalRevenue: 0
  });

  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing direct accounts
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedPlan, setEditedPlan] = useState<any>('Free');
  const [editedStatus, setEditedStatus] = useState<any>('none');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const emailParam = encodeURIComponent(adminEmail);
      
      const statsRes = await fetch(`/api/admin/stats?adminEmail=${emailParam}`);
      const statsData = await statsRes.json();
      if (statsRes.ok) {
        setStats(statsData);
      }

      const payRes = await fetch(`/api/admin/payments?adminEmail=${emailParam}`);
      const payData = await payRes.json();
      if (payRes.ok) {
        setPayments(payData);
      }

      const usersRes = await fetch(`/api/admin/users?adminEmail=${emailParam}`);
      const usersData = await usersRes.json();
      if (usersRes.ok) {
        setUsers(usersData);
      }
    } catch (err) {
      console.error('Error fetching admin details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [adminEmail]);

  const handleApprove = async (paymentId: string | null, userGmail: string) => {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          paymentId,
          userGmail
        })
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error approving user:', err);
    }
  };

  const handleReject = async (paymentId: string | null, userGmail: string) => {
    try {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          paymentId,
          userGmail
        })
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error rejecting user:', err);
    }
  };

  const handleDeleteUser = async (userGmail: string) => {
    if (!confirm(`Are you absolutely sure you want to permanently delete user account ${userGmail}? This action is irreversible.`)) return;
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          userGmail
        })
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user.gmail);
    setEditedName(user.name);
    setEditedPlan(user.plan);
    setEditedStatus(user.paymentStatus);
  };

  const saveEditedUser = async (gmail: string) => {
    try {
      const res = await fetch('/api/admin/edit-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          gmail,
          name: editedName,
          plan: editedPlan,
          paymentStatus: editedStatus
        })
      });
      if (res.ok) {
        setEditingUser(null);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error updating user outline:', err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.gmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 flex flex-col justify-between border-8 border-slate-100">
      
      {/* Admin header */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4.5 flex justify-between items-center">
          <div className="flex items-center space-x-3.5">
            <div className="p-2 bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-xl">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-sans font-black text-xl tracking-tighter text-slate-900 uppercase leading-none">Hanova Admin Desk</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Workspace Management Platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 uppercase tracking-wider">
              Admin: {adminEmail}
            </span>
            <button
              type="button"
              onClick={fetchAdminData}
              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="p-2 bg-white hover:bg-red-50 border border-slate-200 rounded-xl text-slate-600 hover:text-red-600 transition-all cursor-pointer shadow-sm"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Control Widgets Grid */}
      <div className="max-w-7xl w-full mx-auto px-6 py-8 flex-grow">
        
        {/* Statistics Dashboard widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border-2 border-slate-100 rounded-[24px] p-6 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold text-slate-400">Registered Accounts</span>
              <p className="text-4xl font-sans font-black text-slate-900 tracking-tight">{stats.totalUsers}</p>
            </div>
            <div className="p-3.5 bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-2xl shadow-sm">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border-2 border-slate-100 rounded-[24px] p-6 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold text-slate-400">Pending Approvals</span>
              <p className="text-4xl font-sans font-black text-rose-600 tracking-tight">{stats.pendingPaymentsCount}</p>
            </div>
            <div className="p-3.5 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-2xl shadow-sm">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border-2 border-slate-100 rounded-[24px] p-6 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold text-slate-400">Revenue Generated</span>
              <p className="text-4xl font-sans font-black text-emerald-600 tracking-tight">${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="p-3.5 bg-emerald-50 border-2 border-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border-2 border-slate-100 rounded-[24px] p-6 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold text-slate-400">Growth Stats</span>
              <p className="text-lg font-sans font-black text-slate-900 uppercase">SYSTEM ONLINE</p>
              <p className="text-[10px] text-slate-400 font-mono tracking-wide uppercase font-bold italic mt-1">Somalia Telesom Connected</p>
            </div>
            <div className="p-3.5 bg-slate-50 border-2 border-slate-150 text-slate-900 rounded-3xl shadow-sm">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 border border-slate-200/60 rounded-2xl p-1 mb-6 max-w-sm shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-2.5 text-center text-xs font-sans font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === 'payments' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Payments Ledgers
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('users');
              setSearchQuery('');
            }}
            className={`flex-1 py-2.5 text-center text-xs font-sans font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === 'users' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900'
            }`}
          >
            User Database
          </button>
        </div>

        {/* Dynamic Display Area */}
        <div className="bg-white border-2 border-slate-100 rounded-[32px] p-6 md:p-8 min-h-[400px] shadow-sm">
          {loading && (
            <div className="flex justify-center items-center py-24">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          )}

          {!loading && activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <h3 className="text-xl font-sans font-black text-slate-900 uppercase tracking-tight">Zaad Mobile Requests Ledger</h3>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Interactive Verification Ledger</span>
              </div>

              {payments.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Database className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">No pending registration requests submitted</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-[#FAFAFA] text-slate-500 uppercase tracking-wider font-mono text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-4 px-4 font-extrabold">User details</th>
                        <th className="py-4 px-4 font-extrabold">Selected Plan</th>
                        <th className="py-4 px-4 font-extrabold">Price Amount</th>
                        <th className="py-4 px-4 font-extrabold">Date Registered</th>
                        <th className="py-4 px-4 font-extrabold text-center">Payment Status</th>
                        <th className="py-4 px-4 font-extrabold text-center">Quick Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-[#FAFAFA]/50 transition-colors">
                          <td className="py-4.5 px-4 font-sans text-slate-900">
                            <span className="font-black block text-sm">{p.name}</span>
                            <span className="font-mono text-[10px] text-slate-400 font-bold block">{p.gmail}</span>
                          </td>
                          <td className="py-4.5 px-4 font-black uppercase text-blue-600">
                            {p.planName}
                          </td>
                          <td className="py-4.5 px-4 font-mono font-black text-slate-900 text-sm">
                            ${p.amount.toFixed(2)}
                          </td>
                          <td className="py-4.5 px-4 font-mono text-[10px] text-slate-400 font-bold">
                            {new Date(p.createdAt).toLocaleString()}
                          </td>
                          <td className="py-4.5 px-4 text-center">
                            <span className={`text-[9px] font-mono uppercase px-2.5 py-1 rounded-full font-black border ${
                              p.status === 'pending'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : p.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-4.5 px-4 text-center">
                            {p.status === 'pending' ? (
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleApprove(p.id, p.gmail)}
                                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer text-[10px] font-sans font-black uppercase tracking-widest flex items-center space-x-1"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReject(p.id, p.gmail)}
                                  className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all cursor-pointer text-[10px] font-sans font-black uppercase tracking-widest flex items-center space-x-1"
                                >
                                  <X className="h-3 w-3" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Ledger Verified</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200">
                <h3 className="text-xl font-sans font-black text-slate-900 uppercase tracking-tight">Enrollment Database</h3>
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or gmail..."
                    className="w-full bg-[#FAFAFA] border-2 border-slate-100 focus:border-blue-500 text-slate-900 placeholder-slate-400 rounded-xl py-2 pl-9 pr-4 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <Users className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">No corresponding records match query</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-[#FAFAFA] text-slate-500 uppercase tracking-wider font-mono text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-4 px-4 font-extrabold">User details</th>
                        <th className="py-4 px-4 font-extrabold text-center">Plan Package</th>
                        <th className="py-4 px-4 font-extrabold text-center">Verified payment Status</th>
                        <th className="py-4 px-4 font-extrabold text-center">Daily Quota (Used/20)</th>
                        <th className="py-4 px-4 font-extrabold text-center">Creation Date</th>
                        <th className="py-4 px-4 font-extrabold text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => {
                        const isEditing = editingUser === u.gmail;
                        return (
                          <tr key={u.gmail} className="hover:bg-[#FAFAFA]/50 transition-colors">
                            <td className="py-4.5 px-4">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editedName}
                                  onChange={(e) => setEditedName(e.target.value)}
                                  className="bg-white border-2 border-slate-200 text-xs font-bold rounded-lg p-1.5 text-slate-900 max-w-[120px]"
                                />
                              ) : (
                                <span className="font-black text-slate-900 block text-sm">{u.name}</span>
                              )}
                              <span className="font-mono text-[10px] text-slate-400 block font-bold mt-0.5">{u.gmail}</span>
                            </td>
                            <td className="py-4.5 px-4 text-center font-black uppercase text-blue-600">
                              {isEditing ? (
                                <select
                                  value={editedPlan}
                                  onChange={(e) => setEditedPlan(e.target.value as any)}
                                  className="bg-white text-xs border-2 border-slate-200 rounded-lg p-1.5 text-slate-900 font-bold"
                                >
                                  <option value="Free">Free</option>
                                  <option value="Basic">Basic</option>
                                  <option value="Standard">Standard</option>
                                  <option value="Premium">Premium</option>
                                </select>
                              ) : (
                                <span>{u.plan}</span>
                              )}
                            </td>
                            <td className="py-4.5 px-4 text-center">
                              {isEditing ? (
                                <select
                                  value={editedStatus}
                                  onChange={(e) => setEditedStatus(e.target.value as any)}
                                  className="bg-white text-xs border-2 border-slate-200 rounded-lg p-1.5 text-slate-900 font-bold"
                                >
                                  <option value="none">none</option>
                                  <option value="pending">pending</option>
                                  <option value="approved">approved</option>
                                  <option value="rejected">rejected</option>
                                </select>
                              ) : (
                                <span className={`text-[9px] font-mono uppercase px-2 py-1 rounded-full font-black border ${
                                  u.paymentStatus === 'pending'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : u.paymentStatus === 'approved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200/60'
                                }`}>
                                  {u.paymentStatus}
                                </span>
                              )}
                            </td>
                            <td className="py-4.5 px-4 text-center font-mono font-black text-slate-900 text-xs">
                              {u.plan === 'Free' ? `${u.dailyUploadsCount || 0} / 20` : 'Infinite'}
                            </td>
                            <td className="py-4.5 px-4 font-mono text-[10px] text-slate-400 font-bold text-center">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-4.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {isEditing ? (
                                  <button
                                    type="button"
                                    onClick={() => saveEditedUser(u.gmail)}
                                    className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all cursor-pointer shadow-sm"
                                    title="Save Credentials"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => startEditUser(u)}
                                    className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-all cursor-pointer shadow-sm"
                                    title="Edit Profile"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                )}

                                {u.gmail !== 'hanadmahdi66@gmail.com' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u.gmail)}
                                    className="p-2 bg-red-50 border border-red-100 hover:bg-rose-600 hover:text-white text-rose-600 rounded-lg transition-all cursor-pointer shadow-sm"
                                    title="Delete Account"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="bg-white border-t border-slate-200 py-6 text-center">
        <p className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">
          Powered by MHHS GAME INC &bull; Secure Administration Desk
        </p>
      </footer>
    </div>
  );
}
