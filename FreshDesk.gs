var fdUrl = 'https://edaid.freshdesk.com'
var fdKey = PropertiesService.getScriptProperties().getProperty('fdKey')



function printAllOpenTickets(){
  Logger.log('printAllOpenTickets');
  let filter = "(status:2 OR status:3)"
  let tickets =  getAllFreshDeskTickets(filter)
  let tLen = tickets.length
  Logger.log('tickets.length: ' + tLen)
  if (tLen){
    let outVals = []
    let outHeaders = ["Id", "Requester", "Change", "Actions", "Priority", "Status", "Due by", "UserId","FundedAmount","SignAgain","NewPayment","Org","Cohort","LinkedInUrl"]
    let outLen = 1
    outVals.push(outHeaders)
    for (var i = 0; i < tickets.length; i++) {
      let ticket = tickets[i]
      
      //get only the tickets with type beginning with "user"
      
      // TODO: use filter in the call to FreshDesk
      if(ticket.status < 4 &&  ticket.type.substring(0, 7) === 'User - ' ) {
        let outFunded = ''
        if (ticket.custom_fields.cf_new_funding_amount) {outFunded = ticket.custom_fields.cf_new_funding_amount}
        if (ticket.custom_fields.cf_funded_amount) {outFunded = ticket.custom_fields.cf_funded_amount}
        let outArray = [
                        '=Hyperlink("https://edaid.freshdesk.com/support/tickets/' + ticket.id + '","' + ticket.id + '")',
                        convertRequester(ticket.requester_id),              
                        ticket.type, 
                        setActionFromType(ticket.type),
                        convertPriority(ticket.priority),
                        convertStatus(ticket.status), 
                        convertDate(ticket.due_by),     
                        ticket.custom_fields.cf_edaid_student_id,
                        outFunded,
                        convertSignAgain(ticket.custom_fields.cf_ask_student_to_sign_agreement_again),
                        ticket.custom_fields.cf_new_payment_amount,
                        cleanOutput(ticket.custom_fields.cf_organization),
                        cleanOutput(ticket.custom_fields.cf_course_cohort),
         // JSON.stringify(ticket),
                        ticket.custom_fields.cf_new_url
                        ]
        outVals.push(outArray)
        outLen++;
      }
    }
    
    let ss = SpreadsheetApp.getActive().getSheetByName("FreshDeskTickets"); 
    ss.clear()
    ss.getRange(1,1,outLen,outHeaders.length).setValues(outVals)
    ss.getRange(1,1,1,outHeaders.length).setFontWeight("bold");
    
  }
}


function setActionFromType(type){
 let actionVal = ''
 let changeType = type.toLowerCase()
 switch(changeType){
   case 'user - block access to edaid.com':
     actionVal = 'blockAccess'
     break;
   case 'user - change amount in upcoming payment record':
     actionVal = 'changePaymentAmount'
     break;  
   case 'user - change funding amount':
     actionVal = 'changeFundedAmount,askStudentToSignContractAgain'
     break;
   case 'user - change cohort/course':
     actionVal = 'changeCohort2,changeFundedAmount,askStudentToSignContractAgain'
     break;
   case 'user - change organisation, course & cohort':
     actionVal = 'changeOrganization,changeCohort2,changeFundedAmount,askStudentToSignContractAgain'
     break;   
   case 'user - delete all transactional data coming from open banking':
     actionVal = 'deleteOpenBankingTransactions'
     break;  
   case 'user - delete sensitive data':
     actionVal = 'deleteKYCAndSensitiveData'
     break;
   case 'user - delete user':
     actionVal = 'deleteUser'
     break;   
   case 'user - expire activation link':
     actionVal = 'expireToken'
     break;    
   case 'user - hide user from org dashboard':
     actionVal = 'hideUser'
     break; 
   case 'user - mark as withdrawn and owe nothing':
     actionVal = 'changeFundedAmountTo0,markAsWithdrawn'
     break;       
   case 'user - mark as withdrawn and owe something':
     actionVal = 'changeFundedAmount,markAsWithdrawn'
     break;
    case 'user - remove record of deposit payment so they can pay again':
     actionVal = 'askStudentToPayDepositAgain'
     break; 
   case 'user - remove record of contract signed so they can sign a new one':
     actionVal = 'askStudentToSignContractAgainNoCheck'
     break;     
   case 'user - set linkedin url':
     actionVal = 'manualUpdateLinkedInURL'
     break;
   case 'user - tuition waiver (student owes nothing)':
     actionVal = 'changeFundedAmountTo0,disableOpenBankingAndPaymentMandate'
     break;
   case 'renew activation link':
     actionVal = 'renewToken'
     break;  
   default:
     actionVal = 'MISSING'
 } 
  return actionVal;
}


