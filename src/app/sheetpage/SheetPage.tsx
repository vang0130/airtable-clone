/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";
import { TbLetterA, TbNumber1 } from "react-icons/tb";
import { GoPlus, GoBell } from "react-icons/go";
import { RxHamburgerMenu } from "react-icons/rx";
import {
  MdKeyboardArrowDown,
  MdOutlineCheckBoxOutlineBlank,
} from "react-icons/md";
import {
  CiViewTable,
  CiSearch,
  CiViewList,
  CiTextAlignJustify,
  CiUndo,
} from "react-icons/ci";
import { FaRegEyeSlash } from "react-icons/fa";
import { PiTextAlignCenterLight, PiPaintBucket } from "react-icons/pi";
import { HiArrowsUpDown } from "react-icons/hi2";
import { BsBoxArrowUpRight } from "react-icons/bs";
import { IoIosHelpCircleOutline } from "react-icons/io";
import { IoPersonAddOutline } from "react-icons/io5";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Unstable_Popup as Popup } from "@mui/base/Unstable_Popup";
import type { JsonValue } from "next-auth/adapters";
import { HeaderType } from "@prisma/client";

// some type declarations
interface Table {
  headers: Array<{
    id?: number; // check
    name: string;
    headerPosition: number;
    type: HeaderType;
  }>;
  id: number;
  rows: {
    id?: number; // check
    values: Record<string, string>;
    rowPosition: number;
    tableId: number;
  }[];
}

interface CellProps {
  info: {
    row: {
      original: {
        tableId: number;
        id?: number;
        values: Record<string, string>;
        rowPosition: number;
      };
    };
    getValue: () => string;
  };
  headers: {
    tableId: number;
    id?: number;
    name: string;
    headerPosition: number;
  };

  // callback function for cell updates
  handleCellUpdate: (
    tableId: number,
    rowPosition: number,
    headerPosition: number,
    value: string,
    values: Record<string, string>,
  ) => void;
}

// changes to save on the next ctrl+s
// position is unique for each table id
interface PendingChanges {
  headers: Record<
    number,
    {
      tableId: number;
      headers: {
        name: string;
        headerPosition: number;
        type: HeaderType;
      }[];
    }
  >;
  rows: {
    updates: {
      tableId: number;
      rowId: number;
      rowPosition: number;
      values: Record<string, string>;
    }[];
    newRows: {
      tableId: number;
      values: Record<string, string>;
      rowPosition: number;
    }[];
  };
}

interface View {
  id: number;
  name: string;
  rowOrder: number[];
  tableId: number;
}

