import { Routes,Route } from 'react-router'
import HomePage from './pages/HomePage'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import NotificationPage from './pages/NotificationPage'
import CallPage from './pages/CallPage'
import ChatPage from './pages/ChatPage'
import GroupCreatePage from './pages/GroupCreatePage'
import GroupChatPage from './pages/GroupChatPage'
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
    <div className='h-screen overflow-hidden' data-theme={theme}>
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
          <Layout showSidebar={false} mainScrollable={false}>
            <ChatPage/>
          </Layout>
        ):(
          <Navigate to={!isAuthenticated?"/login":"/onboarding"}/>
        )}/>

        <Route
          path="/groups"
          element={
            isAuthenticated && isOnBoarded ? (
              <Layout showSidebar={true}>
                <GroupCreatePage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />

        <Route
          path="/groups/:id"
          element={
            isAuthenticated && isOnBoarded ? (
              <Layout showSidebar={false} mainScrollable={false}>
                <GroupChatPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route path="/friends" element={
  isAuthenticated && isOnBoarded ? (
    <Layout showSidebar={true}>
      {/* Replace with your FriendsPage component */}
      <div>Friends Page</div>
    </Layout>
  ) : (
    <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
  )
} />
      </Routes>
      <Toaster/>
    </div>
  )
}

export default App
