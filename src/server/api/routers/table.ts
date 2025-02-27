/* eslint-disable @typescript-eslint/no-unsafe-call */
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const tableRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ sheetId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tableCount = await ctx.db.table.count();
      return ctx.db.table.create({
        data: {
          name: `Table ${tableCount + 1}`,
          // headers: [],
          createdById: ctx.session.user.id,
          sheetId: input.sheetId,
        },
      });
    }),

  findMany: publicProcedure
    .input(z.object({ sheetId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.table.findMany({
        where: { sheetId: input.sheetId },
        orderBy: { createdAt: "desc" },
        include: { 
          // createdBy: true, 
        }, 
      });
    }),

    getMoreRows: publicProcedure
    .input(z.object({
      tableId: z.number(),
      page: z.number().optional().default(0),
      pageSize: z.number().optional().default(500),
      cursor: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Build query options
      const baseOptions = {
        where: { tableId: input.tableId },
        orderBy: { rowPosition: 'asc' as const }, // Use const assertion
        take: input.pageSize + 1
      };
  
      // Add cursor or skip depending on pagination type
      const queryOptions = input.cursor
        ? { 
            ...baseOptions,
            cursor: { id: input.cursor },
            skip: 1 // Skip the cursor row itself
          }
        : {
            ...baseOptions,
            skip: input.page * input.pageSize
          };
  
      // Execute the query with properly typed options
      const rows = await ctx.db.row.findMany(queryOptions);
      
      // If we got more rows than pageSize, there are more rows to fetch
      const hasMoreRows = rows.length > input.pageSize;
      
      // Remove the extra row from the results
      const data = hasMoreRows ? rows.slice(0, input.pageSize) : rows;
      
      // Return the rows, along with the next cursor and hasMoreRows flag
      return {
        rows: data.map((row) => ({
          ...row,
          values: row.values as Record<string, string>,
        })),
        nextCursor: data.length > 0 ? data[data.length - 1]?.id : null,
        hasMoreRows: hasMoreRows,
      };
    }),
});