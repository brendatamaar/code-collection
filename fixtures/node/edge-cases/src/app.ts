import express from "express";
import { usersRouter } from "./routes/users.js";
import { ordersRouter } from "./routes/orders.js";

const app = express();
app.use(express.json());

// Static mounts — parseable
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/orders", ordersRouter);

// Dynamic mount — should emit DYNAMIC_PREFIX warning
const prefix = process.env["API_PREFIX"] ?? "/api";
app.use(`${prefix}/dynamic`, (_req, _res) => {
  _res.json({ ok: true });
});

// Direct route on main app
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(3000);
