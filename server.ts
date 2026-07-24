import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { User, PaymentRequest, AIHistoryItem, UserPlan } from './src/types.js'; // Note we can import as types or regular JS since bundled or transpiled by tsx and esbuild.

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Database configuration path
const DB_PATH = path.join(process.cwd(), 'db.json');

// Interface for File DB structure
interface LocalDB {
  users: Record<string, User>;
  payments: PaymentRequest[];
  history: AIHistoryItem[];
}

// Ensure the JSON DB file exists and load it
function loadDB(): LocalDB {
  const defaultDB: LocalDB = {
    users: {},
    payments: [],
    history: []
  };

  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8').trim();
      if (!data) {
        saveDB(defaultDB);
        return defaultDB;
      }
      const parsed = JSON.parse(data);
      return {
        users: parsed?.users || {},
        payments: parsed?.payments || [],
        history: parsed?.history || []
      };
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
  // Default Database
  saveDB(defaultDB);
  return defaultDB;
}

function saveDB(db: LocalDB) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Dynamic initialization of Gemini API Client
let geminiAI: any = null;
function getGeminiAI() {
  if (!geminiAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Please configure the GEMINI_API_KEY in the Secrets panel.');
    }
    geminiAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiAI;
}

// Helper function to call Gemini with retries and fallback models
async function callGeminiWithFallback(ai: any, contents: any, config?: any) {
  // Ordered model priority list based on @google/genai guidelines
  const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-pro-preview'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const payload: any = { model, contents };
        if (config) {
          payload.config = config;
        }
        const response = await ai.models.generateContent(payload);
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        console.warn(`[Gemini API] Model '${model}' attempt ${attempt} failed: ${errMsg}`);
        const isTransient = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429') || errMsg.includes('high demand') || errMsg.includes('overloaded');
        if (!isTransient && attempt === 1) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
      }
    }
  }

  throw lastError || new Error('The AI model is currently experiencing high demand. Please try again in a few moments.');
}

// Helper to reset and check daily limit for Free Plan
function checkAndResetDailyLimit(user: User): { updatedUser: User; allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split('T')[0];
  let allowed = true;
  
  if (user.lastUploadDate !== today) {
    user.dailyUploadsCount = 0;
    user.lastUploadDate = today;
  }
  
  if (user.plan === 'Free') {
    if (user.dailyUploadsCount >= 20) {
      allowed = false;
    }
  }
  
  return {
    updatedUser: user,
    allowed,
    remaining: user.plan === 'Free' ? Math.max(0, 20 - user.dailyUploadsCount) : 99999
  };
}

// API Routes

// Authentication / Registration endpoint
app.post('/api/auth/login', (req, res) => {
  try {
    const { gmail, name, password, action } = req.body;
    
    if (!gmail) {
      res.status(400).json({ error: 'Gmail is required.' });
      return;
    }

    const cleanEmail = gmail.toLowerCase().trim();

    // Admin bypass
    if (cleanEmail === 'hanadmahdi66@gmail.com') {
      if (password === 'h1a1n1a1d1H@') {
        res.json({
          success: true,
          gmail: cleanEmail,
          name: name || 'Admin Hanad',
          isAdmin: true,
          user: {
            gmail: cleanEmail,
            name: name || 'Admin Hanad',
            plan: 'Premium' as UserPlan,
            price: 2.0,
            paymentStatus: 'approved',
            createdAt: new Date().toISOString(),
            dailyUploadsCount: 0
          }
        });
        return;
      } else {
        res.status(401).json({ error: 'Incorrect password for Admin Workspace.' });
        return;
      }
    }

    // Load database
    const db = loadDB();
    let user = db.users[cleanEmail];

    const clientAction = action || (name ? 'signup' : 'login');

    if (clientAction === 'signup') {
      if (user) {
        res.status(400).json({ error: 'An account with this Gmail address already exists. Please log in instead!' });
        return;
      }
      if (!password) {
        res.status(400).json({ error: 'Password is required to register.' });
        return;
      }
      
      // Validate strong password logic
      if (password.length < 8) {
        res.status(400).json({ error: 'Ereyga sirta ah waa inuu ka koobnaadaa ugu yaraan 8 xaraf! (Password must be at least 8 characters)' });
        return;
      }
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (!hasLetter || !hasNumber) {
        res.status(400).json({ error: 'Ereyga sirta ah waa inuu wataa xarfo iyo tiro isku jira (sida 12345678H). Password must contain both letters and digits!' });
        return;
      }
      
      // Register user with a password
      user = {
        gmail: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        password: password,
        plan: 'Free',
        price: 0,
        paymentStatus: 'none',
        createdAt: new Date().toISOString(),
        dailyUploadsCount: 0,
        lastUploadDate: new Date().toISOString().split('T')[0]
      };
      db.users[cleanEmail] = user;
      saveDB(db);
    } else {
      // Login
      if (!user) {
        res.status(404).json({ error: 'No account found with this Gmail. Please sign up to create an account first!' });
        return;
      }
      if (!password) {
        res.status(400).json({ error: 'Password is required to log in.' });
        return;
      }
      // Check password configuration
      if (user.password && user.password !== password) {
        res.status(401).json({ error: 'Incorrect password. Please verify and try again.' });
        return;
      }
      // Backward compatibility: If an old user exists without a password, assign their typed password as their secure password
      if (!user.password) {
         user.password = password;
         db.users[cleanEmail] = user;
         saveDB(db);
      }
    }

    res.json({
      success: true,
      gmail: cleanEmail,
      name: user.name,
      isAdmin: false,
      user
    });
  } catch (err: any) {
    console.error('Login router error:', err);
    res.status(500).json({ error: err?.message || 'Internal authentication server error.' });
  }
});

