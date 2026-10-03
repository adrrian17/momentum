import { publicProcedure, router } from "../index";
import { notesRouter } from "./notes";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  notes: notesRouter,
});

export type AppRouter = typeof appRouter;
