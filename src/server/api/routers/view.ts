/* eslint-disable @typescript-eslint/no-unsafe-call */
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const viewRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        tableId: z.number(),
        rowOrder: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.view.create({
        data: {
          name: input.name,
          tableId: input.tableId,
          rowOrder: input.rowOrder,
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
      // fetch view
      const view = await ctx.db.view.findUnique({
        where: { id: input.viewId }
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