function convertDate(inputVal){
  let ouVal = new Date(inputVal);
  return ouVal;
}


function cleanOutput(inputVal){
  let ouVal = ''
  if(inputVal){ ouVal = inputVal.replace("null","").trim() }
  return ouVal;
}

function convertStatus(inputVal){
 let ouVal = 'Undefined' 
 switch(inputVal){
   case 2:
     ouVal = 'Open'
     break;
   case 3:
     ouVal = 'Pending'
     break;
   case 4:
     ouVal = 'Resolved'
     break;
   case 5:
     ouVal = 'Closed'
     break;
   default:
    //nothing 
 }
 return ouVal
}

function convertSignAgain(inputVal){
  let ouVal = inputVal ? 'Yes' : ''
  return ouVal;
}

function convertPriority(inputVal){
 let ouVal = 'Undefined' 
 switch(inputVal){
   case 1:
     ouVal = 'Low'
     break;
   case 2:
     ouVal = 'Medium'
     break;
   case 3:
     ouVal = 'High'
     break;
   case 4:
     ouVal = 'Urgent'
     break;
   default:
    //nothing 
 }
 return ouVal
}

function convertRequester(inputVal){
 let ouVal = inputVal
 switch(inputVal){
   case 80000963674:
     ouVal = 'devteam@edaid.com'
     break;
   case 80003755268:
     ouVal = 'helen@edaid.com'
     break;
   case 80000980840:
     ouVal = 'dot@edaid.com'
     break;
   case 4:
     ouVal = 'elisha@edaid.com'
     break;
   case 5:
     ouVal = 'jenn@edaid.com'
     break; 
   case 6:
     ouVal = 'nicole@edaid.com'
     break;  
   case 7:
     ouVal = 'gabriele@edaid.com'
     break;    
   default:
    //nothing 
 }
 return ouVal
}

/////////////////////////////////////////////////////////////////
function getAllFreshDeskTickets(filter){
  
  Logger.log('getAllFreshDeskTickets');
  let numPerPage = 100 //default 30 - max 100
  
  //Define the API call
  let fdEndPoint = fdUrl+ '/api/v2/tickets?per_page=' + numPerPage
  let headers = {"Authorization": "Basic " + Utilities.base64Encode( fdKey + ":fakePassword")}
  let options = {
    'method' : 'GET',
    'contentType': 'application/json',
    'headers' : headers
  };
  
  //loop over all tickets (default is to get 30 on each call)
  let pageNum = 1;
  let fdEndPointWithPage = fdEndPoint
  let outTickets = []
  while (pageNum >= 0){
    Logger.log(pageNum)
    fdEndPointWithPage = fdEndPoint + '&page=' + pageNum
    let response = UrlFetchApp.fetch(fdEndPointWithPage, options);
    let data = JSON.parse(response)
    let responseCode = response.getResponseCode();
    if(responseCode === 200){
      let dataLen = data.length;
      Logger.log('dataLen: ' + dataLen)
      for (var j = 0; j < dataLen; j++) {
        let ticket = data[j]
        //Logger.log(ticket)
        outTickets.push(ticket)
      }
      if (dataLen>numPerPage-1){
        pageNum++;
      } else {
        pageNum = -1   
      }
    } else {
      pageNum = -2
    }
  } 
  return outTickets;
}   



