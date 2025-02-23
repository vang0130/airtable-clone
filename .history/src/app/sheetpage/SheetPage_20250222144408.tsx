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
} from "@tanstack/react-table";
import { Unstable_Popup as Popup } from "@mui/base/Unstable_Popup";
import type { JsonValue } from "next-auth/adapters";

// some type declarations
interface Table {
  headers: Array<{
    id?: number;
    name: string;
    headerPosition: number;
    isPending?: boolean;
  }>;
  id: number;
  rows: {
    id?: number;
    values: Record<string, string>;
    rowPosition: number;
    isPending?: boolean;
  }[];
}

interface Header {
  id?: number;
  name: string;
  headerPosition: number;
  isPending?: boolean;
}

interface Row {
  id?: number;
  values: Record<string, string>;
  rowPosition: number;
  isPending?: boolean;
}

// to be passed to cell object
interface CellProps {
  info: {
    row: {
      original: {
        id?: number;
        values: Record<string, string>;
        rowPosition: number;
      };
    };
    getValue: () => string;
  };
  headers: {
    id?: number;
    name: string;
    headerPosition: number;
  };
  handleCellUpdate: (
    rowPosition: number,
    headerPosition: number,
    value: string,
    values: Record<string, string>,
  ) => void;
  setActiveCell: (active: boolean) => void;
}

type TableRow = {
  id: number;
  values: JsonValue;
  tableId: number;
  rowPosition: number;
  createdAt: Date;
};

interface PendingChanges {
  headers: Record<
    number,
    {
      tableId: number;
      headers: {
        name: string;
        headerPosition: number;
        isPending?: boolean;
      }[];
    }
  >;
  rows: {
    updates: {
      rowId: number; // Include rowId for updates
      values: Record<string, string>;
    }[];
    newRows: {
      tableId: number;
      values: Record<string, string>;
      rowPosition: number;
      isPending?: boolean;
    }[];
  };
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

  // track changes before save
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({
    headers: {},
    rows: { updates: [], newRows: [] },
  });

