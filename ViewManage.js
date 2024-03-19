// General

var Route = {
  "New":"new_main.html",
  "Denied":"access_denied.html"
};

function doGet(e) {
  let currentUsers = new Users();
  let userAllowed = currentUsers.checkUser(Session.getActiveUser().getEmail());
  console.log(Session.getActiveUser().getEmail());
  console.log(userAllowed);
  let currentView = (true == userAllowed) ? Route.New : Route.Denied;
  return HtmlService.createTemplateFromFile(currentView).evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

//GET ALL VIEWS

function GetAllViews(){
  var Views = {};

  var keys = Object.keys(Route);
  keys.forEach(function(key){
    Views[key] = HtmlService.createTemplateFromFile(Route[key]).evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL).getContent();
  });

  return Views;
}

//INCLUDE FILES
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}



