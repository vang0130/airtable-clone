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
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.row.update({
        where: { id: input.rowId },
        data: {
          values: input.values,
        }
      });
    }),

  batchUpdate: protectedProcedure
    .input(z.object({
      updates: z.array(z.object({
        rowId: z.number(),
        values: z.record(z.string(), z.string()),
      })),
      newRows: z.array(z.object({
        tableId: z.number(),
        values: z.record(z.string(), z.string()),
        id: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const updatePromises = input.updates
          .filter(update => update.rowId > 0)
          .map((update) =>
            tx.row.update({
              where: { id: update.rowId },
              data: { values: update.values },
            })
          );

        const maxPosition = await tx.row.findFirst({
          where: { tableId: input.newRows[0]?.tableId },
          orderBy: { position: 'desc' },
          select: { position: true }
        });

        let nextPosition = (maxPosition?.position ?? 0) + 1;

        const newRows = await Promise.all(
          input.newRows.map(async ({ tableId, values }) => {
            const row = await tx.row.create({
              data: {
                tableId,
                values,
                position: nextPosition++, 
              },
            });
            return row;
          })
        );

        const [updatedRows] = await Promise.all([
          Promise.all(updatePromises),
        ]);

        return {
          updatedRows,
          newRows,
        };
      });
    }),
});
