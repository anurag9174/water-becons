require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARE =====
app.use(cors()); // CORS enable
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for form data without file
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // serve uploaded files

// Ensure uploads folder exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ===== MONGO CONNECTION =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("MongoDB connection error:", err));

// ===== SCHEMAS =====
const newsSchema = new mongoose.Schema({
  title: String,
  summary: String,
  lat: Number,
  lon: Number,
  createdAt: { type: Date, default: Date.now }
});
const News = mongoose.model("News", newsSchema);

const hazardSchema = new mongoose.Schema({
  title: String,
  description: String,
  file: String, // path of uploaded file
  createdAt: { type: Date, default: Date.now }
});
const Hazard = mongoose.model("Hazard", hazardSchema);

// ===== MULTER CONFIG =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// ===== NEWS ROUTES =====

// Upload news
app.post("/uploadNews", async (req, res) => {
  try {
    const { title, summary, lat, lon } = req.body;
    if (!title || !summary)
      return res.status(400).json({ error: "Title & Summary required" });

    const news = new News({ title, summary, lat, lon });
    await news.save();
    res.json({ message: "News uploaded successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get latest news (all)
app.get("/news", async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 });
    res.json(news);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== HAZARD ROUTES =====

// Upload hazard
app.post("/uploadHazard", upload.single('file'), async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description || !req.file)
      return res.status(400).json({ error: "All fields are required" });

    const hazard = new Hazard({
      title,
      description,
      file: `uploads/${req.file.filename}`
    });

    await hazard.save();
    res.json({ message: "Hazard uploaded successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all hazards
app.get("/hazards", async (req, res) => {
  try {
    const hazards = await Hazard.find().sort({ createdAt: -1 });
    const hazardsWithURL = hazards.map(h => ({
      _id: h._id,
      title: h.title,
      description: h.description,
      image: `${req.protocol}://${req.get('host')}/${h.file.replace(/\\/g, '/')}`,
      createdAt: h.createdAt
    }));
    res.json(hazardsWithURL);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
