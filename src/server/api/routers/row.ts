/* eslint-disable @typescript-eslint/no-unsafe-call */
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const rowRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ tableId: z.number(), values: z.record(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.row.create({
        data: {
          tableId: input.tableId,
          values: input.values,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      rowId: z.number(),
      values: z.record(z.string()),
      header: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.row.update({
        where: { id: input.rowId },
        data: {
          values: input.values,
        }
      });
    }),
});
