import React, { useEffect, useState } from 'react'
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query"
import { getUserFriends,getReccomendedUsers,getOutgoingFriendReqs,sendFriendRequest } from '../lib/api';
import {Link} from "react-router"
import {UserIcon,MapPinIcon,CheckCircleIcon,UserPlusIcon} from "lucide-react"
import {capitialize} from "../lib/utils"
import { getLanguageFlag } from '../components/FriendCard';
import FriendCard from '../components/FriendCard';
import NoFriendsFound from './NoFriendsFound';
import { useTranslation } from "react-i18next";
const HomePage = () => {

  const { t } = useTranslation();

  const queryClient=useQueryClient();
  const [outgoingRequestIds,setOutgoingRequestIds]=useState(new Set());

  const {data:friends=[],isLoading:loadingFriends}=useQuery({
    queryKey:["friends"],
    queryFn:getUserFriends,
  })

  const {data:recommendedUsers=[],isLoading:loadingUsers}=useQuery({
    queryKey:["users"],
    queryFn:getReccomendedUsers,
  })

  const {data:outgoingFriendReqs}=useQuery({
    queryKey:["outgoingFriendReqs"],
    queryFn:getOutgoingFriendReqs,
  })

  const {mutate:sendRequestMutation,isPending}=useMutation({
    mutationFn:sendFriendRequest,
    onSuccess:()=> queryClient.invalidateQueries({queryKey:outgoingFriendReqs}),
  })

  useEffect(()=>{
    const outgoingIds=new Set();
    if(outgoingFriendReqs && outgoingFriendReqs.length>0){
      outgoingFriendReqs.forEach((req)=>{
        outgoingIds.add(req.recipient._id);
      });
      setOutgoingRequestIds(outgoingIds)
    }
  },[outgoingFriendReqs]);

  return (
    <div className='p-4 sm:p-6 lg:p-8'>
      <div className='container mx-auto space-y-10'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <h2 className='text-2xl sm:text-3xl font-bold tracking-tight'>{t("home.yourFriends")}</h2>
          <Link to="/notification" className="btn btn-outline btn-sm">
          <UserIcon className="mr-2 size-4"/>
          {t("home.friendRequests")}
          </Link>
        </div>

        {loadingFriends?(
          <div className='flex justify-center py-12'>
            <span className='loading loading-spinner loading-lg'/>
            </div>
        ):friends.length===0?(
          <NoFriendsFound/>
        ):(
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {friends.map((friend)=>(
              <FriendCard key={friend._id} friend={friend}/>
            ))}
          </div>
        )}

        <section>
          <div className='mb-6 sm:mb-8'>
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
              <div>
                <h2 className='text-2xl sm:text-3xl font-bold tracking-tight'>{t("home.meetNewFriends")}</h2>
                <p className='opacity-70'>
                  {t("home.discover")}
                </p>
              </div>
            </div>
          </div>

          {loadingUsers?(
            <div className='flex justify-center py-12'>
              <span className='loading loading-spinner loading-lg'/>
            </div>
          ):recommendedUsers.length===0?(
            <div className='card bg-base-200 p-6 text-center'>
              <h3 className='font-semibold text-lg mb-2'>{t("home.noRecommendations")}</h3>
              <p className='text-base-content opacity-70'>
                {t("home.checkBackLater")}
              </p>
            </div>
          ):(
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {recommendedUsers.map((user)=>{
                const hasRequestBeensent=outgoingRequestIds.has(user._id);
                const avatarSeed = user?._id || user?.email || user?.fullname || "user";
                const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(
                  avatarSeed
                )}&size=96`;
                const handleAvatarError = (e) => {
                  if (e.currentTarget.dataset.fallbackApplied) return;
                  e.currentTarget.dataset.fallbackApplied = "true";
                  e.currentTarget.src = fallbackAvatar;
                };

                return(
                  <div
                  key={user._id}
                  className='card bg-base-200 hover:shadow-lg transition-all duration-300'
                  >
                    <div className='card-body p-5 space-y-4'>
                      <div className='flex items-center gap-3'>
                        <div className='avatar size-16 rounded-full'>
                          <img
                            src={user.profilepic || fallbackAvatar}
                            alt={user.fullname}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={handleAvatarError}
                          />
                        </div>

                        <div>
                          <h3 className='font-semibold text-lg'>{user.fullname}</h3>
                          {user.location && (
                            <div className='flex items-center text-xs opacity-70 mt-1'>
                              <MapPinIcon className="size-3 mr-1"/>
                              {user.location}
                            </div>
                          )}
                        </div>
                      </div>

                          {/* LANGUAGE WITH FLAGS  */}
                          <div className='flex flex-wrap gap-1.5'>
                            <span className='badge badge-secondary'>
                              {getLanguageFlag(user.nativeLanguage)}
                              {t("home.native")}: {capitialize(user.nativeLanguage)}

                            </span>
                            <span>
                              {getLanguageFlag(user.learningLanguage)}
                              {t("home.learning")}: {capitialize(user.learningLanguage)}
                            </span>
                          </div>

                          {user.bio && <p className='text-sm opacity-70'>{user.bio}</p>}

                          {/* ACTION BUTTON  */}
                          <button
                          className={`btn w-full mt-2 ${
                            hasRequestBeensent?"btn-disabled":"btn-primary"
                          }`}
                          onClick={()=>sendRequestMutation(user._id)}
                          disabled={hasRequestBeensent || isPending}
                          >
                            {hasRequestBeensent?(
                              <>
                              <CheckCircleIcon className="size-4 mr-2"/>
                              {t("home.requestSent")}
                              </>
                            ):(
                              <>
                              <UserPlusIcon className="size-4 mr-2"/>
                              {t("home.sendFriendRequest")}
                              </>
                            )}
                          </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default HomePage
