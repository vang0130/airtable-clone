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

// to be passed to cell object
interface CellProps {
  info: {
    row: {
      original: {
        id: number;
        values: Record<string, string>;
      };
    };
    getValue: () => string;
  };
  headers: {
    id: number;
    name: string;
  };
  handleCellUpdate: (
    rowId: number,
    headerId: number,
    value: string,
    values: Record<string, string>,
  ) => void;
  setActiveCell: (active: boolean) => void;
}

export default function Sheet() {
  const utils = api.useUtils();
  const generateTempId = () => {
    return -(Date.now() % 2147483647);
  };
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

  const Cell = ({
    info,
    headers,
    handleCellUpdate,
    setActiveCell,
  }: CellProps) => {
    // console.log("Cell render:", {
    //   originalRowId: info.row.original.id,
    //   headerId: headers.id,
    //   headerName: headers.name,
    //   currentValue: info.getValue(),
    // });

    const [value, setValue] = useState(info.getValue() ?? "");

    // Use the real row ID if available
    const rowId = info.row.original.id;

    return (
      <input
        key={`cell-${rowId}-${headers.id}`}
        id={`cell-${rowId}-${headers.id}`}
        name={`cell-${rowId}-${headers.id}`}
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
              rowId,
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

  // headers that need to be mutated
  const [pendingHeaders, setPendingHeaders] = useState<
    Record<
      number,
      {
        tableId: number;
        headers: Array<{ id: number; name: string }>;
      }
    >
  >({});

  // batch update for new rows and cell changes
  const batchUpdate = api.row.batchUpdate.useMutation({
    async onMutate(variables) {
      await utils.sheet.findSheet.cancel();
      const previousData = utils.sheet.findSheet.getData({ id: sheetId });

      // optimistic update
      utils.sheet.findSheet.setData({ id: sheetId }, (old) => {
        if (!old) return old;
        const currentTable = old.tables.find((t) => t.id === tableData?.id);
        if (!currentTable) return old;

        const uniqueRows = new Map();

        // preserve existing rows
        currentTable.rows
          .filter((row) => !variables.updates.some((u) => u.rowId === row.id))
          .forEach((row) => uniqueRows.set(row.id, row));

        // update data, but keep current rows
        variables.updates.forEach((update) => {
          const existingRow = currentTable.rows.find(
            (r) => r.id === update.rowId,
          );
          if (existingRow) {
            uniqueRows.set(update.rowId, {
              ...existingRow,
              values: {
                ...(existingRow.values as Record<string, string>),
                ...update.values, // merge new values with existing ones
              },
            });
          }
        });

        // add new rows
        variables.newRows.forEach((newRow) => {
          if (!currentTable.rows.some((r) => r.id === newRow.tempId)) {
            uniqueRows.set(newRow.tempId, {
              id: newRow.tempId,
              tableId: newRow.tableId,
              values: newRow.values,
              createdAt: new Date(),
            });
          }
        });

        return {
          ...old,
          tables: old.tables.map((table) =>
            table.id === tableData?.id
              ? {
                  ...table,
                  rows: Array.from(uniqueRows.values()),
                }
              : table,
          ),
        } as typeof old;
      });

      return { previousData };
    },

    async onSuccess(result, variables, ctx) {
      if (!result) return;

      // map temp ids to real ids
      const rowIdMapping = Object.fromEntries(
        (result.newRows ?? []).map((newRow, idx) => {
          const tempId = pendingBatch.newRows[idx]?.tempId;
          return [tempId?.toString(), newRow.id.toString()];
        }),
      );

      // update tableData with real row IDs and preserve all values
      setTableData((prev) => {
        if (!prev) return prev;

        const updatedRows = prev.rows.map((row) => {
          const realId = rowIdMapping[row.id.toString()];
          if (realId) {
            return {
              ...row,
              id: parseInt(realId),
            };
          }

          // for existing rows, ensure we have the latest values
          const update = variables.updates.find((u) => u.rowId === row.id);
          if (update) {
            return {
              ...row,
              values: {
                ...row.values,
                ...update.values,
              },
            };
          }

          return row;
        });

        return {
          ...prev,
          rows: updatedRows,
        };
      });

      // clear only the processed updates from pending batch
      setPendingBatch((prev) => {
        const processedRowIds = new Set([
          ...variables.updates.map((u) => u.rowId.toString()),
          ...Object.keys(rowIdMapping),
        ]);

        return {
          updates: prev.updates.filter(
            (u) => !processedRowIds.has(u.rowId.toString()),
          ),
          newRows: prev.newRows.filter(
            (r) => !processedRowIds.has(r.tempId.toString()),
          ),
        };
      });
    },

    onError(err, newData, context) {
      console.error("Batch update error:", err);
      if (context?.previousData) {
        utils.sheet.findSheet.setData({ id: sheetId }, context.previousData);
      }
    },
  });

  // input for new header
  const [headerInput, setHeaderInput] = useState<string>("");

  // MUTATION for adding new header with optimistic UI updates
  const addHeader = api.header.createMany.useMutation({
    async onMutate({ tableId, headers }) {
      await utils.sheet.findSheet.cancel();
      const prevData = utils.sheet.findSheet.getData({ id: sheetId });

      const headersWithIds = pendingHeaders[tableId]?.headers ?? [];

      console.log("Using existing header IDs:", {
        pendingHeaders: headersWithIds.map((h) => ({ id: h.id, name: h.name })),
      });

      utils.sheet.findSheet.setData({ id: sheetId }, (old) => {
        if (!old) return old;
        const currentTable = old.tables.find((t) => t.id === tableId);
        if (!currentTable) return old;

        // get the latest row values, including any pending changes
        const latestRows = currentTable.rows.map((row) => {
          const pendingUpdate = pendingBatch.updates.find(
            (u) => u.rowId === row.id,
          );
          return {
            ...row,
            values: {
              ...((pendingUpdate?.values ?? row.values) as Record<
                string,
                string
              >),
              ...Object.fromEntries(
                headersWithIds.map((h) => [h.id.toString(), ""]),
              ),
            },
          };
        });

        const pendingRows = pendingBatch.newRows.map((newRow) => ({
          id: newRow.tempId,
          tableId,
          values: {
            ...newRow.values,
            ...Object.fromEntries(
              headersWithIds.map((h) => [h.id.toString(), ""]),
            ),
          },
          createdAt: new Date(),
        }));

        return {
          ...old,
          tables: old.tables.map((table) =>
            table.id === tableId
              ? {
                  ...table,
                  headers: [...(table.headers ?? []), ...headersWithIds],
                  rows: [...latestRows, ...pendingRows],
                }
              : table,
          ),
        } as typeof old;
      });

      return { prevData };
    },

    async onSuccess(createdHeaders, variables, ctx) {
      if (!createdHeaders?.length || !tableData?.id) return;

      setTableData((prev) => {
        if (!prev) return prev;

        const processedHeaders = pendingHeaders[tableData.id]?.headers ?? [];
        const existingHeaderCount =
          prev.headers.length - processedHeaders.length;

        // map temp ids to real ids based on order after existing headers
        const idMapping = Object.fromEntries(
          processedHeaders.map((ph, idx) => {
            const realHeader = createdHeaders[existingHeaderCount + idx];
            const mapping = [ph.id.toString(), realHeader?.id.toString()];
            console.log("Creating mapping:", {
              tempId: mapping[0],
              realId: mapping[1],
              headerName: ph.name,
              existingHeaderCount,
              mappingIndex: existingHeaderCount + idx,
              totalHeaders: prev.headers.length,
            });
            return mapping;
          }),
        );

        // update headers with real ids
        const updatedHeaders = prev.headers.map((h) => {
          const realId = idMapping[h.id.toString()];
          return realId
            ? {
                ...h,
                id: parseInt(realId),
              }
            : h;
        });

        const updatedRows = prev.rows.map((row) => ({
          ...row,
          values: Object.entries(row.values).reduce(
            (acc, [key, value]) => {
              const realId = idMapping[key];
              acc[realId ?? key] = value;
              return acc;
            },
            {} as Record<string, string>,
          ),
        }));

        return {
          ...prev,
          headers: updatedHeaders,
          rows: updatedRows,
        };
      });

      // clear pending headers after mapping is complete
      setPendingHeaders((prev) => {
        const next = { ...prev };
        delete next[tableData.id];
        return next;
      });

      headerProcessingRef.current = false;
    },

    onError(err, newData, context) {
      console.error("Error processing headers:", err);
      headerProcessingRef.current = false;
      if (context?.prevData) {
        utils.sheet.findSheet.setData({ id: sheetId }, context.prevData);
      }
    },
  });

  // TODO - necessary?
  const lastActiveCellTime = useRef(Date.now());

  const handleHeaderAdd = () => {
    if (!tableData?.id || !headerInput.trim()) return;

    const tempId = generateTempId();

    const newHeader = {
      id: tempId,
      name: headerInput.trim(),
      tableId: tableData.id,
      createdAt: new Date(),
    };

    setTableData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        headers: [...prev.headers, newHeader],
        rows: prev.rows.map((row) => ({
          ...row,
          values: {
            ...row.values,
            [tempId.toString()]: "",
          },
        })),
      };
    });

    setPendingHeaders((prev) => ({
      ...prev,
      [tableData.id]: {
        tableId: tableData.id,
        headers: [...(prev[tableData.id]?.headers ?? []), newHeader],
      },
    }));

    setHeaderInput("");
    setAnchor(null);
    // lastHeaderAddTime.current = Date.now();
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
      console.log("Cell Update Started:", {
        rowId,
        headerId,
        value,
        existingValues: rowValues,
        pendingBatchState: pendingBatch,
        tableDataState: tableData,
      });

      // do not try to update if headers are still processing (because of tempIds)
      if (headerProcessingRef.current) {
        console.log("Headers still processing, deferring cell update");
        return;
      }

      // validate that the header exists
      if (!tableData?.headers.some((header) => header.id === headerId)) {
        console.warn("Attempting to update cell with non-existent header", {
          headerId,
          availableHeaders: tableData?.headers,
        });
        return;
      }

      // update the value, ensuring all headers are present
      const updatedValues = {
        ...rowValues,
        [headerId.toString()]: value,
        ...Object.fromEntries(
          tableData?.headers
            .filter((header) => !(header.id.toString() in rowValues))
            .map((header) => [header.id.toString(), ""]),
        ),
      };

      // check all OTHER rows for missing headers
      const rowsNeedingUpdate = tableData?.rows
        .filter((row) => {
          if (row.id === rowId) return false;
          const needsUpdate = tableData?.headers.some(
            (header) => !(header.id.toString() in row.values),
          );
          return needsUpdate;
        })
        .map((row) => ({
          rowId: row.id,
          values: {
            ...row.values,
            ...Object.fromEntries(
              tableData?.headers
                .filter((header) => !(header.id.toString() in row.values))
                .map((header) => [header.id.toString(), ""]),
            ),
          },
        }));

      setTableData((prev) => {
        if (!prev) return prev;
        const updatedRows = prev.rows.map((row) =>
          row.id === rowId
            ? { ...row, values: updatedValues }
            : rowsNeedingUpdate?.find((u) => u.rowId === row.id)
              ? {
                  ...row,
                  values: rowsNeedingUpdate.find((u) => u.rowId === row.id)!
                    .values,
                }
              : row,
        );
        console.log("TableData update:", {
          prevRows: prev.rows.map((r) => ({ id: r.id, values: r.values })),
          updatedRows: updatedRows.map((r) => ({ id: r.id, values: r.values })),
        });
        return {
          ...prev,
          rows: updatedRows,
        };
      });

      setPendingBatch((prev) => {
        const existingUpdates = prev.updates.filter((u) => u.rowId !== rowId);
        const newUpdates = [
          { rowId, values: updatedValues },
          ...(rowsNeedingUpdate ?? []).filter(
            (update) =>
              !existingUpdates.some(
                (existing) => existing.rowId === update.rowId,
              ),
          ),
        ];

        console.log("Pending batch update:", {
          previousBatch: prev,
          newUpdates,
          finalBatch: {
            updates: [...existingUpdates, ...newUpdates],
            newRows: prev.newRows,
          },
        });

        return {
          updates: [...existingUpdates, ...newUpdates],
          newRows:
            rowId > 0
              ? prev.newRows
              : prev.newRows.map((row) =>
                  row.tempId === rowId
                    ? { ...row, values: updatedValues }
                    : row,
                ),
        };
      });
    },
    [tableData?.headers, tableData?.rows],
  );

  const [activeCell, setActiveCell] = useState(false);

  // useMemo to cache values in between re-renders
  const columns = useMemo(() => {
    if (!tableData?.headers) return [];

    console.log(
      "Rebuilding columns with headers:",
      tableData.headers.map((h) => ({ id: h.id, name: h.name })),
    );

    return tableData.headers.map((header) => {
      // Ensure we're using the correct header ID as the accessor
      return columnHelper.accessor(
        (row) => {
          const value = row.values[header.id.toString()];
          return value ?? "";
        },
        {
          id: header.id.toString(),
          header: () => header.name,
          cell: (info) => {
            return (
              <Cell
                info={info}
                headers={header} // Pass the current header from the column definition
                handleCellUpdate={handleCellUpdate}
                setActiveCell={setActiveCell}
              />
            );
          },
        },
      );
    });
  }, [tableData?.headers, handleCellUpdate]);

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

  // TODO - necessary?
  useEffect(() => {
    if (activeCell) {
      lastActiveCellTime.current = Date.now();
    }
  }, [activeCell]);

  // TODO: check this
  const processingRef = useRef(false);
  const headerProcessingRef = useRef(false);

  const handleRowCreate = useCallback(() => {
    if (headerProcessingRef.current) {
      // console.log("Waiting for headers to finish processing...");
      return;
    }

    if (!tableData?.id) return;

    const tempId = generateTempId();

    const newRowValues = Object.fromEntries(
      tableData.headers.map((header) => [header.id.toString(), ""]),
    );

    // update ui
    setTableData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: [
          ...prev.rows,
          {
            id: tempId,
            values: newRowValues,
          },
        ],
      };
    });

    // check all rows for missing headers
    const rowsNeedingUpdate = tableData.rows
      .filter((row) => {
        // check which headers this specific row is missing
        return tableData.headers.some(
          (header) => !(header.id.toString() in row.values),
        );
      })
      .map((row) => ({
        rowId: row.id,
        values: {
          ...row.values,
          ...Object.fromEntries(
            tableData.headers
              .filter((header) => !(header.id.toString() in row.values))
              .map((header) => [header.id.toString(), ""]),
          ),
        },
      }));

    // queue both new row and updates for existing rows
    setPendingBatch((prev) => ({
      updates: [...prev.updates, ...rowsNeedingUpdate],
      newRows: [
        ...prev.newRows,
        {
          tableId: tableData.id,
          values: newRowValues,
          tempId,
        },
      ],
    }));
  }, [tableData?.id, headerProcessingRef.current]);

  // retry constants and refs
  const RETRY_DELAY = 2000; // ms
  const MAX_RETRIES = 10;
  const headerRetryRef = useRef<NodeJS.Timeout | null>(null);
  const rowRetryRef = useRef<NodeJS.Timeout | null>(null);
  const headerRetryCountRef = useRef(0);
  const rowRetryCountRef = useRef(0);

  // HEADER MUTATIONS
  useEffect(() => {
    // clear any existing retry timeout
    if (headerRetryRef.current) {
      clearTimeout(headerRetryRef.current);
      headerRetryRef.current = null;
    }

    // do not start new processing if already processing
    if (headerProcessingRef.current) {
      console.log("Header processing already in progress, skipping");
      return;
    }

    // check if row mutations are happening
    if (processingRef.current) {
      if (headerRetryCountRef.current < MAX_RETRIES) {
        // console.log(
        //   `Row mutation in progress, scheduling header retry #${headerRetryCountRef.current + 1}`,
        // );
        headerRetryRef.current = setTimeout(() => {
          headerRetryCountRef.current++;
          setPendingHeaders((prev) => ({ ...prev }));
        }, RETRY_DELAY);
      } else {
        console.warn(
          "Max header retries reached, will try again with next batch",
        );
        headerRetryCountRef.current = 0;
      }
      return;
    }

    // reset retry count when starting fresh
    headerRetryCountRef.current = 0;

    const processHeaders = async () => {
      if (Object.keys(pendingHeaders).length === 0) return;

      try {
        headerProcessingRef.current = true;
        console.log("Starting header processing", { pendingHeaders });

        const pendingHeadersEntries = Object.entries(pendingHeaders);
        const [_, headerData] = pendingHeadersEntries[0] as [
          string,
          { tableId: number; headers: { id: number; name: string }[] },
        ];

        await addHeader.mutateAsync({
          tableId: headerData.tableId,
          headers: headerData.headers.map((h) => ({ name: h.name })),
        });
      } catch (error) {
        console.error("Error processing headers:", error);
      }
    };

    const timeoutId = setTimeout(() => {
      void processHeaders();
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      if (headerRetryRef.current) {
        clearTimeout(headerRetryRef.current);
        headerRetryRef.current = null;
      }
    };
  }, [pendingHeaders, addHeader]);

  // ROW MUTATIONS
  useEffect(() => {
    // clear any existing retry timeout
    if (rowRetryRef.current) {
      clearTimeout(rowRetryRef.current);
      rowRetryRef.current = null;
    }

    // STRICT CHECK: don't even attempt retries if cell is active
    if (activeCell) {
      // console.log("Cell is active, deferring row processing");
      return;
    }

    // don't start new processing if already processing
    if (processingRef.current) {
      // console.log("Row processing already in progress, skipping");
      return;
    }

    // check if headers are processing
    if (headerProcessingRef.current) {
      if (rowRetryCountRef.current < MAX_RETRIES) {
        // console.log(
        //   `Headers processing, scheduling row retry #${rowRetryCountRef.current + 1}`,
        // );
        rowRetryRef.current = setTimeout(() => {
          rowRetryCountRef.current++;
          setPendingBatch((prev) => ({
            updates: [...prev.updates],
            newRows: [...prev.newRows],
          }));
        }, RETRY_DELAY);
      } else {
        console.warn("Max row retries reached, will try again with next batch");
        rowRetryCountRef.current = 0;
      }
      return;
    }

    // reset retry count when starting fresh
    rowRetryCountRef.current = 0;

    const processBatch = async () => {
      // double check active cell state before processing
      if (activeCell) {
        console.log("Cell became active, cancelling row processing");
        return;
      }

      if (
        pendingBatch.updates.length === 0 &&
        pendingBatch.newRows.length === 0
      )
        return;

      try {
        processingRef.current = true;
        console.log("Starting row processing", { pendingBatch });

        const result = await batchUpdate.mutateAsync({
          updates: pendingBatch.updates.filter((update) => update.rowId > 0),
          newRows: pendingBatch.newRows,
        });

        if (!result) {
          throw new Error("Batch update failed - no result returned");
        }
      } catch (error) {
        console.error("Error processing rows:", error);
        if (rowRetryCountRef.current < MAX_RETRIES) {
          rowRetryCountRef.current++;
          rowRetryRef.current = setTimeout(() => {
            setPendingBatch((prev) => ({
              updates: [...prev.updates],
              newRows: [...prev.newRows],
            }));
          }, RETRY_DELAY);
        }
      } finally {
        processingRef.current = false;
      }
    };

    const timeoutId = setTimeout(() => {
      void processBatch();
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      if (rowRetryRef.current) {
        clearTimeout(rowRetryRef.current);
        rowRetryRef.current = null;
      }
    };
  }, [activeCell, pendingBatch.updates, pendingBatch.newRows, batchUpdate]);

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
