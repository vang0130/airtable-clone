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

  findTable: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const table = await ctx.db.table.findUnique({
        where: { id: input.id },
        include: { rows: true, headers: true }
      });

      return {
        ...table,
        headers: table?.headers ?? [],
        rows: table?.rows.map((row) => ({
          ...row,
          values: row.values as Record<string, string>,
        })),
      };
    }),
    // addHeader: protectedProcedure
    // .input(
    //   z.object({
    //     id: z.number(), // Table ID
    //     headers: z.array(
    //       z.object({
    //         name: z.string(), // Remove temp ID because the DB will generate a real one
    //       })
    //     ),
    //   })
    // )
    // .mutation(async ({ ctx, input }) => {
    //   await ctx.db.header.createMany({
    //     data: input.headers.map((h) => ({
    //       name: h.name, 
    //       tableId: input.id,
    //     }))
    //   })
    //   return ctx.db.header.findMany({
    //     where: {tableId: input.id },
    //     select: { id: true, name: true }, 
    //     orderBy: { id: "asc" },
    //   })
    // }),
});
