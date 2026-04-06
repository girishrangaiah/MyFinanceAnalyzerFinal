import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Simple in-memory cache to prevent re-analyzing the exact same documents
const analysisCache = new Map();

export async function analyzeFinancialDocuments(documents) {
  // Generate a cache key based on document metadata
  const cacheKey = documents.map(d => `${d.file.name}-${d.file.size}-${d.file.lastModified}`).sort().join('|');
  
  if (analysisCache.has(cacheKey)) {
    console.log("Returning cached analysis result");
    return analysisCache.get(cacheKey);
  }

  const prompt = `
You are an AI Financial Analysis Assistant designed to help non-technical users understand their personal finances using plain language, clear explanations, and actionable advice.

MANDATORY VALIDATION RULES:
1. Duplicate Detection: Check for duplicates using file name similarity, transaction overlap, salary amount repetition, identical account numbers. If duplicates are found, ignore them and include a note in your response: "This document appears to be a duplicate of an already uploaded file and has not been considered."
2. Document Verification: Extract and verify the statement period, payslip month, billing cycle, etc. from each document to provide a cohesive analysis.

If validation passes, generate an analysis in JSON format.

COMMUNICATION RULES:
- Use simple English
- Avoid financial jargon
- No shaming or judgment
- No fear-based language
- Assume user is not finance-savvy
- Always explain why something matters
- MUST use headings and numbered lists (1., 2., 3.) for all sections (except Income and Expense). Each point MUST be on a separate line.

SPECIFIC SECTION RULES:
1. Income and Expense: MUST be a Markdown table with exactly 2 columns. 
   - 1st column: "Saving/Income Categories & Values". List all dynamically generated saving/income categories based on the uploaded documents, along with their respective calculated values (e.g., "Salary: ₹50,000", "Interest: ₹1,000").
   - 2nd column: "Expenses Categories & Values". List all dynamically generated expense categories based on the uploaded documents, along with their respective calculated values (e.g., "Loan Payment: ₹15,000", "House Maintenance: ₹5,000", "Education: ₹8,000").
   - Ensure the rows align as best as possible, padding with empty cells if one column has more items than the other.
   - The LAST row of the table MUST be the "Total" row, displaying the total calculated value for Saving/Income in the 1st column (e.g., "**Total Income: ₹51,000**") and the total calculated value for Expenses in the 2nd column (e.g., "**Total Expenses: ₹28,000**").
2. Subscription: From uploaded documents, extract and normalize subscriptions. Identify overlapping subscriptions.
   - Example tone: "You can potentially save ₹6,500 per month by cancelling unused subscriptions."
   - Provide clear, executable actions, not theory.
   - Example format: "✅ Cancel unused subscriptions. Provide a valid link/URL to cancel the subscriptions."

STRICT LIMITATIONS:
- No investment advice
- No tax filing advice
- No future predictions
- No assumptions beyond uploaded data
- No advice requiring professional licenses

If any required document category (Bank Statement, Salary Slip, Loan Details, Credit Card Bill, Miscellaneous Bills) is missing, include this in the validationNote: 'This analysis is based on the documents provided and may improve with additional uploads.'
`;

  const parts = [{ text: prompt }];

  for (const doc of documents) {
    parts.push({
      text: `Document Category: ${doc.category}\nFile Name: ${doc.file.name}`
    });
    
    let mimeType = doc.mimeType;
    const supportedMimeTypes = [
      'application/pdf',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ];
    
    if (!mimeType || !supportedMimeTypes.includes(mimeType)) {
      if (doc.file.name.toLowerCase().endsWith('.csv')) {
        mimeType = 'text/csv';
      } else if (doc.file.name.toLowerCase().endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (doc.file.name.toLowerCase().match(/\.(jpg|jpeg)$/)) {
        mimeType = 'image/jpeg';
      } else if (doc.file.name.toLowerCase().endsWith('.png')) {
        mimeType = 'image/png';
      } else {
        mimeType = 'text/plain'; // Fallback for unsupported types to prevent 500 error
      }
    }

    parts.push({
      inlineData: {
        data: doc.base64Data,
        mimeType: mimeType,
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Switched to flash for significantly faster inference
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            validationError: {
              type: Type.STRING,
              description: "If any critical error occurs during document verification, return the error message here. Otherwise, leave empty."
            },
            validationNote: {
              type: Type.STRING,
              description: "Notes about duplicates or missing document categories."
            },
            incomeAndExpense: {
              type: Type.STRING,
              description: "Markdown table with 2 columns: 'Saving/Income Categories & Values' and 'Expenses Categories & Values'. Must include dynamically calculated values."
            },
            whereMoneyIsGoing: {
              type: Type.STRING,
              description: "Markdown text explaining major expense categories, fixed vs discretionary spend, debt vs lifestyle expenses, percentage breakdowns in simple terms. MUST be a numbered list with headings. Each point MUST be on a separate line."
            },
            whatCanBeSaved: {
              type: Type.STRING,
              description: "Markdown text identifying overlapping subscriptions, high-interest payments, avoidable fees, cash leakage. MUST be a numbered list with headings. Each point MUST be on a separate line."
            },
            expensesToAvoid: {
              type: Type.STRING,
              description: "Markdown text calling out impulse spending, excess EMI load, lifestyle inflation, repeated discretionary spends. MUST be a numbered list with headings. Each point MUST be on a separate line."
            },
            actionsToTake: {
              type: Type.STRING,
              description: "Markdown text providing clear, executable actions as a numbered list with headings. Each point MUST be on a separate line."
            },
            subscriptions: {
              type: Type.STRING,
              description: "Markdown text extracting and normalizing subscriptions, identifying overlaps, and providing executable cancellation actions with links. MUST be a numbered list with headings. Each point MUST be on a separate line."
            }
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    const result = JSON.parse(response.text);
    
    // Cache the successful result
    analysisCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error("Error analyzing documents:", error);
    throw error;
  }
}
