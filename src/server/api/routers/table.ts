/* eslint-disable @typescript-eslint/no-unsafe-call */
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const tableRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.table.create({
        data: {
          name: input.name,
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

});
