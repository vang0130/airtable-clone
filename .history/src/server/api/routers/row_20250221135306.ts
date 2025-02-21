/* eslint-disable @typescript-eslint/no-unsafe-call */
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const rowRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ 
      tableId: z.number(), 
      values: z.record(z.string()),
      position: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.row.create({
        data: {
          tableId: input.tableId,
          values: input.values,
          position: input.position,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      rowId: z.number(),
      values: z.record(z.string()),
      // position: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.row.update({
        where: { id: input.rowId },
        data: {
          values: input.values,
          // position: input.position,
        }
      });
    }),

  batchUpdate: protectedProcedure
    .input(z.object({
      updates: z.array(z.object({
        rowId: z.number(),
        values: z.record(z.string()),
        position: z.number(),
      })),
      newRows: z.array(z.object({
        tableId: z.number(),
        values: z.record(z.string()),
        id: z.number(),
        position: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const updatePromises = input.updates
          .filter(update => update.rowId > 0)
          .map((update) =>
            tx.row.update({
              where: { id: update.rowId },
              data: { 
                values: update.values,
                position: update.position,
              },
            })
          );

        const newRows = await Promise.all(
          input.newRows.map(async ({ tableId, values, position }) => {
            return tx.row.create({
              data: {
                tableId,
                values,
                position,
              },
            });
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