/////////////////////////////////////////////////////////////////
function getFreshDeskTicketFields(fieldId){
  
  let outFields = [];
  //Define the API call
  let fdEndPoint = fdUrl  + '/api/v2/admin/ticket_fields'
  if (fieldId) { fdEndPoint += '/' + fieldId }
  Logger.log(fdEndPoint)
  let headers = {"Authorization": "Basic " + Utilities.base64Encode( fdKey + ":fakePassword")}
  let options = {
    'method' : 'GET',
    'contentType': 'application/json',
    'headers' : headers
  };
  
  let response = UrlFetchApp.fetch(fdEndPoint, options);  
  let responseCode = response.getResponseCode();
  let data = JSON.parse(response)
  if(responseCode === 200){   
    let dataLen = data.length;
    Logger.log(dataLen)
    for (var j = 0; j < dataLen; j++) {
      let field = data[j]
      Logger.log(JSON.stringify(field))
      outFields.push(field)
    }
  }
  if (fieldId) {
    return data;
  } else {
    return outFields;
  }
}  




///////////////////////////////////////////////
function updateOrgInFreshDesk(){
  
  let cOrgId = '';
  
  let newChoices = []
  let removeChoices = []
  
  
  //Remove all current choices on the organization ticket
  let ticket = getFreshDeskTicketFields('80000100826')
  
  if( ticket.choices.length >0 ) {
    let oldChoices = ticket.choices  
    for (let j=0; j<oldChoices.length; j++){
      let choice = oldChoices[j]
      removeChoices.push({"deleted":true,"id":choice.id})
    }
  }
  Logger.log( removeChoices.length + ' values to be deleted')
  
  
  //get the updated list of orgs, courses, and cohorts
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('AllCourseData')
  let lastRow = sh.getLastRow()
  let shValues = sh.getRange(1, 1, lastRow, 10).getValues()
  
  let posOne = 0
  let posTwo = 0
  let outChoice = {}    
  
  //store the new values
  for(let i=1; i<lastRow; i++){
    
    //prepare vars
    let rowVal = shValues[i]
    let orgName = rowVal[0].trim()  
    let orgId = rowVal[7]    
    let campusName = rowVal[1].replace('\\N','').trim()
    let campusId = rowVal[6].replace('\\N','').trim()
    let courseName = campusName + ' - ' + rowVal[2].trim()
    let courseId = rowVal[5] + ' - ' + campusId
    
    let cohortName = rowVal[3]
    let cohortId = rowVal[4]
    let currency = "GBP"
    switch(rowVal[9]){
      case '1':
        currency = "USD"
        break; 
      case '8':
        currency = "CAD"
        break; 
      case '6':
        currency = "EUR"
        break;
      default:
        //
    }
    let courseCost = currency + rowVal[8]
    
    let orgVal = orgName + ' (' + orgId + ')'
    let courseVal = courseName +  ' [' + courseCost + '] | ' +  cohortName +  ' (' + cohortId + ' - ' + courseId + ' - ' + orgId + ')';
    
    
    //add options
    if (orgId != cOrgId){
      if(i>1){ newChoices.push(outChoice) }
      cOrgId = orgId;
      posOne++;
      posTwo = 1;
      outChoice = {
        "value": orgVal,
        "position": posOne,
        "choices": [{"value": courseVal,"position":posTwo} ]
      }
    } else {
      posTwo++;
      outChoice.choices.push( {"value":courseVal,"position":posTwo} )
    }        
  }
  newChoices.push(outChoice)
  
  //call freshdesk to update the field
  
  let fdEndPoint = fdUrl+ '/api/v2/admin/ticket_fields/' + '80000100826'
  Logger.log(fdEndPoint)
  let headers = {"Authorization": "Basic " + Utilities.base64Encode( fdKey + ":fakePassword")}
  
  //remove old stuff
  if( ticket.choices.length >0 ) {
    let payload = {"choices":removeChoices};
    let payloadOut = JSON.stringify(payload)
    Logger.log('payloadOut1')
    Logger.log(payloadOut)
    let options = {
      'method' : 'PUT',
      'contentType': 'application/json',
      'headers' : headers,
      'payload': payloadOut,
      'muteHttpExceptions':true
    };
    let response1 = UrlFetchApp.fetch(fdEndPoint, options);
    Logger.log(response1) 
  } else {
    Logger.log('nothing to remove') 
  }
  
  //add fields
  payload = {"choices":newChoices};
  payloadOut = JSON.stringify(payload)
  Logger.log('payloadOut2')
  Logger.log(payloadOut)
  options = {
    'method' : 'PUT',
    'contentType': 'application/json',
    'headers' : headers,
    'payload': payloadOut,
    'muteHttpExceptions':true
  };
  let response2 = UrlFetchApp.fetch(fdEndPoint, options);
  Logger.log(response2) 
  
}





