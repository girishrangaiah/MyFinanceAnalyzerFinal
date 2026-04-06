import React, { useState, useRef } from 'react';
import { UploadCloud, X, FileText, Image as ImageIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

export default function FileUploader({ category, onFilesChange }) {
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Validate file types
      const validTypes = [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      const validExtensions = ['.pdf', '.xls', '.xlsx', '.csv', '.doc', '.docx', '.txt'];

      for (const file of newFiles) {
        const isImage = file.type.startsWith('image/');
        const isValidType = validTypes.includes(file.type);
        const isValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

        if (!isImage && !isValidType && !isValidExtension) {
          alert(`Invalid file type: ${file.name}.\n\nPlease upload only PDF, EXCEL, CSV, Doc, DOCX, Image, Scanned copy, or Text-based files.`);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return; // Stop uploading
        }
      }

      const remainingSlots = 10 - files.length;
      const filesToAdd = newFiles.slice(0, remainingSlots);

      const newDocs = await Promise.all(
        filesToAdd.map(async (file) => {
          let base64Data = '';
          let mimeType = file.type;

          // Handle Excel files
          if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx') || 
              mimeType === 'application/vnd.ms-excel' || 
              mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            try {
              await yieldToMain(); // Prevent blocking UI
              const arrayBuffer = await file.arrayBuffer();
              const workbook = XLSX.read(arrayBuffer, { type: 'array' });
              let csvData = '';
              workbook.SheetNames.forEach(sheetName => {
                csvData += `--- Sheet: ${sheetName} ---\n`;
                csvData += XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                csvData += '\n\n';
              });
              base64Data = btoa(unescape(encodeURIComponent(csvData)));
              mimeType = 'text/csv';
            } catch (err) {
              console.error("Excel parsing error:", err);
              base64Data = await convertFileToBase64(file);
            }
          } 
          // Handle Word files
          else if (file.name.endsWith('.docx') || 
                   mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            try {
              await yieldToMain(); // Prevent blocking UI
              const arrayBuffer = await file.arrayBuffer();
              const result = await mammoth.extractRawText({ arrayBuffer });
              base64Data = btoa(unescape(encodeURIComponent(result.value)));
              mimeType = 'text/plain';
            } catch (err) {
              console.error("Word parsing error:", err);
              base64Data = await convertFileToBase64(file);
            }
          }
          // Handle images with compression
          else if (mimeType.startsWith('image/')) {
            try {
              base64Data = await compressImage(file);
              mimeType = 'image/jpeg';
            } catch (err) {
              console.error("Image compression error:", err);
              base64Data = await convertFileToBase64(file);
            }
          }
          // Handle other supported files
          else {
            base64Data = await convertFileToBase64(file);
          }

          return {
            file,
            category,
            base64Data,
            mimeType,
          };
        })
      );

      const updatedFiles = [...files, ...newDocs];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
    }
  };

  const removeFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result;
        // Remove the data:image/png;base64, prefix
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const compressImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl.split(',')[1]);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-gray-900">{category}</h3>
        <span className="text-xs text-gray-500">{files.length}/10</span>
      </div>

      <div className="space-y-3">
        {files.map((doc, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-3 overflow-hidden">
              {doc.mimeType.startsWith('image/') ? (
                <ImageIcon className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              ) : (
                <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              )}
              <span className="text-sm text-gray-700 truncate">{doc.file.name}</span>
            </div>
            <button
              onClick={() => removeFile(index)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {files.length < 10 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition-colors"
          >
            <UploadCloud className="w-6 h-6 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">Click to upload</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept="image/*,application/pdf,text/plain,text/csv,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
          </div>
        )}
      </div>
    </div>
  );
}
