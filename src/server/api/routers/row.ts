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
            rowId: z.number(),
            tableId: z.number(),
            rowPosition: z.number(),
            values: z.record(z.string()),
          }),
        ),
        newRows: z.array(
          z.object({
            tableId: z.number(),
            values: z.record(z.string()),
            rowPosition: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(async (tx) => {
        if (input.updates.length > 0) {
          const BATCH_SIZE = 1000;
          for (let i = 0; i < input.updates.length; i += BATCH_SIZE) {
            const batch = input.updates.slice(i, i + BATCH_SIZE);
            const placeholders = batch
              .map((_, index) => `($${index * 2 + 1}::integer, $${index * 2 + 2}::jsonb)`)
              .join(',');
            
            const values = batch.flatMap(update => [
              update.rowId,
              JSON.stringify(update.values)
            ]);

            await tx.$executeRawUnsafe(
              `UPDATE "Row" AS r
               SET "values" = c.values
               FROM (VALUES ${placeholders}) AS c(id, values)
               WHERE r.id = c.id`,
              ...values
            );
          }
        }

        // Handle new rows
        if (input.newRows.length > 0) {
          await tx.row.createMany({
            data: input.newRows,
          });
        }
      });

      return { success: true };
    }),
});
