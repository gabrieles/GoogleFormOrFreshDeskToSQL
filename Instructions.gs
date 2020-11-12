var outH = 100;
var outVal = [];

///////////////////////////////////////////////////////////////////////////////////////////////
// open a modal with the instructions to follow
///////////////////////////////////////////////////////////////////////////////////////////////
function generateInstructions(){
  let ss = SpreadsheetApp.getActiveSheet();
  let lastCol = ss.getLastColumn();
  let range = ss.getActiveRange();
  let numRows = range.getNumRows();
  let baseRow = range.getRowIndex()
  
  //add items to outVal - they will be used to generate the HTML
  for (let i = 1; i <= numRows; i++) {
    let currRow = baseRow + i - 1;
    let details ={}
    let colHeaders = ss.getRange(1, 1,1,lastCol).getValues()
    for (var d=0; d<lastCol; d++){
      let colName = colHeaders[0][d]
      details[colName] = ss.getRange(currRow, d+1).getValue()    
    }
       
    Logger.log(details)
    let actionsString = details.Actions
    let actions = actionsString.split(",")
    for(var a=0; a<actions.length; a++){
      generateCode(details,  actions[a]);        
    }
  }

  let outHTML = '<style>'+
                  '#codeWrapper{line-height:2em; font-size:14px}' + '\n' +
                  '.txt{color: #616161}' + '\n' +
                  '.sql span{color: #19A77C}' + '\n' +  
                    '.title{font-weight: 700; #616161; border-bottom: 1px solid #2C88B6; margin-top:6px;}' + '\n' +   
                  '.warning{color: #CB4347}' + '\n' +  
                  '#codeWrapper a{color: #2C88B6}' + '\n' +
                  'body code[class*=language-], body pre[class*=language-]{white-space:normal;}' + '\n' +
                  '.inlineCode {background: #f5f2f0; padding: 0.2em;}'   + '\n' +
                  'body pre[class*=language-] { padding: .5em; margin: 1px 0;}' +
                '</style>';
  outHTML += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.19.0/themes/prism.min.css" integrity="sha256-cuvic28gVvjQIo3Q4hnRpQSNB0aMw3C+kjkR0i+hrWg=" crossorigin="anonymous" />';
  
  outHTML += '<div id="codeWrapper">';
  
  Logger.log("outVal.length: " + outVal.length)
  
  for(let i=0; i<outVal.length; i++){
    let rowItemClass = outVal[i][1];
    let rowItemText = outVal[i][0];
    
    if(rowItemClass === 'sql'){ 
      outHTML += '<pre><code class="language-sql">' + rowItemText + '</code></pre>'
    } else {
      //just print the text 
      outHTML += '<div class="' + rowItemClass + '">'+ rowItemText + '</div>'
    }
  }
  outHTML += '<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.19.0/components/prism-core.min.js" integrity="sha256-D05OTvzyl8h0SDpcQF6UNo3gl2rKDMmRuqX8ZZ06pNE=" crossorigin="anonymous"></script>';   
  outHTML += '<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.19.0/plugins/autoloader/prism-autoloader.min.js" integrity="sha256-WIuEtgHNTdrDT2obGtHYz/emxxAj04sJBdMhRjDXd8I=" crossorigin="anonymous"></script>'
  outHTML += '</div>'
  
  let htmlOutput = HtmlService.createHtmlOutput(outHTML).setWidth(1300).setHeight(outH);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Steps');
  
  
  
}





