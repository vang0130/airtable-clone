/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";
import { useSession } from "next-auth/react";
import { RxHamburgerMenu } from "react-icons/rx";
import { RiSearchLine } from "react-icons/ri";
import { GrCircleQuestion } from "react-icons/gr";
import { VscBell } from "react-icons/vsc";
import { GoHome } from "react-icons/go";
import { GoBook } from "react-icons/go";
import { PiShoppingBagOpen } from "react-icons/pi";
import { TbWorld } from "react-icons/tb";
import { GoPlus } from "react-icons/go";
import { PiStarFour } from "react-icons/pi";
import { TbTable } from "react-icons/tb";
import { FaArrowUp } from "react-icons/fa6";
import { PiTableLight } from "react-icons/pi";
import { IoIosArrowDown } from "react-icons/io";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export default function Workspaces() {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const router = useRouter();
  const { data: tables, isLoading } = api.table.findMany.useQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createTable.mutate(
      { name: "New Table" },
      {
        onSuccess: (data) => {
          const tableSlug = data.id;
          router.push(`/table/${tableSlug}`);
        },
      },
    );
  };
  const createTable = api.table.create.useMutation({
    onSuccess: async () => {
      await utils.table.invalidate();
      // setName("");
      // setContent("");
      // setTags([]);
      // setImageUrl("");
    },
  });

  return (
    <div>
      <div className="sticky top-0 z-50 flex h-[57px] w-full items-center justify-center border-b-[1px] border-gray-200 bg-white">
        <div className="flex h-[46.2px] w-full flex-row items-center justify-between pl-2 pr-4 align-middle">
          <div className="flex h-full flex-grow flex-row items-center justify-start align-middle">
            <div className="pl-1 pr-2">
              <RxHamburgerMenu className="w-6" />
            </div>
            <div className="mr-1 flex flex-row items-center justify-start p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                // width="38.4"
                height="22.2"
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
              <p className="ml-1 text-lg">Airtable</p>
            </div>
          </div>
          <div className="flex h-[36px] w-[354px] flex-row items-center">
            <form className="flex h-[36px] w-[354px] items-center rounded-3xl border-[2px] border-gray-300 px-4">
              <button className="">
                <RiSearchLine className="w-4" />
              </button>
              <input
                type="text"
                placeholder="Search..."
                className="ml-2 h-full flex-grow rounded-md text-xs focus:outline-none"
              />
              <div className="ml-2 flex justify-end text-xs text-gray-400">
                ⌘ K
              </div>
            </form>
          </div>
          <div className="flex h-[28px] w-[664px] flex-row items-center justify-end">
            <div className="px-3">
              <button className="flex flex-row items-center justify-center">
                <GrCircleQuestion className="w-4" />
                <p className="ml-1 text-xs">Help</p>
              </button>
            </div>
            <div className="mx-3">
              <button className="flex h-[28px] w-[28px] items-center justify-center rounded-full border-[2px] border-gray-300">
                <VscBell className="w-4" />
              </button>
            </div>
            <div className="pl-2">
              <button className="flex h-[28px] w-[28px] items-center justify-center rounded-full border-[2px] border-gray-300">
                <img
                  src={session?.user?.image ?? "avatar.png"}
                  className="rounded-full"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-row items-center">
        <div className="flex h-[calc(100vh-57px)] w-[48px] flex-col justify-between border-r-[1px] border-gray-200 bg-white">
          <div className="mx-2 flex flex-col items-center justify-start border-b-[1px] border-gray-200 pb-5">
            <div className="mb-5 flex flex-col items-center justify-start pt-5">
              <GoHome className="h-5 w-5" />
            </div>
            <div className="mx-auto flex h-5 w-5 items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
                <rect width="5" height="20" fill="none" />
                <path
                  d="M192,120a59.91,59.91,0,0,1,48,24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16"
                />
                <path
                  d="M16,144a59.91,59.91,0,0,1,48-24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16"
                />
                <circle
                  cx="128"
                  cy="144"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16"
                />
                <path
                  d="M72,216a65,65,0,0,1,112,0"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16"
                />
                <path
                  d="M161,80a32,32,0,1,1,31,40"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16"
                />
                <path
                  d="M64,120A32,32,0,1,1,95,80"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16"
                />
              </svg>
            </div>
          </div>
          <div className="mx-2 flex flex-col items-end justify-center border-t-[1px] border-gray-200 text-center align-middle">
            <div className="mx-auto mb-[18px] items-center justify-center pt-5">
              <GoBook className="h-4 w-4" />
            </div>
            <div className="mx-auto mb-[18px]">
              <PiShoppingBagOpen className="h-4 w-4" />
            </div>
            <div className="mx-auto mb-[18px]">
              <TbWorld className="h-4 w-4" />
            </div>
            <div className="mx-auto flex h-[22px] w-[22px] items-center justify-center rounded-md border-[1px] border-gray-200">
              <GoPlus className="h-4 w-4 items-center justify-center" />
            </div>
          </div>
        </div>
        <div className="flex h-[calc(100vh-57px)] w-full flex-col bg-[#F9FAFB] px-12 pt-8">
          <p className="pb-6 text-2xl font-bold">Home</p>
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="flex h-[95px] w-full flex-row flex-col rounded-md border-[1px] border-gray-300 bg-white p-4">
              <div className="flex h-[20px] w-full flex-row items-center">
                <PiStarFour className="h-5 w-5 text-pink-400" />
                <p className="ml-2 font-bold">Start with AI</p>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Turn your process into an app with data and interfaces using AI.
              </p>
            </div>
            <div className="flex h-[95px] w-full flex-row flex-col rounded-md border-[1px] border-gray-300 bg-white p-4">
              <div className="flex h-[20px] w-full flex-row items-center">
                <TbTable className="h-5 w-5 text-purple-600" />
                <p className="ml-2 font-bold">Start with templates</p>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Select a template to get started and customize as you go.
              </p>
            </div>
            <div className="flex h-[95px] w-full flex-row flex-col rounded-md border-[1px] border-gray-300 bg-white p-4">
              <div className="flex h-[20px] w-full flex-row items-center">
                <FaArrowUp className="h-5 w-5 text-green-600" />
                <p className="ml-2 font-bold">Quickly upload</p>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Easily migrate your existing projects in just a few minutes.
              </p>
            </div>
            <div className="flex h-[95px] w-full flex-col rounded-md border-[1px] border-gray-300 bg-white p-4">
              <button
                className="flex h-full w-full flex-col items-center justify-center"
                onClick={handleSubmit}
                type="submit"
                disabled={createTable.isPending}
              >
                <div className="flex h-[20px] w-full flex-row items-center">
                  <PiTableLight className="h-5 w-5 text-blue-700" />
                  <p className="ml-2 font-bold">Start from scratch</p>
                </div>
                <p className="mt-1 text-left text-xs text-gray-500">
                  Create a new blank base with custom tables, fields, and views.
                </p>
              </button>
            </div>
          </div>
          <div className="mt-2 flex h-[48px] w-full flex-row items-center py-[20px]">
            <div className="flex flex-row text-sm text-gray-500">
              Opened by you
            </div>
            <IoIosArrowDown className="ml-1 h-4 w-4" />
            <div className="ml-3 flex flex-row text-sm text-gray-500">
              Show all types
            </div>

            <IoIosArrowDown className="ml-1 h-4 w-4" />
          </div>

          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tables?.map((table) => (
              <a href={`/table/${table.id}`} key={table.id}>
                <div
                  key={table.id}
                  className="flex h-[95px] w-full flex-row rounded-md border-[1px] border-gray-300 bg-white"
                >
                  <div className="flex h-[92px] w-[92px] items-center justify-center rounded-md">
                    <div className="flex h-[56px] w-[56px] items-center justify-center rounded-xl bg-green-700">
                      <span className="absolute text-3xl text-white">
                        {table.name.substring(0, 2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-full flex-col items-start justify-center">
                    <p className="mb-2 text-sm font-bold">{table.name}</p>
                    <p className="text-xs text-gray-500">{table.name}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
