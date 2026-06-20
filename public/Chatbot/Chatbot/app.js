const express = require("express");
const axios = require("axios");
const fs = require("fs");

const app = express();

// Serve static files from the "public" folder
app.use(express.static("public"));
app.use(express.json());

// Load the knowledge base from JSON
let knowledgeBase = {};
try {
  const data = fs.readFileSync("knowledge_base.json", "utf8");
  knowledgeBase = JSON.parse(data);
  console.log("📚 Knowledge base loaded.");
} catch (error) {
  console.error("🚨 Error loading knowledge base:", error);
}

// Function to perform a simple keyword match search in the knowledge base
function getKnowledgeContext(query) {
  const cleanQuery = query.toLowerCase();
  // Priority order of categories
  const categories = [
    "Ambulance Related Queries",
    "Fire Brigade Related Queries",
    "Police Related Queries",
    "Miscellaneous Serious Emergency Questions",
    "General Emergency Questions"
  ];
  for (const category of categories) {
    const entries = knowledgeBase[category];
    if (entries) {
      for (const key in entries) {
        // Replace underscores with spaces for matching
        const searchTerm = key.toLowerCase().replace(/_/g, " ");
        if (cleanQuery.includes(searchTerm)) {
          console.log(`🔍 Matched context in [${category}] with key: ${key}`);
          return entries[key];
        }
      }
    }
  }
  return "";
}

// Function to get chatbot response from OpenRouter API
async function getChatbotResponse(query, context) {
  // Construct full prompt by appending context if available
  const fullPrompt = context ? `${context}\nUser: ${query}` : query;
  
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-small-24b-instruct-2501", // Use a valid model ID
        messages: [
          {
            role: "system",
            content: "You are an emergency response chatbot. Provide short, precise answers in plain language. If the user is in India or mentions India, advise to dial 112 instead of 911. Do not use any bold formatting or asterisks."
          },
          { role: "user", content: fullPrompt }
        ],
        max_tokens: 60
      },
      { headers: { Authorization: `Bearer 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` } }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error from OpenRouter API:", error.response?.data || error.message);
    return "I'm sorry, I couldn't process your request.";
  }
}

// API endpoint for emergency assistance
app.post("/emergency-assist", async (req, res) => {
  const { message, latitude, longitude } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }
  
  // Retrieve context from the knowledge base
  const context = getKnowledgeContext(message);
  
  // Get chatbot response using OpenRouter API
  const chatbotResponse = await getChatbotResponse(message, context);
  
  res.json({ response: chatbotResponse });
});

// Default route for testing in a browser
app.get("/", (req, res) => {
  res.send(`
    <h1>Emergency Assistance Chatbot</h1>
    <p>This server provides an API at <code>/emergency-assist</code> for handling emergency queries.</p>
    <p>Use the web UI at <a href="/index.html">Chat Interface</a> to chat with the bot.</p>
  `);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
