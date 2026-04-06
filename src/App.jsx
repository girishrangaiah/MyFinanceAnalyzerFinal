import React, { useState } from 'react';
import { UploadCloud, FileText, Loader2, AlertCircle, Calendar, RefreshCw } from 'lucide-react';
import FileUploader from './components/FileUploader.jsx';
import ReportView from './components/ReportView.jsx';
import { analyzeFinancialDocuments } from './services/geminiService.js';

const CATEGORIES = [
  'Bank Statements',
  'Miscellaneous Bills (Rent, Utilities, Subscriptions, School fees, Salary slip, Loan statement, Credit Card Bill, etc.)',
];

export default function App() {
  const [documents, setDocuments] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Add a key to force re-render of FileUploader components when refreshing
  const [uploaderKey, setUploaderKey] = useState(0);

  const handleRefresh = () => {
    setDocuments({});
    setResult(null);
    setError(null);
    setUploaderKey(prev => prev + 1); // Force FileUploader components to remount and clear their internal state
  };

  const handleFilesChange = (category, files) => {
    setDocuments(prev => ({
      ...prev,
      [category]: files
    }));
  };

  const handleAnalyze = async () => {
    const allDocs = Object.values(documents).flat();
    if (allDocs.length === 0) {
      setError('Please upload at least one document.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await analyzeFinancialDocuments(allDocs);
      setResult(analysisResult);
    } catch (err) {
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">My Financial Analyzer – Financial Assistant</h1>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <UploadCloud className="w-5 h-5 mr-2 text-indigo-500" />
                Upload Documents
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Upload up to 10 documents per category.
                <br />
                <span className="text-xs text-gray-400 mt-1 block">
                  Valid file types: PDF, EXCEL, CSV, Doc, DOCX, Image, Scanned copy, Text-based files
                </span>
              </p>
              
              <div className="space-y-4">
                {CATEGORIES.map(category => (
                  <FileUploader
                    key={`${category}-${uploaderKey}`}
                    category={category}
                    onFilesChange={(files) => handleFilesChange(category, files)}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing Documents...
                </>
              ) : (
                'Analyze My Finances'
              )}
            </button>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-start mt-6">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Privacy & Security Note</h3>
                <p className="text-xs text-green-700 mt-1">
                  This app runs entirely in your browser and is compatible with GitHub Pages and mobile phones. Your uploaded files reside locally on your device and are never stored, downloaded, or saved on our servers. Data is securely transmitted directly to Google Gemini AI solely for generating your financial report and is not retained by us.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-8">
            {result ? (
              <ReportView result={result} />
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-indigo-50 p-4 rounded-full mb-4">
                  <FileText className="w-12 h-12 text-indigo-300" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Analysis Yet</h3>
                <p className="text-gray-500 max-w-md">
                  Upload your financial documents and click "Analyze My Finances" to get plain-language insights and actionable advice.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
