import { Router } from "express";
import { OrderController } from "./order.controller";
import { authMiddleware } from "../../middlewares/authMiddleware";

const router = Router();

// Apply auth/tenant middleware to all order routes
router.use(authMiddleware);

// Orders CRUD & Pipeline Querying
router.get("/", OrderController.list);
router.get("/:id", OrderController.getById);
router.post("/", OrderController.create);

// Finite State Machine (FSM) Transitions & Actions
router.post("/:id/transition", OrderController.transition);
router.post("/:id/payments", OrderController.addPayment);
router.post("/:id/return", OrderController.returnItems);           // 📦 Devolução Física de Produtos (RETURN no Ledger)
router.post("/:id/refund-payment", OrderController.refundPayment); // 💳 Estorno Financeiro Desacoplado
router.post("/:id/cancel", OrderController.cancel);
router.post("/:id/refund", OrderController.refund);

export default router;
