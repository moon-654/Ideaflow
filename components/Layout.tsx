import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, Search, Bell, Check, X } from 'lucide-react';
import { useProposalStore } from '../context/ProposalContext';

const Layout: React.FC = () => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const { currentUser, notifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } = useProposalStore();
    const location = useLocation();
    const navigate = useNavigate();

    // Redirect to login if not authenticated (empty id means guest/not logged in)
    if (!currentUser || !currentUser.id) {
        return <Navigate to="/login" replace />;
    }

    // Derive active tab from path
    const currentPath = location.pathname.substring(1) || 'dashboard';

    // Filter notifications for current user
    const userNotifications = notifications.filter(n => n.recipientId === currentUser.id).slice(0, 10);
    const unreadCount = getUnreadNotificationCount();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setNotificationOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification: typeof notifications[0]) => {
        markNotificationRead(notification.id);
        if (notification.link) {
            navigate(notification.link);
        }
        setNotificationOpen(false);
    };

    const formatTimeAgo = (dateString: string) => {
        const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
        if (seconds < 60) return '방금 전';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
        return `${Math.floor(seconds / 86400)}일 전`;
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#f6f7f8]">
            <Sidebar
                activeTab={currentPath}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
            />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                        >
                            <Menu size={24} />
                        </button>

                        {/* Breadcrumb / Page Title Mobile */}
                        <h2 className="text-lg font-bold text-slate-900 md:hidden capitalize">
                            {currentPath.replace('_', ' ')}
                        </h2>

                        {/* Search Bar Desktop */}
                        <div className="hidden md:flex items-center relative w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="통합 검색 (제안, 제안자, 부서)..."
                                className="w-full h-10 pl-10 pr-4 rounded-full bg-slate-100 border-none text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 placeholder:text-slate-400 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Notification Bell with Dropdown */}
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setNotificationOpen(!notificationOpen)}
                                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {notificationOpen && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                                    <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                                        <h3 className="font-bold text-slate-900 text-sm">알림</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllNotificationsRead}
                                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                            >
                                                <Check size={12} /> 모두 읽음
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {userNotifications.length === 0 ? (
                                            <div className="p-6 text-center text-slate-400 text-sm">
                                                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                                                <p>새로운 알림이 없습니다</p>
                                            </div>
                                        ) : (
                                            userNotifications.map(notification => (
                                                <div
                                                    key={notification.id}
                                                    onClick={() => handleNotificationClick(notification)}
                                                    className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notification.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm ${!notification.read ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                                                                {notification.message}
                                                            </p>
                                                            <p className="text-xs text-slate-400 mt-0.5 truncate">
                                                                {notification.proposalTitle}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 mt-1">
                                                                {formatTimeAgo(notification.createdAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-gray-200">
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-900">{currentUser.name}</p>
                                <p className="text-xs text-slate-500">{currentUser.role}</p>
                            </div>
                            <img
                                src={currentUser.avatarUrl || "https://ui-avatars.com/api/?name=" + currentUser.name}
                                alt="Profile"
                                className="w-9 h-9 rounded-full object-cover border border-gray-200"
                            />
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;

