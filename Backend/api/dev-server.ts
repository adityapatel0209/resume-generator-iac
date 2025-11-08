import express from "express";
import cors from "cors";
import { handler } from "./handler";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.options("/parse", (_req, res) => res.sendStatus(204));

app.post("/parse", async (req, res) => {
  try {
    const event = {
      body: JSON.stringify(req.body),
      requestContext: { http: { method: "POST" } },
    };
    const out = await handler(event as any);
    res
      .status(out.statusCode || 200)
      .set(out.headers || {})
      .send(out.body || "");
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Local server error" });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`API dev server on http://localhost:${port}`));