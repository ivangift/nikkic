// calc.js

Resource = function(category, id, number, layer) {
  return {
    category: category,
    id: id,
    number: number,
    layer: layer,
    inventory: 0,
    deps: []
  }
}

var patternSet = function() {
  ret = {}
  for (var i in pattern) {
    var targetCate = pattern[i][0];
    var targetId = pattern[i][1];
    var sourceCate = pattern[i][2];
    var sourceId = pattern[i][3];
    var num = pattern[i][4];
    if (!ret[targetCate]) {
      ret[targetCate] = {};
    }
    if (!ret[targetCate][targetId]) {
      ret[targetCate][targetId] = [];
    }
    ret[targetCate][targetId].push(Resource(sourceCate, sourceId, num, 0));
  }
  return ret;
}();

var evolveSet = function() {
  ret = {}
  for (var i in evolve) {
    var targetCate = evolve[i][0];
    var targetId = evolve[i][1];
    var sourceCate = evolve[i][2];
    var sourceId = evolve[i][3];
    var num = evolve[i][4];
    if (!ret[targetCate]) {
      ret[targetCate] = {};
    }
    ret[targetCate][targetId] = Resource(sourceCate, sourceId, num, 0);
  }
  return ret;
}();

function drawCategory() {
  var dropdown = $("#category")[0];
  for (var category in patternSet) {
    var option = document.createElement('option');
    option.text = category;
    option.value = category;
    dropdown.add(option);
  }
  changeCategory();
}

function changeCategory() {
  var category = $("#category").val();
  $("#pattern").find('option').remove();
  var dropdown = $("#pattern")[0];
  var option = document.createElement('option');
  option.text = "选一件衣服";
  option.selected = true;
  option.disabled = "disabled";
  option.hidden = "hidden";
  dropdown.add(option);
  for (var i in patternSet[category]) {
    if (!clothesSet[category][i]) continue;
    var option = document.createElement('option');
    option.text = clothesSet[category][i].name;
    option.value = i;
    dropdown.add(option);
  }
  updateParam();
}

function selectPattern() {
  var category = $("#category").val();
  var id = $("#pattern").val();
  drawTable(category, id);
  updateParam();
}

function thead() {
  return "<thead><tr>"
    + "<th>名称</th>"
    + "<th>分类</th>"
    + "<th>编号</th>"
    + "<th>来源</th>"
    + "<th>拥有数量</th>"
    + "<th>需求数量</th>"
    + "</tr></thead>";
}

function calcNum(numParent, num, keep) {
  if (numParent == 0) return 0; // after all, you don't need any deps if goal is already fulfilled
  var kept = keep ? 1 : 0;
  return numParent * (num - kept) + kept;
}

function createOrUpdate(category, id, num, layer) {
  if (!resourceSet[category]) {
    resourceSet[category] = {};
  }
  if (!resourceSet[category][id]) {
    resourceSet[category][id] = Resource(category, id, num, layer)
  }
  resourceSet[category][id].number = num;
  resourceSet[category][id].layer = layer;
  resourceSet[category][id].deps = [];
  return resourceSet[category][id];
}

function deps(parent) {
  var category = parent.category;
  var id = parent.id;
  var num = Math.max(parent.number - parent.inventory, 0);
  var layer = parent.layer;
  var ret = [];
  var c = clothesSet[category][id];

  if (patternSet[category] && patternSet[category][id]) {
    for (var i in patternSet[category][id]) {
      var source = patternSet[category][id][i];
      var reqNum = calcNum(num, source.number, true);
      var child = createOrUpdate(source.category, source.id, reqNum, layer + 1);
      parent.deps.push(child);
      ret.push(child);
      ret = ret.concat(deps(child));
    }
  }
  var evol = parseSource(c.source, '进');
  if (evol && clothesSet[c.type.mainType][evol]) {
    var x = evolveSet[c.type.mainType][id].number;
    var reqNum = calcNum(num, x, true);
    var child = createOrUpdate(c.type.mainType, evol, reqNum, layer + 1);
    parent.deps.push(child);
    ret.push(child);
    ret = ret.concat(deps(child));
    
  }
  var remake = parseSource(c.source, '定');
  if (remake && clothesSet[c.type.mainType][remake]) {
    var reqNum = calcNum(num, 1, false);
    var child = createOrUpdate(c.type.mainType, remake, reqNum, layer + 1);
    parent.deps.push(child);
    ret.push(child);
    ret = ret.concat(deps(child));
  }
  return ret;
}

function row(resource) {
  var c = clothesSet[resource.category][resource.id];
  var name = c.name;
  for (var i = 0; i < resource.layer; i ++) {
    name = "&nbsp;&nbsp;" + name;
  }
  return "<tr id='" + resource.category + resource.id +"'>"
      + "<td>" + name + "</td>"
      + "<td>" + resource.category + "</td>"
      + "<td>" + resource.id + "</td>"
      + "<td>" + c.source + "</td>"
      + "<td>" + "<input type='textbox' size=5 onchange='updateInventory(\""
          + resource.category + "\",\"" + resource.id + "\")'/>" + "</td>"
      + "<td class='number'>" + resource.number + "</td>"
      + "</tr>";
}

function tbody(resources) {
  var ret = "";
  for (var i in resources) {
    ret += row(resources[i]);
  }
  return "<tbody>" + ret + "</tbody>";
}

var root;
var resourceSet = {};
function drawTable(category, id) {
  var ret = thead();
  root = Resource(category, id, 1, 0);
  ret = ret + tbody(deps(root));
  $("#table").html("<table>" + ret + "</table>");
}

function init() {
  var category = url("#category");
  var pattern = url("#pattern");
  calcDependencies();
  drawCategory();
  if (patternSet[category]) {
    $("#category").val(category);
    changeCategory();
    if (patternSet[category][pattern]) {
      $("#pattern").val(pattern);
      selectPattern();
    }
  }
}

function updateParam() {
  var category = $("#category").val();
  var pattern = $("#pattern").val();
  var param = "category="+category + "&pattern=" + pattern;
  window.location.href = "#" + param;
}

function render(node) {
  $("#" + node.category + node.id + " .number").text(Math.max(node.number - node.inventory, 0));
  for (var i in node.deps) {
    render(node.deps[i])
  }
}

function updateInventory(category, id) {
  var input = $("#" + category + id + " input");
  var num = parseInt(input.val());
  if (!num) {
    num = 0;
  }
  input.val(num);
  resourceSet[category][id].inventory = num;
  deps(resourceSet[category][id]);
  render(resourceSet[category][id]);
}

$(document).ready(function() {
  init()
});
