const express = require('express');
const mongoose = require("mongoose");
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());




app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
})

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

