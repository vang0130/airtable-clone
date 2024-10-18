"use client";
import { api } from "~/trpc/react";
import Table from "../../tablepage/TablePage";

export default function TablePage(
  {
    // params,
  }: {
    params: { tableslug: string };
  },
) {
  // const tableId = Number(params.tableslug);
  const { data: table } = api.table.create.useMutation({});

  // if (isLoading || !table) {
  //   return (
  //     <div className="mx-auto max-w-[1380px]">
  //       <SkeletonLoader />
  //     </div>
  //   );
  // }

  return (
    <Table
      tableArg={
        Array.isArray(table) && table.length > 0
          ? table.map((item) => ({
              ...item,
              notes: "",
              assignee: "",
              status: "",
            }))
          : []
      }
    />
  );
}