// Update or Select Plan endpoint
app.post('/api/user/select-plan', (req, res) => {
  const { gmail, planName, price } = req.body;
  
  if (!gmail) {
    res.status(400).json({ error: 'User Gmail is required.' });
    return;
  }

  const cleanEmail = gmail.toLowerCase().trim();
  const db = loadDB();
  const user = db.users[cleanEmail];

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const selectedPlan: UserPlan = planName;
  user.plan = selectedPlan;
  user.price = price;

  if (selectedPlan === 'Free') {
    user.paymentStatus = 'none';
  } else {
    user.paymentStatus = 'pending';
    
    // Add payment request record for admin panel
    const newPayment: PaymentRequest = {
      id: Math.random().toString(36).substring(2, 11),
      gmail: cleanEmail,
      name: user.name,
      planName: selectedPlan,
      amount: price,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Remove past pendings for this same user to avoid duplicates
    db.payments = db.payments.filter(p => !(p.gmail === cleanEmail && p.status === 'pending'));
    db.payments.push(newPayment);
  }

  db.users[cleanEmail] = user;
  saveDB(db);

  res.json({ success: true, user });
});

// Get User Status and Details
app.get('/api/user/status', (req, res) => {
  const gmail = req.query.gmail as string;
  if (!gmail) {
    res.status(400).json({ error: 'User Gmail is required.' });
    return;
  }

  const cleanEmail = gmail.toLowerCase().trim();
  const db = loadDB();
  const user = db.users[cleanEmail];

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Calculate remaining uploads
  const { remaining } = checkAndResetDailyLimit(user);

  res.json({ user, remaining });
});

// Get User AI interaction History
app.get('/api/user/history', (req, res) => {
  const gmail = req.query.gmail as string;
  if (!gmail) {
    res.status(400).json({ error: 'User Gmail is required.' });
    return;
  }

  const cleanEmail = gmail.toLowerCase().trim();
  const db = loadDB();
  
  const userHistory = db.history.filter(item => item.gmail === cleanEmail)
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(userHistory);
});

// AI Query/Upload processing API via Server-side Gemini API
app.post('/api/ai/ask', async (req, res) => {
  const { gmail, type, promptText, fileData, fileName, fileMimeType } = req.body;

  if (!gmail) {
    res.status(400).json({ error: 'User Gmail is required.' });
    return;
  }

  const cleanEmail = gmail.toLowerCase().trim();
  const db = loadDB();
  const user = db.users[cleanEmail];

  if (!user && cleanEmail !== 'hanadmahdi66@gmail.com') {
    res.status(404).json({ error: 'User account not found.' });
    return;
  }

  let userRecord = user || {
    gmail: cleanEmail,
    name: 'Admin Hanad',
    plan: 'Premium' as UserPlan,
    price: 2.0,
    paymentStatus: 'approved',
    createdAt: new Date().toISOString(),
    dailyUploadsCount: 0
  };

  // Enforce Free and Premium limits
  if (userRecord.plan === 'Free') {
    // Check and update daily activity quota
    const limitCheck = checkAndResetDailyLimit(userRecord);
    if (!limitCheck.allowed) {
      res.status(429).json({ error: 'You have reached your limit of 20 queries/uploads for today on the Free plan. Upgrade to Premium for infinite student assistance!' });
      return;
    }
  }

  try {
    const ai = getGeminiAI();
    let geminiResponseText = '';
    
    // System instruction wrapper to specialize the model for student research and educational assistance
    const systemInstruction = `You are Hanova Student AI Helper - a premium educational assistant designed by MHHS GAME INC to support students with their studies, homework, textbooks, and analysis. Teach step-by-step, make explanations simple but thorough, and show encourage formatting. Match the inquirer's language (such as Somali, English, or Arabic) naturally.`;

    // Handle API interactions based on type
    if (type === 'photo' && fileData) {
      const mimeType = fileMimeType || 'image/png';
      const imagePart = {
        inlineData: {
          mimeType,
          data: fileData
        }
      };
      
      const customPrompt = `${systemInstruction}\n\nPlease analyze this student's uploaded image and address the following query: ${promptText || 'Analyze the content and provide an itemized explain list.'}`;
      const textPart = { text: customPrompt };

      const response = await callGeminiWithFallback(ai, { parts: [imagePart, textPart] });
      geminiResponseText = response.text || 'No explanation generated.';

    } else if (type === 'text_file' && fileData) {
      // Decode text file content
      const fileContentText = Buffer.from(fileData, 'base64').toString('utf-8');
      const textPrompt = `${systemInstruction}\n\nAnalyze and study the uploaded document text thoroughly:\n\n"""\n${fileContentText}\n"""\n\nStudent's instruction/context query: ${promptText || 'Explain and summarize key aspects of this document.'}`;

      const response = await callGeminiWithFallback(ai, textPrompt);
      geminiResponseText = response.text || 'No response generated.';

    } else {
      // Direct text questions
      if (!promptText) {
        res.status(400).json({ error: 'Prompt text is required.' });
        return;
      }

      const textPrompt = `${systemInstruction}\n\nStudent's Query / Help Request: ${promptText}`;

      const response = await callGeminiWithFallback(ai, textPrompt);
      geminiResponseText = response.text || 'No response generated.';
    }

    // Increment upload counter for Free user
    if (userRecord.plan === 'Free') {
      userRecord.dailyUploadsCount += 1;
      if (db.users[cleanEmail]) {
        db.users[cleanEmail] = userRecord;
      }
    }

    // Save interaction record to history
    const historyItem: AIHistoryItem = {
      id: Math.random().toString(36).substring(2, 11),
      gmail: cleanEmail,
      type,
      fileName,
      promptText: promptText || (type === 'photo' ? 'Uploaded Photo' : 'Uploaded File'),
      response: geminiResponseText,
      timestamp: new Date().toISOString()
    };
    db.history.push(historyItem);
    saveDB(db);

    res.json({
      success: true,
      answer: geminiResponseText,
      uploadsRemaining: userRecord.plan === 'Free' ? Math.max(0, 20 - userRecord.dailyUploadsCount) : 99999
    });

  } catch (error: any) {
    console.error('Gemini error:', error);
    const rawMsg = String(error?.message || error || '');
    let userFriendlyError = 'An error occurred during Gemini AI processing.';
    if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand') || rawMsg.includes('overloaded')) {
      userFriendlyError = 'The AI model is experiencing temporary high demand. Please wait a few seconds and try again!';
    } else if (rawMsg.includes('GEMINI_API_KEY')) {
      userFriendlyError = 'Please configure your GEMINI_API_KEY in the Secrets panel.';
    } else if (rawMsg) {
      userFriendlyError = rawMsg;
    }
    res.status(500).json({ error: userFriendlyError });
  }
});


