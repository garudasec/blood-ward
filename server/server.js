import express from "express";

const app = express();

const PORT = 5000;

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "BloodWard backend is running",
  });
});

app.listen(PORT, () => {
  console.log(`BloodWard server running on port ${PORT}`);
});