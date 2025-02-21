/* eslint-disable @typescript-eslint/no-unsafe-call */
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const headerRouter = createTRPCRouter({
  /**
   * Create multiple headers for a given table.
   */
  createMany: protectedProcedure
    .input(
      z.object({
        tableId: z.number(),
        headers: z.array(
          z.object({
            name: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Insert multiple headers into the database
      await ctx.db.header.createMany({
        data: input.headers.map((h, index) => ({
          name: h.name,
          tableId: input.tableId, // Link headers to the correct table
          position: index + 1,
        })),
      });

      // Fetch and return headers with actual IDs
      return ctx.db.header.findMany({
        where: { tableId: input.tableId },
        select: { id: true, name: true },
        orderBy: { id: "asc" },
      });
    }),

  /**
   * Retrieve all headers for a given table.
   */
  findMany: publicProcedure
    .input(
      z.object({
        tableId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.header.findMany({
        where: { tableId: input.tableId },
        select: { id: true, name: true },
        orderBy: { id: "asc" },
      });
    }),
});
