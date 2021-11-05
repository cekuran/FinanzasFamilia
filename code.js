const UrlData = {
  Production:"https://docs.google.com/spreadsheets/d/15B05YFKuvhDbOoUJWWHvnyZjTnx464A2a3-i7uWLCk8/edit#gid=0",
  Test:"https://docs.google.com/spreadsheets/d/1H1-JTR4yxE-5pWN8hZ-UUf7fPhvntOy1Pzsyx4nAErc/edit#gid=0"
};

//Check if we are in test running
const expresion = /\/([^\/]+)\/(exec|dev)$/i;
var UrlGroups = ScriptApp.getService().getUrl().match(expresion);
var UseProductionDataBaseInTest = true;

var RunIn = (UrlGroups[1].length > 70 || UseProductionDataBaseInTest == true) ? "Production" : "Test";

const UrlFinanzas = UrlData[RunIn];

//Sheets
const ss = SpreadsheetApp.openByUrl(UrlFinanzas);

const wsCuentas = ss.getSheetByName("cuentas");
const wsMovimientos = ss.getSheetByName('movimientos');
const wsActual = ss.getSheetByName('actual');

//HANDELING RESPONSES TO CLIENT

function GetDeployType(){
  return RunIn;
}


function ExecuteServerFunctions(Args) {
  var Response = {};
  
  if(Args.funcs) {
    Response={};
    Args.funcs.forEach(function(func){
      try {
        Response[func.func]=(this[func.func])?this[func.func](func.args):null;
      } catch (e) {
        Response[func.func]=null;
      }
    });
  }

  return Response;
}

//CLASSES

function DateExpense(DateIn) {
  let InitialDate = (typeof DateIn === 'number') ? DateIn.toString(): DateIn;
  InitialDate = InitialDate.toLowerCase();

  let dateRegexps = [
    /^(?<year>[0-9]{4})(\/|-)(?<month>[0-9]{2})(\/|-)(?<day>[0-9]{1,2})$/g,
    /^(?<day>[0-9]{1,2})(\/|-)(?<month>[0-9]{1,2})(\/|-)(?<year>[0-9]{4})$/g,
    /^(?<year>[0-9]{4})(?<month>[0-9]{2})(?<day>[0-9]{2})$/g,
    /^(?<day>[0-9]{1,2})(\/|-)(?<month>[A-Za-z]{3})(\/|-)(?<year>[0-9]{4})$/g
  ];

  let Groups = null;

  for(let Regex of dateRegexps) {
    let Result = Regex.exec(InitialDate);
    if(Result) {
      Groups = Result.groups;
      break;
    }
  }

  if(Groups) {
    this.year = parseInt(Groups.year,10);
    if(Groups.month.length == 3) {
      let MonthConvertion = {
        ene:1,
        feb:2,
        mar:3,
        abr:4,
        may:5,
        jun:6,
        jul:7,
        ago:8,
        sep:9,
        oct:10,
        nov:11,
        dic:12
      };
      this.month = MonthConvertion[Groups.month];      
    } else {
      this.month = parseInt(Groups.month,10);
    }
    this.day = parseInt(Groups.day,10);
  } else {
    let Today = new Date();
    this.year = Today.getFullYear();
    this.month = Today.getMonth()+1;
    this.day = Today.getDate();
  }

  this.GetFormat = function () {
    return `${this.day}/${this.month}/${this.year}`;
  }
  this.GetFormatLetter = function () {
    let Months = [
      "Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"
    ];
    return `${this.day}/${Months[this.month-1]}/${this.year}`;
  }
  this.GetRaw = function () {
    return this.year*10000+this.month*100+this.day;
  }
  this.IsThisMonth = function (CheckMonth) {
    if(CheckMonth == null || CheckMonth.month == null || CheckMonth.year == null){
      return false;
    }
    return (this.month == CheckMonth.month && this.year == CheckMonth.year);
  }
}

