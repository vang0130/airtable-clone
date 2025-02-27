/* eslint-disable @typescript-eslint/no-unsafe-call */
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const sheetRouter = createTRPCRouter({
  create: protectedProcedure
    .mutation(async ({ ctx }) => {
      return ctx.db.sheet.create({
        data: {
          name: `Sheet ${await ctx.db.sheet.count() + 1}`,
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });
    }),

  findMany: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.sheet.findMany({
      orderBy: { createdAt: "desc" },
      include: { 
        // createdBy: true, 
      }, 
    });
  }),
  findSheet: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const sheet = await ctx.db.sheet.findUnique({
        where: { id: input.id },
        include: {
          tables: {
            include: {
              headers: true,
              // don't fetch all rows
              rows: false,
            },
          },
        },
      });
  
      if (!sheet) return null;
  
      // for each table, fetch the first page of rows (only first 500 rows)
      const tablesWithRows = await Promise.all(
        sheet.tables.map(async (table) => {
          // fetch first page of rows for this table
          const rows = await ctx.db.row.findMany({
            where: { tableId: table.id },
            orderBy: { rowPosition: 'asc' },
            take: 500,
          });
  
          // get total row count for this table
          const totalRows = await ctx.db.row.count({
            where: { tableId: table.id }
          });
  
          return {
            ...table,
            rows: rows.map(row => ({
              ...row,
              values: row.values as Record<string, string>,
            })),
            totalRows,
            hasMoreRows: totalRows > 500
          };
        })
      );
  
      return {
        ...sheet,
        tables: tablesWithRows,
      };
    }),
});