function generateCode(details, action) {
  
  //preprocess vars as necessary
  let gradDate = ''
  let firstPayDate = ''
  //let encodedEmail = encodeURI(details.Email)
  if(details.FundedAmount2>0){ Logger.log('has FundedAmount2'); details.FundedAmount = details.FundedAmount2 }
  if(details.Campus){ details.CampusId = extractId(details.Campus) }
  if(details.Course){ details.CourseId = extractId(details.Course) }  
  if(details.Cohort){ details.CohortId = extractId(details.Cohort) }  

  
  switch(action){
    
    case 'blockAccess':
      outVal.push(["UPDATE [User] SET Locked = 1 WHERE id = " + details.UserId ,"sql"]);
      outH += 30
      break;
    
    case 'blockAllAutomaticEmails':
      outVal.push(["UPDATE [User] SET DoNotSendEmail = 1 WHERE id = " + details.UserId ,"sql"]);
      outH += 30
      break;
    
    case 'changeCohort':
      
      outVal.push(["DECLARE @cohortId INT","sql"])
      outVal.push(["SET @cohortId = XXXXX","sql"])
      outVal.push(["UPDATE Appeal SET DppStudentCohortId = @cohortId WHERE UserId = " + details.UserId ,"sql"]);
      
      outVal.push(['Review the current Cohort, GraduationDate, CourseId, Funded Amount ("Amount"), Appeal ("Price"), and AccountStatus' , 'txt'])
      outVal.push(['SELECT a.DppStudentCohortId AS CohortId, s.CourseCompletionDate AS GraduationDate, c.courseId as CourseId,  d.Amount, a.Price, s.AccountStatus FROM Appeal AS a WITH (NOLOCK) LEFT JOIN Donation AS d WITH (NOLOCK) ON d.AppealId = a.id LEFT JOIN StudentAccountStatus AS s WITH (NOLOCK) ON s.UserId = a.UserId JOIN DppStudentCourseStartDate AS c WITH (NOLOCK) ON c.id = a.DppStudentCohortId WHERE a.UserId =  ' + details.UserId, 'sql']);
      
      outVal.push(['Review the new courseId and FundedAmount to see if it needs to be adjusted' , 'txt'])
      outVal.push(['SELECT h.id AS cohortId, c.id, c.MaxDeferredAmount AS DeferredAmount FROM DppStudentCourseStartDate AS h WITH (NOLOCK) JOIN Course AS c WITH (NOLOCK) ON c.id = h.CourseId WHERE h.id =  @cohortId', 'sql']);
            
      outVal.push(["If this cohort if for a different course, update it" , "txt"]);
      outVal.push(["UPDATE UserDetails SET Course = (SELECT name FROM Course WITH (NOLOCK) WHERE id IN IN (SELECT CourseId FROM DppStudentCohortId WITH (NOLOCK) WHERE id = @cohortId) ), CourseId IN (SELECT CourseId FROM DppStudentCohortId WITH (NOLOCK) WHERE id = @cohortId) WHERE UserId = " + details.UserId ,"sql"]);
      outVal.push(["Check if the graduation date needs to be updated, too" , "txt"]);
      outVal.push(["SELECT * FROM DppStudentCohortId WITH (NOLOCK) WHERE id = @cohortId" ,"sql"]);  
      outH += 200
      break;
    
    case 'changeCohort2':
      if (details.OrgInitial === 'A-N'){         		
        details.Cohort = details.ANCohort 
        details.FundedAmount = details.ANFundedAmount 
        details.SignAgain = details.ANSignAgain
      }
      
      if (details.OrgInitial === 'P-Z'){         		
        details.Cohort = details.PZCohort 
        details.FundedAmount = details.PZFundedAmount 
        details.SignAgain = details.PZSignAgain
      }
      
      if (!details.FundedAmount) {  
        details.FundedAmount = "'NO NEED'"
      }
      
      if (!details.SignAgain) {  
        details.SignAgain = "'NO NEED'"
      }
      
      //get the relevant ids
      let idStringArray = extractId(details.Cohort).split('-');
      let orgId = idStringArray[3];
      let campusId = idStringArray[2].trim()
      let courseId = idStringArray[1]
      let cohortId = idStringArray[0]
      
      
      outVal.push(['Review the current Cohort, GraduationDate, CourseId, Funded Amount ("Amount"), Appeal ("Price"), and AccountStatus' , 'txt'])
      outVal.push(['SELECT a.DppStudentCohortId AS CohortId, s.CourseCompletionDate AS GraduationDate, c.courseId as CourseId,  d.Amount, a.Price, s.AccountStatus FROM Appeal AS a WITH (NOLOCK) LEFT JOIN Donation AS d WITH (NOLOCK) ON d.AppealId = a.id LEFT JOIN StudentAccountStatus AS s WITH (NOLOCK) ON s.UserId = a.UserId JOIN DppStudentCourseStartDate AS c WITH (NOLOCK) ON c.id = a.DppStudentCohortId WHERE a.UserId =  ' + details.UserId, 'sql']);
      
      outVal.push(["DECLARE @uid INT","sql"]);
      outVal.push(["SET @uid = " + details.UserId,"sql"]);
      outVal.push(["DECLARE @cohortId INT","sql"])
      outVal.push(["SET @cohortId = " + cohortId ,"sql"])
      outVal.push(["DECLARE @gDate DATETIME","sql"]);
      outVal.push(["SET @gDate = (SELECT GraduationDate FROM DppStudentCourseStartDate WHERE id = @cohortId)","sql"]);
      outVal.push(["DECLARE @startDate DATETIME","sql"]);
      outVal.push(["SET @startDate = (SELECT CohortDate FROM DppStudentCourseStartDate WHERE id = @cohortId)","sql"]);
      outVal.push(["DECLARE @pTermId INT","sql"]);
      outVal.push(["SET @pTermId = ( SELECT PaymentTermId FROM Course WITH (NOLOCK) WHERE id IN ( SELECT CourseId FROM DppStudentCourseStartDate WITH (NOLOCK) WHERE id = @cohortId ) )","sql"]);
      outVal.push(["DECLARE @fPaymentDate DATETIME","sql"]);
      outVal.push(["DECLARE @gracep INT","sql"]);
      outVal.push(["SET @gracep = (SELECT GracePeriod FROM COURSE WHERE id = (SELECT CourseId FROM DppStudentCourseStartDate WHERE id = @cohortId ) )","sql"]);
      outVal.push(["IF @gracep IS NULL","sql"]);
      outVal.push(["BEGIN","sql"]);
      outVal.push(["SET @gracep = 0","sql"]);
      outVal.push(["END","sql"]);

      outVal.push(["--Update the cohort, course, graduation date and remove past signature requests" , "txt"]);      
      outVal.push(["UPDATE Appeal SET DppStudentCohortId = @cohortId WHERE UserId = @uid" ,"sql"]);
      outVal.push(["UPDATE UserDetails SET Course = (SELECT name FROM Course WITH (NOLOCK) WHERE id = " + courseId + "), CourseId = " + courseId + " WHERE UserId = @uid" ,"sql"]);
      if (campusId !== '\\N'){ outVal.push(["UPDATE Organization_Student_Mapping SET CampusId = " + campusId + " WHERE StudentId = @uid" ,"sql"]); }
      outVal.push(["DELETE FROM DocumentSignRequest WHERE StatusCode = 'awaiting_signature' AND UserId = @uid" ,"sql"]);
      outVal.push(["DELETE FROM PreContractAgreementRecord WHERE userid = @uid" ,"sql"]);

      outVal.push(["--Update StudentAccountStatus with the correct dates" , "txt"]);     
      outVal.push(["IF ( (SELECT COUNT(id) FROM StudentAccountStatus WHERE UserId = @uid) = 1 )","sql"]);
      outVal.push(["BEGIN","sql"]);
      outVal.push(["IF ( (SELECT FirstRepaymentDate FROM StudentAccountStatus WHERE UserId = @uid) IS NOT NULL  )","sql"]);
      outVal.push(["BEGIN","sql"]);
      outVal.push(["IF (","sql"]);
      outVal.push(["SELECT","sql"]);
      outVal.push(["CASE PaymentType","sql"]);
      outVal.push(["WHEN 'DIPP' THEN 1","sql"]);
      outVal.push(["WHEN 'DPP' THEN 1","sql"]);
      outVal.push(["ELSE 0","sql"]);
      outVal.push(["END","sql"]);
      outVal.push(["FROM PaymentTerm WHERE id = @pTermId","sql"]);
      outVal.push([") = 1","sql"]);
      outVal.push(["BEGIN","sql"]);
      outVal.push(["SET @fPaymentDate =  ( SELECT CAST(YEAR(@gDate) AS VARCHAR(4) ) + '-' + CAST( MONTH(@gDate)+1+@gracep AS VARCHAR(2) ) + '-01 00:00:00:000' )","sql"]);
      outVal.push(["UPDATE StudentAccountStatus SET CourseCompletionDate = @startDate, CohortGraduationDate = @gDate, FirstRepaymentDate = @fPaymentDate, PaymentTermId = @pTermId  WHERE UserId = @uid","sql"]);
      outVal.push(["SELECT CONCAT('StudentAccountStatus dates updated for DPP/DIPP user ', id, @fPaymentDate) FROM [User] WHERE id = @uid","sql"]);
      outVal.push(["END","sql"]);
      outVal.push(["ELSE","sql"]);
      outVal.push(["BEGIN","sql"]);
      outVal.push(["SET @fPaymentDate =  ( SELECT CAST(YEAR(@startDate) AS VARCHAR(4) ) + '-' + CAST( MONTH(@startDate)+1+@gracep AS VARCHAR(2) ) + '-01 00:00:00:000' )","sql"]);
      outVal.push(["UPDATE StudentAccountStatus SET CourseCompletionDate = @startDate, CohortGraduationDate = @gdate, FirstRepaymentDate = @fPaymentDate, PaymentTermId = @pTermId  WHERE UserId = @uid","sql"]);
      outVal.push(["SELECT CONCAT('StudentAccountStatus dates updated for IPP user ', id, @fPaymentDate) FROM [User] WHERE id = @uid","sql"]);
      outVal.push(["END","sql"]);
      outVal.push(["END","sql"]);
      outVal.push(["ELSE","sql"]);
      outVal.push(["SELECT CONCAT('Dates not updated as there is no firstRepaymentDate for user ', id) FROM [User] WHERE id = @uid","sql"]);
      outVal.push(["END","sql"]);
      outVal.push(["ELSE","sql"]);
      outVal.push(["BEGIN","sql"]);
      outVal.push(["SELECT CONCAT('Dates not updated as count(StudentAccountStatus.id) = ', count(id) ) FROM StudentAccountStatus WHERE UserId = @uid","sql"]);
      outVal.push(["END","sql"]);
      outVal.push(["SELECT 'Done'" ,"sql"]);  
      outH += 300
      break;  
      
    case 'changeCourse':
      outVal.push(["Review current courseId, Funded Amount (Amount), Appeal (Price), and AccountStatus" , "txt"])
      outVal.push(["SELECT a.DppStudentCohortId AS CohortId, c.CohortDate AS StartDate, c.courseId as CourseId, a.Price, d.Amount, s.AccountStatus FROM Appeal AS a WITH (NOLOCK) LEFT JOIN Donation AS d WITH (NOLOCK) ON d.AppealId = a.id LEFT JOIN StudentAccountStatus AS s WITH (NOLOCK) ON s.UserId = a.UserId JOIN DppStudentCourseStartDate AS c WITH (NOLOCK) ON c.id = a.DppStudentCohortId WHERE a.UserId =  " + details.UserId, "sql"]);
      outVal.push(["Review new course to see if the amount has changed" , "txt"])
      outVal.push(["SELECT * FROM Course WITH (NOLOCK) WHERE id = " + details.CourseId, "sql"])
      outVal.push(["--Find out the Id of the new Cohort" , "txt"])
      outVal.push(["SELECT * FROM DppStudentCourseStartDate WITH (NOLOCK) WHERE CourseId = " + details.CourseId, "sql"])
      outVal.push(["Update Course and Cohort (MANUALLY SET THE VALUE FOR THE LATTER)" , "txt"]) 
      outVal.push(["DECLARE @cohortId INT","sql"])
      outVal.push(["SET @cohortId = XXXXX","sql"])
      outVal.push(["UPDATE UserDetails SET Course = (SELECT name FROM Course WITH (NOLOCK) WHERE id = " + details.CourseId + "), CourseId = " + details.CourseId + " WHERE UserId = " + details.UserId ,"sql"]);
      outVal.push(["UPDATE Appeal SET DppStudentCohortId = @cohortId  WHERE UserId = " + details.UserId ,"sql"]);
      outVal.push(["If necessary, update the fundedAmount now" , "txt"])
      outH += 200
      break;
    
    case 'changeEmailToUnusableOne':
      var todayDate = new Date()
      var prependToEmail = 'DONOTSEND_' + todayDate.toLocaleDateString().replace(/\//g, '-') + '_';
      outVal.push(["UPDATE [User] SET [email] = CONCAT(" + prependToEmail + ",email) where [Id] = " + details.UserId,"sql"]);
      outH += 30
      break;

    case 'changeFirstPaymentDate':
      firstPayDate = prepareDate(details.FirstRepaymentDate)
      outVal.push(["SELECT s.CourseCompletionDate FROM StudentAccountStatus AS s WITH (NOLOCK) WHERE UserId = " + details.UserId ,"sql"]);     
      outVal.push(["Run the query above and make sure that the new FirstRepaymentDate is greater than the CourseCompletionDate (which is actually the course start date)" , "txt"]);
      outVal.push(["UPDATE StudentAccountStatus SET FirstRepaymentDate = '" + firstPayDate + "' WHERE UserId = " + details.UserId ,"sql"]);
      outH += 60
      break;   
      
    case 'changeOrganization':
      if(details.NewOrg) {
        if (details.NewOrg.charAt(0).match(/[p-z]/i)){         		
          details.Cohort = details.PZCohort 
          details.FundedAmount = details.PZFundedAmount 
          details.SignAgain = details.PZSignAgain
        } else {
          details.Cohort = details.PZCohort 
          details.FundedAmount = details.PZFundedAmount 
          details.SignAgain = details.PZSignAgain
        }
      }
      let idStringArrayOrg = extractId(details.Cohort).split('-');
      let orgIdOrg = idStringArrayOrg[3];
      let campusIdOrg = idStringArrayOrg[2]
      let courseIdOrg = idStringArrayOrg[1]
      let cohortIdOrg = idStringArrayOrg[0]
      let funAmount = extractFundedAmount(details.Cohort)
      outVal.push(["DECLARE @userId INT","sql"]);
      outVal.push(["SET @userId =" + details.UserId,"sql"]);
      outVal.push(["DECLARE @neworgId INT","sql"]);
      outVal.push(["SET @neworgId =" + orgIdOrg,"sql"]);
      outVal.push(["DECLARE @newcampusId INT","sql"]);
      outVal.push(["SET @newcampusId =" + campusIdOrg,"sql"]);
      outVal.push(["DECLARE @newcourseId INT","sql"]);
      outVal.push(["SET @newcourseId =" + courseIdOrg,"sql"]);
      outVal.push(["DECLARE @newcohortId INT","sql"]);
      outVal.push(["SET @newcohortId =" + cohortIdOrg,"sql"]);
      outVal.push(["DECLARE @fundedAmount INT","sql"]);
      outVal.push(["SET @fundedAmount =" + funAmount,"sql"]);
      outVal.push(["UPDATE UserDetails SET Course = (SELECT name FROM Course WITH (NOLOCK) WHERE id = @newcourseId), CourseId = @newcourseId, SignupStatus = 100, UniversityId = ( SELECT id FROM University WITH (NOLOCK) WHERE OrganizationId = @neworgId )  WHERE UserId = @userId","sql"]);
      outVal.push(["UPDATE UserSetting SET Value = ( SELECT name from Organization WITH (NOLOCK) WHERE id = @neworgId ) WHERE userid = @userId and SettingName in ('UniversityName','DppOrganizationName')","sql"]);
      outVal.push(["UPDATE appeal SET Published = 0, PublishedDate = null, price = @fundedAmount, DppStudentCohortId = @newcohortId, name = ( SELECT name from Organization WITH (NOLOCK) WHERE id = @neworgId ) WHERE userid =@userId","sql"]);
      outVal.push(["UPDATE Organization_Student_Mapping SET OrganizationId = @neworgId, OriginationDate = null, CampusId = @newcampusId WHERE StudentId = @userId","sql"]);
      outVal.push(["UPDATE Deposit SET OrganizationId  = @neworgId WHERE UserId = @userId","sql"]);
      outVal.push(["UPDATE StudentAccount SET StartAmount = @fundedAmount WHERE AppealId IN ( SELECT id FROM Appeal WITH (NOLOCK) WHERE UserId = @userId )","sql"]);
      outVal.push(["DELETE FROM PreContractAgreementRecord WHERE userid = " + details.UserId,"sql"]);
      outVal.push(["DELETE FROM DocumentSignRequest WHERE userid = @userId","sql"]);
      outVal.push(["DELETE FROM Donation_Organization_Mapping WHERE DonationId = (SELECT id FROM Donation WITH (NOLOCK) WHERE appealid = (SELECT id FROM appeal WITH (NOLOCK) WHERE userid = @userId ))","sql"]);
      outVal.push(["DELETE FROM Donation WHERE appealid = ( SELECT id FROM appeal WITH (NOLOCK) WHERE userid =@userId )","sql"]);
      outVal.push(["DELETE FROM StudentRepaymentSplit WHERE StudentRepaymentId IN (SELECT id FROM StudentRepayment WITH (NOLOCK) WHERE StudentAccountStatusId IN (SELECT id FROM StudentAccountStatus WITH (NOLOCK) WHERE userid = @userid))","sql"]);
      outVal.push(["DELETE FROM StudentRepayment WHERE StudentAccountStatusId IN (SELECT id FROM StudentAccountStatus WITH (NOLOCK) WHERE userid = @userid)","sql"]);
      outVal.push(["DELETE FROM payment WHERE FromUserId = @userid","sql"]);
      outVal.push(["DELETE FROM StudentAccount WHERE StudentAccountStatusId = (SELECT id FROM StudentAccountStatus WITH (NOLOCK) WHERE userid = @userid)","sql"]);
      outVal.push(["DELETE FROM StudentAccountSTatus WHERE UserId = @userId","sql"]);
      outVal.push(["If Trilogy US, run the following (otherwise set the correct Type","txt"]);
      outVal.push(["DELETE FROM PDFArchive WHERE Userid =@userId AND Type = 'User.TrilogyAgreement'","sql"]);
      outVal.push(["SELECT 'changeOrganization - Done'" ,"sql"]); 
      outH += 600
      break;
      
    case 'checkUserSignupCohortAndContract':
      outVal.push(["SELECT a.userid, d.CourseId, a.DppStudentCohortId AS 'CohortId', e.SignupStatus, r.id as 'DocumentSignRequestId' FROM Appeal AS a WITH (NOLOCK) JOIN DppStudentCourseStartDate AS d WITH (NOLOCK) ON d.id = a.DppStudentCohortId " 
                   + "JOIN userDetails AS e WITH (NOLOCK) ON e.UserId = a.UserId JOIN DocumentSignRequest as r WITH (NOLOCK) ON r.userid = a.UserId WHERE a.UserId = " + details.UserId,"sql"]);
      outH += 60
      break;
    
    case 'askStudentToSignContractAgainNoCheck':  
    case 'askStudentToSignContractAgain':      
      if (details.SignAgain === "Yes" || details.ANSignAgain === "Yes" || details.PZSignAgain === "Yes" || action === 'askStudentToSignContractAgainNoCheck') {  
        outVal.push(["Reset contract" , "title"]);
        outVal.push(["IF (SELECT u.SignupStatus FROM userDetails AS u WITH (NOLOCK) WHERE u.UserId = " + details.UserId + ") = 110","sql"]); 
        outVal.push(["BEGIN","sql"]); 
        outVal.push(["DELETE FROM PreContractAgreementRecord WHERE userid = " + details.UserId,"sql"]);
        outVal.push(["DELETE FROM DocumentSignRequest WHERE userid = " + details.UserId ,"sql"]);     
        outVal.push(["UPDATE appeal SET Published = 0, PublishedDate = null WHERE userid =" + details.UserId ,"sql"]);  
        outVal.push(["DELETE FROM Donation_Organization_Mapping WHERE DonationId = (SELECT id FROM Donation WITH (NOLOCK) WHERE appealid = (SELECT id FROM appeal WITH (NOLOCK) WHERE userid = " + details.UserId + " ))" ,"sql"]);     
        outVal.push(["DELETE FROM Donation WHERE appealid = (SELECT id FROM appeal WITH (NOLOCK) WHERE userid =" + details.UserId + ")","sql"]);     
        outVal.push(["UPDATE Organization_Student_Mapping SET OriginationDate = null WHERE studentid = " + details.UserId ,"sql"]);   
        outVal.push(["UPDATE UserDetails SET SignupStatus = 100 WHERE userid = " + details.UserId ,"sql"]); 
        outVal.push(["--Remove the reference to the pdf file" , "txt"]);
        outVal.push(["DELETE FROM PDFArchive WHERE type = (SELECT ContractTemplateName FROM Course WHERE id = ( SELECT CourseId FROM UserDetails WHERE UserId = " + details.UserId + " ) ) AND UserId = " + details.UserId, "sql"]);
        outVal.push(["SELECT 'askStudentToSignContractAgain - Done'" ,"sql"]); 
        outVal.push(["END","sql"]); 
        outVal.push(["ELSE","sql"]); 
        outVal.push(["SELECT CONCAT('Cannot ask to Sign Contract Again - SignupStatus: ', u.SignupStatus) FROM userDetails AS u WITH (NOLOCK) WHERE u.UserId = " + details.UserId ,"sql"]); 
        outH += 240
      } else {
        outVal.push(["No need to sign again" , "txt"]);
      }
      break;    
    
    case 'askStudentToPayDepositAgain':  
      outVal.push(["SELECT * FROM StripePaymentIntent WITH (NOLOCK) WHERE userid =" + details.UserId ,"sql"]); 
      
      outVal.push(["SELECT * FROM Deposit WITH (NOLOCK) WHERE userid =" + details.UserId ,"sql"]); 
      outVal.push(["DELETE FROM Deposit WHERE userid =" + details.UserId ,"sql"]); 
      outVal.push(["DELETE FROM stripepaymentintent WHERE userid =" + details.UserId ,"sql"]); 
      
      outVal.push(["SELECT * FROM appeal WITH (NOLOCK) WHERE userid =" + details.UserId ,"sql"]); 
      outVal.push(["DELETE appeal SET Published = 0, PublishedDate = null WHERE userid =" + details.UserId ,"sql"]); 
      
      outVal.push(["SELECT * FROM Donation WITH (NOLOCK) WHERE appealid = (SELECT id FROM appeal WITH (NOLOCK) WHERE userid =" + details.UserId + ")","sql"]); 
      outVal.push(["DELETE   FROM Donation WHERE appealid = (SELECT id FROM appeal WITH (NOLOCK) WHERE userid =" + details.UserId + ")" ,"sql"]); 
      outVal.push(["DELETE FROM Donation_Organization_Mapping WHERE DonationId = (SELECT id FROM Donation WITH (NOLOCK) WHERE appealid = (SELECT id FROM appeal WITH (NOLOCK) WHERE userid =" + details.UserId + ") )","sql"]); 
      
      outVal.push(["SELECT * FROM Organization_Student_Mapping_Audit WITH (NOLOCK) WHERE studentid =" + details.UserId ,"sql"]); 
      outVal.push(["DELETE Organization_Student_Mapping SET OriginationDate = null WHERE studentid =" + details.UserId ,"sql"]); 
      
      outVal.push(["SELECT * FROM UserDetails WITH (NOLOCK) WHERE userid = " + details.UserId ,"sql"]); 
      outVal.push(["DELETE UserDetails SET SignupStatus = 100 WHERE userid = " + details.UserId ,"sql"]); 
      outVal.push(["SELECT 'askStudentToPayDepositAgain - Done'" ,"sql"]); 
      outH += 180
      break;
    
    case 'changeFundedAmountTo0':  
    case 'changeFundedAmount':
      if (action === 'changeFundedAmountTo0'){ details.FundedAmount = '0'  }
      
      if(details.FundedAmount != "'NO NEED'"){
        outVal.push(["Change Funded Amount" , "title"]);
        outVal.push(['Review current Appeal ("Price"), Funded Amount, AccountStatus, past payments, and if the course has inflation' , 'txt'])
        outVal.push(["SELECT a.Price, d.Amount as FundedAmount, s.AccountStatus," + 
                     "(SELECT CAST(p.Amount as varchar(8000))+' - ' FROM Payment AS p WHERE  p.FromUserId = s.UserId FOR xml PATH ('') ) AS PastPayments, "+ 
                     "(SELECT HasInflationCharges FROM PaymentTerm WITH (NOLOCK) WHERE id = (SELECT PaymentTermId FROM Course WITH (NOLOCK) WHERE id IN ( SELECT CourseId FROM userDetails WITH (NOLOCK) WHERE UserId = a.UserId))) AS HasInflation " + 
                     "FROM Appeal AS a WITH (NOLOCK) LEFT JOIN Donation AS d WITH (NOLOCK) ON d.AppealId = a.id LEFT JOIN StudentAccountStatus AS s WITH (NOLOCK) ON s.UserId = a.UserId WHERE a.UserId =  " + details.UserId, "sql"]);
        outVal.push(['--See details as needed:' , 'txt'])
        outVal.push(['SELECT id FROM Appeal WITH (NOLOCK) WHERE UserId = ' + details.UserId, 'sql']);      
        outVal.push(['SELECT * FROM StudentAccount WITH (NOLOCK) WHERE AppealId = ( SELECT id FROM Appeal WITH (NOLOCK) WHERE UserId = ' + details.UserId + ' ) ORDER BY [Month] ASC' , 'sql']);      
        outVal.push(["SELECT * FROM Payment WITH (NOLOCK) WHERE FromUserId = " + details.UserId,"sql"]);
        outVal.push(['SELECT id, PaymentType, HasInflationCharges FROM PaymentTerm WITH (NOLOCK) WHERE id = ( SELECT PaymentTermId FROM Course WITH (NOLOCK) WHERE id IN ( SELECT CourseId FROM userDetails WITH (NOLOCK) WHERE UserId = ' + details.UserId + ' ) ) ' , 'sql']);
        
        outVal.push(['If the student does not have a StudentAccountStatus, or has no completed payments, or the student\'s course has no inflation, update:' , 'txt'])
        outVal.push(["DELETE FROM DocumentSignRequest WHERE StatusCode = 'awaiting_signature' AND UserId = " + details.UserId,"sql"]);
        outVal.push(["DECLARE @fundedAmount INT","sql"]);
        outVal.push(["SET @fundedAmount = " + details.FundedAmount,"sql"]);     
        outVal.push(["DECLARE @maxAmount INT","sql"]);
        outVal.push(["SET @maxAmount = (SELECT MaxDeferredAmount FROM Course WHERE ID = (SELECT CourseId FROM USerDetails WHERE UserId =" + details.UserId + "))","sql"]);
        outVal.push(["IF @fundedAmount <= @maxAmount ","sql"]);
        outVal.push(["BEGIN","sql"]);
        outVal.push(['UPDATE Donation SET Amount = @fundedAmount WHERE AppealId = ( SELECT id FROM Appeal WITH (NOLOCK) WHERE UserId = ' + details.UserId + ' )' , 'sql']);
        outVal.push(['UPDATE Appeal SET Price = @fundedAmount WHERE UserId = ' + details.UserId, 'sql']);
        outVal.push(['UPDATE StudentAccount SET StartAmount = @fundedAmount WHERE AppealId IN ( SELECT id FROM Appeal WITH (NOLOCK) WHERE UserId = ' + details.UserId + ' )' , 'sql']);  
        outVal.push(["DELETE FROM PreContractAgreementRecord WHERE userid = " + details.UserId,"sql"]);
        outVal.push(["SELECT CONCAT('The fundedAmount has been updated for userId ', id) FROM [user] WHERE id =" + details.UserId,"sql"]);
        outVal.push(["END","sql"]);
        outVal.push(["ELSE","sql"]);
        outVal.push(["SELECT CONCAT('The requested fundedAmount is higher than the MaxDeferredAmount of ', @maxAmount) FROM [user] WHERE id =" + details.UserId,"sql"]);
        outVal.push(['IMPORTANT: if the student has a StudentAccountStatus row, <a target=\"_blank\" href="https://edaid.com/admin/repayments/student/'+ details.UserId + '">regenerate the payment forecast table</a>' , 'txt'])
        outVal.push(["If the student has no payments, and the student's course has inflation delete the StudentAccountStatus (it will be created once again when we run payments, with the correct inflation values)" , "txt"])
        outVal.push(["DELETE FROM StudentAccount WHERE StudentAccountStatusId = (SELECT Id FROM StudentAccountStatus WITH (NOLOCK) WHERE userid = " + details.UserId + ")","sql"]);
        outVal.push(["DELETE FROM StudentAccountStatus WHERE userid = " + details.UserId , "sql"]);        
        outVal.push(["If the student has already paid something.... check what to do. Do we set the funded amount to 'Outstanding amount + how much they have repaid'? modify the funded amount and requested funded amount to leave the correct amount outstanding balance" , "txt"])
       // outVal.push(["Check if the student already has a contract to sign, and remove it or the data will stay the same" , "txt"])
       // outVal.push(["SELECT * FROM DocumentSignRequest WITH (NOLOCK) WHERE userid = " + details.UserId , "sql"]);
       // outVal.push(["DELETE FROM DocumentSignRequest WHERE userid = " + details.UserId , "sql"]);
       // outVal.push(["SELECT 'changeFundedAmount - Done'" ,"sql"]); 
        outH += 450
      }
      break;   
      
    case 'changeGraduationDate':
      gradDate = prepareDate(details.GradDate)
      outVal.push(["UPDATE StudentAccountStatus SET CohortGraduationDate = '" + gradDate + "' WHERE UserId = " + details.UserId ,"sql"]);
      outH += 30
      break;    
    
    case 'changeGraduationDateToNull':
      outVal.push(["UPDATE StudentAccountStatus SET CohortGraduationDate = null WHERE UserId = " + details.UserId ,"sql"]);
      outH += 30
      break;  
      
    case 'changeGraduationAndRepaymentDate':
      gradDate = prepareDate(details.GradDate)
      firstPayDate = prepareDate(details.FirstRepaymentDate)
      outVal.push(["SELECT s.CourseCompletionDate FROM StudentAccountStatus AS s WITH (NOLOCK) WHERE UserId = " + details.UserId ,"sql"]);     
      outVal.push(["Run the query above and make sure that the new FirstRepaymentDate is greater than the CourseCompletionDate (which is actually the course start date)" , "txt"]);
      outVal.push(["UPDATE StudentAccountStatus SET CohortGraduationDate = '" + gradDate + "', FirstRepaymentDate = '" + firstPayDate + "' WHERE UserId = " + details.UserId ,"sql"]);
      outH += 60
      break;  
    
    case 'changeOutstandingBalance':
      outVal.push(['Quick and dirty way of doing this - stay away in most cases!' , 'warning'])
      outVal.push(['Review current balance' , 'txt'])
      outVal.push(["SELECT * FROM StudentAccountStatus WITH (NOLOCK) WHERE userid =" + details.UserId,"sql"]);
      outVal.push(["SELECT * FROM Payment WITH (NOLOCK) WHERE FromUserId = " + details.UserId,"sql"]);
      outVal.push(['SELECT * FROM StudentAccount WITH (NOLOCK) WHERE AppealId = ( SELECT id FROM Appeal WITH (NOLOCK) WHERE UserId = ' + details.UserId + ' ) ORDER BY [Month] DESC' , 'sql']);
      outVal.push(['Update balance' , 'txt']);
      outVal.push(['UPDATE StudentAccount SET StartAmount = ' + details.FundedAmount + ' WHERE id = ( SELECT TOP 1 id FROM StudentAccount WITH (NOLOCK) WHERE AppealId = ( ' +
                   'SELECT id FROM Appeal WITH (NOLOCK) WHERE UserId = ' + details.UserId + ' ) ORDER BY [Month] DESC )' , 'sql']);
      outH += 120
      break; 
    
    case 'changePaymentAmount':
      outVal.push(['--First: review and set the correct repayment date!' , 'warning'])
      outVal.push(["DECLARE @repaymentDate Date","sql"]);
      var currentDate = new Date();
      var twoDigitMonth=((currentDate.getMonth()+1)>=10)? (currentDate.getMonth()+1) : '0' + (currentDate.getMonth()+1);  
      outVal.push(["SET @repaymentDate = '2020-" + twoDigitMonth + "-01'","sql"]);
      outVal.push(["SELECT * FROM Payment WITH (NOLOCK) WHERE FROMUserId = " + details.UserId + " AND InstructionDateTime = @repaymentDate","sql"]);
      outVal.push(["SELECT * FROM StudentRepayment WITH (NOLOCK) WHERE StudentAccountStatusId = (SELECT id FROM StudentAccountStatus AS s WITH (NOLOCK) WHERE s.Userid = " + details.UserId + ") AND RepaymentDate = @repaymentDate","sql"]);
      outVal.push(['--Check that we have only one supporter' , 'text'])
      outVal.push(["SELECT * FROM StudentRepaymentSplit WITH (NOLOCK) WHERE StudentRepaymentId = (SELECT ID FROM StudentRepayment WITH (NOLOCK) WHERE StudentAccountStatusId = (SELECT id FROM StudentAccountStatus AS s WITH (NOLOCK) WHERE s.Userid = " + details.UserId + ") AND RepaymentDate = @repaymentDate)" , 'sql']);
      outVal.push(['Now update amount in all 3 tables' , 'txt']);
      outVal.push(["UPDATE Payment SET Amount = " + details.PaymentAmount + " WHERE FROMUserId = " + details.UserId + " AND InstructionDateTime = @repaymentDate","sql"]);
      outVal.push(["UPDATE StudentRepayment SET Amount = " + details.PaymentAmount + " WHERE StudentAccountStatusId = (SELECT id FROM StudentAccountStatus AS s WITH (NOLOCK) WHERE s.Userid = " + details.UserId + ") AND RepaymentDate = @repaymentDate","sql"]);
      outVal.push(["UPDATE StudentRepaymentSplit SET AmountAllocated = " + details.PaymentAmount + " WHERE StudentRepaymentId = (SELECT ID FROM StudentRepayment WITH (NOLOCK) WHERE StudentAccountStatusId = (SELECT id FROM StudentAccountStatus AS s WITH (NOLOCK) WHERE s.Userid = " + details.UserId + ") AND RepaymentDate = @repaymentDate)" , "sql"]);
      outVal.push(["SELECT 'changePaymentAmount - Done'" ,"sql"]); 
      outH += 240
      break; 
      
    case 'changeRequestedFundedAmount':
      outVal.push(['Review current Requested Funded Amount (column "Price")' , 'txt'])
      outVal.push(['SELECT * FROM Appeal WITH (NOLOCK) WHERE UserId = ' + details.UserId + ' )' , 'sql']);
      outVal.push(['Review payments - if the student is paying STOP' , 'txt'])
      outVal.push(["SELECT * FROM Payment WITH (NOLOCK) WHERE FromUserId = " + details.UserId,"sql"]);
      outVal.push(['SELECT * FROM StudentAccount WITH (NOLOCK) WHERE AppealId = ( SELECT id FROM Appeal WITH (NOLOCK) WHERE UserId = ' + details.UserId + ' ) ORDER BY [Month] DESC' , 'sql']);
      outVal.push(['Update Requested Funded Amount' , 'txt']);
      outVal.push(['UPDATE Appeal SET Price = ' + details.FundedAmount + ' WHERE UserId = ' + details.UserId, 'sql']);
      outH += 120
      break; 
      
      
    case 'checkAllCourseAndCohortsForSameOrg':
      outVal.push(["SELECT d.Id AS CohortTrueId, d.Title, d.Type, d.isActive, d.CohortDate AS CohortStart, d.GraduationDate, c.Name AS CourseName, c.MaxDeferredAmount, c.CourseCost, c.GracePeriod " +
                   "FROM DppStudentCourseStartDate AS d WITH (NOLOCK) JOIN Course AS c WITH (NOLOCK) ON d.CourseId = c.id WHERE CourseId IN ( " +
                   "SELECT id FROM Course WHERE OrganizationId IN ( SELECT OrganizationId FROM Organization_Student_Mapping WITH (NOLOCK) WHERE StudentId =" + details.UserId + " ) )", "sql"]);
      outH += 60
      break;   
    
    case 'checkCohortCurrent':
      outVal.push(["SELECT d.Id AS CohortTrueId, d.Title, d.Type, d.isActive, d.CohortDate AS CohortStart, d.GraduationDate, c.Name AS CourseName, c.MaxDeferredAmount, c.CourseCost, c.GracePeriod " +
                   "FROM DppStudentCourseStartDate AS d WITH (NOLOCK) JOIN Course AS c WITH (NOLOCK) ON d.CourseId = c.id WHERE d.Id IN ( SELECT a.DppStudentCohortId FROM Appeal AS a WITH (NOLOCK) WHERE a.UserId = " + details.UserId + " )", "sql"]);
      outH += 60
      break; 
      
    case 'checkCohortsInSameCourse':
      outVal.push(["SELECT d.Id AS CohortTrueId, d.Title, d.Type, d.isActive, d.CohortDate AS CohortStart, d.GraduationDate, c.Name AS CourseName, c.MaxDeferredAmount, c.CourseCost, c.GracePeriod " +
                   "FROM DppStudentCourseStartDate AS d WITH (NOLOCK) JOIN Course AS c WITH (NOLOCK) ON d.CourseId = c.id WHERE CourseId IN ( " +
                   "SELECT CourseId FROM DppStudentCourseStartDate WITH (NOLOCK) WHERE id IN ( SELECT a.DppStudentCohortId FROM Appeal AS a WITH (NOLOCK) WHERE a.UserId = " + details.UserId + " ) )", "sql"]);
      outH += 60
      break;   
      
    case 'checkLogsForUser':
      outVal.push(["SELECT * FROM log WITH (NOLOCK) WHERE UserId = " + details.UserId,"sql"]);
      outH += 30
      break;
    
     case 'checkPaymentsAndBalance':   
      outVal.push(["SELECT * FROM StudentAccount WITH (NOLOCK) WHERE AppealId IN ( SELECT id FROM Appeal WITH (NOLOCK) WHERE UserId = " + details.UserId + ") ORDER BY [Month] DESC", "sql"]);
      outH += 30
      break;  
      
    case 'checkPlaidProviderLogs':   
      outVal.push(["SELECT * FROM PlaidProvider WITH (NOLOCK) WHERE UserId = " + details.UserId , "sql"]);
      outVal.push(['Go to the <a target="_blank" href="https://support.plaid.com/hc/en-us/articles/360012859833-Handling-Plaid-Errors">Plaid Errors</a> page to see the recomemnded action based on an error value' , 'txt']); 
      outVal.push(['For <code class="inlineCode">NO_AUTH_ACCOUNTS</code> tell the end user to connect using a different account' , 'txt']);       
      outH += 30
      break;
        
    case 'checkOpenBankingConnection':
      outVal.push(["SELECT top 100 * FROM OpenBankingProviderCallback WITH (NOLOCK) WHERE UserId = " + details.UserId + " ORDER BY id DESC","sql"]);
      outVal.push(["SELECT * FROM OpenBankingProvider WITH (NOLOCK) WHERE UserId = " + details.UserId,"sql"]);
      outVal.push(['If the above does not give enough info, check the logs' , 'txt']);
      outH += 60
      break;
      
    case 'checkStudentAccount':
      outVal.push(["SELECT * FROM Payment WITH (NOLOCK) WHERE FromUserId = " + details.UserId,"sql"]);
      outVal.push(["SELECT * FROM StudentAccount WITH (NOLOCK) WHERE AppealId = ( SELECT id FROM Appeal WITH (NOLOCK) WHERE UserId = " + details.UserId + " ) ORDER BY [Month] DESC","sql"]);
      outH += 30
      break;
   
    case 'checkStudentAccountStatus':
      outVal.push(["SELECT * FROM StudentAccountStatus WITH (NOLOCK) WHERE UserId = " + details.UserId,"sql"]);
      outH += 30
      break;  
    
    case 'deleteKYCAndSensitiveData':
      outVal.push(["UPDATE UserDetails SET AvatarPictureId = NULL, NationalInsuranceNumber = NULL WHERE UserId =  " + details.UserId,"sql"]);
      outVal.push(["DELETE FROM KycDocument WHERE UserId =  " + details.UserId,"sql"]);
      outH += 45
      break;
    
    case 'deleteOpenBankingTransactions': 
      outVal.push(["DELETE FROM PlaidTransaction WHERE plaidaccountid IN (SELECT id FROM plaidaccount WITH (NOLOCK) WHERE plaidproviderid IN (SELECT id FROM PlaidProvider WITH (NOLOCK) WHERE userid =  " + details.UserId + " ))","sql"]);
      outH += 30
      break;  
      
    case 'deleteUser':
      outVal.push(["DECLARE @userid INT","sql"]);
      outVal.push(["SET @userid = " + details.UserId,"sql"]);
      outVal.push(["SELECT @userid","sql"]);
      outVal.push(["DELETE FROM KycDocument WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM Pendingtokens WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM Child WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM Usercreditprofile WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM UserActivityLog WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM Userdetails WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM VerificationProviderLog WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM Blogpost_bookmark_mapping WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM UserSetting WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM Education WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM WorkExperience WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM PostUserOwner WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM Userprovider WHERE edaiduserid = @userid","sql"]);
      outVal.push(["DELETE FROM Blogpost_like_mapping WHERE userid= @userid","sql"]);
      outVal.push(["DELETE FROM UserOrganization WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM Pdfarchive WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM Queuedpdf WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM Donation_Organization_Mapping WHERE Donationid IN (SELECT id FROM donation WITH (NOLOCK) WHERE appealid IN (SELECT id FROM appeal WITH (NOLOCK) WHERE userid = @userid))","sql"]);
      outVal.push(["DELETE FROM Donation WHERE appealid IN (SELECT id FROM Appeal WITH (NOLOCK) WHERE userid = @userid)","sql"]);
      outVal.push(["DELETE FROM StudentAccount WHERE appealid IN (SELECT id FROM Appeal WITH (NOLOCK) WHERE userid = @userid)","sql"]);    
      outVal.push(["DELETE FROM PaymentForecast WHERE StudentAccountStatusId IN( SELECT id FROM StudentAccountStatus WHERE userid = @userid )","sql"]);
      outVal.push(["DELETE FROM StudentAccountStatus WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM PreContractAgreementRecord WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM AppealSetting WHERE AppealId IN (SELECT id FROM Appeal WITH (NOLOCK) WHERE userid = @userid)","sql"]);
      outVal.push(["DELETE FROM Appeal WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM ReferralPartner WHERE OrganizationStudentMappingId IN ( SELECT id FROM Organization_student_mapping WITH (NOLOCK) WHERE studentid = @userid)","sql"]);      
      outVal.push(["DELETE FROM Organization_student_mapping WHERE studentid = @userid","sql"]);
      outVal.push(["DELETE FROM UserEmailPreferences WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM PlaidAccount_UserProvider_Mapping WHERE UserProviderId in ( SELECT id FROM Userprovider WITH (NOLOCK) WHERE edaiduserid = @userid )","sql"]);
      outVal.push(["DELETE FROM UserProvider WHERE EdAidUserId =  @userid","sql"]);
      outVal.push(["DELETE FROM PlaidAddress WHERE plaididentityid IN (SELECT id FROM PlaidIdentity WITH (NOLOCK) WHERE plaidproviderid IN (SELECT id FROM PlaidProvider WITH (NOLOCK) WHERE userid = @userid))","sql"]);
      outVal.push(["DELETE FROM PlaidIdentity WHERE plaidproviderid IN (SELECT id FROM PlaidProvider WITH (NOLOCK) WHERE userid = @userid)","sql"]);
      outVal.push(["DELETE FROM PlaidTransaction WHERE plaidaccountid IN (SELECT id FROM plaidaccount WITH (NOLOCK) WHERE plaidproviderid IN (SELECT id FROM PlaidProvider WITH (NOLOCK) WHERE userid = @userid))","sql"]);
      outVal.push(["DELETE FROM Plaidaccount WHERE plaidproviderid IN (SELECT id FROM PlaidProvider WITH (NOLOCK) WHERE userid = @userid)","sql"]);
      outVal.push(["DELETE FROM PlaidOauth WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM DocumentSignRequest WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM UserCreditProfile WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM userDetails WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM MicroDepositBankVerification WHERE userid = @userid","sql"]);      
      outVal.push(["DELETE FROM StripeSetupIntent WHERE  userid = @userid","sql"]);      
      outVal.push(["DELETE FROM StripePaymentIntent WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM Deposit WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM Agreementrecord WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM PlaidProvider WHERE userid = @userid","sql"]);
      outVal.push(["DELETE FROM [User] WHERE id = @userid","sql"]);
      outH += 600
      break;
      
      
    case 'deletePaymentMandate':
      outVal.push(['Go to <a target=\"_blank\" href="https://edaid.com/Admin/User/Edit/'+ details.UserId + '">Edaid Admin</a> and disable the payment mandate' , 'txt']);
      outVal.push(['Is this is a manual bypass, delete the mapping' , 'txt']);
      outVal.push(["DELETE FROM UserProvider WHERE EdAidUserId = " + details.UserId , "sql"]);
      outH += 30
      break;
      
    case 'disableOpenBanking':
      outVal.push(['Go to <a target="_blank" href="https://edaid.com/Admin/User/Edit/'+ details.UserId + '">Edaid Admin</a> and disable Open banking' , 'txt']);
      outH += 30
      break;
    
    case 'disableOpenBankingAndPaymentMandate':
      outVal.push(['Go to <a target="_blank" href="https://edaid.com/Admin/User/Edit/'+ details.UserId + '">Edaid Admin</a> and disable Payment Mandate and Open banking' , 'txt']);
      outVal.push(['Is there is a manual bypass for the Payment Mandate, delete the mapping' , 'txt']);
      outVal.push(["DELETE FROM UserProvider WHERE EdAidUserId = " + details.UserId , "sql"]);
      outH += 30
      break;
    
    case 'renewToken':
      outVal.push(["SELECT * FROM PendingTokens WITH (NOLOCK) WHERE UserId = " + details.UserId +" ORDER BY SentOnUtc DESC", "sql"]);
      outVal.push(['Run the query above to find the ID of the token to be expired (if there is none, it means that they have registered), then add it to the query below (in the WHERE clause)">Edaid Admin</a> and disable Open banking' , 'txt']);
      outVal.push(["DECLARE @tokenId INT","sql"])
      outVal.push(["SET @tokenId = XXXXX","sql"])
      outVal.push(["UPDATE Organization_Student_Mapping SET CreatedOnUtc = CURRENT_TIMESTAMP, UpdatedOnUtc = null WHERE Id = XXXXX", "sql"]);
      outH += 90
      break;
      
    case 'expireToken':
      outVal.push(["SELECT * FROM PendingTokens WITH (NOLOCK) WHERE UserId = " + details.UserId +" ORDER BY SentOnUtc DESC", "sql"]);
      outVal.push(['Run the query above to find the ID of the token to be expired (if there is none, it means that they have registered), then add it to the query below (in the WHERE clause)">Edaid Admin</a> and disable Open banking' , 'txt']);
      outVal.push(["DECLARE @tokenId INT","sql"])
      outVal.push(["SET @tokenId = XXXXX","sql"])
      outVal.push(["UPDATE Organization_Student_Mapping SET CreatedOnUtc = DATEADD(MONTH, -1, GETDATE()), UpdatedOnUtc = null WHERE Id = XXXXX", "sql"]);
      outH += 90
      break;
   
    case 'manualBypassDeposit':      
      outVal.push(['For US:'  , 'txt']);
      outVal.push(["INSERT INTO StripePaymentIntent (UserId, PaymentIntentId, StripeObject, AllowedSourceTypes, Amount, Status, currency, CaptureMethod, ClientSecret, PaymentMethod, PaymentMethodTypes, Livemode, CreatedDate, CreatedOnUtc, UpdatedOnUtc) "+
                   "VALUES (" + details.UserId + ", ( SELECT TOP 1 PaymentIntentId FROM StripePaymentIntent WITH (NOLOCK) WHERE UserId = " + details.UserId + " AND Status = 'requires_source' ORDER BY CreatedOnUtc DESC ), 'payment_intent', 'card', 100000, 'succeeded', 'usd', 'automatic', 'ManuallyAdded', 'ManuallyAdded', 'card', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", "sql"]);
      outVal.push(["INSERT INTO Deposit (UserId, OrganizationId, PaymentProviderId, Amount, Currency, BillId, PaymentStatus, PaidAt, Description, PaymentIntentId, CreatedOnUtc, UpdatedOnUtc)" +
                   "VALUES (" + details.UserId + ", (SELECT OrganizationId from Course WITH (NOLOCK) WHERE id = ( SELECT CourseId FROM UserDetails WITH (NOLOCK) WHERE UserId = " + details.UserId + " ) ), 7, 1000, 'USD', 'ManuallyAdded', 20, CURRENT_TIMESTAMP, 'ManuallyAdded', ( SELECT TOP 1 id FROM StripePaymentIntent WITH (NOLOCK) WHERE UserId = " + details.UserId + " AND Status = 'succeeded' ), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP )", "sql"]);
      outVal.push(['For UK:'  , 'txt']);
      outVal.push(["INSERT INTO StripePaymentIntent (UserId, PaymentIntentId, StripeObject, AllowedSourceTypes, Amount, Status, currency, CaptureMethod, ClientSecret, PaymentMethod, PaymentMethodTypes, Livemode, CreatedDate, CreatedOnUtc, UpdatedOnUtc) "+
                   "VALUES (" + details.UserId + ", ( SELECT TOP 1 PaymentIntentId FROM StripePaymentIntent WITH (NOLOCK) WHERE UserId = " + details.UserId + " AND Status = 'requires_source' ORDER BY CreatedOnUtc DESC ), 'payment_intent', 'card', 100000, 'succeeded', 'gbp 'automatic', 'ManuallyAdded', 'ManuallyAdded', 'card', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", "sql"]);
      outVal.push(["INSERT INTO Deposit (UserId, OrganizationId, PaymentProviderId, Amount, Currency, BillId, PaymentStatus, PaidAt, Description, PaymentIntentId, CreatedOnUtc, UpdatedOnUtc)" +
                   "VALUES (" + details.UserId + ", (SELECT OrganizationId from Course WITH (NOLOCK) WHERE id = ( SELECT CourseId FROM UserDetails WITH (NOLOCK) WHERE UserId = " + details.UserId + " ) ), 7, 1000, 'GBP', 'ManuallyAdded', 20, CURRENT_TIMESTAMP, 'ManuallyAdded', ( SELECT TOP 1 id FROM StripePaymentIntent WITH (NOLOCK) WHERE UserId = " + details.UserId + " AND Status = 'succeeded' ), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP )", "sql"]); 
      outH += 220
      break;      
      
    case 'manualBypassPaymentMandate':
      outVal.push(['Go to <a target="_blank" href="https://edaid.com/Admin/User/Edit/'+ details.UserId + '">Edaid Admin</a> to see if the user is on GoCardless or Dwolla' , 'txt']);
      outVal.push(["If the user is on GoCardless then check the box on 'Manually bypass' then click on 'Save'. If on Dwolla, run the following query:"  , "txt"]);
      outVal.push(["INSERT INTO UserProvider (EdAidUserId, ProviderId, ProviderName, AccessToken, TokenType, MerchantId) VALUES (" + details.UserId + ", 8, 'dwolla', 'Manual Bypass', 'Student-Repayment', 'Manual Bypass')", "sql"]);
      outH += 90
      break;      
      
    case 'manualBypassSocialMedia':
      if(details.SocialMedia.indexOf('Facebook')>-1) {
        outVal.push(["INSERT INTO ExternalAuthenticationRecord (UserId, Email, ExternalIdentifier, ExternalDisplayIdentifier, OAuthToken, OAuthAccessToken, ProviderSystemName, ProfileUrl, CreatedOnUtc, UpdatedOnUtc) " +
                     "VALUES (" + details.UserId + ", 'manual bypass', 'manually added', NULL, 'manually added', '1f0179382f0208793', 'ExternalAuth.Twitter', '', '2019-07-14 12:41:30.027', '2019-07-14 12:41:30.027')", "sql"]);
        outH += 45
      }
      if(details.SocialMedia.indexOf('LinkedIn')>-1) {
        outVal.push(["INSERT INTO ExternalAuthenticationRecord (UserId, Email, ExternalIdentifier, ExternalDisplayIdentifier, OAuthToken, OAuthAccessToken, ProviderSystemName, ProfileUrl, CreatedOnUtc, UpdatedOnUtc) " +
                     "VALUES (" + details.UserId + ", 'manual bypass', 'manually added', NULL, 'manually added', '1f0179382f0208793', 'ExternalAuth.LinkedIn', '', '2019-07-14 12:41:30.027', '2019-07-14 12:41:30.027')", "sql"]);
        outH += 45
      }
      break;
      
    case 'manualUpdateLinkedInURL':
      outVal.push(["UPDATE ExternalAuthenticationRecord SET ProfileUrl = " + details.LinkedInURL +" WHERE UserId = " + details.UserId + " AND ProviderSystemName = ExternalAuth.LinkedIn", "sql"]); 
      outH += 30
      break;
      
    case 'markAsHidden':
      outVal.push(["UPDATE Organization_Student_Mapping SET [Status] = 'Hidden' where studentid = " + details.UserId , "sql"]);
      outH += 30
      break; 
      
    case 'markAsRepaid':
      outVal.push(["UPDATE StudentAccountStatus SET AccountStatus = 'Repaid' WHERE UserId = " + details.UserId ,"sql"]);
      outH += 30
      break; 
       
    case 'markAsWithdrawn':
      outVal.push(["Set as Withdrawn","title"]);
      outVal.push(["UPDATE Organization_Student_Mapping SET WithdrawnFromCourse = 1 WHERE studentid = " + details.UserId, "sql"]);
      outVal.push(["IF ( (SELECT COUNT(id) FROM StudentAccountStatus WHERE UserId = " + details.UserId + ") = 1 )","sql"]);
      outVal.push(["BEGIN","sql"]);
      outVal.push(["IF (","sql"]);
      outVal.push(["SELECT","sql"]);
      outVal.push(["CASE PaymentType","sql"]);
      outVal.push(["WHEN 'DIPP' THEN 1","sql"]);
      outVal.push(["WHEN 'DPP' THEN 1","sql"]);
      outVal.push(["ELSE 0","sql"]);
      outVal.push(["END","sql"]);
      outVal.push(["FROM PaymentTerm WHERE id =","sql"]);
      outVal.push(["(SELECT PaymentTermId FROM Course WITH (NOLOCK) WHERE id IN","sql"]);
      outVal.push(["( SELECT CourseId FROM userDetails WITH (NOLOCK) WHERE UserId = " + details.UserId + ") )","sql"]);
      outVal.push([") = 0","sql"]);
      outVal.push(["BEGIN","sql"]);
      outVal.push(["UPDATE StudentAccountStatus SET CohortGraduationDate = null WHERE UserId = " + details.UserId,"sql"]);
      outVal.push(["SELECT CONCAT('FirstRepaymentDate not updated as not a DIPP or DPP course for userId ', id) FROM StudentAccountStatus WHERE UserId = " + details.UserId,"sql"]);
      outVal.push(["END","sql"]);
      outVal.push(["ELSE","sql"]);
      outVal.push(["UPDATE StudentAccountStatus SET CohortGraduationDate = null, FirstRepaymentDate = CURRENT_TIMESTAMP WHERE UserId = " + details.UserId,"sql"]);
      outVal.push(["SELECT CONCAT('Updated row ', id) FROM StudentAccountStatus WHERE UserId = " + details.UserId,"sql"]);
      outVal.push(["END","sql"]);
      outVal.push(["ELSE","sql"]);
      outVal.push(["SELECT CONCAT('Not updated as count(StudentAccountStatus.id) = ', count(id) ) FROM StudentAccountStatus WHERE UserId = " + details.UserId,"sql"]);
      outVal.push(["SELECT 'markAsWithdrawn - Done'","sql"]);
      outH += 120
      break;    
      
    case 'removePdf':
      outVal.push(["--Find out the Id of the pdf file" , "txt"]);
      outVal.push(["SELECT * FROM PDFArchive WITH (NOLOCK) WHERE UserId = " + details.UserId + " ORDER BY CreatedOnUtc DESC", "sql"]);
      outVal.push(["DECLARE @pdfId INT","sql"])
      outVal.push(["SET @pdfId = XXXXX","sql"])
      outVal.push(["DELETE FROM PDFArchive WHERE id = @pdfId AND UserId = " + details.UserId, "sql"]);
      outH += 60
      break;
      
    case 'voidContract':
      outVal.push(["UPDATE Organization_Student_Mapping SET [Status] = 'Hidden', ActivationDate = null, Confirmed = 0 WHERE studentid = " + details.UserId , "sql"]);
      outVal.push(["DELETE FROM Donation_Organization_Mapping WHERE DonationId = (SELECT id FROM donation WITH (NOLOCK) WHERE appealid = (SELECT id FROM appeal WITH (NOLOCK) WHERE userid = " + details.UserId +" ))" , "sql"]);
      outVal.push(["DELETE FROM Donation WHERE appealid = (SELECT id FROM Appeal WITH (NOLOCK) WHERE userid = " + details.UserId +" )" , "sql"]);
      outVal.push(["DELETE FROM StudentAccount WHERE StudentAccountStatusId = (SELECT Id FROM StudentAccountStatus WITH (NOLOCK) WHERE userid = " + details.UserId + ")","sql"]);
      outVal.push(["DELETE FROM StudentAccountStatus WHERE userid = " + details.UserId , "sql"]);
      outVal.push(["DELETE FROM AppealSetting WHERE appealid = (SELECT id FROM Appeal WITH (NOLOCK) WHERE userid = " + details.UserId +" )" , "sql"]);
      outVal.push(["DELETE FROM Appeal WHERE userid = " + details.UserId , "sql"]);
      outVal.push(["DELETE FROM PreContractAgreementRecord WHERE userid = " + details.UserId,"sql"]);

      outVal.push(["If you need to delete or edit the pdf file, open Cyberduck and find the contract under /edaid-live/filestore/pdf" , "txt"]);
      outVal.push(["To add a 'VOID' watermark go to <a  target=\"_blank\" href=\"https://www.overleaf.com/project/5e4eb536ece06b0001909e51\">Overleaf</a> and upload the pdf after renaming it 'contract.pdf', then replace the file in S3" , "txt"]);
      outH += 160
      break;  
   
    case 'hideUser':
      outVal.push(["UPDATE Organization_Student_Mapping SET [Status] = 'Hidden' WHERE studentid = " + details.UserId , "sql"]);
      outH += 30
      break;
      
    case 'createCourse':
      
      outVal.push(["INSERT INTO Course (OrganizationId, PaymentTermId, Name, MaxDeferredAmount, CourseCost, " 
                                     + "GracePeriod, DescriptiveName, ContractTemplateName, "
                                     + "Disable, CampusId, CurrencyId, InviteOnly, DegreeOffering, CurrentDegreeInterest, CreatedOnUtc, UpdatedOnUtc) "
                  +"VALUES(" 
                    + requiredVal(details.OrganizationId) + "," 
                    + requiredVal(details.PaymentTermId) + "," 
                    + requiredString(details.Name) + ","
                    + requiredVal(details.MaxDeferredAmount) + "," 
                    + valOrNull(details.CourseCost) + ","  
                    + requiredVal(details.GracePeriod) + ","  
                    + requiredString(details.DescriptiveName) + "," 
                    + requiredString(details.ContractTemplateName) + ","
                    + valOrNum(details.Disable,0) + ","  
                    + valOrNull(details.CampusId) + ","  
                    + requiredVal(details.CurrencyId) + ","  
                    + valOrNull(details.InviteOnly) + ","  
                    + stringOrNull(details.DegreeOffering) + ","  
                    + stringOrNull(details.CurrentDegreeInterest) + ","   
                    + "CURRENT_TIMESTAMP" + ","  
                    + "CURRENT_TIMESTAMP" 
                  + ")", "sql"]);
      outH += 60;
      break;  
    
      
    default:
       outVal.push(["MISSING CODE FOR " + action,"warning"]);      
  }
  
}


function extractId(inputString) {
  let outString = 'XXXX'
  if (inputString && inputString.length>0) {
    let matches =  inputString.match(/(?<=\().+?(?=\))/g) 
    if (matches){ 
      outString = matches.slice(-1)[0] 
    }
  }
  return outString;
}

function extractFundedAmount(inputString) {
    let outString = 'XXXX'
    if (inputString && inputString.length>0) {
      let matches =  inputString.match(/(?<=\[).+?(?=\])/g) 
      if (matches){ 
        outString = matches.slice(-1)[0].substring(3)
      }
    }
    return outString;
  }


function requiredString(inputText){
  let outVal = "'" + inputText + "'"
  if(typeof inputText === 'undefined' || inputText === '\N' || inputText === '\\N' || inputText === '' ) { 
    outVal = 'XXXXX - MISSING STRING - XXXXX';
  } 
  return outVal;   
}

function stringOrNull(inputText){
   let outVal = "'" & inputText & "'"
  if(typeof inputText === 'undefined' || inputText === '\N' || inputText === '\\N' || inputText === '') { 
    outVal = 'NULL';
  }
  return outVal;
}

function stringOrText(inputText,altText){
  let outVal = "'" + inputText + "'";
  if(typeof inputText === 'undefined' || inputText === '\N' || inputText === '\\N' || inputText === '') { 
    if(typeof altText === 'undefined'){
      outVal = 'XXXXX - MISSING TEXT PARAM - XXXXX';
    } else {
      outVal = altText;
    }
  }
  return outVal;
}

function requiredVal(inputVal){
  let outVal = inputVal;
  if(typeof inputVal === 'undefined' || inputVal === '\N' || inputText === '\\N') { 
    outVal = 'XXXXX - MISSING VALUE - XXXXX';
  } 
  return outVal;   
}


function valOrNum(inputVal, altNum){
  let outVal = inputVal
  if(typeof inputVal === 'undefined' || inputVal === '\N' || inputText === '\\N' || inputVal === '') { 
    if(typeof altNum === 'undefined'){
      outVal = 'XXXXX - MISSING VALUE PARAM - XXXXX';
    } else {
      outVal = altNum;
    }
  }
  return outVal;
}

function valOrNull(inputVal){
  let outVal = inputVal
  if(typeof inputVal === 'undefined' || inputVal === '\N' || inputText === '\N' || inputVal === '') { 
    outVal = 'NULL';
  }
  return outVal;
}


function newFirstPaymentDate(newGraduationDate,gracePeriod){
  if (gracePeriod === 'null' || !gracePeriod){ gracePeriod = 3 }
  var grDate = new Date(newGraduationDate);
  var newDate  = new Date(grDate.setMonth(grDate.getMonth()+gracePeriod+1));
  newDate.setDate(1)
  return newDate;
}



function prepareDate(inputDate){
  var inDate = new Date(inputDate);
  var outVal = inDate.getFullYear() + '-' + ('0' + (inDate.getMonth() + 1)).slice(-2) + '-' + ('0' + inDate.getDate()).slice(-2) + ' 00:00:00.000'
  return outVal;
}


function escapeHTML(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

