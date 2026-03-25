import React from 'react'
import useAuthUser from '../hooks/useAuthUser'
import useLogout from '../hooks/useLogout'
import { Link,useLocation } from 'react-router';
import { BellIcon, LogOutIcon, ShipWheelIcon } from 'lucide-react';
import ThemeSelector from "../components/ThemeSelector.jsx"
import { useTranslation } from "react-i18next";
const Navbar = () => {
    const {authUser}=useAuthUser();
    const location=useLocation();
    const isChatPage=location.pathname?.startsWith("/chat");
    const { t, i18n } = useTranslation();

        const avatarSeed = authUser?._id || authUser?.email || authUser?.fullname || "user";
        const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(
            avatarSeed
        )}&size=64`;
        const handleAvatarError = (e) => {
            if (e.currentTarget.dataset.fallbackApplied) return;
            e.currentTarget.dataset.fallbackApplied = "true";
            e.currentTarget.src = fallbackAvatar;
        };

    const {logoutMutation}=useLogout();
  return (
    <nav className='bg-base-200 border-b border-base-300 sticky top-0 z-30 h-16 flex items-center'>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex items-center justify-end w-full'>
                {/* LOGO-ONLY IN CHAT */}
                {isChatPage && (
                    <div className='pl-5'>
                        <Link to="/" className='flex items-center gap-2.5'>
                        <ShipWheelIcon className='size-9 text-primary'/>
                        <span className='text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider'>
                            Chhatrix
                        </span>
                        </Link>
                    </div>
                )}

                <div className='flex items-center gap-3 sm:gap-4 ml-auto'>
                    <label className="hidden sm:flex items-center gap-2 text-sm opacity-70">
                        <span>{t("common.language")}</span>
                        <select
                            className="select select-bordered select-sm"
                            value={i18n.language}
                            onChange={(e) => i18n.changeLanguage(e.target.value)}
                            aria-label={t("common.language")}
                        >
                            <option value="en">English</option>
                            <option value="hi">हिंदी</option>
                            <option value="mr">मराठी</option>
                        </select>
                    </label>
                    <Link to={"/notification"}>
                    <button className='btn btn-ghost btn-circle'>
                        <BellIcon className='h-6 w-6 text-base-content opacity-70'/>
                    </button>
                    </Link>
                </div>

                <ThemeSelector/>

                <div className='avatar'>
                    <div className='w-9 rounded-full'>
                                                <img
                                                    src={authUser?.profilepic || fallbackAvatar}
                                                    alt="User Avatar"
                                                    decoding="async"
                                                    fetchPriority="high"
                                                    referrerPolicy="no-referrer"
                                                    onError={handleAvatarError}
                                                />
                    </div>
                </div>


                {/* LOGOUT */}
                <button className='btn btn-ghost btn-circle' onClick={logoutMutation}>
                    <LogOutIcon className='h-6 w-6 text-base-content opacity-70'/>
                </button>
            </div>
        </div>
    </nav>
  )
}

export default Navbar
