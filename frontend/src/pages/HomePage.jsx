import React, { useEffect, useMemo, useState } from 'react'
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query"
import { getFriendRequests, getUserFriends,getReccomendedUsers,getOutgoingFriendReqs,sendFriendRequest } from '../lib/api';
import {Link} from "react-router"
import {UserIcon,MapPinIcon,CheckCircleIcon,UserPlusIcon} from "lucide-react"
import {capitialize} from "../lib/utils"
import { getLanguageFlag } from '../components/FriendCard';
import FriendCard from '../components/FriendCard';
import NoFriendsFound from './NoFriendsFound';
import { useTranslation } from "react-i18next";
import useAuthUser from '../hooks/useAuthUser';
const HomePage = () => {

  const { t } = useTranslation();
  const { authUser } = useAuthUser();

  const queryClient=useQueryClient();
  const [outgoingRequestIds,setOutgoingRequestIds]=useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const {data:friends=[],isLoading:loadingFriends}=useQuery({
    queryKey:["friends"],
    queryFn:getUserFriends,
    enabled: !!authUser,
  })

  const {data:recommendedUsers=[],isLoading:loadingUsers}=useQuery({
    queryKey:["users"],
    queryFn:getReccomendedUsers,
    enabled: !!authUser,
  })

  const {data:outgoingFriendReqs}=useQuery({
    queryKey:["outgoingFriendReqs"],
    queryFn:getOutgoingFriendReqs,
    enabled: !!authUser,
  })

  const {data:friendRequests}=useQuery({
    queryKey:["friendRequests"],
    queryFn:getFriendRequests,
    enabled: !!authUser,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  })

  const {mutate:sendRequestMutation,isPending}=useMutation({
    mutationFn:sendFriendRequest,
    onSuccess:()=> {
      queryClient.invalidateQueries({queryKey:["outgoingFriendReqs"]});
      queryClient.invalidateQueries({queryKey:["users"]});
    },
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

  const incomingRequestCount = friendRequests?.incomingReqs?.length || 0;

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const hasSearchTerm = normalizedSearch.length > 0;

  const filteredFriends = useMemo(() => {
    if (!normalizedSearch) return friends;
    return friends.filter((friend) => {
      const haystack = [friend.fullname, friend.location, friend.nativeLanguage, friend.learningLanguage]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [friends, normalizedSearch]);

  const filteredRecommendedUsers = useMemo(() => {
    if (!normalizedSearch) return recommendedUsers;
    return recommendedUsers.filter((user) => {
      const haystack = [user.fullname, user.location, user.nativeLanguage, user.learningLanguage]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [recommendedUsers, normalizedSearch]);

  const friendSearchCount = filteredFriends.length;
  const recommendationSearchCount = filteredRecommendedUsers.length;
  const totalSearchCount = friendSearchCount + recommendationSearchCount;

  return (
    <div className='p-4 sm:p-6 lg:p-8'>
      <div className='container mx-auto space-y-10'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <h2 className='text-2xl sm:text-3xl font-bold tracking-tight'>{t("home.yourFriends")}</h2>
          <Link to="/notification" className="btn btn-outline btn-sm relative">
          <UserIcon className="mr-2 size-4"/>
          {t("home.friendRequests")}
          {incomingRequestCount > 0 && (
            <span className="badge badge-primary badge-sm absolute -top-2 -right-2">
              {incomingRequestCount}
            </span>
          )}
          </Link>
        </div>

        <div className='card bg-base-200 shadow-sm'>
          <div className='card-body p-4'>
            <label className='form-control w-full'>
              <span className='label-text mb-2 font-medium'>Search people</span>
              <input
                className='input input-bordered w-full'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='Search by name, language, or location'
              />
              {hasSearchTerm && (
                <span className='label-text-alt mt-2 opacity-70'>
                  {totalSearchCount} match{totalSearchCount === 1 ? "" : "es"} across friends and meet new friends
                </span>
              )}
            </label>
          </div>
        </div>

        {loadingFriends?(
          <div className='flex justify-center py-12'>
            <span className='loading loading-spinner loading-lg'/>
            </div>
        ):hasSearchTerm ? (
          totalSearchCount === 0 ? (
            <div className='card bg-base-200 p-6 text-center'>
              <h3 className='font-semibold text-lg mb-2'>No people found</h3>
              <p className='text-base-content opacity-70'>
                Try a different name, language, or location.
              </p>
            </div>
          ) : (
            <div className='space-y-8'>
              {friendSearchCount > 0 && (
                <section>
                  <div className='mb-4 flex items-center justify-between gap-3'>
                    <h3 className='text-xl font-semibold'>Your Friends</h3>
                    <span className='badge badge-outline'>{friendSearchCount}</span>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                    {filteredFriends.map((friend) => (
                      <FriendCard key={friend._id} friend={friend} />
                    ))}
                  </div>
                </section>
              )}

              {recommendationSearchCount > 0 && (
                <section>
                  <div className='mb-4 flex items-center justify-between gap-3'>
                    <h3 className='text-xl font-semibold'>{t("home.meetNewFriends")}</h3>
                    <span className='badge badge-outline'>{recommendationSearchCount}</span>
                  </div>
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {filteredRecommendedUsers.map((user) => {
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
                </section>
              )}
            </div>
          )
        ):filteredFriends.length===0?(
          <NoFriendsFound/>
        ):(
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {filteredFriends.map((friend)=>(
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
              {filteredRecommendedUsers.map((user)=>{
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
