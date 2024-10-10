"use client";

import { signIn } from "next-auth/react";
import type { ClientSafeProvider } from "next-auth/react";
import { Suspense } from "react";
import { GoPerson } from "react-icons/go";
function SignInButtons({
  providers,
}: {
  providers: Record<string, ClientSafeProvider> | null;
}) {
  if (!providers) return null;

  return (
    <div className="mx-auto max-w-[536.583px]">
      <div className="flex flex-col items-center justify-center">
        <div className="flex w-full flex-row items-center justify-center pb-[72px] pt-[32px] lg:pb-8 lg:pt-12">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="38.4"
            height="32"
            viewBox="0 0 200 170"
          >
            <path
              fill="#FCB400"
              d="M90.039 12.368 24.079 39.66c-3.667 1.519-3.63 6.729.062 8.192l66.235 26.266a24.58 24.58 0 0 0 18.12 0l66.236-26.266c3.69-1.463 3.729-6.673.06-8.191l-65.958-27.293a24.58 24.58 0 0 0-18.795 0"
            ></path>
            <path
              fill="#18BFFF"
              d="M105.312 88.46v65.617c0 3.12 3.147 5.258 6.048 4.108l73.806-28.648a4.42 4.42 0 0 0 2.79-4.108V59.813c0-3.121-3.147-5.258-6.048-4.108l-73.806 28.648a4.42 4.42 0 0 0-2.79 4.108"
            ></path>
            <path
              fill="#F82B60"
              d="m88.078 91.846-21.904 10.576-2.224 1.075-46.238 22.155c-2.93 1.414-6.672-.722-6.672-3.978V60.088c0-1.178.604-2.195 1.414-2.96a5 5 0 0 1 1.12-.84c1.104-.663 2.68-.84 4.02-.31L87.71 83.76c3.564 1.414 3.844 6.408.368 8.087"
            ></path>
            <path
              fill="rgba(0, 0, 0, 0.25)"
              d="m88.078 91.846-21.904 10.576-53.72-45.295a5 5 0 0 1 1.12-.839c1.104-.663 2.68-.84 4.02-.31L87.71 83.76c3.564 1.414 3.844 6.408.368 8.087"
            ></path>
          </svg>{" "}
          <p className="ml-1 text-2xl font-bold">Airtable</p>
        </div>
        <div className="flex w-full flex-col items-center px-5 md:px-0">
          <div className="flex w-full flex-row items-center pb-4 lg:pb-8">
            <p className="text-2xl font-bold lg:text-3xl">
              Create your free account
            </p>
          </div>
          <form className="flex w-full flex-col items-center justify-center">
            <div className="flex w-full flex-col items-center justify-center">
              <label htmlFor="email" className="mr-auto justify-start text-xl">
                Work email
              </label>
              <div className="mt-2 flex h-[46px] w-full flex-row items-center justify-start rounded-md border-[2px] border-gray-300 px-3 py-[1px] focus:outline-none">
                <GoPerson className="mr-2 w-[24px]" />
                <input
                  placeholder="name@company.com"
                  type="email"
                  className="h-full w-full focus:outline-none"
                />
              </div>
            </div>
            <div className="mb-8 mt-4 flex w-full flex-col items-center justify-center text-center align-middle">
              <button
                type="submit"
                className="h-[36px] w-full rounded-md bg-blue-700 text-white"
              >
                Continue
              </button>
            </div>
          </form>
          <div className="flex h-[36px] w-full flex-row items-center justify-center">
            <div className="h-[1px] w-1/2 bg-gray-300"></div>
            <div className="mx-4 text-gray-500">or</div>
            <div className="h-[1px] w-1/2 bg-gray-300"></div>
          </div>
          <div className="mt-2 hidden w-full flex-row items-center justify-center sm:flex">
            <button className="flex h-[43px] w-full flex-row items-center justify-center rounded-md border-[1px] border-gray-300 text-lg">
              <p className="ml-4">Continue with </p>
              <p className="ml-2 font-bold">Single Sign On</p>
            </button>
          </div>
          <div className="flex w-full flex-col items-center justify-center">
            {Object.values(providers).map((provider) => (
              <div
                key={provider.name}
                className="flex w-full flex-row items-center justify-center"
              >
                <button
                  onClick={() =>
                    signIn(provider.id, {
                      callbackUrl: "/workspaces",
                    })
                  }
                  className="mt-3 flex h-[43px] w-full flex-row items-center justify-center rounded-md border-[1px] border-gray-300 text-lg md:mt-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    role="img"
                    aria-hidden="true"
                  >
                    <path
                      d="M18.09 18.75c2.115-1.973 3.052-5.25 2.49-8.393h-8.392v3.473h4.777a3.945 3.945 0 0 1-1.777 2.67l2.902 2.25Z"
                      fill="#4285F4"
                    ></path>
                    <path
                      d="M4.215 15.982A9 9 0 0 0 18.09 18.75l-2.902-2.25a5.37 5.37 0 0 1-8.018-2.813l-2.955 2.296Z"
                      fill="#34A853"
                    ></path>
                    <path
                      d="M7.17 13.687c-.375-1.17-.375-2.25 0-3.42L4.215 7.965a9.06 9.06 0 0 0 0 8.025l2.955-2.303Z"
                      fill="#FBBC02"
                    ></path>
                    <path
                      d="M7.17 10.267c1.035-3.24 5.438-5.115 8.393-2.347l2.58-2.528A8.85 8.85 0 0 0 4.215 7.965l2.955 2.302Z"
                      fill="#EA4335"
                    ></path>
                  </svg>{" "}
                  <p className="ml-4">Continue with </p>
                  <p className="ml-2 font-bold">Google</p>
                </button>
              </div>
            ))}
            <div className="mt-2 hidden w-full items-center justify-center sm:flex">
              <p className="text-xs text-gray-500">Continue with Apple ID</p>
            </div>
          </div>
          <div className="flex w-full flex-col items-center justify-center">
            <div className="mb-8 mt-6 w-full text-center sm:mt-8">
              <p className="text-sm text-gray-500">
                By creating an account, you agree to the{" "}
                <span className="text-sm underline">Terms of Service</span> and{" "}
                <span className="text-sm underline">Privacy Policy</span>.
              </p>
            </div>
            <div className="flex w-full flex-row items-center justify-center pb-8">
              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <button className="text-sm text-blue-500 underline">
                  <a href="/signin">Sign in</a>
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInClient({
  providers,
}: {
  providers: Record<string, ClientSafeProvider> | null;
}) {
  return (
    <div className="">
      <div className="">
        <Suspense fallback={<div>Loading...</div>}>
          <SignInButtons providers={providers} />
        </Suspense>
      </div>
    </div>
  );
}