// ADMIN PANEL ENDPOINTS
// Basic check tool to verify admin identity when loading admin panel contents
function isAdmin(email: string): boolean {
  return email?.toLowerCase().trim() === 'hanadmahdi66@gmail.com';
}

// Get admin stats
app.get('/api/admin/stats', (req, res) => {
  const adminEmail = req.query.adminEmail as string;
  if (!isAdmin(adminEmail)) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  const db = loadDB();
  const allUsers = Object.values(db.users);
  
  const pendingCount = allUsers.filter(u => u.paymentStatus === 'pending').length;
  const approvedCount = allUsers.filter(u => u.paymentStatus === 'approved').length;
  
  // Calculate total revenue from approved payments
  let totalRevenue = 0;
  db.payments.forEach(p => {
    if (p.status === 'approved') {
      totalRevenue += p.amount;
    }
  });

  res.json({
    totalUsers: allUsers.length,
    pendingPaymentsCount: pendingCount,
    approvedPaymentsCount: approvedCount,
    totalRevenue
  });
});

// Admin list of users
app.get('/api/admin/users', (req, res) => {
  const adminEmail = req.query.adminEmail as string;
  if (!isAdmin(adminEmail)) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  const db = loadDB();
  res.json(Object.values(db.users));
});

// Admin list of payment requests
app.get('/api/admin/payments', (req, res) => {
  const adminEmail = req.query.adminEmail as string;
  if (!isAdmin(adminEmail)) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  const db = loadDB();
  const paymentsSorted = [...db.payments].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(paymentsSorted);
});

