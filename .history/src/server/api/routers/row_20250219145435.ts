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
        tempId: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { updates } = input;

      return ctx.db.$transaction(async (tx) => {
        const updatePromises = updates.map((update) =>
          tx.row.update({
            where: { id: update.rowId },
            data: { values: update.values },
          })
        );

        const [updatedRows] = await Promise.all([
          Promise.all(updatePromises),
        ]);

        const newRows = await Promise.all(
          input.newRows.map(({ tableId, values }) =>
            tx.row.create({
              data: {
                tableId: tableId,
                values: values,
              },
            })
          )
        );

        return {
          updatedRows,
          newRows,
        };
      });
    }),
});
