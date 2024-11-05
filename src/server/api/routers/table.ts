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
          header: [],
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

  findTable: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const table = await ctx.db.table.findUnique({
        where: { id: input.id },
        include: { rows: true }
      });

      return {
        ...table,
        rows: table?.rows.map((row) => ({
          ...row,
          values: row.values as Record<string, string>,
        })),
      };
    }),

  addHeader: protectedProcedure
    .input(z.object({ 
      id: z.number(), 
      header: z.array(z.object({
        id: z.number(),
        name: z.string()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.table.update({
        where: { id: input?.id },
        data: { header: input?.header },
      });
    }),

});
