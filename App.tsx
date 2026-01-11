
import React, { useState, useEffect, useRef } from 'react';
import { RentRecord, User, MONTHS, BANKS, BRANCHES } from './types';
import { Receipt } from './components/Receipt';
import { generateProfessionalMessage } from './services/geminiService';

const BRAND_LOGO_URL = "https://img.icons8.com/fluency/240/circuit.png";
const STORAGE_PREFIX = "ait_solution_v1";

// Master User Data
const MASTER_LANDLORD: User = {
  id: "master-landlord-id",
  fullName: "Happy Home Owner",
  propertyName: "Happy Home",
  role: "Landlord",
  mobileNumber: "01757317453",
  password: "12345",
  profilePicture: ""
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [records, setRecords] = useState<RentRecord[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'form' | 'receipt' | 'history' | 'auth' | 'tenant-list' | 'summary'>('auth');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  const [activeRecord, setActiveRecord] = useState<RentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<User | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    userId: '', 
    tenantName: '',
    flatNumber: '',
    mobileNumber: '',
    rentMonth: MONTHS[new Date().getMonth()] as string,
    rentAmount: '',
    paymentMethod: 'Cash' as 'Cash' | 'Bank' | 'MFS',
    mfsNumber: ''
  });

  const [authData, setAuthData] = useState({
    fullName: '',
    propertyName: '',
    mobileNumber: '',
    password: '',
    role: 'Landlord' as 'Landlord' | 'Tenant',
    profilePicture: '',
    propertyOwnerId: ''
  });

  // Initial Data and Master User Setup
  useEffect(() => {
    const savedUsers = localStorage.getItem(`${STORAGE_PREFIX}_users`);
    let allUsers: User[] = savedUsers ? JSON.parse(savedUsers) : [];
    
    if (!allUsers.some(u => u.mobileNumber === MASTER_LANDLORD.mobileNumber)) {
      allUsers = [MASTER_LANDLORD, ...allUsers];
      localStorage.setItem(`${STORAGE_PREFIX}_users`, JSON.stringify(allUsers));
    }
    setUsers(allUsers);
    
    const savedRecords = localStorage.getItem(`${STORAGE_PREFIX}_records`);
    if (savedRecords) setRecords(JSON.parse(savedRecords));
    
    const loggedInUserId = localStorage.getItem(`${STORAGE_PREFIX}_session`);
    if (loggedInUserId) {
      const user = allUsers.find(u => u.id === loggedInUserId);
      if (user) {
        setCurrentUser(user);
        setCurrentView('dashboard');
      }
    }
  }, []);

  useEffect(() => { 
    localStorage.setItem(`${STORAGE_PREFIX}_users`, JSON.stringify(users)); 
  }, [users]);

  useEffect(() => { 
    localStorage.setItem(`${STORAGE_PREFIX}_records`, JSON.stringify(records)); 
  }, [records]);

  const handleBackup = () => {
    const data = {
      app: "AIT SOLUTION",
      users,
      records,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ait_backup_${new Date().toLocaleDateString()}.json`;
    a.click();
    alert(`ডাটা ব্যাকআপ তৈরি হয়েছে এবং ডাউনলোড হয়েছে।`);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (confirm("আপনি কি নিশ্চিতভাবে লগ আউট করতে চান?")) {
      localStorage.removeItem(`${STORAGE_PREFIX}_session`);
      window.location.reload();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAuthData(prev => ({ ...prev, profilePicture: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'register') {
      if (users.some(u => u.mobileNumber === authData.mobileNumber)) {
        alert("মোবাইল নম্বরটি ইতিমধ্যে নিবন্ধিত।"); return;
      }
      const newUser: User = { id: crypto.randomUUID(), ...authData };
      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      localStorage.setItem(`${STORAGE_PREFIX}_session`, newUser.id);
    } else {
      const user = users.find(u => u.mobileNumber === authData.mobileNumber && u.password === authData.password);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem(`${STORAGE_PREFIX}_session`, user.id);
      } else {
        alert("ভুল মোবাইল নম্বর অথবা পাসওয়ার্ড।"); return;
      }
    }
    setCurrentView('dashboard');
  };

  const handleRentEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId) { alert("অনুগ্রহ করে একজন ভাড়াটিয়া নির্বাচন করুন।"); return; }
    const alreadyPaid = records.some(r => r.userId === formData.userId && r.rentMonth === formData.rentMonth);
    if (alreadyPaid) { alert(`${formData.rentMonth} মাসের জন্য ইতিমধ্যে এন্ট্রি করা হয়েছে।`); return; }

    setIsLoading(true);
    const newRecord: RentRecord = {
      id: crypto.randomUUID(),
      userId: formData.userId,
      tenantName: formData.tenantName,
      ...formData,
      rentAmount: parseFloat(formData.rentAmount),
      paymentDate: new Date().toISOString(),
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`
    };

    setRecords(prev => [newRecord, ...prev]);
    setActiveRecord(newRecord);
    const msg = await generateProfessionalMessage(newRecord);
    setAiMessage(msg);
    setCurrentView('receipt');
    setIsLoading(false);
  };

  const updateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setUsers(prev => prev.map(u => u.id === editingTenant.id ? editingTenant : u));
    setEditingTenant(null);
    alert("তথ্য আপডেট করা হয়েছে।");
  };

  const deleteTenant = (id: string) => {
    if (confirm("আপনি কি নিশ্চিতভাবে এই ভাড়াটিয়াকে ডিলেট করতে চান?")) {
      setUsers(prev => prev.filter(u => u.id !== id));
      setRecords(prev => prev.filter(r => r.userId !== id));
    }
  };

  const myLandlord = users.find(u => u.id === currentUser?.propertyOwnerId);
  const myTenants = users.filter(u => u.propertyOwnerId === currentUser?.id);
  const myRecords = currentUser?.role === 'Landlord' 
    ? records.filter(r => myTenants.some(t => t.id === r.userId)) 
    : records.filter(r => r.userId === currentUser?.id);
  const totalCollected = myRecords.reduce((acc, r) => acc + r.rentAmount, 0);

  const UserAvatar = ({ user, size = "w-10 h-10" }: { user: User | null, size?: string }) => (
    <div className={`${size} rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner`}>
      {user?.profilePicture ? <img src={user.profilePicture} className="w-full h-full object-cover" alt="P" /> : <i className="fas fa-user text-indigo-400"></i>}
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-indigo-600 p-8 text-white text-center">
            <div className="bg-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-2 overflow-hidden">
              <img src={BRAND_LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">AIT SOLUTION</h1>
            <p className="text-indigo-100 text-xs font-bold opacity-80 uppercase tracking-widest mt-1">ভাড়া ব্যবস্থাপনা সিস্টেম</p>
          </div>
          <form onSubmit={handleAuthSubmit} className="p-8 space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-2">
              <button type="button" onClick={() => setAuthMode('login')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${authMode === 'login' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>লগইন</button>
              <button type="button" onClick={() => setAuthMode('register')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${authMode === 'register' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>রেজিস্ট্রেশন</button>
            </div>
            {authMode === 'register' && (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className="relative group">
                    <UserAvatar user={authData as any} size="w-20 h-20" />
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <div className="absolute bottom-0 right-0 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white pointer-events-none"><i className="fas fa-camera text-[8px]"></i></div>
                  </div>
                </div>
                <input required placeholder="আপনার পূর্ণ নাম" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={authData.fullName} onChange={e => setAuthData({...authData, fullName: e.target.value})} />
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={authData.role} onChange={e => setAuthData({...authData, role: e.target.value as any})}>
                  <option value="Landlord">বাড়ীর মালিক (Landlord)</option>
                  <option value="Tenant">ভাড়াটিয়া (Tenant)</option>
                </select>
                {authData.role === 'Landlord' ? (
                  <input required placeholder="প্রপার্টির নাম (যেমন: Happy Home)" className="w-full px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold" value={authData.propertyName} onChange={e => setAuthData({...authData, propertyName: e.target.value})} />
                ) : (
                  <select required className="w-full px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-indigo-700" value={authData.propertyOwnerId} onChange={e => setAuthData({...authData, propertyOwnerId: e.target.value})}>
                    <option value="">-- বাড়ীর মালিক নির্বাচন করুন --</option>
                    {users.filter(u => u.role === 'Landlord').map(l => <option key={l.id} value={l.id}>{l.propertyName || l.fullName}</option>)}
                  </select>
                )}
              </div>
            )}
            <input required type="tel" placeholder="মোবাইল নম্বর" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={authData.mobileNumber} onChange={e => setAuthData({...authData, mobileNumber: e.target.value})} />
            <input required type="password" placeholder="পাসওয়ার্ড" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})} />
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-lg shadow-lg hover:bg-indigo-700 active:scale-[0.98]">
              {authMode === 'register' ? 'নিবন্ধন করুন' : 'লগইন করুন'}
            </button>
          </form>
          <div className="px-8 pb-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">AIT Solution Rent Manager</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {editingTenant && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center font-black">তথ্য পরিবর্তন<button onClick={() => setEditingTenant(null)}><i className="fas fa-times"></i></button></div>
            <form onSubmit={updateTenant} className="p-6 space-y-4">
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" value={editingTenant.fullName} onChange={e => setEditingTenant({...editingTenant, fullName: e.target.value})} />
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" value={editingTenant.mobileNumber} onChange={e => setEditingTenant({...editingTenant, mobileNumber: e.target.value})} />
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg">আপডেট করুন</button>
            </form>
          </div>
        </div>
      )}

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentView('dashboard')}>
            <div className="p-1.5 bg-indigo-50 rounded-lg group-hover:scale-110 transition-transform">
              <img src={BRAND_LOGO_URL} className="w-8 h-8 object-contain" alt="Logo" />
            </div>
            <span className="text-xl font-black text-slate-800 tracking-tighter uppercase">AIT SOLUTION</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 mb-0.5">{currentUser.fullName}</p>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{currentUser.role === 'Landlord' ? 'মালিক' : 'ভাড়াটিিয়া'}</p>
            </div>
            <div className="relative" ref={profileMenuRef}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 transition-all hover:opacity-80">
                <UserAvatar user={currentUser} />
                <i className={`fas fa-chevron-down text-[10px] text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}></i>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-slate-50 mb-1">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Account Settings</p>
                  </div>
                  <button onClick={() => {setCurrentView('dashboard'); setIsProfileOpen(false)}} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                    <i className="fas fa-th-large w-5 text-indigo-400"></i> ড্যাশবোর্ড
                  </button>
                  {currentUser.role === 'Landlord' && (
                    <button onClick={() => {handleBackup(); setIsProfileOpen(false)}} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                      <i className="fas fa-download w-5 text-green-400"></i> Export Backup
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full">
        {currentView === 'dashboard' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 text-slate-50 text-8xl pointer-events-none -mr-10 -mt-10 opacity-50"><i className="fas fa-building"></i></div>
              <div className="relative z-10">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">ড্যাশবোর্ড</h1>
                <p className="text-slate-400 font-bold mt-1">প্রপার্টি: {currentUser.propertyName || (myLandlord?.propertyName) || "Happy Home"}</p>
              </div>
              <div className="text-center md:text-right relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">মোট আদায়</p>
                <p className="text-5xl font-black text-indigo-600 tabular-nums">৳{totalCollected.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {currentUser.role === 'Landlord' ? (
                <>
                  <button onClick={() => { setFormData({...formData, userId: '', tenantName: '', mobileNumber: '', flatNumber: ''}); setCurrentView('form'); }} className="p-8 bg-indigo-600 text-white rounded-[2.5rem] text-left hover:bg-indigo-700 transition-all group shadow-xl hover:shadow-indigo-200">
                    <div className="w-16 h-16 bg-white/20 text-white rounded-3xl flex items-center justify-center text-3xl mb-8 group-hover:rotate-12 transition-transform shadow-inner"><i className="fas fa-plus"></i></div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">ভাড়া আদায় করুন</h3>
                    <p className="text-indigo-100 font-medium mt-3 opacity-80 leading-relaxed">ভাড়াটিয়ার জন্য সরাসরি ARP এন্ট্রি প্রদান করুন।</p>
                  </button>
                  <button onClick={() => setCurrentView('tenant-list')} className="p-8 bg-white border border-slate-200 rounded-[2.5rem] text-left hover:border-indigo-500 transition-all group shadow-lg flex flex-col h-full hover:shadow-2xl hover:shadow-indigo-100">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform shadow-inner"><i className="fas fa-users"></i></div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">ভাড়াটিয়া তালিকা</h3>
                    <p className="text-slate-400 font-medium mt-3 leading-relaxed">ভাড়াটিয়াদের প্রোফাইল ও তথ্য ম্যানেজমেন্ট।</p>
                  </button>
                  <button onClick={() => setCurrentView('summary')} className="p-8 bg-white border border-slate-200 rounded-[2.5rem] text-left hover:border-green-500 transition-all group shadow-lg flex flex-col h-full hover:shadow-2xl hover:shadow-green-100">
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform shadow-inner"><i className="fas fa-chart-pie"></i></div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">লেনদেন সামারি</h3>
                    <p className="text-slate-400 font-medium mt-3 leading-relaxed">প্রতি ভাড়াটিয়া আলাদা আলাদা আদায় রিপোর্ট।</p>
                  </button>
                  <button onClick={() => setCurrentView('history')} className="p-8 bg-white border border-slate-200 rounded-[2.5rem] text-left hover:border-orange-500 transition-all group shadow-lg flex flex-col h-full hover:shadow-2xl hover:shadow-orange-100">
                    <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform shadow-inner"><i className="fas fa-history"></i></div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">লেনদেন ইতিহাস</h3>
                    <p className="text-slate-400 font-medium mt-3 leading-relaxed">পূর্বের সকল আদায়কৃত ভাড়ার রেকর্ড।</p>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setFormData({...formData, userId: currentUser.id, tenantName: currentUser.fullName, mobileNumber: currentUser.mobileNumber }); setCurrentView('form'); }} className="p-8 bg-indigo-600 text-white rounded-[2.5rem] text-left hover:bg-indigo-700 transition-all group shadow-xl">
                    <div className="w-16 h-16 bg-white/20 text-white rounded-3xl flex items-center justify-center text-3xl mb-8 group-hover:rotate-12 transition-transform shadow-inner"><i className="fas fa-plus"></i></div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">ARP এন্ট্রি দিন</h3>
                    <p className="text-indigo-100 font-medium mt-3 opacity-80 leading-relaxed">আপনার চলতি মাসের ভাড়ার তথ্য সাবমিট করে রসিদ নিন।</p>
                  </button>
                  <button onClick={() => setCurrentView('history')} className="p-8 bg-white border border-slate-200 rounded-[2.5rem] text-left hover:border-indigo-500 transition-all group shadow-lg flex flex-col h-full hover:shadow-2xl">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform shadow-inner"><i className="fas fa-receipt"></i></div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">লেনদেন ইতিহাস</h3>
                    <p className="text-slate-400 font-medium mt-3 leading-relaxed">আপনার পরিশোধিত ভাড়ার তালিকা ও রসিদ ডাউনলোড।</p>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* TENANT LIST VIEW */}
        {currentView === 'tenant-list' && (
          <div className="animate-in slide-in-from-right duration-500 space-y-6">
            <div className="flex justify-between items-center">
              <button onClick={() => setCurrentView('dashboard')} className="text-slate-500 font-black hover:text-indigo-600 flex items-center gap-2"><i className="fas fa-arrow-left"></i> ফিরে যান</button>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">ভাড়াটিয়া তালিকা ({myTenants.length})</h2>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">প্রোফাইল</th>
                      <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">নাম ও মোবাইল</th>
                      <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myTenants.length === 0 ? (
                      <tr><td colSpan={3} className="px-8 py-16 text-center text-slate-400 font-bold italic">কোনো ভাড়াটিয়া নিবন্ধিত নেই।</td></tr>
                    ) : (
                      myTenants.map(tenant => (
                        <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-6"><UserAvatar user={tenant} size="w-12 h-12" /></td>
                          <td className="px-8 py-6"><p className="font-black text-slate-900 text-lg leading-none">{tenant.fullName}</p><p className="text-sm text-slate-400 font-bold mt-1.5">{tenant.mobileNumber}</p></td>
                          <td className="px-8 py-6 text-right"><div className="flex justify-end gap-3"><button onClick={() => setEditingTenant(tenant)} className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm"><i className="fas fa-edit"></i></button><button onClick={() => deleteTenant(tenant.id)} className="w-11 h-11 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shadow-sm"><i className="fas fa-trash-alt"></i></button></div></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUMMARY VIEW */}
        {currentView === 'summary' && (
          <div className="animate-in slide-in-from-right duration-500 space-y-8">
            <div className="flex justify-between items-center">
              <button onClick={() => setCurrentView('dashboard')} className="text-slate-500 font-black hover:text-indigo-600 flex items-center gap-2"><i className="fas fa-arrow-left"></i> ফিরে যান</button>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">লেনদেন সামারি</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTenants.map(tenant => {
                const tenantPayments = myRecords.filter(r => r.userId === tenant.id);
                const tenantTotal = tenantPayments.reduce((sum, r) => sum + r.rentAmount, 0);
                const lastPay = tenantPayments[0];
                return (
                  <div key={tenant.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col gap-6 hover:translate-y-[-4px] transition-transform">
                    <div className="flex items-center gap-4">
                      <UserAvatar user={tenant} size="w-14 h-14" />
                      <div><h4 className="font-black text-slate-900 text-lg leading-none">{tenant.fullName}</h4><p className="text-[10px] text-slate-400 font-black uppercase mt-2 tracking-widest">{lastPay ? `শেষ পেমেন্ট: ${lastPay.rentMonth}` : 'কোনো পেমেন্ট নাই'}</p></div>
                    </div>
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-inner"><p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">মোট আদায়</p><p className="text-3xl font-black text-indigo-600 tabular-nums">৳{tenantTotal.toLocaleString()}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ARP FORM VIEW */}
        {currentView === 'form' && (
          <div className="max-w-xl mx-auto animate-in slide-in-from-bottom duration-500">
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
              <div className="bg-indigo-600 p-8 text-white relative">
                <h2 className="text-2xl font-black uppercase tracking-tight relative z-10">ARP এন্ট্রি</h2>
                <p className="text-indigo-100 text-xs font-bold mt-1 relative z-10">ভাড়ার বিবরণ প্রদান করুন</p>
                <i className="fas fa-file-invoice absolute top-0 right-0 p-8 text-white/5 text-8xl -rotate-12 pointer-events-none"></i>
              </div>
              <form onSubmit={handleRentEntry} className="p-10 space-y-6">
                {currentUser.role === 'Landlord' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ভাড়াটিয়া নির্বাচন করুন</label>
                    <select required className="w-full px-5 py-4 bg-indigo-50 border border-indigo-200 rounded-2xl font-black text-indigo-900 outline-none" value={formData.userId} onChange={(e) => { const t = myTenants.find(u => u.id === e.target.value); if (t) setFormData({...formData, userId: t.id, tenantName: t.fullName, mobileNumber: t.mobileNumber}); }}>
                      <option value="">-- ভাড়াটিয়া বেছে নিন --</option>
                      {myTenants.map(t => <option key={t.id} value={t.id}>{t.fullName} ({t.mobileNumber})</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ফ্ল্যাট / রুম নং</label><input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 outline-none shadow-sm" value={formData.flatNumber} onChange={e => setFormData({...formData, flatNumber: e.target.value})} placeholder="যেমন: 2A" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ভাড়ার মাস</label><select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 outline-none shadow-sm cursor-pointer" value={formData.rentMonth} onChange={e => setFormData({...formData, rentMonth: e.target.value})}>{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                </div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ভাড়ার পরিমাণ (৳)</label><input required type="number" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-2xl text-indigo-600 outline-none shadow-sm" value={formData.rentAmount} onChange={e => setFormData({...formData, rentAmount: e.target.value})} placeholder="0.00" /></div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">পেমেন্ট মেথড</label>
                  <div className="flex gap-3">{(['Cash', 'Bank', 'MFS'] as const).map(m => (<button key={m} type="button" onClick={() => setFormData({...formData, paymentMethod: m})} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 transition-all ${formData.paymentMethod === m ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'}`}>{m === 'Cash' ? 'ক্যাশ' : m === 'Bank' ? 'ব্যাংক' : 'মোবাইল'}</button>))}</div>
                </div>
                {formData.paymentMethod === 'MFS' && (<div className="animate-in slide-in-from-top-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">মোবাইল ব্যাংকিং নম্বর</label><input required placeholder="017XXXXXXXX" className="w-full px-5 py-4 bg-indigo-50 border border-indigo-200 rounded-2xl font-black text-indigo-900 outline-none shadow-sm" value={formData.mfsNumber} onChange={e => setFormData({...formData, mfsNumber: e.target.value})} /></div>)}
                <button disabled={isLoading} className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-xl shadow-2xl hover:bg-indigo-700 transition-all active:scale-[0.98]">{isLoading ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : <i className="fas fa-check-circle mr-2"></i>} {isLoading ? 'প্রসেসিং হচ্ছে...' : 'রসিদ জেনারেট করুন'}</button>
              </form>
            </div>
          </div>
        )}

        {/* HISTORY VIEW */}
        {currentView === 'history' && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="flex justify-between items-center">
              <button onClick={() => setCurrentView('dashboard')} className="text-slate-500 font-black hover:text-indigo-600 flex items-center gap-2 transition-colors"><i className="fas fa-arrow-left"></i> ফিরে যান</button>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">লেনদেন ইতিহাস</h2>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {myRecords.length === 0 ? (
                <div className="bg-white p-24 rounded-[3rem] border-4 border-dashed border-slate-100 text-center"><i className="fas fa-folder-open text-5xl text-slate-200 mb-4 block"></i><p className="text-slate-300 font-black italic">কোনো রেকর্ড পাওয়া যায়নি।</p></div>
              ) : (
                myRecords.map(record => (
                  <div key={record.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col sm:flex-row justify-between items-center group hover:border-indigo-500 transition-all gap-4">
                    <div className="flex items-center gap-6"><div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner"><i className="fas fa-receipt"></i></div><div><div className="flex items-center gap-2 mb-1.5"><span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{record.rentMonth}</span><h4 className="font-black text-slate-900 text-lg leading-none">{record.tenantName}</h4></div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">#{record.receiptNumber} • {new Date(record.paymentDate).toLocaleDateString()}</p></div></div>
                    <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end"><div className="text-right"><p className="text-2xl font-black text-slate-900 tabular-nums">৳{record.rentAmount.toLocaleString()}</p><p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1">{record.paymentMethod}</p></div><button onClick={() => { setActiveRecord(record); setCurrentView('receipt'); }} className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:text-white shadow-sm"><i className="fas fa-eye"></i></button></div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* RECEIPT VIEW */}
        {currentView === 'receipt' && activeRecord && (
          <div className="animate-in zoom-in-95 duration-500 max-w-4xl mx-auto space-y-10">
            <div className="no-print flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl">
              <button onClick={() => setCurrentView('dashboard')} className="text-slate-500 font-black hover:text-indigo-600 flex items-center gap-2 transition-colors"><i className="fas fa-arrow-left"></i> ড্যাশবোর্ড</button>
              <button onClick={() => window.print()} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-indigo-700 flex items-center gap-3"><i className="fas fa-print"></i> প্রিন্ট করুন</button>
            </div>
            <div className="overflow-hidden rounded-[2rem] shadow-2xl border border-slate-200"><Receipt record={activeRecord} /></div>
            {aiMessage && (
              <div className="no-print bg-gradient-to-br from-indigo-50 to-indigo-100 p-8 rounded-[2.5rem] border border-indigo-200 shadow-lg">
                <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><i className="fas fa-wand-magic-sparkles"></i></div><p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-800">AI স্মার্ট রিপ্লাই</p></div>
                <p className="italic font-bold text-lg text-indigo-900 leading-relaxed bg-white/50 p-6 rounded-2xl border border-white">"{aiMessage}"</p>
                <button onClick={() => {navigator.clipboard.writeText(aiMessage); alert("কপি করা হয়েছে!")}} className="mt-6 flex items-center gap-2 text-sm font-black text-indigo-600 hover:text-indigo-800 bg-white px-6 py-3 rounded-xl shadow-md"><i className="fas fa-copy"></i> মেসেজ কপি করুন</button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-12 text-center no-print mt-auto">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={BRAND_LOGO_URL} className="w-6 h-6 grayscale opacity-40" alt="Logo" />
            <span className="font-black text-slate-300 uppercase text-[10px] tracking-[0.4em]">AIT SOLUTION • {currentUser.propertyName || 'SMART MANAGER'}</span>
          </div>
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">© 2024. All Rights Reserved. Automated Rent Management System.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
