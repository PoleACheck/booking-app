import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from './db';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  const bookings = await db.booking.findMany(); // przykładowe zapytanie
  res.json(bookings);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serwer działa na porcie ${PORT}`));
