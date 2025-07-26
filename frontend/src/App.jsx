import { Routes,Route } from 'react-router'
import HomePage from './pages/HomePage'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import NotificationPage from './pages/NotificationPage'
import CallPage from './pages/CallPage'
import ChatPage from './pages/ChatPage'
import { Toaster } from 'react-hot-toast'
import { Navigate } from 'react-router'
import PageLoader from './components/PageLoader'
import useAuthUser from './hooks/useAuthUser'
import Layout from './components/Layout.jsx'
import {useThemeStore} from "./store/useThemeStore.js"
const App = () => {

  const {isLoading,authUser}=useAuthUser();
  const isAuthenticated=Boolean(authUser);
  const isOnBoarded=authUser?.isOnboarded;
  const {theme}=useThemeStore();

  if(isLoading) return <PageLoader/>

  return (
    <div className='h-screen' data-theme={theme}>
      <Routes>
        <Route path="/" element={isAuthenticated && isOnBoarded?(
         <Layout showSidebar>
           <HomePage/>
         </Layout>
        ):(
          <Navigate to={!isAuthenticated?"/login":"/onboarding"}/>
        )}/>

        <Route path="/signup" element={!isAuthenticated?<SignupPage/>:<Navigate to={isOnBoarded ? "/" : "/onboarding"}/>}/>
        
        <Route path="/login" element={!isAuthenticated?<LoginPage/>:<Navigate to={isOnBoarded?"/":"/onboarding"}/>}/>
        
        <Route path="/onboarding" element={isAuthenticated?(
          !isOnBoarded?(
            <OnboardingPage/>
          ):(
            <Navigate to="/"/>
          )
        ):(
          <Navigate to="/login"/>
        )}/>
        
        <Route path="/notification" element={isAuthenticated && isOnBoarded?(
          <Layout showSidebar={true}>
            <NotificationPage/>
          </Layout>
        ):(
          <Navigate to={!isAuthenticated?"/login":"/onboarding"}/>
        )}/>
        
        <Route path="/call/:id" element={isAuthenticated && isOnBoarded?(
          <Layout showSidebar={false}>
            <CallPage/>
          </Layout>
        ):(
          <Navigate to={!isAuthenticated?"/login":"/onboarding"}/>
        )}/>
        
        <Route path="/chat/:id" 
        element={isAuthenticated && isOnBoarded?(
          <Layout showSidebar={false}>
            <ChatPage/>
          </Layout>
        ):(
          <Navigate to={!isAuthenticated?"/login":"/onboarding"}/>
        )}/>
      </Routes>
      <Toaster/>
    </div>
  )
}

export default App