// Admin Approve payment request
app.post('/api/admin/approve', (req, res) => {
  const { adminEmail, paymentId, userGmail } = req.body;
  if (!isAdmin(adminEmail)) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  const db = loadDB();
  const cleanUserEmail = userGmail.toLowerCase().trim();
  const user = db.users[cleanUserEmail];

  if (!user) {
    res.status(404).json({ error: 'User does not exist.' });
    return;
  }

  // Find and update payment request
  if (paymentId) {
    const pRequest = db.payments.find(p => p.id === paymentId);
    if (pRequest) {
      pRequest.status = 'approved';
    }
  } else {
    // Override: find any pending payment for user
    const pendingPayment = db.payments.find(p => p.gmail === cleanUserEmail && p.status === 'pending');
    if (pendingPayment) {
      pendingPayment.status = 'approved';
    } else {
      // Create a manual payment request entry
      db.payments.push({
        id: Math.random().toString(36).substring(2, 11),
        gmail: cleanUserEmail,
        name: user.name,
        planName: user.plan,
        amount: user.price || 0,
        status: 'approved',
        createdAt: new Date().toISOString()
      });
    }
  }

  user.paymentStatus = 'approved';
  db.users[cleanUserEmail] = user;
  saveDB(db);

  res.json({ success: true, user });
});

// Admin Reject payment request
app.post('/api/admin/reject', (req, res) => {
  const { adminEmail, paymentId, userGmail } = req.body;
  if (!isAdmin(adminEmail)) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  const db = loadDB();
  const cleanUserEmail = userGmail.toLowerCase().trim();
  const user = db.users[cleanUserEmail];

  if (!user) {
    res.status(404).json({ error: 'User does not exist.' });
    return;
  }

  // Find and update payment request
  if (paymentId) {
    const pRequest = db.payments.find(p => p.id === paymentId);
    if (pRequest) {
      pRequest.status = 'rejected';
    }
  } else {
    // Override: find any pending payment for user
    const pendingPayment = db.payments.find(p => p.gmail === cleanUserEmail && p.status === 'pending');
    if (pendingPayment) {
      pendingPayment.status = 'rejected';
    }
  }

  user.paymentStatus = 'rejected';
  user.plan = 'Free'; // Fallback to free plan
  user.price = 0;
  db.users[cleanUserEmail] = user;
  saveDB(db);

  res.json({ success: true, user });
});

// Admin Create/Edit User directly
app.post('/api/admin/edit-user', (req, res) => {
  const { adminEmail, gmail, name, plan, paymentStatus } = req.body;
  if (!isAdmin(adminEmail)) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  const db = loadDB();
  const cleanEmail = gmail.toLowerCase().trim();
  let user = db.users[cleanEmail];

  const planPrices: Record<UserPlan, number> = {
    'Free': 0,
    'Basic': 0.99,
    'Standard': 1.5,
    'Premium': 2.0
  };

  const selectedPlan: UserPlan = plan || 'Free';

  if (!user) {
    user = {
      gmail: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      plan: selectedPlan,
      price: planPrices[selectedPlan],
      paymentStatus: paymentStatus || 'none',
      createdAt: new Date().toISOString(),
      dailyUploadsCount: 0
    };
  } else {
    user.name = name || user.name;
    user.plan = selectedPlan;
    user.price = planPrices[selectedPlan];
    user.paymentStatus = paymentStatus || user.paymentStatus;
  }

  db.users[cleanEmail] = user;
  saveDB(db);

  res.json({ success: true, user });
});

// Admin Delete User directly
app.post('/api/admin/delete-user', (req, res) => {
  const { adminEmail, userGmail } = req.body;
  if (!isAdmin(adminEmail)) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  const db = loadDB();
  const cleanEmail = userGmail.toLowerCase().trim();
  
  if (db.users[cleanEmail]) {
    delete db.users[cleanEmail];
    db.payments = db.payments.filter(p => p.gmail !== cleanEmail);
    db.history = db.history.filter(h => h.gmail !== cleanEmail);
    saveDB(db);
  }

  res.json({ success: true });
});


// Dev environment vs Production builds rendering setup
const startServer = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
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
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Server failed to start:', err);
});
