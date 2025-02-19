/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";
import { TbLetterA } from "react-icons/tb";
import { TbNumber1 } from "react-icons/tb";
import { GoPlus } from "react-icons/go";
import { RxHamburgerMenu } from "react-icons/rx";
import { MdKeyboardArrowDown } from "react-icons/md";
import { CiViewTable } from "react-icons/ci";
import { FaRegEyeSlash } from "react-icons/fa";
import { PiTextAlignCenterLight } from "react-icons/pi";
import { CiSearch } from "react-icons/ci";
import { CiViewList } from "react-icons/ci";
import { HiArrowsUpDown } from "react-icons/hi2";
import { PiPaintBucket } from "react-icons/pi";
import { CiTextAlignJustify } from "react-icons/ci";
import { BsBoxArrowUpRight } from "react-icons/bs";
import { CiUndo } from "react-icons/ci";
import { IoIosHelpCircleOutline } from "react-icons/io";
import { GoBell } from "react-icons/go";
import { IoPersonAddOutline } from "react-icons/io5";
import { useSession } from "next-auth/react";
import { MdOutlineCheckBoxOutlineBlank } from "react-icons/md";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { GrCircleQuestion } from "react-icons/gr";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table";
import { Unstable_Popup as Popup } from "@mui/base/Unstable_Popup";
import type { JsonValue } from "next-auth/adapters";

// some type declarations
interface Table {
  headers: Array<{
    id: number;
    name: string;
  }>;
  id: number;
  rows: {
    id: number;
    values: Record<string, string>;
  }[];
}

