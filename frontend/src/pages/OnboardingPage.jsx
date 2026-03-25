import React from 'react'
import useAuthUser from '../hooks/useAuthUser'
import {useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { CameraIcon, LoaderIcon, MapPinIcon, ShipWheelIcon, ShuffleIcon } from 'lucide-react';
import { LANGUAGES } from '../constants/index.js';
import { completeOnboarding } from '../lib/api.js';
import { useTranslation } from "react-i18next";
const OnboardingPage = () => {
   const {authUser}=useAuthUser();
   const queryClient=useQueryClient();
  const { t } = useTranslation();

  const avatarSeed = authUser?._id || authUser?.email || authUser?.fullname || "user";
  const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(
   avatarSeed
  )}&size=128`;
  const handleAvatarError = (e) => {
   if (e.currentTarget.dataset.fallbackApplied) return;
   e.currentTarget.dataset.fallbackApplied = "true";
   e.currentTarget.src = fallbackAvatar;
  };

   const [formState,setFormState]=useState({
    fullname:authUser?.fullname || "",
    bio:authUser?.bio || "",
    nativeLanguage:authUser?.nativeLanguage || "",
    learningLanguage:authUser?.learningLanguage || "",
    location:authUser?.location || "",
    profilepic:authUser?.profilepic || "",
   })

   const {mutate:onboardingMutation,isPending}=useMutation({
    mutationFn:completeOnboarding,
    onSuccess:()=>{
      toast.success("Profile onboarded successfully");
      queryClient.invalidateQueries({queryKey:["authUser"]})
    },

    OnError:(error)=>{
      toast.error(error.response.data.message);
    },
   })

   const handleSubmit=(e)=>{
    e.preventDefault();
    onboardingMutation(formState);
   }

   const handleRandomAvatar=()=>{
    const idx=Math.floor(Math.random()*100)+1;
    // Use a widely reachable avatar provider (some hosts may fail DNS in certain networks)
    const randomAvatar=`https://api.dicebear.com/7.x/avataaars/png?seed=${idx}`;
    setFormState({...formState,profilepic:randomAvatar});
    toast.success("Random profile picture generated");
   }
  return (
    <div className='h-screen overflow-y-auto bg-base-100 flex items-center justify-center p-4'>
      <div className='card bg-base-200 w-full max-w-3xl shadow-xl'>
        <div className='card-body p-6 sm:p-8'>
          <h1 className='text-2xl sm:text-3xl font-bold text-center mb-6'>{t("onboarding.title")}</h1>

          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Profile pic container */}
            <div className='flex flex-col items-center justify-center space-y-4'>
              {/* Image preview */}
              <div className='size-32 rounded-full bg-base-300 overflow-hidden'>
                {formState.profilepic?(
                  <img
                  src={formState.profilepic}
                  alt="Profile preview"
                  className='w-full h-full object-cover'
                  referrerPolicy="no-referrer"
                  onError={handleAvatarError}
                  />
                ):(
                  <div className='flex items-center justify-center h-full'>
                    <CameraIcon className='size-12 text-base-content opacity-40'/>
                  </div>
                )}
              </div>

                {/* Generate random avatar */}
                <div className='flex itmes-center gap-2'>
                  <button type='button' onClick={handleRandomAvatar} className='btn btn-accent'>
                    <ShuffleIcon className='size-4 mr-2'/>
                    {t("onboarding.generateAvatar")}
                  </button>
                </div>
            </div>

            {/* Fill name*/}
            <div className='form-control'>
              <label className='label'>
                <span className='label-text'>{t("onboarding.fullName")}</span>
              </label>
              <input
              type="text"
              name="fullname"
              value={formState.fullname}
              onChange={(e)=>setFormState({...formState,fullname:e.target.value})}
              className='input input-bordered w-full'
              placeholder="Enter Full Name"
              />
            </div>

            {/*Bio*/}
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t("onboarding.bio")}</span>
              </label>
              <textarea
                name="bio"
                value={formState.bio}
                onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                className="textarea textarea-bordered h-24"
                placeholder="Tell others about yourself and your language learning goals"
              />
            </div>

            {/* Languages */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Native language */}
              <div className='form-control'>
                <label className='label'>
                  <span className='label-text'>{t("onboarding.nativeLanguage")}</span>
                </label>
                <select
                name="nativeLanguage"
                value={formState.nativeLanguage}
                onChange={(e)=>setFormState({...formState,nativeLanguage:e.target.value})}
                className='select select-bordered w-full'
                >
                  <option value="">{t("onboarding.selectNativeLanguage")}</option>
                  {LANGUAGES.map((lang)=>(
                    <option key={`native-${lang}`} value={lang.toLowerCase()}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

            {/* Learning language */}
              <div className='form-control'>
                <label className='label'>
                  <span className='label-text'>{t("onboarding.learningLanguage")}</span>
                </label>
                <select
                name="learningLanguage"
                value={formState.learningLanguage}
                onChange={(e)=>setFormState({...formState,learningLanguage:e.target.value})}
                className='select select-bordered w-full'
                >
                  <option value="">{t("onboarding.selectLearningLanguage")}</option>
                  {LANGUAGES.map((lang)=>(
                    <option key={`native-${lang}`} value={lang.toLowerCase()}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location */}
            <div className='form-control'>
              <label className='label'>
                <span className='label-text'>{t("onboarding.location")}</span>
              </label>
              <div className='relative'>
                <MapPinIcon className='absolute top-1/2 transform -translate-y-1/2 left-3 size-5 text-base-content opacity-70'/>
                <input
                type="text"
                name="location"
                value={formState.location}
                onChange={(e)=>setFormState({...formState,location:e.target.value})}
                className='input input-bordered w-full pl-10'
                // placeholder="Location"
                />
              </div>
            </div>

            {/* Submit button */}
            <button className='btn btn-primary w-full' disabled={isPending} type="submit">
              {!isPending?(
                <>
                <ShipWheelIcon className='size-5 mr-2'/>
                {t("onboarding.complete")}
                </>
              ):(
                <>
                <LoaderIcon className='animate-spin size-5 mr-2'/>
                {t("onboarding.completing")}</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default OnboardingPage
