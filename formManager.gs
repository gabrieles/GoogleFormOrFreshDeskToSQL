function updateForm(){

  //get list of values  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('CourseData')
  var lastRow = sh.getLastRow()
  var shValues = sh.getRange(1, 1, lastRow, 10).getValues()
  
  //get the form to populate
  var formUrl = SpreadsheetApp.getActiveSpreadsheet().getFormUrl();
  var formID = formUrl.match(/[-\w]{25,}/);
  var form = FormApp.openById(formID)
  
  //populate arrays with options
  let ListOptionsAN = [];
  let ListOptionsPZ = [];
  let orgNamesString= '';
  
  //uncomment to log the id of the pagebreak items
  //var items = form.getItems(FormApp.ItemType.PAGE_BREAK);
  // for (var i in items) { 
  // Logger.log(items[i].getTitle() + ': ' + items[i].getId());
  // }
  
  let ANpagebreak = form.getItemById(975184526).asPageBreakItem();
  let PZpagebreak = form.getItemById(1114092850).asPageBreakItem();
  let ANChoice = form.getItemById(1861191158).asMultipleChoiceItem();
  let PZChoice = form.getItemById(1408542404).asMultipleChoiceItem();
  let orgChoice = form.getItemById(733498251).asMultipleChoiceItem();
  
  let orgNamesChoices = [];
  
  for(let i=1; i<lastRow; i++){
    let rowVal = shValues[i]

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
    let orgName = rowVal[0]  
    let orgNameAndId = orgName + ' (' + rowVal[7] + ')';
    let campusName = rowVal[1].replace('\\N','-')
    let courseName = rowVal[2].replace(orgName,'').replace(campusName,'').replace('- -','-').trim()
    
    let valOut = orgName + '_' + campusName + '_' + courseName + ' [' + currency + rowVal[8] + '] --- ' + rowVal[3] + '--- (' + rowVal[4] + '-' + rowVal[5] + '-' + rowVal[6] + '-' + rowVal[7] + ')' 
    if (rowVal[0].charAt(0).match(/[a-n]/i)){
      ListOptionsAN.push(valOut)
      if(orgNamesString.indexOf(orgNameAndId) === -1 ){ 
        orgNamesChoices.push(orgChoice.createChoice(orgNameAndId,ANpagebreak))
        orgNamesString = orgNamesString + orgNameAndId + '#'
      }
    } else {
      ListOptionsPZ.push(valOut)
      if(orgNamesString.indexOf(orgNameAndId) === -1 ){ 
        orgNamesChoices.push(orgChoice.createChoice(orgNameAndId,PZpagebreak))
        orgNamesString = orgNamesString + orgNameAndId + '#'
      }
    }   
  }
  

  //Populate the dropdowns
  ANChoice.setChoiceValues(ListOptionsAN)
  PZChoice.setChoiceValues(ListOptionsPZ)
  orgChoice.setChoices(orgNamesChoices)
  
  updateOrgInFreshDesk()
}

