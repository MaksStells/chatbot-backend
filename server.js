require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(".")); // serves your HTML/CSS/JS files

app.post("/api/chat", async (req, res) => {
  const { message, calendarContext } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: "Message too long (max 2000 characters)" });
  }

  try {
    const systemPrompt = `You are a friendly and supportive university student assistant called UniBot.
You help students with:
- Coursework deadlines and submission guidance
- Academic policies and regulations
- Wellbeing services and mental health support
- Course registration and module selection
- Campus facilities and resources
Keep answers clear, concise, warm and encouraging.
If you don't know something specific to the university, advise the student to contact their department or student services.${calendarContext || ""}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: "Groq error", details: data.error?.message });
    }

    return res.status(200).json({
      reply: data.choices[0].message.content
    });

  } catch (error) {
    return res.status(500).json({ error: "Server error", details: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ UniBot server running at http://localhost:${PORT}`);
});