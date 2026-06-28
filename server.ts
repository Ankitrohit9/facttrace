import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { mkdirSync } from 'fs';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { dbManager, haversineDistance } from './src/db.js';

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const rawKey = process.env.GEMINI_API_KEY || '';
    const cleanKey = rawKey.replace(/[\r\n]+/g, '').trim();
    if (cleanKey && !cleanKey.includes('MY_GEMINI_API_KEY')) {
      aiClient = new GoogleGenAI({
        apiKey: cleanKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

const app = express();
const PORT = 3000;

// Set up JSON parsing and urlencoded parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads folder exists
const uploadsDir = path.join(process.cwd(), 'uploads');
mkdirSync(uploadsDir, { recursive: true });

// Configure Multer for local file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// Serve uploads as static assets
app.use('/uploads', express.static(uploadsDir));

// API 1: Register Citizen (Anonymous Tracking)
app.post('/api/citizens/register', async (req, res) => {
  try {
    const { uuid, nickname } = req.body;
    if (!uuid || !nickname) {
      return res.status(400).json({ error: 'uuid and nickname are required' });
    }
    const citizen = await dbManager.registerCitizen(uuid, nickname);
    return res.status(200).json(citizen);
  } catch (err: any) {
    console.error('Error registering citizen:', err);
    return res.status(500).json({ error: err.message });
  }
});

// API 2: Citizen Leaderboard (Top 10)
app.get('/api/citizens/leaderboard', async (req, res) => {
  try {
    const citizens = await dbManager.getCitizens();
    const sorted = [...citizens].sort((a, b) => b.points - a.points).slice(0, 10);
    return res.status(200).json(sorted);
  } catch (err: any) {
    console.error('Error fetching leaderboard:', err);
    return res.status(500).json({ error: err.message });
  }
});

// API 3: Dashboard Stats
app.get('/api/dashboard', async (req, res) => {
  try {
    const stats = await dbManager.getDashboardStats();
    return res.status(200).json(stats);
  } catch (err: any) {
    console.error('Error fetching stats:', err);
    return res.status(500).json({ error: err.message });
  }
});

// API 4: Dashboard Insights
app.get('/api/dashboard/insights', async (req, res) => {
  try {
    const insights = await dbManager.getDashboardInsights();
    return res.status(200).json(insights);
  } catch (err: any) {
    console.error('Error fetching insights:', err);
    return res.status(500).json({ error: err.message });
  }
});

// API 5: List Issues
app.get('/api/issues', async (req, res) => {
  try {
    const issues = await dbManager.getIssues();
    // Sort issues by created_at descending
    const sorted = [...issues].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return res.status(200).json(sorted);
  } catch (err: any) {
    console.error('Error listing issues:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Keyword matcher local fallback function for safety
function runKeywordFallback(description: string): {
  category: string;
  severity: number;
  summary: string;
  assigned_department: string;
} {
  const desc = description.toLowerCase();

  if (desc.includes('trash') || desc.includes('garbage') || desc.includes('litter') || desc.includes('dump') || desc.includes('waste')) {
    return {
      category: 'Sanitation',
      severity: 3,
      summary: 'Unsanitary garbage accumulation or bulk dumping reported.',
      assigned_department: 'Department of Sanitation',
    };
  }

  if (desc.includes('pothole') || desc.includes('street') || desc.includes('pavement') || desc.includes('sidewalk') || desc.includes('asphalt') || desc.includes('cracked')) {
    return {
      category: 'Street Infrastructure',
      severity: 4,
      summary: 'Dangerous street surface degradation or potholes detected.',
      assigned_department: 'Department of Public Works',
    };
  }

  if (desc.includes('leak') || desc.includes('water') || desc.includes('pipe') || desc.includes('flooding') || desc.includes('sewer') || desc.includes('hydrant')) {
    return {
      category: 'Water Utility',
      severity: 4,
      summary: 'Active water main leak or drainage flooding reported.',
      assigned_department: 'Water and Power Utility',
    };
  }

  if (desc.includes('light') || desc.includes('dark') || desc.includes('streetlamp') || desc.includes('lamp') || desc.includes('bulb') || desc.includes('electricity') || desc.includes('blackout')) {
    return {
      category: 'Electrical Infrastructure',
      severity: 2,
      summary: 'Malfunctioning public lighting creating localized visibility risk.',
      assigned_department: 'Water and Power Utility',
    };
  }

  if (desc.includes('tree') || desc.includes('branch') || desc.includes('park') || desc.includes('bush') || desc.includes('grass') || desc.includes('overgrown')) {
    return {
      category: 'Parks & Recreation',
      severity: 2,
      summary: 'Overgrown vegetation or fallen branch obstructing municipal pathways.',
      assigned_department: 'Department of Parks and Recreation',
    };
  }

  return {
    category: 'Public General',
    severity: 3,
    summary: 'General municipal infrastructure concern reported.',
    assigned_department: 'Department of Public Works',
  };
}

// Helper to perform content generation with exponential backoff and retries
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: { model: string; contents: any[]; config?: any },
  retries = 3,
  delayMs = 1000
): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const errMsg = String(err);
      // If the quota limit is explicitly 0, it is not a transient/recoverable state. Skip retries to allow instant fallback.
      const isLimitZero = errMsg.includes('limit: 0') || errMsg.includes('"limit": 0') || errMsg.includes('"limit":0');
      const isTransient =
        !isLimitZero && (
          err?.status === 503 ||
          err?.status === 429 ||
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('overloaded')
        );

      if (isTransient && attempt < retries) {
        console.warn(`Gemini API transient error for model ${params.model} (attempt ${attempt}/${retries}): ${err?.message || err}. Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // exponential backoff
      } else {
        throw err;
      }
    }
  }
}

// Direct Call to Gemini API using Google GenAI SDK
async function callGeminiRestApi(
  description: string,
  filePath?: string,
  mimeType?: string
): Promise<{ category: string; severity: number; summary: string; assigned_department: string }> {
  try {
    const ai = getAiClient();
    if (!ai) {
      console.warn('Gemini API key is not set or is placeholder. Using local keyword fallback.');
      return runKeywordFallback(description);
    }

    let fileBase64 = '';
    if (filePath) {
      try {
        const fileData = await fs.readFile(filePath);
        fileBase64 = fileData.toString('base64');
      } catch (e) {
        console.error('Failed to read uploaded file for base64 encoding:', e);
      }
    }

    const promptText = `
You are the FactTrace Civic Intelligence systems architect. Analyze this citizen's report of a civic, utility, sanitation, or infrastructure issue.

Citizen's Description:
"${description}"

Analyze the issue and return a structured JSON response containing:
- category: A category of the issue (Choose one from: "Street Infrastructure", "Sanitation", "Road Obstruction", "Water Utility", "Electrical Infrastructure", "Parks & Recreation").
- severity: An integer scale of 1 to 5, where 1 is minimal hazard and 5 is immediate life/safety hazard.
- summary: Strictly 1 concise sentence summarizing the report (max 15 words).
- assigned_department: The responsible municipal agency (Choose one from: "Department of Public Works", "Department of Sanitation", "Water and Power Utility", "Department of Parks and Recreation").

You MUST return ONLY a raw JSON object matching this schema.
`;

    const contents: any[] = [promptText];
    if (fileBase64 && mimeType && mimeType.startsWith('image/')) {
      contents.push({
        inlineData: {
          mimeType,
          data: fileBase64,
        },
      });
    }

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            severity: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            assigned_department: { type: Type.STRING },
          },
          required: ['category', 'severity', 'summary', 'assigned_department'],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Gemini API returned an empty response body.');
    }

    const parsed = JSON.parse(responseText.trim());
    return {
      category: parsed.category || 'Public General',
      severity: Number(parsed.severity) || 3,
      summary: parsed.summary || 'General civic issue reported.',
      assigned_department: parsed.assigned_department || 'Department of Public Works',
    };
  } catch (err) {
    console.warn('Gemini SDK error. Falling back gracefully to keyword matcher:', err);
    return runKeywordFallback(description);
  }
}

// API 5.5: Analyze attached/uploaded image to generate a detailed description of the infrastructure/civic issue
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const ai = getAiClient();
    if (!ai) {
      console.warn('Gemini API key is not configured or is placeholder. Cannot analyze image.');
      return res.status(503).json({ error: 'Gemini API client not configured' });
    }

    const fileData = await fs.readFile(req.file.path);
    const fileBase64 = fileData.toString('base64');
    const mimeType = req.file.mimetype;

    const promptText = `
You are the FactTrace Civic Intelligence AI. Analyze this image representing a civic, utility, sanitation, or infrastructure issue (such as a pothole, leaking pipe, broken street light, garbage heap, overgrown vegetation, road obstruction, vandalism, etc.).
Provide a clear, highly accurate, and objective description of what the issue is (maximum 2 sentences). Describe exactly what is broken, damaged, hazardous, or needs cleaning or repair, so it can be automatically submitted to municipal maintenance.
`;

    const contents: any[] = [
      promptText,
      {
        inlineData: {
          mimeType,
          data: fileBase64,
        },
      },
    ];

    const modelsToTry = [
      "gemini-3.1-pro-preview", // Required first-choice
      "gemini-2.5-flash",       // High availability recommended fallback
      "gemini-3.5-flash",       // Next fallback
      "gemini-1.5-flash"        // Standard general model fallback
    ];

    let response = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting image analysis with model: ${modelName}`);
        response = await generateContentWithRetry(ai, {
          model: modelName,
          contents,
        });
        if (response) {
          console.log(`Successfully generated image description using ${modelName}`);
          break;
        }
      } catch (proErr: any) {
        lastError = proErr;
        console.warn(`Model ${modelName} failed, trying next fallback:`, proErr?.message || proErr);
      }
    }

    if (!response) {
      throw lastError || new Error('All image analysis fallback models failed.');
    }

    const description = response.text || 'No description could be generated from the image.';
    return res.status(200).json({ description: description.trim() });
  } catch (err: any) {
    console.error('Error in /api/analyze-image:', err);
    return res.status(500).json({ error: err.message || 'An error occurred while analyzing the image.' });
  }
});

// API Endpoint for Gemini Chatbot Support
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(200).json({ 
        text: "I am currently running in offline simulation mode because the Gemini API key is not configured. How can I help you with FactTrace today?" 
      });
    }

    const activeIssues = await dbManager.getIssues();
    const issuesContext = activeIssues.map(i => ({
      id: i.id,
      category: i.category,
      summary: i.summary,
      status: i.status,
      severity: i.severity,
      created_at: i.created_at
    }));

    const systemInstruction = `
You are the FactTrace Civic Intelligence AI Chatbot Assistant. 
Your goal is to help citizens of the city report issues, learn about the platform, and query existing reports.

FactTrace is a localized, decentralized civic audit platform. It allows users to:
1. Report issues like potholes, water leaks, public safety concerns, etc., using physical coordinates on a live spatial map.
2. Undergo a double-stage duplicate check: (1) 15-meter physical geofence, and (2) AI-driven semantic similarity check.
3. Verify or flag reports reported by others.
4. Earn impact points for successful verified reports, which boosts their rank on the leaderboards.

Currently reported issues in the system:
${JSON.stringify(issuesContext, null, 2)}

Your roles and instructions:
- Help users decide how to categorize their issues. The valid categories are: 'Roads & Transportation', 'Water & Sanitation', 'Public Safety & Hazards', 'Sanitation & Waste', 'Parks & Recreation', and 'Public General'.
- Explain that we check for duplicate reports within a strict 15-meter zone and perform AI-driven audit of image descriptions to keep the map clean and high-fidelity.
- Help citizens draft their report. If they give you details about a pothole or a leak, you can summarize it nicely for them and tell them exactly what fields to fill.
- Answer questions about current issues in the system. For example, if they ask "What are the latest water issues?", look up the current reported issues from the list provided above, summarize them, and list their statuses (e.g., 'pending verification', 'community verified', 'municipal handover', 'community resolved').
- Be extremely polite, professional, concise, and helpful. Use a warm, community-driven civic helper tone. Use formatting (bullet points, bold text) to keep your answers highly readable.
`;

    // Map client messages to Gemini parts format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const modelsToTry = [
      "gemini-3.5-flash",
      "gemini-2.5-flash",
      "gemini-1.5-flash"
    ];

    let response = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting chat generation with model: ${modelName}`);
        response = await generateContentWithRetry(ai, {
          model: modelName,
          contents,
          config: {
            systemInstruction
          }
        });
        if (response) {
          console.log(`Successfully generated chat response using ${modelName}`);
          break;
        }
      } catch (proErr: any) {
        lastError = proErr;
        console.warn(`Model ${modelName} failed for chat, trying next:`, proErr?.message || proErr);
      }
    }

    if (!response) {
      throw lastError || new Error('All chat generation fallback models failed.');
    }

    const text = response.text || 'I apologize, but I was unable to generate a response. Please try again.';
    return res.status(200).json({ text: text.trim() });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return res.status(500).json({ error: err.message || 'An error occurred during chat.' });
  }
});

// API 6: Submit Report (Double Stage Spatial Duplicate Prevention)
app.post('/api/issues', upload.single('image'), async (req, res) => {
  try {
    const { description, reporter_uuid } = req.body;
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);

    if (!description || isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'description, latitude, and longitude are required' });
    }

    const activeIssues = (await dbManager.getIssues()).filter(
      i => i.status !== 'community resolved' && i.status !== 'duplicate'
    );

    // ==========================================
    // STAGE 1 GEOCONTACT PRE-INFERENCE GATEKEEPER
    // ==========================================
    // Check if any active issue exists within a 15-meter radius
    const stage1Duplicate = activeIssues.find(issue => {
      const distance = haversineDistance(latitude, longitude, issue.latitude, issue.longitude);
      return distance <= 15;
    });

    if (stage1Duplicate) {
      return res.status(409).json({
        error: 'This issue has already been reported.',
        duplicate_type: 'stage_1',
        duplicate_issue_id: stage1Duplicate.id,
        duplicate_summary: stage1Duplicate.summary || 'Existing active report near this coordinate.',
      });
    }

    // Prepare files
    let fileUrl: string | null = null;
    let localFilePath: string | undefined;
    let mimeType: string | undefined;

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      localFilePath = req.file.path;
      mimeType = req.file.mimetype;
    }

    // Save with processing status instantly in database (< 10ms response time)
    const issue = await dbManager.createIssue({
      description,
      image_url: fileUrl,
      category: 'Analyzing...',
      severity: 3,
      latitude,
      longitude,
      status: 'processing',
      summary: 'AI classification compiling in background',
      reporter_uuid: reporter_uuid || null,
      assigned_department: 'Detecting...',
    });

    // Send 210 created instantly to satisfy under 10ms threshold
    res.status(201).json(issue);

    // ==============================================
    // HAND OFF HEAVY ANALYSIS TO BACKGROUND THREAD/PROMISE
    // ==============================================
    (async () => {
      try {
        // Run direct Gemini REST analysis or local fallback
        const aiAnalysis = await callGeminiRestApi(description, localFilePath, mimeType);

        // Retrieve latest issues to check for Stage 2 duplication
        const currentActiveIssues = (await dbManager.getIssues()).filter(
          i => i.status !== 'community resolved' && i.status !== 'duplicate' && i.id !== issue.id
        );

        // ==========================================
        // STAGE 2 GEOCONTACT POST-INFERENCE GEOFENCE
        // ==========================================
        // Search for active duplicates of the SAME category within 100 meters
        const stage2Duplicate = currentActiveIssues.find(item => {
          if (item.category.toLowerCase() !== aiAnalysis.category.toLowerCase()) return false;
          const distance = haversineDistance(latitude, longitude, item.latitude, item.longitude);
          return distance <= 100;
        });

        if (stage2Duplicate) {
          console.log(`Stage 2 duplicate found! Marking issue ${issue.id} as DUPLICATE.`);
          await dbManager.updateIssue(issue.id, {
            status: 'duplicate',
            category: aiAnalysis.category,
            severity: aiAnalysis.severity,
            summary: `DUPLICATE WARNING: Same category reported 100m away. Original Issue ID: #${stage2Duplicate.id}`,
            assigned_department: aiAnalysis.assigned_department,
          });
        } else {
          // No duplicate found: finalize as 'reported'
          console.log(`Issue ${issue.id} classified successfully. Categorized as ${aiAnalysis.category}.`);
          await dbManager.updateIssue(issue.id, {
            status: 'reported',
            category: aiAnalysis.category,
            severity: aiAnalysis.severity,
            summary: aiAnalysis.summary,
            assigned_department: aiAnalysis.assigned_department,
          });
        }
      } catch (backgroundErr) {
        console.error(`Background processing failed for issue ID: ${issue.id}`, backgroundErr);
        // Ensure it doesn't stay in processing forever if background fails
        await dbManager.updateIssue(issue.id, {
          status: 'reported',
          category: 'Public Infrastructure',
          severity: 3,
          summary: 'Civic report registered.',
          assigned_department: 'Department of Public Works',
        });
      }
    })();

  } catch (err: any) {
    console.error('Error submitting issue:', err);
    return res.status(500).json({ error: err.message });
  }
});

