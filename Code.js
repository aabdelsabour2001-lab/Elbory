const SHEET_EMPLOYEES = "Employees";
const SHEET_ATTENDANCE = "Attendance";

/**
 * خدمة GET/POST بسيطة.
 * - GET ?action=employees  => يعيد JSON لقائمة الموظفين
 * - POST => يسجل حضور/انصراف. body JSON { id: "E001", type: "IN" }  (type: "IN" أو "OUT")
 */

function doGet(e) {
  const action = e.parameter.action || "";
  if (action === "employees") {
    return ContentService
      .createTextOutput(JSON.stringify(getEmployees()))
      .setMimeType(ContentService.MimeType.JSON);
  } else if (action === "attendance") {
    // يمكنك استخدام هذا لعرض آخر سجلات (اختياري)
    return ContentService
      .createTextOutput(JSON.stringify({status: "ok", message: "Use POST to record attendance"}))
      .setMimeType(ContentService.MimeType.JSON);
  } else {
    return ContentService
      .createTextOutput(JSON.stringify({error: "invalid action. use ?action=employees"}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const contentType = e.postData.type; // application/json
    const data = JSON.parse(e.postData.contents);
    if (!data.id || !data.type) {
      return jsonResponse({error: "missing id or type"}, 400);
    }
    const id = data.id;
    const type = data.type.toUpperCase() === "OUT" ? "OUT" : "IN"; // default IN
    const employee = findEmployeeById(id);
    const timestamp = new Date();
    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_ATTENDANCE);
    sheet.appendRow([timestamp, id, employee ? employee.Name : "UNKNOWN", type, data.note || ""]);
    return jsonResponse({status: "ok", id: id, name: employee ? employee.Name : null, type: type, timestamp: timestamp});
  } catch (err) {
    return jsonResponse({error: err.message}, 500);
  }
}

function getEmployees() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(SHEET_EMPLOYEES);
  const values = sheet.getDataRange().getValues(); // includes header
  const header = values.shift();
  const idx = {};
  header.forEach((h, i) => idx[h] = i);
  const out = values.map(row => {
    return {
      ID: row[idx["ID"]],
      Name: row[idx["Name"]],
      ImageURL: row[idx["ImageURL"]]
    };
  });
  return out;
}

function findEmployeeById(id) {
  const employees = getEmployees();
  for (let i = 0; i < employees.length; i++) {
    if (String(employees[i].ID) === String(id)) return employees[i];
  }
  return null;
}

function jsonResponse(obj, code) {
  const resp = ContentService.createTextOutput(JSON.stringify(obj));
  resp.setMimeType(ContentService.MimeType.JSON);
  if (code) {
    resp.setStatus(code);
  }
  return resp;
}