/////////////////////////////////////////////////////////////////
/// Open modal to generate code to have a dependant field with 2 layers: Organizations - Courses & cohorts
/////////////////////////////////////////////////////////////////
function showFreshDeskCohorts(){

  //get list of values  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('CourseData')
  var lastRow = sh.getLastRow()
  var shValues = sh.getRange(1, 1, lastRow, 10).getValues()
  
  let outList = [];
  let stepSep = '[tab]';
  let posOne = 0
  let cOrgId = '';
  let cCampusId = '';
  let cCourseId = '';
  let cCohortId = '';
  
  for(let i=1; i<lastRow; i++){
    let rowVal = shValues[i]
    
    let orgName = rowVal[0].trim()  
    let orgId = rowVal[7]
    
    let campusName = rowVal[1].replace('\\N','').trim()
    let courseName = rowVal[2].trim()
    let courseId = rowVal[5]
    if (campusName.length >0 ) {
      courseName = campusName + ' - ' + rowVal[2].trim()
      courseId = rowVal[6] + ' - ' + rowVal[5]
    } 
    
    let cohortName = rowVal[3]
    let cohortId = rowVal[4]
    
    let currency = "GBP"
    switch(rowVal[9]){
      case '1':
        currency = "USD"
      break; 
      case '8':
        currency = "CAD"
      break; 
      case '6':
        currency = "EUR"
        break;
      default:
        //
    }
    let courseCost = currency + rowVal[8]
    if (orgId != cOrgId){
      outList.push(orgName + ' (' + orgId + ')' );
      outList.push(stepSep + courseName +  ' {' + courseCost + '} | ' +  cohortName +  ' [' + cohortId + '] (' + cohortId + ' - ' + courseId + ' - ' + orgId + ')' );
      cOrgId = orgId
      cCourseId = courseId
      cCohortId = cohortId
    } else {
      if (courseId != cCourseId || cohortId != cCohortId ){
        outList.push(stepSep + courseName +  ' {' + courseCost + '} | ' +  cohortName +  ' [' + cohortId + '] (' + cohortId + ' - ' + courseId + ' - ' + orgId + ')' );
        cCourseId = courseId
        cCohortId = cohortId
      }
    }
  }

  // open a modal with the instructions to follow
  let outHTML = '<style>'+
                  '#codeWrapper{line-height:2em; font-size:14px}' + '\n' +
                  '.txt{color: #616161}' + '\n' +
                  '.sql span{color: #19A77C}' + '\n' +  
                  '.warning{color: #CB4347}' + '\n' +  
                  '#codeWrapper a{color: #2C88B6}' + '\n' +
                  'body code[class*=language-], body pre[class*=language-]{white-space:normal;}' + '\n' +
                  '.inlineCode {background: #f5f2f0; padding: 0.2em;}'   + '\n' +
                  'body pre[class*=language-] { padding: .5em; margin: 1px 0;}' +
                '</style>';
  outHTML += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.19.0/themes/prism.min.css" integrity="sha256-cuvic28gVvjQIo3Q4hnRpQSNB0aMw3C+kjkR0i+hrWg=" crossorigin="anonymous" />';
  
  outHTML += '<div id="codeWrapper">';
  
  Logger.log("outList.length: " + outList.length)
  let outH = 30
  for(let i=0; i<outList.length; i++){
    outHTML += '<div class="txt">'+ outList[i] + '</div>'
    outH += 10
  }
  outHTML += '<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.19.0/components/prism-core.min.js" integrity="sha256-D05OTvzyl8h0SDpcQF6UNo3gl2rKDMmRuqX8ZZ06pNE=" crossorigin="anonymous"></script>';   
  outHTML += '<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.19.0/plugins/autoloader/prism-autoloader.min.js" integrity="sha256-WIuEtgHNTdrDT2obGtHYz/emxxAj04sJBdMhRjDXd8I=" crossorigin="anonymous"></script>'
  outHTML += '</div>'
  
  let htmlOutput = HtmlService.createHtmlOutput(outHTML).setWidth(1300).setHeight(outH);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'FreshDesk Code');
  
}

