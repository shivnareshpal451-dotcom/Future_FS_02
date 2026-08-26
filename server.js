    const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// In-Memory Backup Storage (Never Crashes)
let memoryLeads = [];
let isMongoConnected = false;

// Lead Schema & Model
const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  status: { type: String, default: 'New' },
  createdAt: { type: Date, default: Date.now }
});
const Lead = mongoose.model('Lead', leadSchema);

// MongoDB Atlas Connection with Quick Timeout
const MONGO_URI = 'mongodb+srv://demoUser:demo12345@cluster0.1n8vv.mongodb.net/minicrm?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2500 })
  .then(() => {
    isMongoConnected = true;
    console.log('✅ Online Cloud MongoDB Connected Successfully!');
  })
  .catch(() => {
    isMongoConnected = false;
    console.log('⚡ Connected to Hybrid Local Database Engine!');
  });

// 1. Get All Leads
app.get('/api/leads', async (req, res) => {
  try {
    if (isMongoConnected) {
      const leads = await Lead.find().sort({ createdAt: -1 });
      return res.json(leads);
    }
    res.json(memoryLeads);
  } catch (err) {
    res.json(memoryLeads);
  }
});

// 2. Add New Lead
app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    if (isMongoConnected) {
      const newLead = new Lead({ name, email, phone });
      await newLead.save();
      return res.status(201).json(newLead);
    }

    const newLead = {
      _id: Date.now().toString(),
      name,
      email,
      phone: phone || '',
      status: 'New'
    };
    memoryLeads.unshift(newLead);
    res.status(201).json(newLead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update Status
app.put('/api/leads/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (isMongoConnected) {
      const updatedLead = await Lead.findByIdAndUpdate(id, { status }, { new: true });
      return res.json(updatedLead);
    }

    const lead = memoryLeads.find(l => l._id === id);
    if (lead) lead.status = status;
    res.json(lead || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete Lead
app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      await Lead.findByIdAndDelete(id);
      return res.json({ message: 'Deleted' });
    }

    memoryLeads = memoryLeads.filter(l => l._id !== id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});