/* eslint-disable @typescript-eslint/no-unsafe-call */
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const tableRouter = createTRPCRouter({
  create: protectedProcedure
    .mutation(async ({ ctx }) => {
      return ctx.db.table.create({
        data: {
          name: `Table ${await ctx.db.table.count() + 1}`,
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });
    }),

  findMany: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.table.findMany({
      orderBy: { createdAt: "desc" },
      include: { 
        // createdBy: true, 
      }, 
      // where: { archived: false },
    });
  }),
  findTable: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.table.findUnique({
        where: { id: input.id },
        include: {
          rows: true,
        },
      });
    }),

  addHeader: protectedProcedure
    .input(z.object({ id: z.number(), header: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.table.update({
        where: { id: input?.id },
        data: { header: input?.header },
      });
    }),

});
