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
        const headers = await Promise.all(
          input.headers.map(async (h) => {
            return tx.header.create({
              data: {
                name: h.name,
                tableId: input.tableId,
                headerPosition: h.headerPosition,
              }
            });
          })
        );
        return headers;
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
