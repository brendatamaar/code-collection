import { Router } from "express";

export const ordersRouter = Router();

ordersRouter.get("/", (_req, res) => {
  res.json([]);
});

ordersRouter.post("/", (_req, res) => {
  res.status(201).json({ id: 1 });
});

ordersRouter.get("/:id", (req, res) => {
  res.json({ id: req.params.id });
});

ordersRouter.patch("/:id/status", (req, res) => {
  res.json({ id: req.params.id });
});