  const Cell = ({
    info,
    headers,
    handleCellUpdate,
    setActiveCell,
  }: CellProps) => {
    // const rowId = info.row.original.id;
    const rowPosition = info.row.original.rowPosition;
    const [value, setValue] = useState(info.getValue() ?? "");

    // NOTE: use ROW POSITION
    useEffect(() => {
      if (
        document.activeElement !==
        document.getElementById(
          `cell-${info.row.original.rowPosition}-${headers.headerPosition}`,
        )
      ) {
        setValue(info.getValue() ?? "");
      }
    }, [
      info.getValue(),
      info.row.original.rowPosition,
      headers.headerPosition,
    ]);

    return (
      <input
        key={`cell-${info.row.original.rowPosition}-${headers.headerPosition}`}
        id={`cell-${info.row.original.rowPosition}-${headers.headerPosition}`}
        name={`cell-${info.row.original.rowPosition}-${headers.headerPosition}`}
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
              rowPosition,
              headers.headerPosition,
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

  // MUTATION for adding new header with optimistic UI updates
  const addHeader = api.header.createMany.useMutation({
    async onMutate({ tableId, headers }) {
      await utils.sheet.findSheet.cancel();
      const prevData = utils.sheet.findSheet.getData({ id: sheetId });

      utils.sheet.findSheet.setData({ id: sheetId }, (old) => {
        if (!old) return old;
        const currentTable = old.tables.find((t) => t.id === tableId);
        if (!currentTable) return old;

        const currentHeaders = [...(currentTable.headers ?? [])].sort(
          (a, b) => a.headerPosition - b.headerPosition,
        );
        const maxPosition = Math.max(
          ...currentHeaders.map((h) => h.headerPosition),
          0,
        );

        const newHeaders = headers.map((h, index) => ({
          name: h.name,
          headerPosition: maxPosition + index + 1,
          isPending: true,
        }));

        return {
          ...old,
          tables: old.tables.map((table) =>
            table.id === tableId
              ? {
                  ...table,
                  headers: [...currentHeaders, ...newHeaders].sort(
                    (a, b) => a.headerPosition - b.headerPosition,
                  ),
                }
              : table,
          ),
        } as typeof old;
      });

      // pass positions to mutation
      const maxPosition = Math.max(
        ...(prevData?.tables
          .find((t) => t.id === tableId)
          ?.headers?.map((h) => h.headerPosition) ?? []),
        0,
      );
      const headersWithPositions = headers.map((h, index) => ({
        ...h,
        headerPosition: maxPosition + index + 1,
      }));

      return { prevData, headersWithPositions };
    },

    onError(err, newData, context) {
      if (context?.prevData) {
        utils.sheet.findSheet.setData({ id: sheetId }, context.prevData);
      }
    },
  });

  const [activeCell, setActiveCell] = useState(false);

  // initial table if none selected
  // nav to correct url
  useEffect(() => {
    if (isMutating.current) return;
    console.log("useeffect for table data q");
    if (sheetData?.tables && !selectedTableId) {
      const firstTableId = sheetData.tables[0]?.id;
      if (firstTableId) {
        const params = new URLSearchParams(searchParams);
        params.set("table", firstTableId.toString());
        router.push(`${pathname}?${params.toString()}`);
      }
    }
  }, [sheetData?.tables, selectedTableId, router, pathname, searchParams]);

  // TODO - necessary?
  // sync displayed table data with server data and pending changes
  // useEffect(() => {
  //   if (!sheetData?.tables || !selectedTableId) return;
  //   if (activeCell) return;
  //   if (isMutating.current) return;

  //   const shouldUpdate =
  //     !tableData ||
  //     tableData.id !== selectedTableId ||
  //     sheetData.tables.some(
  //       (t) => t.id === selectedTableId && t !== tableData,
  //     ) ||
  //     Object.keys(pendingChanges.headers).length > 0 ||
  //     pendingChanges.rows.updates.length > 0 ||
  //     pendingChanges.rows.newRows.length > 0;

  //   if (!shouldUpdate) return;

  //   console.log("useeffect for table data 2");

  //   const foundTable = sheetData.tables.find(
  //     (table) => table.id === selectedTableId,
  //   );
  //   if (!foundTable) return;

  //   const allHeaders = [
  //     ...foundTable.headers.filter(
  //       (header) =>
  //         !pendingChanges.headers[selectedTableId]?.headers.some(
  //           (newHeader) => newHeader.headerPosition === header.headerPosition,
  //         ),
  //     ),
  //     ...(pendingChanges.headers[selectedTableId]?.headers ?? []),
  //   ].sort((a, b) => a.headerPosition - b.headerPosition);

  //   // only update existing rows if they have pending changes
  //   const updatedRows = foundTable.rows
  //     .map((row) => {
  //       const pendingUpdate = pendingChanges.rows.updates.find(
  //         (u) => u.rowId === row.id,
  //       );

  //       // oly modify row if there's a pending update
  //       if (!pendingUpdate) return row;

  //       return {
  //         ...row,
  //         values: {
  //           ...Object.fromEntries(
  //             allHeaders.map((header) => [header.position.toString(), ""]),
  //           ),
  //           ...pendingUpdate.values,
  //         },
  //         isPending: true,
  //       };
  //     })
  //     .sort((a, b) => a.position - b.position);

  //   //combine with new rows
  //   const allRows = [
  //     ...updatedRows,
  //     ...pendingChanges.rows.newRows
  //       .filter((newRow) => newRow.tableId === selectedTableId)
  //       .map((newRow) => ({
  //         id: newRow.id,
  //         values: {
  //           ...Object.fromEntries(
  //             allHeaders.map((header) => [header.position.toString(), ""]),
  //           ),
  //           ...newRow.values,
  //         },
  //         rowPosition: newRow.rowPosition,
  //         isPending: true,
  //       })),
  //   ].sort((a, b) => a.rowPosition - b.rowPosition);

  //   setTableData({
  //     ...foundTable,
  //     headers: allHeaders,
  //     rows: allRows as {
  //       id: number;
  //       values: Record<string, string>;
  //       position: number;
  //     }[],
  //   });
  // }, [sheetData?.tables, selectedTableId, pendingChanges, activeCell]);

  // switch to new url
  const handleTableSelect = (tableId: number) => {
    // clear pending changes when switching tables
    setPendingChanges({
      headers: {},
      rows: { updates: [], newRows: [] },
    });

    const params = new URLSearchParams(searchParams);
    params.set("table", tableId.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const [tableData, setTableData] = useState<Table | undefined>(undefined);
  const isMutating = useRef(false);

  const batchUpdate = api.row.batchUpdate.useMutation({
    async onMutate(variables) {
      // console.log("=== Starting Mutation ===");
      // console.log("TableData before mutation:", tableData);
      // console.log("Variables:", variables);

      await utils.sheet.findSheet.cancel();
      const prevData = utils.sheet.findSheet.getData({ id: sheetId });
      // console.log("Previous data:", prevData);

      utils.sheet.findSheet.setData({ id: sheetId }, (old) => {
        if (!old) return old;

        // const table = old.tables.find((t) => t.id === tableData?.id);
        // console.log("Found table:", table);

        // console.log("Current table rows:", tableData?.rows);
        // console.log("Incoming new rows:", variables.newRows);
        // console.log("Incoming updates:", variables.updates);

        const updatedRows = tableData?.rows
          .filter(
            (row) =>
              !variables.newRows.some(
                (nr) => nr.rowPosition === row.rowPosition,
              ),
          )
          .map((row) => {
            const update = variables.updates.find((u) => u.rowId === row.id);
            return update
              ? { ...row, values: { ...row.values, ...update.values } }
              : row;
          });

        // console.log("After filtering and updates:", updatedRows);

        const finalRows = [
          ...(updatedRows ?? []),
          ...variables.newRows.map((row) => ({
            values: row.values as JsonValue,
            tableId: tableData?.id ?? 0,
            rowPosition: row.rowPosition,
            createdAt: new Date(),
          })),
        ].sort((a, b) => a.rowPosition - b.rowPosition) as TableRow[];

        // console.log("Final combined rows:", finalRows);

        return {
          ...old,
          tables: old.tables.map((table) =>
            table.id === tableData?.id
              ? {
                  ...table,
                  rows: finalRows,
                }
              : table,
          ),
        };
      });

      return { prevData };
    },
    onError(err, newData, context) {
      if (context?.prevData) {
        utils.sheet.findSheet.setData({ id: sheetId }, context.prevData);
      }
    },
  });

  const saveAllChanges = useCallback(async () => {
    if (!tableData?.id) return;

    try {
      await utils.sheet.findSheet.cancel();
      if (Object.keys(pendingChanges.headers).length > 0) {
        const entries = Object.entries(pendingChanges.headers);
        const headerData = entries[0]?.[1];
        if (headerData) {
          isMutating.current = true;
          await addHeader.mutateAsync({
            tableId: headerData.tableId,
            headers: headerData.headers.map((h) => ({
              name: h.name,
              headerPosition: h.headerPosition,
            })),
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const updatedPendingRows = {
        updates: pendingChanges.rows.updates.map((update) => ({
          rowId: update.rowId,
          values: update.values,
        })),
        newRows: pendingChanges.rows.newRows,
      };

      if (
        updatedPendingRows.updates.length > 0 ||
        updatedPendingRows.newRows.length > 0
      ) {
        await batchUpdate.mutateAsync(updatedPendingRows);
      }

      setPendingChanges({
        headers: {},
        rows: { updates: [], newRows: [] },
      });
      isMutating.current = false;

      await utils.sheet.findSheet.invalidate();
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  }, [
    tableData?.id,
    pendingChanges,
    addHeader,
    batchUpdate,
    utils.sheet.findSheet,
  ]);

  // use useCallback for the handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveAllChanges();
      }
    },
    [saveAllChanges],
  );

  // attach the handler in useEffect
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // input for new header
  const [headerInput, setHeaderInput] = useState<string>("");

  // TODO - necessary?
  const lastActiveCellTime = useRef(Date.now());

  const handleHeaderAdd = (newHeader: { name: string }) => {
    if (!tableData?.id) return;

    const currentHeaders = [
      ...tableData.headers.filter(
        (header) =>
          !pendingChanges.headers[tableData.id]?.headers.some(
            (newHeader) => newHeader.headerPosition === header.headerPosition,
          ),
      ),
      ...(pendingChanges.headers[tableData.id]?.headers ?? []),
    ].sort((a, b) => a.headerPosition - b.headerPosition);

    const maxPosition = Math.max(
      ...currentHeaders.map((h) => h.headerPosition),
      0,
    );
    const nextPosition = maxPosition + 1;

    const headerWithPosition = {
      headerPosition: nextPosition,
      name: newHeader.name,
      isPending: true,
    };

    setPendingChanges((prev) => ({
      ...prev,
      headers: {
        [tableData.id]: {
          tableId: tableData.id,
          headers: [
            ...(prev.headers[tableData.id]?.headers ?? []),
            headerWithPosition,
          ].sort((a, b) => a.headerPosition - b.headerPosition),
        },
      },
    }));

    // after adding header, update rows
    updateRowsForNewHeader(nextPosition);
  };

  // separate function to update rows with new header
  const updateRowsForNewHeader = (headerPosition: number) => {
    if (!tableData) return;

    // Only update existing (non-pending) rows
    const updatedExistingRows = tableData.rows
      .filter(
        (row) =>
          !row.isPending &&
          !pendingChanges.rows.updates.some((u) => u.rowId === row.id),
      )
      .map((row) => ({
        rowId: row.id!,
        rowPosition: row.rowPosition,
        values: {
          ...row.values,
          [headerPosition.toString()]: "",
        },
      }))
      .sort((a, b) => a.rowPosition - b.rowPosition);

    setPendingChanges((prev) => ({
      ...prev,
      rows: {
        updates: [...prev.rows.updates, ...updatedExistingRows].sort((a, b) => {
          const rowA = tableData.rows.find((r) => r.id === a.rowId);
          const rowB = tableData.rows.find((r) => r.id === b.rowId);
          return (rowA?.rowPosition ?? 0) - (rowB?.rowPosition ?? 0);
        }),
        newRows: prev.rows.newRows
          .map((row) => ({
            ...row,
            values: {
              ...row.values,
              [headerPosition.toString()]: "",
            },
          }))
          .sort((a, b) => a.rowPosition - b.rowPosition),
      },
    }));
  };

  const createTable = api.table.create.useMutation({
    onSuccess: async (newTable) => {
      // clear current table data
      setTableData(undefined);

      // clear pending changes
      setPendingChanges({
        headers: {},
        rows: { updates: [], newRows: [] },
      });

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
      rowPosition: number,
      headerPosition: number,
      value: string,
      rowValues: Record<string, string>,
    ) => {
      if (!tableData?.id) return;

      const updatedValues = {
        ...rowValues,
        [headerPosition.toString()]: value,
      };

      // Check if this is a new row
      const isNewRow = pendingChanges.rows.newRows.some(
        (r) => r.rowPosition === rowPosition,
      );

      if (isNewRow) {
        // Update the new row
        setPendingChanges((prev) => ({
          ...prev,
          rows: {
            updates: prev.rows.updates,
            newRows: prev.rows.newRows.map((row) =>
              row.rowPosition === rowPosition
                ? { ...row, values: updatedValues }
                : row,
            ),
          },
        }));
      } else {
        const existingRow = tableData.rows.find(
          (r) => r.rowPosition === rowPosition,
        );
        if (existingRow?.id) {
          setPendingChanges((prev) => ({
            ...prev,
            rows: {
              updates: [
                ...prev.rows.updates.filter(
                  (u): u is { rowId: number; values: Record<string, string> } =>
                    typeof u.rowId === "number",
                ),
                {
                  rowId: existingRow.id,
                  values: updatedValues,
                },
              ],
              newRows: prev.rows.newRows,
            },
          }));
        }
      }
    },
    [tableData?.id, pendingChanges.rows.newRows],
  );

  // useMemo to cache values in between re-renders
  const columns = useMemo(() => {
    if (!tableData?.headers || !tableData.id) return [];

    // get unique headers by position
    const allHeaders = Object.values(
      [
        ...tableData.headers.filter(
          (header) =>
            !pendingChanges.headers[tableData.id]?.headers.some(
              (newHeader) => newHeader.headerPosition === header.headerPosition,
            ),
        ),
        ...(pendingChanges.headers[tableData.id]?.headers ?? []),
      ].reduce(
        (acc, header) => {
          acc[header.headerPosition] = {
            ...header,
            headerPosition: header.headerPosition,
          };
          return acc;
        },
        {} as Record<number, Header>,
      ),
    ).sort((a, b) => a.headerPosition - b.headerPosition);

    // console.log("All headers before mapping:", allHeaders);

    return allHeaders.map((header) => {
      return columnHelper.accessor(
        (row) => {
          const value = row.values[header.headerPosition.toString()];
          return value ?? "";
        },
        {
          headerPosition: header.headerPosition.toString(),
          header: () => header.name,
          cell: (info) => (
            <Cell
              info={info}
              headers={header}
              handleCellUpdate={handleCellUpdate}
              setActiveCell={setActiveCell}
            />
          ),
        },
      );
    });
  }, [
    tableData?.headers,
    tableData?.id,
    pendingChanges.headers,
    handleCellUpdate,
  ]);

  const table = useReactTable({
    data: useMemo(() => {
      const sortedRows = [...(tableData?.rows ?? [])].sort(
        (a, b) => a.rowPosition - b.rowPosition,
      );
      return sortedRows;
    }, [tableData?.rows]),
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
  });

  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  // TODO - necessary?
  useEffect(() => {
    if (activeCell) {
      lastActiveCellTime.current = Date.now();
    }
  }, [activeCell]);

  const handleRowCreate = useCallback(() => {
    if (!tableData?.id) return;

    //only use tableData rows that aren't in pendingChanges
    const currentRows = [
      ...tableData.rows.filter(
        (row) =>
          !pendingChanges.rows.newRows.some(
            (newRow) => newRow.rowPosition === row.rowPosition,
          ),
      ),
      ...pendingChanges.rows.newRows,
    ].sort((a, b) => a.rowPosition - b.rowPosition);

    console.log("Current sorted rows:", currentRows);

    const maxPosition = Math.max(
      ...currentRows.map((row) => Number(row.rowPosition)),
      0,
    );
    const nextPosition = maxPosition + 1;

    console.log("Next position:", nextPosition);

    // Create new row
    const newRow = {
      values: Object.fromEntries(
        tableData.headers.map((header) => [
          header.headerPosition.toString(),
          "",
        ]),
      ),
      rowPosition: nextPosition,
      tableId: tableData.id,
      isPending: true,
    };

    setPendingChanges((prev) => ({
      ...prev,
      rows: {
        ...prev.rows,
        newRows: [...prev.rows.newRows, newRow].sort(
          (a, b) => Number(a.rowPosition) - Number(b.rowPosition),
        ),
      },
    }));

    console.log("pending changes", pendingChanges);

    setTableData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: [
          ...prev.rows,
          {
            values: Object.fromEntries(
              tableData.headers.map((header) => [
                header.headerPosition.toString(),
                "",
              ]),
            ),
            rowPosition: nextPosition,
            tableId: tableData.id,
            isPending: true,
          },
        ].sort((a, b) => a.rowPosition - b.rowPosition),
      };
    });
  }, [
    tableData?.id,
    tableData?.headers,
    pendingChanges.headers,
    pendingChanges.rows.newRows,
  ]);

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
                                handleHeaderAdd({
                                  name: headerInput,
                                });
                                setHeaderInput("");
                                setAnchor(null);
                              }
                            }}
                            onBlur={() => {
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
