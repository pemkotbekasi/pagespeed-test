const fs = require('fs');
const path = require('path');

// Function to read all JSON files from the json directory
function readJsonFiles(directory) {
  if (!fs.existsSync(directory)) {
    console.error(`Directory not found: ${directory}`);
    return [];
  }
  
  const files = fs.readdirSync(directory);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  
  const reports = [];
  for (const file of jsonFiles) {
    try {
      const filePath = path.join(directory, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      reports.push({
        filename: file,
        url: data.finalDisplayedUrl || data.requestedUrl || 'Unknown URL',
        data: data
      });
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
  }
  
  return reports;
}

// Function to group reports by issue/audit across all URLs
function groupReportsByIssue(reports) {
  const groupedByCategory = {
    'performance': { title: 'Performance', issues: {} },
    'accessibility': { title: 'Accessibility', issues: {} },
    'best-practices': { title: 'Best Practices', issues: {} },
    'seo': { title: 'SEO', issues: {} }
  };

  // Process each report
  for (const report of reports) {
    const { data, url } = report;
    
    if (!data.categories || !data.audits) {
      continue;
    }

    // Process each category
    for (const categoryKey of Object.keys(data.categories)) {
      if (!groupedByCategory[categoryKey]) {
        continue;
      }

      const category = data.categories[categoryKey];
      const categoryScore = category.score !== null ? Math.round(category.score * 100) : 'N/A';

      // Process each audit in the category
      for (const auditRef of category.auditRefs) {
        const auditId = auditRef.id;
        const audit = data.audits[auditId];

        if (!audit) {
          continue;
        }

        // Only include failed audits or informational audits with score < 1
        if (audit.score !== null && audit.score === 1) {
          continue;
        }

        // Initialize issue group if it doesn't exist
        if (!groupedByCategory[categoryKey].issues[auditId]) {
          groupedByCategory[categoryKey].issues[auditId] = {
            id: auditId,
            title: audit.title,
            description: audit.description,
            urls: []
          };
        }

        // Add this URL to the issue
        groupedByCategory[categoryKey].issues[auditId].urls.push({
          url: url,
          score: audit.score !== null ? Math.round(audit.score * 100) : 'N/A',
          scoreDisplayMode: audit.scoreDisplayMode,
          displayValue: audit.displayValue || '',
          details: audit.details
        });
      }
    }
  }

  return groupedByCategory;
}

// Function to escape HTML special characters
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Function to validate and sanitize URL
function sanitizeUrl(url) {
  if (!url) return '#';
  // Block dangerous URL schemes
  const urlLower = url.toLowerCase().trim();
  if (urlLower.startsWith('javascript:') || urlLower.startsWith('data:') || urlLower.startsWith('vbscript:')) {
    return '#';
  }
  return url;
}

// Function to generate HTML report
function generateHtmlReport(groupedData) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lighthouse Grouped Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a73e8;
      margin-bottom: 10px;
      font-size: 2.5em;
      border-bottom: 3px solid #1a73e8;
      padding-bottom: 10px;
    }
    .meta-info {
      color: #666;
      margin-bottom: 30px;
      font-size: 0.95em;
    }
    .category {
      margin-bottom: 40px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }
    .category-header {
      background: linear-gradient(to right, #1a73e8, #1557b0);
      color: white;
      padding: 20px;
      font-size: 1.8em;
      font-weight: 600;
    }
    .category-header.performance {
      background: linear-gradient(to right, #0cce6b, #0a9d52);
    }
    .category-header.accessibility {
      background: linear-gradient(to right, #ffa400, #e68a00);
    }
    .category-header.best-practices {
      background: linear-gradient(to right, #ff4e42, #cc3e35);
    }
    .category-header.seo {
      background: linear-gradient(to right, #1a73e8, #1557b0);
    }
    .issue {
      border-bottom: 1px solid #e0e0e0;
      padding: 20px;
      background: #fafafa;
    }
    .issue:last-child {
      border-bottom: none;
    }
    .issue-title {
      font-size: 1.3em;
      font-weight: 600;
      color: #1a73e8;
      margin-bottom: 10px;
    }
    .issue-description {
      color: #666;
      margin-bottom: 15px;
      line-height: 1.5;
    }
    .url-list {
      margin-top: 15px;
    }
    .url-item {
      background: white;
      padding: 12px 15px;
      margin-bottom: 10px;
      border-left: 4px solid #1a73e8;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .url-item.score-fail {
      border-left-color: #ff4e42;
    }
    .url-item.score-average {
      border-left-color: #ffa400;
    }
    .url-item.score-pass {
      border-left-color: #0cce6b;
    }
    .url-link {
      color: #1a73e8;
      text-decoration: none;
      font-weight: 500;
      word-break: break-all;
    }
    .url-link:hover {
      text-decoration: underline;
    }
    .score-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
      margin-left: 10px;
      background: #e0e0e0;
      color: #333;
    }
    .score-badge.fail {
      background: #ff4e42;
      color: white;
    }
    .score-badge.average {
      background: #ffa400;
      color: white;
    }
    .score-badge.pass {
      background: #0cce6b;
      color: white;
    }
    .display-value {
      color: #666;
      font-size: 0.9em;
      margin-left: 10px;
    }
    .no-issues {
      padding: 20px;
      text-align: center;
      color: #0cce6b;
      font-size: 1.2em;
      font-weight: 500;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border: 2px solid #e0e0e0;
      text-align: center;
    }
    .summary-card h3 {
      font-size: 1.1em;
      margin-bottom: 10px;
      color: #666;
    }
    .summary-card .count {
      font-size: 2.5em;
      font-weight: 700;
      color: #1a73e8;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Lighthouse Grouped Report</h1>
    <div class="meta-info">
      Generated on ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC
    </div>
`;

  // Add summary cards
  let totalIssues = 0;
  for (const categoryKey of Object.keys(groupedData)) {
    totalIssues += Object.keys(groupedData[categoryKey].issues).length;
  }

  html += `
    <div class="summary">
      <div class="summary-card">
        <h3>Total Categories</h3>
        <div class="count">${Object.keys(groupedData).length}</div>
      </div>
      <div class="summary-card">
        <h3>Total Issues</h3>
        <div class="count">${totalIssues}</div>
      </div>
    </div>
`;

  // Generate sections for each category
  for (const categoryKey of Object.keys(groupedData)) {
    const category = groupedData[categoryKey];
    const issueKeys = Object.keys(category.issues);
    
    html += `
    <div class="category">
      <div class="category-header ${categoryKey}">${category.title}</div>
`;

    if (issueKeys.length === 0) {
      html += `
      <div class="no-issues">✓ No issues found in this category</div>
`;
    } else {
      for (const issueKey of issueKeys) {
        const issue = category.issues[issueKey];
        html += `
      <div class="issue">
        <div class="issue-title">${escapeHtml(issue.title)}</div>
        <div class="issue-description">${escapeHtml(issue.description)}</div>
        <div class="url-list">
          <strong>Affected URLs (${issue.urls.length}):</strong>
`;

        for (const urlData of issue.urls) {
          let scoreClass = '';
          let badgeClass = '';
          
          if (urlData.score !== 'N/A') {
            if (urlData.score < 50) {
              scoreClass = 'score-fail';
              badgeClass = 'fail';
            } else if (urlData.score < 90) {
              scoreClass = 'score-average';
              badgeClass = 'average';
            } else {
              scoreClass = 'score-pass';
              badgeClass = 'pass';
            }
          }

          html += `
          <div class="url-item ${scoreClass}">
            <a href="${escapeHtml(sanitizeUrl(urlData.url))}" class="url-link" target="_blank">${escapeHtml(urlData.url)}</a>
            ${urlData.score !== 'N/A' ? `<span class="score-badge ${badgeClass}">Score: ${urlData.score}</span>` : ''}
            ${urlData.displayValue ? `<span class="display-value">${escapeHtml(urlData.displayValue)}</span>` : ''}
          </div>
`;
        }

        html += `
        </div>
      </div>
`;
      }
    }

    html += `
    </div>
`;
  }

  html += `
  </div>
</body>
</html>`;

  return html;
}

// Main execution
function main() {
  const jsonDir = process.env.JSON_DIR || path.join(__dirname, 'json');
  
  console.log('Reading JSON files from:', jsonDir);
  const reports = readJsonFiles(jsonDir);
  console.log(`Found ${reports.length} reports`);
  
  console.log('Grouping reports by issue...');
  const groupedData = groupReportsByIssue(reports);
  
  console.log('Generating HTML report...');
  const html = generateHtmlReport(groupedData);
  
  const outputPath = process.env.OUTPUT_PATH || path.join(__dirname, 'grouped_report.html');
  try {
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`✓ Grouped report generated: ${outputPath}`);
  } catch (error) {
    console.error(`Error writing report file: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { readJsonFiles, groupReportsByIssue, generateHtmlReport, sanitizeUrl, escapeHtml };
