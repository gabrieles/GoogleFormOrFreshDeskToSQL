// ******************************************************************************************************
// Function to create menus when a user opens the sheet
// ******************************************************************************************************
function onOpen(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var menuEntries = [
    {name: "Mark as Completed", functionName: "markAsCompleted"},                  
    {name: "Show Steps", functionName: "generateInstructions"},  
    {name: "Update Form", functionName: "updateForm"},  
  //  {name: "Update Organization field in FreshDesk", functionName: "updateOrgInFreshDesk"},  
  //  {name: "Open Modal with FreshDesk Field", functionName: "showFreshDeskCohorts"},  
    {name: "Get Tickets", functionName: "printAllOpenTickets"}     
  ]; 
  ss.addMenu("EdAid Admin", menuEntries);
}
    
var colStatus = 1
var colTicketId = 3
var colActions = 5
var colEmail = 7
var colUserId = 8
var colChange = 10
var FDcolStatus = 6



function markAsCompleted() {
  let ss = SpreadsheetApp.getActiveSheet();
  let sheetName = ss.getName()
  let range = ss.getActiveRange();
  let numRows = range.getNumRows();
  let lastCol = ss.getLastColumn();
  let baseRow = range.getRowIndex()
  let today = new Date()
  
  if( ss.getName() === 'Form responses 1') {
    for (let i = 1; i <= numRows; i++) {
      //update status on sheet
      let currRow = baseRow + i - 1;
      ss.getRange(currRow, colStatus,1,2).setValues([['Done',today]])
      
      //send email notification
      let cRow = ss.getRange(currRow, 1,1,lastCol-2).getValues()[0]
      let ticketId = cRow[colTicketId-1]
      let studentId = cRow[colUserId-1]
      let changeType = cRow[colChange-1]
      let emailAddress = cRow[colEmail-1]
      
      let subject = 'Ticket ' + ticketId + ' completed'
      let message = '<p>Hello!</p>' + '\n <br>\n' +
        '<p>Ticket ' + ticketId + ' has been completed</p>' + '\n' +
          '<p><b>StudentId:</b> ' + studentId + '</p>\n' +
            '<p><b>Change:</b> ' + changeType + '</p>\n' +
              '<p><b>From:</b> ' + emailAddress + '</p><br>';
      MailApp.sendEmail({to: emailAddress,subject: subject,htmlBody: message});
      
      //send slack notification
      let headers = {'Content-Type': 'application/x-www-form-urlencoded'};
      let notificationMessage = subject + " (" + changeType + " for userId " + studentId + " )"
      let payload = {"channel": "#tickets-users", 
                     "username": "Edmond", 
                     "text":  notificationMessage, 
                     "icon_emoji": ":nerd_face:"}
      let payloadString = JSON.stringify(payload)
      let slackAPIEndpoint = PropertiesService.getScriptProperties().getProperty('slackEndpoint')
      let options = {
        'method' : 'POST',
        'contentType': 'application/json',
        'payload': payloadString
      };
      UrlFetchApp.fetch(slackAPIEndpoint, options);    
    }
  } else {
    
    let fdUrl = 'https://edaid.freshdesk.com/'
    let fdKey = PropertiesService.getScriptProperties().getProperty('fdKey')
    
    for (let j = 1; j <= numRows; j++) {
      //update status on sheet
      let currRow = baseRow + j - 1;
      ss.getRange(currRow, FDcolStatus).setValue('Closed')
      let ticketId = ss.getRange(currRow,1).getValue()
      let studentId = ss.getRange(currRow,8).getValue()
      let changeType = ss.getRange(currRow,3).getValue()
      let emailAddress = ss.getRange(currRow,2).getValue()
      
      
      //update in FD
      let fdEndPoint = fdUrl+ '/api/v2/tickets/' + ticketId
      Logger.log(fdEndPoint)
      let fdHeaders = {"Authorization": "Basic " + Utilities.base64Encode( fdKey + ":fakePassword")}
      let fdPayload = {status:5};
      let fdPayloadOut = JSON.stringify(fdPayload)
      let fdOptions = {
        'method' : 'PUT',
        'contentType': 'application/json',
        'headers' : fdHeaders,
        'payload': fdPayloadOut,
        'muteHttpExceptions':true
      };
      let response = UrlFetchApp.fetch(fdEndPoint, fdOptions);
      Logger.log(response)
      
      //send email notification
      
     
       
      let subject = 'FreshDesk Ticket ' + ticketId + ' completed'
      let message = '<p>Hello!</p>' + '\n <br>\n' +
        '<p>Ticket ' + ticketId + ' has been completed</p>' + '\n' +
          '<p><b>StudentId:</b> ' + studentId + '</p>\n' +
            '<p><b>Change:</b> ' + changeType + '</p>\n' +
              '<p><b>From:</b> ' + emailAddress + '</p><br>';
     // MailApp.sendEmail({to: emailAddress,subject: subject,htmlBody: message});
      
      //send slack notification
      let headers = {'Content-Type': 'application/x-www-form-urlencoded'};
      let notificationMessage = subject + " (" + changeType + " for userId " + studentId + " )"
      let payload = {"channel": "#tickets-users", //"#tickets-users", 
                     "username": "Edmond", 
                     "text":  notificationMessage, 
                     "icon_emoji": ":nerd_face:"}
      let payloadString = JSON.stringify(payload)
      let slackAPIEndpoint = PropertiesService.getScriptProperties().getProperty('slackEndpoint')
      let options = {
        'method' : 'POST',
        'contentType': 'application/json',
        'payload': payloadString
      };
      UrlFetchApp.fetch(slackAPIEndpoint, options);    
    }
    
  }
}