function AllData() {
  this.Cuentas = wsCuentas.getRange(1,1,wsCuentas.getLastRow(),2).getValues();
  let AuxExpenses = wsMovimientos.getRange(1,1,wsMovimientos.getLastRow(),wsMovimientos.getLastColumn()).getValues();
  let TitleCol = AuxExpenses[0];
  this.Expenses = AuxExpenses.slice(1).map(function(Expense){
    let NewExpense = {};
    Expense.forEach(function(Element, Index){
      NewExpense[TitleCol[Index]] = (TitleCol[Index] == "descripcion") ? String(Element) : Element;
    });
    return NewExpense;
  });
}

//MANAGING DATA IN HOST

function getAllData() {
  return new AllData();
}


function editExpenseById(idData) {

  if(idData.action != "delete" && idData.action != "edit") {
    return false;
  }

  const idList = wsMovimientos.getRange(2,1,wsMovimientos.getLastRow()-1,1).getValues().map(r => r[0].toString().toLowerCase());
  const PosId = idList.indexOf(idData.id.toString().toLowerCase());
  const RowNumber = (PosId === -1 )? 0 : PosId + 2;

  if(RowNumber == 0) {
    return false;
  }

  const ExpenseRange = wsMovimientos.getRange(RowNumber,2,1,4);

  var Cuenta = (idData.action == "edit") ? idData.Cuenta : ExpenseRange.getValues()[0][1];
  idData.Monto = Math.abs(idData.Monto);
  var NewMonto = (idData.action == "edit") ? ((idData.Cuenta == "Ingreso") ? parseFloat(idData.Monto):(-1)*parseFloat(idData.Monto)):0;
  var Monto =  parseFloat(ExpenseRange.getValues()[0][3]);

  if(idData.action == "edit") {
    var ActualFecha = new DateExpense(idData.Fecha);
    ExpenseRange.setValues([[
      ActualFecha.GetRaw(),
      idData.Cuenta,
      "'"+String(idData.Description),
      NewMonto
    ]]);
  } else {
    wsMovimientos.deleteRow(RowNumber);
  }

  const rangeExpenses = wsMovimientos.getRange(2,1,wsMovimientos.getLastRow(),wsMovimientos.getLastColumn());
  rangeExpenses.sort({column: 2, ascending: false});

  return true;
}


function addExpense(
  rowData
)
{
  var ActualRange = wsActual.getRange(1,2,1);
  var idValue = parseInt(ActualRange.getValues()[0],10)+1;
  rowData.Monto = Math.abs(rowData.Monto);
  rowData.Monto = (rowData.Cuenta == "Ingreso") ? parseFloat(rowData.Monto):(-1)*parseFloat(rowData.Monto); 
  var ActualFecha = new DateExpense(rowData.Fecha);

  ActualRange.setValues([
    [idValue]
    ]);

  wsMovimientos.appendRow([
    idValue,
    ActualFecha.GetRaw(),
    rowData.Cuenta,
    "'"+String(rowData.Description),
    rowData.Monto
  ]);

  const rangeExpenses = wsMovimientos.getRange(2,1,wsMovimientos.getLastRow(),wsMovimientos.getLastColumn());
  rangeExpenses.sort({column: 2, ascending: false});

  return true;
}


function EditLimitByAccount(AccountInfo) {
  const LimitList = wsCuentas.getRange(1,1,wsCuentas.getLastRow(),1).getValues().map(r => r[0].toString().toLowerCase());
  const AccountPos = LimitList.indexOf(AccountInfo.Cuenta.toString().toLowerCase());

  const RowNumber = (AccountPos === -1 )? 0 : AccountPos + 1;

  if(RowNumber == 0) {
    return false;
  }

  const AccountRange = wsCuentas.getRange(RowNumber,2,1,1);

  AccountRange.setValues([[
      parseFloat(AccountInfo.Monto)
  ]]);
}

function test() {
  var ActualRange = wsActual.getRange(1,2,1);
  console.log(ActualRange.getValues());
}


