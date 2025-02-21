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
      // Get current max position for this table
      const currentMaxPosition = await ctx.db.header.findFirst({
        where: { tableId: input.tableId },
        orderBy: { position: 'desc' },
        select: { position: true }
      });

      const startPosition = (currentMaxPosition?.position ?? 0) + 1;

      // Insert multiple headers into the database
      await ctx.db.header.createMany({
        data: input.headers.map((h, index) => ({
          name: h.name,
          tableId: input.tableId,
          position: startPosition + index,
        })),
      });

      // Fetch and return headers with actual IDs
      return ctx.db.header.findMany({
        where: { tableId: input.tableId },
        select: { id: true, name: true, position: true },
        orderBy: { position: "asc" },
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
