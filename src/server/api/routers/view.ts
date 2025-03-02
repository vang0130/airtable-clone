/* eslint-disable @typescript-eslint/no-unsafe-call */
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { FilterType } from "@prisma/client";

export const viewRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        tableId: z.number(),
        rowOrder: z.array(z.number()),
        filters: z.array(z.object({
          columnId: z.string(),
          type: z.nativeEnum(FilterType),
          value: z.string().optional(),
        })),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.view.create({
        data: {
          name: input.name,
          tableId: input.tableId,
          rowOrder: input.rowOrder,
          filters: {
            create: input.filters.map((filter) => ({
              columnId: filter.columnId,
              type: filter.type,
              value: filter.value,
            })),
          },
        },
      });
    }),
    getViews: protectedProcedure
    .input(
      z.object({
        tableId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.view.findMany({
        where: {
          tableId: input.tableId,
        },
        include: {
          filters: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }),

    getViewRows: protectedProcedure
    .input(z.object({
      tableId: z.number(),
      viewId: z.number(),
      limit: z.number(),
      cursor: z.number().optional()
    }))
    .query(async ({ ctx, input }) => {
      // fetch view with filters
      const view = await ctx.db.view.findUnique({
        where: { id: input.viewId },
        include: {
          filters: true,
        }
      });

      if (!view) throw new Error("View not found");

      // get slice of rows
      const start = input.cursor ?? 0;
      const end = start + input.limit + 1;
      const positionsToFetch = view.rowOrder.slice(start, end);

      // fetch the actual rows
      const rows = await ctx.db.row.findMany({
        where: { 
          tableId: input.tableId,
          rowPosition: { in: positionsToFetch }
        }
      });

      // sort rows according to rowOrder
      const sortedRows = positionsToFetch
        .map(pos => rows.find(row => row.rowPosition === pos))
        .filter((row): row is typeof rows[0] => !!row);

      const hasMoreRows = sortedRows.length > input.limit;
      const data = hasMoreRows ? sortedRows.slice(0, -1) : sortedRows;

      return {
        rows: data.map(row => ({
          ...row,
          values: row.values as Record<string, string>
        })),
        hasMoreRows,
        nextCursor: hasMoreRows ? start + input.limit : null
      };
    })
});