import React from 'react'
import useAuthUser from '../hooks/useAuthUser'
import { Link, useLocation } from 'react-router';
import { HomeIcon, ShipWheelIcon, UsersIcon } from 'lucide-react';
import { useTranslation } from "react-i18next";

const Sidebar = () => {
    const {authUser}=useAuthUser();
    const location=useLocation();
    const currenPath=location.pathname;
    const { t } = useTranslation();

        const avatarSeed = authUser?._id || authUser?.email || authUser?.fullname || "user";
        const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(
            avatarSeed
        )}&size=80`;
        const handleAvatarError = (e) => {
            if (e.currentTarget.dataset.fallbackApplied) return;
            e.currentTarget.dataset.fallbackApplied = "true";
            e.currentTarget.src = fallbackAvatar;
        };

  return (
    <aside className='w-64 bg-base-200 border-r border-base-300 hidden lg:flex flex-col h-screen sticky top-0'>
        <div className='p-5 border-b border-base-300'>
            <Link to="/" className='flex items-center gap-2.5'>
            <ShipWheelIcon className='size-9 text-primary'/>
            <span className='text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider'>
                Chattrix
            </span>
            </Link> 
        </div>

        <nav className='flex-1 p-4 space-y-1'>
            <Link 
            to="/"
            className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
                currenPath==="/"?"btn-active":""
            }`}
            >
                <HomeIcon className='size-5 text-base-content opacity-70'/>
                <span>{t("nav.home")}</span>
            </Link>

            {/* <Link to="/friends" className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
                currenPath==="/friends"?"btn-active":""
            }`}>
                <UsersIcon className='size-5 text-base-content opacity-70'/>
                <span>{t("nav.friends")}</span>
            </Link> */}

            {/* <Link to="/notification" className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
                currenPath==="/notification"?"btn-active":""
            }`}>
                <UsersIcon className='size-5 text-base-content opacity-70'/>
                <span>{t("nav.notifications")}</span>
            </Link> */}

            <Link to="/groups" className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
                currenPath?.startsWith("/groups")?"btn-active":""
            }`}>
                <UsersIcon className='size-5 text-base-content opacity-70'/>
                <span>{t("nav.groups")}</span>
            </Link>
        </nav>

        {/* USER PROFILE SECTION */}
        <div className='p-4 border-t border-base-300 mt-auto'>
            <div className='flex items-center gap-3'>
                <div className='avatar'>
                    <div className='w-10 rounded-full'>
                                                <img
                                                    src={authUser?.profilepic || fallbackAvatar}
                                                    alt="User Avatar"
                                                    decoding="async"
                                                    referrerPolicy="no-referrer"
                                                    onError={handleAvatarError}
                                                />
                    </div>
                </div>

                <div className='flex-1'>
                    <p className='font-semibold text-sm'>{authUser?.fullname}</p>
                    <p className='text-xs text-success flex items-center gap-1 '>
                        <span className='size-2 rounded-full bg-success inline-block'/>
                        {t("nav.online")}
                    </p>
                </div>
            </div>
        </div>
    </aside>
  )
}

export default Sidebar
