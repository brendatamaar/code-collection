import { Router } from "express";

export const usersRouter = Router();

usersRouter.get("/", (_req, res) => {
  res.json([]);
});

usersRouter.post("/", (_req, res) => {
  res.status(201).json({ id: 1 });
});

usersRouter.get("/:id", (req, res) => {
  res.json({ id: req.params.id });
});

usersRouter.put("/:id", (req, res) => {
  res.json({ id: req.params.id });
});

usersRouter.delete("/:id", (req, res) => {
  res.status(204).send();
});
