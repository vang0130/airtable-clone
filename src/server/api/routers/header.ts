/* eslint-disable @typescript-eslint/no-unsafe-call */
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const headerRouter = createTRPCRouter({
  createMany: protectedProcedure
    .input(
      z.object({
        tableId: z.number(),
        headers: z.array(
          z.object({
            name: z.string(),
            headerPosition: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        await tx.header.createMany({
          data: input.headers.map((h) => ({
            name: h.name,
            tableId: input.tableId,
            headerPosition: h.headerPosition,
          })),
        });
        
        return tx.header.findMany({
          where: {
            tableId: input.tableId,
            headerPosition: {
              in: input.headers.map(h => h.headerPosition)
            }
          }
        });
      });
    }),

  findMany: publicProcedure
    .input(
      z.object({
        tableId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.header.findMany({
        where: { tableId: input.tableId },
        select: { id: true, name: true, headerPosition: true },
        orderBy: { headerPosition: "asc" },
      });
    }),
});
