import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShipWheelIcon } from 'lucide-react';
import useLogin from '../hooks/useLogin.js';
import { useTranslation } from "react-i18next";

const LoginPage = () => {
  const { t } = useTranslation();
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const { isPending, error, loginMutation } = useLogin();

  const handleLogin = (e) => {
    e.preventDefault();
    loginMutation(loginData);
  };

  return (
    <div className='h-screen flex items-center justify-center p-2 sm:p-6 md:p-8' data-theme="nord">
      <div className='border border-primary/25 flex flex-col lg:flex-row w-full max-w-5xl mx-auto bg-base-100 rounded-xl shadow-lg overflow-hidden'>
        {/* LEFT SECTION - FORM */}
        <div className='w-full lg:w-1/2 p-4 sm:p-8 flex flex-col items-center justify-center'>
          {/* LOGO */}
          <div className='mb-4 flex items-center justify-start gap-2'>
            <ShipWheelIcon className='size-9 text-primary' />
            <span className='text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider'>
              Chattrix
            </span>
          </div>

          {/* ERROR */}
          {error && (
            <div className='alert alert-error mb-4'>
              <span>{error.response?.data?.message || t("auth.loginFailed")}</span>
            </div>
          )}

          <div className='w-full max-w-md'>
            <form onSubmit={handleLogin}>
              <div className='space-y-4'>
                <div>
                  <h2 className='text-xl font-semibold'>{t("auth.welcomeBack")}</h2>
                  <p className='text-sm opacity-70'>{t("auth.loginContinue")}</p>
                </div>

                <div className='space-y-3'>
                  {/* Email */}
                  <div className='form-control'>
                    <label className='label'>
                      <span className='label-text'>{t("auth.email")}</span>
                    </label>
                    <input
                      type='email'
                      placeholder='hello@example.com'
                      className='input input-bordered w-full'
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className='form-control'>
                    <label className='label'>
                      <span className='label-text'>{t("auth.password")}</span>
                    </label>
                    <input
                      type='password'
                      placeholder='********'
                      className='input input-bordered w-full'
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>

                  <button type='submit' className='btn btn-primary w-full' disabled={isPending}>
                    {isPending ? (
                      <>
                        <span className='loading loading-spinner loading-xs'></span>
                        {t("auth.loggingIn")}
                      </>
                    ) : (
                      t("auth.signIn")
                    )}
                  </button>

                  <div className='text-center mt-4'>
                    <p className='text-sm'>
                      {t("auth.dontHaveAccount")} {' '}
                      <Link to='/signup' className='text-primary hover:underline'>
                        {t("auth.createOne")}
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT SIDE - Illustration */}
        <div className='hidden lg:flex w-full lg:w-1/2 bg-primary/10 items-center justify-center'>
          <div className='max-w-md p-8'>
            <div className='relative aspect-square max-w-sm mx-auto'>
              <img src='/i.png' alt='Login Illustration' className='w-full h-full' />
            </div>

            <div className='text-center space-y-3 mt-6'>
              <h2 className='text-xl font-semibold'>"Stay close, even when you're far."</h2>
              <p className='opacity-70'>
                Connect, chat, and grow together with Chattrix, your virtual space for meaningful
                conversations and connections.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