function setTicketNumber(){
  let ss = SpreadsheetApp.getActive().getSheetByName("Form Responses 1");
  let lastRow = ss.getLastRow();
  let lastColumn = ss.getLastColumn();
  let rangeId = ss.getRange(colStatus, 3, lastRow, 1).getValues();
  for (var i=1; i<lastRow+1; i++){
    if (rangeId[i-1][0].length === 0) { 
      let ticketNum = i-2
      
      //define ticketId, and print it in the cell
      let ticketId = 'A' + ticketNum.toString().padStart(6,'0') 
      ss.getRange(i,colTicketId).setValue(ticketId)
      
      //send notification via slack
      let ticketRow = ss.getRange(i, colStatus, 1, lastColumn).getValues()[0];
      
      //define actions, and print them in the cell
      let rowChange = ticketRow[colChange-1].toLowerCase()
      let actionVal = ''
      switch(rowChange){
        case 'block access to edaid':
          actionVal = 'blockAccess'
          break;
        case 'cancel application and contract':
          actionVal = 'markAsWithdrawn,voidContract,disableOpenBankingAndPaymentMandate,removePdf'
          break;
        case 'change funding amount':
          actionVal = 'changeFundedAmount,askStudentToSignContractAgain'
          break;
        case 'change funding amount and graduation date':
          actionVal = 'changeFundedAmount,changeGraduationDate,askStudentToSignContractAgain'
          break;
        case 'change cohort/course':
          actionVal = 'changeCohort2,changeFundedAmount,askStudentToSignContractAgain'
          break;
        case 'change organization, course & cohort':
          actionVal = 'changeOrganization,changeCohort2,changeFundedAmount,askStudentToSignContractAgain'
          break;   
        case 'change amount in upcoming payment record':
          actionVal = 'changePaymentAmount'
          break;    
        case 'mark as withdrawn and owe something':
          actionVal = 'changeFundedAmount,markAsWithdrawn'
          break;
        case 'mark as withdrawn and owe nothing':
          actionVal = 'changeFundedAmountTo0,markAsWithdrawn'
          break;
        case 'set linkedIn url':
          actionVal = 'manualUpdateLinkedInURL'
          break;
        case 'manually override payment mandate':
          actionVal = 'manualBypassPaymentMandate'
          break;
        case 'submit a microdeposit request to dwolla':
          actionVal = 'DwollaMicrodeposit'
          break;
        case 'delete sensitive data':
          actionVal = 'deleteKYCAndSensitiveData'
          break;
        case 'delete all transactional data coming from open banking':
          actionVal = 'deleteOpenBankingTransactions'
          break;
        case 'tuition waiver (student owes nothing)':
          actionVal = 'changeFundedAmountTo0,disableOpenBankingAndPaymentMandate'
          break;
         case 'renew activation link':
          actionVal = 'renewToken'
          break;
        case 'expire activation link':
          actionVal = 'expireToken'
          break;  
        case 'remove record of contract signed so they can sign a new one':
          actionVal = 'askStudentToSignContractAgainNoCheck'
          break;  
        case 'remove record of deposit payment  so they can pay again':
          actionVal = 'askStudentToPayDepositAgain'
          break;            
        case 'delete user':
          actionVal = 'deleteUser'
          break;    
        case 'hide user from org dashboard':
          actionVal = 'hideUser'
          break;
          
        default:
         actionVal = 'MISSING'
      }
      
      ss.getRange(i,colActions).setValue(actionVal)
      
      Logger.log('val:' + ticketRow[colUserId-1])
      let userName = ticketRow[colEmail-1].split('@')[0]
      userName = userName.charAt(0).toUpperCase() + userName.substr(1).toLowerCase();
      let notification = userName + ' has submitted ticket ' + ticketId + ' (' + ticketRow[colChange-1] + ' for userId ' + ticketRow[colUserId-1] + ')'
      let headers = {'Content-Type': 'application/x-www-form-urlencoded'};    
      let payload = {"channel": "#tickets-users", 
                     "username": "Edmond", 
                     "text":  notification , 
                     "icon_emoji": ":nerd_face:"}
      let payloadString = JSON.stringify(payload)
      var slackAPIEndpoint = PropertiesService.getScriptProperties().getProperty('slackEndpoint')
      var options = {
        'method' : 'POST',
        'contentType': 'application/json',
        'payload': payloadString
      };
      
      UrlFetchApp.fetch(slackAPIEndpoint, options);
      
    }
  }
  
}