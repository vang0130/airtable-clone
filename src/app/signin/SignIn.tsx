"use client";

import { signIn } from "next-auth/react";
import type { ClientSafeProvider } from "next-auth/react";
import { Suspense } from "react";

export default function SignIn({
  providers,
}: {
  providers: Record<string, ClientSafeProvider> | null;
}) {
  if (!providers) return null;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex h-screen w-screen bg-white">
        <div className="mx-3 grid h-[621px] max-w-[1536px] sm:mx-auto sm:w-[360px] lg:mx-0 lg:w-full lg:grid-cols-2 xl:mx-auto">
          <div className="flex flex-col items-center justify-center sm:pt-8 lg:mx-auto lg:w-[360px] xl:w-[500px]">
            <div className="mt-[120px] flex w-full flex-row items-center justify-center">
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
              <p className="ml-1 text-xl font-bold">Airtable</p>
            </div>

            <div className="mt-[32px] flex w-full flex-row items-center justify-center">
              <p className="text-2xl font-bold">Sign in</p>
            </div>
            <div className="mb-[32px] mt-2 flex w-full flex-row items-center justify-center">
              <p className="text-sm">
                or{" "}
                <a href="/signup" className="text-blue-600 underline">
                  create an account
                </a>
              </p>
            </div>
            <form className="flex w-full flex-col items-center justify-center">
              <div className="mb-3 flex w-full flex-col items-center justify-center">
                <label
                  htmlFor="email"
                  className="mr-auto justify-start text-xl"
                >
                  Email
                </label>
                <input
                  placeholder="Email address"
                  type="email"
                  className="mt-2 h-[46px] w-full rounded-xl border-[1px] border-gray-300 px-2 py-[6.5px] focus:outline-none"
                />
              </div>
              <div className="mb-[5px] flex w-full flex-col items-center justify-center pt-3 text-center align-middle">
                <button
                  type="submit"
                  className="h-[36px] w-full rounded-xl bg-blue-700 text-white"
                >
                  Continue
                </button>
              </div>
            </form>
            <div className="my-3 flex w-full flex-row items-center justify-center">
              <div className="h-[1px] w-1/2 bg-gray-300"></div>
              <div className="mx-4 text-gray-500">or</div>
              <div className="h-[1px] w-1/2 bg-gray-300"></div>
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
                    className="flex h-[43px] w-full flex-row items-center justify-center rounded-xl border-[1px] border-gray-300 text-lg"
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
                    <p className="ml-4">Sign in with </p>
                    <p className="ml-2 font-bold">Google</p>
                  </button>
                </div>
              ))}
              <div className="flex w-full flex-row items-center justify-center">
                <button className="mt-4 flex h-[43px] w-full flex-row items-center justify-center rounded-xl border-[1px] border-gray-300 text-lg">
                  <p className="">Sign in with </p>
                  <p className="ml-2 font-bold">Single Sign On</p>
                </button>
              </div>
              <div className="mt-8 flex items-center justify-center">
                <p className="text-sm text-gray-600 underline">
                  Sign in with Apple ID
                </p>
              </div>
            </div>
          </div>
          <div className="mx:auto relative hidden rounded-lg lg:col-start-2 lg:flex lg:flex-col lg:items-center lg:justify-center">
            <img
              className="m-12 h-[700px] w-[444px] rounded-3xl object-cover"
              src="/signin.webp"
            />
            <div className="absolute top-0 m-12 flex w-[444px] flex-col rounded-lg px-8 pt-12">
              <div className="pb-2 text-sm text-gray-400">
                Airtable Cobuilder
              </div>
              <div className="pb-8 text-3xl font-bold xl:text-4xl">
                Create an app instantly with AI
              </div>
              <button className="h-[43.6px] w-[200px] rounded-lg border border-gray-300 bg-white bg-opacity-30 px-4 py-2 text-black">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
