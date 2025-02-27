import { postRouter } from "~/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { tableRouter } from "~/server/api/routers/table";
import { rowRouter } from "~/server/api/routers/row";
import { sheetRouter } from "~/server/api/routers/sheet";
import { headerRouter } from "~/server/api/routers/header";
import { viewRouter } from "~/server/api/routers/view";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  table: tableRouter,
  row: rowRouter,
  sheet: sheetRouter,
  header: headerRouter,
  view: viewRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
