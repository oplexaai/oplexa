import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geminiRouter from "./gemini";
import chatRouter from "./chat";
import authRouter from "./auth";
import conversationsRouter from "./conversations";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/gemini", geminiRouter);
router.use(chatRouter);
router.use(authRouter);
router.use(conversationsRouter);

export default router;
