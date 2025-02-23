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
      rowPosition: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.row.create({
        data: {
          tableId: input.tableId,
          values: input.values,
          rowPosition: input.rowPosition,
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
    .input(
      z.object({
        updates: z.array(
          z.object({
            rowId: z.number(),  // Use DB-generated ID for updates
            values: z.record(z.string()),
          })
        ),
        newRows: z.array(
          z.object({
            tableId: z.number(),
            values: z.record(z.string()),
            rowPosition: z.number(),  // Position only needed for creation
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const updatePromises = input.updates.map((update) =>
          tx.row.update({
            where: { id: update.rowId },
            data: { values: update.values },
            select: { id: true, values: true, rowPosition: true }
          })
        );

        const newRows = await Promise.all(
          input.newRows.map(({ tableId, values, rowPosition }) =>
            tx.row.create({
              data: { tableId, values, rowPosition },
              select: { id: true, values: true, rowPosition: true }
            })
          )
        );

        const updatedRows = await Promise.all(updatePromises);

        return { updatedRows, newRows };
      });
    }),
});
