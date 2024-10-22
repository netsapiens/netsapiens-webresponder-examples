import XLSX from 'xlsx';
import fs from 'fs';

class LocalFeedbackStorage {
  constructor(filePath) {
    this.filePath = filePath;

    if (!fs.existsSync(this.filePath)) {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Feedback');
      XLSX.writeFile(workbook, this.filePath);
    }
  }

  addFeedback(sessionTitle, rating, comments) {

    const workbook = XLSX.readFile(this.filePath);
    const worksheet = workbook.Sheets['Feedback'];
    const feedbackData = XLSX.utils.sheet_to_json(worksheet);

    const newFeedback = {
      Timestamp: new Date().toISOString(),
      'Session Title': sessionTitle,
      Rating: rating,
      Comments: comments,
    };
    feedbackData.push(newFeedback);

    const updatedWorksheet = XLSX.utils.json_to_sheet(feedbackData);
    workbook.Sheets['Feedback'] = updatedWorksheet;
    XLSX.writeFile(workbook, this.filePath);

    console.log('Feedback added successfully!');
    return 'Feedback received successfully!';
  }

  collectAndSaveFeedback(params) {
    const { sessionTitle, rating, comments } = params;

    if (!sessionTitle || rating == null || !comments) {
      return 'all parameters required!';
    }

    return this.addFeedback(sessionTitle, rating, comments);
  }
}

export default LocalFeedbackStorage;
