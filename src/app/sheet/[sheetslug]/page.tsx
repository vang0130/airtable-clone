/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";
// import { api } from "~/trpc/react";
import Sheet from "../../sheetpage/SheetPage";

export default function SheetPage() {
  // console.log(params.sheetSlug);
  // const tableId = Number(params.tableslug);
  // const { data: sheet } = api.sheet.findSheet.useQuery({
  //   id: Number(params.sheetSlug),
  // });

  // if (!sheet) {
  //   return <div>aorsietnarsoeitn...</div>;
  // }

  // const transformedSheet = {
  //   ...sheet,
  //   tables: sheet.tables.map((table) => ({
  //     ...table,
  //     rows: table.rows.map((row) => ({
  //       id: row.id,
  //       values: row.values as Record<string, string>,
  //     })),
  //   })),
  // };
  return <Sheet />;
  // return <Sheet sheetData={transformedSheet} />;
}
