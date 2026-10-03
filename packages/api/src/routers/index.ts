import { protectedProcedure, publicProcedure, router } from "../index";
import { notesRouter } from "./notes";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  notes: notesRouter,
  privateData: protectedProcedure.query(({ ctx }) => ({
    message: "This is private",
    user: ctx.session.user,
  })),
});

export type AppRouter = typeof appRouter;
