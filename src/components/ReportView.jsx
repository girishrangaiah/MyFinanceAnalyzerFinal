import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, AlertTriangle, Info } from 'lucide-react';
import { generatePDF } from '../utils/pdfGenerator.js';

export default function ReportView({ result }) {
  const [activeTab, setActiveTab] = useState('incomeAndExpense');

  const tabs = [
    { id: 'incomeAndExpense', label: 'Income and Expense', content: result.incomeAndExpense },
    { id: 'whereMoneyIsGoing', label: 'Spending Summary', content: result.whereMoneyIsGoing },
    { id: 'whatCanBeSaved', label: 'Savings Opportunities', content: result.whatCanBeSaved },
    { id: 'expensesToAvoid', label: 'Expense Optimization Suggestions', content: result.expensesToAvoid },
    { id: 'actionsToTake', label: 'Action Plan for the Month', content: result.actionsToTake },
    { id: 'subscriptions', label: 'Subscription', content: result.subscriptions },
  ];

  const handleDownload = (tabId, label, content) => {
    if (content) {
      generatePDF(label, content, `${label.replace(/\s+/g, '_')}.pdf`);
    }
  };

  const handleDownloadAll = () => {
    tabs.forEach(tab => {
      if (tab.content) {
        generatePDF(tab.label, tab.content, `${tab.label.replace(/\s+/g, '_')}.pdf`);
      }
    });
  };

  if (result.validationError) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-sm">
        <div className="flex items-center mb-2">
          <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
          <h3 className="text-lg font-medium text-red-800">Validation Error</h3>
        </div>
        <p className="text-red-700">{result.validationError}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {result.validationNote && (
        <div className="bg-blue-50 border-b border-blue-100 p-4 flex items-start">
          <Info className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">{result.validationNote}</p>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6 md:p-8">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`${activeTab === tab.id ? 'block' : 'hidden'}`}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">{tab.label}</h2>
              <button
                onClick={() => handleDownload(tab.id, tab.label, tab.content)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            </div>
            <div className="prose prose-indigo max-w-none text-gray-600">
              {tab.content ? (
                <Markdown remarkPlugins={[remarkGfm]}>{tab.content}</Markdown>
              ) : (
                <p className="italic text-gray-400">No data available for this section.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
        <button
          onClick={handleDownloadAll}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Download All Reports
        </button>
      </div>
    </div>
  );
}
