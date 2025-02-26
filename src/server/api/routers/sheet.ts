/* eslint-disable @typescript-eslint/no-unsafe-call */
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const sheetRouter = createTRPCRouter({
  create: protectedProcedure
    .mutation(async ({ ctx }) => {
      return ctx.db.sheet.create({
        data: {
          name: `Sheet ${await ctx.db.sheet.count() + 1}`,
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });
    }),

  findMany: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.sheet.findMany({
      orderBy: { createdAt: "desc" },
      include: { 
        // createdBy: true, 
      }, 
    });
  }),
  findSheet: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.sheet.findUnique({
        where: { id: input.id },
        include: {
          tables: {
            include: {
              headers: true,
              rows: true,
            },
          },
        },
      });
    }),
});
