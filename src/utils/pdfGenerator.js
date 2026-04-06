import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generatePDF(title, content, filename) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.setFontSize(12);
  
  // Check if content contains a markdown table
  if (content.includes('|') && content.includes('---')) {
    // Extract table
    const lines = content.split('\n');
    const tableLines = lines.filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
    
    if (tableLines.length > 2) {
      // Parse table
      const headers = tableLines[0].split('|').map(h => h.trim()).filter(h => h);
      const body = [];
      
      for (let i = 2; i < tableLines.length; i++) {
        const row = tableLines[i].split('|').map(c => c.trim()).filter(c => c !== '');
        if (row.length > 0) {
          body.push(row);
        }
      }

      autoTable(doc, {
        head: [headers],
        body: body,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
        didParseCell: function(data) {
          // Make the last row bold and slightly different background
          if (data.section === 'body' && data.row.index === body.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [249, 250, 251]; // gray-50
          }
        }
      });
      
      doc.save(filename);
      return;
    }
  }
  
  // Basic markdown to plain text conversion for jsPDF
  // jsPDF doesn't natively support markdown rendering well without html2canvas,
  // but we can strip some basic markdown or just print the text.
  let plainText = content
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/#(.*?)\n/g, '$1\n') // headers
    .replace(/\n\n/g, '\n'); // double newlines
    
  const splitText = doc.splitTextToSize(plainText, 180);
  
  let y = 35;
  for (let i = 0; i < splitText.length; i++) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(splitText[i], 14, y);
    y += 7;
  }
  
  doc.save(filename);
}
