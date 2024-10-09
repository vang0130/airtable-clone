import Link from "next/link";

import { LatestPost } from "~/app/_components/post";
import { getServerAuthSession } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import Image from "next/image";
import { TbMenu } from "react-icons/tb";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await getServerAuthSession();

  void api.post.getLatest.prefetch();

  return (
    <HydrateClient>
      <div className="sticky top-0 flex w-full flex-col">
        <div className="mx-auto flex w-full flex-col bg-gray-100 px-6 py-3 sm:flex-row sm:justify-center sm:px-12">
          <p className="text-sm text-gray-600">
            Airtable expands Enterprise capabilities.
          </p>
          <div className="mt-2 text-sm text-blue-700 sm:ml-2 sm:mt-0">
            Learn more -&gt;
          </div>
        </div>
        <div className="flex h-[76px] w-full flex-row bg-white">
          <div className="flex flex-row items-center justify-start px-6">
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
          <div className="my-auto ml-auto flex h-full items-center justify-end align-middle">
            <button className="hidden h-[30.8px] items-center justify-center rounded-xl bg-blue-700 px-[10px] py-[5px] text-center align-middle text-white sm:flex">
              <a href="/signup">Sign up for free</a>
            </button>
            <button className="flex h-[30.8px] items-center justify-center rounded-xl bg-blue-700 px-[10px] py-[5px] text-center align-middle text-white sm:hidden">
              <a href="/signup">Sign up</a>
            </button>
            <button className="ml-4 hidden text-lg sm:block">
              <a href="/signin">Sign in</a>
            </button>
            <button className="ml-4 mr-6 h-8 w-8">
              <TbMenu className="h-full w-full" />
            </button>
          </div>
        </div>
      </div>
      <div className="h-content flex w-full">
        <div className="flex min-h-screen w-full bg-gradient-to-b from-[#b0c4de] via-[#cfd7e3] to-[#e9c7d4]">
          <div className="mx-6 h-full w-full">
            <div className="flex w-full flex-col py-8 sm:flex-row sm:py-16 md:py-[96px]">
              <div className="flex flex-col sm:grid sm:grid-cols-2 md:h-[460.85px] md:grid-cols-[3fr,5fr] md:items-center md:justify-center md:gap-8">
                <div className="flex flex-col">
                  <div className="text-5xl text-gray-700 md:text-6xl">
                    Digital operations for the AI era
                  </div>
                  <div className="mt-3 text-base text-gray-600 md:text-lg">
                    Create modern business apps to manage and automate critical
                    processes.
                  </div>
                  <div className="mt-6 flex flex-col gap-3 md:flex-row">
                    <button className="mt-6 h-[45.6px] rounded-xl bg-blue-700 p-3 text-white sm:h-[37.6px] sm:w-[200px] sm:p-0 md:mr-2 md:mt-0 md:h-[40.3px]">
                      <a href="/signup">Sign up for free</a>
                    </button>
                    <button className="mt-3 h-[45.6px] rounded-xl border-[3px] border-gray-400 bg-[#f5dce5] text-gray-600 sm:h-[37.6px] sm:w-[200px] md:mt-0 md:h-[40.3px]">
                      Contact Sales
                    </button>
                  </div>
                </div>
                <div className="w-[327px] sm:col-start-2 sm:w-full sm:items-center sm:justify-center sm:align-middle">
                  <img
                    src="/homepage_img.webp"
                    alt="Airtable Logo"
                    className="w-[327px] sm:w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
