import express from "express";

const app = express();

app.get("/bff/v1/users/:id", requireAuth, getUser);

function requireAuth(_req: unknown, _res: unknown, next: () => void) {
  next();
}

function getUser() {
  return undefined;
}
