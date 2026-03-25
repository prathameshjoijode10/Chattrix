import React from 'react'
import Navbar from './Navbar'
import Sidebar from "./Sidebar"
const Layout = ({ children, showSidebar = false, mainScrollable = true }) => {
  return (
    <div className='h-screen bg-base-100 overflow-hidden'>
        <div className='flex h-full min-h-0'>
            {showSidebar && <Sidebar/>}

            <div className='flex-1 flex flex-col h-full min-h-0'>
                <Navbar/>
                <main className={`flex-1 min-h-0 ${mainScrollable ? "overflow-y-auto" : "overflow-hidden"}`}>
                  {children}
                </main>
            </div>
        </div>
    </div>
  )
}

export default Layout