// API 7: Verify Issue
app.post('/api/issues/:id/verify', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { citizen_uuid } = req.body;
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }
    const result = await dbManager.verifyIssue(id, citizen_uuid || '');
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(404).json({ error: 'Issue not found' });
    }
  } catch (err: any) {
    console.error('Error verifying issue:', err);
    return res.status(500).json({ error: err.message });
  }
});

// API 7.5: Statefully Adjust/Toggle Vote (Verify & Fake)
app.post('/api/issues/:id/vote', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { citizen_uuid, old_vote, new_vote } = req.body;
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }
    const result = await dbManager.adjustVote(id, citizen_uuid || '', old_vote, new_vote);
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(404).json({ error: 'Issue not found' });
    }
  } catch (err: any) {
    console.error('Error adjusting vote:', err);
    return res.status(500).json({ error: err.message });
  }
});

// API 8: Flag Issue
app.post('/api/issues/:id/flag', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }
    const issue = await dbManager.flagIssue(id);
    if (issue) {
      return res.status(200).json(issue);
    } else {
      return res.status(404).json({ error: 'Issue not found' });
    }
  } catch (err: any) {
    console.error('Error flagging issue:', err);
    return res.status(500).json({ error: err.message });
  }
});

// API 9: Search Location via Nominatim (Proxy to bypass browser sandboxing/CORS blocks)
app.get('/api/geocoding/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(String(q))}&limit=5&email=rohitankit387@gmail.com`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FactTraceCivicApp/1.0 (rohitankit387@gmail.com)',
        'Accept-Language': 'en'
      }
    });
    if (!response.ok) {
      throw new Error(`Nominatim returned status ${response.status}`);
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Proxy search error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// API 10: Reverse Geocode via Nominatim (Proxy)
app.get('/api/geocoding/reverse', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon are required' });
    }
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&email=rohitankit387@gmail.com`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FactTraceCivicApp/1.0 (rohitankit387@gmail.com)',
        'Accept-Language': 'en'
      }
    });
    if (!response.ok) {
      throw new Error(`Nominatim returned status ${response.status}`);
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Proxy reverse geocode error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Vite Middleware for Development / Production Static Server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FactTrace Civic Intelligence server running on http://localhost:${PORT}`);
  });
}

startServer();