export default function Sheet() {
  const utils = api.useUtils();
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

  const [tableData, setTableData] = useState<Table | undefined>(undefined);
  // check if mutation is currently happening
  const isMutating = useRef(false);

  const [headerInputAnchor, setHeaderInputAnchor] =
    useState<null | HTMLElement>(null);
  const headerInputOpen = Boolean(headerInputAnchor);
  const [headerType, setHeaderType] = useState<HeaderType>(HeaderType.TEXT);

  const [viewInputAnchor, setViewInputAnchor] = useState<null | HTMLElement>(
    null,
  );
  const viewInputOpen = Boolean(viewInputAnchor);

  // input for new header
  const [headerInput, setHeaderInput] = useState<string>("");

  // tanstack
  const columnHelper = createColumnHelper<any>();

  // saving indicator
  const [isSaving, setIsSaving] = useState(false);

  // infinite scrolling
  const [rowsToShow, setRowsToShow] = useState(50);
  const ROWS_PER_LOAD = 50;

  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [savingView, setSavingView] = useState(false);
  type SortDirection = "desc" | "asc" | null;
  interface SortConfig {
    columnId: string;
    direction: SortDirection;
    priority: number;
  }

  // current sort config
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);

  // create a new table
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

  // cell component
  const Cell = ({ info, headers, handleCellUpdate }: CellProps) => {
    const [editingValue, setEditingValue] = useState(info.getValue() ?? "");
    const inputRef = useRef<HTMLInputElement>(null);
    const cellId = `cell-${info.row.original.rowPosition}-${headers.headerPosition}`;

    useEffect(() => {
      if (document.activeElement !== inputRef.current) {
        setEditingValue(info.getValue() ?? "");
      }
    }, [info]);

    const handleSave = () => {
      if (editingValue !== info.getValue()) {
        handleCellUpdate(
          info.row.original.tableId,
          info.row.original.rowPosition,
          headers.headerPosition,
          editingValue,
          info.row.original.values,
        );
      }
    };

    const focusNextCell = (reverse = false) => {
      const allInputs = Array.from(
        document.querySelectorAll('input[id^="cell-"]'),
      );
      const currentIndex = allInputs.indexOf(inputRef.current!);
      const nextIndex = reverse ? currentIndex - 1 : currentIndex + 1;

      if (nextIndex >= 0 && nextIndex < allInputs.length) {
        (allInputs[nextIndex] as HTMLInputElement).focus();
      }
    };

    return (
      <input
        ref={inputRef}
        id={cellId}
        className="h-[30px] w-full cursor-text border-none bg-transparent outline-none focus:ring-2 focus:ring-blue-500"
        value={editingValue}
        onChange={(e) => setEditingValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            if (editingValue !== info.getValue()) {
              handleCellUpdate(
                info.row.original.tableId,
                info.row.original.rowPosition,
                headers.headerPosition,
                editingValue,
                info.row.original.values,
              );
            }
            focusNextCell(e.shiftKey);
          } else if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
      />
    );
  };

  // initial table if none selected
  // nav to correct url
  useEffect(() => {
    if (isMutating.current || selectedTableId) return;
    if (sheetData?.tables && !selectedTableId) {
      const firstTableId = sheetData.tables[0]?.id;
      if (firstTableId) {
        const params = new URLSearchParams(searchParams);
        params.set("table", firstTableId.toString());
        router.push(`${pathname}?${params.toString()}`);
      }
    }
  }, [sheetData?.tables, selectedTableId, router, pathname, searchParams]);

  // update the table data with the pending changes for UI
  useEffect(() => {
    if (!sheetData?.tables || !selectedTableId) return;

    const selectedTable = sheetData.tables.find(
      (t) => t.id === selectedTableId,
    );
    if (!selectedTable) return;

    // merge server data with pending changes
    const mergedTable: Table = {
      ...selectedTable,
      headers: [
        ...selectedTable.headers.filter(
          (h) =>
            !pendingChanges.headers[selectedTableId]?.headers.some(
              (ph) => ph.headerPosition === h.headerPosition,
            ),
        ),
        ...(pendingChanges.headers[selectedTableId]?.headers ?? []),
      ].sort((a, b) => a.headerPosition - b.headerPosition),
      rows: [
        ...selectedTable.rows.map((row) => {
          const pendingUpdate = pendingChanges.rows.updates.find(
            (u) => u.rowId === row.id,
          );
          return {
            ...row,
            values: pendingUpdate
              ? {
                  ...(row.values as Record<string, string>),
                  ...pendingUpdate.values,
                }
              : (row.values as Record<string, string>),
          };
        }),
        ...pendingChanges.rows.newRows,
      ].sort((a, b) => a.rowPosition - b.rowPosition),
    };

    setTableData(mergedTable);
  }, [sheetData, selectedTableId, pendingChanges]);

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

  // batch update for rows (mutation)
  const batchUpdate = api.row.batchUpdate.useMutation({
    async onMutate() {
      await utils.sheet.findSheet.cancel();
      const prevData = utils.sheet.findSheet.getData({ id: sheetId });

      utils.sheet.findSheet.setData({ id: sheetId }, (old) => {
        if (!old) return old;

        return {
          ...old,
          tables: old.tables.map((table) =>
            table.id === tableData?.id
              ? {
                  ...table,
                  rows: table.rows.map((row) => ({
                    ...row,
                    values: row.values as JsonValue,
                    id: row.id,
                    createdAt: row.createdAt,
                    tableId: row.tableId,
                    rowPosition: row.rowPosition,
                  })),
                }
              : table,
          ),
        };
      });

      return { prevData };
    },
  });

  // MUTATION for adding new header with optimistic UI updates
  const addHeader = api.header.createMany.useMutation({
    async onMutate({ tableId, headers }) {
      await utils.sheet.findSheet.cancel();
      const prevData = utils.sheet.findSheet.getData({ id: sheetId });

      // update the table data with the new header
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
          type: h.type,
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

  const BATCH_SIZE = 5000;

  const saveAllChanges = useCallback(async () => {
    if (!tableData?.id) return;

    console.log(pendingChanges);
    try {
      setIsSaving(true);
      await utils.sheet.findSheet.cancel();

      // handle headers first (assuming this is relatively small)
      if (Object.keys(pendingChanges.headers).length > 0) {
        const entries = Object.entries(pendingChanges.headers);
        const headerData = entries[0]?.[1];
        if (headerData) {
          console.log("header data: ", headerData);
          await addHeader.mutateAsync({
            tableId: headerData.tableId,
            headers: headerData.headers.map((h) => ({
              name: h.name,
              headerPosition: h.headerPosition,
              type: h.type,
            })),
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // handle row updates in batches
      const { updates, newRows } = pendingChanges.rows;

      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batchUpdates = updates.slice(i, i + BATCH_SIZE);
        await batchUpdate.mutateAsync({
          updates: batchUpdates,
          newRows: [],
        });
      }

      for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
        const batchNewRows = newRows.slice(i, i + BATCH_SIZE);
        await batchUpdate.mutateAsync({
          updates: [],
          newRows: batchNewRows,
        });
      }

      await utils.sheet.findSheet.refetch();
      setPendingChanges({
        headers: {},
        rows: { updates: [], newRows: [] },
      });
    } catch (error) {
      console.error("Error saving changes:", error);
      setIsSaving(false);
    } finally {
      setIsSaving(false);
    }
  }, [
    tableData?.id,
    pendingChanges,
    addHeader,
    batchUpdate,
    utils.sheet.findSheet,
  ]);

  // save all changes on ctrl+s
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveAllChanges();
      }
    },
    [saveAllChanges],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // add a new header
  const handleHeaderAdd = (newHeader: { name: string; type: HeaderType }) => {
    if (!tableData?.id) return;

    const currentHeaders = [
      ...tableData.headers.filter(
        (header) =>
          !pendingChanges.headers[tableData.id]?.headers.some(
            (pendingHeader) =>
              pendingHeader.headerPosition === header.headerPosition,
          ),
      ),
      ...(pendingChanges.headers[tableData.id]?.headers ?? []),
    ].sort((a, b) => a.headerPosition - b.headerPosition);

    const maxPosition = Math.max(
      ...currentHeaders.map((h) => h.headerPosition),
      0,
    );
    const nextPosition = maxPosition + 1;

    if (currentHeaders.some((h) => h.headerPosition === nextPosition)) {
      console.error("Position collision detected");
      return;
    }

    setPendingChanges((prev) => {
      const newState = {
        ...prev,
        headers: {
          [tableData.id]: {
            tableId: tableData.id,
            headers: [
              ...(prev.headers[tableData.id]?.headers ?? []),
              {
                name: newHeader.name,
                type: newHeader.type,
                headerPosition: nextPosition,
              },
            ].sort((a, b) => a.headerPosition - b.headerPosition),
          },
        },
      };
      return newState;
    });

    // after adding header, update rows
    updateRowsForNewHeader(nextPosition);
  };

  // separate function to update rows with new header
  const updateRowsForNewHeader = (headerPosition: number) => {
    if (!tableData?.id) return;

    setPendingChanges((prev) => {
      // existing rows that aren't in pendingChanges yet
      const existingRowUpdates = tableData.rows
        .filter(
          (row) =>
            !prev.rows.updates.some((update) => update.rowId === row.id) &&
            !prev.rows.newRows.some(
              (newRow) => newRow.rowPosition === row.rowPosition,
            ),
        )
        .map((row) => ({
          rowId: row.id!,
          tableId: tableData.id,
          rowPosition: row.rowPosition,
          values: {
            ...row.values,
            [headerPosition.toString()]: "",
          },
        }));

      // existing pending updates
      const updatedPendingUpdates = prev.rows.updates.map((update) => ({
        ...update,
        values: {
          ...update.values,
          [headerPosition.toString()]: "",
        },
      }));

      // update any new rows
      const updatedNewRows = prev.rows.newRows.map((row) => ({
        ...row,
        values: {
          ...row.values,
          [headerPosition.toString()]: "",
        },
      }));

      return {
        ...prev,
        rows: {
          updates: [...existingRowUpdates, ...updatedPendingUpdates].sort(
            (a, b) => a.rowPosition - b.rowPosition,
          ),
          newRows: updatedNewRows.sort((a, b) => a.rowPosition - b.rowPosition),
        },
      };
    });
  };

  const handleRowCreate = useCallback(() => {
    if (!tableData?.id) return;

    // all current headers including pending ones
    const allHeaders = [
      ...tableData.headers.filter(
        (header) =>
          !pendingChanges.headers[tableData.id]?.headers.some(
            (newHeader) => newHeader.headerPosition === header.headerPosition,
          ),
      ),
      ...(pendingChanges.headers[tableData.id]?.headers ?? []),
    ].sort((a, b) => a.headerPosition - b.headerPosition);

    // get all current rows including pending ones
    const currentRows = [
      ...tableData.rows,
      ...pendingChanges.rows.newRows,
    ].sort((a, b) => a.rowPosition - b.rowPosition);

    const nextPosition =
      currentRows.length > 0
        ? Math.max(...currentRows.map((row) => row.rowPosition)) + 1
        : 1;

    // create new row with values for all headers
    const newRow = {
      values: Object.fromEntries(
        allHeaders.map((header) => [header.headerPosition.toString(), ""]),
      ),
      rowPosition: nextPosition,
      tableId: tableData.id,
    };

    // update pending changes
    setPendingChanges((prev) => ({
      ...prev,
      rows: {
        ...prev.rows,
        newRows: [...prev.rows.newRows, newRow].sort(
          (a, b) => a.rowPosition - b.rowPosition,
        ),
      },
    }));
  }, [tableData?.id, tableData?.headers, pendingChanges.headers]);

  // update a cell
  const handleCellUpdate = useCallback(
    (
      tableId: number,
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

      const targetRow = tableData.rows.find(
        (r) => r.rowPosition === rowPosition && r.tableId === tableId,
      );

      const header = tableData?.headers.find(
        (h) => h.headerPosition.toString() === headerPosition.toString(),
      );

      if (header?.type === HeaderType.NUMBER) {
        if (isNaN(Number(value)) || value === "") {
          return;
        }
      } else if (header?.type === HeaderType.TEXT) {
        if (/^\d+$/.test(value)) {
          return;
        }
      }

      if (targetRow?.id) {
        setPendingChanges((prev) => ({
          ...prev,
          rows: {
            updates: [
              ...prev.rows.updates.filter((u) => u.rowId !== targetRow.id),
              {
                rowId: targetRow.id!,
                rowPosition,
                tableId,
                values: updatedValues,
              },
            ],
            newRows: prev.rows.newRows,
          },
        }));
      } else {
        // update new row using position
        setPendingChanges((prev) => ({
          ...prev,
          rows: {
            updates: prev.rows.updates,
            newRows: prev.rows.newRows.map((row) =>
              row.rowPosition === rowPosition && row.tableId === tableId
                ? {
                    ...row,
                    values: updatedValues,
                  }
                : row,
            ),
          },
        }));
      }
    },
    [tableData],
  );

  // create a "view" of a particular table
  const createView = api.view.create.useMutation({
    async onMutate({}) {
      await utils.sheet.findSheet.cancel();
      const prevData = utils.sheet.findSheet.getData({ id: sheetId });

      return { prevData };
    },
    onError(err, newData, context) {
      if (context?.prevData) {
        utils.sheet.findSheet.setData({ id: sheetId }, context.prevData);
      }
    },
  });

  // get all views for a table
  const { data: views, refetch: refetchViews } = api.view.getViews.useQuery(
    { tableId: tableData?.id ?? 0 },
    { enabled: !!tableData?.id },
  );

  // save a view
  const handleViewSave = async () => {
    if (!tableData?.id) return;

    try {
      setSavingView(true);

      // save any pending changes
      if (
        Object.keys(pendingChanges.headers).length > 0 ||
        pendingChanges.rows.updates.length > 0 ||
        pendingChanges.rows.newRows.length > 0
      ) {
        await saveAllChanges();
      }

      // get current row order after changes are saved
      const currentOrder = table
        .getRowModel()
        .rows.map((row) => row.original.rowPosition);

      const newView = await createView.mutateAsync({
        name: viewName,
        tableId: tableData.id,
        rowOrder: currentOrder,
        // sortConfig,
      });

      // refetch views after successful creation
      await refetchViews();

      setViewName("");
      setViewInputAnchor(null);

      // navigate to the new view
      const params = new URLSearchParams(searchParams);
      params.set("view", newView.id.toString());
      router.push(`${pathname}?${params.toString()}`);
    } catch (error) {
      console.error("Error saving view:", error);
      setSavingView(false);
    } finally {
      setSavingView(false);
    }
  };

  const handleViewSelect = (viewId: number | null) => {
    setSortConfigs([]); // clear all sorts
    const params = new URLSearchParams(searchParams);
    if (viewId) {
      params.set("view", viewId.toString());
    } else {
      params.delete("view");
    }
    router.push(`${pathname}?${params.toString()}`);
    setViewsMenuOpen(false);
  };

  const sortRows = (rows: any[], configs: SortConfig[]) => {
    // if no sort, keep original order
    if (configs.length === 0) return rows;

    // sort by priority (lowest/earliest first)
    const orderedConfigs = [...configs].sort((a, b) => a.priority - b.priority);

    // if only one sort
    if (configs.length === 1) {
      return [...rows].sort((a, b) => {
        const config = orderedConfigs[0];
        const aValue = a.values[config?.columnId ?? ""] ?? "";
        const bValue = b.values[config?.columnId ?? ""] ?? "";

        if (!isNaN(aValue) && !isNaN(bValue)) {
          const comparison = Number(aValue) - Number(bValue);
          return config?.direction === "asc" ? comparison : -comparison;
        }
        const comparison = aValue.toString().localeCompare(bValue.toString());
        return config?.direction === "asc" ? comparison : -comparison;
      });
    }

    // if two sorts
    const primarySort = orderedConfigs[0];
    const secondarySort = orderedConfigs[1];

    // group rows by primary sort value
    const groups = new Map<string, typeof rows>();
    rows.forEach((row) => {
      const value = row.values[primarySort?.columnId ?? ""] ?? "";
      if (!groups.has(value)) {
        groups.set(value, []);
      }
      groups.get(value)!.push(row);
    });

    // sort each group by secondary sort
    const sortedRows: typeof rows = [];
    [...groups.entries()]
      .sort(([a], [b]) => {
        if (!isNaN(Number(a)) && !isNaN(Number(b))) {
          const comparison = Number(a) - Number(b);
          return primarySort?.direction === "asc" ? comparison : -comparison;
        }
        const comparison = a.toString().localeCompare(b.toString());
        return primarySort?.direction === "asc" ? comparison : -comparison;
      })
      .forEach(([_, groupRows]) => {
        // sort within group by secondary sort
        groupRows.sort((a, b) => {
          const aValue = a.values[secondarySort?.columnId ?? ""] ?? "";
          const bValue = b.values[secondarySort?.columnId ?? ""] ?? "";

          if (!isNaN(aValue) && !isNaN(bValue)) {
            const comparison = Number(aValue) - Number(bValue);
            return secondarySort?.direction === "asc"
              ? comparison
              : -comparison;
          }
          const comparison = aValue.toString().localeCompare(bValue.toString());
          return secondarySort?.direction === "asc" ? comparison : -comparison;
        });
        sortedRows.push(...groupRows);
      });

    return sortedRows;
  };

  // caching columns for the table
  const columns = useMemo(() => {
    if (!tableData?.headers || !tableData.id) return [];

    const allHeaders = [
      ...tableData.headers.filter(
        (header) =>
          !pendingChanges.headers[tableData.id]?.headers.some(
            (newHeader) => newHeader.headerPosition === header.headerPosition,
          ),
      ),
      ...(pendingChanges.headers[tableData.id]?.headers ?? []),
    ].sort((a, b) => a.headerPosition - b.headerPosition);

    return allHeaders.map((header) =>
      columnHelper.accessor(
        (row) => row.values[header.headerPosition.toString()] ?? "",
        {
          id: header.headerPosition.toString(),
          header: () => (
            <div className="flex h-[30px] w-full flex-row items-center justify-between">
              <div className="flex items-center">
                {header.type === HeaderType.TEXT ? (
                  <TbLetterA className="mr-2 h-4 w-4" />
                ) : (
                  <TbNumber1 className="mr-2 h-4 w-4" />
                )}
                {header.name}
              </div>
              <button
                onClick={() => {
                  const columnId = header.headerPosition.toString();
                  const existingSort = sortConfigs.find(
                    (s) => s.columnId === columnId,
                  );
                  const maxPriority = Math.max(
                    ...sortConfigs.map((s) => s.priority),
                    0,
                  );

                  if (!existingSort) {
                    // add new sort
                    setSortConfigs([
                      ...sortConfigs,
                      {
                        columnId,
                        direction: "desc",
                        priority: maxPriority + 1,
                      },
                    ]);
                  } else {
                    // update existing sort
                    setSortConfigs(
                      sortConfigs
                        .map((sort) => {
                          if (sort.columnId === columnId) {
                            // toggle direction or remove if already asc
                            if (sort.direction === "desc") {
                              return { ...sort, direction: "asc" };
                            } else {
                              return null; // remove this sort
                            }
                          }
                          return sort;
                        })
                        .filter((sort): sort is SortConfig => sort !== null),
                    );
                  }
                }}
                className="ml-2 rounded px-1 hover:bg-gray-200"
              >
                {(() => {
                  const sort = sortConfigs.find(
                    (s) => s.columnId === header.headerPosition.toString(),
                  );
                  if (!sort) return "↕";
                  return `${sort.direction === "desc" ? "↓" : "↑"}${sort.priority}`;
                })()}
              </button>
            </div>
          ),
          cell: (info) => (
            <Cell
              info={info}
              headers={{ ...header, tableId: tableData.id }}
              handleCellUpdate={handleCellUpdate}
            />
          ),
        },
      ),
    );
  }, [
    tableData?.headers,
    tableData?.id,
    pendingChanges.headers,
    handleCellUpdate,
    sortConfigs,
  ]);

  const table = useReactTable({
    data: useMemo(() => {
      if (!tableData?.rows) return [];

      // get existing rows that aren't in pendingChanges
      const existingRows = tableData.rows.filter(
        (row) =>
          !pendingChanges.rows.updates.some(
            (update) => update.rowId === row.id,
          ) &&
          !pendingChanges.rows.newRows.some(
            (newRow) => newRow.rowPosition === row.rowPosition,
          ),
      );

      // combine with pending updates and new rows
      let allRows = [
        ...existingRows,
        ...pendingChanges.rows.updates.map((update) => ({
          ...update,
          id: update.rowId,
          tableId: update.tableId,
          values: update.values,
        })),
        ...pendingChanges.rows.newRows,
      ];

      const viewId = searchParams.get("view")
        ? parseInt(searchParams.get("view")!)
        : null;

      if (viewId && views) {
        const view = views.find((v) => v.id === viewId);
        if (view?.rowOrder) {
          allRows = view.rowOrder
            .map((position) =>
              allRows.find((row) => row.rowPosition === position),
            )
            .filter((row): row is (typeof allRows)[0] => !!row);
        }
      } else if (sortConfigs.length > 0) {
        // Apply multi-column sort if no view is selected
        allRows = sortRows(allRows, sortConfigs);
      } else {
        // default sorting by rowPosition
        allRows.sort((a, b) => a.rowPosition - b.rowPosition);
      }

      return allRows.slice(0, rowsToShow);
    }, [
      tableData?.rows,
      pendingChanges.rows.updates,
      pendingChanges.rows.newRows,
      rowsToShow,
      searchParams,
      views,
      sortConfigs,
    ]),
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
  });

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const bottomReached = scrollHeight - scrollTop <= clientHeight * 1.5;

      console.log({
        scrollTop,
        scrollHeight,
        clientHeight,
        bottomReached,
        currentRowsShown: rowsToShow,
        totalRows:
          (tableData?.rows?.length ?? 0) + pendingChanges.rows.newRows.length,
      });

      if (bottomReached) {
        const totalRows =
          (tableData?.rows?.length ?? 0) + pendingChanges.rows.newRows.length;
        setRowsToShow((prev) => Math.min(prev + ROWS_PER_LOAD, totalRows));
      }
    },
    [tableData?.rows?.length, pendingChanges.rows.newRows.length],
  );

  const handleBulkRowCreate = useCallback(() => {
    if (!tableData?.id) return;

    // get all current headers including pending ones
    const allHeaders = [
      ...tableData.headers.filter(
        (header) =>
          !pendingChanges.headers[tableData.id]?.headers.some(
            (newHeader) => newHeader.headerPosition === header.headerPosition,
          ),
      ),
      ...(pendingChanges.headers[tableData.id]?.headers ?? []),
    ].sort((a, b) => a.headerPosition - b.headerPosition);

    // get all current rows including pending ones
    const currentRows = [
      ...tableData.rows,
      ...pendingChanges.rows.newRows,
    ].sort((a, b) => a.rowPosition - b.rowPosition);

    const startPosition =
      currentRows.length > 0
        ? Math.max(...currentRows.map((row) => row.rowPosition)) + 1
        : 1;

    // create 15000 new rows
    const newRows = Array.from({ length: 15000 }, (_, index) => ({
      values: Object.fromEntries(
        allHeaders.map((header) => [header.headerPosition.toString(), ""]),
      ),
      rowPosition: startPosition + index,
      tableId: tableData.id,
    }));

    // update pending changes
    setPendingChanges((prev) => ({
      ...prev,
      rows: {
        ...prev.rows,
        newRows: [...prev.rows.newRows, ...newRows].sort(
          (a, b) => a.rowPosition - b.rowPosition,
        ),
      },
    }));
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
          {isSaving && (
            <div className="flex h-[28px] flex-col items-center justify-center rounded-2xl px-3">
              <span className="text-xs text-white">Saving data...</span>
            </div>
          )}
          {savingView && (
            <div className="flex h-[28px] flex-col items-center justify-center rounded-2xl px-3">
              <span className="text-xs text-white">Saving view...</span>
            </div>
          )}
          <button
            onClick={handleBulkRowCreate}
            className="mr-2 hidden h-[28px] items-center justify-center rounded-full border-white bg-white px-3 text-[#783566] sm:flex"
          >
            <p className="text-xs">Add 15K Rows</p>
          </button>
          <button
            // onClick={handleBulkRowCreate}
            onClick={(e) =>
              setViewInputAnchor(viewInputAnchor ? null : e.currentTarget)
            }
            className="mr-2 hidden h-[28px] items-center justify-center rounded-full border-white bg-white px-3 text-[#783566] sm:flex"
          >
            <p className="text-xs">Save View</p>
          </button>
          <Popup
            open={viewInputOpen}
            anchor={viewInputAnchor}
            placement="bottom-end"
          >
            <div className="mt-2 w-[400px] max-w-[calc(100vw-2rem)] border-[1px] bg-white px-4 py-2">
              <input
                type="text"
                value={viewName}
                placeholder="View name"
                onChange={(e) => setViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleViewSave();
                    setViewName("");
                    setViewInputAnchor(null);
                  }
                }}
                onBlur={() => {
                  setViewName("");
                  setViewInputAnchor(null);
                }}
                className="mt-2 h-[32px] w-full rounded-md border-[1px] border-gray-300 p-2 text-xs font-normal"
                autoFocus
              />
            </div>
          </Popup>
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
            <div className="relative mr-2 flex items-center">
              <button
                className="flex h-[26px] items-center border-[2px] border-white px-[6px] text-xs text-black hover:bg-gray-100"
                onClick={() => setViewsMenuOpen(!viewsMenuOpen)}
              >
                <RxHamburgerMenu className="h-4 w-4 text-gray-500" />
                <span className="ml-1">Views</span>
              </button>
              {viewsMenuOpen && (
                <div className="absolute left-0 top-[30px] z-50 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <button
                      className="block w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        handleViewSelect(null);
                        setViewsMenuOpen(false);
                      }}
                      onBlur={() => {
                        setViewsMenuOpen(false);
                      }}
                    >
                      Default View
                    </button>
                    {views?.map((view: View) => (
                      <button
                        key={view.id}
                        className="block w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          handleViewSelect(view.id);
                          setViewsMenuOpen(false);
                        }}
                      >
                        {view.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
          <div
            className="flex min-h-[calc(100vh-10rem)] min-w-full flex-col overflow-x-scroll"
            onScroll={handleScroll}
            style={{ maxHeight: "calc(100vh - 200px)" }}
          >
            <table>
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
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </th>
                    ))}
                    <th
                      key={`add-${headerGroup.id}`}
                      className="flex h-[30px] w-[92px] items-center justify-center border-y-[1px] border-r-[1px] border-gray-300"
                    >
                      <div className="relative flex justify-end">
                        <button
                          onClick={(e) =>
                            setHeaderInputAnchor(
                              headerInputAnchor ? null : e.currentTarget,
                            )
                          }
                        >
                          <GoPlus className="h-4 w-4" />
                        </button>
                        <Popup
                          open={headerInputOpen}
                          anchor={headerInputAnchor}
                          placement="bottom-end"
                        >
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
                                    type: headerType,
                                  });
                                  setHeaderInput("");
                                  setHeaderInputAnchor(null);
                                }
                              }}
                              className="mt-2 h-[32px] w-full rounded-md border-[1px] border-gray-300 p-2 text-xs font-normal"
                              autoFocus
                            />
                            <div className="mb-1 mt-3 flex w-full flex-col items-center justify-start rounded-md border-[1px] border-gray-300 px-3 py-1 text-xs font-normal">
                              <div
                                className={`mb-2 flex h-[34px] w-[328px] cursor-pointer flex-row items-center justify-start rounded-md p-2 hover:bg-gray-100 ${
                                  headerType === HeaderType.TEXT
                                    ? "bg-gray-100 font-medium"
                                    : ""
                                }`}
                                onClick={() => setHeaderType(HeaderType.TEXT)}
                              >
                                <TbLetterA className="mr-2 h-5 w-5" />
                                <p className="text-xs">Text</p>
                              </div>
                              <div
                                className={`flex h-[34px] w-[328px] cursor-pointer flex-row items-center justify-start rounded-md p-2 hover:bg-gray-100 ${
                                  headerType === HeaderType.NUMBER
                                    ? "bg-gray-100 font-medium"
                                    : ""
                                }`}
                                onClick={() => setHeaderType(HeaderType.NUMBER)}
                              >
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
    </div>
  );
}