export default function Sheet() {
  const utils = api.useUtils();

  // user session
  const { data: session } = useSession();

  // get current URL (table id is there)
  const pathname = usePathname();
  const sheetId = Number(pathname.split("/").pop());

  // get sheet
  const { data: sheetData, refetch } = api.sheet.findSheet.useQuery({
    id: sheetId,
  });

  const router = useRouter();
  const searchParams = useSearchParams();

  // get tableId from URL or undefined
  const selectedTableId = searchParams.get("table")
    ? Number(searchParams.get("table"))
    : undefined;

  // initial table if none selected
  // only on initial render
  // nav to correct url
  useEffect(() => {
    if (sheetData?.tables && !selectedTableId) {
      const firstTableId = sheetData.tables[0]?.id;
      if (firstTableId) {
        const params = new URLSearchParams(searchParams);
        params.set("table", firstTableId.toString());
        router.push(`${pathname}?${params.toString()}`);
      }
    }
  }, [sheetData?.tables, selectedTableId, router, pathname, searchParams]);

  // update actual table data when loading a table
  useEffect(() => {
    if (selectedTableId && sheetData?.tables) {
      const foundTable = sheetData.tables.find(
        (table) => table.id === selectedTableId,
      );
      if (foundTable) {
        setTableData({
          ...foundTable,
          headers: foundTable.headers ?? [],
          rows:
            foundTable.rows.map((row) => ({
              ...row,
              values: row.values as Record<string, string>,
            })) ?? [],
        });
      }
    }
  }, [sheetData?.tables, selectedTableId]);

  // switch to new url
  const handleTableSelect = (tableId: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("table", tableId.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const [tableData, setTableData] = useState<Table | undefined>(undefined);

  // for pending updates and new rows
  // TODO - SPLIT???
  const [pendingBatch, setPendingBatch] = useState<{
    updates: { rowId: number; values: Record<string, string> }[];
    newRows: {
      tableId: number;
      values: Record<string, string>;
      tempId: number;
    }[];
  }>({
    updates: [],
    newRows: [],
  });

  // Add state for pending headers (if not already present)
  const [pendingHeaders, setPendingHeaders] = useState<
    Record<
      number,
      {
        tableId: number;
        headers: Array<{ id: number; name: string }>;
      }
    >
  >({});
  // batch update
  // optimistic updates and error recovery
  const batchUpdate = api.row.batchUpdate.useMutation({
    // retry: 3,
    // retryDelay: 1000,
    async onMutate({ updates, newRows }) {
      console.log("Batch Update Data:", { updates, newRows });
      await utils.sheet.findSheet.cancel();
      const previousData = utils.sheet.findSheet.getData({ id: sheetId });

      utils.sheet.findSheet.setData({ id: sheetId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          tables: old.tables.map((table) =>
            table.id === tableData?.id
              ? {
                  ...table,
                  rows: [
                    ...table.rows.map((row) => {
                      const update = updates.find((u) => u.rowId === row.id);
                      return update ? { ...row, values: update.values } : row;
                    }),
                    ...newRows.map((newRow, index) => ({
                      id: -(Date.now() + index),
                      tableId: newRow.tableId,
                      values: newRow.values,
                      createdAt: new Date(),
                    })),
                  ],
                }
              : table,
          ),
        };
      });

      return { previousData };
    },
    onSuccess(data) {
      setPendingBatch({ updates: [], newRows: [] });

      // Preserve existing rows while updating with server response
      utils.sheet.findSheet.setData({ id: sheetId }, (old) => {
        if (!old) return old;
        const currentTable = old.tables.find((t) => t.id === tableData?.id);
        if (!currentTable) return old;

        // Merge existing rows with updated rows
        const updatedRows = data.updatedRows ?? [];
        const existingRows = currentTable.rows.filter(
          (row) => !updatedRows.some((updatedRow) => updatedRow.id === row.id),
        );

        return {
          ...old,
          tables: old.tables.map((table) =>
            table.id === tableData?.id
              ? {
                  ...table,
                  rows: [...existingRows, ...updatedRows],
                }
              : table,
          ),
        };
      });
    },
    onError(err, newData, context) {
      // revert to previous data on error
      utils.sheet.findSheet.setData({ id: sheetId }, context?.previousData);
    },
    // async onSettled(data) {
    //   if (data?.updatedRows?.length) {
    //     // utils.sheet.findSheet.setData({ id: sheetId }, (old) => {
    //     //   if (!old) return old;
    //     //   return {
    //     //     ...old,
    //     //     tables: old.tables.map((table) =>
    //     //       table.id === tableData?.id
    //     //         ? {
    //     //             ...table,
    //     //             rows: table.rows.map((row) => {
    //     //               const updatedRow = data.updatedRows.find(
    //     //                 (u) => u.id === row.id,
    //     //               );
    //     //               return updatedRow
    //     //                 ? { ...row, values: updatedRow.values }
    //     //                 : row;
    //     //             }),
    //     //           }
    //     //         : table,
    //     //     ),
    //     //   };
    //     // });
    //   }
    // },
  });

  // input for new header
  const [headerInput, setHeaderInput] = useState<string>("");

  // MUTATION for adding new header with optimistic UI updates
  const addHeader = api.header.createMany.useMutation({
    async onMutate({ tableId, headers }) {
      await utils.sheet.findSheet.cancel();
      const prevData = utils.sheet.findSheet.getData({ id: sheetId });

      const headersWithIds = headers.map((h, index) => ({
        id: -(Date.now() + index) % 1000000,
        name: h.name,
        tableId,
        createdAt: new Date(),
      }));

      // Optimistic update can be uncommented if you want immediate UI feedback
      utils.sheet.findSheet.setData({ id: sheetId }, (old) => {
        if (!old) return old;
        const pendingRows = pendingBatch.newRows.map((newRow) => ({
          id: newRow.tempId,
          tableId,
          values: newRow.values,
          createdAt: new Date(),
        }));
        const currentTable = old.tables.find((t) => t.id === tableId);
        const latestRows = currentTable?.rows ?? [];

        return {
          ...old,
          tables: old.tables.map((table) =>
            table.id === tableId
              ? {
                  ...table,
                  headers: [...(table.headers ?? []), ...headersWithIds],
                  rows: [...latestRows, ...pendingRows].map((row) => ({
                    ...row,
                    values: {
                      ...(row.values as Record<string, string>),
                      ...Object.fromEntries(
                        headersWithIds.map((h) => [h.id.toString(), ""]),
                      ),
                    },
                  })),
                }
              : table,
          ),
        };
      });

      return { prevData, headersWithTempIds: headersWithIds };
    },

    async onSuccess(newHeaders, variables, ctx) {
      console.log("New Headers:", newHeaders);
      console.log("Temp Headers:", ctx?.headersWithTempIds); // Check temp headers

      if (!newHeaders?.length || !tableData?.id || !ctx?.headersWithTempIds)
        return;

      const recentNewHeaders = newHeaders.slice(-ctx.headersWithTempIds.length);

      // Create mapping at a higher scope
      const headerIdMap = new Map(
        ctx.headersWithTempIds.map((tempHeader, idx) => {
          const realHeader = recentNewHeaders[idx];
          console.log(
            `Mapping temp header ${tempHeader.id} (${tempHeader.name}) -> real header ${realHeader?.id} (${realHeader?.name})`,
          );
          return [tempHeader.id.toString(), realHeader?.id.toString()];
        }),
      );

      utils.sheet.findSheet.setData({ id: sheetId }, (old) => {
        if (!old) return old;
        const currentTable = old.tables.find((t) => t.id === tableData.id);
        if (!currentTable) return old;

        // const recentNewHeaders = newHeaders.slice(
        //   -ctx.headersWithTempIds.length,
        // );

        console.log("All headers:", newHeaders);
        console.log("Temp headers:", ctx.headersWithTempIds);
        console.log("Recent new headers:", recentNewHeaders);

        // const headerIdMap = new Map(
        //   ctx.headersWithTempIds.map((tempHeader, idx) => {
        //     const realHeader = recentNewHeaders[idx];
        //     console.log(
        //       `Mapping temp header ${tempHeader.id} (${tempHeader.name}) -> real header ${realHeader?.id} (${realHeader?.name})`,
        //     );
        //     return [tempHeader.id.toString(), realHeader?.id.toString()];
        //   }),
        // );

        console.log(
          "Chronological header mapping:",
          Object.fromEntries(headerIdMap),
        );

        const updatedTable = {
          ...currentTable,
          headers: newHeaders.map((header) => ({
            ...header,
            createdAt: new Date(),
            tableId: currentTable.id,
          })),
          rows: currentTable.rows.map((row) => {
            // First, create the mapped values
            const mappedValues = Object.fromEntries(
              Object.entries(row.values as Record<string, string>)
                .map(([key, value]) => {
                  const realId = headerIdMap.get(key);
                  return realId ? [realId, value] : [key, value];
                })
                // Only keep entries that don't have temp IDs
                .filter(([key]) => Number(key) > 0),
            );

            // Then ensure all headers have values
            const finalValues = {
              ...mappedValues,
              ...Object.fromEntries(
                newHeaders.map((h) => [
                  h.id.toString(),
                  mappedValues[h.id.toString()] || "",
                ]),
              ),
            };

            console.log("Row value update:", {
              before: row.values,
              afterMapping: mappedValues,
              final: finalValues,
            });

            return {
              ...row,
              values: finalValues,
            };
          }),
        };
        console.log("Row values after update:", updatedTable.rows[0]?.values);

        return {
          ...old,
          tables: old.tables.map((table) =>
            table.id === tableData.id ? updatedTable : table,
          ),
        };
      });
      // utils.sheet.findSheet.setData({ id: sheetId }, (old) => {
      //   if (!old) return old;
      //   const currentTable = old.tables.find((t) => t.id === tableData.id);
      //   if (!currentTable) return old;

      //   console.log("Current headers:", currentTable.headers);
      //   console.log("New headers:", newHeaders);
      //   console.log("Temp headers:", ctx.headersWithTempIds);

      //   const headerIdMap = new Map(
      //     ctx.headersWithTempIds.map((tempHeader, idx) => [
      //       tempHeader.id.toString(),
      //       {
      //         realId: newHeaders[idx]?.id.toString(),
      //         name: tempHeader.name,
      //         index: idx, // Store the chronological order
      //       },
      //     ]),
      //   );

      //   const updatedTable = {
      //     ...currentTable,
      //     // Update headers with real IDs
      //     headers: currentTable.headers.map((header) => {
      //       // Find the temp header's index in the original array
      //       const tempHeaderIndex = ctx.headersWithTempIds.findIndex(
      //         (h) => h.id === header.id,
      //       );

      //       // If this is a temp header, get the corresponding real header by index
      //       const matchingNewHeader =
      //         tempHeaderIndex !== -1 ? newHeaders[tempHeaderIndex] : undefined;

      //       console.log(`Header ${header.id} (${header.name}):`, {
      //         tempHeaderIndex,
      //         matchingNewHeader,
      //       });

      //       return matchingNewHeader && header.id < 0
      //         ? { ...header, id: matchingNewHeader.id }
      //         : header;
      //     }),
      //     rows: currentTable.rows.map((row) => ({
      //       ...row,
      //       values: {
      //         ...(row.values as Record<string, string>),
      //         ...Object.fromEntries(
      //           Object.entries(row.values as Record<string, string>)
      //             .map(([key, value]) => {
      //               const mapping = headerIdMap.get(key);
      //               return mapping?.realId
      //                 ? [mapping.realId, value]
      //                 : [key, value];
      //             })
      //             .filter(([key]) => key !== undefined),
      //         ),
      //       },
      //     })),
      //   };
      //   console.log("Updated headers:", updatedTable.headers);

      //   return {
      //     ...old,
      //     tables: old.tables.map((table) =>
      //       table.id === tableData.id ? updatedTable : table,
      //     ),
      //   };
      // });

      // Wait for cache to update
      await utils.sheet.findSheet.invalidate();
      await utils.sheet.findSheet.refetch(); // Add this line

      // return {
      //   ...old,
      //   tables: old.tables.map((table) =>
      //     table.id === tableData.id
      //       ? {
      //           ...table,
      //           // Update headers with real IDs
      //           headers: table.headers.map((header) => {
      //             const matchingNewHeader = newHeaders.find(
      //               (h, idx) => ctx.headersWithTempIds[idx]?.id === header.id,
      //             );
      //             return matchingNewHeader && header.id < 0
      //               ? { ...header, id: matchingNewHeader.id }
      //               : header;
      //           }),
      //           // Preserve all rows while updating header IDs in values
      //           rows: currentTable.rows.map((row) => ({
      //             ...row,
      //             values: {
      //               ...(row.values as Record<string, string>),
      //               ...Object.fromEntries(
      //                 Object.entries(row.values as Record<string, string>)
      //                   .map(([key, value]) => {
      //                     const newKey = headerIdMap.get(key);
      //                     return newKey ? [newKey, value] : [key, value];
      //                   })
      //                   .filter(([key]) => key !== undefined),
      //               ),
      //             },
      //           })),
      //         }
      //       : table,
      //   ),
      // };
      // });

      setPendingHeaders((prev) => {
        const next = { ...prev };
        if (tableData?.id) {
          delete next[tableData.id];
        }
        return next;
      });
      console.log("Pending Batch SRIENTRSIEN:", pendingBatch);

      setPendingBatch((prev) => {
    //     const updatedValues = (values: Record<string, string>) => {
    //       console.log("Processing values in updatedValues:", {
    //         input: values,
    //         tempIds: Object.keys(values).filter((id) => Number(id) < 0),
    //       });

    //       const mappedValues = Object.fromEntries(
    //         Object.entries(values)
    //           .map(([key, value]) => {
    //             const realId = headerIdMap.get(key);
    //             return realId ? [realId, value] : [key, value];
    //           })
    //           // Only keep entries that don't have temp IDs
    //           .filter(([key]) => Number(key) > 0),
    //       );

    //       const finalValues = {
    //         ...mappedValues,
    //         ...Object.fromEntries(
    //           newHeaders.map((h) => [
    //             h.id.toString(),
    //             mappedValues[h.id.toString()] || "",
    //           ]),
    //         ),
    //       } as Record<string, string>;

    //       return Object.fromEntries(
    //         Object.entries(finalValues)
    //           .filter(([key]) => Number(key) > 0)
    //           .sort(([a], [b]) => Number(a) - Number(b)),
    //       ) as Record<string, string>; // Add explicit type assertion here
    //     };

    //     const existingRowUpdates = tableData.rows
    //       .filter((row) => row.id > 0)
    //       .map((row) => {
    //         const updated = {
    //           rowId: row.id,
    //           values: updatedValues(row.values),
    //         };
    //         console.log(`Processed existing row ${row.id}:`, updated);
    //         return updated;
    //       });

    //     const result = {
    //       updates: [
    //         ...prev.updates.map((update) => {
    //           const updated = {
    //             rowId: update.rowId,
    //             values: updatedValues(update.values),
    //           };
    //           console.log(`Processed update for row ${update.rowId}:`, updated);
    //           return updated;
    //         }),
    //         ...existingRowUpdates,
    //       ],
    //       newRows: prev.newRows.map((row) => {
    //         const updated = {
    //           ...row,
    //           values: updatedValues(row.values),
    //         };
    //         console.log(`Processed new row ${row.tempId}:`, updated);
    //         return updated;
    //       }),
    //     };

    //     console.log("Final pending batch:", result);
    //     return result;
    //   });
    // },
    // const updatedValues = (values: Record<string, string>) => ({
    //       ...values,
    //       ...Object.fromEntries(newHeaders.map((h) => [h.id.toString(), ""])),
    //       ...Object.fromEntries(
    //         Object.entries(values).map(([key, value]) => {
    //           const tempHeader = ctx.headersWithTempIds.find(
    //             (h) => h.id.toString() === key,
    //           );
    //           const realHeader =
    //             tempHeader &&
    //             newHeaders.find(
    //               (h, idx) => ctx.headersWithTempIds[idx]?.id === tempHeader.id,
    //             );
    //           return [realHeader ? realHeader.id.toString() : key, value];
    //         }),
    //       ),
    //     });
    //     const existingRowUpdates = tableData.rows
    //       .filter((row) => row.id > 0)
    //       .map((row) => ({
    //         rowId: row.id,
    //         values: updatedValues(row.values),
    //       }));

    //     return {
    //       updates: [
    //         ...prev.updates.map((update) => ({
    //           rowId: update.rowId,
    //           values: updatedValues(update.values),
    //         })),
    //         ...existingRowUpdates,
    //       ],
    //       newRows: prev.newRows.map((row) => ({
    //         ...row,
    //         values: updatedValues(row.values),
    //       })),
    //     };
    //   });
    // },

    // onSuccess(newHeaders, variables, ctx) {
    //   if (!newHeaders?.length || !tableData?.id || !ctx?.headersWithTempIds)
    //     return;

    //   // utils.sheet.findSheet.setData({ id: sheetId }, (old) => {
    //   //   if (!old) return old;
    //   //   return {
    //   //     ...old,
    //   //     tables: old.tables.map((table) =>
    //   //       table.id === tableData.id
    //   //         ? {
    //   //             ...table,
    //   //             headers: table.headers.map((header) => {
    //   //               const matchingNewHeader = newHeaders.find(
    //   //                 (h, idx) => ctx.headersWithTempIds[idx]?.id === header.id,
    //   //               );
    //   //               return matchingNewHeader && header.id < 0
    //   //                 ? { ...header, id: matchingNewHeader.id }
    //   //                 : header;
    //   //             }),
    //   //             rows: table.rows.map((row) => ({
    //   //               ...row,
    //   //               values: {
    //   //                 ...(row.values as Record<string, string>),
    //   //                 ...Object.fromEntries(
    //   //                   newHeaders.map((h, idx) => [
    //   //                     h.id.toString(),
    //   //                     (row.values as Record<string, string>)?.[
    //   //                       ctx.headersWithTempIds[idx]?.id.toString() ?? ""
    //   //                     ] ?? "",
    //   //                   ]),
    //   //                 ),
    //   //               },
    //   //             })),
    //   //           }
    //   //         : table,
    //   //     ),
    //   //   };
    //   // });

    //   // Clear pending headers
    //   setPendingHeaders((prev) => {
    //     const next = { ...prev };
    //     if (tableData?.id) {
    //       delete next[tableData.id];
    //     }
    //     return next;
    //   });
    // },

    onError(err, newData, context) {
      // Revert to previous state on error
      if (context?.prevData) {
        utils.sheet.findSheet.setData({ id: sheetId }, context.prevData);
      }
    },
  });

  // Track last activity times
  const lastHeaderAddTime = useRef(Date.now());
  const lastActiveCellTime = useRef(Date.now());

  // Update header time when adding headers
  const handleHeaderAdd = () => {
    if (!tableData?.id || !headerInput.trim()) return;

    const tempId = -Date.now();
    console.log("Adding new header:", { tempId, headerInput });

    const newHeader = {
      id: tempId,
      name: headerInput.trim(),
      tableId: tableData.id,
      createdAt: new Date(),
    };

    // Immediate UI update
    setTableData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        headers: [...prev.headers, newHeader],
        rows: prev.rows.map((row) => ({
          ...row,
          values: {
            ...row.values,
            [tempId]: "",
          },
        })),
      };
    });

    // Queue header creation
    setPendingHeaders((prev) => {
      console.log("Queueing new header:", { tempId, name: headerInput.trim() });
      return {
        ...prev,
        [tableData.id]: {
          tableId: tableData.id,
          headers: [...(prev[tableData.id]?.headers ?? []), newHeader],
        },
      };
    });

    setHeaderInput("");
    setAnchor(null);
    lastHeaderAddTime.current = Date.now();
  };

  // create a new table
  const createTable = api.table.create.useMutation({
    onSuccess: async (newTable) => {
      // REMOVED INVALIDATION
      utils.sheet.findSheet.setData({ id: sheetId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          tables: [
            ...(old.tables ?? []),
            {
              ...newTable,
              headers: [],
              rows: [],
            },
          ],
        };
      });

      // Navigate to the new table
      const params = new URLSearchParams(searchParams);
      params.set("table", newTable.id.toString());
      router.push(`${pathname}?${params.toString()}`);
    },
  });

  // add a new table
  const handleAddTable = () => {
    // create a new table with sheet ID
    createTable.mutate({ sheetId: sheetId });
  };

  // tanstack
  const columnHelper = createColumnHelper<any>();

  // update a cell
  const handleCellUpdate = useCallback(
    (
      rowId: number,
      headerId: number,
      value: string,
      rowValues: Record<string, string>,
    ) => {
      // Maintain column order
      const updatedValues = { ...rowValues };
      updatedValues[headerId.toString()] = value;

      console.log("Queueing cell update:", { rowId, headerId, value });

      // Immediate UI update
      setTableData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((row) =>
            row.id === rowId ? { ...row, values: updatedValues } : row,
          ),
        };
      });

      // Queue for batch update
      setPendingBatch((prev) => {
        if (rowId > 0) {
          // Existing row: update or add to pending updates
          const otherUpdates = prev.updates.filter((u) => u.rowId !== rowId);
          return {
            ...prev,
            updates: [...otherUpdates, { rowId, values: updatedValues }],
          };
        } else {
          // New row: update the pending row's values
          const isNewRow = prev.newRows.some((row) => row.tempId === rowId);
          if (isNewRow) {
            return {
              ...prev,
              newRows: prev.newRows.map((row) =>
                row.tempId === rowId ? { ...row, values: updatedValues } : row,
              ),
            };
          } else {
            // If not found in newRows, it might be a cell in a new column
            // Add to updates if the row exists in the database
            return {
              ...prev,
              updates: [...prev.updates, { rowId, values: updatedValues }],
            };
          }
        }
      });

      lastActiveCellTime.current = Date.now();
    },
    [],
  );

  const [activeCell, setActiveCell] = useState(false);
  // useMemo to cache values in between re-renders
  const columns = useMemo(() => {
    if (!tableData?.headers) return [];

    return tableData.headers.map((headers: { id: number; name: string }) =>
      columnHelper.accessor((row) => row.values[headers.id], {
        id: String(headers.id),
        header: () => headers.name,
        cell: (info) => (
          <Cell
            info={info}
            headers={headers}
            handleCellUpdate={handleCellUpdate}
            setActiveCell={setActiveCell}
          />
        ),
      }),
    );
  }, [tableData?.headers, handleCellUpdate, setActiveCell]);

  const table = useReactTable({
    data: useMemo(() => {
      const sortedRows = [...(tableData?.rows ?? [])].sort((a, b) => {
        // both are real rows (positive ids)
        if (a.id > 0 && b.id > 0) return a.id - b.id;
        // both are temp rows (negative ids)
        if (a.id < 0 && b.id < 0) return b.id - a.id; // newer timestamps (more negative) should come after
        // mixed: keep positive ids at top
        return a.id > 0 ? -1 : 1;
      });
      return sortedRows;
    }, [tableData?.rows]),
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
  });

  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  // Update cell time when cell is active
  useEffect(() => {
    if (activeCell) {
      lastActiveCellTime.current = Date.now();
    }
  }, [activeCell]);

  // 1. Adding a new row
  const handleRowCreate = useCallback(() => {
    if (!tableData?.id) return;
    const tempId = -Date.now();
    const initialValues: Record<string, string> = {};
    tableData.headers.forEach((header) => {
      initialValues[header.id.toString()] = "";
    });
    setTableData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: [...prev.rows, { id: tempId, values: initialValues }],
      };
    });
    // setTableData((prev) => {
    //   if (!prev) return prev;

    //   const values: Record<string, string> = {};
    //   // Just use prev.headers as it already includes pending headers
    //   prev.headers.forEach((header) => {
    //     values[header.id.toString()] = "";
    //   });

    //   return {
    //     ...prev,
    //     rows: [...prev.rows, { id: tempId, values }],
    //   };
    // });

    setPendingBatch((prev) => ({
      ...prev,
      newRows: [
        ...prev.newRows,
        {
          tableId: tableData.id,
          values: initialValues,
          tempId,
        },
      ],
    }));
  }, [tableData?.id]);

  // Track processing state
  const processingRef = useRef(false);

  useEffect(() => {
    if (activeCell) return;

    const timeoutId = setTimeout(() => {
      void (async () => {
        if (processingRef.current) return;

        // const previousData = utils.sheet.findSheet.getData({ id: sheetId });
        try {
          processingRef.current = true;
          console.log("Starting batch processing");

          const hasHeaders = Object.values(pendingHeaders).length > 0;

          // Process headers first if any exist
          if (hasHeaders) {
            console.log("Processing headers");
            // await utils.sheet.findSheet.cancel();

            const pendingHeadersByTable = Object.entries(pendingHeaders);
            const [tableIdStr, { tableId, headers }] =
              pendingHeadersByTable[0] as [
                string,
                { tableId: number; headers: { id: number; name: string }[] },
              ];

            const newHeaders = headers.filter((h) => h.id < 0);
            if (newHeaders.length > 0) {
              const createdHeaders = await addHeader.mutateAsync({
                tableId,
                headers: newHeaders.map((h) => ({ name: h.name })),
              });
              // setTableData((prev) => {
              //   if (!prev) return prev;

              //   // Update headers with real IDs
              //   const updatedHeaders = prev.headers.map((header) => {
              //     const matchingNewHeader = createdHeaders.find(
              //       (h, idx) => newHeaders[idx]?.id === header.id,
              //     );
              //     return matchingNewHeader
              //       ? { ...header, id: matchingNewHeader.id }
              //       : header;
              //   });

              //   // Update all rows with new columns
              //   const updatedRows = prev.rows.map((row) => ({
              //     ...row,
              //     values: {
              //       ...row.values,
              //       ...Object.fromEntries(
              //         createdHeaders.map((h) => [h.id.toString(), ""]),
              //       ),
              //     },
              //   }));

              //   return {
              //     ...prev,
              //     headers: updatedHeaders,
              //     rows: updatedRows,
              //   };
              // });
              // Update pendingBatch with real header IDs while preserving new rows
              // setPendingBatch((prev) => ({
              //   updates: prev.updates.map((update) => ({
              //     rowId: update.rowId,
              //     values: Object.fromEntries(
              //       Object.entries(update.values).map(([key, value]) => {
              //         const realHeader = createdHeaders.find(
              //           (h, idx) => newHeaders[idx]?.id.toString() === key,
              //         );
              //         return [
              //           realHeader ? realHeader.id.toString() : key,
              //           value,
              //         ];
              //       }),
              //     ),
              //   })),
              //   newRows: prev.newRows, // Preserve new rows
              // }));

              setPendingHeaders({});
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          const hasUpdates =
            pendingBatch.updates.length > 0 || pendingBatch.newRows.length > 0;
          console.log("Pending Batcarositenrh:", pendingBatch);
          console.log("Has Updates:", hasUpdates);
          // Then process row updates
          if (hasUpdates) {
            console.log("Processing updates ariosentrnes");
            const sortedUpdates = pendingBatch.updates.map((update) => ({
              ...update,
              values: Object.fromEntries(
                Object.entries(update.values).sort(
                  ([a], [b]) => Number(a) - Number(b),
                ),
              ),
            }));

            const sortedNewRows = pendingBatch.newRows.map((row) => ({
              ...row,
              values: Object.fromEntries(
                Object.entries(row.values).sort(
                  ([a], [b]) => Number(a) - Number(b),
                ),
              ),
            }));

            if (sortedUpdates.length > 0 || sortedNewRows.length > 0) {
              await batchUpdate.mutateAsync({
                updates: sortedUpdates,
                newRows: sortedNewRows,
              });
              setPendingBatch({ updates: [], newRows: [] });
            }
          }
        } catch (error) {
          console.error("Error processing updates:", error);
          // utils.sheet.findSheet.setData({ id: sheetId }, previousData);
        } finally {
          processingRef.current = false;
        }
      })();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [
    activeCell,
    pendingHeaders,
    pendingBatch,
    addHeader,
    batchUpdate,
    // tableData?.rows,
  ]);
  // const previousHeadersRef = useRef<Array<{ id: number; name: string }>>([]);

  // useEffect(() => {
  //   if (!tableData?.headers || !tableData.rows) return;

  //   const currentHeaders = tableData.headers.filter((h) => h.id > 0);
  //   const hasNewHeaders = currentHeaders.some(
  //     (header) => !previousHeadersRef.current.some((ph) => ph.id === header.id),
  //   );

  //   if (!hasNewHeaders) {
  //     previousHeadersRef.current = currentHeaders;
  //     return;
  //   }

  //   previousHeadersRef.current = currentHeaders;

  //   const updateRows = async () => {
  //     try {
  //       const updates = tableData.rows
  //         .filter((row) => row.id > 0)
  //         .map((row) => ({
  //           rowId: row.id,
  //           values: {
  //             ...row.values,
  //             ...Object.fromEntries(
  //               currentHeaders
  //                 .filter(
  //                   (header) =>
  //                     !Object.keys(row.values).includes(header.id.toString()),
  //                 )
  //                 .map((header) => [header.id.toString(), ""]),
  //             ),
  //           },
  //         }));

  //       if (updates.length > 0) {
  //         await batchUpdate.mutateAsync({
  //           updates,
  //           newRows: [],
  //         });
  //       }
  //     } catch (error) {
  //       console.error("Row update process failed:", error);
  //     }
  //   };

  //   void updateRows();
  // }, [tableData?.headers, tableData?.rows, batchUpdate]);

  const Cell = ({ info, headers, handleCellUpdate, setActiveCell }: any) => {
    const [value, setValue] = useState(info.getValue() ?? "");
    const inputId = `cell-${info.row.original.id}-${headers.id}`;

    return (
      <input
        id={inputId}
        name={inputId}
        className="h-[30px] w-full cursor-text border-none bg-transparent outline-none focus:ring-2 focus:ring-blue-500"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          lastActiveCellTime.current = Date.now();
          setActiveCell(true);
        }}
        onFocus={() => {
          setActiveCell(true);
          lastActiveCellTime.current = Date.now();
        }}
        onBlur={() => {
          setActiveCell(false);
          if (value !== info.getValue()) {
            handleCellUpdate(
              info.row.original.id,
              headers.id,
              value,
              info.row.original.values,
            );
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const allInputs = Array.from(
              document.querySelectorAll('input[id^="cell-"]'),
            );
            const currentIndex = allInputs.indexOf(e.currentTarget);
            const nextInput =
              allInputs[e.shiftKey ? currentIndex - 1 : currentIndex + 1];
            if (nextInput instanceof HTMLInputElement) {
              nextInput.focus();
            }
          }
        }}
      />
    );
  };

  return (
    <div className="flex h-screen flex-col">
      <div className="sticky top-0 z-50 flex h-[56px] flex-row items-center bg-[#8C3F78] pl-5 pr-4">
        <div className="flex flex-row items-center justify-start">
          <div className="w-[40px]">
            <a href="/workspaces">
              <svg
                width="24"
                height="20.4"
                viewBox="0 0 200 170"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g>
                  <path
                    fill="hsla(0, 0%, 100%, 0.95)"
                    d="M90.0389,12.3675 L24.0799,39.6605 C20.4119,41.1785 20.4499,46.3885 24.1409,47.8515 L90.3759,74.1175 C96.1959,76.4255 102.6769,76.4255 108.4959,74.1175 L174.7319,47.8515 C178.4219,46.3885 178.4609,41.1785 174.7919,39.6605 L108.8339,12.3675 C102.8159,9.8775 96.0559,9.8775 90.0389,12.3675"
                  ></path>
                  <path
                    fill="hsla(0, 0%, 100%, 0.95)"
                    d="M105.3122,88.4608 L105.3122,154.0768 C105.3122,157.1978 108.4592,159.3348 111.3602,158.1848 L185.1662,129.5368 C186.8512,128.8688 187.9562,127.2408 187.9562,125.4288 L187.9562,59.8128 C187.9562,56.6918 184.8092,54.5548 181.9082,55.7048 L108.1022,84.3528 C106.4182,85.0208 105.3122,86.6488 105.3122,88.4608"
                  ></path>
                  <path
                    fill="hsla(0, 0%, 100%, 0.95)"
                    d="M88.0781,91.8464 L66.1741,102.4224 L63.9501,103.4974 L17.7121,125.6524 C14.7811,127.0664 11.0401,124.9304 11.0401,121.6744 L11.0401,60.0884 C11.0401,58.9104 11.6441,57.8934 12.4541,57.1274 C12.7921,56.7884 13.1751,56.5094 13.5731,56.2884 C14.6781,55.6254 16.2541,55.4484 17.5941,55.9784 L87.7101,83.7594 C91.2741,85.1734 91.5541,90.1674 88.0781,91.8464"
                  ></path>
                </g>
              </svg>
            </a>
          </div>
          <MdKeyboardArrowDown className="mr-2 h-5 w-5 text-white" />
        </div>
        <div className="flex h-[28px] flex-row items-center justify-start border-r-[1px] border-gray-300 border-opacity-30">
          <button className="mr-2 flex h-[28px] items-center justify-center rounded-2xl px-3 text-white hover:bg-[#783566]">
            <p className="text-xs">Data</p>
          </button>
          <button className="mr-2 flex h-[28px] items-center justify-center rounded-2xl px-3 text-white hover:bg-[#783566]">
            <p className="text-xs">Automations</p>
          </button>
          <button className="mr-2 flex h-[28px] items-center justify-center rounded-2xl border-white px-3 text-white hover:bg-[#783566]">
            <p className="text-xs">Interfaces</p>
          </button>
        </div>
        <div className="hidden h-[28px] flex-row items-center sm:flex">
          <button className="mr-2 flex h-[28px] items-center justify-center rounded-2xl px-3 text-white hover:bg-[#783566] sm:ml-3">
            <p className="text-xs">Forms</p>
          </button>
        </div>
        <div className="ml-auto flex flex-row items-center justify-between gap-2">
          <button className="mx-[2px] hidden h-[28px] items-center justify-center rounded-2xl px-3 hover:bg-[#783566] sm:flex">
            <CiUndo className="h-4 w-4 text-white" />
          </button>
          <button className="mr-2 hidden h-[28px] items-center justify-center rounded-2xl px-3 text-white hover:bg-[#783566] sm:flex">
            <IoIosHelpCircleOutline className="mr-1 hidden h-4 w-4 text-white sm:flex" />
            <p className="text-xs">Help</p>
          </button>
          <button className="mr-2 hidden h-[28px] items-center justify-center rounded-full border-white bg-white px-3 text-[#783566] sm:flex">
            <IoPersonAddOutline className="mr-1 h-3 w-3 text-[#783566]" />
            <p className="text-xs">Share</p>
          </button>
          <button className="mr-2 hidden h-[28px] w-[28px] items-center justify-center rounded-full border-white bg-white text-[#783566] sm:flex">
            <GoBell className="h-4 w-4 text-[#783566]" />
          </button>
          <button className="mr-2 hidden h-[28px] w-[28px] items-center justify-center rounded-full border-white bg-white text-[#783566] sm:flex">
            <img
              src={session?.user?.image ?? "avatar.png"}
              className="h-full w-full rounded-full"
              alt="user avatar"
            />
          </button>
        </div>
      </div>
      <div className="flex gap-2 bg-[#8C3F78]">
        <div className="flex h-[32px] flex-grow flex-row items-center justify-center rounded-tr-md bg-[#783566]">
          <div className="ml-3 flex h-[32px] items-center justify-center">
            {/* render a tab for each table */}
            {/* selected tab looks different to non-selected tabs */}
            {sheetData?.tables.map((table, index) =>
              selectedTableId === table.id ? (
                <div
                  key={table.id}
                  className="flex h-[32px] flex-row items-center justify-center rounded-t-md bg-white pl-3 pr-2"
                >
                  <p className="mr-2 overflow-auto text-nowrap text-xs text-black">
                    Table {index + 1}
                  </p>
                  <MdKeyboardArrowDown className="h-5 w-5 text-gray-300 text-opacity-70" />
                </div>
              ) : (
                <div
                  key={table.id}
                  onClick={() => handleTableSelect(table.id)}
                  className="flex h-[32px] flex-row items-center justify-center rounded-t-md pl-3 pr-2"
                >
                  <p className="mr-2 overflow-auto text-nowrap text-xs text-white">
                    Table {index + 1}
                  </p>
                </div>
              ),
            )}
          </div>
          <div className="flex h-[32px] flex-row items-center justify-center bg-[#783566] px-3">
            <MdKeyboardArrowDown className="h-5 w-5 text-white text-opacity-70" />
          </div>
          <div className="h-[12px] w-0 border-r-[1px] border-gray-300 border-opacity-30"></div>
          <div className="flex h-[32px] flex-grow flex-row items-center justify-center px-3">
            <button onClick={() => handleAddTable()}>
              <GoPlus className="mr-auto h-5 w-5 justify-start text-white text-opacity-80 sm:mr-1" />
            </button>
            <p className="mr-auto hidden text-xs text-white text-opacity-80 sm:flex">
              Add or import
            </p>
          </div>
        </div>
        <div className="ml-auto flex h-[32px] flex-row justify-end rounded-tl-md bg-[#783566]">
          <div className="flex h-[32px] flex-row items-center justify-center px-3">
            <p className="text-xs text-white">Extensions</p>
          </div>
          <div className="flex h-[32px] flex-row items-center justify-center px-3">
            <p className="text-xs text-white">Tools</p>
            <MdKeyboardArrowDown className="h-5 w-5 text-white text-opacity-70" />
          </div>
        </div>
      </div>
      <div className="h-[44px] w-full border-b-[1px] border-gray-300 bg-white">
        <div className="flex h-[44px] flex-row items-center justify-between bg-white">
          <div className="flex flex-row items-center bg-white pl-3">
            <div className="mr-2 flex items-center">
              <button className="flex h-[26px] items-center border-[2px] border-white px-[6px] text-xs text-black">
                <RxHamburgerMenu className="h-4 w-4 text-gray-500" />
                <span className="ml-1">Views</span>
              </button>
            </div>
            <div className="ml-1 mr-3 flex h-[16px] items-center border-r-[1px] border-gray-600 border-opacity-30"></div>
            <div className="flex h-[26px] items-center px-2">
              <button className="flex items-center text-xs text-gray-700">
                <CiViewTable className="mr-1 h-4 w-4 text-blue-700" />
                <span className="mr-1 whitespace-nowrap">Grid view</span>
                <div className="ml-1 h-4 w-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
                    <rect width="4" height="4" fill="none" />
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
                <MdKeyboardArrowDown className="h-5 w-5 text-black" />
              </button>
            </div>
          </div>
          <div className="flex h-[44px] w-full flex-row items-center justify-between gap-2 bg-white pl-2 pr-4">
            <div className="flex h-[44px] flex-row items-center justify-between gap-2 bg-white">
              <div className="flex h-full items-center justify-center px-2 py-1">
                <FaRegEyeSlash className="h-4 w-4" />
                <p className="ml-1 hidden whitespace-nowrap text-xs md:flex">
                  Hide fields
                </p>
              </div>
              <div className="flex px-2 py-1">
                <PiTextAlignCenterLight className="h-4 w-4" />
                <p className="ml-1 hidden text-xs md:flex">Filter</p>
              </div>
              <div className="hidden px-2 py-1 sm:flex">
                <CiViewList className="h-4 w-4" />
                <p className="ml-1 hidden text-xs md:flex">Group</p>
              </div>
              <div className="hidden px-2 py-1 sm:flex">
                <HiArrowsUpDown className="h-4 w-4" />
                <p className="ml-1 hidden text-xs md:flex">Sort</p>
              </div>
              <div className="hidden px-2 py-1 sm:flex">
                <PiPaintBucket className="h-4 w-4" />
                <p className="ml-1 hidden text-xs md:flex">Color</p>
              </div>
              <div className="hidden px-2 py-1 sm:flex">
                <CiTextAlignJustify className="h-4 w-4" />
              </div>
              <div className="hidden px-2 py-1 sm:flex">
                <BsBoxArrowUpRight className="h-4 w-4" />
                <p className="ml-1 hidden whitespace-nowrap text-xs md:flex">
                  Share and sync
                </p>
              </div>
            </div>
            <div className="flex flex-row items-center justify-between gap-2">
              <CiSearch className="ml-1 h-5 w-5" />
              <p className="hidden text-xs md:flex">Search</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-start border-b-[1px] border-gray-300 bg-white">
        <div className="flex w-full flex-row items-center justify-start border-b-[1px] border-gray-300 bg-white">
          <table className="flex min-h-[calc(100vh-10rem)] min-w-full flex-col overflow-x-scroll">
            <thead className="z-10 flex h-[30px] flex-row">
              {table.getHeaderGroups().map((headerGroup, groupIndex) => (
                <tr
                  key={`headerGroup-${headerGroup.id}-${groupIndex}`}
                  className="flex h-[30px] flex-row bg-gray-100"
                >
                  <th
                    key={`checkbox-${headerGroup.id}`}
                    className="flex h-[30px] min-w-[35px] items-center justify-center border-y-[1px] border-l-[1px] border-gray-300"
                  >
                    <MdOutlineCheckBoxOutlineBlank className="h-4 w-4" />
                  </th>
                  {headerGroup.headers.map((header, headerIndex) => (
                    <th
                      key={`header-${headerGroup.id}-${header.id}-${headerIndex}`}
                      className="flex h-full w-[178px] flex-row items-center justify-start border-y-[1px] border-r-[1px] border-gray-300 px-2 text-xs font-normal"
                    >
                      <div className="flex h-[30px] w-full flex-row items-center justify-start">
                        <TbLetterA className="mr-2 h-4 w-4" />
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </div>
                    </th>
                  ))}
                  <th
                    key={`add-${headerGroup.id}`}
                    className="flex h-[30px] w-[92px] items-center justify-center border-y-[1px] border-r-[1px] border-gray-300"
                  >
                    <div className="relative flex justify-end">
                      <button
                        onClick={(e) =>
                          setAnchor(anchor ? null : e.currentTarget)
                        }
                      >
                        <GoPlus className="h-4 w-4" />
                      </button>
                      <Popup open={open} anchor={anchor} placement="bottom-end">
                        <div className="mt-2 w-[400px] max-w-[calc(100vw-2rem)] rounded-md border-[1px] bg-white px-4 py-2">
                          <input
                            type="text"
                            value={headerInput}
                            placeholder="Field name (optional)"
                            onChange={(e) => setHeaderInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleHeaderAdd();
                                // setShowHeaderInput(false);
                                setHeaderInput("");
                                setAnchor(null);
                              }
                            }}
                            onBlur={() => {
                              // setShowHeaderInput(false);
                              setHeaderInput("");
                              setAnchor(null);
                            }}
                            className="mt-2 h-[32px] w-full rounded-md border-[1px] border-gray-300 p-2 text-xs font-normal"
                            autoFocus
                          />
                          <div className="mb-2 mt-3 flex h-[32px] w-full flex-row items-center justify-start rounded-md border-[1px] border-gray-300 px-3 text-xs font-normal">
                            <CiSearch className="mr-2 h-5 w-5" />
                            <input
                              type="search"
                              placeholder="Find a field type"
                              className="h-full w-full"
                            />
                            <GrCircleQuestion className="ml-2 h-5 w-5" />
                          </div>
                          <div className="mb-2 mt-3 flex w-full flex-col items-center justify-start rounded-md border-[1px] border-gray-300 px-3 py-1 text-xs font-normal">
                            <div className="mb-2 flex h-[34px] w-[328px] flex-row items-center justify-start rounded-md p-2">
                              <TbLetterA className="mr-2 h-5 w-5" />
                              <p className="text-xs">Single line text</p>
                            </div>
                            <div className="mb-2 flex h-[34px] w-[328px] flex-row items-center justify-start rounded-md p-2">
                              <TbNumber1 className="mr-2 h-5 w-5" />
                              <p className="text-xs">Number</p>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </div>
                  </th>
                </tr>
              ))}
            </thead>
            <tbody className="col-start-2 flex w-full flex-col items-start justify-start border-gray-300 bg-white">
              {table.getRowModel().rows.map((row, rowIndex) => (
                <tr
                  className="flex h-[30px] flex-row border-b-[1px] border-gray-300 bg-white"
                  key={`row-${row.id}-${rowIndex}`}
                >
                  <td className="flex h-[30px] w-[35px] items-center justify-center border-b-[1px] border-gray-300 bg-white text-xs font-normal">
                    <div key={`index-${row.id}-${rowIndex}`}>
                      {rowIndex + 1}
                    </div>
                  </td>
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <td
                      className="flex h-[30px] w-[178px] flex-row items-center justify-start border-b-[1px] border-r-[1px] border-gray-300 bg-white px-2 text-xs font-normal"
                      key={`cell-${row.id}-${cell.column.id}-${cellIndex}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="flex h-[30px] flex-row border-gray-300 bg-white">
                <td className="flex h-[30px] w-[35px] items-center justify-center border-gray-300 bg-white text-xs font-normal">
                  <button
                    className="flex h-[26px] items-center border-[2px] border-white px-[6px] text-xs text-black"
                    onClick={handleRowCreate}
                  >
                    <GoPlus className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
